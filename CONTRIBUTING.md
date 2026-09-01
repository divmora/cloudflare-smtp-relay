# Contributing to Cloudflare SMTP Relay

Thank you for your interest in contributing to **Cloudflare SMTP Relay**! We welcome bug reports, feature requests, documentation improvements, and code contributions across the **DIVMORA Technologies** community.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](https://github.com/divmora/.github/blob/main/CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the repository maintainers or `security@divmora.com`.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Search existing [GitHub Issues](https://github.com/divmora/cloudflare-smtp-relay/issues) before opening a new one.
- Use the **Bug Report** issue template.
- Provide a clear and concise description of the bug, steps to reproduce, expected vs. actual behavior, and relevant logs (without exposing sensitive tokens or passwords).

### 2. Suggesting Enhancements
- Open a feature request issue using the **Feature Request** template.
- Describe the feature, why it is needed, and any alternative solutions you considered.

### 3. Submitting Pull Requests (PRs)
- Fork the repository and create a new feature/fix branch from `main`.
- Keep changes concise and focused on a single topic.
- Ensure all automated unit tests and linters pass before submitting.
- Write tests for new functionality or bug fixes.
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages and PR titles:
  - `feat:` A new feature or capability (triggers a minor version bump)
  - `fix:` A bug fix or patch (triggers a patch version bump)
  - `docs:` Documentation improvements or updates
  - `test:` Adding or updating automated tests
  - `refactor:` Code refactoring without functional or API modification
  - `chore:` Maintenance, dependencies, tooling, or CI updates
  - `ci:` Changes to CI/CD workflows and automation scripts

---

## Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher; 20+ recommended)
- [pnpm](https://pnpm.io/) (version 9 or 10)
- [Make](https://www.gnu.org/software/make/) (for standard build automation)
- [Docker](https://www.docker.com/) (optional, for containerized testing)

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cloudflare-smtp-relay.git
   cd cloudflare-smtp-relay
   ```

2. **Set up local development environment:**
   ```bash
   make dev-setup
   # Or: pnpm install
   ```

3. **Set up local configuration:**
   ```bash
   cp config.example.yml config.yml
   ```
   Edit `config.yml` with your test settings.

4. **Run unit tests and linters:**
   ```bash
   make test
   make lint
   ```

5. **Start the local server:**
   ```bash
   pnpm start
   ```

6. **Test sending an email with test client:**
   ```bash
   make test-client
   # Or: node test-client.js
   ```

---

## Makefile Automation Commands

| Target | Description |
|---|---|
| `make dev-setup` | Install project dependencies (`pnpm install`) |
| `make test` | Run native Node.js test suite (`pnpm test`) |
| `make test-client` | Run end-to-end Nodemailer email dispatch verification |
| `make lint` | Verify JavaScript syntax across all source and test files |
| `make fmt` | Check code formatting |
| `make clean` | Remove temporary cache and coverage files |
| `make docker-build` | Build local Docker container image |

---

## Pull Request Checklist

Before submitting your PR, ensure:
- [ ] Code follows existing style and architecture (CommonJS, clean modular design).
- [ ] Tests have been added or updated for your changes.
- [ ] `make test` and `make lint` pass cleanly locally.
- [ ] Documentation (`README.md`, `config.example.yml`, `k8s/` if applicable) is updated.
- [ ] Commit messages and PR title strictly follow Conventional Commits.
- [ ] No secrets or sensitive configuration values are committed.

---

## Licensing of Contributions

By submitting a pull request or contributing to this repository, you agree that your contributions will be licensed under the project's [Apache License, Version 2.0](LICENSE) terms.

