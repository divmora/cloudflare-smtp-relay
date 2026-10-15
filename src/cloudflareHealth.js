const config = require('./config');

const API_BASE = 'https://api.cloudflare.com/client/v4';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Periodically verifies the configured Cloudflare API token and caches the result,
 * so that readiness probes never trigger upstream API calls themselves.
 *
 * The token is verified against the account-scoped endpoint first and falls back to the
 * user-scoped endpoint (Cloudflare issues both token types).
 */
function createCloudflareHealthChecker({ fetchImpl = fetch, now = Date.now } = {}) {
  let status = { checked: false, ok: false, error: null, checkedAt: null };
  let timer = null;
  let inFlight = null;

  async function verify(url, apiToken) {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = await res.json().catch(() => ({}));
    const tokenStatus = body && body.result && body.result.status;
    if (body.success === false || (tokenStatus && tokenStatus !== 'active')) {
      return { ok: false, error: `token status: ${tokenStatus || 'unknown'}` };
    }
    return { ok: true };
  }

  async function runCheck() {
    const accountId = config.getCloudflareAccountID();
    const apiToken = config.getCloudflareAPIToken();
    let result;
    if (!accountId || !apiToken) {
      result = { ok: false, error: 'credentials not configured' };
    } else {
      try {
        result = await verify(`${API_BASE}/accounts/${encodeURIComponent(accountId)}/tokens/verify`, apiToken);
        if (!result.ok) {
          const fallback = await verify(`${API_BASE}/user/tokens/verify`, apiToken);
          if (fallback.ok) result = fallback;
        }
      } catch (e) {
        // Only log the error name/message; never the request headers/token.
        result = { ok: false, error: `request failed: ${e.name}` };
      }
    }
    const wasOk = status.checked ? status.ok : null;
    status = { checked: true, ok: result.ok, error: result.ok ? null : result.error, checkedAt: new Date(now()).toISOString() };
    if (wasOk !== result.ok) {
      console.log(`[Health] Cloudflare check ${result.ok ? 'OK' : `FAILED (${result.error})`}`);
    }
    return status;
  }

  function check() {
    if (!inFlight) inFlight = runCheck().finally(() => { inFlight = null; });
    return inFlight;
  }

  function start() {
    stop();
    const intervalMs = config.getCloudflareHealthCheckIntervalMs();
    if (!(intervalMs > 0)) return;
    check();
    timer = setInterval(check, intervalMs);
    if (timer.unref) timer.unref();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop, check, getStatus: () => status };
}

module.exports = { createCloudflareHealthChecker };
