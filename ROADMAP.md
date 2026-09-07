# Cloudflare SMTP Relay Product Roadmap

This document serves as the **living product roadmap** for Cloudflare SMTP Relay.
- **Adding Items**: Whenever a new capability, enhancement, or edge-case improvement is identified for the future, add it here under the appropriate category.
- **Removing Items**: Once a feature is fully implemented, verified, and committed, **remove it from this roadmap**.

---

## 1. Transport Security & Inbound TLS Hardening

- [ ] **Configurable STARTTLS / TLS Certificate Support**
  - Add native TLS/STARTTLS support to the inbound SMTP server (`smtp-server` TLS options):
    ```yaml
    global:
      tls:
        enabled: true
        key_path: "/certs/smtp.key"
        cert_path: "/certs/smtp.crt"
        ca_path: "/certs/ca.crt"        # Optional client certificate verification
        min_version: "TLSv1.2"          # Enforce TLS 1.2 or TLS 1.3
    ```
  - Support hot-reloading certificates when modified on disk without dropping active SMTP listener sockets.

- [ ] **Enforced TLS Mode (`require_tls`)**
  - Add option to reject plaintext authentication and incoming mail if STARTTLS is not negotiated (`requireTLS: true`).
  - Protect credentials and email content from snooping across untrusted internal networks.

---

## 2. Queueing, Resiliency & Offline Spooling

- [ ] **Local Disk / Embedded Spool with Exponential Backoff Retry**
  - Implement a persistent local spool queue (e.g. SQLite via `better-sqlite3` or local file-based maildir) to buffer outgoing emails during upstream Cloudflare API outages, HTTP 5xx errors, or network partitions.
  - Background retry worker with configurable retry limits, exponential backoff with jitter, and dead-letter queue (DLQ) logging for permanent delivery failures.

- [ ] **Graceful Drain & Shutdown on SIGTERM/SIGINT**
  - Handle termination signals cleanly by stopping acceptance of new SMTP connections, waiting for in-flight Cloudflare API dispatches to conclude (up to a timeout), and closing server sockets safely.

---

## 3. Observability, Telemetry & Health Probes

- [ ] **Prometheus Metrics Exporter**
  - Provide an optional embedded HTTP server exposing a `/metrics` Prometheus endpoint:
    - `smtp_relay_connections_total`: Total inbound SMTP connections.
    - `smtp_relay_active_connections`: Current active SMTP connections.
    - `smtp_relay_emails_received_total`: Total parsed email messages.
    - `smtp_relay_emails_forwarded_total`: Total successfully forwarded emails to Cloudflare.
    - `smtp_relay_emails_rejected_total`: Emails rejected due to auth or allowlist violations.
    - `smtp_relay_cloudflare_duration_seconds`: Histogram of Cloudflare REST API call latencies.

- [ ] **Kubernetes Liveness & Readiness Probes (`/healthz`, `/readyz`)**
  - Dedicated HTTP healthcheck endpoint for Kubernetes pods, validating both local SMTP port binding readiness and upstream Cloudflare API credential validation.

- [ ] **OpenTelemetry (OTel) Distributed Tracing**
  - Propagate W3C Trace Context headers from inbound email headers into Cloudflare API requests and structured JSON logs.

---

## 4. Rate Limiting, Abuse Prevention & Message Limits

- [ ] **Token Bucket Rate Limiter (Per User & Per Client IP)**
  - Enforce configurable rate limits to prevent spam bursts and protect Cloudflare account sending quotas:
    ```yaml
    global:
      rate_limit:
        messages_per_minute: 60
        burst: 10
    ```
  - Support per-user rate limit overrides in `smtp_users`.

- [ ] **Configurable Message Size Limit (`max_message_size_bytes`)**
  - Enforce `maxSize` at the SMTP handshake level to reject oversized payloads early before buffering attachments into memory.

- [ ] **Concurrent Connection Limits**
  - Add `max_clients` and `max_connections_per_ip` guards to mitigate denial-of-service attempts.

---

## 5. Multi-Tenant Routing & Header Controls

- [ ] **Per-User / Per-Domain Cloudflare Credentials**
  - Allow individual `smtp_users` or specific sender domains to define dedicated `cloudflare_account_id` and `cloudflare_api_token` overrides, enabling multi-tenant mail routing from a single relay instance.

- [ ] **Extended Email Headers & Threading Preservation**
  - Preserve standard threading and control headers (`In-Reply-To`, `References`, `List-Unsubscribe`, `Message-ID`, `X-Priority`) through the Cloudflare API payload.

- [ ] **Pre-Flight Domain Verification & SPF/DKIM Diagnostics**
  - Add an optional pre-flight verification mode to check if the sender domain is verified in the associated Cloudflare account before attempting dispatch.

---

## 6. Cloud Native & Deployment Ecosystem

- [ ] **Helm Chart for Kubernetes**
  - Provide a standardized, production-ready Helm chart (`charts/cloudflare-smtp-relay`) supporting Horizontal Pod Autoscaling (HPA), automated Secret integration, and TLS ingress.

- [ ] **External Secret Store Integration (Vault / AWS Secrets Manager)**
  - Support resolving Cloudflare API tokens and SMTP user passwords dynamically from external secret providers via environment variable templates or secret files.
