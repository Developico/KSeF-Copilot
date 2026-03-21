# API Documentation

> **Polish version:** [API.md](../pl/API.md) | **English version:** [API.md](./API.md)

## Table of Contents
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Health & Status](#health--status)
  - [Settings Management](#settings-management)
  - [KSeF Session Management](#ksef-session-management)
  - [KSeF Invoices](#ksef-invoices)
  - [KSeF Synchronization](#ksef-synchronization)
  - [Invoice Management](#invoice-management)
  - [Attachments](#attachments)
  - [AI Categorization](#ai-categorization)
  - [Dashboard & Analytics](#dashboard--analytics)
  - [Expense Forecast](#expense-forecast)
  - [Anomaly Detection](#anomaly-detection)
  - [MPK Centers](#mpk-centers)
  - [Approvals](#approvals)
  - [Budget](#budget)
  - [Notifications](#notifications)
  - [Reports](#reports)
  - [VAT White List Integration](#vat-white-list-integration)
  - [Document Processing](#document-processing)
  - [Suppliers](#suppliers)
  - [Self-Billing Agreements](#self-billing-agreements)
  - [Self-Billing Templates](#self-billing-templates)
  - [Self-Billing Invoices](#self-billing-invoices)
  - [Self-Billing Approvals](#self-billing-approvals)
  - [Self-Billing Import](#self-billing-import)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

## Authentication

All API endpoints (except `/api/health`) require authentication using Azure Entra ID (formerly Azure AD) JWT tokens.

### Headers
```http
Authorization: Bearer <jwt_token>
```

### Roles
- **Admin**: Full access to all operations
- **User**: Read-only access and limited write operations

### Token Validation
- Tokens are validated using JWKS (JSON Web Key Set) from Azure Entra ID
- Issuer, audience, and expiration are verified
- Security groups are mapped to application roles via `GROUP_ROLE_MAPPING`

**Important**: Set `SKIP_AUTH=true` only for local development. This bypasses the **entire authentication pipeline** (not just JWT validation) — no token is read, no signature is verified, no groups are mapped. Instead, a hardcoded `dev-user` with `Admin` role is injected. The application will crash on startup if `SKIP_AUTH=true` in production (`NODE_ENV=production`).

---

## API Endpoints

### Health & Status

#### GET /api/health
Check API health and connectivity.

**Auth**: None required

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T10:00:00.000Z",
  "services": {
    "dataverse": "connected",
    "keyVault": "connected"
  }
}
```

#### GET /api/ksef/status
Check KSeF API status.

**Auth**: User

**Response** (200):
```json
{
  "status": "online",
  "environment": "production",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

---

### Settings Management

#### GET /api/settings
List all settings (tenants/companies).

**Auth**: User  
**Role**: Admin or User

**Query Parameters**:
- `active` (boolean): Filter by active status

**Response** (200):
```json
{
  "settings": [
    {
      "id": "uuid",
      "nip": "1234567890",
      "name": "Company Name",
      "tokenSecretName": "ksef-token-1234567890",
      "isActive": true,
      "createdOn": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/settings/{id}
Get single setting by ID.

**Auth**: User

**Response** (200):
```json
{
  "id": "uuid",
  "nip": "1234567890",
  "name": "Company Name",
  "tokenSecretName": "ksef-token-1234567890",
  "isActive": true,
  "createdOn": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/settings
Create new setting.

**Auth**: Admin

**Request Body**:
```json
{
  "nip": "1234567890",
  "name": "Company Name",
  "tokenSecretName": "ksef-token-1234567890"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "nip": "1234567890",
  "name": "Company Name",
  "tokenSecretName": "ksef-token-1234567890",
  "isActive": true
}
```

#### PATCH /api/settings/{id}
Update setting.

**Auth**: Admin

**Request Body**:
```json
{
  "name": "Updated Company Name",
  "isActive": false
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "nip": "1234567890",
  "name": "Updated Company Name",
  "isActive": false
}
```

#### DELETE /api/settings/{id}
Soft-delete setting (sets isActive=false).

**Auth**: Admin

**Response** (204): No content

#### GET /api/settings/costcenters
> **Deprecated** — Returns legacy OptionSet-based cost centers. Use [GET /api/mpk-centers](#get-apimpk-centers) instead.

List all cost centers (MPK values) from the OptionSet model.

**Auth**: User

**Response** (200):
```json
{
  "costCenters": [
    { "value": 100000000, "label": "Consultants" },
    { "value": 100000001, "label": "BackOffice" },
    { "value": 100000002, "label": "Management" }
  ]
}
```

---

### KSeF Session Management

#### POST /api/ksef/session
Initialize new KSeF session.

**Auth**: Admin

**Request Body**:
```json
{
  "nip": "1234567890",
  "token": "ksef_authorization_token"
}
```

**Response** (200):
```json
{
  "sessionToken": "session-uuid",
  "expiresAt": "2024-01-31T12:00:00.000Z"
}
```

#### GET /api/ksef/session
Check current session status.

**Auth**: User

**Query Parameters**:
- `nip` (required): Company NIP

**Response** (200):
```json
{
  "isActive": true,
  "sessionToken": "session-uuid",
  "expiresAt": "2024-01-31T12:00:00.000Z"
}
```

#### DELETE /api/ksef/session
Terminate active KSeF session.

**Auth**: Admin

**Query Parameters**:
- `nip` (required): Company NIP

**Response** (200):
```json
{
  "terminated": true
}
```

---

### KSeF Invoices

#### POST /api/ksef/invoices/send
Send invoice to KSeF.

**Auth**: Admin

**Request Body**:
```json
{
  "nip": "1234567890",
  "xml": "<Invoice>...</Invoice>"
}
```

**Response** (200):
```json
{
  "elementReferenceNumber": "ref-12345",
  "status": "pending"
}
```

#### POST /api/ksef/invoices/batch
Send multiple invoices to KSeF.

**Auth**: Admin

**Request Body**:
```json
{
  "nip": "1234567890",
  "invoices": [
    { "xml": "<Invoice>...</Invoice>" },
    { "xml": "<Invoice>...</Invoice>" }
  ]
}
```

**Response** (200):
```json
{
  "results": [
    { "elementReferenceNumber": "ref-12345", "status": "accepted" },
    { "error": "Invalid XML" }
  ]
}
```

#### GET /api/ksef/invoices/{ksefReferenceNumber}
Get invoice by KSeF reference number.

**Auth**: User

**Response** (200):
```json
{
  "referenceNumber": "ref-12345",
  "invoiceNumber": "FV/2024/001",
  "supplierNip": "9876543210",
  "supplierName": "Supplier Co.",
  "invoiceDate": "2024-01-15",
  "grossAmount": 1230.00,
  "xml": "<Invoice>...</Invoice>"
}
```

#### GET /api/ksef/invoices/{elementReferenceNumber}/status
Get invoice processing status.

**Auth**: User

**Response** (200):
```json
{
  "elementReferenceNumber": "ref-12345",
  "status": "accepted",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

#### POST /api/ksef/invoices/query
Query invoices from KSeF.

**Auth**: User

**Request Body**:
```json
{
  "nip": "1234567890",
  "direction": "incoming",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31"
}
```

**Response** (200):
```json
{
  "invoices": [
    {
      "referenceNumber": "ref-12345",
      "invoiceNumber": "FV/2024/001",
      "supplierNip": "9876543210",
      "invoiceDate": "2024-01-15",
      "grossAmount": 1230.00
    }
  ],
  "count": 1
}
```

#### GET /api/ksef/invoices/{ksefReferenceNumber}/upo
Get UPO (official confirmation) for invoice.

**Auth**: User

**Response** (200):
```json
{
  "referenceNumber": "ref-12345",
  "upo": "<UPO>...</UPO>",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

---

### KSeF Synchronization

#### POST /api/ksef/sync
Start full synchronization from KSeF.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "direction": "incoming",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31"
}
```

**Response** (200):
```json
{
  "syncId": "uuid",
  "status": "in_progress",
  "total": 150,
  "processed": 0
}
```

#### GET /api/ksef/sync/preview
Preview invoices before import.

**Auth**: User

**Query Parameters**:
- `settingId` (uuid, required)
- `dateFrom` (date, optional)
- `dateTo` (date, optional)

**Response** (200):
```json
{
  "preview": [
    {
      "referenceNumber": "ref-12345",
      "invoiceNumber": "FV/2024/001",
      "supplierNip": "9876543210",
      "grossAmount": 1230.00,
      "alreadyImported": false
    }
  ],
  "count": 50,
  "newCount": 45,
  "duplicateCount": 5
}
```

#### POST /api/ksef/sync/import
Import previewed invoices.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "referenceNumbers": ["ref-12345", "ref-67890"]
}
```

**Response** (200):
```json
{
  "imported": 2,
  "failed": 0,
  "errors": []
}
```

---

### Invoice Management

#### GET /api/invoices
List all invoices with filtering.

**Auth**: User

**Query Parameters**:
- `settingId` (uuid): Filter by setting/tenant
- `dateFrom` (date): Start date
- `dateTo` (date): End date
- `status` (string): Payment status (pending/paid)
- `mpk` (number): Cost center value
- `limit` (number): Max results (default: 100)
- `offset` (number): Pagination offset

**Response** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "referenceNumber": "ref-12345",
      "invoiceNumber": "FV/2024/001",
      "supplierNip": "9876543210",
      "supplierName": "Supplier Co.",
      "invoiceDate": "2024-01-15",
      "grossAmount": 1230.00,
      "paymentStatus": "pending",
      "mpk": 100000000,
      "category": "Services",
      "aiConfidence": 0.95
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

#### GET /api/invoices/{id}
Get single invoice by ID.

**Auth**: User

**Response** (200):
```json
{
  "id": "uuid",
  "referenceNumber": "ref-12345",
  "invoiceNumber": "FV/2024/001",
  "supplierNip": "9876543210",
  "supplierName": "Supplier Co.",
  "invoiceDate": "2024-01-15",
  "grossAmount": 1230.00,
  "paymentStatus": "pending",
  "mpk": 100000000,
  "category": "Services",
  "xml": "<Invoice>...</Invoice>"
}
```

#### PATCH /api/invoices/{id}
Update invoice metadata.

**Auth**: Admin or User (limited fields)

**Request Body**:
```json
{
  "mpk": 100000001,
  "category": "Marketing",
  "paymentStatus": "paid",
  "notes": "Paid via bank transfer"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "mpk": 100000001,
  "category": "Marketing",
  "paymentStatus": "paid"
}
```

#### DELETE /api/invoices/{id}
Delete invoice (soft delete).

**Auth**: Admin

**Response** (204): No content

#### POST /api/invoices/manual
Create manual invoice (not from KSeF).

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "invoiceNumber": "FV/2024/001",
  "supplierNip": "9876543210",
  "supplierName": "Supplier Co.",
  "invoiceDate": "2024-01-15",
  "grossAmount": 1230.00,
  "mpk": 100000000
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "invoiceNumber": "FV/2024/001",
  "source": "manual"
}
```

---

### Attachments

#### GET /api/invoices/{id}/attachments
List attachments for invoice.

**Auth**: User

**Response** (200):
```json
{
  "attachments": [
    {
      "id": "uuid",
      "fileName": "invoice.pdf",
      "fileSize": 102400,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-31T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/invoices/{id}/attachments
Upload attachment.

**Auth**: Admin or User

**Request**: Multipart form-data
- `file`: File to upload

**Response** (201):
```json
{
  "id": "uuid",
  "fileName": "invoice.pdf",
  "fileSize": 102400,
  "url": "https://..."
}
```

#### GET /api/attachments/{id}/download
Download attachment.

**Auth**: User

**Response** (200): Binary file stream with appropriate Content-Type

#### DELETE /api/attachments/{id}
Delete attachment.

**Auth**: Admin

**Response** (204): No content

#### GET /api/attachments/config
Get attachment upload configuration.

**Auth**: User

**Response** (200):
```json
{
  "maxFileSize": 10485760,
  "allowedTypes": [".pdf", ".jpg", ".png", ".xml"],
  "maxFilesPerInvoice": 10
}
```

---

### AI Categorization

#### POST /api/ai/categorize
Categorize single invoice using AI.

**Auth**: Admin

**Request Body**:
```json
{
  "invoiceId": "uuid"
}
```

**Response** (200):
```json
{
  "invoiceId": "uuid",
  "suggestions": {
    "mpk": {
      "value": 100000000,
      "label": "Consultants",
      "confidence": 0.95
    },
    "category": {
      "value": "Services",
      "confidence": 0.92
    }
  }
}
```

#### POST /api/ai/batch-categorize
Categorize multiple invoices.

**Auth**: Admin

**Request Body**:
```json
{
  "invoiceIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response** (200):
```json
{
  "results": [
    {
      "invoiceId": "uuid1",
      "suggestions": { ... },
      "applied": true
    }
  ],
  "total": 3,
  "successful": 3,
  "failed": 0
}
```

#### POST /api/ai/test
Test AI categorization with custom input.

**Auth**: Admin

**Request Body**:
```json
{
  "supplierName": "Microsoft Corporation",
  "description": "Azure cloud services"
}
```

**Response** (200):
```json
{
  "suggestions": {
    "mpk": { "value": 100000002, "label": "IT", "confidence": 0.98 }
  }
}
```

---

### Dashboard & Analytics

#### GET /api/dashboard/stats
Get dashboard statistics.

**Auth**: User

**Query Parameters**:
- `settingId` (uuid, optional): Filter by setting
- `dateFrom` (date, optional)
- `dateTo` (date, optional)

**Response** (200):
```json
{
  "totalInvoices": 1500,
  "totalAmount": 1250000.00,
  "byStatus": {
    "pending": 450,
    "paid": 1050
  },
  "byMpk": {
    "100000000": 500,
    "100000001": 300
  },
  "recentInvoices": [ ... ],
  "topSuppliers": [ ... ]
}
```

---

### Expense Forecast

#### GET /api/forecast/monthly
Returns a monthly expense forecast based on invoice history.

**Auth**: User

**Query Parameters**:
- `settingId` (uuid, required): Client settings identifier
- `tenantNip` (string, optional): Client NIP (if no settingId)
- `horizon` (1 | 6 | 12, default 6): Number of months ahead
- `historyMonths` (3–60, default 24): Number of months of history
- `algorithm` (string, optional): Forced algorithm (`auto`, `moving-average`, `linear-regression`, `seasonal`, `exponential-smoothing`)
- `algorithmConfig` (JSON, optional): Algorithm parameters

**Response** (200):
```json
{
  "points": [
    { "month": "2024-03", "predicted": 12000, "lower": 10000, "upper": 14000 },
    ...
  ],
  "trend": "up",
  "summary": { "total": 72000, "avg": 12000 }
}
```

#### GET /api/forecast/by-mpk
Expense forecast by cost center (MPK).

**Parameters**: as above + `top` (int, default 10, max 20)

**Response**: array of forecasts per MPK

#### GET /api/forecast/by-category
Expense forecast by category.

**Parameters**: as above + `top` (int, default 10, max 20)

**Response**: array of forecasts per category

#### GET /api/forecast/by-supplier
Expense forecast by supplier.

**Parameters**: as above + `top` (int, default 10, max 20)

**Response**: array of forecasts per supplier

#### GET /api/forecast/algorithms
Returns a list of available forecasting algorithms and their parameters.

**Response** (200):
```json
[
  {
    "id": "linear-regression",
    "name": "Linear Regression",
    "minDataPoints": 3,
    "parameters": [ ... ]
  }, ...
]
```

---

### Anomaly Detection

#### GET /api/anomalies
Detects anomalies in expenses based on rules.

**Auth**: User

**Query Parameters**:
- `settingId` (uuid, required): Client settings identifier
- `tenantNip` (string, optional): Client NIP
- `periodDays` (7–365, default 30): Analysis period in days
- `sensitivity` (1–5, default 2.0): Detection sensitivity
- `enabledRules` (string, optional): List of active rules (e.g. `amount-spike,new-supplier`)
- `ruleConfig` (JSON, optional): Rule parameter overrides

**Response** (200):
```json
{
  "anomalies": [
    { "id": "a1", "type": "amount-spike", "score": 85, "severity": "critical", ... },
    ...
  ],
  "summary": { "critical": 2, "high": 3, "medium": 1, "low": 0 }
}
```

#### GET /api/anomalies/summary
Summary of detected anomalies (counts, amounts, types).

**Parameters**: as above

**Response**: as above, only the `summary` field

#### GET /api/anomalies/rules
Returns a list of available anomaly detection rules and their parameters.

**Response** (200):
```json
[
  {
    "id": "amount-spike",
    "name": "Amount Spike",
    "parameters": [ ... ]
  }, ...
]
```

---

### MPK Centers

#### GET /api/mpk-centers
List cost centers (MPK).

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, optional): Filter by setting/tenant
- `activeOnly` (boolean, default: true): Show only active centers

**Response** (200):
```json
{
  "mpkCenters": [
    {
      "id": "uuid",
      "name": "IT & Software",
      "code": "MPK-IT",
      "monthlyBudget": 50000,
      "quarterlyBudget": 150000,
      "slaHours": 48,
      "isActive": true,
      "settingId": "uuid"
    }
  ],
  "count": 5
}
```

#### POST /api/mpk-centers
Create new cost center.

**Auth**: Admin

**Request Body**:
```json
{
  "name": "IT & Software",
  "code": "MPK-IT",
  "monthlyBudget": 50000,
  "quarterlyBudget": 150000,
  "slaHours": 48,
  "settingId": "uuid"
}
```

**Response** (201):
```json
{
  "mpkCenter": { "id": "uuid", "name": "IT & Software", ... }
}
```

#### GET /api/mpk-centers/{id}
Get single cost center.

**Auth**: Reader

**Response** (200):
```json
{
  "mpkCenter": { "id": "uuid", "name": "IT & Software", ... }
}
```

#### PATCH /api/mpk-centers/{id}
Update cost center.

**Auth**: Admin

**Request Body**:
```json
{
  "name": "IT & Software (updated)",
  "monthlyBudget": 60000
}
```

**Response** (200): Updated mpkCenter object

#### DELETE /api/mpk-centers/{id}
Deactivate cost center (soft delete).

**Auth**: Admin

**Response** (200):
```json
{
  "mpkCenter": { "id": "uuid", "isActive": false, ... }
}
```

#### GET /api/mpk-centers/{id}/approvers
List approvers for a cost center.

**Auth**: Reader

**Response** (200):
```json
{
  "approvers": [
    {
      "id": "uuid",
      "systemUserId": "uuid",
      "displayName": "John Doe",
      "email": "john@company.com",
      "maxAmount": 50000
    }
  ]
}
```

#### PUT /api/mpk-centers/{id}/approvers
Set approvers for a cost center (replaces existing list).

**Auth**: Admin

**Request Body**:
```json
{
  "approvers": [
    { "systemUserId": "uuid", "maxAmount": 50000 },
    { "systemUserId": "uuid", "maxAmount": 100000 }
  ]
}
```

**Response** (200):
```json
{
  "approvers": [ ... ],
  "count": 2
}
```

---

### Approvals

#### POST /api/invoices/{id}/approve
Approve an invoice.

**Auth**: Reader (must be assigned approver for the invoice's MPK)

**Request Body**:
```json
{
  "comment": "Approved — correct allocation."
}
```

**Response** (200):
```json
{
  "invoiceId": "uuid",
  "status": "approved",
  "approvedBy": "user-oid",
  "approvedAt": "2026-03-10T10:00:00.000Z"
}
```

#### POST /api/invoices/{id}/reject
Reject an invoice (comment required).

**Auth**: Reader (must be assigned approver)

**Request Body**:
```json
{
  "comment": "Wrong MPK assignment — should be Marketing."
}
```

**Response** (200):
```json
{
  "invoiceId": "uuid",
  "status": "rejected",
  "rejectedBy": "user-oid",
  "rejectedAt": "2026-03-10T10:00:00.000Z"
}
```

#### POST /api/invoices/{id}/cancel-approval
Cancel a pending approval (Admin only).

**Auth**: Admin

**Request Body**:
```json
{
  "comment": "Reassigning to different MPK."
}
```

**Response** (200):
```json
{
  "invoiceId": "uuid",
  "status": "new"
}
```

#### POST /api/invoices/{id}/refresh-approvers
Refresh the approver list for an invoice based on its MPK assignment.

**Auth**: Reader

**Response** (200):
```json
{
  "invoiceId": "uuid",
  "approvers": [ ... ]
}
```

#### POST /api/invoices/bulk-approve
Bulk approve multiple invoices at once.

**Auth**: Reader (must be approver for each invoice's MPK)

**Request Body**:
```json
{
  "invoiceIds": ["uuid1", "uuid2", "uuid3"],
  "comment": "Monthly batch approval."
}
```

**Response** (200):
```json
{
  "total": 3,
  "approved": 2,
  "failed": 1,
  "results": [
    { "invoiceId": "uuid1", "status": "approved" },
    { "invoiceId": "uuid2", "status": "approved" },
    { "invoiceId": "uuid3", "error": "Not an authorized approver" }
  ]
}
```

#### GET /api/approvals/pending
List invoices pending approval for the current user.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, optional): Filter by setting/tenant

**Response** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "FV/2026/001",
      "supplierName": "Supplier Co.",
      "grossAmount": 5000.00,
      "mpkCenterId": "uuid",
      "mpkCenterName": "IT & Software",
      "submittedForApprovalAt": "2026-03-09T08:00:00.000Z"
    }
  ],
  "count": 5
}
```

---

### Budget

#### GET /api/mpk-centers/{id}/budget-status
Get budget status for a single MPK center.

**Auth**: Reader

**Response** (200):
```json
{
  "data": {
    "mpkCenterId": "uuid",
    "mpkCenterName": "IT & Software",
    "monthlyBudget": 50000,
    "monthlySpent": 32000,
    "monthlyUtilization": 0.64,
    "quarterlyBudget": 150000,
    "quarterlySpent": 98000,
    "quarterlyUtilization": 0.653
  }
}
```

#### GET /api/budget/summary
Get budget summary across all MPK centers.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier

**Response** (200):
```json
{
  "data": [
    {
      "mpkCenterId": "uuid",
      "mpkCenterName": "IT & Software",
      "monthlyBudget": 50000,
      "monthlySpent": 32000,
      "monthlyUtilization": 0.64
    }
  ],
  "count": 5
}
```

---

### Notifications

#### GET /api/notifications
List notifications for the current user.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier
- `unreadOnly` (boolean, optional): Filter to unread only
- `top` (number, optional): Max results

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "SLA_EXCEEDED",
      "title": "Approval SLA exceeded",
      "message": "Invoice FV/2026/001 has been pending for 72 hours",
      "invoiceId": "uuid",
      "isRead": false,
      "createdAt": "2026-03-10T08:00:00.000Z"
    }
  ],
  "count": 3
}
```

#### PATCH /api/notifications/{id}/read
Mark notification as read.

**Auth**: Reader

**Response** (200):
```json
{
  "success": true
}
```

#### POST /api/notifications/{id}/dismiss
Dismiss notification.

**Auth**: Reader

**Response** (200):
```json
{
  "success": true
}
```

#### GET /api/notifications/unread-count
Get unread notification count for the current user.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier

**Response** (200):
```json
{
  "count": 5
}
```

---

### Reports

#### GET /api/reports/budget-utilization
Budget utilization report per MPK.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier
- `mpkCenterId` (uuid, optional): Filter to single MPK

**Response** (200):
```json
{
  "data": {
    "centers": [
      {
        "mpkCenterId": "uuid",
        "name": "IT & Software",
        "monthlyBudget": 50000,
        "spent": 32000,
        "utilization": 0.64,
        "overBudget": false
      }
    ],
    "totalBudget": 250000,
    "totalSpent": 180000
  }
}
```

#### GET /api/reports/approval-history
Approval history report.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier
- `dateFrom` (date, optional): Start date
- `dateTo` (date, optional): End date
- `mpkCenterId` (uuid, optional): Filter by MPK
- `status` (string, optional): Filter by approval status

**Response** (200):
```json
{
  "data": {
    "items": [
      {
        "invoiceId": "uuid",
        "invoiceNumber": "FV/2026/001",
        "approvalStatus": "approved",
        "approvedBy": "John Doe",
        "approvedAt": "2026-03-10T10:00:00.000Z",
        "mpkCenterName": "IT & Software"
      }
    ],
    "summary": {
      "total": 100,
      "approved": 80,
      "rejected": 15,
      "pending": 5
    }
  }
}
```

#### GET /api/reports/approver-performance
Approver performance statistics.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier

**Response** (200):
```json
{
  "data": [
    {
      "approverName": "John Doe",
      "totalProcessed": 50,
      "approved": 45,
      "rejected": 5,
      "avgProcessingHours": 12.5,
      "slaComplianceRate": 0.92
    }
  ]
}
```

#### GET /api/reports/invoice-processing
Invoice processing pipeline report.

**Auth**: Reader

**Query Parameters**:
- `settingId` (uuid, required): Setting/tenant identifier

**Response** (200):
```json
{
  "data": {
    "total": 500,
    "byStatus": {
      "new": 50,
      "pending_approval": 30,
      "approved": 350,
      "rejected": 20,
      "paid": 300
    },
    "avgProcessingDays": 3.2
  }
}
```

---

### VAT White List Integration

#### POST /api/vat/lookup
Look up company by NIP in the White List VAT registry (KAS).

**Auth**: User

**Request Body**:
```json
{
  "nip": "1234567890"
}
```

**Response** (200):
```json
{
  "nip": "1234567890",
  "name": "Company Name Sp. z o.o.",
  "address": "ul. Example 1, 00-000 Warsaw",
  "status": "active",
  "bankAccounts": ["PL12345678901234567890123456"]
}
```

#### GET /api/vat/validate/{nip}
Validate NIP format and existence.

**Auth**: User

**Response** (200):
```json
{
  "nip": "1234567890",
  "valid": true,
  "exists": true
}
```

#### POST /api/vat/check-account
Check if bank account belongs to an active VAT payer.

**Auth**: User

**Request Body**:
```json
{
  "nip": "1234567890",
  "bankAccount": "PL12345678901234567890123456"
}
```

**Response** (200):
```json
{
  "nip": "1234567890",
  "accountAssigned": true
}
```

---

### Document Processing

#### POST /api/documents/extract
Extract data from invoice document using OCR/AI.

**Auth**: Admin

**Request**: Multipart form-data
- `file`: Invoice document (PDF, image)

**Response** (200):
```json
{
  "extractedData": {
    "invoiceNumber": "FV/2024/001",
    "supplierNip": "9876543210",
    "supplierName": "Supplier Co.",
    "invoiceDate": "2024-01-15",
    "grossAmount": 1230.00
  },
  "confidence": 0.92
}
```

---

### Suppliers

#### GET /api/suppliers
List suppliers.

**Auth**: Reader

**Query Parameters**:
- `settingId` (string, required): Company setting ID
- `status` (string): Filter by status (`Active`, `Inactive`, `Blocked`)
- `search` (string): Search by name or NIP
- `hasSelfBillingAgreement` (boolean): Filter suppliers with active SB agreements
- `top` (number): Max results (default 100)
- `skip` (number): Offset for pagination

**Response** (200):
```json
{
  "suppliers": [
    {
      "id": "uuid",
      "settingId": "uuid",
      "name": "Supplier Name",
      "nip": "1234567890",
      "street": "ul. Example 1",
      "city": "Warsaw",
      "postalCode": "00-001",
      "email": "contact@supplier.pl",
      "phone": "+48 111 222 333",
      "status": "Active",
      "source": "VAT",
      "hasSelfBillingAgreement": true,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/suppliers
Create a new supplier.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "name": "Supplier Name",
  "nip": "1234567890",
  "street": "ul. Example 1",
  "city": "Warsaw",
  "postalCode": "00-001",
  "email": "contact@supplier.pl",
  "phone": "+48 111 222 333"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Supplier Name",
  "nip": "1234567890",
  "status": "Active"
}
```

Returns `409 Conflict` if a supplier with the same NIP already exists.

#### GET /api/suppliers/{id}
Get a single supplier by ID.

**Auth**: Reader

**Response** (200): Full supplier object (same shape as list item).

#### PATCH /api/suppliers/{id}
Update supplier fields.

**Auth**: Admin

**Request Body**: Partial supplier object (only fields to update).

**Response** (200): Updated supplier object.

#### DELETE /api/suppliers/{id}
Deactivate (soft-delete) a supplier.

**Auth**: Admin

**Response** (200):
```json
{ "success": true }
```

#### GET /api/suppliers/{id}/stats
Get supplier statistics.

**Auth**: Reader

**Response** (200):
```json
{
  "invoiceCount": 42,
  "totalGross": 125000.00,
  "avgInvoiceAmount": 2976.19,
  "pendingPayments": 3,
  "selfBillingInvoiceCount": 15
}
```

#### POST /api/suppliers/{id}/stats/refresh
Refresh cached supplier statistics.

**Auth**: Admin

**Response** (200): Updated stats object.

#### GET /api/suppliers/{id}/invoices
Get invoices for a specific supplier.

**Auth**: Reader

**Response** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "SF/2024/01/001",
      "invoiceDate": "2024-01-15",
      "grossAmount": 1230.00,
      "status": "SentToKsef"
    }
  ]
}
```

#### POST /api/suppliers/from-vat
Create a supplier from VAT registry lookup.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "nip": "1234567890"
}
```

**Response** (201): Created supplier object with data from VAT registry.

#### POST /api/suppliers/{id}/refresh-vat
Refresh supplier data from VAT registry.

**Auth**: Admin

**Response** (200): Updated supplier object.

---

### Self-Billing Agreements

#### GET /api/sb-agreements
List self-billing agreements.

**Auth**: Reader

**Query Parameters**:
- `settingId` (string, required): Company setting ID
- `supplierId` (string): Filter by supplier
- `status` (string): Filter by status (`Active`, `Terminated`, `Expired`)

**Response** (200):
```json
{
  "agreements": [
    {
      "id": "uuid",
      "settingId": "uuid",
      "supplierId": "uuid",
      "supplierName": "Supplier Name",
      "status": "Active",
      "validFrom": "2024-01-01",
      "validTo": "2025-12-31",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/sb-agreements
Create a new self-billing agreement.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "supplierId": "uuid",
  "validFrom": "2024-01-01",
  "validTo": "2025-12-31"
}
```

Validates that the supplier has `Active` status. Sets the supplier's `hasSelfBillingAgreement` flag.

**Response** (201): Created agreement object.

#### GET /api/sb-agreements/{id}
Get a single agreement by ID.

**Auth**: Reader

**Response** (200): Full agreement object.

#### PATCH /api/sb-agreements/{id}
Update agreement fields.

**Auth**: Admin

**Request Body**: Partial agreement object.

**Response** (200): Updated agreement object.

#### POST /api/sb-agreements/{id}/terminate
Terminate an active agreement.

**Auth**: Admin

**Response** (200):
```json
{
  "id": "uuid",
  "status": "Terminated"
}
```

#### GET /api/sb-agreements/{id}/attachments
List attachments for an agreement.

**Auth**: Reader

**Response** (200):
```json
{
  "attachments": [
    {
      "id": "uuid",
      "fileName": "agreement-scan.pdf",
      "mimeType": "application/pdf",
      "size": 125000,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/sb-agreements/{id}/attachments
Upload an attachment for an agreement.

**Auth**: Admin

**Request Body**:
```json
{
  "fileName": "agreement-scan.pdf",
  "mimeType": "application/pdf",
  "content": "base64-encoded-content",
  "description": "Signed agreement scan"
}
```

Validates file type and size limits.

**Response** (201):
```json
{
  "id": "uuid",
  "fileName": "agreement-scan.pdf"
}
```

---

### Self-Billing Templates

#### GET /api/sb-templates
List invoice templates.

**Auth**: Reader

**Query Parameters**:
- `settingId` (string, required): Company setting ID
- `supplierId` (string): Filter by supplier
- `activeOnly` (boolean): Only active templates (default: `true`)

**Response** (200):
```json
{
  "templates": [
    {
      "id": "uuid",
      "settingId": "uuid",
      "supplierId": "uuid",
      "name": "Monthly Service",
      "itemDescription": "IT consulting services",
      "quantity": 1,
      "unit": "szt.",
      "unitPrice": 5000.00,
      "vatRate": 23,
      "currency": "PLN",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/sb-templates
Create a new template.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "supplierId": "uuid",
  "name": "Monthly Service",
  "itemDescription": "IT consulting services",
  "quantity": 1,
  "unit": "szt.",
  "unitPrice": 5000.00,
  "vatRate": 23,
  "currency": "PLN"
}
```

**Response** (201): Created template object.

#### GET /api/sb-templates/{id}
Get a single template by ID.

**Auth**: Reader

**Response** (200): Full template object.

#### PATCH /api/sb-templates/{id}
Update template fields.

**Auth**: Admin

**Request Body**: Partial template object.

**Response** (200): Updated template object.

#### DELETE /api/sb-templates/{id}
Deactivate (soft-delete) a template.

**Auth**: Admin

**Response** (200):
```json
{ "success": true }
```

#### POST /api/sb-templates/duplicate
Duplicate all templates from one supplier to another.

**Auth**: Admin

**Request Body**:
```json
{
  "fromSupplierId": "uuid",
  "toSupplierId": "uuid",
  "settingId": "uuid"
}
```

**Response** (200):
```json
{
  "duplicated": 3
}
```

---

### Self-Billing Invoices

#### POST /api/invoices/self-billing
Create a single self-billing invoice.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "supplierId": "uuid",
  "invoiceDate": "2024-01-31",
  "items": [
    {
      "description": "IT consulting services",
      "quantity": 1,
      "unit": "szt.",
      "unitPrice": 5000.00,
      "vatRate": 23
    }
  ]
}
```

Resolves agreement from `agreementId` or `supplierId`. Generates invoice number in format `SF/{YYYY}/{MM}/{NNN}`.

**Response** (201):
```json
{
  "id": "uuid",
  "invoiceNumber": "SF/2024/01/001",
  "status": "Draft",
  "grossAmount": 6150.00
}
```

#### GET /api/invoices/self-billing
List self-billing invoices.

**Auth**: Reader

**Query Parameters**:
- `settingId` (string): Company setting ID
- `supplierId` (string): Filter by supplier
- `selfBillingStatus` (string): Filter by status (`Draft`, `PendingSeller`, `SellerApproved`, `SellerRejected`, `SentToKsef`)
- `top` (number): Max results

**Response** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "SF/2024/01/001",
      "supplierId": "uuid",
      "supplierName": "Supplier Name",
      "invoiceDate": "2024-01-31",
      "grossAmount": 6150.00,
      "status": "Draft",
      "createdAt": "2024-01-31T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/invoices/self-billing/preview
Preview invoice generation for a period.

**Auth**: Reader

**Request Body**:
```json
{
  "settingId": "uuid",
  "period": { "month": 1, "year": 2024 },
  "supplierIds": ["uuid"]
}
```

`supplierIds` is optional — omit to include all suppliers with active agreements.

**Response** (200):
```json
{
  "previews": [
    {
      "supplierId": "uuid",
      "supplierName": "Supplier Name",
      "items": [{ "description": "...", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }],
      "totals": { "net": 5000.00, "vat": 1150.00, "gross": 6150.00 }
    }
  ],
  "totals": { "invoiceCount": 1, "totalGross": 6150.00 }
}
```

#### POST /api/invoices/self-billing/generate
Generate invoices for a period. Uses the same request body as preview.

**Auth**: Admin

**Response** (200):
```json
{
  "created": 3,
  "invoiceIds": ["uuid", "uuid", "uuid"]
}
```

#### POST /api/invoices/self-billing/generate/confirm
Confirm generated invoices — transitions them from Draft to PendingSeller.

**Auth**: Admin

**Request Body**:
```json
{
  "invoiceIds": ["uuid", "uuid"]
}
```

**Response** (200):
```json
{
  "confirmed": 2
}
```

#### POST /api/invoices/self-billing/{id}/submit
Submit invoice for seller review.

**Auth**: Admin

Resolves current user's Dataverse identity. Verifies the supplier has a designated SB contact user (`sbContactUserId`). Records `submittedByUserId` and `submittedAt`. Sends an `SbApprovalRequested` notification to the supplier's SB contact user.

Transitions: `Draft` → `PendingSeller`

**Response** (200):
```json
{
  "invoice": {
    "id": "uuid",
    "status": "PendingSeller",
    "submittedByUserId": "uuid",
    "submittedAt": "2026-03-15T14:30:00.000Z"
  }
}
```

**Errors**:
- `400` — Supplier has no SB contact user assigned
- `400` — Invoice status is not Draft
- `403` — Could not resolve Dataverse user account
- `404` — Invoice or supplier not found

#### POST /api/invoices/self-billing/{id}/approve
Seller approves the invoice.

**Auth**: Reader (minimum) — authorized for supplier's designated SB contact user or Admin

Resolves caller's Dataverse identity and checks authorization: either the caller matches the supplier's `sbContactUserId` or the caller has Admin role. Records `approvedByUserId` and `approvedAt`.

Transitions: `PendingSeller` → `SellerApproved`

**Response** (200):
```json
{
  "invoice": {
    "id": "uuid",
    "status": "SellerApproved",
    "approvedByUserId": "uuid",
    "approvedAt": "2026-03-15T15:00:00.000Z"
  }
}
```

**Errors**:
- `400` — Invoice status is not PendingSeller
- `403` — Only the designated supplier contact or Admin can approve

#### POST /api/invoices/self-billing/{id}/reject
Seller rejects the invoice.

**Auth**: Reader (minimum) — authorized for supplier's designated SB contact user or Admin

Same authorization model as approve. Records rejection reason, `approvedByUserId`, and `approvedAt`.

**Request Body**:
```json
{
  "reason": "Incorrect amounts"
}
```

Transitions: `PendingSeller` → `SellerRejected`

**Response** (200):
```json
{
  "invoice": {
    "id": "uuid",
    "status": "SellerRejected",
    "sellerRejectionReason": "Incorrect amounts",
    "approvedByUserId": "uuid",
    "approvedAt": "2026-03-15T15:00:00.000Z"
  }
}
```

**Errors**:
- `400` — Rejection reason is required
- `400` — Invoice status is not PendingSeller
- `403` — Only the designated supplier contact or Admin can reject

#### POST /api/invoices/self-billing/{id}/send-ksef
Send approved invoice to KSeF.

**Auth**: Admin

Builds KSeF XML with `isSelfBilling: true` (sets P_17=1, includes Podmiot3 issuer). Must be `SellerApproved`.

Transitions: `SellerApproved` → `SentToKsef`

**Response** (200):
```json
{
  "id": "uuid",
  "status": "SentToKsef",
  "ksefReferenceNumber": "KSeF-123456"
}
```

#### PATCH /api/invoices/self-billing/{id}/status
Generic status update (for admin overrides).

**Auth**: Admin

**Request Body**:
```json
{
  "status": "Draft",
  "rejectionReason": "optional reason"
}
```

**Response** (200): Updated invoice object.

#### POST /api/invoices/self-billing/batch
Batch create up to 100 invoices.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "invoices": [
    {
      "supplierId": "uuid",
      "invoiceDate": "2024-01-31",
      "items": [{ "description": "...", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }]
    }
  ]
}
```

**Response** (200):
```json
{
  "created": 5,
  "invoiceIds": ["uuid", "uuid", "uuid", "uuid", "uuid"]
}
```

---

### Self-Billing Approvals

#### GET /api/self-billing/approvals/pending
List self-billing invoices pending approval for the current user.

**Auth**: Reader

Returns invoices with status `PendingSeller` where the supplier's `sbContactUserId` matches the current user's Dataverse system user ID. Admins can pass `?all=true` to see all pending invoices across all suppliers.

**Query Parameters**:
- `settingId` (string, required): Company setting ID
- `all` (string, optional): `true` to list all pending invoices (Admin only)

**Response** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "SF/2024/01/001",
      "supplierId": "uuid",
      "supplierName": "Supplier Name",
      "supplierNip": "1234567890",
      "invoiceDate": "2024-01-31",
      "grossAmount": 6150.00,
      "status": "PendingSeller",
      "submittedAt": "2024-01-31T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Self-Billing Import

#### POST /api/invoices/self-billing/import
Parse and validate a CSV or Excel file for import.

**Auth**: Admin

**Query Parameters**:
- `settingId` (string, required): Company setting ID

Send the file content in the request body with appropriate `Content-Type` (`text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). The format is auto-detected.

**Response** (200):
```json
{
  "importId": "uuid",
  "rows": [
    {
      "rowNumber": 1,
      "supplierNip": "1234567890",
      "supplierName": "Supplier Name",
      "isValid": true,
      "hasAgreement": true,
      "items": [{ "description": "Service", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }]
    }
  ],
  "validCount": 5,
  "invalidCount": 1
}
```

#### POST /api/invoices/self-billing/import/confirm
Create invoices from validated import rows.

**Auth**: Admin

**Request Body**:
```json
{
  "settingId": "uuid",
  "rows": [
    {
      "supplierNip": "1234567890",
      "items": [{ "description": "Service", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }]
    }
  ]
}
```

**Response** (200):
```json
{
  "created": 5,
  "invoiceIds": ["uuid", "uuid", "uuid", "uuid", "uuid"]
}
```

#### GET /api/invoices/self-billing/import/template
Download CSV or Excel import template.

**Auth**: User

**Query Parameters**:
- `format` (string): `csv` or `xlsx` (default: `csv`)

**Response** (200): File download with appropriate Content-Type.

---

## Error Handling

All endpoints return standard error responses:

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `204`: No Content
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `422`: Unprocessable Entity (business logic error)
- `500`: Internal Server Error
- `503`: Service Unavailable (external service down)

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: User lacks required role
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `DATAVERSE_ERROR`: Dataverse operation failed
- `KSEF_ERROR`: KSeF API error
- `KEYVAULT_ERROR`: Azure Key Vault error
- `AI_ERROR`: AI service error

---

## Rate Limits

- **Default**: 100 requests per minute per user
- **AI endpoints**: 10 requests per minute per user
- **Batch operations**: 5 requests per minute per user

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706700000
```

When rate limit is exceeded, API returns `429 Too Many Requests` with `Retry-After` header.

---

## Versioning

Current API version: **v1**

All endpoints are prefixed with `/api/`. Future versions will use `/api/v2/`, etc.

---

## Support

For API support, please:
1. Check this documentation
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Open an issue on GitHub
4. Refer to [SECURITY.md](../SECURITY.md) for security concerns
