# Cloudflare SMTP Relay Product Roadmap

This document serves as the **living product roadmap** for Cloudflare SMTP Relay.
- **Adding Items**: Whenever a new capability, enhancement, or edge-case improvement is identified for the future, add it here under the appropriate category.
- **Deduplication with GitHub Issues**: If an active GitHub Issue already exists or is explicitly created for a feature, bug fix, or task, do not duplicate it in `ROADMAP.md`. GitHub Issues track active, assigned, or triaged tasks, while `ROADMAP.md` captures high-level, unassigned architectural vision and backlog capabilities.
- **Removing Items**: Once a feature is fully implemented, verified, and committed, **remove it from this roadmap**.

> **Scope:** Cloudflare Email Service now offers its own authenticated SMTP submission (`smtp.mx.cloudflare.net:465`, implicit TLS). This relay is kept for clients that cannot use that endpoint directly (port 587 / STARTTLS only, or no TLS at all) and for setups that want per-app credentials and address allowlists instead of handing every app a Cloudflare API token. Only work that serves that niche is planned; larger features (queueing, metrics, tracing, rate limiting, multi-tenant routing, Helm chart) are out of scope.

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
