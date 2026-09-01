# AGENTS.md

Welcome to the **Cloudflare SMTP Relay** codebase. This document outlines architectural patterns, code conventions, operational rules, and workflows to assist AI agents and automated contributors in reading, modifying, and extending this project effectively.

---

## 1. Project Overview & Architecture

`cloudflare-smtp-relay` is a lightweight, modular Node.js SMTP relay server. It accepts inbound SMTP connections (port 587 by default), parses incoming email streams and MIME attachments, validates sender/recipient authorization rules, and forwards messages upstream via the Cloudflare REST API (`https://api.cloudflare.com/client/v4/accounts/{accountId}/email/sending/send`).

### Core Request Flow:
1. **SMTP Listener (`index.js` & `src/smtpServer.js`)**:
   - Listens on configured host/port (defaults: `127.0.0.1:587` locally, `0.0.0.0:587` in containers).
   - Authenticates clients against credentials in `config.yml` (`onAuth`).
2. **Parsing & Filtering (`src/smtpServer.js`)**:
   - Parses the MIME stream via `mailparser` (`simpleParser`).
   - Validates envelope and header senders/recipients against configured domain/email allowlists (`allowed_from_emails`, `allowed_from_domains`, `allowed_to_emails`, `allowed_to_domains`).
   - Applies user-level rules if defined, falling back to global rules.
3. **Upstream Forwarding (`src/cloudflare.js`)**:
   - Converts parsed data and attachments (base64 encoded) into the Cloudflare Email Sending API payload.
   - Dispatches HTTPS POST request with Bearer authorization token.

---

## 2. Codebase Map

| File / Directory | Responsibility |
|---|---|
| `index.js` | Application entry point; initializes config and starts the SMTP listener. |
| `src/config.js` | Configuration loader supporting hot-reload interval and environment variable overrides (`SMTP_RELAY_CONFIG_PATH`). |
| `src/smtpServer.js` | SMTP server definition, authentication hook, recipient/sender rule validation (`isAddressAllowed`), and relay logic. |
| `src/cloudflare.js` | Cloudflare REST API integration, payload formatting (To, Cc, Bcc, attachments), and error handling. |
| `test-client.js` | Standalone test script using `nodemailer` to simulate sending an email with attachments through the relay. |
| `test/` | Automated unit test suite using Node.js native test runner (`node --test`). |
| `Dockerfile` | Multi-stage / Alpine-based container definition using `node:20-alpine` and `pnpm`. |
| `docker-compose.yml` | Local orchestration mounting `config.yml` read-only. |
| `k8s/` | Kubernetes manifests (`deployment.yaml`, `service.yaml`, `configmap.yaml`). |
| `Makefile` | Standardized developer automation targets (`build`, `test`, `lint`, `fmt`, `clean`). |
| `.release-please-config.json` | Release Please configuration defining package strategies and changelog sections. |
| `.release-please-manifest.json` | Release Please manifest tracking the current package version. |
| `.github/workflows/` | GitHub Actions for CI testing (`ci.yml`), Docker publishing (`docker-publish.yml`), Release Please (`release-please.yml`), and PR linting (`semantic-pull-request.yml`). |

---

## 3. Development & Testing Guidelines

### Prerequisites
- Node.js >= 18 (Node 20+ recommended)
- `pnpm` >= 9 (uses `pnpm@10` in lockfile)
- `make`

### Commands
```bash
# Setup dependencies
make dev-setup      # or pnpm install

# Run automated tests
make test           # or pnpm test

# Run linter / syntax check
make lint

# Run a specific test suite
node --test test/config.test.js

# Start local server
pnpm start

# Run end-to-end test client
make test-client    # or node test-client.js
```

### Writing Tests
- All automated unit tests reside in `test/**/*.test.js`.
- Always use Node's built-in `node:test` and `node:assert/strict` modules.
- Ensure test isolation by using temporary directories for mock YAML config files and resetting `require.cache`.
- Background timers created during tests must not block test runner completion (ensure intervals are unreferenced via `.unref()` or cleared).

