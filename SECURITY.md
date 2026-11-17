# Security Policy

## Supported Versions

Security fixes are released only for the latest minor version. Please upgrade to the latest release before reporting an issue.

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1.0 | :x:                |

Supported runtimes are Node.js **22.x, 24.x and 26.x** (see `engines` in `package.json`). The official container image is `ghcr.io/divmora/cloudflare-smtp-relay`; only images built from the latest release tag get security updates.

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

### Scope

In scope:
- The relay source code in this repository (SMTP handling, authentication, sender/recipient restrictions, MIME parsing, Cloudflare API calls).
- The official `Dockerfile`, container images and Kubernetes manifests in `k8s/`.
- Vulnerabilities in third-party dependencies (`smtp-server`, `mailparser`, `yaml`, `dotenv`) that can be exploited through this relay.

Out of scope:
- Vulnerabilities in Cloudflare's Email Sending service itself. Report those to [Cloudflare](https://www.cloudflare.com/disclosure/).
- Problems caused by insecure deployments that go against the best practices below, such as plaintext SMTP AUTH on a public network or missing address restrictions.
- Denial-of-service from volume alone, spam or social engineering.

### Response & Disclosure SLA
- **Acknowledgment:** We will confirm receipt of your report within **2 business days**.
- **Triage & Assessment:** We aim to confirm or reject the issue and share a severity rating (CVSS) within **7 days**.
- **Fix & Release:** Our target for a patched release is **14 days** for critical and high severity issues and **90 days** for others. Dependency CVEs are tracked through Dependabot and shipped in patch releases.
- **Coordinated Disclosure:** We publish a GitHub Security Advisory (and request a CVE where appropriate) once a fix is available. Please do not disclose the issue publicly until then, or until 90 days after your report, whichever comes first.
- **Credit:** Reporters are credited in release notes and the advisory unless they ask to stay anonymous.
- **Bug Bounty:** We do not currently run a paid bug bounty program.

---

## Security Best Practices

When deploying this relay in production:
- **API Token Scopes:** Create a scoped Cloudflare API token with minimum necessary permissions restricted strictly to the Email Sending service for the intended account.
- **Network Isolation:** The relay accepts SMTP AUTH without TLS, and its STARTTLS uses the `smtp-server` built-in self-signed certificate until configurable certificates land (see [ROADMAP.md](ROADMAP.md)). Treat credentials as sent in plaintext. Keep it on a private network, VPC or VPN, or put a TLS-terminating proxy in front of it. Never expose the SMTP port (587 by default) directly to the internet.
- **Protect Credentials:** Never commit `config.yml` or `.env` to version control. Use Kubernetes Secrets or environment variables in production.
- **Enforce Restrictions:** Configure `allowed_from_emails`, `allowed_from_domains`, `allowed_to_emails`, and `allowed_to_domains` to prevent unauthorized relaying and potential open-relay abuse.
- **Stay Current:** Track releases (watch the repository or use Dependabot/Renovate on your deployment) and upgrade promptly when a security release ships.
