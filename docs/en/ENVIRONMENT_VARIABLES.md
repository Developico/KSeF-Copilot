# Environment Variables

> **Polish version:** [ZMIENNE_SRODOWISKOWE.md](../pl/ZMIENNE_SRODOWISKOWE.md) | **English version:** [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

## Table of Contents
- [Overview](#overview)
- [API (Azure Functions)](#api-azure-functions)
  - [Dataverse Connection](#dataverse-connection)
  - [Azure Entra ID (Authentication)](#azure-entra-id-authentication)
  - [KSeF Configuration](#ksef-configuration)
  - [Azure Key Vault](#azure-key-vault)
  - [Azure OpenAI](#azure-openai)
  - [Development & Debugging](#development--debugging)
  - [Dataverse Schema Mapping](#dataverse-schema-mapping)
- [Web (Next.js Frontend)](#web-nextjs-frontend)
  - [NextAuth.js Configuration](#nextauthjs-configuration)
  - [Azure Entra ID (Login)](#azure-entra-id-login)
  - [API Connection](#api-connection)
- [Configuration Files](#configuration-files)
  - [local.settings.json (API)](#localsettingsjson-api)
  - [.env.local (Web)](#envlocal-web)
- [Azure Deployment](#azure-deployment)
- [Environment Separation](#environment-separation)

---

## Overview

Complete reference of all environment variables used by both the **API** (Azure Functions) and the **Web** (Next.js frontend) applications.

### Conventions

| Convention | Description |
|------------|-------------|
| `DV_*` | Dataverse-related variables |
| `ENTRA_*` | Azure Entra ID authentication |
| `KSEF_*` | KSeF API configuration |
| `KV_*` | Azure Key Vault |
| `OPENAI_*` | Azure OpenAI |
| `NEXT_PUBLIC_*` | Public (client-side) Next.js variables |
| `NEXTAUTH_*` | NextAuth.js configuration |

---

## API (Azure Functions)

### Dataverse Connection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DV_URL` | ✅ | — | Dataverse environment URL, e.g. `https://org.crm4.dynamics.com` |
| `DV_CLIENT_ID` | ✅ | — | Client ID of Entra ID App Registration for Dataverse |
| `DV_CLIENT_SECRET` | ✅* | — | Client Secret (*or use Key Vault) |
| `DV_TENANT_ID` | ✅ | — | Azure Tenant ID |

**How to obtain:**
1. Create an App Registration in Azure Entra ID
2. Grant `Dynamics CRM / user_impersonation` API permission
3. Create an Application User in Power Platform Admin Center
4. Assign the `KSeF Admin` security role

> **Details:** [Entra ID Configuration](../../deployment/azure/ENTRA_ID_KONFIGURACJA.md)

---

### Azure Entra ID (Authentication)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENTRA_TENANT_ID` | ✅ | — | Azure Tenant ID |
| `ENTRA_CLIENT_ID` | ✅ | — | Client ID of the API App Registration |
| `ENTRA_AUDIENCE` | ❌ | `api://{ENTRA_CLIENT_ID}` | Expected audience in JWT tokens |
| `GROUP_ROLE_MAPPING` | ❌ | `{}` | Mapping of Entra security groups to app roles (JSON) |
| `SKIP_AUTH` | ❌ | `false` | Skip authentication (**dev only!**) |

**`GROUP_ROLE_MAPPING` example:**
```json
{
  "group-guid-admins": "Admin",
  "group-guid-users": "User"
}
```

> **Important:** `SKIP_AUTH=true` bypasses the **entire authentication pipeline** — no token is read, no signature is verified, no groups are mapped. A hardcoded `dev-user` with `Admin` role is injected. The application will crash on startup if `SKIP_AUTH=true` in production (`NODE_ENV=production`).

---

### KSeF Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KSEF_ENV` | ❌ | `test` | KSeF environment: `test`, `demo`, `prod` |
| `KSEF_API_URL` | ❌ | auto | Overrides the KSeF API URL (auto-resolved from KSEF_ENV) |

**Auto-resolved URLs:**

| Environment | URL |
|-------------|-----|
| `test` | `https://ksef-test.mf.gov.pl/api` |
| `demo` | `https://ksef-demo.mf.gov.pl/api` |
| `prod` | `https://ksef.mf.gov.pl/api` |

---

### Azure Key Vault

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KV_URL` | ✅ (prod) | — | Key Vault URL, e.g. `https://kv-ksef.vault.azure.net` |
| `KV_ENABLED` | ❌ | `true` in prod | Enable Key Vault integration |

**Secrets stored in Key Vault:**

| Secret name | Maps to | Description |
|-------------|---------|-------------|
| `DV-CLIENT-SECRET` | `DV_CLIENT_SECRET` | Dataverse App Registration secret |
| `AZURE-OPENAI-API-KEY` | `OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE-OPENAI-ENDPOINT` | `OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `KSEF-TOKEN-{NIP}` | — | KSeF authorization token per company |

> **Details:** [Token Setup Guide](../../deployment/azure/TOKEN_SETUP_GUIDE.md)

---

### Azure OpenAI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅* | — | API key (*from Key Vault in prod) |
| `OPENAI_ENDPOINT` | ✅* | — | Endpoint URL (*from Key Vault in prod) |
| `OPENAI_MODEL` | ❌ | `gpt-4o-mini` | Model name (deployment name in Azure) |
| `OPENAI_API_VERSION` | ❌ | `2024-10-21` | Azure OpenAI API version |
| `OPENAI_MAX_TOKENS` | ❌ | `200` | Max tokens in AI response |
| `OPENAI_TEMPERATURE` | ❌ | `0.3` | Temperature (creativity) 0.0–2.0 |

> **Details:** [AI Categorization Setup](../../deployment/azure/AI_CATEGORIZATION_SETUP.md)

---

### Development & Debugging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ❌ | `development` | Environment: `development` / `production` |
| `LOG_LEVEL` | ❌ | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `SKIP_AUTH` | ❌ | `false` | Skip authentication (dev only) |
| `MOCK_DATAVERSE` | ❌ | `false` | Use mock Dataverse service |
| `MOCK_KSEF` | ❌ | `false` | Use mock KSeF service |
| `MOCK_OPENAI` | ❌ | `false` | Use mock OpenAI service |

---

### Dataverse Schema Mapping

Environment variables for customizing Dataverse column/table names. Allows the solution to work with non-standard schema deployments.

#### Table Names

| Variable | Default | Description |
|----------|---------|-------------|
| `DV_TABLE_SETTINGS` | `dvlp_ksefsettings` | Settings table |
| `DV_TABLE_SESSIONS` | `dvlp_ksefsessions` | Sessions table |
| `DV_TABLE_INVOICES` | `dvlp_ksefinvoices` | Invoices table |
| `DV_TABLE_SYNCLOGS` | `dvlp_ksefsynclog` | Sync logs table |
| `DV_TABLE_FEEDBACK` | `dvlp_aifeedbacks` | AI feedback table |

#### Field Mappings — Settings

| Variable | Default |
|----------|---------|
| `DV_FIELD_SETTING_ID` | `dvlp_ksefsettingid` |
| `DV_FIELD_SETTING_NAME` | `dvlp_name` |
| `DV_FIELD_SETTING_NIP` | `dvlp_nip` |
| `DV_FIELD_SETTING_ENV` | `dvlp_environment` |
| `DV_FIELD_SETTING_ACTIVE` | `dvlp_isactive` |
| `DV_FIELD_SETTING_TOKEN_REF` | `dvlp_tokenkeyvaultref` |

#### Field Mappings — Invoices

| Variable | Default |
|----------|---------|
| `DV_FIELD_INVOICE_ID` | `dvlp_ksefinvoiceid` |
| `DV_FIELD_INVOICE_NAME` | `dvlp_name` |
| `DV_FIELD_INVOICE_DATE` | `dvlp_invoicedate` |
| `DV_FIELD_INVOICE_SALE_DATE` | `dvlp_saledate` |
| `DV_FIELD_INVOICE_DUE_DATE` | `dvlp_duedate` |
| `DV_FIELD_INVOICE_TYPE` | `dvlp_invoicetype` |
| `DV_FIELD_INVOICE_SELLER_NIP` | `dvlp_sellernip` |
| `DV_FIELD_INVOICE_SELLER_NAME` | `dvlp_sellername` |
| `DV_FIELD_INVOICE_BUYER_NIP` | `dvlp_buyernip` |
| `DV_FIELD_INVOICE_NET` | `dvlp_netamount` |
| `DV_FIELD_INVOICE_VAT` | `dvlp_vatamount` |
| `DV_FIELD_INVOICE_GROSS` | `dvlp_grossamount` |
| `DV_FIELD_INVOICE_CURRENCY` | `dvlp_currency` |
| `DV_FIELD_INVOICE_PAYMENT_STATUS` | `dvlp_paymentstatus` |
| `DV_FIELD_INVOICE_PAID_AT` | `dvlp_paidat` |
| `DV_FIELD_INVOICE_CATEGORY` | `dvlp_category` |
| `DV_FIELD_INVOICE_MPK` | `dvlp_costcenter` |
| `DV_FIELD_INVOICE_KSEF_REF` | `dvlp_ksefreferencenumber` |
| `DV_FIELD_INVOICE_KSEF_STATUS` | `dvlp_ksefstatus` |
| `DV_FIELD_INVOICE_KSEF_DIRECTION` | `dvlp_ksefdirection` |
| `DV_FIELD_INVOICE_KSEF_DOWNLOADED` | `dvlp_ksefdownloadedat` |
| `DV_FIELD_INVOICE_KSEF_XML` | `dvlp_ksefrawxml` |
| `DV_FIELD_INVOICE_SETTING` | `_dvlp_ksefsettingid_value` |
| `DV_FIELD_INVOICE_DESCRIPTION` | `dvlp_description` |

#### Field Mappings — AI

| Variable | Default |
|----------|---------|
| `DV_FIELD_INVOICE_AI_MPK` | `dvlp_aimpksuggestion` |
| `DV_FIELD_INVOICE_AI_CATEGORY` | `dvlp_aicategorysuggestion` |
| `DV_FIELD_INVOICE_AI_DESC` | `dvlp_aidescription` |
| `DV_FIELD_INVOICE_AI_CONFIDENCE` | `dvlp_aiconfidence` |
| `DV_FIELD_INVOICE_AI_PROCESSED` | `dvlp_aiprocessedat` |

---

## Web (Next.js Frontend)

### NextAuth.js Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXTAUTH_URL` | ✅ | — | Application URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | ✅ | — | Secret for token encryption (min. 32 characters) |

**How to generate `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

---

### Azure Entra ID (Login)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_AD_CLIENT_ID` | ✅ | — | Client ID of the Web App Registration |
| `AZURE_AD_CLIENT_SECRET` | ✅ | — | Client Secret of the Web App Registration |
| `AZURE_AD_TENANT_ID` | ✅ | — | Azure Tenant ID |

> **Note:** The Web App Registration is **separate** from the API App Registration. The Web App Registration must have API permission for the API (scope `api://{api-client-id}/access_as_user`).

---

### API Connection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | — | Backend API URL, e.g. `https://func-ksef.azurewebsites.net/api` |
| `NEXT_PUBLIC_API_SCOPE` | ✅ | — | API scope, e.g. `api://{api-client-id}/access_as_user` |

---

## Configuration Files

### local.settings.json (API)

Location: `api/local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "NODE_ENV": "development",
    
    "DV_URL": "https://org.crm4.dynamics.com",
    "DV_CLIENT_ID": "...",
    "DV_CLIENT_SECRET": "...",
    "DV_TENANT_ID": "...",
    
    "ENTRA_TENANT_ID": "...",
    "ENTRA_CLIENT_ID": "...",
    "SKIP_AUTH": "true",
    
    "KSEF_ENV": "test",
    
    "OPENAI_API_KEY": "...",
    "OPENAI_ENDPOINT": "https://....openai.azure.com",
    "OPENAI_MODEL": "gpt-4o-mini"
  }
}
```

> **Important:** `local.settings.json` is listed in `.gitignore` — never commit secrets to the repository.

### .env.local (Web)

Location: `web/.env.local`

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated-secret>

AZURE_AD_CLIENT_ID=<web-app-client-id>
AZURE_AD_CLIENT_SECRET=<web-app-client-secret>
AZURE_AD_TENANT_ID=<tenant-id>

NEXT_PUBLIC_API_URL=http://localhost:7071/api
NEXT_PUBLIC_API_SCOPE=api://<api-client-id>/access_as_user
```

---

## Azure Deployment

On Azure, environment variables are configured via:

### Azure Functions → Application Settings

```bash
az functionapp config appsettings set \
  --resource-group rg-ksef \
  --name func-ksef \
  --settings \
    DV_URL="https://org.crm4.dynamics.com" \
    DV_CLIENT_ID="..." \
    DV_TENANT_ID="..." \
    KV_URL="https://kv-ksef.vault.azure.net" \
    ENTRA_TENANT_ID="..." \
    ENTRA_CLIENT_ID="..."
```

### Azure App Service → Configuration

```bash
az webapp config appsettings set \
  --resource-group rg-ksef \
  --name app-ksef-web \
  --settings \
    NEXTAUTH_URL="https://app-ksef-web.azurewebsites.net" \
    NEXTAUTH_SECRET="..." \
    AZURE_AD_CLIENT_ID="..." \
    AZURE_AD_CLIENT_SECRET="..." \
    AZURE_AD_TENANT_ID="..." \
    NEXT_PUBLIC_API_URL="https://func-ksef.azurewebsites.net/api" \
    NEXT_PUBLIC_API_SCOPE="api://...../access_as_user"
```

> **Note:** Secrets like `DV_CLIENT_SECRET` and `OPENAI_API_KEY` should be read from **Key Vault** at runtime via Key Vault references, not stored as plain text in App Settings.

---

## Environment Separation

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `SKIP_AUTH` | `true` | `false` (crashes if `true`) |
| `KV_ENABLED` | `false` | `true` |
| `KSEF_ENV` | `test` | `prod` |
| `DV_URL` | dev org URL | prod org URL |
| `LOG_LEVEL` | `debug` | `info` |
| `MOCK_*` | `true` (optional) | `false` |

---

**Last updated:** 2026-02-11  
**Version:** 1.0  
**Maintainer:** dvlp-dev team
