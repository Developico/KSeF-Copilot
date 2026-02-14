# Comprehensive Comparison: `web/` (Next.js) vs `code-app/` (Vite SPA)

> Generated comparison of the two front-end applications in `dvlp-ksef`.
> Both apps talk to the **same Azure Functions backend** (`api/`).

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Feature-by-Feature Comparison Table](#2-feature-by-feature-comparison-table)
3. [Detailed Analysis by Area](#3-detailed-analysis-by-area)
   - [Pages / Routes](#31-pages--routes)
   - [Components — Dashboard](#32-components--dashboard)
   - [Components — Invoices](#33-components--invoices)
   - [Components — Documents](#34-components--documents)
   - [Components — Forecast](#35-components--forecast)
   - [Components — Reports](#36-components--reports)
   - [Components — Layout](#37-components--layout)
   - [Components — Auth](#38-components--auth)
   - [Components — Health](#39-components--health)
   - [Components — Skeletons](#310-components--skeletons)
   - [Hooks](#311-hooks)
   - [Lib / Utils](#312-lib--utils)
   - [Contexts](#313-contexts)
   - [UI Primitives (shadcn)](#314-ui-primitives-shadcn)
   - [i18n / Messages](#315-i18n--messages)
4. [What Is in `web` but MISSING from `code-app`](#4-what-is-in-web-but-missing-from-code-app)
5. [What Is in `code-app` but MISSING from `web`](#5-what-is-in-code-app-but-missing-from-web)
6. [Functional Differences in Shared Features](#6-functional-differences-in-shared-features)
7. [Implementation Suggestions](#7-implementation-suggestions)

---

## 1. High-Level Architecture

| Aspect | `web/` | `code-app/` |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Vite 5 + React 18 SPA |
| **Routing** | File-system (`app/[locale]/…`) | `react-router-dom` (BrowserRouter) |
| **i18n** | `next-intl` (server/client) | `react-intl` + Zustand store |
| **Auth** | `@azure/msal-react` + RBAC via groups | `@azure/msal-react` + RBAC via groups |
| **State** | React Query + Context | React Query + Context + Zustand (locale) |
| **Styling** | Tailwind CSS + shadcn/ui | Tailwind CSS + shadcn/ui |
| **Animation** | Framer Motion | Framer Motion |
| **Charts** | Recharts | Recharts |
| **Toast** | Custom reducer (`use-toast.ts`) | `sonner` |
| **Env vars** | `NEXT_PUBLIC_*` | `VITE_*` |
| **Build output** | SSR + static pages | Static SPA (single `index.html`) |
| **PDF support** | `pdfjs-dist` (thumbnails) | None |

---

## 2. Feature-by-Feature Comparison Table

| Feature | `web/` | `code-app/` | Status |
|---|:---:|:---:|---|
| **Dashboard page** | ✅ | ✅ | Different impl — see §3.2 |
| **Home page** | ✅ (inline KPI + quick actions) | — (routes `/` to Dashboard) | web has standalone home page |
| **Invoice list** | ✅ (1193 lines, inline) | ✅ (579 lines) | web is larger — see §3.3 |
| **Invoice detail** | ✅ (`InvoiceDetailContent` component) | ✅ (inline, 540 lines) | Equivalent |
| **Manual invoice** | ✅ (`ManualInvoiceForm` component) | ✅ (383 lines, inline page) | code-app adds exchange rate |
| **Document scanner modal** | ✅ (dedicated component) | ✅ (own implementation) | Both exist, different impl |
| **Document management system** | ✅ (6 components) | ❌ | **MISSING from code-app** |
| **Forecast** | ✅ (`ForecastContent` component) | ✅ (630 lines, inline page) | Equivalent |
| **Reports** | ✅ (708 lines, inline) | ✅ (537 lines) | Equivalent |
| **Settings** | ✅ (1116 lines, inline) | ✅ (971 lines) | Equivalent |
| **Sync / KSeF** | ✅ (612 lines, inline) | ✅ (637 lines) | Equivalent |
| **Skeleton loaders** | ✅ (4 skeletons) | ❌ | **MISSING from code-app** |
| **PDF thumbnail** | ✅ (`pdf-thumbnail.ts`) | ❌ | **MISSING from code-app** |
| **Microsoft Graph avatars** | ✅ (`graph-service.ts`, `useAvatar`) | ❌ | **MISSING from code-app** |
| **Auth event logger** | ✅ (`auth-logger.ts`) | ❌ | **MISSING from code-app** |
| **GUS company lookup** | ✅ (standalone hook, 502 lines) | ✅ (dialog + API hook) | Different architecture |
| **Invoice attachments** | Via document sidebar | ✅ (`attachments-section.tsx`) | Both have, different UI |
| **Invoice notes** | ✅ (`InvoiceNotesSection`) | ✅ (`notes-section.tsx`) | Equivalent |
| **AI categorization** | ❌ | ✅ (`useCategorizeWithAI`) | **MISSING from web** |
| **Currency exchange rate** | ❌ | ✅ (`useExchangeRate`, `useConvertCurrency`) | **MISSING from web** |
| **Client-side pagination** | Scroll / load-all | ✅ (`InvoicePagination`) | code-app has explicit pagination |
| **Classification edit dialog** | ❌ | ✅ (`classification-edit-dialog.tsx`) | **MISSING from web** |
| **Centralised format utils** | ❌ (inline formatting) | ✅ (`lib/format.ts`) | code-app more organised |
| **Centralised query keys** | Inline in `api.ts` | ✅ (`lib/query-keys.ts`) | code-app more organised |
| **Centralised type defs** | Inline in `api.ts` | ✅ (`lib/types.ts`, 884 lines) | code-app more organised |
| **Company selector** | ✅ (standalone component) | ✅ (inside header) | web is a separate file |
| **Language switcher** | ✅ (standalone component) | ✅ (inside header) | web is a separate file |

---

## 3. Detailed Analysis by Area

### 3.1 Pages / Routes

#### web (`app/[locale]/`)
| Route | File | Lines | Notes |
|---|---|---:|---|
| `/` | `page.tsx` | 245 | Home: KPI cards, quick actions, recent activity. |
| `/dashboard` | `dashboard/page.tsx` | ~30 | Delegates to `<DashboardContent />` |
| `/invoices` | `invoices/page.tsx` | 1193 | Giant inline page: grouping, filters, document scanner, mobile cards |
| `/invoices/[id]` | `invoices/[id]/page.tsx` | ~50 | Delegates to `<InvoiceDetailContent />` |
| `/invoices/new` | `invoices/new/page.tsx` | ~30 | Delegates to `<ManualInvoiceForm />` |
| `/forecast` | `forecast/page.tsx` | ~40 | Delegates to `<ForecastContent />` |
| `/reports` | `reports/page.tsx` | 708 | Inline: monthly, suppliers, categories, MPK |
| `/settings` | `settings/page.tsx` | 1116 | Inline: companies, cost centers, test data, health |
| `/sync` | `sync/page.tsx` | 612 | Inline: KSeF session, preview, import |

#### code-app (`src/pages/`)
| Route | File | Lines | Notes |
|---|---|---:|---|
| `/` | Redirects to `/dashboard` | — | No standalone home page |
| `/dashboard` | `dashboard.tsx` | 568 | KPI cards, Recharts bar/pie, date range filter |
| `/invoices` | `invoices.tsx` | 579 | Filters, grouping, pagination |
| `/invoices/:id` | `invoice-detail.tsx` | 540 | Inline detail + edit mode for manual invoices |
| `/invoices/new` | `manual-invoice.tsx` | 383 | GUS lookup + currency exchange rate |
| `/forecast` | `forecast.tsx` | 630 | Monthly/MPK/category/supplier views |
| `/reports` | `reports.tsx` | 537 | KPI cards, monthly, MPK charts |
| `/settings` | `settings.tsx` | 971 | Companies, cost centers, test data, system status |
| `/sync` | `sync.tsx` | 637 | KSeF session, preview, import, log entries |

**Key differences:**
- web has a standalone **home page** (`/`) with quick actions and recent activity. code-app redirects `/` → `/dashboard`.
- web uses **component-per-page extraction** for dashboard, invoice detail, new invoice, and forecast (small page files that delegate to components). code-app keeps everything **inline in page files**.
- web's **invoice list** is ~2× larger due to inline document scanner, mobile card view, and description status tracking.

---

### 3.2 Components — Dashboard

| Component | `web` | `code-app` | Diff |
|---|:---:|:---:|---|
| `animated-kpi-card.tsx` | ✅ | ✅ | Nearly identical (motion + CountUp) |
| `dashboard-content.tsx` | ✅ | — | web extracts dashboard to component |
| `forecast-content.tsx` | ✅ | — | web extracts forecast to component |

- **web** dashboard uses `useContextDashboardStats`, `useContextInvoices` (wrapper hooks that auto-inject company context).
- **code-app** dashboard uses `useDashboardStats` directly, manually passing `settingId` from company context.
- **web** reports page computes all data **client-side** from raw invoices. **code-app** reports uses `useDashboardStats` for **server-side aggregation**.

---

### 3.3 Components — Invoices

| Component | `web` | `code-app` | Notes |
|---|:---:|:---:|---|
| `invoice-detail-content.tsx` | ✅ | — | web extracts to component |
| `invoice-notes-section.tsx` | ✅ | — | web has standalone notes section |
| `manual-invoice-form.tsx` | ✅ | — | web extracts to component |
| `notes-section.tsx` | — | ✅ | code-app's notes section |
| `attachments-section.tsx` | — | ✅ | code-app's attachment panel |
| `classification-edit-dialog.tsx` | — | ✅ | MPK/category edit with AI suggestion |
| `gus-lookup-dialog.tsx` | — | ✅ | Standalone dialog for GUS lookup |
| `invoice-pagination.tsx` | — | ✅ | Client-side pagination |
| `document-scanner-modal.tsx` | ✅ | ✅ | Different implementations |
| `invoice-filters.tsx` | ✅ | ✅ | Different filter sets |

**Functional differences:**
- web's **`ManualInvoiceForm`** and code-app's **`manual-invoice.tsx`** both create invoices, but code-app adds **currency exchange rate lookups** and a **GUS lookup dialog**.
- web handles **notes/attachments** through the document sidebar; code-app uses **dedicated sections with full CRUD**.
- code-app's **`ClassificationEditDialog`** allows editing MPK, category, description, and project with **AI categorization suggestions** (`useCategorizeWithAI`).

---

### 3.4 Components — Documents

| Component | `web` | `code-app` | Notes |
|---|:---:|:---:|---|
| `document-dropzone.tsx` | ✅ | ❌ | Drag & drop upload w/ file validation |
| `document-scanner-modal.tsx` | ✅ | ✅ | code-app has a separate impl in `invoices/` |
| `extraction-preview.tsx` | ✅ (589 lines) | ❌ | Shows extracted data, editable fields, PDF thumbnail |
| `floating-scanner-button.tsx` | ✅ | ❌ | FAB in bottom-right corner |
| `invoice-document-sidebar.tsx` | ✅ (556 lines) | ❌ | Full doc viewer/upload/download/delete/fullscreen |
| `invoice-document-viewer.tsx` | ✅ (503 lines) | ❌ | Renders PDF/image previews |

> **The entire `components/documents/` directory is MISSING from code-app.**
> This is the largest functional gap. web has a full **document management system** with:
> - Drag-and-drop upload with base64 conversion
> - Multi-step scanner workflow (upload → processing → preview → error)
> - Extracted data preview with editable fields
> - PDF thumbnail generation using `pdfjs-dist`
> - Document viewer with PDF/image rendering
> - Full sidebar integration in invoice detail view
> - Floating action button for quick scanning

---

### 3.5 Components — Forecast

Both apps have equivalent forecast functionality:
- Monthly forecast with historical + predicted data
- Forecast by MPK, category, and supplier
- Anomaly detection and summary
- Recharts visualisations

The main structural difference is that **web** extracts the forecast UI into `components/dashboard/forecast-content.tsx`, while **code-app** keeps it inline in `pages/forecast.tsx`.

---

### 3.6 Components — Reports

Both apps provide:
- KPI cards (total invoices, net amount, VAT, etc.)
- Monthly chart (Recharts bar chart)
- Top suppliers breakdown
- MPK/category distribution

**Difference:** web's reports page (708 lines) computes aggregations **client-side** from raw invoice data. code-app's reports page (537 lines) fetches **pre-aggregated data** from `useDashboardStats`.

---

### 3.7 Components — Layout

| Component | `web` | `code-app` | Notes |
|---|:---:|:---:|---|
| `sidebar.tsx` | ✅ | ✅ | Same nav items, collapse behaviour |
| `header.tsx` | ✅ | ✅ | Logo, theme, user menu, company selector |
| `mobile-sidebar.tsx` | ✅ | ✅ | Equivalent |
| `page-wrapper.tsx` | ✅ | — | General layout wrapper |
| `app-layout.tsx` | — | ✅ | Equivalent to page-wrapper |
| `environment-banner.tsx` | ✅ | ✅ | Shows non-production banner |
| `changelog-modal.tsx` | ✅ | ✅ | Easter-egg changelog modal |
| `ksef-sync-button.tsx` | ✅ | ✅ | Sync status in header |
| `company-selector.tsx` | ✅ (standalone) | — (inline in header) | web extracts to file |
| `language-switcher.tsx` | ✅ (standalone) | — (inline in header) | web extracts to file |

**Differences:**
- web has `company-selector.tsx` and `language-switcher.tsx` as **separate components**; code-app inlines them inside `header.tsx`.
- web's `page-wrapper.tsx` adds breadcrumbs/header structure; code-app's `app-layout.tsx` provides sidebar + main area layout.

---

### 3.8 Components — Auth

| Component | `web` | `code-app` | Notes |
|---|:---:|:---:|---|
| `auth-provider.tsx` | ✅ | ✅ | Both: MSAL + group-based RBAC |
| `signin-screen.tsx` | ✅ | — | Branded login page with Image |
| `auth-gate.tsx` | — | ✅ | Login gate with Unauthenticated/Authenticated templates |

**Differences:**
- web exposes `useHasRole()` hook and `<RequireRole />` component for fine-grained role checks.
- code-app puts `isAdmin: boolean` directly in the auth context for simpler admin checks.
- web uses a branded `SignInScreen` with background image; code-app uses a simpler `AuthGate` with `UnauthenticatedTemplate`/`AuthenticatedTemplate` pattern.

---

### 3.9 Components — Health

| Component | `web` | `code-app` |
|---|:---:|:---:|
| `system-status-badge.tsx` | ✅ | ✅ |

Both show a health indicator dot in the header. Same functionality.

---

### 3.10 Components — Skeletons

| Component | `web` | `code-app` |
|---|:---:|:---:|
| `dashboard-skeleton.tsx` | ✅ | ❌ |
| `generic-page-skeleton.tsx` | ✅ | ❌ |
| `invoices-table-skeleton.tsx` | ✅ | ❌ |
| `settings-skeleton.tsx` | ✅ | ❌ |

> **The entire `components/skeletons/` directory is MISSING from code-app.**
> code-app falls back to generic spinner/loading states instead of page-specific skeleton loaders.

---

### 3.11 Hooks

#### web (`hooks/`)
| Hook | Location | Notes |
|---|---|---|
| `use-api.ts` | ✅ | 50+ exported hooks with `useContext*` wrappers |
| `use-gus-lookup.ts` | ✅ (502 lines) | Full GUS lookup with debounce, auto-lookup, NIP validation, recent suppliers |
| `use-toast.ts` | ✅ (189 lines) | Custom toast system using reducer pattern |
| `useAvatar.ts` | ✅ (115 lines) | Microsoft Graph avatar fetching |

#### code-app (`hooks/`)
| Hook | Location | Notes |
|---|---|---|
| `use-api.ts` | ✅ | All hooks including GUS, attachments, notes, documents, AI categorization, exchange rates |

**Key differences:**

| Hook | `web` | `code-app` |
|---|:---:|:---:|
| `useContext*` wrappers (auto-inject company) | ✅ | ❌ |
| GUS hooks | Standalone file (`use-gus-lookup.ts`) | Inside `use-api.ts` |
| `useGusSearch`, `useGusValidate` | ❌ | ✅ |
| `useExchangeRate`, `useConvertCurrency` | ❌ | ✅ |
| `useCategorizeWithAI` | ❌ | ✅ |
| `useInvoiceAttachments`, `useUploadAttachment`, `useDeleteAttachment` | ❌ (via document sidebar) | ✅ |
| `useInvoiceDocument`, `useUploadDocument`, `useDeleteDocument` | ❌ (in api.ts) | ✅ |
| `useDocumentConfig` | ❌ | ✅ |
| `useCreateManualInvoice` | ❌ (uses `api.invoices.create` directly) | ✅ |
| Toast hook | `use-toast.ts` (custom reducer) | Uses `sonner` (no custom hook) |
| Avatar hook | `useAvatar` (Graph API) | ❌ |
| `useDvSessions`, `useDvActiveSession`, `useDvSyncLogs`, etc. | ✅ | ❌ |
| `useGrantKsefPermissions` | ✅ | ❌ |
| `useKsefTestdataEnvironments` | ✅ | ❌ |

---

### 3.12 Lib / Utils

| Module | `web` | `code-app` | Notes |
|---|:---:|:---:|---|
| `api.ts` | ✅ (large, contains types + query keys) | ✅ (smaller, focused on API calls) | web monolithic, code-app split |
| `auth-config.ts` | ✅ (`NEXT_PUBLIC_*`) | ✅ (`VITE_*`) | Same MSAL config, different env vars |
| `auth-logger.ts` | ✅ (187 lines) | ❌ | Auth event logging |
| `export.ts` | ✅ (comma separator, Polish headers) | ✅ (semicolon + BOM, English headers) | Different CSV formatting |
| `format.ts` | ❌ (inline formatting) | ✅ (centralised) | `formatCurrency`, `formatDate`, `formatRelativeDate`, `formatCurrencyCompact`, `formatNumber` |
| `graph-service.ts` | ✅ (202 lines) | ❌ | Microsoft Graph API (avatars, groups) |
| `pdf-thumbnail.ts` | ✅ (163 lines) | ❌ | PDF page thumbnail via pdfjs |
| `query-keys.ts` | ❌ (in `api.ts`) | ✅ (94 lines, separate) | Centralised query key factories |
| `types.ts` | ❌ (in `api.ts`) | ✅ (884 lines, separate) | Full TypeScript interfaces |
| `utils.ts` | ✅ | ✅ | Standard utilities |

**Architecture note:** code-app has a **cleaner code organisation**, splitting types, query keys, and formatting into dedicated files. web keeps everything in `api.ts`, making it a very large file.

---

### 3.13 Contexts

Both have `contexts/company-context.tsx`:

| Aspect | `web` | `code-app` |
|---|---|---|
| Persistence | `document.cookie` | `localStorage` |
| Context value | `{ selectedCompanyId, setSelectedCompanyId, hasCompanies }` | `{ selectedCompanyId, setSelectedCompanyId, companies }` |
| Export helpers | `useSelectedCompany()` | — |
| Query invalidation | ✅ on change | ✅ on change |
| Auto-select | First company | First company |

---

### 3.14 UI Primitives (shadcn)

| Component | `web` | `code-app` |
|---|:---:|:---:|
| `alert.tsx` | ✅ | ❌ |
| `alert-dialog.tsx` | ✅ | ✅ |
| `avatar.tsx` | ✅ | ❌ |
| `badge.tsx` | ✅ | ✅ |
| `button.tsx` | ✅ | ✅ |
| `calendar.tsx` | ✅ | ❌ |
| `card.tsx` | ✅ | ✅ |
| `checkbox.tsx` | ✅ | ✅ |
| `collapsible.tsx` | ✅ | ❌ |
| `command.tsx` | ✅ | ❌ |
| `dialog.tsx` | ✅ | ✅ |
| `dropdown-menu.tsx` | ✅ | ✅ |
| `input.tsx` | ✅ | ✅ |
| `label.tsx` | ✅ | ✅ |
| `popover.tsx` | ✅ | ✅ |
| `progress.tsx` | ✅ | ✅ |
| `scroll-area.tsx` | ✅ | ✅ |
| `select.tsx` | ✅ | ✅ |
| `separator.tsx` | ✅ | ✅ |
| `sheet.tsx` | ✅ | ✅ |
| `skeleton.tsx` | ✅ | ✅ |
| `slider.tsx` | ✅ | ✅ |
| `sonner.tsx` | ❌ | ✅ |
| `table.tsx` | ✅ | ❌ |
| `tabs.tsx` | ✅ | ✅ |
| `textarea.tsx` | ✅ | ✅ |
| `toast.tsx` / `toaster.tsx` | ✅ | ❌ (uses sonner) |
| `tooltip.tsx` | ✅ | ✅ |
| `user-avatar.tsx` | ✅ | ❌ |
| `index.ts` (barrel) | ❌ | ✅ |

---

### 3.15 i18n / Messages

| Aspect | `web` | `code-app` |
|---|---|---|
| Library | `next-intl` | `react-intl` |
| Config files | `config.ts`, `navigation.ts`, `request.ts`, `routing.ts` | `config.ts`, `index.ts`, `intl.ts`, `store.ts` |
| Locale persistence | URL path (`/pl/…`, `/en/…`) | `localStorage` + Zustand store |
| Message flattening | Handled by `next-intl` | Manual `flattenMessages()` in `intl.ts` |
| Languages | `pl`, `en` | `pl`, `en` |

**Message namespaces:**

| Namespace | `web` | `code-app` |
|---|:---:|:---:|
| `common` | ✅ | ✅ |
| `navigation` | ✅ | ✅ |
| `header` | ✅ | ✅ |
| `dashboard` | ✅ | ✅ |
| `invoices` | ✅ | ✅ |
| `scanner` | ❌ | ✅ |
| `pagination` | ❌ | ✅ |
| `sync` | ✅ | ✅ |
| `settings` | ✅ | ✅ |
| `reports` | ✅ | ✅ |
| `forecast` | ✅ | ✅ |
| `auth` | ✅ | ✅ |
| `errors` | ✅ | ✅ |
| `language` | ✅ | ✅ |
| `changelog` | ❌ | ✅ |

---

## 4. What Is in `web` but MISSING from `code-app`

### Critical — Feature Gaps

| Feature | web Location | Impact |
|---|---|---|
| **Document management system** (6 components) | `components/documents/` | No document upload, preview, extraction, or viewer in code-app |
| **Document dropzone** (drag & drop upload) | `components/documents/document-dropzone.tsx` | Cannot drag/drop documents onto invoices |
| **Extraction preview** (extracted data viewer) | `components/documents/extraction-preview.tsx` | Cannot preview OCR-extracted invoice data |
| **Invoice document sidebar** | `components/documents/invoice-document-sidebar.tsx` | No document panel in invoice detail |
| **Invoice document viewer** (PDF/image) | `components/documents/invoice-document-viewer.tsx` | Cannot view attached PDFs/images inline |
| **Floating scanner button** | `components/documents/floating-scanner-button.tsx` | No FAB for quick document scanning |
| **Skeleton loaders** (4 components) | `components/skeletons/` | Worse perceived loading performance |
| **Home page** (KPI + quick actions) | `app/[locale]/page.tsx` | No landing page, jumps straight to dashboard |

### Moderate — Utility Gaps

| Feature | web Location | Impact |
|---|---|---|
| **PDF thumbnail generation** | `lib/pdf-thumbnail.ts` | Cannot generate page thumbnails from PDFs |
| **Microsoft Graph avatars** | `lib/graph-service.ts` + `hooks/useAvatar.ts` | No user avatar photos |
| **Auth event logger** | `lib/auth-logger.ts` | No auth event tracking/debugging |
| **`useHasRole` / `<RequireRole />`** | `components/auth/auth-provider.tsx` | Less flexible role-checking (code-app only has `isAdmin` boolean) |
| **Branded sign-in screen** | `components/auth/signin-screen.tsx` | code-app has simpler auth-gate |
| **Standalone company selector** | `components/layout/company-selector.tsx` | Inline in header, harder to reuse |
| **Standalone language switcher** | `components/layout/language-switcher.tsx` | Inline in header, harder to reuse |
| **Dataverse session hooks** | `useDvSessions`, `useDvActiveSession`, `useDvSyncLogs`, etc. | Cannot manage Dataverse sync sessions |
| **KSeF permission grant** | `useGrantKsefPermissions` | Cannot grant KSeF test permissions |
| **KSeF testdata environments** | `useKsefTestdataEnvironments` | Cannot list test environments |
| **`useContext*` wrapper hooks** | `hooks/use-api.ts` | Must manually inject company context |

### Minor — UI Component Gaps

| Component | Notes |
|---|---|
| `ui/alert.tsx` | Alert banner component |
| `ui/avatar.tsx` | Avatar primitive |
| `ui/calendar.tsx` | Date picker calendar |
| `ui/collapsible.tsx` | Collapsible section |
| `ui/command.tsx` | Command palette / combobox |
| `ui/table.tsx` | Table component |
| `ui/toast.tsx` / `ui/toaster.tsx` | Toast system (code-app uses sonner instead) |
| `ui/user-avatar.tsx` | User avatar with Graph photo fallback |

---

## 5. What Is in `code-app` but MISSING from `web`

| Feature | code-app Location | Impact |
|---|---|---|
| **AI categorization** | `useCategorizeWithAI` hook | Cannot auto-categorize invoices with AI |
| **Currency exchange rate lookup** | `useExchangeRate`, `useConvertCurrency` hooks | Cannot look up exchange rates for foreign invoices |
| **Classification edit dialog** | `components/invoices/classification-edit-dialog.tsx` | No dedicated dialog for editing MPK/category with AI assist |
| **Invoice attachment CRUD** | `components/invoices/attachments-section.tsx` | web uses document sidebar instead |
| **GUS lookup dialog** | `components/invoices/gus-lookup-dialog.tsx` | web has GUS in `use-gus-lookup.ts` hook but no dedicated dialog |
| **Client-side pagination** | `components/invoices/invoice-pagination.tsx` | web loads all invoices (no pagination) |
| **Centralised format utils** | `lib/format.ts` | web formats inline, inconsistently |
| **Centralised query keys** | `lib/query-keys.ts` | web has them buried in api.ts |
| **Centralised type definitions** | `lib/types.ts` (884 lines) | web has types in api.ts |
| **Zustand locale store** | `i18n/store.ts` | web uses next-intl URL-based routing |
| **`scanner` message namespace** | `messages/en.json` | web has scanner strings elsewhere |
| **`pagination` message namespace** | `messages/en.json` | web has no pagination |
| **`changelog` message namespace** | `messages/en.json` | web has changelog strings elsewhere |
| **UI barrel export** (`ui/index.ts`) | `components/ui/index.ts` | Cleaner imports |
| **Sonner toast** | `components/ui/sonner.tsx` | Different toast library |

---

## 6. Functional Differences in Shared Features

### 6.1 Invoice List

| Aspect | `web` | `code-app` |
|---|---|---|
| Lines of code | ~1193 | ~579 |
| Description status tracking | ✅ (tracks categories/descriptions per invoice) | ❌ |
| Mobile card view | ✅ (responsive card layout) | ❌ |
| Floating scanner button | ✅ | ❌ |
| Grouping | By month, supplier, or none | By month, supplier, or none |
| Pagination | None (loads all) | ✅ (client-side, 25/page) |
| Export CSV | ✅ | ✅ |

### 6.2 Manual Invoice Creation

| Aspect | `web` | `code-app` |
|---|---|---|
| GUS lookup | Via `use-gus-lookup.ts` (debounce, auto-lookup, recent suppliers) | Via `gus-lookup-dialog.tsx` (modal dialog) |
| Currency support | PLN only | PLN, EUR, USD with exchange rate lookup |
| Exchange rate | ❌ | ✅ (NBP API via `useExchangeRate`) |

### 6.3 Invoice Detail

| Aspect | `web` | `code-app` |
|---|---|---|
| Document sidebar | ✅ (full viewer, upload, download, delete, fullscreen) | ❌ |
| Attachments | Via document sidebar | Dedicated `AttachmentsSection` component |
| Notes | `InvoiceNotesSection` component | `NotesSection` component |
| Classification editing | Inline fields | `ClassificationEditDialog` with AI suggestions |
| Edit mode for manual invoices | ✅ | ✅ |

### 6.4 Dashboard

| Aspect | `web` | `code-app` |
|---|---|---|
| Data source | `useContextDashboardStats` (auto company) | `useDashboardStats` (manual settingId) |
| Charts library | Recharts | Recharts |
| Date range filter | ❌ | ✅ |
| Pie chart | ❌ | ✅ (MPK distribution) |
| Home page KPIs | ✅ (on `/`, separate from `/dashboard`) | ❌ |

### 6.5 Reports

| Aspect | `web` | `code-app` |
|---|---|---|
| Data computation | Client-side from raw invoices | Server-side via `useDashboardStats` |
| Performance | Slower (fetches all invoices) | Faster (pre-aggregated) |

### 6.6 CSV Export

| Aspect | `web` | `code-app` |
|---|---|---|
| Separator | Comma (`,`) | Semicolon (`;`) |
| Encoding | UTF-8 | UTF-8 with BOM |
| Headers language | Polish | English |
| Filename | `faktury-ksef-{date}.csv` | `invoices-{date}.csv` |

### 6.7 Auth Provider

| Aspect | `web` | `code-app` |
|---|---|---|
| Role checking | `useHasRole(role)`, `<RequireRole roles={[…]}>` | `isAdmin` boolean in context |
| Sign-in UI | Branded `SignInScreen` with background image | Simple `AuthGate` with `UnauthenticatedTemplate` |
| Auth logging | ✅ (`auth-logger.ts`) | ❌ |
| Graph API integration | ✅ (avatars, group names) | ❌ |

---

## 7. Implementation Suggestions

### Priority 1 — Add to `code-app` (High Impact)

1. **Document Management System**
   - Port `components/documents/` from web → code-app
   - Add `pdfjs-dist` dependency for PDF thumbnails
   - Create document-related hooks in `use-api.ts` (partially done: `useInvoiceDocument`, `useUploadDocument`, `useDeleteDocument` already exist)
   - Add `InvoiceDocumentSidebar` to invoice detail page
   - Add `FloatingScannerButton` to invoice list

2. **Skeleton Loaders**
   - Create `components/skeletons/` directory
   - Add dashboard, invoice-table, settings, and generic skeletons
   - Replace simple loading spinners with skeleton UIs for better UX

3. **Mobile Invoice Cards**
   - Add responsive card layout to invoice list for mobile viewports
   - web already has this pattern in its 1193-line invoices page

### Priority 2 — Add to `code-app` (Medium Impact)

4. **User Avatars**
   - Add `graph-service.ts` and `useAvatar` hook
   - Add `ui/avatar.tsx` and `ui/user-avatar.tsx` components
   - Show user photos in header user menu

5. **Home / Landing Page**
   - Add a home page (`/`) with KPI summary, quick actions, and recent activity
   - Route dashboard to `/dashboard` separately

6. **Flexible Role Checking**
   - Replace `isAdmin` boolean with `useHasRole(role)` pattern
   - Add `<RequireRole />` component for route protection

7. **Auth Event Logger**
   - Port `auth-logger.ts` for better debugging of auth issues

### Priority 3 — Add to `web` (to match code-app)

8. **AI Categorization**
   - Add `useCategorizeWithAI` hook
   - Add classification edit dialog with AI suggestions

9. **Currency Exchange Rate**
   - Add `useExchangeRate` and `useConvertCurrency` hooks
   - Support EUR/USD invoices with NBP exchange rates

10. **Client-Side Pagination**
    - Add pagination to invoice list to improve performance with large datasets

11. **Centralised Formatting**
    - Extract inline formatting into a shared `lib/format.ts`
    - Ensure consistent currency/date formatting across pages

### Priority 4 — Architecture Improvements

12. **Code Organisation (web)**
    - Split `api.ts` into `types.ts`, `query-keys.ts`, and `api.ts`
    - Match code-app's cleaner separation of concerns

13. **Reports Data Source (web)**
    - Switch from client-side computation to server-side aggregation
    - Use the same `dashboardStats` endpoint as code-app for better performance

14. **Consistent CSV Export**
    - Align separator, encoding, and header language between both apps
    - Use semicolon + BOM for Excel compatibility in Polish locale

---

*Report generated from complete source analysis of both `web/` and `code-app/` directories.*
