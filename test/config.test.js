const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('config module', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smtp-relay-test-'));
  const testConfigPath = path.join(tmpDir, 'config.yml');

  const sampleYaml = `
global:
  smtp_host: "0.0.0.0"
  smtp_port: 2525
  config_refresh_interval_ms: 60000
  cloudflare_account_id: "test_acc_123"
  cloudflare_api_token: "test_tok_abc"
  allowed_from_emails:
    - "global@example.com"
  allowed_to_emails:
    - "recipient@example.com"
  allowed_from_domains:
    - "example.com"
  allowed_to_domains:
    - "allowed.org"

smtp_users:
  - username: "test_user"
    password: "secret_password"
    allowed_from_emails:
      - "user@example.com"
    allowed_to_emails: []
    allowed_from_domains: []
    allowed_to_domains: []
`;

  fs.writeFileSync(testConfigPath, sampleYaml, 'utf8');
  process.env.SMTP_RELAY_CONFIG_PATH = testConfigPath;

  // Clear require cache to re-initialize module with new env var
  delete require.cache[require.resolve('../src/config')];
  const config = require('../src/config');

  await t.test('loads global host and port correctly', () => {
    assert.equal(config.getSMTPHost(), '0.0.0.0');
    assert.equal(config.getSMTPPort(), 2525);
  });

  await t.test('loads cloudflare credentials correctly', () => {
    assert.equal(config.getCloudflareAccountID(), 'test_acc_123');
    assert.equal(config.getCloudflareAPIToken(), 'test_tok_abc');
  });

  await t.test('loads users correctly mapped by username', () => {
    const fullConfig = config.getConfig();
    assert.ok(fullConfig.users['test_user']);
    assert.equal(fullConfig.users['test_user'].password, 'secret_password');
    assert.deepEqual(fullConfig.users['test_user'].allowed_from_emails, ['user@example.com']);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
