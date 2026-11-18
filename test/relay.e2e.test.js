const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const nodemailer = require('nodemailer');

test('SMTP relay end to end', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smtp-e2e-test-'));
  const configPath = path.join(tmpDir, 'config.yml');
  fs.writeFileSync(configPath, `
global:
  cloudflare_account_id: "acc"
  cloudflare_api_token: "tok"
  max_message_size_bytes: 2048
smtp_users:
  - username: "app"
    password: "secret"
    allowed_from_domains: ["example.com"]
    allowed_to_domains: ["allowed.org"]
`, 'utf8');
  process.env.SMTP_RELAY_CONFIG_PATH = configPath;
  for (const m of ['../src/config', '../src/cloudflare', '../src/smtpServer']) delete require.cache[require.resolve(m)];
  const server = require('../src/smtpServer');

  const calls = [];
  const originalFetch = global.fetch;
  let nextResponse = { ok: true, status: 200, json: async () => ({ success: true }) };
  global.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body));
    return nextResponse;
  };

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.server.address().port;
  const transport = nodemailer.createTransport({
    host: '127.0.0.1', port, secure: false, ignoreTLS: true,
    auth: { user: 'app', pass: 'secret' }
  });

  t.after(() => {
    global.fetch = originalFetch;
    transport.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return new Promise(resolve => server.close(resolve));
  });

  await t.test('forwards an allowed message to envelope recipients only', async () => {
    calls.length = 0;
    await transport.sendMail({
      from: 'App@Example.com',
      to: 'User@Allowed.org',
      bcc: 'hidden@allowed.org',
      subject: 'hello',
      text: 'body'
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].to.toLowerCase(), 'user@allowed.org');
    assert.deepEqual(calls[0].bcc, ['hidden@allowed.org']);
  });

  await t.test('rejects a disallowed sender permanently at MAIL FROM', async () => {
    calls.length = 0;
    await assert.rejects(
      () => transport.sendMail({ from: 'x@evil.com', to: 'u@allowed.org', text: 'x' }),
      err => err.responseCode === 550
    );
    assert.equal(calls.length, 0);
  });

  await t.test('rejects a disallowed recipient permanently at RCPT TO', async () => {
    calls.length = 0;
    await assert.rejects(
      () => transport.sendMail({ from: 'a@example.com', to: 'u@other.org', text: 'x' }),
      err => err.responseCode === 550
    );
    assert.equal(calls.length, 0);
  });

  await t.test('rejects an oversized message without forwarding it', async () => {
    calls.length = 0;
    await assert.rejects(
      () => transport.sendMail({ from: 'a@example.com', to: 'u@allowed.org', text: 'x'.repeat(5000) }),
      err => err.responseCode === 552
    );
    assert.equal(calls.length, 0);
  });

  await t.test('returns a temporary error when Cloudflare is unavailable', async () => {
    nextResponse = { ok: false, status: 503, text: async () => 'unavailable' };
    try {
      await assert.rejects(
        () => transport.sendMail({ from: 'a@example.com', to: 'u@allowed.org', text: 'x' }),
        err => err.responseCode === 451
      );
    } finally {
      nextResponse = { ok: true, status: 200, json: async () => ({ success: true }) };
    }
  });

  await t.test('rejects wrong credentials, including prefixes and extensions of the password', async () => {
    for (const pass of ['wrong', 'secre', 'secret1', 'secret ']) {
      const bad = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false, ignoreTLS: true, auth: { user: 'app', pass } });
      try {
        await assert.rejects(() => bad.sendMail({ from: 'a@example.com', to: 'u@allowed.org', text: 'x' }), err => err.responseCode === 535);
      } finally {
        bad.close();
      }
    }
  });
});
