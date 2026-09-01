# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

The **DIVMORA Technologies** team and the maintainers of **Cloudflare SMTP Relay** take security seriously. If you discover a security vulnerability, please do **not** open a public issue, discussion, or pull request.

Instead, please report security concerns privately via:
1. **Email:** Send full details to **security@divmora.com**.
2. **GitHub Security Advisories:** Submit a private advisory at `https://github.com/divmora/cloudflare-smtp-relay/security/advisories/new`.

For organization-wide security principles and policies, please review the [DIVMORA Security Policy](https://github.com/divmora/.github/blob/main/SECURITY.md).

### Information to Include
- Detailed description of the vulnerability and its potential impact.
- Clear steps to reproduce or proof-of-concept (PoC) code.
- Affected versions, deployment environment, and configuration.
- Any suggested mitigations or patches if available.

### Response & Disclosure SLA
- **Acknowledgment:** We will acknowledge receipt of your report within **48 hours**.
- **Triage & Assessment:** Our security and engineering team will investigate, validate, and keep you informed.
- **Fix & Release:** A fix will be developed, tested, and released as quickly as possible.
- **Coordinated Disclosure:** Appropriate credit will be acknowledged in release notes and security advisories (unless anonymity is requested).

---

## Security Best Practices

When deploying this relay in production:
- **API Token Scopes:** Create a scoped Cloudflare API token with minimum necessary permissions restricted strictly to the Email Sending service for the intended account.
- **Network Isolation:** Deploy behind a secure internal network, VPC, or VPN if unencrypted SMTP authentication is permitted.
- **Protect Credentials:** Never commit `config.yml` or `.env` to version control. Use Kubernetes Secrets or environment variables in production.
- **Enforce Restrictions:** Configure `allowed_from_emails`, `allowed_from_domains`, `allowed_to_emails`, and `allowed_to_domains` to prevent unauthorized relaying and potential open-relay abuse.

