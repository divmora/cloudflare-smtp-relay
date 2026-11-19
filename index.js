const config = require('./src/config');
const { getSMTPPort, getSMTPHost, getHealthPort, getHealthHost } = config;

// Without a readable config there are no SMTP users or Cloudflare credentials, so the relay
// could only refuse every message. Stop instead, so the problem is visible.
if (!config.isLoaded()) {
  console.error(`[Server] Could not load configuration from ${config.getConfigPath()}: ${config.getLastLoadError()}`);
  if (/EACCES/.test(config.getLastLoadError() || '')) {
    console.error(`[Server] The file is not readable by this process (uid ${process.getuid ? process.getuid() : '?'}). Fix its permissions or ownership.`);
  }
  process.exit(1);
}

const server = require('./src/smtpServer');
const { createHealthServer } = require('./src/healthServer');
const { createCloudflareHealthChecker } = require('./src/cloudflareHealth');

const port = getSMTPPort();
const host = getSMTPHost();

let smtpListening = false;

// A bind failure (port in use, or a non-root user binding a port below 1024) must stop the
// process, so Docker/Kubernetes restart it and the failure is visible. Errors after startup
// come from individual client connections and are only logged (see src/smtpServer.js).
server.on('error', err => {
  if (smtpListening) return;
  console.error(`[Server] Could not start SMTP listener on ${host}:${port}: ${err.message}`);
  if (err.code === 'EACCES' && port < 1024) {
    console.error('[Server] Ports below 1024 need root, or net.ipv4.ip_unprivileged_port_start=0 for non-root users. Use a port >= 1024 or allow it in your runtime.');
  }
  process.exit(1);
});

server.listen(port, host, () => {
  smtpListening = true;
  console.log(`\n==============================================`);
  console.log(`🚀 SMTP Relay Server listening on ${host}:${port}`);
  console.log(`🔒 Authentication enabled`);
  console.log(`☁️  Cloudflare HTTPS integration active`);
  console.log(`==============================================\n`);
});

// Dedicated HTTP healthcheck listener (/healthz, /readyz). health_port: 0 disables it.
const healthPort = getHealthPort();
let healthServer = null;
const cloudflareHealth = createCloudflareHealthChecker();
if (healthPort > 0) {
  healthServer = createHealthServer({ isSmtpListening: () => smtpListening, cloudflareHealth });
  const healthHost = getHealthHost();
  cloudflareHealth.start();
  healthServer.on('error', err => {
    console.error(`[Health] Failed to start healthcheck server on ${healthHost}:${healthPort}: ${err.message}`);
    process.exit(1);
  });
  healthServer.listen(healthPort, healthHost, () => {
    console.log(`[Health] Healthcheck endpoints on http://${healthHost}:${healthPort}/healthz and /readyz`);
  });
}

function handleShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  smtpListening = false;
  cloudflareHealth.stop();
  if (healthServer) healthServer.close();
  server.close(() => {
    console.log('[Server] SMTP relay server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 25000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
