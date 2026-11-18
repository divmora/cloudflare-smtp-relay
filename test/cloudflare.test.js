const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('sendViaCloudflare module', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smtp-cf-test-'));
  const testConfigPath = path.join(tmpDir, 'config.yml');

  const sampleYaml = `
global:
  cloudflare_account_id: "test_cf_account_123"
  cloudflare_api_token: "test_cf_token_abc"
`;
  fs.writeFileSync(testConfigPath, sampleYaml, 'utf8');
  process.env.SMTP_RELAY_CONFIG_PATH = testConfigPath;

  delete require.cache[require.resolve('../src/config')];
  delete require.cache[require.resolve('../src/cloudflare')];

  const { sendViaCloudflare } = require('../src/cloudflare');

  await t.test('sends email successfully with correct payload structure and headers', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ success: true, result: { id: "msg_123" } })
      };
    };

    try {
      const parsedEmail = {
        from: { value: [{ address: 'sender@example.com' }] },
        to: { value: [{ address: 'to1@example.com' }] },
        cc: { value: [{ address: 'cc1@example.com' }] },
        bcc: { value: [{ address: 'bcc1@example.com' }] },
        subject: 'Test Subject',
        text: 'Plain text body',
        html: '<p>HTML body</p>',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('hello attachment'),
            contentType: 'text/plain'
          }
        ]
      };

      const envelope = {
        mailFrom: { address: 'sender@example.com' },
        rcptTo: [
          { address: 'to1@example.com' },
          { address: 'cc1@example.com' },
          { address: 'hidden_bcc@example.com' }
        ]
      };

      const result = await sendViaCloudflare(parsedEmail, envelope);
      assert.deepEqual(result, { success: true, result: { id: "msg_123" } });
      assert.equal(capturedUrl, 'https://api.cloudflare.com/client/v4/accounts/test_cf_account_123/email/sending/send');
      assert.equal(capturedOptions.method, 'POST');
      assert.equal(capturedOptions.headers['Authorization'], 'Bearer test_cf_token_abc');
      assert.equal(capturedOptions.headers['Content-Type'], 'application/json');

      const body = JSON.parse(capturedOptions.body);
      assert.equal(body.from, 'sender@example.com');
      assert.equal(body.to, 'to1@example.com');
      assert.deepEqual(body.cc, ['cc1@example.com']);
      // bcc1 is only in the headers, not the envelope, so it must not be mailed.
      assert.deepEqual(body.bcc, ['hidden_bcc@example.com']);
      assert.equal(body.subject, 'Test Subject');
      assert.equal(body.text, 'Plain text body');
      assert.equal(body.html, '<p>HTML body</p>');
      assert.equal(body.attachments.length, 1);
      assert.equal(body.attachments[0].filename, 'test.txt');
      assert.equal(body.attachments[0].content, Buffer.from('hello attachment').toString('base64'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('throws error if cloudflare API returns non-200', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: false,
        status: 400,
        text: async () => 'Invalid recipient domain'
      };
    };

    try {
      const parsedEmail = {
        from: { value: [{ address: 'sender@example.com' }] },
        to: { value: [{ address: 'to@example.com' }] },
        subject: 'Test'
      };
      await assert.rejects(
        () => sendViaCloudflare(parsedEmail, { mailFrom: { address: 'sender@example.com' }, rcptTo: [{ address: 'to@example.com' }] }),
        /Cloudflare API error 400: Invalid recipient domain/
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('only mails envelope recipients and matches headers case-insensitively', () => {
    const { splitRecipients } = require('../src/cloudflare');
    const parsed = {
      to: { value: [{ address: 'List@Example.com' }, { address: 'not-in-envelope@example.com' }] },
      cc: { value: [{ address: 'cc@example.com' }] }
    };
    const envelope = { rcptTo: [{ address: 'list@example.com' }, { address: 'secret@example.com' }, { address: 'LIST@example.com' }] };
    assert.deepEqual(splitRecipients(parsed, envelope), {
      to: ['list@example.com'],
      cc: [],
      bcc: ['secret@example.com']
    });
  });

  await t.test('promotes a recipient to To when headers name none', () => {
    const { splitRecipients } = require('../src/cloudflare');
    assert.deepEqual(splitRecipients({}, { rcptTo: [{ address: 'a@example.com' }, { address: 'b@example.com' }] }), {
      to: ['a@example.com'],
      cc: [],
      bcc: ['b@example.com']
    });
    assert.deepEqual(splitRecipients({ cc: { value: [{ address: 'c@example.com' }] } }, { rcptTo: [{ address: 'c@example.com' }, { address: 'b@example.com' }] }), {
      to: ['c@example.com'],
      cc: [],
      bcc: ['b@example.com']
    });
  });

  const simpleMail = { from: { value: [{ address: 'sender@example.com' }] }, subject: 'Test' };
  const simpleEnvelope = { mailFrom: { address: 'sender@example.com' }, rcptTo: [{ address: 'to@example.com' }] };

  await t.test('maps Cloudflare errors to temporary or permanent SMTP codes', async () => {
    const originalFetch = global.fetch;
    try {
      for (const [status, code] of [[400, 554], [403, 554], [429, 451], [500, 451], [503, 451]]) {
        global.fetch = async () => ({ ok: false, status, text: async () => 'nope' });
        await assert.rejects(() => sendViaCloudflare(simpleMail, simpleEnvelope), err => err.responseCode === code);
      }
      global.fetch = async () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }); };
      await assert.rejects(() => sendViaCloudflare(simpleMail, simpleEnvelope), err => err.responseCode === 451 && /TimeoutError/.test(err.message));
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('passes a timeout signal to fetch', async () => {
    const originalFetch = global.fetch;
    let signal = null;
    global.fetch = async (url, options) => {
      signal = options.signal;
      return { ok: true, json: async () => ({ success: true }) };
    };
    try {
      await sendViaCloudflare(simpleMail, simpleEnvelope);
      assert.ok(signal instanceof AbortSignal);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
