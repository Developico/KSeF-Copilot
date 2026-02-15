# Contributing to KSeF Copilot

First off, thank you for considering contributing to KSeF Copilot! 🎉

This project is an open-source integration module for the Polish National e-Invoice System (KSeF), developed by [Developico Sp. z o.o.](https://developico.com), and we welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to contact@developico.com.

## How Can I Contribute?

### 🐛 Reporting Bugs

1. **Check existing issues** - Someone may have already reported it
2. **Use the bug report template** - Fill in all relevant information
3. **Provide reproduction steps** - Help us understand and fix the issue

### 💡 Suggesting Features

1. **Check the roadmap** in README.md first
2. **Open a Discussion** for larger feature ideas
3. **Be specific** about the use case and expected behavior

### 🔧 Contributing Code

1. Look for issues labeled `good first issue` or `help wanted`
2. Comment on the issue to let us know you're working on it
3. Follow the development setup and guidelines below

### 📝 Improving Documentation

Documentation improvements are always welcome! This includes:
- Fixing typos or clarifying existing docs
- Adding examples and use cases
- Translating documentation

## Development Setup

### Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 9+** - `npm install -g pnpm`
- **Azure CLI** - [Install](https://docs.microsoft.com/cli/azure/install-azure-cli)
- **Azure Functions Core Tools v4** - [Install](https://docs.microsoft.com/azure/azure-functions/functions-run-local)

### Getting Started

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/KSeFCopilot.git
cd KSeFCopilot

# 3. Add upstream remote
git remote add upstream https://github.com/Developico/KSeFCopilot.git

# 4. Install dependencies
pnpm install

# 5. Copy environment templates
cp .env.example .env.local
cp api/local.settings.example.json api/local.settings.json
cp web/.env.example web/.env.local

# 6. Configure your local environment (see docs/AZURE_RESOURCES_SETUP.md)

# 7. Start development servers
pnpm dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Project Structure

```
dvlp-ksef/
├── api/                    # Azure Functions (REST API)
│   ├── src/
│   │   ├── functions/      # HTTP triggers (endpoints)
│   │   ├── lib/            # Core libraries
│   │   │   ├── auth/       # Authentication & authorization
│   │   │   ├── dataverse/  # Dataverse client & services
│   │   │   ├── ksef/       # KSeF API client
│   │   │   └── openai/     # AI categorization
│   │   └── types/          # TypeScript types
│   └── tests/              # API tests
├── web/                    # Next.js Dashboard
│   └── src/
│       ├── app/            # App router pages
│       ├── components/     # React components
│       ├── lib/            # Client utilities
│       └── __tests__/      # Web tests
├── docs/                   # Documentation
└── deployment/             # Infrastructure as Code
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Define types for all function parameters and return values
- Avoid `any` - use `unknown` if type is truly unknown

### Code Style

- Use **Prettier** for formatting (configured in project)
- Use **ESLint** for linting
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `invoice-service.ts` |
| Functions | camelCase | `getInvoiceById()` |
| Classes | PascalCase | `DataverseClient` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `Invoice`, `AuthResult` |

### Documentation

- Add JSDoc comments for public functions
- Include `@param` and `@returns` tags
- Update README.md if adding user-facing features

### Security

- Never log sensitive data (tokens, secrets, PII)
- Use parameterized queries (OData filters)
- Validate all input with Zod schemas
- Follow the principle of least privilege

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, semicolons) |
| `refactor` | Code refactoring |
| `test` | Adding or fixing tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |
| `security` | Security improvements |

### Examples

```
feat(api): add invoice export endpoint

fix(web): resolve date picker timezone issue

docs(readme): update installation instructions

security(auth): implement JWT signature verification
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following the coding guidelines

3. **Write or update tests** for your changes

4. **Run the full test suite**:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

5. **Update documentation** if needed

6. **Commit your changes** with meaningful messages

### Submitting

1. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

2. **Open a Pull Request** against `main`

3. **Fill in the PR template** completely

4. **Link related issues** using `Fixes #123` or `Closes #123`

### After Submitting

- Respond to review feedback promptly
- Make requested changes in new commits (we squash on merge)
- Keep your branch up to date with main if needed

### Review Criteria

Your PR will be reviewed for:

- ✅ Code quality and style
- ✅ Test coverage
- ✅ Documentation updates
- ✅ Security considerations
- ✅ Performance impact
- ✅ Backwards compatibility

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- **Clear title** describing the issue
- **Environment** (Node version, OS, browser if applicable)
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots or logs** if helpful
- **Possible solution** if you have ideas

## Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- **Use case** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What else did you think about?
- **Additional context** - Screenshots, mockups, etc.

## Questions?

- Open a [GitHub Discussion](https://github.com/Developico/KSeFCopilot/discussions)
- Check existing issues and discussions first
- Be patient - we're a small team!

---

Thank you for contributing! 🙏

Maintained by **[Developico Sp. z o.o.](https://developico.com)** | 📧 contact@developico.com
