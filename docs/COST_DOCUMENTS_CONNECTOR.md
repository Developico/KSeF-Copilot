# Cost Documents — Custom Connector Operations

> **Version:** 1.0  
> **Date:** 2026-04-14  
> **Module:** Cost Documents (Dokumenty kosztowe)

This document describes the 10 Power Platform Custom Connector operations for the Cost Documents module. All operations require OAuth 2.0 authentication via Entra ID and respect RBAC roles (Admin / Reader).

---

## Table of Contents

- [1. Cost Documents — CRUD](#1-cost-documents--crud)
- [2. Cost Documents — AI & Batch Operations](#2-cost-documents--ai--batch-operations)
- [3. Cost Documents — Summary](#3-cost-documents--summary)
- [4. Power Automate Examples](#4-power-automate-examples)

---

## 1. Cost Documents — CRUD

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 1 | `ListCostDocuments` | GET | `/cost-documents` | Reader | List cost documents with filtering, sorting and pagination. |
| 2 | `CreateCostDocument` | POST | `/cost-documents` | Admin | Create a new cost document. |
| 3 | `GetCostDocument` | GET | `/cost-documents/{id}` | Reader | Get cost document details by ID. |
| 4 | `UpdateCostDocument` | PATCH | `/cost-documents/{id}` | Admin | Partially update a cost document. |
| 5 | `DeleteCostDocument` | DELETE | `/cost-documents/{id}` | Admin | Delete a cost document. |

### Key Query Parameters (ListCostDocuments)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `settingId` | string (UUID) | No | Company setting ID |
| `documentType` | string | No | `Receipt`, `Acknowledgment`, `ProForma`, `DebitNote`, `Bill`, `ContractInvoice`, `Other` |
| `paymentStatus` | string | No | `pending`, `paid` |
| `approvalStatus` | string | No | `Draft`, `Pending`, `Approved`, `Rejected`, `Cancelled` |
| `status` | string | No | `Draft`, `Active`, `Cancelled` |
| `source` | string | No | `Manual`, `OCR`, `Import` |
| `mpkCenterId` | string (UUID) | No | MPK center ID |
| `category` | string | No | Category filter |
| `fromDate` / `toDate` | string (date) | No | Document date range |
| `dueDateFrom` / `dueDateTo` | string (date) | No | Due date range |
| `minAmount` / `maxAmount` | number | No | Gross amount range |
| `issuerName` | string | No | Issuer name search (contains) |
| `issuerNip` | string | No | Issuer NIP (exact) |
| `search` | string | No | Full-text search (number, issuer name, NIP) |
| `top` / `skip` | integer | No | Pagination |
| `orderBy` | string | No | `documentDate`, `grossAmount`, `issuerName`, `dueDate` |
| `orderDirection` | string | No | `asc`, `desc` |

### Document Types

| Value | PL | EN |
|---|---|---|
| `Receipt` | Paragon | Receipt |
| `Acknowledgment` | Pokwitowanie | Acknowledgment |
| `ProForma` | Pro forma | Pro Forma |
| `DebitNote` | Nota księgowa | Debit Note |
| `Bill` | Rachunek | Bill |
| `ContractInvoice` | Umowa zlecenie/o dzieło | Contract Invoice |
| `Other` | Inne | Other |

---

## 2. Cost Documents — AI & Batch Operations

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 6 | `AiCategorizeCostDocument` | POST | `/cost-documents/ai-categorize` | Admin | AI categorization — suggests MPK and category via Azure OpenAI. |
| 7 | `BatchApproveCostDocuments` | POST | `/cost-documents/batch/approve` | Admin | Batch approve cost documents (up to 100). |
| 8 | `BatchRejectCostDocuments` | POST | `/cost-documents/batch/reject` | Admin | Batch reject cost documents. |
| 9 | `BatchMarkPaidCostDocuments` | POST | `/cost-documents/batch/mark-paid` | Admin | Batch mark cost documents as paid. |

### AI Categorization Request Body

```json
{
  "costDocumentId": "uuid",
  "issuerName": "optional override",
  "issuerNip": "optional override",
  "description": "optional override",
  "grossAmount": 123.45
}
```

### AI Categorization Response

```json
{
  "message": "Cost document categorized successfully",
  "categorization": {
    "mpk": "IT-001",
    "mpkCenterId": "uuid",
    "category": "IT Services",
    "description": "Cloud hosting services",
    "confidence": 0.92
  }
}
```

### Batch Request Body (approve / reject / mark-paid)

```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### Batch Response

```json
{
  "success": 3,
  "failed": 0,
  "errors": []
}
```

---

## 3. Cost Documents — Summary

| # | operationId | Method | Route | Role | Description |
|---|---|---|---|---|---|
| 10 | `GetCostDocumentsSummary` | GET | `/cost-documents/summary` | Reader | Dashboard summary — counts and amounts by type and status. |

### Key Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `settingId` | string (UUID) | Yes | Company setting ID |

---

## 4. Power Automate Examples

### Example 1: Auto-Categorize New Cost Documents

```
Trigger: When a row is added (dvlp_ksefcostdocument)
Action 1: AiCategorizeCostDocument (costDocumentId = triggerOutputs()?['body/dvlp_ksefcostdocumentid'])
Action 2: UpdateCostDocument (id, body: { mpkCenterId, category })
```

### Example 2: Weekly Batch Approval

```
Trigger: Recurrence (weekly)
Action 1: ListCostDocuments (approvalStatus = 'Pending', top = 100)
Action 2: Apply to each → collect IDs
Action 3: BatchApproveCostDocuments (ids)
Action 4: Send email notification with batch result
```

### Example 3: Budget Alert on Cost Document Creation

```
Trigger: When a row is added (dvlp_ksefcostdocument)
Action 1: GetCostDocumentsSummary (settingId)
Action 2: Condition: if totalGrossAmount > budgetThreshold
Action 3: Send Teams notification to finance team
```
