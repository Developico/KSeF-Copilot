# dvlp-ksef

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-blue.svg)](https://azure.microsoft.com/en-us/products/functions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/dvlp-dev/dvlp-ksef/actions/workflows/ci.yml/badge.svg)](https://github.com/dvlp-dev/dvlp-ksef/actions/workflows/ci.yml)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io/)
[![Tests](https://img.shields.io/badge/tests-37%20passed-success.svg)](https://github.com/dvlp-dev/dvlp-ksef)

> 🇵🇱 Open-source integration module for Polish National e-Invoice System (KSeF) with Dataverse backend and AI-powered categorization.

## 🎯 Features

### MVP (Free)
- ✅ Synchronize purchase invoices from KSeF
- ✅ Manual categorization (MPK, category, project)
- ✅ Payment status tracking (pending/paid)
- ✅ Basic dashboard UI
- ✅ RBAC: Admin + Reader roles
- ✅ Secure token storage (Azure Key Vault)

### Extended
- 🤖 AI-powered automatic categorization (Azure OpenAI)
- 🏢 Multi-tenant support (multiple companies)
- 📊 Export to CSV/Excel
- 📧 Email notifications
- 🔗 API webhooks
- ⏰ Automatic scheduled sync

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Azure Static Web App (Next.js)                │
│  Dashboard for invoice management and categorization    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Azure Functions (Node.js)                  │
│  REST API: sync, import, categorize, manage             │
└─────────────────────────────────────────────────────────┘
        │                │                │
        ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   KSeF API  │  │ Azure OpenAI│  │  Dataverse  │
│  (MF.gov.pl)│  │ (GPT-4o)    │  │  (Backend)  │
└─────────────┘  └─────────────┘  └─────────────┘
        │
        ▼
┌─────────────┐
│ Key Vault   │
│ (Tokens)    │
└─────────────┘
```

## 📦 Project Structure

```
dvlp-ksef/
├── api/                 # Azure Functions (REST API)
│   ├── src/
│   │   ├── functions/   # HTTP triggers
│   │   ├── lib/         # Core libraries (ksef, dataverse, auth)
│   │   └── types/       # TypeScript types
│   └── tests/
├── web/                 # Static Web App (Next.js)
│   ├── app/             # App router pages
│   ├── components/      # React components
│   └── lib/             # Client utilities
├── docs/                # Documentation
└── infrastructure/      # IaC (Bicep)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Azure subscription
- Dataverse environment
- KSeF account (test/demo/prod)
- Azure Entra ID app registration

### Installation

```bash
# Clone the repository
git clone https://github.com/dvlp-dev/dvlp-ksef.git
cd dvlp-ksef

# Install dependencies
pnpm install
```

### API Configuration

```bash
# Navigate to API directory
cd api

# Copy environment template
cp local.settings.example.json local.settings.json

# Edit local.settings.json with your configuration:
# - AZURE_TENANT_ID
# - AZURE_CLIENT_ID  
# - AZURE_CLIENT_SECRET
# - DATAVERSE_URL
# - AZURE_KEYVAULT_URL
# - KSEF_ENVIRONMENT (test/demo/prod)
# - KSEF_NIP
```

### Web App Configuration

```bash
# Navigate to Web directory
cd web

# Copy environment template
cp .env.example .env.local

# Edit .env.local:
# - NEXT_PUBLIC_AZURE_CLIENT_ID - Azure app registration client ID
# - NEXT_PUBLIC_AZURE_TENANT_ID - Azure tenant ID
# - NEXT_PUBLIC_API_BASE_URL - API URL (default: http://localhost:7071/api)
```

### Azure Entra ID Setup

1. Create App Registration in Azure Portal
2. Add redirect URI: `http://localhost:3000` (development)
3. Enable "ID tokens" under Authentication
4. Add API permissions for Microsoft Dataverse
5. Copy Client ID and Tenant ID to environment files

### Development

```bash
# Start both API and Web in development mode
pnpm dev

# Or run separately:
pnpm --filter api dev      # API on http://localhost:7071
pnpm --filter web dev      # Web on http://localhost:3000
```

### Testing

```bash
# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_TENANT_ID` | Azure Entra ID tenant | ✅ |
| `AZURE_CLIENT_ID` | App registration client ID | ✅ |
| `AZURE_CLIENT_SECRET` | App registration secret | ✅ |
| `DATAVERSE_URL` | Dataverse environment URL | ✅ |
| `AZURE_KEYVAULT_URL` | Key Vault URL for tokens | ✅ |
| `KSEF_ENVIRONMENT` | KSeF env: test/demo/prod | ✅ |
| `KSEF_NIP` | Company NIP (10 digits) | ✅ |

See [.env.example](.env.example) for full list.

### KSeF Token Setup

1. Log in to [KSeF Portal](https://ksef-demo.mf.gov.pl/) (use demo for testing)
2. Authenticate as company representative
3. Generate authorization token (INVOICE_READ permission)
4. Store token in Azure Key Vault

## 📚 Documentation

- [Requirements](docs/REQUIREMENTS.md) - Functional and non-functional requirements
- [Architecture](docs/ARCHITECTURE.md) - System design details
- [API Reference](docs/API.md) - REST API documentation
- [Deployment](docs/DEPLOYMENT.md) - Azure deployment guide

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ministerstwo Finansów](https://www.podatki.gov.pl/ksef/) - KSeF API documentation
- [Microsoft Dataverse](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/) - Backend platform
- [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/) - Serverless compute

---

Made with ❤️ by [dvlp.dev](https://dvlp.dev)
