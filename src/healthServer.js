const http = require('http');
const config = require('./config');

/**
 * Creates a dedicated HTTP server exposing liveness and readiness probes.
 *
 *  - GET /healthz : process is alive (always 200 while the event loop runs).
 *  - GET /readyz  : SMTP listener is bound and Cloudflare credentials are configured.
 *
 * @param {{ isSmtpListening: () => boolean, cloudflareHealth?: { getStatus: () => object } }} opts
 */
function createHealthServer({ isSmtpListening, cloudflareHealth }) {
  return http.createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(405, { status: 'method not allowed' });
    }

    const path = (req.url || '').split('?')[0];

    if (path === '/healthz') {
      return send(200, { status: 'ok' });
    }

    if (path === '/readyz') {
      const checks = {
        smtp_listening: Boolean(isSmtpListening()),
        cloudflare_credentials: Boolean(config.getCloudflareAccountID() && config.getCloudflareAPIToken())
      };
      // The upstream check is cached (see cloudflareHealth.js); skipped when disabled or absent.
      let cloudflare = null;
      if (cloudflareHealth && config.getCloudflareHealthCheckIntervalMs() > 0) {
        cloudflare = cloudflareHealth.getStatus();
        checks.cloudflare_api = cloudflare.checked && cloudflare.ok;
      }
      const ready = Object.values(checks).every(Boolean);
      return send(ready ? 200 : 503, { status: ready ? 'ready' : 'not ready', checks, ...(cloudflare && { cloudflare }) });
    }

    return send(404, { status: 'not found' });
  });
}

module.exports = { createHealthServer };
