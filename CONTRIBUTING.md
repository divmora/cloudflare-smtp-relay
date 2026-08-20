# Contributing to Cloudflare SMTP Relay

Thank you for your interest in contributing to **Cloudflare SMTP Relay**! We welcome bug reports, feature requests, documentation improvements, and code contributions.

---

## Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the repository maintainers.

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
- Ensure all automated unit tests pass before submitting.
- Write tests for new functionality or bug fixes.
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:
  - `feat:` A new feature
  - `fix:` A bug fix
  - `docs:` Documentation only changes
  - `test:` Adding or updating tests
  - `refactor:` A code change that neither fixes a bug nor adds a feature
  - `ci:` Changes to CI configuration and scripts

---

## Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher; 20+ recommended)
- [pnpm](https://pnpm.io/) (version 9 or 10)
- [Docker](https://www.docker.com/) (optional, for containerized testing)

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cloudflare-smtp-relay.git
   cd cloudflare-smtp-relay
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up local configuration:**
   ```bash
   cp config.example.yml config.yml
   ```
   Edit `config.yml` with your test settings.

4. **Run tests:**
   ```bash
   pnpm test
   ```

5. **Start the local server:**
   ```bash
   pnpm start
   ```

6. **Test sending an email:**
   ```bash
   node test-client.js
   ```

---

## Pull Request Checklist

Before submitting your PR, ensure:
- [ ] Code follows existing style and architecture (CommonJS, clean modular design).
- [ ] Tests have been added or updated for your changes.
- [ ] `pnpm test` passes locally.
- [ ] Documentation (`README.md`, `config.example.yml`, `k8s/` if applicable) is updated.
- [ ] No secrets or sensitive configuration values are committed.
