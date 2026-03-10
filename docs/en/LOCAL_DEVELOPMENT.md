# Local Development

> **Polish version:** [LOKALNE_WDROŻENIE.md](../pl/LOKALNE_WDRO%C5%BBENIE.md) | **English version:** [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

## Table of Contents
- [Prerequisites](#prerequisites)
- [Repository Clone](#repository-clone)
- [API Setup (Azure Functions)](#api-setup-azure-functions)
  - [Install Dependencies](#install-dependencies)
  - [Configuration](#configuration)
  - [run the API](#run-the-api)
- [Web Setup (Next.js)](#web-setup-nextjs)
  - [Install Dependencies](#install-dependencies-1)
  - [Configuration](#configuration-1)
  - [Run the Web App](#run-the-web-app)
- [Code App (Vite + React SPA)](#code-app-vite--react-spa)
- [Full Local Stack](#full-local-stack)
- [Testing](#testing)
- [Common Issues](#common-issues)
- [IDE Configuration](#ide-configuration)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Azure Functions Core Tools** | 4.x | `npm install -g azure-functions-core-tools@4` |
| **Git** | 2.x+ | [git-scm.com](https://git-scm.com/) |
| **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |

### Recommended VS Code Extensions

| Extension | ID | Purpose |
|-----------|----|---------|
| Azure Functions | `ms-azuretools.vscode-azurefunctions` | Functions debugging |
| ESLint | `dbaeumer.vscode-eslint` | Linting |
| Prettier | `esbenp.prettier-vscode` | Code formatting |
| REST Client | `humao.rest-client` | API testing |
| Thunder Client | `rangav.vscode-thunder-client` | GUI API testing |

---

## Repository Clone

```bash
git clone https://github.com/Developico/KSeF-Copilot.git
cd dvlp-ksef
```

Project structure:
```
dvlp-ksef/
├── api/            # Azure Functions (Node.js/TypeScript)
├── web/            # Next.js frontend
├── code-app/       # Vite + React SPA (Power Platform Code App)
├── deployment/     # Deployment configs and scripts
├── docs/           # Documentation
└── README.md
```

---

## API Setup (Azure Functions)

### Install Dependencies

```bash
cd api
npm install
```

### Configuration

1. **Copy template:**

```bash
cp local.settings.example.json local.settings.json
```

2. **Fill in the values in `local.settings.json`:**

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "NODE_ENV": "development",

    "DV_URL": "https://your-org.crm4.dynamics.com",
    "DV_CLIENT_ID": "your-app-registration-client-id",
    "DV_CLIENT_SECRET": "your-app-registration-secret",
    "DV_TENANT_ID": "your-tenant-id",

    "ENTRA_TENANT_ID": "your-tenant-id",
    "ENTRA_CLIENT_ID": "your-api-app-registration-client-id",
    "SKIP_AUTH": "true",

    "KSEF_ENV": "test",

    "OPENAI_API_KEY": "your-openai-api-key",
    "OPENAI_ENDPOINT": "https://your-resource.openai.azure.com",
    "OPENAI_MODEL": "gpt-4o-mini"
  }
}
```

> **Minimum for startup:** `DV_URL`, `DV_CLIENT_ID`, `DV_CLIENT_SECRET`, `DV_TENANT_ID`, `SKIP_AUTH=true`
>
> **Full reference:** [Environment Variables](./ENVIRONMENT_VARIABLES.md)

3. **Verify Dataverse connection:**

```bash
npm run build
func start
# In another terminal:
curl http://localhost:7071/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "dataverse": "connected",
    "keyVault": "skipped",
    "ksef": "test"
  }
}
```

### Run the API

```bash
# Development mode (with auto-rebuild)
npm run watch
# In another terminal:
func start

# Or a single combined command:
npm run dev
```

The API will be available at: `http://localhost:7071/api`

---

## Web Setup (Next.js)

### Install Dependencies

```bash
cd web
pnpm install
```

### Configuration

1. **Create `web/.env.local`:**

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

AZURE_AD_CLIENT_ID=your-web-app-registration-client-id
AZURE_AD_CLIENT_SECRET=your-web-app-registration-secret
AZURE_AD_TENANT_ID=your-tenant-id

NEXT_PUBLIC_API_URL=http://localhost:7071/api
NEXT_PUBLIC_API_SCOPE=api://your-api-client-id/access_as_user
```

2. **Generate `NEXTAUTH_SECRET`:**

```bash
openssl rand -base64 32
```

### Run the Web App

```bash
pnpm dev
```

The web application will be available at: `http://localhost:3000`

> **Note:** For the web app to work, the API must be running on port 7071.

---

## Code App (Vite + React SPA)

The Code App is a lightweight SPA designed for embedding in Power Platform as a Code Component.

```bash
cd code-app
pnpm install
pnpm dev
```

Available at: `http://localhost:3002`

> **Note:** Code App uses the same API but may require separate Entra ID configuration for Power Platform auth flow.

### Vite Proxy

The Code App includes a built-in Vite proxy that forwards `/api` requests to the local Azure Functions instance. This is configured in `code-app/vite.config.ts`:

```typescript
server: {
  port: 3002,
  proxy: {
    '/api': {
      target: 'http://localhost:7071',
      changeOrigin: true,
    },
  },
}
```

This means API calls from the Code App (e.g., `fetch('/api/invoices')`) are transparently proxied to `http://localhost:7071/api/invoices` during local development. No separate `VITE_API_URL` configuration is required.

---

## Full Local Stack

To run the entire application locally:

### Terminal 1 — API
```bash
cd api
npm run dev
```

### Terminal 2 — Web
```bash
cd web
pnpm dev
```

### Terminal 3 — Code App (optional)
```bash
cd code-app
pnpm dev
```

### Available ports

| Service | Port | URL |
|---------|------|-----|
| API (Azure Functions) | 7071 | `http://localhost:7071/api` |
| Web (Next.js) | 3000 | `http://localhost:3000` |
| Code App (Vite) | 3002 | `http://localhost:3002` |

---

## Testing

### API Tests

```bash
cd api

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npx vitest run tests/unit/service.test.ts
```

### Web Tests

```bash
cd web
pnpm test
```

### Type Checking

```bash
# API
cd api
npm run build  # TypeScript compilation

# Web
cd web
pnpm typecheck
```

---

## Common Issues

### "Cannot connect to Dataverse"

1. Verify `DV_URL` points to the correct environment
2. Check that `DV_CLIENT_ID` and `DV_CLIENT_SECRET` are valid
3. Verify the Application User is created in Power Platform Admin Center
4. Ensure the Application User has the `KSeF Admin` security role

### "func: command not found"

```bash
npm install -g azure-functions-core-tools@4
```

### "Port 7071 already in use"

```bash
# Windows
npx kill-port 7071

# macOS/Linux
lsof -ti:7071 | xargs kill -9
```

### "SKIP_AUTH crash in production"

This is **by design**. `SKIP_AUTH=true` is not allowed when `NODE_ENV=production`. Set `SKIP_AUTH=false` or remove the variable entirely.

### "Key Vault not accessible locally"

For local development, set `KV_ENABLED=false` in `local.settings.json` and provide secrets directly as environment variables (`OPENAI_API_KEY`, `DV_CLIENT_SECRET`, etc.).

### "CORS errors in browser"

Azure Functions automatically allows `localhost` origins in development mode. If you still see CORS errors:
1. Check that `NEXT_PUBLIC_API_URL` matches the actual API URL
2. Verify the API is running and healthy

---

## IDE Configuration

### VS Code Settings (recommended)

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "azureFunctions.projectSubpath": "api",
  "azureFunctions.projectLanguage": "TypeScript",
  "azureFunctions.projectRuntime": "~4"
}
```

### Debug Configuration

`.vscode/launch.json` supports debugging Azure Functions directly in VS Code. Press `F5` to start the API with debugger attached.

---

## Related Documents

- [Environment Variables](./ENVIRONMENT_VARIABLES.md) — complete env var reference
- [Architecture](./ARCHITECTURE.md) — system overview
- [API Reference](./API.md) — REST API documentation
- [Troubleshooting](./TROUBLESHOOTING.md) — common issues and solutions

---

**Last updated:** 2026-03-10  
**Version:** 1.1  
**Maintainer:** dvlp-dev team
