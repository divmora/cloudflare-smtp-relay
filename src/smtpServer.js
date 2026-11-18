const crypto = require('crypto');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const config = require('./config');
const { sendViaCloudflare, RelayError } = require('./cloudflare');

const normalize = value => (value || '').trim().toLowerCase();

function isAddressAllowed(email, allowedEmails, allowedDomains) {
  if ((!allowedEmails || allowedEmails.length === 0) && (!allowedDomains || allowedDomains.length === 0)) {
    return true; // No restrictions
  }
  const address = normalize(email);
  if (!address) return false;
  if (allowedEmails && allowedEmails.some(e => normalize(e) === address)) return true;
  const at = address.lastIndexOf('@');
  if (allowedDomains && at !== -1) {
    const domain = address.slice(at + 1);
    if (allowedDomains.some(d => normalize(d) === domain)) return true;
  }
  return false;
}

// Compares secrets in constant time. Both values are zero-padded to the same length
// (timingSafeEqual needs equal lengths) and the real lengths are compared afterwards.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  const len = Math.max(ba.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ba.copy(pa);
  bb.copy(pb);
  const same = crypto.timingSafeEqual(pa, pb);
  return same && ba.length === bb.length;
}

// User-level lists win when non-empty, otherwise the global lists apply.
function getRules(username) {
  const cfg = config.getConfig();
  const user = (cfg.users && cfg.users[username]) || {};
  const global = cfg.global || {};
  const pick = key => (user[key] && user[key].length > 0 ? user[key] : global[key]);
  return {
    fromEmails: pick('allowed_from_emails'),
    fromDomains: pick('allowed_from_domains'),
    toEmails: pick('allowed_to_emails'),
    toDomains: pick('allowed_to_domains')
  };
}

function policyError(message) {
  return new RelayError(message, 550);
}

function checkSender(address, username) {
  const rules = getRules(username);
  if (!isAddressAllowed(address, rules.fromEmails, rules.fromDomains)) {
    console.warn(`[SMTP] Blocked email: Sender address ${address} is not allowed for user ${username}.`);
    return policyError(`Sender address ${address} is not allowed for this user.`);
  }
  return null;
}

function checkRecipient(address, username) {
  const rules = getRules(username);
  if (!isAddressAllowed(address, rules.toEmails, rules.toDomains)) {
    console.warn(`[SMTP] Blocked email: Recipient address ${address} is not allowed for user ${username}.`);
    return policyError(`Recipient address ${address} is not allowed for this user.`);
  }
  return null;
}

// Reads the DATA stream into memory, but stops keeping bytes once the size limit is passed.
function readMessage(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => {
      if (!stream.sizeExceeded) chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function handleData(stream, session) {
  const raw = await readMessage(stream);
  if (stream.sizeExceeded) {
    // smtp-server answers 552 itself; never forward a truncated message.
    return new RelayError('Message exceeds the maximum allowed size', 552);
  }

  let parsed;
  try {
    parsed = await simpleParser(raw);
  } catch (err) {
    console.error('[SMTP] Failed to parse email:', err.message);
    return new RelayError('Failed to parse email', 554);
  }

  const envelopeSender = session.envelope.mailFrom;
  const envelopeRecipients = session.envelope.rcptTo;
  if (!envelopeRecipients || envelopeRecipients.length === 0) {
    return new RelayError('No recipient found in envelope', 554);
  }
  if (!envelopeSender) {
    return new RelayError('No sender found in envelope', 554);
  }

  console.log(`[SMTP] Received email from ${envelopeSender.address} for ${envelopeRecipients.length} recipient(s), subject: ${parsed.subject}`);

  const username = session.user;

  // Envelope addresses were already checked at MAIL FROM / RCPT TO; check them again in
  // case the config was reloaded mid-session, and check the header recipients too.
  const senderErr = checkSender(envelopeSender.address, username);
  if (senderErr) return senderErr;

  const addresses = new Set();
  envelopeRecipients.forEach(r => addresses.add(r.address));
  for (const header of [parsed.to, parsed.cc, parsed.bcc]) {
    if (header && header.value) header.value.forEach(v => addresses.add(v.address));
  }
  for (const address of addresses) {
    const err = checkRecipient(address, username);
    if (err) return err;
  }

  try {
    await sendViaCloudflare(parsed, session.envelope);
  } catch (err) {
    console.error('[SMTP] Error during email forwarding:', err.message);
    const code = err.responseCode || 451;
    return new RelayError(
      code >= 500 ? 'Cloudflare rejected the message' : 'Temporary error forwarding email to Cloudflare, try again later',
      code
    );
  }

  console.log('[SMTP] Successfully forwarded email via Cloudflare!');
  return null;
}

const maxSize = config.getMaxMessageSizeBytes();
const maxClients = config.getMaxClients();

const server = new SMTPServer({
  // Inbound TLS is not supported yet, so AUTH has to be allowed over plaintext.
  // Run the relay only on a trusted network (see README).
  allowInsecureAuth: true,
  ...(maxSize > 0 && { size: maxSize }),
  ...(maxClients > 0 && { maxClients }),

  onAuth(auth, session, callback) {
    const cfg = config.getConfig();
    const userConfig = cfg.users && Object.prototype.hasOwnProperty.call(cfg.users, auth.username)
      ? cfg.users[auth.username]
      : null;

    if (!userConfig || typeof userConfig.password !== 'string' || !safeEqual(userConfig.password, auth.password || '')) {
      return callback(new Error('Invalid username or password'));
    }

    callback(null, { user: auth.username });
  },

  onMailFrom(address, session, callback) {
    callback(checkSender(address.address, session.user));
  },

  onRcptTo(address, session, callback) {
    callback(checkRecipient(address.address, session.user));
  },

  onData(stream, session, callback) {
    handleData(stream, session)
      .then(err => callback(err || null))
      .catch(err => {
        console.error('[SMTP] Unexpected error handling message:', err.message);
        callback(new RelayError('Internal error', 451));
      });
  }
});

server.on('error', err => {
  console.error('[SMTP] Server Error:', err.message);
});

module.exports = server;
module.exports.isAddressAllowed = isAddressAllowed;
