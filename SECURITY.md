# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

The maintainers of Cloudflare SMTP Relay take security seriously. If you discover a security vulnerability, please do **not** open a public issue.

Instead, please report security concerns via:
1. **GitHub Private Security Advisories**: If available on the repository, submit an advisory directly at `https://github.com/divmora/cloudflare-smtp-relay/security/advisories/new`.
2. **Direct Contact**: Contact the maintainers directly through GitHub or via security disclosure channels provided by the repository owners.

### Information to Include
- Detailed description of the vulnerability and its potential impact.
- Clear steps to reproduce or proof-of-concept (PoC) code.
- Any suggested mitigations or patches if available.

### Response Timeline
- We will acknowledge receipt of your report within 48 hours.
- We will provide regular updates on our progress investigating and fixing the issue.
- Once a fix is verified and released, appropriate credit will be acknowledged in release notes (unless anonymity is requested).

---

## Security Best Practices

When deploying this relay in production:
- **API Token Scopes:** Create a scoped Cloudflare API token with minimum necessary permissions restricted strictly to the Email Sending service for the intended account.
- **Network Isolation:** Deploy behind a secure internal network, VPC, or VPN if unencrypted SMTP authentication is permitted.
- **Protect Credentials:** Never commit `config.yml` or `.env` to version control. Use Kubernetes Secrets or environment variables in production.
- **Enforce Restrictions:** Configure `allowed_from_emails`, `allowed_from_domains`, `allowed_to_emails`, and `allowed_to_domains` to prevent unauthorized relaying and potential open-relay abuse.
