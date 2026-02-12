# API Documentation

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
  - [GUS Integration](#gus-integration)
  - [Document Processing](#document-processing)
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

**Important**: Set `SKIP_AUTH=true` only for local development. The application will crash on startup if `SKIP_AUTH=true` in production (`NODE_ENV=production`).

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
List all cost centers (MPK values).

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

### GUS Integration

#### POST /api/gus/lookup
Look up company by NIP in GUS (Polish business registry).

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
  "regon": "123456789"
}
```

#### POST /api/gus/search
Search companies by name.

**Auth**: User

**Request Body**:
```json
{
  "query": "Microsoft"
}
```

**Response** (200):
```json
{
  "results": [
    {
      "nip": "1234567890",
      "name": "Microsoft Sp. z o.o.",
      "regon": "123456789"
    }
  ]
}
```

#### GET /api/gus/validate/{nip}
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