---

## 4. Configuration Schema

Configurations are stored in YAML format (default path `./config.yml` or overridden via `SMTP_RELAY_CONFIG_PATH`).

```yaml
global:
  smtp_host: "0.0.0.0"             # Bind host (string)
  smtp_port: 587                   # Bind port (integer)
  config_refresh_interval_ms: 300000 # Hot-reload interval in ms (optional, 0 disables)
  cloudflare_account_id: "..."     # Cloudflare Account ID
  cloudflare_api_token: "..."      # Cloudflare API Token (Email Sending permissions)
  allowed_from_emails: []          # Allow specific sender email addresses
  allowed_to_emails: []            # Allow specific recipient email addresses
  allowed_from_domains: []         # Allow specific sender domains (e.g. example.com)
  allowed_to_domains: []           # Allow specific recipient domains

smtp_users:
  - username: "smtp_user"
    password: "smtp_password"
    allowed_from_emails: []        # User-specific override (falls back to global if empty)
    allowed_to_emails: []
    allowed_from_domains: []
    allowed_to_domains: []
```

### Authorization Rule Evaluation
- If both `allowed_*_emails` and `allowed_*_domains` are empty/unspecified, all addresses are permitted for that direction.
- If either list has entries, an address is permitted if it matches **any** allowed email address OR its domain matches **any** allowed domain.
- User-specific rules take precedence over global rules when defined for that user.

---

## 5. Security & Safety Rules for Agents

- **Never commit secrets:** Never commit real API tokens, passwords, or credentials. `config.yml` and `.env` are in `.gitignore`.
- **Maintain CommonJS module style:** The project uses CommonJS (`require` / `module.exports`). Do not mix ES module syntax unless a complete migration is explicitly requested.
- **Do not bypass address validation:** Any changes to email processing must preserve both envelope sender (`mailFrom`), envelope recipients (`rcptTo`), and parsed header recipients (`to`, `cc`, `bcc`) validation.
- **Error sanitization:** Ensure upstream Cloudflare API errors logged internally do not leak sensitive bearer tokens in error messages or client SMTP error responses.

---

## 6. Docker & CI/CD Conventions

- **Docker Image Publishing (`publish.yml`)**:
  - `main` branch pushes build and publish to `ghcr.io/divmora/cloudflare-smtp-relay/debug`.
  - Tag pushes (`v*`) build and publish to `ghcr.io/divmora/cloudflare-smtp-relay` with the tag and `latest`.
- **Release Automation (`release.yml`)**:
  - Pushing tags matching `v*` (e.g., `v1.0.0`) automatically generates a GitHub Release with auto-generated release notes.
- **Continuous Integration (`ci.yml`)**:
  - Pull requests and commits to `main` are automatically tested across Node.js 18.x, 20.x, and 22.x.

---

## 7. Commit & PR Conventions

- Follow **Conventional Commits**:
  - `feat:` New features or enhancements
  - `fix:` Bug fixes
  - `docs:` Documentation updates
  - `test:` Adding or updating tests
  - `refactor:` Code refactoring without behavior change
  - `ci:` Changes to CI/CD workflows
- Keep `README.md`, `config.example.yml`, and `k8s/` files synchronized with any new configuration options or architectural changes.

---

## 8. Licensing Rationale (Apache 2.0)

This repository is explicitly licensed under the **Apache License, Version 2.0** (Open Source) rather than BSL 1.1:

- **Developer Utility & Open Infrastructure:** `cloudflare-smtp-relay` is a lightweight adapter/relay designed to connect standard SMTP clients to Cloudflare's Email Sending API.
- **Unrestricted Commercial & Production Usage:** Users and enterprises are permitted to deploy and run this relay freely in **any** environment (including production clusters, commercial products, internal infrastructure, and homelabs) without needing a commercial EULA or payment from DIVMORA Technologies.
- **Zero Friction & Community Growth:** Permissive open-source licensing encourages maximum community adoption, contributions, and seamless integration into third-party stacks.

