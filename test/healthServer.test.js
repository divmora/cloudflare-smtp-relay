const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function get(port, urlPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function load(yamlText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-'));
  const file = path.join(dir, 'config.yml');
  fs.writeFileSync(file, yamlText);
  process.env.SMTP_RELAY_CONFIG_PATH = file;
  for (const k of Object.keys(require.cache)) {
    if (k.includes(`${path.sep}src${path.sep}`)) delete require.cache[k];
  }
  return require('../src/healthServer');
}

async function withServer(yamlText, listening, fn) {
  const { createHealthServer } = load(yamlText);
  const server = createHealthServer({ isSmtpListening: () => listening });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    await fn(server.address().port);
  } finally {
    await new Promise(r => server.close(r));
  }
}

const creds = 'global:\n  cloudflare_account_id: a\n  cloudflare_api_token: t\n';

test('/healthz returns 200', async () => {
  await withServer('global: {}\n', false, async port => {
    const r = await get(port, '/healthz');
    assert.equal(r.status, 200);
  });
});

test('/readyz is 200 when listening and credentials configured', async () => {
  await withServer(creds, true, async port => {
    const r = await get(port, '/readyz');
    assert.equal(r.status, 200);
    assert.equal(JSON.parse(r.body).status, 'ready');
  });
});

test('/readyz is 503 when SMTP not listening', async () => {
  await withServer(creds, false, async port => {
    assert.equal((await get(port, '/readyz')).status, 503);
  });
});

test('/readyz is 503 when credentials missing', async () => {
  await withServer('global: {}\n', true, async port => {
    assert.equal((await get(port, '/readyz')).status, 503);
  });
});

test('unknown path 404 and bad method 405', async () => {
  await withServer(creds, true, async port => {
    assert.equal((await get(port, '/nope')).status, 404);
    assert.equal((await get(port, '/healthz', 'POST')).status, 405);
  });
});

test('/readyz reflects cached Cloudflare status', async () => {
  const { createHealthServer } = load(creds);
  let st = { checked: false, ok: false };
  const server = createHealthServer({ isSmtpListening: () => true, cloudflareHealth: { getStatus: () => st } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    assert.equal((await get(port, '/readyz')).status, 503);
    st = { checked: true, ok: true };
    assert.equal((await get(port, '/readyz')).status, 200);
    st = { checked: true, ok: false, error: 'HTTP 401' };
    assert.equal((await get(port, '/readyz')).status, 503);
  } finally {
    await new Promise(r => server.close(r));
  }
});
