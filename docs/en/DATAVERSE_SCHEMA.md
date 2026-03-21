# Dataverse Schema

> **Polish version:** [DATAVERSE_SCHEMAT.md](../pl/DATAVERSE_SCHEMAT.md) | **English version:** [DATAVERSE_SCHEMA.md](./DATAVERSE_SCHEMA.md)

## Table of Contents
- [Overview](#overview)
- [Publisher](#publisher)
- [Solution](#solution)
- [Tables](#tables)
  - [dvlp_ksefsetting](#dvlp_ksefsetting)
  - [dvlp_ksefsession](#dvlp_ksefsession)
  - [dvlp_ksefsynclog](#dvlp_ksefsynclog)
  - [dvlp_ksefinvoice](#dvlp_ksefinvoice)
  - [dvlp_aifeedback](#dvlp_aifeedback)
  - [dvlp_ksefmpkcenter](#dvlp_ksefmpkcenter)
  - [dvlp_ksefmpkapprover](#dvlp_ksefmpkapprover)
  - [dvlp_ksefnotification](#dvlp_ksefnotification)
  - [dvlp_ksefsupplier](#dvlp_ksefsupplier)
  - [dvlp_ksefsbagrement](#dvlp_ksefsbagrement)
  - [dvlp_ksefselfbillingtemplate](#dvlp_ksefselfbillingtemplate)
  - [dvlp_ksefselfbillinginvoice](#dvlp_ksefselfbillinginvoice)
  - [dvlp_ksefselfbillinglineitem](#dvlp_ksefselfbillinglineitem)
- [Option Sets (Choices)](#option-sets-choices)
- [Relationships](#relationships)
- [Security Roles](#security-roles)
- [Indexes and Performance](#indexes-and-performance)
- [Data Migration](#data-migration)
- [AI Fields Deployment](#ai-fields-deployment)
- [Code Changes After AI Deployment](#code-changes-after-ai-deployment)
- [Table Creation Order](#table-creation-order)
- [Changelog](#changelog)

---

## Overview

This document describes the complete Dataverse schema for the dvlp-ksef solution — tables, attributes, relationships, option sets, security roles, and indexes.

### Design Principles

1. **Dedicated tables** — a separate `dvlp_ksefinvoice` table instead of extending standard Invoice
2. **Simplicity** — ~22 columns per table instead of 50+
3. **Decimal instead of Currency** — simpler for single-currency scenarios (PLN)
4. **MPK and Category as OptionSets** — consistency, easy filtering, localized labels (legacy; new MPK centers use dedicated `dvlp_ksefmpkcenter` table)
5. **AI fields read-only** — AI suggestions are locked, users can only accept/modify/reject

### Entity-Relationship Summary

```
dvlp_ksefsetting (1) ──┬──► (N) dvlp_ksefsession
                        ├──► (N) dvlp_ksefsynclog
                        ├──► (N) dvlp_ksefinvoice ──┬──► (N) dvlp_aifeedback
                        │                           └──► (N) dvlp_ksefnotification
                        ├──► (N) dvlp_ksefmpkcenter (1) ──┬──► (N) dvlp_ksefmpkapprover
                        │                                 ├──► (N) dvlp_ksefinvoice
                        │                                 └──► (N) dvlp_ksefnotification
                        ├──► (N) dvlp_ksefsupplier (1) ──┬──► (N) dvlp_ksefsbagrement (1) ──► (N) dvlp_ksefinvoice
                        │                                ├──► (N) dvlp_ksefselfbillingtemplate
                        │                                └──► (N) dvlp_ksefinvoice
                        ├──► (N) dvlp_ksefsbagrement
                        └──► (N) dvlp_ksefselfbillingtemplate
```

---

## Publisher

| Property | Value |
|----------|-------|
| Display Name | Developico |
| Name | dvlp |
| Prefix | dvlp |
| Option Value Prefix | 44660 |

---

## Solution

| Property | Value |
|----------|-------|
| Display Name | Developico KSeF |
| Unique Name | DevelopicoKSeF |
| Version | 1.0.0.9 |
| Publisher | dvlp (Developico) |
| Type | Unmanaged (development) / Managed (production) |

---

## Tables

### dvlp_ksefsetting

**Display Name:** KSeF Settings / Ustawienia KSeF  
**Logical Name:** `dvlp_ksefsetting`  
**Collection Name:** `dvlp_ksefsettings`  
**Ownership Type:** Organization  
**Description:** Configuration per company (NIP) — KSeF environment, tokens, access settings

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefsettingid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(100) | ✅ | Setting name (Primary Name), e.g. "Company ABC" |
| `dvlp_nip` | NIP | String(10) | ✅ | Company tax identification number (unique) |
| `dvlp_environment` | Environment | OptionSet | ✅ | KSeF environment: test/demo/production |
| `dvlp_isactive` | Active | Boolean | ✅ | Whether the setting is active |
| `dvlp_tokenkeyvaultref` | Token Key Vault Ref | String(200) | ❌ | Key Vault secret name for the KSeF token |
| `dvlp_description` | Description | Memo | ❌ | Additional notes |
| `dvlp_lastsyncdate` | Last Sync Date | DateTime | ❌ | Last successful synchronization |
| `dvlp_autosyncenabled` | Auto Sync | Boolean | ❌ | Automatic synchronization enabled |

#### Alternate Keys

| Name | Attributes | Description |
|------|-----------|-------------|
| `dvlp_nip_key` | `dvlp_nip` | NIP uniqueness |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| 1:N | dvlp_ksefsession | `dvlp_ksefsetting_sessions` |
| 1:N | dvlp_ksefsynclog | `dvlp_ksefsetting_synclogs` |
| 1:N | dvlp_ksefinvoice | `dvlp_ksefsetting_invoices` |

---

### dvlp_ksefsession

**Display Name:** KSeF Session / Sesja KSeF  
**Logical Name:** `dvlp_ksefsession`  
**Collection Name:** `dvlp_ksefsessions`  
**Ownership Type:** Organization  
**Description:** Communication sessions with the KSeF API

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefsessionid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_sessionreference` | Session Reference | String(100) | ✅ | Session ID from KSeF (Primary Name) |
| `dvlp_ksefsettingid` | KSeF Setting | Lookup | ✅ | Link to configuration |
| `dvlp_nip` | NIP | String(10) | ✅ | Company NIP (denormalized) |
| `dvlp_sessiontoken` | Session Token | String(500) | ❌ | Encrypted token |
| `dvlp_sessiontype` | Session Type | OptionSet | ✅ | interactive/batch |
| `dvlp_startedat` | Started At | DateTime | ✅ | Session start time |
| `dvlp_expiresat` | Expires At | DateTime | ❌ | Expiration time |
| `dvlp_terminatedat` | Terminated At | DateTime | ❌ | Termination time |
| `dvlp_status` | Status | OptionSet | ✅ | active/expired/terminated/error |
| `dvlp_invoicesprocessed` | Invoices Processed | Integer | ❌ | Invoice counter |
| `dvlp_errormessage` | Error Message | String(2000) | ❌ | Error description (if any) |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sessions` |

---

### dvlp_ksefsynclog

**Display Name:** KSeF Sync Log / Log synchronizacji KSeF  
**Logical Name:** `dvlp_ksefsynclog`  
**Collection Name:** `dvlp_ksefsynclog`  
**Ownership Type:** Organization  
**Description:** History of synchronization operations with KSeF

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefsynclogid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(100) | Auto | Auto: "{NIP}-{timestamp}" |
| `dvlp_ksefsettingid` | KSeF Setting | Lookup | ✅ | Link to configuration |
| `dvlp_ksefsessionid` | KSeF Session | Lookup | ❌ | Link to session |
| `dvlp_operationtype` | Operation Type | OptionSet | ✅ | sync_incoming/sync_outgoing/send/status_check |
| `dvlp_startedat` | Started At | DateTime | ✅ | Start time |
| `dvlp_completedat` | Completed At | DateTime | ❌ | Completion time |
| `dvlp_status` | Status | OptionSet | ✅ | in_progress/success/partial/error |
| `dvlp_invoicesprocessed` | Processed | Integer | ❌ | Number of processed invoices |
| `dvlp_invoicesfailed` | Failed | Integer | ❌ | Number of failed invoices |
| `dvlp_errormessage` | Error Message | Memo | ❌ | Error details |
| `dvlp_requestpayload` | Request | Memo | ❌ | Request payload (debug) |
| `dvlp_responsepayload` | Response | Memo | ❌ | Response payload (debug) |

---

### dvlp_ksefinvoice

**Display Name:** KSeF Invoice / Faktura KSeF  
**Logical Name:** `dvlp_ksefinvoice`  
**Collection Name:** `dvlp_ksefinvoices`  
**Ownership Type:** Organization  
**Description:** Cost invoices downloaded from the Polish National e-Invoice System (KSeF)

#### Table Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Track changes | ✅ | Change tracking for synchronization |
| Enable auditing | ✅ | Audit trail |
| Enable for mobile | ❌ | Desktop/web only |
| Enable activities | ❌ | No activities |
| Enable notes | ✅ | Notes/attachments |
| Enable connections | ❌ | No connections |
| Enable queues | ❌ | No queues |
| Enable duplicate detection | ✅ | Duplicate detection |
| Enable for offline | ❌ | No offline mode |
| Enable quick create | ✅ | Quick create form |
| Primary image | ❌ | No image |
| Color | #2E7D32 | Green (invoices) |
| Icon | 📄 | Document icon |

#### Attributes — Primary Key and Name

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefinvoiceid` | ID | Uniqueidentifier | Auto | Primary key (GUID) |
| `dvlp_name` | Invoice Number | String(100) | ✅ | Primary Name — invoice number from the issuer |

#### Attributes — Basic Invoice Data

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_invoicedate` | Invoice Date | Date | ✅ | Date the invoice was issued |
| `dvlp_saledate` | Sale Date | Date | ❌ | Date of sale / service delivery |
| `dvlp_duedate` | Due Date | Date | ❌ | Payment due date |
| `dvlp_invoicetype` | Invoice Type | OptionSet | ✅ | Document type (VAT, corrective, advance) |
| `dvlp_description` | Description | String(500) | ❌ | Additional description/comment |

#### Attributes — Seller Data

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_sellernip` | Seller NIP | String(10) | ✅ | Seller's tax ID |
| `dvlp_sellername` | Seller Name | String(500) | ✅ | Full seller name/company |

#### Attributes — Buyer Data

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_buyernip` | Buyer NIP | String(10) | ✅ | Buyer's tax ID (our NIP) |

#### Attributes — Amounts

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_netamount` | Net Amount | Decimal(12,2) | ✅ | Total net value |
| `dvlp_vatamount` | VAT Amount | Decimal(12,2) | ✅ | Total VAT amount |
| `dvlp_grossamount` | Gross Amount | Decimal(12,2) | ✅ | Total gross value |
| `dvlp_currency` | Currency | OptionSet | ✅ | Invoice currency (PLN by default) |

#### Attributes — Payment Status

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_paymentstatus` | Payment Status | OptionSet | ✅ | pending/paid/overdue |
| `dvlp_paidat` | Paid At | DateTime | ❌ | When payment was made |

#### Attributes — Categorization

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_category` | Category | String(100) | ❌ | Cost category (text) |
| `dvlp_costcenter` | Cost Center (MPK) | OptionSet (dvlp_costcenter) | ❌ | Cost Center (legacy OptionSet) |
| `dvlp_mpkcenterid` | MPK Center | Lookup (dvlp_ksefmpkcenter) | ❌ | Cost center entity (replaces OptionSet) |

#### Attributes — Approval Workflow

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_approvalstatus` | Approval Status | OptionSet (dvlp_approvalstatus) | ❌ | draft/pending/approved/rejected/cancelled |
| `dvlp_approvedby` | Approved By | String(200) | ❌ | Display name of approver |
| `dvlp_approvedbyoid` | Approved By OID | String(50) | ❌ | Azure AD Object ID of approver |
| `dvlp_approvedat` | Approved At | DateTime | ❌ | When the approval decision was made |
| `dvlp_approvalcomment` | Approval Comment | String(500) | ❌ | Comment from approver |

#### Attributes — Self-Billing

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_isselfbilling` | Is Self-Billing | Boolean | ❌ | True when the invoice was created via self-billing |
| `dvlp_selfbillingstatus` | SB Status | OptionSet (dvlp_selfbillingstatus) | ❌ | Self-billing approval workflow status |
| `dvlp_sellerrejectionreason` | Seller Rejection Reason | String(1000) | ❌ | Reason provided by seller when rejecting a SB invoice |
| `dvlp_selfbillingsentdate` | SB Sent Date | DateTime | ❌ | When the self-billing invoice was sent to KSeF |
| `dvlp_supplierid` | Supplier | Lookup (dvlp_ksefsupplier) | ❌ | Supplier registry link for self-billing invoices |
| `dvlp_sbagreementid` | SB Agreement | Lookup (dvlp_ksefsbagrement) | ❌ | Agreement under which this SB invoice was created |

#### Attributes — AI Categorization

| # | Logical Name | Display Name (EN) | Display Name (PL) | Type | Required | Description |
|---|-------------|-------------------|-------------------|------|----------|-------------|
| 1 | `dvlp_aimpksuggestion` | AI MPK Suggestion | Sugestia MPK (AI) | OptionSet (dvlp_costcenter) | ❌ | MPK suggested by AI |
| 2 | `dvlp_aicategorysuggestion` | AI Category Suggestion | Sugestia kategorii (AI) | String(100) | ❌ | Category suggested by AI |
| 3 | `dvlp_aidescription` | AI Description | Opis (AI) | String(500) | ❌ | Short invoice description generated by AI |
| 4 | `dvlp_airationale` | AI Rationale | Uzasadnienie (AI) | String(500) | ❌ | AI categorization reasoning |
| 5 | `dvlp_aiconfidence` | AI Confidence | Pewność AI | Decimal(3,2) | ❌ | AI confidence level (0.00–1.00) |
| 6 | `dvlp_aiprocessedat` | AI Processed At | Przetworzono przez AI | DateTime | ❌ | Timestamp when AI processed the invoice |

##### AI Field Configuration in Dataverse

**1. dvlp_aimpksuggestion**

```yaml
Display Name: AI MPK Suggestion / Sugestia MPK (AI)
Schema Name: dvlp_aimpksuggestion
Data Type: Choice (OptionSet)
Option Set: dvlp_costcenter (use existing or create new)
Required: No
Searchable: Yes
Description: MPK suggested by AI categorization. User can accept or override.
Audit: Yes
```

**2. dvlp_aicategorysuggestion**

```yaml
Display Name: AI Category Suggestion / Sugestia kategorii (AI)
Schema Name: dvlp_aicategorysuggestion
Data Type: Single Line of Text
Format: Text
Max Length: 100
Required: No
Searchable: Yes
Description: Cost category suggested by AI. Examples: "Software licenses", "Hosting services"
Audit: Yes
```

**3. dvlp_aidescription**

```yaml
Display Name: AI Description / Opis (AI)
Schema Name: dvlp_aidescription
Data Type: Single Line of Text
Format: Text Area
Max Length: 500
Required: No
Searchable: No
Description: Short description of the invoice generated by AI for easier identification.
Audit: No
```

**4. dvlp_airationale**

```yaml
Display Name: AI Rationale / Uzasadnienie (AI)
Schema Name: dvlp_airationale
Data Type: Single Line of Text
Format: Text Area
Max Length: 500
Required: No
Searchable: No
Description: AI reasoning for the categorization decision.
Audit: No
```

**5. dvlp_aiconfidence**

```yaml
Display Name: AI Confidence / Pewność AI
Schema Name: dvlp_aiconfidence
Data Type: Decimal Number
Precision: 2
Minimum Value: 0
Maximum Value: 1
Required: No
Searchable: No
Description: AI model confidence score (0.00 = uncertain, 1.00 = very confident)
Audit: No
```

**6. dvlp_aiprocessedat**

```yaml
Display Name: AI Processed At / Przetworzono przez AI
Schema Name: dvlp_aiprocessedat
Data Type: Date and Time
Format: Date and Time
Behavior: User Local
Required: No
Searchable: No
Description: Timestamp when AI categorization was performed on this invoice.
Audit: No
```

#### Attributes — KSeF Metadata

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefreferencenumber` | KSeF Reference Number | String(50) | ❌ | Unique identifier from KSeF |
| `dvlp_ksefstatus` | KSeF Status | OptionSet | ❌ | KSeF synchronization status |
| `dvlp_ksefdirection` | Direction | OptionSet | ✅ | incoming / outgoing |
| `dvlp_ksefdownloadedat` | Downloaded from KSeF | DateTime | ❌ | When downloaded from KSeF |
| `dvlp_ksefrawxml` | Invoice XML | Memo | ❌ | Raw XML in FA(2) format |

#### Attributes — Relationships

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefsettingid` | KSeF Setting | Lookup | ✅ | Company configuration (per NIP) |
| `dvlp_parentinvoiceid` | Parent Invoice | Lookup | ❌ | For corrections — original invoice |
| `statecode` | Status | State | Auto | Active/Inactive |
| `statuscode` | Status Reason | Status | Auto | Status reason |

#### Alternate Keys

| Name | Attributes | Description |
|------|-----------|-------------|
| `dvlp_ksefref_key` | `dvlp_ksefreferencenumber` | KSeF reference number uniqueness |
| `dvlp_invoice_composite_key` | `dvlp_sellernip`, `dvlp_name`, `dvlp_invoicedate` | Invoice uniqueness (NIP + number + date) |

#### Views

| Name | Type | Filter | Default Columns |
|------|------|--------|-----------------|
| All Invoices | Public | — | Number, Date, Seller, Gross, Payment Status |
| Active Invoices | Public | `statecode = 0` | Number, Date, Seller, Gross, Status |
| Pending Payment | Public | `dvlp_paymentstatus = pending` | Number, Date, Seller, Gross, Due Date |
| Paid | Public | `dvlp_paymentstatus = paid` | Number, Date, Seller, Gross, Paid Date |
| Overdue | Public | `dvlp_paymentstatus = overdue` | Number, Date, Seller, Gross, Due Date |
| Incoming Invoices | Public | `dvlp_ksefdirection = incoming` | Number, Date, Seller, Gross |
| KSeF Errors | Public | `dvlp_ksefstatus = error` | Number, Date, Seller, KSeF Status |
| Quick Find | QuickFind | — | Number, Seller, NIP |
| Invoices for AI Categorization | Public | `dvlp_aiprocessedat = null AND dvlp_category = null` | Number, Seller, Gross, Date |
| AI Categorized | Public | `dvlp_aiprocessedat != null` | Number, Seller, AI MPK Suggestion, AI Confidence |
| Low AI Confidence | Public | `dvlp_aiconfidence < 0.7` | Number, Seller, Suggestion, Confidence |

#### Forms

| Name | Type | Description |
|------|------|-------------|
| KSeF Invoice | Main | Main edit form |
| Invoice — Quick Create | Quick Create | Quick create form |
| Invoice — Card | Card | Card view |

**Main form structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│ [Invoice Number] [Payment Status] [KSeF Status]                 │
├─────────────────────────────────────────────────────────────────┤
│ TAB: General                                                     │
│ ┌─────────────────────────┬─────────────────────────┐           │
│ │ SECTION: Invoice Data    │ SECTION: Seller          │           │
│ │ - Invoice Number         │ - Seller NIP            │           │
│ │ - Invoice Date           │ - Seller Name           │           │
│ │ - Sale Date              │                         │           │
│ │ - Due Date               │                         │           │
│ │ - Invoice Type           │                         │           │
│ └─────────────────────────┴─────────────────────────┘           │
│ ┌─────────────────────────┬─────────────────────────┐           │
│ │ SECTION: Amounts         │ SECTION: Payment         │           │
│ │ - Net Amount             │ - Payment Status        │           │
│ │ - VAT Amount             │ - Paid Date             │           │
│ │ - Gross Amount           │                         │           │
│ │ - Currency               │                         │           │
│ └─────────────────────────┴─────────────────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│ TAB: Categorization                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SECTION: Manual Categorization                              │ │
│ │ ┌─────────────────────┬─────────────────────┐               │ │
│ │ │ Category            │ Cost Center (MPK)   │               │ │
│ │ │ [dvlp_category]     │ [dvlp_costcenter]   │               │ │
│ │ └─────────────────────┴─────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SECTION: AI Suggestions                      [Read-only]    │ │
│ │ ┌─────────────────────┬─────────────────────┐               │ │
│ │ │ Category Suggestion │ MPK Suggestion      │               │ │
│ │ │ [dvlp_aicategory..] │ [dvlp_aimpksugge..] │               │ │
│ │ ├─────────────────────┴─────────────────────┤               │ │
│ │ │ AI Description                            │               │ │
│ │ │ [dvlp_aidescription]                      │               │ │
│ │ ├─────────────────────┬─────────────────────┤               │ │
│ │ │ AI Confidence       │ Processed At        │               │ │
│ │ │ [dvlp_aiconfidence] │ [dvlp_aiprocessed..]│               │ │
│ │ └─────────────────────┴─────────────────────┘               │ │
│ │                                                              │ │
│ │ [🤖 Run AI Categorization] [✓ Accept Suggestion]            │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ TAB: KSeF                                                        │
│ - KSeF Reference Number                                          │
│ - KSeF Status                                                    │
│ - Direction                                                      │
│ - Downloaded from KSeF                                           │
│ - Invoice XML (read-only)                                        │
├─────────────────────────────────────────────────────────────────┤
│ TAB: Relationships                                               │
│ - Parent Invoice (for corrections)                               │
│ - KSeF Setting                                                   │
├─────────────────────────────────────────────────────────────────┤
│ FOOTER: Timeline/Notes                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Charts

| Name | Type | Description |
|------|------|-------------|
| Invoices by Payment Status | Pie Chart | Breakdown: pending/paid/overdue |
| Monthly Invoices | Bar Chart | Invoice count per month |
| Monthly Amounts | Line Chart | Gross total per month |
| Top 10 Suppliers | Horizontal Bar | Largest suppliers by amount |
| Invoices by Category | Pie Chart | Cost breakdown by category |

#### Business Rules

| Name | Condition | Action |
|------|-----------|--------|
| Lock XML editing | `dvlp_ksefrawxml != null` | Lock field `dvlp_ksefrawxml` |
| Auto-set paid date | `dvlp_paymentstatus = paid AND dvlp_paidat = null` | Set `dvlp_paidat = Now()` |
| Lock AI fields | Always | Lock: `dvlp_aimpksuggestion`, `dvlp_aicategorysuggestion`, `dvlp_aidescription`, `dvlp_airationale`, `dvlp_aiconfidence`, `dvlp_aiprocessedat` |
| Show AI confidence as % | `dvlp_aiconfidence != null` | Format as percentage in UI |

#### Indexes

| Name | Attributes | Type | Justification |
|------|-----------|------|---------------|
| `PK_ksefinvoice` | `dvlp_ksefinvoiceid` | Primary | Primary key |
| `AK_ksefref` | `dvlp_ksefreferencenumber` | Unique | KSeF reference lookup |
| `AK_composite` | `dvlp_sellernip`, `dvlp_name`, `dvlp_invoicedate` | Unique | Deduplication |
| `IX_paymentstatus` | `dvlp_paymentstatus`, `dvlp_duedate` | Non-unique | Payment filtering |
| `IX_sellernip` | `dvlp_sellernip` | Non-unique | Supplier search |
| `IX_invoicedate` | `dvlp_invoicedate` | Non-unique | Date sorting/filtering |
| `IX_ksefsetting` | `dvlp_ksefsettingid` | Non-unique | Configuration relationship |

---

### dvlp_aifeedback

**Display Name:** AI Feedback / Feedback AI  
**Logical Name:** `dvlp_aifeedback`  
**Collection Name:** `dvlp_aifeedbacks`  
**Ownership Type:** Organization  
**Description:** History of user corrections to AI suggestions — used for model learning

#### Purpose

This table stores information about how users respond to AI suggestions:
- **applied** — user accepted the AI suggestion without changes
- **modified** — user changed the AI suggestion to a different value
- **rejected** — user rejected the suggestion and set their own value

This data is used to build context in AI prompts (few-shot learning).

#### How Learning Works

1. User clicks "Categorize with AI" → AI generates a suggestion
2. User accepts or modifies the suggestion
3. On invoice save, the system creates a record in `dvlp_aifeedback`
4. On the next categorization of the same supplier:
   - System retrieves history from `dvlp_aifeedback`
   - Adds to prompt: "For supplier X, users typically choose MPK=Y, Category=Z"
   - AI takes this into account during categorization

#### Attributes — Main

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_aifeedbackid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(100) | Auto | Auto: "{SupplierName} - {Date}" |
| `dvlp_invoiceid` | Invoice | Lookup (dvlp_ksefinvoice) | ✅ | Link to source invoice |
| `dvlp_tenantnip` | Company NIP | String(10) | ✅ | Company (tenant) NIP |
| `dvlp_suppliernip` | Supplier NIP | String(15) | ✅ | Supplier NIP |
| `dvlp_suppliername` | Supplier Name | String(250) | ✅ | Supplier name |
| `dvlp_invoicedescription` | Invoice Context | Memo(500) | ❌ | Fragment of invoice description/line items |

#### Attributes — AI Suggestions

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_aimpksuggestion` | AI MPK Suggestion | String(50) | ❌ | MPK suggested by AI |
| `dvlp_aicategorysuggestion` | AI Category Suggestion | String(100) | ❌ | Category suggested by AI |
| `dvlp_aiconfidence` | AI Confidence | Decimal(3,2) | ❌ | AI confidence level (0.00–1.00) |

#### Attributes — User Choices

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_usermpk` | Chosen MPK | String(50) | ❌ | MPK chosen by user |
| `dvlp_usercategory` | Chosen Category | String(100) | ❌ | Category chosen by user |
| `dvlp_feedbacktype` | Feedback Type | OptionSet | ✅ | applied/modified/rejected |

#### Attributes — System

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `createdby` | Created By | Lookup (User) | Auto | User who saved the feedback |
| `statecode` | Status | State | Auto | Active/Inactive |
| `statuscode` | Status Reason | Status | Auto | Status reason |

#### Option Set — dvlp_feedbacktype

**Display Name:** AI Feedback Type  
**Type:** Local OptionSet (or Global)

| Value | Label (EN) | Label (PL) | Color | Description |
|-------|-----------|-----------|-------|-------------|
| 100000000 | Applied | Zaakceptowano | Green | User accepted AI suggestion |
| 100000001 | Modified | Zmieniono | Orange | User changed AI suggestion |
| 100000002 | Rejected | Odrzucono | Red | User rejected AI suggestion |

#### Indexes

| Name | Attributes | Type | Justification |
|------|-----------|------|---------------|
| `PK_aifeedback` | `dvlp_aifeedbackid` | Primary | Primary key |
| `IX_tenant_supplier` | `dvlp_tenantnip`, `dvlp_suppliernip` | Non-unique | Per-supplier aggregation |
| `IX_createdon` | `createdon` | Non-unique | Chronological sorting |
| `IX_feedbacktype` | `dvlp_feedbacktype` | Non-unique | Feedback type filtering |

#### Views

| Name | Type | Filter | Default Columns |
|------|------|--------|-----------------|
| All Feedback | Public | — | Supplier, AI Suggestion, User Choice, Type, Date |
| Applied | Public | `feedbacktype = applied` | Supplier, MPK, Category |
| Modified | Public | `feedbacktype = modified` | Supplier, AI Suggestion, User Choice |
| Per Supplier | Public | GROUP BY suppliernip | Supplier, Count, Avg Confidence |

#### Security

- **Read**: All KSeF users
- **Create**: System (via API) on invoice save
- **Update**: None (records are immutable)
- **Delete**: Admin only

---

### dvlp_ksefmpkcenter

**Display Name:** KSeF MPK Center / Centrum kosztów MPK  
**Logical Name:** `dvlp_ksefmpkcenter`  
**Collection Name:** `dvlp_ksefmpkcenters`  
**Ownership Type:** Organization  
**Description:** Cost centers (MPK) as dedicated entities with budget and approval configuration

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefmpkcenterid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(100) | ✅ | MPK center name (Primary Name), e.g. "IT & Software" |
| `dvlp_description` | Description | Memo | ❌ | Additional description |
| `dvlp_settingid` | KSeF Setting | Lookup (dvlp_ksefsetting) | ✅ | Company/tenant configuration |
| `dvlp_isactive` | Active | Boolean | ✅ | Whether the center is active |
| `dvlp_approvalrequired` | Approval Required | Boolean | ✅ | Whether invoices assigned to this MPK require approval |
| `dvlp_approvalslahours` | Approval SLA (hours) | Integer | ❌ | Maximum hours allowed for approval before SLA alert |
| `dvlp_approvaleffectivefrom` | Approval Effective From | DateOnly | ❌ | If set, only invoices issued on or after this date require approval. Invoices before this date are treated as "not required". Null means all invoices require approval |
| `dvlp_budgetamount` | Budget Amount | Decimal(12,2) | ❌ | Budget limit amount |
| `dvlp_budgetperiod` | Budget Period | OptionSet (dvlp_budgetperiod) | ❌ | Budget period type: monthly/quarterly/half-yearly/annual |
| `dvlp_budgetstartdate` | Budget Start Date | Date | ❌ | Budget period start date |
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `modifiedon` | Modified On | DateTime | Auto | Last modification date |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_mpkcenters` |
| 1:N | dvlp_ksefmpkapprover | `dvlp_mpkcenter_approvers` |
| 1:N | dvlp_ksefinvoice | `dvlp_mpkcenter_invoices` |
| 1:N | dvlp_ksefnotification | `dvlp_mpkcenter_notifications` |

---

### dvlp_ksefmpkapprover

**Display Name:** KSeF MPK Approver / Zatwierdzający MPK  
**Logical Name:** `dvlp_ksefmpkapprover`  
**Collection Name:** `dvlp_ksefmpkapprovers`  
**Ownership Type:** Organization  
**Description:** Approvers assigned to specific cost centers — links system users to MPK centers

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefmpkapproverid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(100) | Auto | Auto: "{UserName} – {MPK Name}" |
| `dvlp_mpkcenterid` | MPK Center | Lookup (dvlp_ksefmpkcenter) | ✅ | Link to cost center |
| `dvlp_systemuserid` | System User | Lookup (systemuser) | ✅ | Dataverse system user assigned as approver |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefmpkcenter | `dvlp_mpkcenter_approvers` |
| N:1 | systemuser | `dvlp_systemuser_approvers` |

---

### dvlp_ksefnotification

**Display Name:** KSeF Notification / Powiadomienie KSeF  
**Logical Name:** `dvlp_ksefnotification`  
**Collection Name:** `dvlp_ksefnotifications`  
**Ownership Type:** Organization  
**Description:** In-app notifications for approval SLA alerts, budget warnings, and approval decisions

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefnotificationid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Title | String(200) | ✅ | Notification title (Primary Name) |
| `dvlp_recipientid` | Recipient | Lookup (systemuser) | ✅ | System user who receives the notification |
| `dvlp_settingid` | KSeF Setting | Lookup (dvlp_ksefsetting) | ✅ | Company/tenant configuration |
| `dvlp_type` | Notification Type | OptionSet (dvlp_notificationtype) | ✅ | Type of notification |
| `dvlp_message` | Message | String(1000) | ❌ | Detailed notification message |
| `dvlp_isread` | Is Read | Boolean | ✅ | Whether the user has read the notification |
| `dvlp_isdismissed` | Is Dismissed | Boolean | ✅ | Whether the user has dismissed the notification |
| `dvlp_invoiceid` | Invoice | Lookup (dvlp_ksefinvoice) | ❌ | Related invoice (if applicable) |
| `dvlp_mpkcenterid` | MPK Center | Lookup (dvlp_ksefmpkcenter) | ❌ | Related MPK center (if applicable) |
| `createdon` | Created On | DateTime | Auto | Record creation date |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | systemuser | `dvlp_recipient_notifications` |
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_notifications` |
| N:1 | dvlp_ksefinvoice | `dvlp_invoice_notifications` |
| N:1 | dvlp_ksefmpkcenter | `dvlp_mpkcenter_notifications` |

---

### dvlp_ksefsupplier

**Display Name:** KSeF Supplier / Dostawca KSeF  
**Logical Name:** `dvlp_ksefsupplier`  
**Collection Name:** `dvlp_ksefsuppliers`  
**Ownership Type:** Organization  
**Description:** Supplier registry for self-billing invoice management

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefsupplierid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(255) | ✅ | Full supplier name (Primary Name) |
| `dvlp_nip` | NIP | String(10) | ✅ | Supplier tax identification number |
| `dvlp_shortname` | Short Name | String(100) | ❌ | Short display name |
| `dvlp_regon` | REGON | String(14) | ❌ | REGON number |
| `dvlp_krs` | KRS | String(10) | ❌ | KRS number |
| `dvlp_street` | Street | String(250) | ❌ | Street address |
| `dvlp_city` | City | String(100) | ❌ | City |
| `dvlp_postalcode` | Postal Code | String(10) | ❌ | Postal code |
| `dvlp_country` | Country | String(100) | ❌ | Country |
| `dvlp_email` | Email | String(200) | ❌ | Contact email |
| `dvlp_phone` | Phone | String(20) | ❌ | Contact phone |
| `dvlp_bankaccount` | Bank Account | String(50) | ❌ | IBAN bank account number |
| `dvlp_vatstatus` | VAT Status | String(50) | ❌ | VAT payer status from MF API |
| `dvlp_vatstatusdate` | VAT Status Date | Date | ❌ | Date of last VAT status check |
| `dvlp_paymenttermsdays` | Payment Terms | Integer | ❌ | Default payment terms in days |
| `dvlp_defaultcategory` | Default Category | String(100) | ❌ | Default cost category |
| `dvlp_notes` | Notes | Memo(10000) | ❌ | Free-text notes |
| `dvlp_tags` | Tags | String(500) | ❌ | Comma-separated tags |
| `dvlp_hasselfbillingagreement` | Has SB Agreement | Boolean | ❌ | True when an active SB agreement exists |
| `dvlp_selfbillingagreementdate` | SB Agreement Date | Date | ❌ | Self-billing agreement date |
| `dvlp_selfbillingagreementexpiry` | SB Agreement Expiry | Date | ❌ | Self-billing agreement expiry date |
| `dvlp_firstinvoicedate` | First Invoice Date | Date | ❌ | Cached: earliest invoice date |
| `dvlp_lastinvoicedate` | Last Invoice Date | Date | ❌ | Cached: latest invoice date |
| `dvlp_totalinvoicecount` | Total Invoice Count | Integer | ❌ | Cached: total number of invoices |
| `dvlp_totalgrossamount` | Total Gross Amount | Decimal(12,2) | ❌ | Cached: total gross amount |
| `dvlp_status` | Status | OptionSet (dvlp_supplierstatus) | ✅ | Active/Inactive/Blocked |
| `dvlp_source` | Source | OptionSet (dvlp_suppliersource) | ❌ | How the supplier was added |
| `dvlp_settingid` | KSeF Setting | Lookup (dvlp_ksefsetting) | ✅ | Tenant isolation |
| `dvlp_defaultmpkid` | Default MPK | Lookup (dvlp_ksefmpkcenter) | ❌ | Default MPK Center |
| `dvlp_sbcontactuserid` | SB Contact User | Lookup (systemuser) | ❌ | System user responsible for approving self-billing invoices for this supplier |
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `modifiedon` | Modified On | DateTime | Auto | Record last modified date |

#### Alternate Keys

| Name | Attributes | Description |
|------|-----------|-------------|
| `dvlp_supplier_nip_setting` | `dvlp_nip`, `dvlp_settingid` | Unique supplier NIP per tenant |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_suppliers` |
| N:1 | dvlp_ksefmpkcenter | `dvlp_ksefmpkcenter_suppliers` |
| N:1 | systemuser | `dvlp_systemuser_supplier_sbcontact` |
| 1:N | dvlp_ksefsbagrement | `dvlp_ksefsupplier_sbagrements` |
| 1:N | dvlp_ksefselfbillingtemplate | `dvlp_ksefsupplier_sbtemplates` |
| 1:N | dvlp_ksefselfbillinginvoice | `dvlp_ksefsupplier_sbinvoices` |
| 1:N | dvlp_ksefinvoice | `dvlp_ksefsupplier_invoices` |

---

### dvlp_ksefsbagrement

**Display Name:** KSeF SB Agreement / Umowa samofakturowania KSeF  
**Logical Name:** `dvlp_ksefsbagrement`  
**Collection Name:** `dvlp_ksefsbagrements`  
**Ownership Type:** Organization  
**Description:** Self-billing agreements between buyer and supplier

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefsbagrement_id` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(255) | ✅ | Agreement name (Primary Name) |
| `dvlp_agreementdate` | Agreement Date | Date | ✅ | Date the agreement was signed |
| `dvlp_validfrom` | Valid From | Date | ✅ | Validity start date |
| `dvlp_validto` | Valid To | Date | ❌ | Validity end date (null = indefinite) |
| `dvlp_renewaldate` | Renewal Date | Date | ❌ | Next renewal date |
| `dvlp_approvalprocedure` | Approval Procedure | String(500) | ❌ | Description of the approval procedure |
| `dvlp_status` | Status | OptionSet (dvlp_sbagreementstatus) | ✅ | Active/Expired/Terminated |
| `dvlp_credentialreference` | Credential Reference | String(200) | ❌ | Authorization credential reference |
| `dvlp_notes` | Notes | Memo(10000) | ❌ | Notes about the agreement |
| `dvlp_hasdocument` | Has Document | Boolean | ❌ | True when agreement document uploaded |
| `dvlp_documentfilename` | Document Filename | String(255) | ❌ | Uploaded document filename |
| `dvlp_supplierid` | Supplier | Lookup (dvlp_ksefsupplier) | ✅ | Supplier this agreement belongs to |
| `dvlp_settingid` | KSeF Setting | Lookup (dvlp_ksefsetting) | ✅ | Tenant isolation |
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `modifiedon` | Modified On | DateTime | Auto | Record last modified date |

#### Alternate Keys

| Name | Attributes | Description |
|------|-----------|-------------|
| `dvlp_sbagrement_name_supplier` | `dvlp_name`, `dvlp_supplierid` | Unique agreement name per supplier |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefsupplier | `dvlp_ksefsupplier_sbagrements` |
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sbagrements` |
| 1:N | dvlp_ksefinvoice | `dvlp_ksefsbagrement_invoices` |

---

### dvlp_ksefselfbillingtemplate

**Display Name:** KSeF SB Template / Szablon samofakturowania KSeF  
**Logical Name:** `dvlp_ksefselfbillingtemplate`  
**Collection Name:** `dvlp_ksefselfbillingtemplates`  
**Ownership Type:** Organization  
**Description:** Templates for automatic self-billing invoice generation

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefselfbillingtemplateid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Name | String(255) | ✅ | Template name (Primary Name) |
| `dvlp_description` | Description | Memo(2000) | ❌ | Template description |
| `dvlp_itemdescription` | Item Description | String(500) | ✅ | Default line item description |
| `dvlp_quantity` | Quantity | Decimal(6,4) | ❌ | Default item quantity |
| `dvlp_unit` | Unit | String(20) | ❌ | Unit of measure |
| `dvlp_unitprice` | Unit Price | Decimal(9,2) | ❌ | Default unit price (net) |
| `dvlp_vatrate` | VAT Rate | String(10) | ❌ | VAT rate code (23, 8, 5, 0, zw, np) |
| `dvlp_currency` | Currency | String(3) | ❌ | ISO 4217 currency code |
| `dvlp_isactive` | Active | Boolean | ✅ | Whether the template is active |
| `dvlp_sortorder` | Sort Order | Integer | ❌ | Display position in template list |
| `dvlp_supplierid` | Supplier | Lookup (dvlp_ksefsupplier) | ✅ | Supplier this template belongs to |
| `dvlp_settingid` | KSeF Setting | Lookup (dvlp_ksefsetting) | ✅ | Tenant isolation |
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `modifiedon` | Modified On | DateTime | Auto | Record last modified date |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefsupplier | `dvlp_ksefsupplier_sbtemplates` |
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sbtemplates` |

---

### dvlp_ksefselfbillinginvoice

**Display Name:** KSeF Self-Billing Invoice / Samofaktura KSeF  
**Logical Name:** `dvlp_ksefselfbillinginvoice`  
**Collection Name:** `dvlp_ksefselfbillinginvoices`  
**Ownership Type:** User  
**Description:** Dedicated table for self-billing invoices (issued by the buyer)

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefselfbillinginvoiceid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Invoice Number | String(200) | ✅ | Invoice number (Primary Name) |
| `dvlp_invoicedate` | Invoice Date | Date | ✅ | Invoice issue date |
| `dvlp_duedate` | Due Date | Date | ❌ | Payment due date |
| `dvlp_netamount` | Net Amount | Decimal(9,2) | ❌ | Total net amount |
| `dvlp_vatamount` | VAT Amount | Decimal(9,2) | ❌ | Total VAT amount |
| `dvlp_grossamount` | Gross Amount | Decimal(9,2) | ❌ | Total gross amount |
| `dvlp_currency` | Currency | String(3) | ❌ | Currency code (default PLN) |
| `dvlp_status` | Status | OptionSet (dvlp_selfbillingstatus) | ✅ | Self-billing workflow status |
| `dvlp_sellerrejectionreason` | Rejection Reason | String(1000) | ❌ | Seller rejection reason |
| `dvlp_sentdate` | Sent Date | DateTime | ❌ | Date sent to KSeF |
| `dvlp_ksefreferencenumber` | KSeF Reference | String(100) | ❌ | Reference number assigned after KSeF submission |
| `dvlp_submittedbyuserid` | Submitted By | Lookup (systemuser) | ❌ | System user who submitted this invoice for seller review |
| `dvlp_submittedat` | Submitted At | DateTime | ❌ | Timestamp when the invoice was submitted for seller review |
| `dvlp_approvedbyuserid` | Approved/Rejected By | Lookup (systemuser) | ❌ | System user who approved or rejected this invoice |
| `dvlp_approvedat` | Approved/Rejected At | DateTime | ❌ | Timestamp when the invoice was approved or rejected |
| `dvlp_settingid` | KSeF Setting | Lookup (dvlp_ksefsetting) | ✅ | Tenant isolation |
| `dvlp_supplierid` | Supplier | Lookup (dvlp_ksefsupplier) | ✅ | Supplier (seller) |
| `dvlp_sbagreementid` | SB Agreement | Lookup (dvlp_ksefsbagrement) | ❌ | Self-billing agreement |
| `dvlp_kseFinvoiceid` | KSeF Invoice | Lookup (dvlp_ksefinvoice) | ❌ | Link to KSeF invoice record after submission |
| `dvlp_mpkcenterid` | MPK Center | Lookup (dvlp_ksefmpkcenter) | ❌ | Cost center for allocation |
| `statecode` | State | State | Auto | Active/Inactive |
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `modifiedon` | Modified On | DateTime | Auto | Record last modified date |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sbinvoices` |
| N:1 | dvlp_ksefsupplier | `dvlp_ksefsupplier_sbinvoices` |
| N:1 | dvlp_ksefsbagrement | `dvlp_ksefsbagrement_sbinvoices` |
| N:1 | dvlp_ksefinvoice | `dvlp_ksefinvoice_sbinvoices` |
| N:1 | dvlp_ksefmpkcenter | `dvlp_ksefmpkcenter_sbinvoices` |
| N:1 | systemuser | `dvlp_systemuser_sbinvoice_submittedby` |
| N:1 | systemuser | `dvlp_systemuser_sbinvoice_approvedby` |
| 1:N | dvlp_ksefselfbillinglineitem | `dvlp_ksefselfbillinginvoice_lineitems` |

---

### dvlp_ksefselfbillinglineitem

**Display Name:** KSeF SB Line Item / Pozycja samofaktury KSeF  
**Logical Name:** `dvlp_ksefselfbillinglineitem`  
**Collection Name:** `dvlp_ksefselfbillinglineitems`  
**Ownership Type:** Organization  
**Description:** Individual line items for self-billing invoices

#### Attributes

| Logical Name | Display Name | Type | Required | Description |
|-------------|-------------|------|----------|-------------|
| `dvlp_ksefselfbillinglineitemid` | ID | Uniqueidentifier | Auto | Primary key |
| `dvlp_name` | Description | String(500) | ✅ | Line item description (Primary Name) |
| `dvlp_quantity` | Quantity | Decimal(6,4) | ✅ | Item quantity |
| `dvlp_unit` | Unit | String(20) | ❌ | Unit of measure |
| `dvlp_unitprice` | Unit Price | Decimal(9,2) | ✅ | Unit price (net) |
| `dvlp_vatrate` | VAT Rate | String(10) | ❌ | VAT rate code (23, 8, 5, 0, zw, np) |
| `dvlp_netamount` | Net Amount | Decimal(9,2) | ❌ | Calculated net amount |
| `dvlp_vatamount` | VAT Amount | Decimal(9,2) | ❌ | Calculated VAT amount |
| `dvlp_grossamount` | Gross Amount | Decimal(9,2) | ❌ | Calculated gross amount |
| `dvlp_sortorder` | Sort Order | Integer | ❌ | Display position |
| `dvlp_sbinvoiceid` | SB Invoice | Lookup (dvlp_ksefselfbillinginvoice) | ✅ | Parent invoice |
| `dvlp_templateid` | Template | Lookup (dvlp_ksefselfbillingtemplate) | ❌ | Source template |
| `createdon` | Created On | DateTime | Auto | Record creation date |
| `modifiedon` | Modified On | DateTime | Auto | Record last modified date |

#### Relationships

| Type | Related Table | Relationship Name |
|------|---------------|-------------------|
| N:1 | dvlp_ksefselfbillinginvoice | `dvlp_ksefselfbillinginvoice_lineitems` |
| N:1 | dvlp_ksefselfbillingtemplate | `dvlp_ksefselfbillingtemplate_lineitems` |

---

## Option Sets (Choices)

### dvlp_ksefenvironment

**Display Name:** KSeF Environment  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | Test | Test | KSeF test environment |
| 100000002 | Demo | Demo | KSeF demo environment |
| 100000003 | Production | Produkcja | KSeF production environment |

---

### dvlp_ksefstatus

**Display Name:** KSeF Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Color | Description |
|-------|-----------|-----------|-------|-------------|
| 100000001 | Draft | Szkic | Gray | Invoice created, not sent |
| 100000002 | Pending | Oczekuje | Yellow | Being sent |
| 100000003 | Sent | Wysłano | Blue | Sent, awaiting confirmation |
| 100000004 | Accepted | Zaakceptowano | Green | Accepted by KSeF |
| 100000005 | Rejected | Odrzucono | Red | Rejected by KSeF |
| 100000006 | Error | Błąd | Red | Technical error |

---

### dvlp_ksefdirection

**Display Name:** Invoice Direction  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Icon |
|-------|-----------|-----------|------|
| 100000001 | Incoming | Przychodzące | ⬇️ |
| 100000002 | Outgoing | Wychodzące | ⬆️ |

---

### dvlp_sessionstatus

**Display Name:** Session Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) |
|-------|-----------|-----------|
| 100000001 | Active | Aktywna |
| 100000002 | Expired | Wygasła |
| 100000003 | Terminated | Zakończona |
| 100000004 | Error | Błąd |

---

### dvlp_sessiontype

**Display Name:** Session Type  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | Interactive | Interaktywna | User session |
| 100000002 | Batch | Wsadowa | Automated session |

---

### dvlp_syncoperationtype

**Display Name:** Sync Operation Type  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) |
|-------|-----------|-----------|
| 100000001 | Sync Incoming | Pobierz przychodzące |
| 100000002 | Sync Outgoing | Synchronizuj wychodzące |
| 100000003 | Send Invoice | Wyślij fakturę |
| 100000004 | Check Status | Sprawdź status |
| 100000005 | Download UPO | Pobierz UPO |

---

### dvlp_syncstatus

**Display Name:** Sync Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) |
|-------|-----------|-----------|
| 100000001 | In Progress | W trakcie |
| 100000002 | Success | Sukces |
| 100000003 | Partial | Częściowy |
| 100000004 | Error | Błąd |

---

### dvlp_paymentstatus

**Display Name:** Payment Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Color |
|-------|-----------|-----------|-------|
| 100000001 | Pending | Oczekuje | Yellow |
| 100000002 | Paid | Opłacona | Green |
| 100000003 | Overdue | Przeterminowana | Red |

---

### dvlp_invoicetype

**Display Name:** Invoice Type  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) |
|-------|-----------|-----------|
| 100000001 | VAT Invoice | Faktura VAT |
| 100000002 | Corrective | Faktura korygująca |
| 100000003 | Advance | Faktura zaliczkowa |

---

### dvlp_currency

**Display Name:** Currency  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) |
|-------|-----------|-----------|
| 100000000 | PLN | PLN |
| 100000001 | USD | USD |
| 100000002 | EUR | EUR |

---

### dvlp_category

**Display Name:** Cost Category  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) |
|-------|-----------|-----------|
| 100000001 | IT & Software | IT i oprogramowanie |
| 100000002 | Office | Biuro |
| 100000003 | Marketing | Marketing |
| 100000004 | Travel | Podróże |
| 100000005 | Utilities | Media |
| 100000006 | Professional Services | Usługi profesjonalne |
| 100000007 | Equipment | Sprzęt |
| 100000008 | Materials | Materiały |
| 100000009 | Other | Inne |

---

### dvlp_costcenter

**Display Name:** Cost Center (MPK — Miejsce Powstawania Kosztów)  
**Type:** Global OptionSet  
**Description:** Cost Centers for categorization

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | Consultants | Konsultanci | Consulting, training, outsourcing |
| 100000002 | BackOffice | Back Office | Office, administration, cleaning |
| 100000003 | Management | Zarząd | Board, strategy, representation |
| 100000004 | Cars | Samochody | Vehicles, fuel, service, insurance |
| 100000005 | Legal | Prawne | Legal, notary, compliance |
| 100000006 | Marketing | Marketing | Advertising, promotion, events |
| 100000007 | Sales | Sprzedaż | Sales, CRM, lead generation |
| 100000008 | Delivery | Realizacja | Projects, developer tools |
| 100000009 | Finance | Finanse | Accounting, audit, banking |
| 100000010 | Other | Inne | Everything else |

#### MPK Enum → Dataverse OptionSet Mapping

| MPK (TypeScript) | Dataverse Value |
|------------------|-----------------|
| `Consultants` | 100000001 |
| `BackOffice` | 100000002 |
| `Management` | 100000003 |
| `Cars` | 100000004 |
| `Legal` | 100000005 |
| `Marketing` | 100000006 |
| `Sales` | 100000007 |
| `Delivery` | 100000008 |
| `Finance` | 100000009 |
| `Other` | 100000010 |

---

### dvlp_feedbacktype

**Display Name:** AI Feedback Type  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Color | Description |
|-------|-----------|-----------|-------|-------------|
| 100000000 | Applied | Zaakceptowano | Green | User accepted AI suggestion without changes |
| 100000001 | Modified | Zmieniono | Orange | User changed AI suggestion |
| 100000002 | Rejected | Odrzucono | Red | User rejected AI suggestion |

---

### dvlp_approvalstatus

**Display Name:** Approval Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Color | Description |
|-------|-----------|-----------|-------|-------------|
| 0 | Draft | Szkic | Gray | Invoice not yet submitted for approval |
| 1 | Pending | Oczekuje | Yellow | Awaiting approver decision |
| 2 | Approved | Zatwierdzono | Green | Approved by approver |
| 3 | Rejected | Odrzucono | Red | Rejected by approver |
| 4 | Cancelled | Anulowano | Gray | Approval request cancelled |

---

### dvlp_budgetperiod

**Display Name:** Budget Period  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 0 | Monthly | Miesięczny | Budget resets every month |
| 1 | Quarterly | Kwartalny | Budget resets every quarter |
| 2 | Half-yearly | Półroczny | Budget resets every 6 months |
| 3 | Annual | Roczny | Budget resets every year |

---

### dvlp_notificationtype

**Display Name:** Notification Type  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 0 | Approval Requested | Prośba o zatwierdzenie | New invoice submitted for approval |
| 1 | SLA Exceeded | Przekroczono SLA | Approval SLA time exceeded |
| 2 | Budget Warning 80% | Ostrzeżenie budżetowe 80% | MPK budget reached 80% utilization |
| 3 | Budget Exceeded | Przekroczono budżet | MPK budget exceeded |
| 4 | Approval Decided | Decyzja zatwierdzenia | Approval decision made (approved/rejected) |

---

### dvlp_invoicesource

**Display Name:** Invoice Source  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | KSeF Sync | Synchronizacja KSeF | Automatically downloaded from KSeF |
| 100000002 | Manual | Ręczne | Manually entered |
| 100000003 | Import | Import | Imported from file |

---

### dvlp_supplierstatus

**Display Name:** Supplier Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | Active | Aktywny | Supplier is active |
| 100000002 | Inactive | Nieaktywny | Supplier is deactivated |
| 100000003 | Blocked | Zablokowany | Supplier is blocked |

---

### dvlp_suppliersource

**Display Name:** Supplier Source  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | KSeF Sync | Synchronizacja KSeF | Auto-created during KSeF invoice sync |
| 100000002 | Manual | Ręczne | Manually added |
| 100000003 | VAT API | API VAT | Created from MF VAT payer verification |

---

### dvlp_sbagreementstatus

**Display Name:** SB Agreement Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Description |
|-------|-----------|-----------|-------------|
| 100000001 | Active | Aktywna | Agreement is currently valid |
| 100000002 | Expired | Wygasła | Agreement has passed its validity end date |
| 100000003 | Terminated | Rozwiązana | Agreement was manually terminated |

---

### dvlp_selfbillingstatus

**Display Name:** Self-Billing Status  
**Type:** Global OptionSet

| Value | Label (EN) | Label (PL) | Color | Description |
|-------|-----------|-----------|-------|-------------|
| 100000001 | Draft | Szkic | Gray | SB invoice created, not yet submitted |
| 100000002 | Pending Seller | Oczekuje na sprzedawcę | Yellow | Sent to seller for approval |
| 100000003 | Seller Approved | Zaakceptowana | Green | Seller approved the SB invoice |
| 100000004 | Seller Rejected | Odrzucona | Red | Seller rejected the SB invoice |
| 100000005 | Sent to KSeF | Wysłana do KSeF | Blue | SB invoice submitted to KSeF |

---

## Relationships

### Relationship Diagram

```mermaid
graph TD
    Setting["dvlp_ksefsetting (1)"] -->|1:N| Session["dvlp_ksefsession"]
    Setting -->|1:N| SyncLog["dvlp_ksefsynclog"]
    Setting -->|1:N| Invoice1["dvlp_ksefinvoice<br/>(via dvlp_ksefsettingid)"]
    Setting -->|1:N| MpkCenter["dvlp_ksefmpkcenter"]
    Setting -->|1:N| Notification["dvlp_ksefnotification"]
    Setting -->|1:N| Supplier["dvlp_ksefsupplier"]
    Setting -->|1:N| SbAgree["dvlp_ksefsbagrement"]
    Setting -->|1:N| SbTmpl["dvlp_ksefselfbillingtemplate"]
    Setting -->|1:N| SbInv["dvlp_ksefselfbillinginvoice"]
    Supplier -->|1:N| SbInv
    SbAgree -->|1:N| SbInv
    SbInv -->|1:N| SbLineItem["dvlp_ksefselfbillinglineitem"]
    SbInv -->|0..1| Invoice1
    Supplier -->|0..1| SystemUser["systemuser (SB Contact)"]
    Session -->|1:N| Invoice2["dvlp_ksefinvoice<br/>(via dvlp_ksefsessionid)"]
    Invoice1 -->|1:N| Feedback["dvlp_aifeedback<br/>(via dvlp_invoiceid)"]
    Invoice1 -->|1:N| Notification
    MpkCenter -->|1:N| Approver["dvlp_ksefmpkapprover"]
    MpkCenter -->|1:N| Invoice1
    MpkCenter -->|1:N| Notification
    Supplier -->|1:N| SbAgree
    Supplier -->|1:N| SbTmpl
    Supplier -->|1:N| Invoice1
    SbAgree -->|1:N| Invoice1
    SystemUser["systemuser"] -->|1:N| Approver
    SystemUser -->|1:N| Notification
```

<details>
<summary>ASCII fallback (click to expand)</summary>

```
dvlp_ksefsetting (1)
    │
    ├──── (N) dvlp_ksefsession
    │           │
    │           └──── (N) dvlp_ksefinvoice (via dvlp_ksefsessionid)
    │
    ├──── (N) dvlp_ksefsynclog
    │
    ├──── (N) dvlp_ksefmpkcenter (1)
    │           ├──── (N) dvlp_ksefmpkapprover
    │           ├──── (N) dvlp_ksefinvoice (via dvlp_mpkcenterid)
    │           └──── (N) dvlp_ksefnotification
    │
    ├──── (N) dvlp_ksefnotification
    │
    └──── (N) dvlp_ksefinvoice (via dvlp_ksefsettingid)
                    │
                    ├──── (N) dvlp_aifeedback (via dvlp_invoiceid)
                    └──── (N) dvlp_ksefnotification
```

</details>

### Relationship Definitions

| Relationship | Type | Parent | Child | Cascade |
|-------------|------|--------|-------|---------|
| `dvlp_ksefsetting_sessions` | 1:N | dvlp_ksefsetting | dvlp_ksefsession | Delete: Cascade |
| `dvlp_ksefsetting_synclogs` | 1:N | dvlp_ksefsetting | dvlp_ksefsynclog | Delete: Cascade |
| `dvlp_ksefsetting_invoices` | 1:N | dvlp_ksefsetting | dvlp_ksefinvoice | Delete: Restrict |
| `dvlp_ksefsession_synclogs` | 1:N | dvlp_ksefsession | dvlp_ksefsynclog | Delete: RemoveLink |
| `dvlp_ksefsession_invoices` | 1:N | dvlp_ksefsession | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_ksefinvoice_parent` | 1:N | dvlp_ksefinvoice | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_ksefinvoice_feedbacks` | 1:N | dvlp_ksefinvoice | dvlp_aifeedback | Delete: Cascade |
| `dvlp_ksefsetting_mpkcenters` | 1:N | dvlp_ksefsetting | dvlp_ksefmpkcenter | Delete: Restrict |
| `dvlp_mpkcenter_approvers` | 1:N | dvlp_ksefmpkcenter | dvlp_ksefmpkapprover | Delete: Cascade |
| `dvlp_mpkcenter_invoices` | 1:N | dvlp_ksefmpkcenter | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_mpkcenter_notifications` | 1:N | dvlp_ksefmpkcenter | dvlp_ksefnotification | Delete: RemoveLink |
| `dvlp_ksefsetting_notifications` | 1:N | dvlp_ksefsetting | dvlp_ksefnotification | Delete: Cascade |
| `dvlp_invoice_notifications` | 1:N | dvlp_ksefinvoice | dvlp_ksefnotification | Delete: RemoveLink |
| `dvlp_recipient_notifications` | 1:N | systemuser | dvlp_ksefnotification | Delete: RemoveLink |
| `dvlp_systemuser_approvers` | 1:N | systemuser | dvlp_ksefmpkapprover | Delete: Cascade |

---

## Security Roles

### KSeF Admin

Full access to all KSeF operations.

| Table | Create | Read | Write | Delete | Append | AppendTo |
|-------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefinvoice | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_aifeedback | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefmpkcenter | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefmpkapprover | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefnotification | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |

### KSeF Reader

Read-only access.

| Table | Create | Read | Write | Delete | Append | AppendTo |
|-------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefinvoice | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_aifeedback | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkcenter | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkapprover | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefnotification | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

### KSeF Operator

Can perform synchronization and manage invoices, but cannot change configuration.

| Table | Create | Read | Write | Delete | Append | AppendTo |
|-------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefinvoice | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_aifeedback | ✅ Org | ✅ Org | ❌ | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefmpkcenter | ❌ | ✅ Org | ❌ | ❌ | ❌ | ✅ Org |
| dvlp_ksefmpkapprover | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefnotification | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

### KSeF Approver

Can approve invoices for payment.

| Table | Create | Read | Write | Delete | Append | AppendTo |
|-------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefinvoice | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |
| dvlp_aifeedback | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkcenter | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkapprover | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefnotification | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

---

## Indexes and Performance

### Recommended Indexes

| Table | Index | Attributes | Justification |
|-------|-------|-----------|---------------|
| dvlp_ksefsetting | PK | `dvlp_ksefsettingid` | Auto |
| dvlp_ksefsetting | AK_NIP | `dvlp_nip` | NIP lookup |
| dvlp_ksefsession | IX_NIP_Status | `dvlp_nip`, `dvlp_status` | Active sessions per NIP |
| dvlp_ksefsession | IX_ExpiredAt | `dvlp_expiresat` | Expired session cleanup |
| dvlp_ksefsynclog | IX_Setting_Date | `dvlp_ksefsettingid`, `dvlp_startedat` | Sync history |
| dvlp_ksefinvoice | PK | `dvlp_ksefinvoiceid` | Primary key |
| dvlp_ksefinvoice | AK_KSeFRef | `dvlp_ksefreferencenumber` | KSeF reference lookup |
| dvlp_ksefinvoice | AK_Composite | `dvlp_sellernip`, `dvlp_name`, `dvlp_invoicedate` | Deduplication |
| dvlp_ksefinvoice | IX_PaymentStatus | `dvlp_paymentstatus`, `dvlp_duedate` | Payment filtering |
| dvlp_ksefinvoice | IX_SellerNIP | `dvlp_sellernip` | Supplier search |
| dvlp_ksefinvoice | IX_InvoiceDate | `dvlp_invoicedate` | Date sorting/filtering |
| dvlp_aifeedback | IX_tenant_supplier | `dvlp_tenantnip`, `dvlp_suppliernip` | Per-supplier aggregation for learning |
| dvlp_aifeedback | IX_createdon | `createdon` | Chronological sorting |

### Data Partitioning (Extended)

For large volumes (>100k invoices):

```
Partition by: dvlp_invoicedate (monthly)
Retention: 7 years (legal requirements for invoices)
Archival: After 2 years to cold storage
```

---

## Data Migration

### Initial Import

1. **KSeF Settings** — manual configuration per company
2. **KSeF Invoices** — creating new `dvlp_ksefinvoice` table

### Mapping Script (example)

```javascript
// KSeF status mapping
const ksefStatusMapping = {
  'NEW': 100000001,       // Draft
  'SENT': 100000003,      // Sent
  'CONFIRMED': 100000004, // Accepted
  'FAILED': 100000006     // Error
};

// Direction mapping
const directionMapping = {
  'IN': 100000001,   // Incoming
  'OUT': 100000002   // Outgoing
};

// Payment status mapping
const paymentStatusMapping = {
  'UNPAID': 100000001,    // Pending
  'PAID': 100000002,      // Paid
  'OVERDUE': 100000003    // Overdue
};

// Invoice type mapping
const invoiceTypeMapping = {
  'VAT': 100000000,        // VAT Invoice
  'CORRECTION': 100000001, // Corrective
  'ADVANCE': 100000002     // Advance
};

// Currency mapping
const currencyMapping = {
  'PLN': 100000000,
  'USD': 100000001,
  'EUR': 100000002
};

// MPK (Cost Center) mapping
const costCenterMapping = {
  'Consultants': 100000001,
  'BackOffice': 100000002,
  'Management': 100000003,
  'Cars': 100000004,
  'Legal': 100000005,
  'Marketing': 100000006,
  'Sales': 100000007,
  'Delivery': 100000008,
  'Finance': 100000009,
  'Other': 100000010
};
```

### Post-Migration Validation

```sql
-- Check consistency — sent/accepted invoices should have KSeF reference
SELECT COUNT(*) as total,
       SUM(CASE WHEN dvlp_ksefreferencenumber IS NULL THEN 1 ELSE 0 END) as missing_ref
FROM dvlp_ksefinvoice
WHERE dvlp_ksefstatus IN (100000003, 100000004) -- Sent, Accepted

-- Check duplicates
SELECT dvlp_sellernip, dvlp_name, dvlp_invoicedate, COUNT(*) as cnt
FROM dvlp_ksefinvoice
GROUP BY dvlp_sellernip, dvlp_name, dvlp_invoicedate
HAVING COUNT(*) > 1

-- Check setting relationship
SELECT i.dvlp_name, i.dvlp_buyernip
FROM dvlp_ksefinvoice i
LEFT JOIN dvlp_ksefsetting s ON i.dvlp_ksefsettingid = s.dvlp_ksefsettingid
WHERE s.dvlp_ksefsettingid IS NULL
```

---

## AI Fields Deployment

### Step-by-Step

#### Step 1: Create Option Set `dvlp_costcenter` (if it doesn't exist)

1. Go to **Power Apps** → **Solutions** → **dvlp-ksef**
2. Add a new **Choice** (Global OptionSet):
   - Name: `dvlp_costcenter`
   - Display Name: `Cost Center / MPK`
   - Add values per the table in [dvlp_costcenter](#dvlp_costcenter) section

#### Step 2: Create Option Set `dvlp_feedbacktype`

1. Add a new **Choice** (Global OptionSet):
   - Name: `dvlp_feedbacktype`
   - Display Name: `AI Feedback Type`
   - Add values: Applied (100000000), Modified (100000001), Rejected (100000002)

#### Step 3: Add AI fields to `dvlp_ksefinvoice` table

1. Navigate to table **dvlp_ksefinvoice**
2. Click **+ New column** for each AI field
3. Fill in per the configuration in [Attributes — AI Categorization](#attributes--ai-categorization) section
4. **Save** after each field

#### Step 4: Create `dvlp_aifeedback` table

1. Create the table per the specification in [dvlp_aifeedback](#dvlp_aifeedback) section
2. Add all attributes, indexes, and views

#### Step 5: Update the form

1. Open the main **KSeF Invoice** form
2. Add a new "AI Suggestions" section in the Categorization tab
3. Drag the new AI fields into the section
4. Set AI fields as **Read-only**
5. **Save and Publish**

#### Step 6: Create AI views

1. Add views: "Invoices for AI Categorization", "AI Categorized", "Low AI Confidence"
2. Configure filters and columns per specification

#### Step 7: Publish changes

1. Click **Publish all customizations**
2. Verify in **Solutions** that the version has been incremented

### Deployment Checklist

- [ ] Option Set `dvlp_costcenter` created with 10 values
- [ ] Option Set `dvlp_feedbacktype` created with 3 values
- [ ] Field `dvlp_aimpksuggestion` added as Choice
- [ ] Field `dvlp_aicategorysuggestion` added as Text(100)
- [ ] Field `dvlp_aidescription` added as Text(500)
- [ ] Field `dvlp_airationale` added as Text(500)
- [ ] Field `dvlp_aiconfidence` added as Decimal(3,2)
- [ ] Field `dvlp_aiprocessedat` added as DateTime
- [ ] Form updated with "AI Suggestions" section
- [ ] AI views created (for categorization, categorized, low confidence)
- [ ] Table `dvlp_aifeedback` created
- [ ] Customizations published
- [ ] Code updated (config.ts, mappers.ts, ai-categorize.ts)
- [ ] Tests passed

### Estimated Deployment Time

| Task | Time |
|------|------|
| Create Option Set `dvlp_costcenter` | 5 min |
| Create Option Set `dvlp_feedbacktype` | 5 min |
| Add 6 AI fields in `dvlp_ksefinvoice` | 15 min |
| Update form | 10 min |
| Create views | 10 min |
| Create `dvlp_aifeedback` table | 15 min |
| Publish | 2 min |
| Update code | 15 min |
| Tests | 15 min |
| **Total** | **~1h 30min** |

---

## Code Changes After AI Deployment

### 1. Update config.ts

```typescript
// api/src/lib/dataverse/config.ts

// In the invoice section add:
invoice: {
  // ... existing fields ...
  
  // AI Categorization fields
  aiMpkSuggestion: process.env.DV_FIELD_INVOICE_AI_MPK || 'dvlp_aimpksuggestion',
  aiCategorySuggestion: process.env.DV_FIELD_INVOICE_AI_CATEGORY || 'dvlp_aicategorysuggestion',
  aiDescription: process.env.DV_FIELD_INVOICE_AI_DESC || 'dvlp_aidescription',
  aiConfidence: process.env.DV_FIELD_INVOICE_AI_CONFIDENCE || 'dvlp_aiconfidence',
  aiProcessedAt: process.env.DV_FIELD_INVOICE_AI_PROCESSED || 'dvlp_aiprocessedat',
}
```

### 2. Update mappers.ts

```typescript
// api/src/lib/dataverse/mappers.ts

// In mapDvInvoiceToApp — replace undefined with actual mapping:
export function mapDvInvoiceToApp(raw: DvInvoice): Invoice {
  // ... existing code ...
  
  // AI fields — change from undefined to:
  aiMpkSuggestion: mapDvCostCenterToMpk(raw[s.aiMpkSuggestion]),
  aiCategorySuggestion: raw[s.aiCategorySuggestion] as string | undefined,
  aiDescription: raw[s.aiDescription] as string | undefined,
  aiConfidence: raw[s.aiConfidence] as number | undefined,
  aiProcessedAt: raw[s.aiProcessedAt] as string | undefined,
}

// In mapAppInvoiceToDv — uncomment:
export function mapAppInvoiceToDv(app: Partial<Invoice>): Record<string, unknown> {
  // ... existing code ...
  
  // AI fields
  if (app.aiMpkSuggestion !== undefined) payload[s.aiMpkSuggestion] = mapMpkToDvCostCenter(app.aiMpkSuggestion)
  if (app.aiCategorySuggestion !== undefined) payload[s.aiCategorySuggestion] = app.aiCategorySuggestion
  if (app.aiDescription !== undefined) payload[s.aiDescription] = app.aiDescription
  if (app.aiConfidence !== undefined) payload[s.aiConfidence] = app.aiConfidence
  if (app.aiProcessedAt !== undefined) payload[s.aiProcessedAt] = app.aiProcessedAt
}
```

### 3. Uncomment in ai-categorize.ts

```typescript
// api/src/functions/ai-categorize.ts

// Uncomment the blocks that save to Dataverse:
await invoiceService.update(invoiceId, {
  aiMpkSuggestion: categorization.mpk as MPK,
  aiCategorySuggestion: categorization.category,
  aiDescription: categorization.description,
  aiConfidence: categorization.confidence,
  aiProcessedAt: new Date().toISOString(),
})
```

---

## Table Creation Order

### 1. Create Global Option Sets

Create all global option sets first:

1. `dvlp_ksefenvironment` — KSeF Environment
2. `dvlp_ksefstatus` — KSeF Status
3. `dvlp_ksefdirection` — Invoice Direction
4. `dvlp_sessionstatus` — Session Status
5. `dvlp_sessiontype` — Session Type
6. `dvlp_syncoperationtype` — Sync Operation Type
7. `dvlp_syncstatus` — Sync Status
8. `dvlp_paymentstatus` — Payment Status
9. `dvlp_invoicetype` — Invoice Type
10. `dvlp_currency` — Currency
11. `dvlp_category` — Cost Category
12. `dvlp_costcenter` — Cost Center (MPK)
13. `dvlp_feedbacktype` — AI Feedback Type
14. `dvlp_approvalstatus` — Approval Status
15. `dvlp_budgetperiod` — Budget Period
16. `dvlp_notificationtype` — Notification Type
17. `dvlp_invoicesource` — Invoice Source

### 2. Create Tables in Order

1. `dvlp_ksefsetting` — KSeF Settings (no relationships)
2. `dvlp_ksefsession` — KSeF Sessions (with relationship to dvlp_ksefsetting)
3. `dvlp_ksefinvoice` — KSeF Invoices (with relationship to dvlp_ksefsetting + AI fields + approval fields)
4. `dvlp_ksefsynclog` — Sync Logs (with relationships to the above)
5. `dvlp_aifeedback` — AI Feedback (with relationship to dvlp_ksefinvoice)
6. `dvlp_ksefmpkcenter` — MPK Centers (with relationship to dvlp_ksefsetting)
7. `dvlp_ksefmpkapprover` — MPK Approvers (with relationships to dvlp_ksefmpkcenter + systemuser)
8. `dvlp_ksefnotification` — Notifications (with relationships to systemuser, dvlp_ksefsetting, dvlp_ksefinvoice, dvlp_ksefmpkcenter)

### 3. Create Alternate Keys

- `dvlp_ksefsetting`: `dvlp_nip_key`
- `dvlp_ksefinvoice`: `dvlp_ksefref_key`, `dvlp_invoice_composite_key`

### 4. Create Views, Forms, and Charts

As specified for each table.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-01 | Initial version |
| 1.1.0 | 2026-01 | Changed from Invoice extension to new table dvlp_ksefinvoice |
| 1.2.0 | 2026-01 | Simplified structure: 22 columns instead of 50+, Decimal instead of Currency, MPK/Category as OptionSet |
| 1.3.0 | 2026-02 | Merged AI field specification: dvlp_aimpksuggestion, dvlp_aicategorysuggestion, dvlp_aidescription, dvlp_airationale, dvlp_aiconfidence, dvlp_aiprocessedat + dvlp_aifeedback table + detailed dvlp_costcenter + deployment instructions |
| 1.4.0 | 2026-03 | Added MPK Center entity (dvlp_ksefmpkcenter), MPK Approver (dvlp_ksefmpkapprover), Notification (dvlp_ksefnotification). Invoice approval workflow fields (dvlp_approvalstatus, dvlp_approvedby, dvlp_approvedbyoid, dvlp_approvedat, dvlp_approvalcomment, dvlp_mpkcenterid). New OptionSets: dvlp_approvalstatus, dvlp_budgetperiod, dvlp_notificationtype |
| 1.5.0 | 2026-04 | Added Self-Billing entities: dvlp_ksefsupplier, dvlp_ksefsbagrement, dvlp_ksefselfbillingtemplate. Invoice self-billing fields (dvlp_isselfbilling, dvlp_selfbillingstatus, dvlp_sellerrejectionreason, dvlp_selfbillingsentdate, dvlp_supplierid, dvlp_sbagreementid). New OptionSets: dvlp_supplierstatus, dvlp_suppliersource, dvlp_sbagreementstatus, dvlp_selfbillingstatus. Solution version bump to 1.0.0.9 |
| 1.6.0 | 2026-04 | Migrated SB invoices to dedicated tables: dvlp_ksefselfbillinginvoice + dvlp_ksefselfbillinglineitem. Removed SB fields from dvlp_ksefinvoice. Line items as separate records instead of JSON. |
| 1.7.0 | 2026-03 | SB Approval workflow: added dvlp_sbcontactuserid (systemuser lookup) to dvlp_ksefsupplier. Added audit columns to dvlp_ksefselfbillinginvoice: dvlp_submittedbyuserid (systemuser lookup), dvlp_submittedat (DateTime), dvlp_approvedbyuserid (systemuser lookup), dvlp_approvedat (DateTime). New endpoint GET /api/self-billing/approvals/pending. Submit/approve/reject endpoints now enforce designated approver authorization. |

---

## Related Documents

- [Architecture](./ARCHITECTURE.md) — system overview
- [API Reference](./API.md) — endpoints operating on these tables
- [Entra ID Configuration](../../deployment/azure/ENTRA_ID_KONFIGURACJA.md) — Dataverse role, Application User
- [Dataverse Deployment](../../deployment/dataverse/README.md) — deployment instructions

---

**Last updated:** 2026-03-15  
**Version:** 1.7  
**Maintainer:** dvlp-dev team
