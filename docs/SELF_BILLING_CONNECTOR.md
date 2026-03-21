# Self-Billing — Custom Connector Operations

> **Version:** 1.0  
> **Date:** 2026-06-04  
> **Module:** Self-Billing (Samofakturowanie)

This document describes the 38 new Power Platform Custom Connector operations added for the Self-Billing module. All operations require OAuth 2.0 authentication via Entra ID and respect RBAC roles (Admin / Reader).

---

## Table of Contents

- [Self-Billing — Custom Connector Operations](#self-billing--custom-connector-operations)
  - [Table of Contents](#table-of-contents)
  - [1. Suppliers](#1-suppliers)
    - [Key Query Parameters (ListSuppliers)](#key-query-parameters-listsuppliers)
  - [2. Self-Billing Agreements](#2-self-billing-agreements)
    - [Agreement Statuses](#agreement-statuses)
  - [3. Self-Billing Templates](#3-self-billing-templates)
    - [Template Fields](#template-fields)
  - [4. Self-Billing Invoices \& Workflow](#4-self-billing-invoices--workflow)
    - [Invoice Workflow](#invoice-workflow)
    - [Invoice Statuses](#invoice-statuses)
  - [5. Self-Billing Import](#5-self-billing-import)
    - [Import Workflow](#import-workflow)
  - [6. Timer Trigger](#6-timer-trigger)
  - [7. Power Automate Examples](#7-power-automate-examples)
    - [Example 1: Monthly Self-Billing Invoice Generation](#example-1-monthly-self-billing-invoice-generation)
    - [Example 2: Import from SharePoint](#example-2-import-from-sharepoint)
    - [Example 3: Seller Approval Notification](#example-3-seller-approval-notification)
  - [8. Copilot Studio Agent](#8-copilot-studio-agent)

---

## 1. Suppliers

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 1 | `ListSuppliers` | GET | `/suppliers` | Reader | List suppliers with filters. Requires `settingId`. |
| 2 | `CreateSupplier` | POST | `/suppliers` | Admin | Create a new supplier. NIP must have valid checksum. |
| 3 | `GetSupplier` | GET | `/suppliers/{id}` | Reader | Get supplier details by ID. |
| 4 | `UpdateSupplier` | PATCH | `/suppliers/{id}` | Admin | Partially update supplier fields. |
| 5 | `DeleteSupplier` | DELETE | `/suppliers/{id}` | Admin | Delete a supplier. |
| 6 | `GetSupplierStats` | GET | `/suppliers/{id}/stats` | Reader | Invoice stats (count, totals, overdue). |
| 7 | `RefreshSupplierStats` | POST | `/suppliers/{id}/stats/refresh` | Admin | Force recalculation of cached stats. |
| 8 | `GetSupplierInvoices` | GET | `/suppliers/{id}/invoices` | Reader | List invoices for a specific supplier. |
| 9 | `RefreshSupplierVat` | POST | `/suppliers/{id}/refresh-vat` | Admin | Refresh data from VAT White List. |
| 10 | `CreateSupplierFromVat` | POST | `/suppliers/from-vat` | Admin | Create supplier from VAT registry data. |

### Key Query Parameters (ListSuppliers)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `settingId` | string (UUID) | Yes | Company setting ID |
| `status` | string | No | `Active`, `Inactive`, `Blocked` |
| `search` | string | No | Search by name or NIP |
| `hasSelfBillingAgreement` | boolean | No | Filter by self-billing flag |
| `top` / `skip` | integer | No | Pagination |

---

## 2. Self-Billing Agreements

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 1 | `ListSbAgreements` | GET | `/sb-agreements` | Reader | List agreements. Requires `settingId`. |
| 2 | `CreateSbAgreement` | POST | `/sb-agreements` | Admin | Create agreement. Supplier must exist and be active. |
| 3 | `GetSbAgreement` | GET | `/sb-agreements/{id}` | Reader | Get agreement details. |
| 4 | `UpdateSbAgreement` | PATCH | `/sb-agreements/{id}` | Admin | Update agreement fields. |
| 5 | `TerminateSbAgreement` | POST | `/sb-agreements/{id}/terminate` | Admin | Terminate agreement → status = Terminated. |
| 6 | `ListSbAgreementAttachments` | GET | `/sb-agreements/{id}/attachments` | Reader | List agreement attachments. |
| 7 | `UploadSbAgreementAttachment` | POST | `/sb-agreements/{id}/attachments` | Admin | Upload signed agreement PDF (max 10 MB). |

### Agreement Statuses

- **Active** — Agreement is in force
- **Expired** — Past `validTo` date (auto-set by timer trigger)
- **Terminated** — Manually terminated via API

---

## 3. Self-Billing Templates

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 1 | `ListSbTemplates` | GET | `/sb-templates` | Reader | List templates. Requires `settingId`. |
| 2 | `CreateSbTemplate` | POST | `/sb-templates` | Admin | Create a new invoice item template. |
| 3 | `GetSbTemplate` | GET | `/sb-templates/{id}` | Reader | Get template details. |
| 4 | `UpdateSbTemplate` | PATCH | `/sb-templates/{id}` | Admin | Update template fields. |
| 5 | `DeleteSbTemplate` | DELETE | `/sb-templates/{id}` | Admin | Delete a template. |
| 6 | `DuplicateSbTemplate` | POST | `/sb-templates/duplicate` | Admin | Duplicate template for another supplier. |

### Template Fields

| Field | Type | Description |
|---|---|---|
| `itemDescription` | string | Invoice line item description |
| `quantity` | number | Default quantity |
| `unit` | string | Unit of measure (e.g., "szt.", "godz.", "m²") |
| `unitPrice` | number | Unit price (net) |
| `vatRate` | integer | VAT rate in %. -1 = exempt |
| `currency` | string | Default: PLN |

---

## 4. Self-Billing Invoices & Workflow

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 1 | `ListSelfBillingInvoices` | GET | `/invoices/self-billing` | Reader | List with filters. Requires `settingId`. |
| 2 | `CreateSelfBillingInvoice` | POST | `/invoices/self-billing` | Admin | Create a single self-billing invoice. |
| 3 | `PreviewSelfBillingInvoice` | POST | `/invoices/self-billing/preview` | Reader | Preview without saving. |
| 4 | `GenerateSelfBillingInvoices` | POST | `/invoices/self-billing/generate` | Admin | Generate invoices from templates for a period. |
| 5 | `ConfirmGeneratedSelfBilling` | POST | `/invoices/self-billing/generate/confirm` | Admin | Confirm and save generated invoices. |
| 6 | `BatchCreateSelfBillingInvoices` | POST | `/invoices/self-billing/batch` | Admin | Batch create (max 100). |
| 7 | `UpdateSelfBillingStatus` | PATCH | `/invoices/self-billing/{id}/status` | Admin | Direct status update. |
| 8 | `SubmitForSellerReview` | POST | `/invoices/self-billing/{id}/submit` | Admin | Draft → PendingSeller. |
| 9 | `SellerApproveInvoice` | POST | `/invoices/self-billing/{id}/approve` | Admin | PendingSeller → SellerApproved. |
| 10 | `SellerRejectInvoice` | POST | `/invoices/self-billing/{id}/reject` | Admin | PendingSeller → SellerRejected (reason required). |
| 11 | `SendSelfBillingToKsef` | POST | `/invoices/self-billing/{id}/send-ksef` | Admin | SellerApproved → SentToKsef. |

### Invoice Workflow

```
Draft → PendingSeller → SellerApproved → SentToKsef
                      ↘ SellerRejected
```

### Invoice Statuses

| Status | Description |
|---|---|
| `Draft` | Newly created, editable |
| `PendingSeller` | Awaiting seller approval |
| `SellerApproved` | Seller confirmed, ready for KSeF |
| `SellerRejected` | Seller rejected (see `rejectionReason`) |
| `SentToKsef` | Successfully sent to KSeF (has `ksefReferenceNumber`) |

---

## 5. Self-Billing Import

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 1 | `ImportSelfBillingFile` | POST | `/invoices/self-billing/import` | Admin | Upload CSV/XLSX file → returns preview. |
| 2 | `ConfirmSelfBillingImport` | POST | `/invoices/self-billing/import/confirm` | Admin | Confirm and create invoices from import. |
| 3 | `DownloadSelfBillingTemplate` | GET | `/invoices/self-billing/import/template` | Reader | Download CSV/XLSX template file. |

### Import Workflow

1. Upload file via `ImportSelfBillingFile` → get `importId` + row previews with validation
2. Review previews (valid/invalid rows)
3. Confirm via `ConfirmSelfBillingImport` with `importId` → invoices created in Dataverse

---

## 6. Timer Trigger

| Name | Schedule | Description |
|---|---|---|
| `sb-agreement-expiry-check` | Daily 06:00 UTC | Auto-terminates expired agreements, warns about expiring-soon (30 days), updates supplier `hasSelfBillingAgreement` flag |

This is a background Azure Functions timer trigger — not exposed through the connector.

---

## 7. Power Automate Examples

### Example 1: Monthly Self-Billing Invoice Generation

```
Trigger: Recurrence (1st of every month, 08:00)
  ↓
Action: DVLP-KSeF → GenerateSelfBillingInvoices
  Body: { settingId: "<UUID>", period: { month: @{triggerOutputs()['queries']['month']}, year: @{triggerOutputs()['queries']['year']} } }
  ↓
Condition: previews count > 0
  ↓ Yes
Action: DVLP-KSeF → ConfirmGeneratedSelfBilling
  Body: { settingId: "<UUID>", previews: @{body('GenerateSelfBillingInvoices')?['previews']} }
  ↓
Action: Send email notification with summary (created count, total gross amount)
```

### Example 2: Import from SharePoint

```
Trigger: When a file is created (SharePoint → /Self-Billing/Import/)
  ↓
Action: Get file content (SharePoint)
  ↓
Action: DVLP-KSeF → ImportSelfBillingFile
  Query: settingId = "<UUID>"
  Body: file content from SharePoint
  ↓
Condition: invalid count = 0
  ↓ Yes
Action: DVLP-KSeF → ConfirmSelfBillingImport
  Body: { importId: @{body('ImportSelfBillingFile')?['importId']} }
  ↓ No
Action: Send Teams message to finance team with validation errors
```

### Example 3: Seller Approval Notification

```
Trigger: When a self-billing invoice status changes
  ↓
Condition: status = "PendingSeller"
  ↓ Yes
Action: Send approval email to supplier contact
  Include: invoice number, gross amount, due date, approve/reject links
```

---

## 8. Copilot Studio Agent

Recommended operations for Copilot Studio integration:

| Operation | Use Case |
|---|---|
| `ListSuppliers` | "Show me suppliers with self-billing agreements" |
| `GetSupplierStats` | "What are the stats for supplier X?" |
| `ListSelfBillingInvoices` | "List pending self-billing invoices" |
| `GenerateSelfBillingInvoices` | "Generate invoices for January 2026" |
| `ListSbAgreements` | "Show active agreements" |
| `CreateSupplierFromVat` | "Add supplier with NIP 5260250995" |

Configure these as **Actions** in Copilot Studio with descriptive trigger phrases.
