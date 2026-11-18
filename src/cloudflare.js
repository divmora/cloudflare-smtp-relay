const config = require('./config');

/**
 * Error carrying the SMTP reply code the relay should send back to the client.
 * 4xx codes tell the client to retry later; 5xx codes tell it to give up.
 */
class RelayError extends Error {
  constructor(message, responseCode) {
    super(message);
    this.name = 'RelayError';
    this.responseCode = responseCode;
  }
}

const normalize = address => (address || '').trim().toLowerCase();

/**
 * Splits the SMTP envelope recipients into to/cc/bcc for the Cloudflare payload.
 *
 * Only envelope recipients (RCPT TO) receive the message, as SMTP requires. Header To/Cc
 * are used to decide how each envelope recipient is shown; envelope recipients that are
 * not in To/Cc are sent as Bcc. Header addresses that are not envelope recipients are
 * never mailed.
 */
function splitRecipients(parsedEmail, envelope) {
  const remaining = new Map();
  for (const r of (envelope && envelope.rcptTo) || []) {
    const key = normalize(r.address);
    if (key && !remaining.has(key)) remaining.set(key, r.address);
  }

  const take = header => {
    const picked = [];
    for (const v of (header && header.value) || []) {
      const key = normalize(v.address);
      if (remaining.has(key)) {
        picked.push(remaining.get(key));
        remaining.delete(key);
      }
    }
    return picked;
  };

  const to = take(parsedEmail.to);
  const cc = take(parsedEmail.cc);
  const bcc = [...remaining.values()];

  // Cloudflare needs a To recipient; promote one when the headers named none.
  if (to.length === 0) {
    if (cc.length > 0) to.push(cc.shift());
    else if (bcc.length > 0) to.push(bcc.shift());
  }

  return { to, cc, bcc };
}

async function sendViaCloudflare(parsedEmail, envelope) {
  const accountId = config.getCloudflareAccountID();
  const apiToken = config.getCloudflareAPIToken();

  if (!accountId || !apiToken) {
    throw new RelayError('Cloudflare credentials are not configured.', 451);
  }

  const sender = envelope && envelope.mailFrom ? envelope.mailFrom : parsedEmail.from.value[0];
  const { to, cc, bcc } = splitRecipients(parsedEmail, envelope);

  if (to.length === 0) {
    throw new RelayError('No envelope recipients to deliver to.', 554);
  }

  const payload = {
    from: sender.address,
    subject: parsedEmail.subject || 'No Subject'
  };

  // For a single To address pass a string, otherwise an array (both accepted by Cloudflare).
  payload.to = to.length === 1 ? to[0] : to;
  if (cc.length > 0) payload.cc = cc;
  if (bcc.length > 0) payload.bcc = bcc;

  if (parsedEmail.text) payload.text = parsedEmail.text;
  if (parsedEmail.html || parsedEmail.textAsHtml) payload.html = parsedEmail.html || parsedEmail.textAsHtml;

  if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
    payload.attachments = parsedEmail.attachments.map(att => ({
      filename: att.filename,
      content: att.content.toString('base64'),
      type: att.contentType,
      disposition: 'attachment'
    }));
  }

  let response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.getCloudflareRequestTimeoutMs())
    });
  } catch (e) {
    // Timeouts and network failures are temporary: let the client retry.
    // Only the error name/message is used, never the request headers/token.
    const errMsg = `Cloudflare API request failed: ${e.name}${e.message ? ` (${e.message})` : ''}`;
    console.error(`[Cloudflare] ${errMsg}`);
    throw new RelayError(errMsg, 451);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errMsg = `Cloudflare API error ${response.status}: ${errorText}`;
    console.error(`[Cloudflare] ${errMsg}`);
    // Retry when the problem is on our side or temporary: 401/403 (bad, expired or
    // under-scoped token, fixed by the operator), 429 (rate limited) and 5xx. Other 4xx
    // (bad sender, bad payload) are permanent.
    const retryable = [401, 403, 429].includes(response.status) || response.status >= 500;
    throw new RelayError(errMsg, retryable ? 451 : 554);
  }

  return await response.json();
}

module.exports = {
  sendViaCloudflare,
  splitRecipients,
  RelayError
};
