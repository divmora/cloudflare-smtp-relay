const server = require('./src/smtpServer');
const { getSMTPPort, getSMTPHost, getHealthPort, getHealthHost } = require('./src/config');
const { createHealthServer } = require('./src/healthServer');
const { createCloudflareHealthChecker } = require('./src/cloudflareHealth');

const port = getSMTPPort();
const host = getSMTPHost();

let smtpListening = false;

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
  healthServer.on('error', err => console.error(`[Health] Failed to start healthcheck server: ${err.message}`));
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
  }, 5000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
