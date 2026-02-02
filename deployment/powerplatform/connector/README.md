# KSeF Custom Connector for Power Platform

## Overview

This custom connector enables Power Automate and Power Apps to interact with the KSeF (Krajowy System e-Faktur) integration API. It provides access to invoice management, KSeF synchronization, AI-powered categorization, and GUS registry lookup.

## Prerequisites

1. **Azure Entra ID App Registration** configured with delegated permissions
2. **KSeF API** deployed and running (Azure Functions)
3. **Power Platform environment** with appropriate license

## Installation Guide

### Step 1: Prepare Azure Entra ID App Registration

Before creating the connector, ensure your Azure AD app registration has:

1. **Redirect URI** added:
   ```
   https://global.consent.azure-apim.net/redirect
   ```

2. **API Permissions** (Delegated):
   - Your API scopes (e.g., `Invoices.Read`, `Invoices.Write`)

3. **Client Secret** created (save it securely)

### Step 2: Import Connector via Maker Portal

1. Go to [Power Automate](https://make.powerautomate.com)
2. Navigate to **Data** → **Custom connectors**
3. Click **+ New custom connector** → **Import an OpenAPI file**
4. Name: `KSeF Integration`
5. Upload `apiDefinition.swagger.json`

### Step 3: Configure General Settings

| Field | Value |
|-------|-------|
| Scheme | HTTPS |
| Host | `your-api.azurewebsites.net` |
| Base URL | `/api` |

### Step 4: Configure Authentication

| Field | Value |
|-------|-------|
| Authentication type | OAuth 2.0 |
| Identity Provider | Azure Active Directory |
| Client ID | *Your App Registration Client ID* |
| Client Secret | *Your App Registration Secret* |
| Tenant ID | *Your Azure AD Tenant ID* |
| Resource URL | `api://{your-client-id}` |
| Scope | `api://{your-client-id}/.default` |

### Step 5: Update Connector and Test

1. Click **Update connector**
2. Go to **Test** tab
3. Click **+ New connection**
4. Sign in with your Azure AD account
5. Test the `HealthCheck` action

## Available Actions

### Invoices (Faktury)

| Action | Description | Role Required |
|--------|-------------|---------------|
| `ListInvoices` | List invoices with advanced filtering | Reader |
| `GetInvoice` | Get single invoice details | Reader |
| `UpdateInvoice` | Update invoice (MPK, category, payment) | Admin |
| `CreateManualInvoice` | Create invoice manually (not from KSeF) | Admin |
| `DeleteInvoice` | Soft delete invoice | Admin |

### KSeF Operations

| Action | Description | Role Required |
|--------|-------------|---------------|
| `StartKsefSession` | Initialize KSeF API session | Admin |
| `GetKsefSessionStatus` | Check current session status | Reader |
| `TerminateKsefSession` | End active session | Admin |
| `GetKsefStatus` | Check overall KSeF connection | Reader |
| `SyncInvoicesFromKsef` | Sync incoming invoices | Admin |
| `QueryKsefInvoices` | Query invoices in KSeF (preview) | Reader |

### Settings

| Action | Description | Role Required |
|--------|-------------|---------------|
| `ListSettings` | List company configurations | Reader |
| `GetSetting` | Get single configuration | Reader |
| `CreateSetting` | Create new company config | Admin |
| `UpdateSetting` | Update company config | Admin |
| `ListCostCenters` | List available MPK values | Reader |

### AI Categorization

| Action | Description | Role Required |
|--------|-------------|---------------|
| `CategorizeInvoice` | AI categorize single invoice | Admin |
| `BatchCategorizeInvoices` | AI categorize multiple (max 50) | Admin |

### Dashboard & Lookup

| Action | Description | Role Required |
|--------|-------------|---------------|
| `GetDashboardStats` | Get invoice statistics | Reader |
| `LookupCompanyByNip` | Lookup company in GUS registry | Reader |
| `ValidateNip` | Validate NIP checksum | Reader |

## Rate Limiting & Retry Policy

The connector includes built-in retry policy with **exponential backoff**:

| Parameter | Value |
|-----------|-------|
| Max retries | 4 |
| Initial interval | 1 second |
| Maximum interval | 1 minute |
| Retry on status codes | 429, 500, 502, 503, 504 |

### How Exponential Backoff Works

When the API returns a rate limit error (429), the connector automatically waits and retries:

| Attempt | Wait Time | Total Elapsed |
|---------|-----------|---------------|
| 1 | 0s | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |
| 4 | 4s | 7s |
| 5 | 8s | 15s |

This prevents overwhelming the API and ensures requests eventually succeed.

## Example Power Automate Flows

### 1. Daily Invoice Sync

```yaml
Trigger: Recurrence (daily at 6:00 AM)

Actions:
  1. StartKsefSession (nip: "1234567890")
  2. SyncInvoicesFromKsef (dateFrom: addDays(utcNow(), -1))
  3. Condition: If imported > 0
     Yes:
       - ListInvoices (filter: importedAt >= yesterday)
       - BatchCategorizeInvoices (invoiceIds: from previous step)
       - Send email notification
  4. TerminateKsefSession
```

### 2. Overdue Invoice Alert

```yaml
Trigger: Recurrence (every Monday at 9:00 AM)

Actions:
  1. ListInvoices (
       paymentStatus: "pending",
       overdue: true,
       orderBy: "grossAmount",
       orderDirection: "desc"
     )
  2. Condition: If count > 0
     Yes:
       - Create HTML table from invoices
       - Post to Teams channel
       - Send email to accounting
```

### 3. New Supplier Verification

```yaml
Trigger: When invoice is created (Dataverse)

Actions:
  1. LookupCompanyByNip (nip: triggerOutputs()?['body/dvlp_suppliernip'])
  2. Condition: If success = false
     Yes:
       - Create task: "Verify supplier {supplierName}"
       - Send email alert
     No:
       - Update invoice description with GUS data
```

### 4. AI Categorization with Approval

```yaml
Trigger: When invoice is modified (Dataverse, filter: aiConfidence < 0.7)

Actions:
  1. Start approval (
       Title: "Review AI categorization",
       Details: "Invoice: {invoiceNumber}, Suggested MPK: {aiMpkSuggestion}",
       Assigned to: manager@company.com
     )
  2. Condition: If outcome = "Approve"
     Yes:
       - UpdateInvoice (mpk: aiMpkSuggestion, category: aiCategorySuggestion)
     No:
       - Create task for manual review
```

### 5. Monthly Report

```yaml
Trigger: Recurrence (1st of each month at 8:00 AM)

Actions:
  1. GetDashboardStats (
       fromDate: startOfMonth(addMonths(utcNow(), -1)),
       toDate: endOfMonth(addMonths(utcNow(), -1))
     )
  2. Create Excel file with statistics
  3. Upload to SharePoint
  4. Send email with attachment
```

## Connection Setup

1. Add the connector to your flow
2. Click **Sign in** when prompted
3. Authenticate with your Azure AD account
4. The connector will use your identity for all API calls

**Important**: Flows run in the context of the connection owner. For scheduled flows, ensure the owner has appropriate permissions (Admin for sync/categorize operations).

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid or expired token | Re-authenticate connection |
| 403 Forbidden | Insufficient role | User needs Admin role for this action |
| 429 Too Many Requests | Rate limit exceeded | Automatic retry will handle this |
| 500 Internal Server Error | API error | Check API logs, automatic retry |

### Checking Connection Health

Use the `HealthCheck` action (no auth required) to verify API availability.

## Retry Policy Configuration

After creating the connector, configure retry policy in Power Automate flow settings:

### Per-Action Retry Settings

In your flow, click on action **...** → **Settings** → **Networking**:

| Setting | Recommended Value |
|---------|-------------------|
| Retry Policy | Exponential |
| Count | 4 |
| Interval | PT1S (1 second) |
| Maximum Interval | PT1M (1 minute) |

### How Exponential Backoff Works

When the API returns a rate limit error (429), the flow waits progressively longer:

| Attempt | Wait Time | Total Elapsed |
|---------|-----------|---------------|
| 1 | 0s | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |
| 4 | 4s | 7s |
| 5 | 8s | 15s |

This prevents overwhelming the API and ensures requests eventually succeed.

## Adding to Power Platform Solution

To include this connector in your solution:

1. Open your solution in [Power Apps Maker Portal](https://make.powerapps.com)
2. Click **Add existing** → **Automation** → **Custom connector**
3. Select **KSeF Integration**
4. Add **Connection Reference** for the connector

## File Structure

```
connector/
├── apiDefinition.swagger.json   # OpenAPI 2.0 specification (import this)
└── README.md                    # This documentation
```

## Support

For issues with this connector, contact: support@dvlp.pl

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-02 | Initial release |
