# Cloudflare SMTP Relay

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/divmora/cloudflare-smtp-relay)
[![GitHub Release](https://img.shields.io/github/v/release/divmora/cloudflare-smtp-relay?style=flat-square)](https://github.com/divmora/cloudflare-smtp-relay/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/divmora/cloudflare-smtp-relay/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/divmora/cloudflare-smtp-relay/actions/workflows/ci.yml)
[![Docker Image](https://img.shields.io/badge/ghcr.io-divmora%2Fcloudflare--smtp--relay-blue?logo=docker&style=flat-square)](https://github.com/divmora/cloudflare-smtp-relay/pkgs/container/cloudflare-smtp-relay)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square&logo=node.js)](https://nodejs.org)

A robust, modular Node.js SMTP relay server designed to receive standard SMTP connections and forward emails seamlessly via the Cloudflare REST API.

---

## Features

- **Cloudflare API Integration:** Forwards emails reliably using Cloudflare's Email Sending API (`/email/sending/send`).
- **Attachment Support:** Full MIME parsing via `mailparser` with automatic base64 encoding for email attachments.
- **Dynamic Configuration:** YAML-based configuration (`config.yml`) with configurable in-memory hot-reloading (`config_refresh_interval_ms`) without server restarts.
- **Granular Security & Authorization:** Multi-user authentication with domain-level and email-level restriction controls for both incoming and outgoing addresses.
- **Container & Kubernetes Ready:** Dockerfile, Docker Compose, and complete Kubernetes deployment manifests (`k8s/`) included.
- **Automated Test Suite:** Built-in unit tests using Node.js native test runner and an interactive end-to-end Nodemailer client.

---

## How It Works

```
+----------------+      SMTP (587)       +-------------------------+
|  Application   | --------------------> |  Cloudflare SMTP Relay  |
| (or Mail User) |                       |       (Node.js)         |
+----------------+                       +-------------------------+
                                                      |
                                          1. Authenticate user
                                          2. Parse MIME & attachments
                                          3. Validate Sender/Recipient rules
                                                      |
                                         HTTPS REST API (POST)
                                         Bearer API Token
                                                      v
                                         +-------------------------+
                                         |     Cloudflare API      |
                                         |  (/email/sending/send)  |
                                         +-------------------------+
                                                      |
                                                      v
                                            Delivered to Recipient
```

---

## Prerequisites

- **Node.js** >= 18.0.0 (Node.js 20+ recommended)
- **pnpm** (Package manager, version 9 or 10)
- **Docker & Docker Compose** (Optional, for containerized deployments)
- **Cloudflare Account** with an active Account ID and an API Token having Email Sending permissions for your verified domains.

---

## Installation & Quickstart

1. **Clone the repository:**
   ```bash
   git clone https://github.com/divmora/cloudflare-smtp-relay.git
   cd cloudflare-smtp-relay
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up configuration:**
   ```bash
   cp config.example.yml config.yml
   ```

4. **Edit `config.yml`:**
   Fill in your Cloudflare credentials (`cloudflare_account_id` and `cloudflare_api_token`) and define your SMTP users and security policies.

> **Note:** `config.yml` and `.env` are automatically ignored by Git to keep your credentials secure.

---

## Configuration Reference

The relay server is configured via a YAML file (`config.yml` by default, or the path set in `SMTP_RELAY_CONFIG_PATH`).

### Configuration Options

```yaml
global:
  smtp_host: "0.0.0.0"             # Host interface to bind to (e.g. 127.0.0.1 or 0.0.0.0)
  smtp_port: 587                   # SMTP port to listen on
  config_refresh_interval_ms: 300000 # Interval (in ms) to reload config file (0 or omitted = disabled)
  cloudflare_account_id: "YOUR_ACCOUNT_ID" # Cloudflare Account ID
  cloudflare_api_token: "YOUR_API_TOKEN"   # Cloudflare API Bearer Token
  allowed_from_emails: []          # Default allowed sender emails (empty = no restriction)
  allowed_to_emails: []            # Default allowed recipient emails (empty = no restriction)
  allowed_from_domains: []         # Default allowed sender domains (e.g. "example.com")
  allowed_to_domains: []           # Default allowed recipient domains (e.g. "mycompany.org")

smtp_users:
  - username: "example_user"       # SMTP authentication username
    password: "example_password"   # SMTP authentication password
    allowed_from_emails: []        # User-level allowed sender emails override
    allowed_to_emails: []          # User-level allowed recipient emails override
    allowed_from_domains: []       # User-level allowed sender domains override
    allowed_to_domains: []         # User-level allowed recipient domains override
```

### Access Control & Validation Rules

- **Precedence:** If a user specifies user-level `allowed_*` lists in `smtp_users`, those lists are evaluated for that user. If empty, the relay falls back to the corresponding `global.allowed_*` lists.
- **Rule Matching:** If both `allowed_*_emails` and `allowed_*_domains` are empty, any address is permitted. If entries are present, an address is allowed if it matches **any** allowed email address OR its domain matches **any** allowed domain.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SMTP_RELAY_CONFIG_PATH` | Path to the YAML configuration file | `./config.yml` |
| `PORT` / `SMTP_PORT` | (Optional) Port override for test client scripts | `587` |

---

## Deployment & Usage

### 1. Running Locally

Start the SMTP relay server:
```bash
pnpm start
```
The server will bind to the configured `smtp_host` and `smtp_port` (default `127.0.0.1:587` or `0.0.0.0:587`).

---

### 2. Running with Docker Compose

1. Make sure `config.yml` is populated in the root directory.
2. Start the container:
   ```bash
   docker-compose up -d --build
   ```
3. View logs:
   ```bash
   docker-compose logs -f
   ```

---

### 3. Running with Pre-built Docker Image (GHCR)

Published Docker images are available from GitHub Container Registry:

- **Production Releases (Tags):** `ghcr.io/divmora/cloudflare-smtp-relay:latest` or `ghcr.io/divmora/cloudflare-smtp-relay:<tag>`
- **Main Branch (Debug / Development):** `ghcr.io/divmora/cloudflare-smtp-relay/debug:latest`

```bash
docker run -d \
  --name cloudflare-smtp-relay \
  -p 587:587 \
  -v $(pwd)/config.yml:/app/config.yml:ro \
  -e SMTP_RELAY_CONFIG_PATH=/app/config.yml \
  ghcr.io/divmora/cloudflare-smtp-relay:latest
```

---

### 4. Deploying to Kubernetes

Kubernetes manifests are provided in the `k8s/` folder:

1. **Update `k8s/configmap.yaml`** with your Cloudflare credentials and SMTP user settings.
2. **Apply the manifests:**
   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   ```
3. Verify the deployment:
   ```bash
   kubectl get pods -l app=cloudflare-smtp-relay
   kubectl get svc cloudflare-smtp-relay
   ```

---

## Testing

### Automated Unit Tests

Run the automated test suite powered by Node.js native test runner:
```bash
pnpm test
```

### End-to-End Test Client

A built-in test client (`test-client.js`) uses `nodemailer` to send a sample email with an attachment through the running relay server:

```bash
# Set credentials matching your config.yml (if different from defaults)
SMTP_PORT=587 SMTP_USERNAME=example_user SMTP_PASSWORD=example_password SENDER_EMAIL=sender@example.com RECIPIENT_EMAIL=recipient@example.com node test-client.js
```

---

## Project Structure

```
cloudflare-smtp-relay/
├── .github/
│   ├── ISSUE_TEMPLATE/        # GitHub issue templates (bug reports, feature requests)
│   ├── workflows/
│   │   ├── ci.yml             # Automated CI tests across Node versions
│   │   ├── publish.yml        # Docker image build & publish to GHCR
│   │   └── release.yml        # Automated GitHub Release generation on tags
│   └── PULL_REQUEST_TEMPLATE.md
├── k8s/                       # Kubernetes deployment, service, and configmap
│   ├── configmap.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── src/
│   ├── cloudflare.js          # Cloudflare Sending API client
│   ├── config.js              # Configuration loader & hot-reload manager
│   └── smtpServer.js          # SMTPServer lifecycle, auth, and validation logic
├── test/                      # Unit test suites (node --test)
│   ├── cloudflare.test.js
│   ├── config.test.js
│   └── smtpServer.test.js
├── .release-please-manifest.json # Release Please manifest tracking versions
├── AGENTS.md                  # Instructions and architecture overview for AI agents
├── CODE_OF_CONDUCT.md         # Contributor Covenant Code of Conduct
├── CONTRIBUTING.md            # Guidelines for contributing
├── Dockerfile                 # Container image specification
├── LICENSE                    # ISC License
├── README.md                  # Project documentation
├── SECURITY.md                # Security policy and vulnerability disclosure
├── config.example.yml         # Sample configuration template
├── docker-compose.yml         # Local container orchestration
├── index.js                   # Application entry point
├── package.json
├── release-please-config.json # Release Please packaging and changelog configuration
└── test-client.js             # End-to-end SMTP client verification script
```

---

## Community & Contributing

- **AI Agents & Contributors:** Read [AGENTS.md](AGENTS.md) for code conventions, architecture maps, and guidelines.
- **Contributions:** Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started with pull requests and issues.
- **Code of Conduct:** Please review our [Code of Conduct](CODE_OF_CONDUCT.md).
- **Security:** To report vulnerabilities, refer to [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the [ISC License](LICENSE).
