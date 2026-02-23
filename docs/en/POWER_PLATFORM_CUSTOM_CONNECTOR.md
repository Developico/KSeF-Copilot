# Power Platform Custom Connector

> **Polish version:** [POWER_PLATFORM_CUSTOM_CONNECTOR.md](../pl/POWER_PLATFORM_CUSTOM_CONNECTOR.md) | **English version:** [POWER_PLATFORM_CUSTOM_CONNECTOR.md](./POWER_PLATFORM_CUSTOM_CONNECTOR.md)

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Step-by-Step Configuration](#step-by-step-configuration)
  - [Step 1 — Prepare Entra ID App Registration](#step-1--prepare-entra-id-app-registration)
  - [Step 2 — Create the Custom Connector](#step-2--create-the-custom-connector)
  - [Step 3 — Import Swagger / OpenAPI Definition](#step-3--import-swagger--openapi-definition)
  - [Step 4 — Configure Authentication (OAuth 2.0)](#step-4--configure-authentication-oauth-20)
  - [Step 5 — Define Operations](#step-5--define-operations)
  - [Step 6 — Test the Connection](#step-6--test-the-connection)
- [Swagger / OpenAPI Definition](#swagger--openapi-definition)
- [Using the Connector](#using-the-connector)
  - [In Canvas Apps](#in-canvas-apps)
  - [In Model-Driven Apps](#in-model-driven-apps)
  - [In Power Automate](#in-power-automate)
  - [In Copilot Studio](#in-copilot-studio)
- [Operations Reference](#operations-reference)
- [Authentication Details](#authentication-details)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)

---

## Overview

The **Custom Connector** is the bridge between Power Platform (Power Apps, Power Automate, Copilot Studio) and the Azure Functions API. It allows low-code/no-code citizens and professional developers to consume KSeF operations natively within the Power Platform ecosystem.

### What Does the Connector Do?

| Capability | Description |
|-----------|-------------|
| **KSeF Sync** | Trigger incoming/outgoing invoice synchronization |
| **Invoice CRUD** | Create, read, update, delete invoices |
| **AI Categorization** | Run AI categorization on invoices |
| **Session Management** | Open/close KSeF communication sessions |
| **Dashboard Data** | Fetch analytics and summary data |
| **GUS Lookup** | Verify company data from Polish business register |
| **Document Processing** | Upload and process invoice documents |

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  Power Platform                                        │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐     │
│  │ Canvas   │  │ Power    │  │   Copilot       │     │
│  │ App      │  │ Automate │  │   Studio        │     │
│  └────┬─────┘  └────┬─────┘  └───────┬─────────┘     │
│       │              │                │                │
│       └──────────────┼────────────────┘                │
│                      ▼                                 │
│           ┌─────────────────────┐                      │
│           │  Custom Connector   │                      │
│           │  (KSeF Copilot)     │                      │
│           └─────────┬───────────┘                      │
│                     │ OAuth 2.0                        │
└─────────────────────┼─────────────────────────────────┘
                      ▼
              ┌──────────────────┐
              │  Azure Functions  │
              │  (REST API)       │
              └──────────────────┘
```

---

## Prerequisites

| Prerequisite | Description |
|-------------|-------------|
| Azure Functions API deployed | API must be accessible from the internet |
| Entra ID App Registration (API) | The API App Registration with exposed API |
| Entra ID App Registration (Connector) | Optional: separate registration for the connector |
| Power Platform environment | With Dataverse enabled |
| Power Apps / Power Automate license | Per App ($5/user/month) or Premium ($20/user/month) |
| Admin access | To Power Platform environment and Azure Entra ID |

---

## Step-by-Step Configuration

### Step 1 — Prepare Entra ID App Registration

The Custom Connector uses OAuth 2.0 to authenticate against the API. You can either:

**Option A (recommended):** Use the existing API App Registration and add the connector's redirect URI  
**Option B:** Create a separate App Registration for the connector

#### For Option A:

1. Open **Azure Portal** → **Entra ID** → **App Registrations** → select the API App Registration
2. Go to **Authentication** → **Add a platform** → **Web**
3. Add redirect URI: `https://global.consent.azure-apim.net/redirect`
4. Check **Access tokens** and **ID tokens**
5. **Save**

#### Verify the exposed API:

- Go to **Expose an API**
- Application ID URI should be set: `api://{client-id}`
- Scope should exist: `access_as_user`
- Authorized client applications: add the connector's client ID (optional)

---

### Step 2 — Create the Custom Connector

1. Open [make.powerapps.com](https://make.powerapps.com)
2. Go to **Data** → **Custom Connectors**
3. Click **+ New Custom Connector** → **Import from an OpenAPI file** (or **Create from blank**)
4. Name: `KSeF Copilot`
5. Description: `Integration with Polish National e-Invoice System (KSeF)`
6. Icon: Upload a custom icon (green document icon recommended)
7. Host: `func-ksef.azurewebsites.net` (your Azure Functions URL without `https://`)
8. Base URL: `/api`

---

### Step 3 — Import Swagger / OpenAPI Definition

If importing from file:

1. Download the swagger file from: `deployment/powerplatform/connector/swagger.json`
2. Import it in the Custom Connector wizard

If creating manually, see the [Operations Reference](#operations-reference) section below.

---

### Step 4 — Configure Authentication (OAuth 2.0)

In the **Security** tab:

| Field | Value |
|-------|-------|
| Authentication type | OAuth 2.0 |
| Identity Provider | Azure Active Directory |
| Client ID | `{API App Registration Client ID}` |
| Client Secret | `{API App Registration Client Secret}` |
| Tenant ID | `{Your Tenant ID}` |
| Resource URL | `api://{API App Registration Client ID}` |
| Scope | `api://{API App Registration Client ID}/access_as_user` |
| Authorization URL | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize` |
| Token URL | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token` |
| Refresh URL | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token` |

After saving, the Connector will provide a **Redirect URL**. Add this to the App Registration's reply URLs if not already done (should be `https://global.consent.azure-apim.net/redirect`).

---

### Step 5 — Define Operations

Operations can be imported from Swagger or defined manually. Key operations:

| Operation ID | Method | Path | Description |
|-------------|--------|------|-------------|
| `GetHealth` | GET | `/health` | Check API health |
| `ListSettings` | GET | `/settings` | List KSeF settings |
| `GetSetting` | GET | `/settings/{id}` | Get setting details |
| `ListInvoices` | GET | `/invoices` | List invoices (with filtering) |
| `GetInvoice` | GET | `/invoices/{id}` | Get invoice details |
| `UpdateInvoice` | PATCH | `/invoices/{id}` | Update invoice fields |
| `SyncIncoming` | POST | `/ksef/sync/incoming` | Sync incoming invoices from KSeF |
| `CategorizeInvoice` | POST | `/ai/categorize/{invoiceId}` | AI categorization |
| `BatchCategorize` | POST | `/ai/categorize/batch` | Batch AI categorization |
| `GetDashboard` | GET | `/dashboard` | Dashboard data |
| `LookupGUS` | GET | `/gus/lookup/{nip}` | GUS company lookup |

---

### Step 6 — Test the Connection

1. Click **Test** in the Custom Connector wizard
2. Create a **New connection** (this triggers OAuth consent flow)
3. Test the `GetHealth` operation
4. Expected response: `200 OK` with health status JSON

---

## Swagger / OpenAPI Definition

The complete OpenAPI 3.0 definition is available at:

```
deployment/powerplatform/connector/swagger.json
```

You can also generate it dynamically from the running API:
```bash
curl https://func-ksef.azurewebsites.net/api/swagger.json
```

### Key Notes About the Swagger File

- Follows **OpenAPI 3.0** specification
- Includes all operations with request/response schemas
- Authentication is configured as `oauth2` security scheme
- Compatible with both Power Platform and standard API clients

---

## Using the Connector

### In Canvas Apps

```
// List invoices
ClearCollect(
  InvoiceCollection,
  KSeFCopilot.ListInvoices({
    top: 50,
    filter: "paymentstatus eq 'pending'"
  })
);

// AI categorization
Set(
  AiResult,
  KSeFCopilot.CategorizeInvoice(SelectedInvoice.id)
);
```

### In Model-Driven Apps

Use the connector in **Client Scripts** or **Business Process Flows** via Power Automate:

1. Create a Power Automate flow triggered by a button
2. Add the KSeF Copilot connector action
3. Map inputs from the current record context

### In Power Automate

```
Trigger: When an invoice is created in Dataverse
   ↓
Action: KSeF Copilot → CategorizeInvoice
   ↓
Condition: AI Confidence > 0.8
   ├── Yes → Update Dataverse record with AI suggestion
   └── No → Send approval to finance team
```

### In Copilot Studio

The Custom Connector can be added as a plugin source in Copilot Studio, enabling natural language queries:

- *"Show me unpaid invoices from last month"*
- *"Categorize invoice #123"*
- *"Sync invoices from KSeF"*

---

## Operations Reference

### Health & Status

#### GET /health

Check API connectivity and service health.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00Z",
  "services": {
    "dataverse": "connected",
    "keyVault": "connected",
    "ksef": "test"
  }
}
```

---

### Invoices

#### GET /invoices

List invoices with optional filtering.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `$top` | integer | Maximum number of records (default: 50) |
| `$skip` | integer | Offset for pagination |
| `$filter` | string | OData filter expression |
| `$orderby` | string | Sort order |
| `settingId` | string | Filter by KSeF setting |

**Response (200):**
```json
{
  "value": [
    {
      "id": "guid",
      "invoiceNumber": "FV/2026/001",
      "invoiceDate": "2026-01-15",
      "sellerNip": "1234567890",
      "sellerName": "Supplier Ltd.",
      "grossAmount": 1230.00,
      "paymentStatus": "pending"
    }
  ],
  "totalCount": 150,
  "nextLink": "..."
}
```

#### POST /ai/categorize/{invoiceId}

Run AI categorization on a single invoice.

**Response (200):**
```json
{
  "invoiceId": "guid",
  "mpk": "Delivery",
  "category": "Software licenses",
  "description": "Annual license renewal for development tools",
  "confidence": 0.92,
  "rationale": "Based on supplier history and invoice description, this is a software expense for the Delivery team."
}
```

---

## Authentication Details

### Token Flow

```
1. User opens Power App
2. Power App calls Custom Connector
3. Connector uses cached OAuth token (or triggers refresh)
4. Azure Functions validates JWT token:
   - Audience: api://{client-id}
   - Issuer: https://login.microsoftonline.com/{tenant-id}/v2.0
   - Roles: mapped from security groups
5. API processes request and returns response
```

### Permission Model

| Power Platform role | API role | Access |
|--------------------|----------|--------|
| System Admin | Admin | Full access |
| KSeF Operator | User | Read + sync + categorize |
| KSeF Reader | User | Read only |

---

## Troubleshooting

### "401 Unauthorized" when testing

1. Verify Client ID and Secret in the connector security settings
2. Check that the redirect URI `https://global.consent.azure-apim.net/redirect` is registered
3. Delete and recreate the connection
4. See [Troubleshooting](./TROUBLESHOOTING.md) for detailed diagnosis

### "Connector not showing operations"

1. Verify the Swagger definition is valid
2. Check that all operations have unique `operationId` values
3. Re-import the Swagger file

### "Connection creation fails"

1. Admin consent may be required — ask a tenant admin to consent
2. Check that the App Registration allows the `access_as_user` scope
3. Verify the tenant ID in all OAuth URLs

### "Throttling / 429 errors"

1. Power Platform has its own rate limits on connector calls
2. Implement retry logic in Power Automate flows
3. Consider batching multiple operations

---

## Deployment

### Include Connector in Solution

1. Open [make.powerapps.com](https://make.powerapps.com) → **Solutions**
2. Open the `DevelopicoKSeF` solution
3. **Add existing** → **Custom Connector** → select `KSeF Copilot`
4. Export the solution (managed or unmanaged)

### Import to Another Environment

1. Import the solution `.zip` in the target environment
2. Update the Custom Connector host URL (if API is in a different region/instance)
3. Create a new connection with appropriate credentials
4. Test all operations

### Version Management

When the API adds new endpoints:
1. Update the Swagger definition
2. Re-import in the Custom Connector
3. Test the new operations
4. Re-export the solution

---

## Related Documents

- [API Reference](./API.md) — full endpoint documentation
- [Architecture](./ARCHITECTURE.md) — system design
- [Entra ID Configuration](../../deployment/azure/ENTRA_ID_KONFIGURACJA.md) — App Registration setup
- [Dataverse Schema](./DATAVERSE_SCHEMA.md) — data model reference

---

**Last updated:** 2026-02-11  
**Version:** 1.0  
**Maintainer:** dvlp-dev team
