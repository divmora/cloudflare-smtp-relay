const server = require('./src/smtpServer');
const { getSMTPPort, getSMTPHost } = require('./src/config');

const port = getSMTPPort();
const host = getSMTPHost();

server.listen(port, host, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 SMTP Relay Server listening on ${host}:${port}`);
  console.log(`🔒 Authentication enabled`);
  console.log(`☁️  Cloudflare HTTPS integration active`);
  console.log(`==============================================\n`);
});

function handleShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
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
