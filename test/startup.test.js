const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');

function writeConfig(dir, port, healthPort) {
  const file = path.join(dir, 'config.yml');
  fs.writeFileSync(file, `
global:
  smtp_host: "127.0.0.1"
  smtp_port: ${port}
  health_port: ${healthPort}
  cloudflare_health_check_interval_ms: 0
  cloudflare_account_id: "acc"
  cloudflare_api_token: "tok"
smtp_users: []
`, 'utf8');
  return file;
}

function run(configPath, timeoutMs = 5000) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['index.js'], {
      cwd: ROOT,
      env: { ...process.env, SMTP_RELAY_CONFIG_PATH: configPath }
    });
    let output = '';
    child.stdout.on('data', d => { output += d; });
    child.stderr.on('data', d => { output += d; });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('exit', code => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

function occupyPort() {
  return new Promise(resolve => {
    const blocker = net.createServer();
    blocker.listen(0, '127.0.0.1', () => resolve(blocker));
  });
}

test('startup', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smtp-startup-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  await t.test('exits with code 1 when the SMTP port cannot be bound', async () => {
    const blocker = await occupyPort();
    try {
      const { code, output } = await run(writeConfig(tmpDir, blocker.address().port, 0));
      assert.equal(code, 1);
      assert.match(output, /Could not start SMTP listener/);
    } finally {
      blocker.close();
    }
  });

  await t.test('exits with code 1 when the health port cannot be bound', async () => {
    const blocker = await occupyPort();
    const smtpBlocker = await occupyPort();
    const freePort = smtpBlocker.address().port;
    smtpBlocker.close();
    try {
      const { code, output } = await run(writeConfig(tmpDir, freePort, blocker.address().port));
      assert.equal(code, 1);
      assert.match(output, /Failed to start healthcheck server/);
    } finally {
      blocker.close();
    }
  });

  await t.test('exits with code 1 when the config file cannot be loaded', async () => {
    const { code, output } = await run(path.join(tmpDir, 'missing.yml'));
    assert.equal(code, 1);
    assert.match(output, /Could not load configuration/);
  });

  await t.test('keeps running when both ports are free', async () => {
    const a = await occupyPort();
    const b = await occupyPort();
    const smtpPort = a.address().port;
    const healthPort = b.address().port;
    a.close();
    b.close();
    // Killed by the timeout with SIGTERM, which the relay handles with a clean exit (0).
    const { code, output } = await run(writeConfig(tmpDir, smtpPort, healthPort), 1500);
    assert.equal(code, 0);
    assert.match(output, /SMTP Relay Server listening/);
  });
});
