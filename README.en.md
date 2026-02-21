# KSeF Copilot

🇵🇱 [Wersja polska](README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-blue.svg)](https://azure.microsoft.com/en-us/products/functions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/badge/npm-10+-orange.svg)](https://www.npmjs.com/)

> Open-source solution for integrating with Poland's National e-Invoice System (KSeF). Provides automatic purchase invoice synchronization, AI-powered categorization (Azure OpenAI), and an intuitive web dashboard for invoice management. Powered by Azure Functions and Microsoft Dataverse on the backend, with a Next.js frontend. Cloud-ready for Azure deployment.

## 🎯 Features

### MVP (Free)
- ✅ Synchronize purchase invoices from KSeF
- ✅ Manual categorization (MPK, category, project)
- ✅ Payment status tracking (pending/paid)
- ✅ Web dashboard UI
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
│           Azure App Service (Next.js)                   │
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
KSeFCopilot/
├── api/                 # Azure Functions (REST API)
│   ├── src/
│   │   ├── functions/   # HTTP triggers (endpoints)
│   │   ├── lib/         # Core libraries (ksef, dataverse, auth)
│   │   └── types/       # TypeScript types
│   └── tests/
├── web/                 # Web Application (Next.js)
│   ├── app/             # App router pages
│   ├── components/      # React components
│   └── lib/             # Client utilities
├── docs/                # Documentation
└── deployment/          # IaC (Bicep)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Azure subscription
- Dataverse environment
- KSeF account (test/demo/prod)
- Azure Entra ID app registration

### Installation

```bash
# Clone the repository
git clone https://github.com/Developico/KSeFCopilot.git
cd KSeFCopilot

# Install dependencies
npm install
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
npm run dev

# Or run separately:
npm run dev --workspace=api      # API on http://localhost:7071
npm run dev --workspace=web      # Web on http://localhost:3000
```

### Testing

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
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

1. Log in to [KSeF Portal](https://ap-demo.ksef.mf.gov.pl/) (use demo for testing)
2. Authenticate as company representative
3. Generate authorization token (INVOICE_READ permission)
4. Store token in Azure Key Vault

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design details
- [API Reference](docs/API.md) — REST API documentation
- [Environment Variables](docs/ZMIENNE_SRODOWISKOWE.md) — Configuration reference
- [Deployment Guide](deployment/README.md) — Full deployment walkthrough (13 steps)
- [API Deployment](deployment/azure/API_DEPLOYMENT.md) — Azure Functions deployment
- [Web Deployment](deployment/azure/WEB_DEPLOYMENT.md) — App Service deployment

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: description'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💼 Commercial Support

Need help deploying KSeF in your organization? We offer:

- Solution deployment and configuration
- Customization to your specific needs
- Integration with existing systems
- Training and technical support

📧 **contact@developico.com**

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ministerstwo Finansów](https://www.podatki.gov.pl/ksef/) — KSeF API documentation
- [Microsoft Dataverse](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/) — Backend platform
- [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/) — Serverless compute

---

Created by **[Developico Sp. z o.o.](https://developico.com)** | Łukasz Falaciński

📍 Hajoty 53/1, 01-821 Warsaw, Poland | 📧 contact@developico.com
