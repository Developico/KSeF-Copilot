# dvlp-ksef

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-blue.svg)](https://azure.microsoft.com/en-us/products/functions)

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

### Installation

```bash
# Clone the repository
git clone https://github.com/dvlp-dev/dvlp-ksef.git
cd dvlp-ksef

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
```

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
