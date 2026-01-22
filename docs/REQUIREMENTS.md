# dvlp-ksef Requirements

> Version: 0.1.0 | Status: Draft | Last Updated: 2026-01-22

## Table of Contents

1. [Overview](#overview)
2. [Functional Requirements](#functional-requirements)
3. [Non-Functional Requirements](#non-functional-requirements)
4. [Data Model](#data-model)
5. [API Endpoints](#api-endpoints)
6. [User Interface](#user-interface)
7. [Security](#security)
8. [Scope: MVP vs Extended](#scope-mvp-vs-extended)

---

## Overview

### Purpose

Integration module for Polish National e-Invoice System (KSeF) enabling:
- Automatic retrieval of purchase invoices from KSeF
- Categorization (manual + AI-powered)
- Payment status tracking
- Storage in Microsoft Dataverse

### Target Users

- **Admin**: Full access - sync, import, categorize, configure
- **Reader**: Read-only access - view invoices and statuses

---

## Functional Requirements

### FR-001: KSeF Authentication

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-001.1 | System shall authenticate with KSeF using authorization token | Must | MVP |
| FR-001.2 | Tokens shall be stored in Azure Key Vault | Must | MVP |
| FR-001.3 | System shall display token expiry warnings (7 days before) | Should | MVP |
| FR-001.4 | System shall support multiple tokens (per company) | Must | Extended |

### FR-002: Invoice Synchronization

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-002.1 | System shall retrieve list of purchase invoices from KSeF | Must | MVP |
| FR-002.2 | System shall filter by date range | Must | MVP |
| FR-002.3 | System shall detect already imported invoices (by KSeF reference) | Must | MVP |
| FR-002.4 | System shall display new invoices for selection | Must | MVP |
| FR-002.5 | System shall support automatic scheduled sync | Should | Extended |

### FR-003: Invoice Import

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-003.1 | System shall download full XML (FA-2) for selected invoices | Must | MVP |
| FR-003.2 | System shall parse XML and extract key fields | Must | MVP |
| FR-003.3 | System shall store invoice data in Dataverse | Must | MVP |
| FR-003.4 | System shall store raw XML for reference | Should | MVP |
| FR-003.5 | System shall handle import errors gracefully | Must | MVP |

### FR-004: Invoice Categorization

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-004.1 | User shall be able to assign MPK (cost center) | Must | MVP |
| FR-004.2 | User shall be able to assign category | Must | MVP |
| FR-004.3 | User shall be able to assign project (optional) | Should | MVP |
| FR-004.4 | User shall be able to add tags | Should | MVP |
| FR-004.5 | System shall auto-suggest categories using AI | Must | Extended |
| FR-004.6 | System shall learn from user corrections | Should | Extended |
| FR-004.7 | System shall cache supplier→category mappings | Should | Extended |

### FR-005: Payment Status

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-005.1 | User shall be able to mark invoice as paid | Must | MVP |
| FR-005.2 | User shall be able to set payment date | Must | MVP |
| FR-005.3 | System shall display overdue invoices | Should | MVP |
| FR-005.4 | System shall calculate days until/since due date | Should | MVP |

### FR-006: Multi-Tenant (Extended)

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-006.1 | System shall support multiple companies (NIP) | Must | Extended |
| FR-006.2 | User shall be able to switch between companies | Must | Extended |
| FR-006.3 | Each company shall have separate KSeF token | Must | Extended |
| FR-006.4 | Data shall be isolated by company | Must | Extended |

### FR-007: Export (Extended)

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-007.1 | User shall be able to export invoices to CSV | Should | Extended |
| FR-007.2 | User shall be able to export invoices to Excel | Should | Extended |
| FR-007.3 | Export shall respect current filters | Should | Extended |

### FR-008: Notifications (Extended)

| ID | Requirement | Priority | Scope |
|----|-------------|----------|-------|
| FR-008.1 | System shall notify about new invoices | Could | Extended |
| FR-008.2 | System shall notify about token expiry | Should | Extended |
| FR-008.3 | Notifications shall be configurable | Could | Extended |

---

## Non-Functional Requirements

### NFR-001: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001.1 | API response time | < 2 seconds (95th percentile) |
| NFR-001.2 | Invoice list load time | < 3 seconds (100 invoices) |
| NFR-001.3 | Single invoice import | < 5 seconds |
| NFR-001.4 | Batch import (10 invoices) | < 30 seconds |

### NFR-002: Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-002.1 | Concurrent users | 50+ |
| NFR-002.2 | Invoices per company | 10,000+ |
| NFR-002.3 | Companies (Extended) | 100+ |

### NFR-003: Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-003.1 | Uptime | 99.5% |
| NFR-003.2 | Planned maintenance window | < 1 hour/month |

### NFR-004: Security

| ID | Requirement |
|----|-------------|
| NFR-004.1 | All API endpoints require authentication |
| NFR-004.2 | Tokens stored in Azure Key Vault |
| NFR-004.3 | HTTPS only |
| NFR-004.4 | RBAC enforced on all operations |
| NFR-004.5 | Audit logging for sensitive operations |

### NFR-005: Compatibility

| ID | Requirement |
|----|-------------|
| NFR-005.1 | Node.js 20+ |
| NFR-005.2 | Modern browsers (Chrome, Edge, Firefox, Safari) |
| NFR-005.3 | KSeF API: test, demo, prod environments |
| NFR-005.4 | Dataverse API: Web API v9.2+ |

---

## Data Model

### Entity: ksef_invoices

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| ksef_invoiceid | GUID | Primary key | ✅ |
| ksef_tenantNip | String(10) | Company NIP | ✅ |
| ksef_tenantName | String(200) | Company name | ✅ |
| ksef_referenceNumber | String(100) | KSeF reference (unique) | ✅ |
| ksef_invoiceNumber | String(50) | Supplier's invoice number | ✅ |
| ksef_supplierNip | String(10) | Supplier NIP | ✅ |
| ksef_supplierName | String(200) | Supplier name | ✅ |
| ksef_invoiceDate | Date | Invoice date | ✅ |
| ksef_dueDate | Date | Payment due date | |
| ksef_netAmount | Currency | Net amount | ✅ |
| ksef_vatAmount | Currency | VAT amount | ✅ |
| ksef_grossAmount | Currency | Gross amount | ✅ |
| ksef_paymentStatus | Choice | pending / paid | ✅ |
| ksef_paymentDate | Date | Actual payment date | |
| ksef_mpk | Choice | Cost center | |
| ksef_category | String(50) | Cost category | |
| ksef_project | String(100) | Project reference | |
| ksef_tags | String(500) | Tags (JSON array) | |
| ksef_rawXml | Multiline | Original XML | |
| ksef_importedAt | DateTime | Import timestamp | ✅ |
| ksef_aiMpkSuggestion | Choice | AI MPK suggestion | Extended |
| ksef_aiCategorySuggestion | String | AI category suggestion | Extended |
| ksef_aiConfidence | Decimal | AI confidence score | Extended |

### Entity: ksef_tenants (Extended)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| ksef_tenantid | GUID | Primary key | ✅ |
| ksef_nip | String(10) | Company NIP | ✅ |
| ksef_name | String(200) | Company name | ✅ |
| ksef_tokenSecretName | String(100) | Key Vault secret name | ✅ |
| ksef_tokenExpiry | Date | Token expiry date | |
| ksef_isActive | Boolean | Is active | ✅ |
| ksef_createdAt | DateTime | Created timestamp | ✅ |

### Choice Fields

#### ksef_paymentStatus
- `pending` - Awaiting payment
- `paid` - Paid

#### ksef_mpk (Cost Centers)
- `Consultants` - Consultants
- `BackOffice` - Back Office
- `Management` - Management
- `Cars` - Cars
- `Legal` - Legal
- `Marketing` - Marketing
- `Sales` - Sales
- `Delivery` - Delivery
- `Finance` - Finance
- `Other` - Other

---

## API Endpoints

### Health & Status

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |
| GET | `/api/ksef/status` | KSeF connection status | Admin |

### Session Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/ksef/session` | Start KSeF session | Admin |
| DELETE | `/api/ksef/session` | End KSeF session | Admin |

### Invoice Operations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/ksef/invoices` | List invoices from KSeF | Admin |
| POST | `/api/ksef/import` | Import selected invoices | Admin |
| GET | `/api/invoices` | List stored invoices | Reader |
| GET | `/api/invoices/:id` | Get invoice details | Reader |
| PATCH | `/api/invoices/:id` | Update invoice (categorize) | Admin |
| DELETE | `/api/invoices/:id` | Delete invoice | Admin |

### AI Categorization (Extended)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/ai/categorize` | Categorize single invoice | Admin |
| POST | `/api/ai/batch-categorize` | Categorize multiple invoices | Admin |
| POST | `/api/ai/feedback` | Submit correction feedback | Admin |

### Tenants (Extended)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tenants` | List companies | Admin |
| POST | `/api/tenants` | Add company | Admin |
| PATCH | `/api/tenants/:id` | Update company | Admin |
| DELETE | `/api/tenants/:id` | Remove company | Admin |

---

## User Interface

### Pages

| Route | Description | Scope |
|-------|-------------|-------|
| `/` | Dashboard (summary, recent invoices) | MVP |
| `/invoices` | Invoice list with filters | MVP |
| `/invoices/:id` | Invoice detail view | MVP |
| `/sync` | KSeF sync panel | MVP |
| `/settings` | Configuration | MVP |
| `/settings/company` | Company switcher | Extended |

### Key Components

- **InvoiceTable** - Sortable, filterable list
- **InvoiceDetail** - Full invoice view with edit
- **SyncPanel** - KSeF sync controls
- **CategoryForm** - MPK, category, project assignment
- **PaymentStatus** - Payment tracking controls
- **AISuggestionBadge** - AI recommendation display (Extended)
- **CompanySwitcher** - Tenant selector (Extended)

---

## Security

### Authentication

- Azure Entra ID (OAuth 2.0 / OIDC)
- JWT tokens with role claims
- Session timeout: 8 hours

### Authorization (RBAC)

| Role | Permissions |
|------|-------------|
| Admin | Full access: read, write, sync, configure |
| Reader | Read-only: view invoices and statuses |

### Data Protection

- TLS 1.3 for all communications
- KSeF tokens in Azure Key Vault
- Dataverse row-level security (optional)
- No PII in logs

---

## Scope: MVP vs Extended

### MVP Scope

✅ Included:
- Single company (tenant)
- Manual KSeF sync (on-demand)
- Invoice import and storage
- Manual categorization (MPK, category, project, tags)
- Payment status management
- Basic dashboard
- Admin + Reader roles
- Azure Key Vault token storage

❌ Not included:
- AI categorization
- Multi-tenant
- Automatic sync (timer)
- Export functionality
- Notifications
- Webhooks

### Extended Scope

All MVP features plus:
- 🤖 AI-powered categorization (Azure OpenAI)
- 🏢 Multi-tenant (multiple companies)
- ⏰ Automatic scheduled sync
- 📊 Export to CSV/Excel
- 📧 Email notifications
- 🔗 API webhooks
- 📈 Advanced analytics

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-22 | 0.1.0 | Initial requirements draft |
