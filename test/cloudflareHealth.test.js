const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function load() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-'));
  const file = path.join(dir, 'config.yml');
  fs.writeFileSync(file, 'global:\n  cloudflare_account_id: acc\n  cloudflare_api_token: secret\n');
  process.env.SMTP_RELAY_CONFIG_PATH = file;
  for (const k of Object.keys(require.cache)) {
    if (k.includes(`${path.sep}src${path.sep}`)) delete require.cache[k];
  }
  return require('../src/cloudflareHealth');
}

const okRes = { ok: true, status: 200, json: async () => ({ success: true, result: { status: 'active' } }) };
const badRes = { ok: false, status: 401, json: async () => ({}) };

test('ok when account verify succeeds', async () => {
  const { createCloudflareHealthChecker } = load();
  const urls = [];
  const c = createCloudflareHealthChecker({ fetchImpl: async u => { urls.push(u); return okRes; } });
  assert.equal(c.getStatus().checked, false);
  const s = await c.check();
  assert.equal(s.ok, true);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /accounts\/acc\/tokens\/verify/);
});

test('falls back to user verify', async () => {
  const { createCloudflareHealthChecker } = load();
  const c = createCloudflareHealthChecker({ fetchImpl: async u => (u.includes('/user/') ? okRes : badRes) });
  assert.equal((await c.check()).ok, true);
});

test('fails when both rejected, without leaking token', async () => {
  const { createCloudflareHealthChecker } = load();
  const c = createCloudflareHealthChecker({ fetchImpl: async () => badRes });
  const s = await c.check();
  assert.equal(s.ok, false);
  assert.ok(!JSON.stringify(s).includes('secret'));
});

test('network errors mark unhealthy', async () => {
  const { createCloudflareHealthChecker } = load();
  const c = createCloudflareHealthChecker({ fetchImpl: async () => { throw new Error('boom secret'); } });
  const s = await c.check();
  assert.equal(s.ok, false);
  assert.ok(!JSON.stringify(s).includes('secret'));
});
