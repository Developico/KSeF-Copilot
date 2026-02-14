# Phase 5 & Phase 6 — Detailed Implementation Plan

> Generated: 2026-02-14  
> Scope: Feature parity between `code-app` (Vite+React SPA) and `web` (Next.js)

---

## Phase 5 — Sync & Settings Improvements

### 5.1 Sync — Selective Import (checkboxes)

**What web has:** Checkboxes per invoice row + "Select all new" + "Import selected" button. Uses `useImportInvoices` hook + `Checkbox` component.

**What code-app has:** Preview table (read-only) + "Sync All" button. No checkboxes, no selective import.

**What to implement:**
- Add `Checkbox` column to the preview table in sync page
- Add `selectedInvoices` state (`Set<string>`) for tracking selections
- Add "Select all / Deselect all" toggle in table header
- Add "Import selected (N)" button conditionally visible when selections exist
- Need: `useImportInvoices` hook (web has it, **code-app does NOT** — must add to `use-api.ts` and `api.ts`)

| Action | File | Reference |
|--------|------|-----------|
| **Create** hook `useImportInvoices` | `src/hooks/use-api.ts` | [web use-api.ts](../web/src/hooks/use-api.ts) — `useImportInvoices` |
| **Add** API method `api.importInvoices()` | `src/lib/api.ts` | [web api.ts](../web/src/lib/api.ts) — `importInvoices` |
| **Add** type `ImportInvoicesRequest` / `ImportInvoicesResponse` | `src/lib/types.ts` | Match web types |
| **Modify** `src/pages/sync.tsx` | Add checkbox column, select state, import button | [web sync page.tsx L50-590](../web/src/app/[locale]/sync/page.tsx) |
| **Already have:** `Checkbox` component | `src/components/ui/checkbox.tsx` | ✅ exists |

**i18n keys to add (en.json / pl.json):**
- `sync.importSelected` — already in en.json ✅
- `sync.selectAll` — already in en.json ✅ 
- `sync.deselectAll` — already in en.json ✅

---

### 5.2 Sync — Operation Log (terminal-style)

**What web has:** `syncLog` state array, `addLog()` helper that timestamps entries, a `<Card>` with monospace `<div>` rendered in `ScrollArea`, showing timestamped log entries for session start/end, sync start, results, errors.

**What code-app has:** Only sync result toast/inline message. No log panel.

**What to implement:**
- Add `syncLog` state (`string[]`) to sync page
- Add `addLog(msg)` helper with timestamp formatting
- Insert log calls at: session start/end, sync start, sync result, errors
- Render log card at bottom of page (conditional on `syncLog.length > 0`)
- Style: `bg-muted rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs`

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/sync.tsx` | Add syncLog state + addLog + log rendering card | [web sync page.tsx L112-130, L560-580](../web/src/app/[locale]/sync/page.tsx) |
| **Already have:** `ScrollArea` component | `src/components/ui/scroll-area.tsx` | ✅ exists |

**i18n keys to add:**
- `sync.syncLog` — already in en.json ✅
- `sync.initSession`, `sync.sessionStarted`, `sync.sessionError`, `sync.closingSession`, `sync.sessionClosed` — **MISSING, add to en.json & pl.json**
- `sync.startingFullSync`, `sync.syncResult`, `sync.syncError`, `sync.importingSelected`, `sync.importResult`, `sync.importError` — **MISSING, add**
- `sync.sessionCloseError` — **MISSING**

---

### 5.3 Sync — KSeF Portal Links

**What web has:** Each invoice row has an `<ExternalLink>` icon linking to `https://ap.ksef.mf.gov.pl/invoice/{ksefReferenceNumber}`.

**What code-app has:** No links.

**What to implement:**
- Add `getKsefPortalLink()` helper function
- Add ExternalLink icon button per invoice row in preview table

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/sync.tsx` | Add link column/icon per invoice row | [web sync page.tsx L103, L436-445](../web/src/app/[locale]/sync/page.tsx) |

**i18n keys:**
- `sync.openInKsef` — **MISSING, add to en.json & pl.json**

---

### 5.4 Settings — Tabbed UI (Tabs component)

**What web has:** 4-tab interface: Companies, Cost Centers, Test Data, System Status. Uses shadcn `Tabs` component.

**What code-app has:** Single flat list with Companies card + Cost Centers card (read-only). No tabs.

**What to implement:**
- Wrap settings content in `<Tabs>` with `<TabsList>` + `<TabsTrigger>` + `<TabsContent>`
- Tab 1: Companies (existing, enhanced)
- Tab 2: Cost Centers (existing, needs CRUD)
- Tab 3: Test Data Generator (new)
- Tab 4: System Status (new)

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/settings.tsx` | Wrap in Tabs | [web settings page.tsx L480-500](../web/src/app/[locale]/settings/page.tsx) |
| **Already have:** `Tabs` component | `src/components/ui/tabs.tsx` | ✅ exists |

---

### 5.5 Settings — Cost Center CRUD

**What web has:** Read-only table of cost centers (note: web simplified this tab to read-only with info banner). Edit/delete used to work via dialogs.

**What code-app has:** Read-only list of cost centers with code + active badge. No add/edit/delete.

**What to implement:**
- Add "Add cost center" button & dialog (code + name + isActive)
- Add edit button per row → edit dialog
- Add delete button per row → confirm dialog
- Use existing hooks: `useCreateCostCenter`, `useUpdateCostCenter`, `useDeleteCostCenter` (all exist in code-app's use-api.ts ✅)

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/settings.tsx` | Add CRUD UI in cost centers tab | [web settings page.tsx L870-940](../web/src/app/[locale]/settings/page.tsx) |
| **Already have:** hooks | `useCreateCostCenter`, `useUpdateCostCenter`, `useDeleteCostCenter` | ✅ in `use-api.ts` |
| **Already have:** `Dialog` component | `src/components/ui/dialog.tsx` | ✅ exists |

**i18n keys to add:**
- `settings.addCostCenter`, `settings.editCostCenter`, `settings.costCenterCode`, `settings.costCenterName` — **MISSING**
- `settings.costCenterAdded`, `settings.costCenterUpdated`, `settings.costCenterDeleted` — **MISSING**
- `settings.costCentersInfoTitle`, `settings.costCentersInfoDesc` — **MISSING**

---

### 5.6 Settings — Test Data Generator

**What web has:** Full test data generator tab with:
- Company selector (filtered to test/demo only)
- Slider for invoice count (1-100)
- Date range picker (from/to)
- Source mix slider (KSeF vs Manual %)
- Paid percentage slider
- Clear existing data checkbox
- Generate button
- Cleanup/manage section with preview + delete

**What code-app has:** Nothing — no test data UI at all.

**What to implement:**
- New `TabsContent` for test data
- Company selector (filter test/demo only)
- Slider for count, date pickers, source/paid sliders
- Checkbox for clear-before
- Generate/cleanup buttons
- Use existing hooks: `useGenerateTestData`, `useKsefCleanupPreview`, `useKsefCleanup` (all exist ✅)

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/settings.tsx` | Add test data generator tab content | [web settings page.tsx L945-1110](../web/src/app/[locale]/settings/page.tsx) |
| **Already have:** hooks | `useGenerateTestData`, `useKsefCleanupPreview`, `useKsefCleanup` | ✅ in `use-api.ts` |
| **Already have:** `Slider` component | `src/components/ui/slider.tsx` (check — may not exist) | Verify; if missing, add via shadcn |
| **Already have:** `Select` component | `src/components/ui/select.tsx` | ✅ exists |
| **Already have:** `Checkbox` component | `src/components/ui/checkbox.tsx` | ✅ exists |
| **Already have:** `Label` component | `src/components/ui/label.tsx` | ✅ exists |

**i18n keys to add (many):**
- `settings.testData`, `settings.testDataGenerator`, `settings.testDataGeneratorDesc` — **MISSING**
- `settings.numberOfInvoices`, `settings.invoicesRange`, `settings.dateRange` — **MISSING**
- `settings.sourceMix`, `settings.sourceMixDesc`, `settings.previewSources` — **MISSING**
- `settings.ksefInvoices`, `settings.manualInvoices` — **MISSING**
- `settings.paidPercentage`, `settings.paidPercentageDesc`, `settings.willBePaid` — **MISSING**
- `settings.clearExistingData`, `settings.clearExistingDataDesc` — **MISSING**
- `settings.generateTestInvoices`, `settings.generating` — **MISSING**
- `settings.generationCompleted`, `settings.generatedDesc`, `settings.generationError` — **MISSING**
- `settings.productionNotAllowed`, `settings.environmentDetected` — **MISSING**
- `settings.manageTestData`, `settings.manageTestDataDesc` — **MISSING**
- `settings.currentTestData`, `settings.noTestData`, `settings.testInvoicesFound` — **MISSING**
- `settings.fromKsef`, `settings.fromManual` — **MISSING**
- `settings.deleteAllTestData`, `settings.cleanupCompleted`, `settings.cleanupCompletedDesc`, `settings.cleanupError` — **MISSING**
- `settings.selectCompany`, `settings.company`, `settings.onlyTestDemo`, `settings.companyRequired` — **MISSING**
- `settings.from`, `settings.to`, `settings.loadingPreview` — **MISSING**

---

### 5.7 Settings — Health Status Panel

**What web has:** Dedicated system status tab showing per-service health with response times, overall status badge, refresh button. Uses `HealthStatusPanel` component + `useHealthDetailed` hook.

**What code-app has:** Nothing — no health panel.

**What to implement:**
- Create `src/components/health/health-status-panel.tsx` (port from web)
- Add as content in Settings "System Status" tab
- Use existing hook: `useHealthDetailed` ✅

| Action | File | Reference |
|--------|------|-----------|
| **Create** `src/components/health/health-status-panel.tsx` | Port from web, adapt `'use client'` → remove, `useTranslations` → `useIntl` | [web health-status-panel.tsx](../web/src/components/health/health-status-panel.tsx) |
| **Modify** `src/pages/settings.tsx` | Import & render in system tab | — |
| **Already have:** hook | `useHealthDetailed` | ✅ in `use-api.ts` |

---

### 5.8 Settings — Manual-only Toggle & Invoice Prefix

**What web has:** 
- Manual-only checkbox in add company dialog (disables KSeF env selection, sets autoSync=false)
- Invoice prefix field (max 10 chars) in both add and edit company dialogs
- Edit company dialog with name, env, prefix, autoSync fields+

**What code-app has:** 
- Basic add company form (name, NIP, env select) — inline, not dialog
- No manual-only toggle
- No invoice prefix field
- No edit company at all (only add + delete)

**What to implement:**
- Add `manualOnly` checkbox to add company form/dialog
- Add `invoicePrefix` field to add company form/dialog
- Add `useUpdateCompany` hook usage for edit (hook exists ✅)
- Add edit company dialog (or inline edit form)

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/settings.tsx` | Add fields to company form, add edit capability | [web settings page.tsx L528-570, L770-870](../web/src/app/[locale]/settings/page.tsx) |
| **Already have:** hook | `useUpdateCompany` | ✅ in `use-api.ts` |

**i18n keys to add:**
- `settings.editCompany`, `settings.companyUpdated`, `settings.companyUpdatedDesc`, `settings.updateCompanyError` — **MISSING**
- `settings.manualOnlyLabel`, `settings.manualOnlyDesc` — **MISSING**
- `settings.invoicePrefix`, `settings.invoicePrefixPlaceholder`, `settings.invoicePrefixDesc` — **MISSING**
- `settings.ksefEnvironment`, `settings.ksefEnvironmentDesc` — **MISSING**
- `settings.addNewCompany`, `settings.addNewCompanyDesc`, `settings.companyNamePlaceholder`, `settings.nipPlaceholder` — **MISSING**
- `settings.companyAdded`, `settings.companyAddedDesc`, `settings.companyDeleted`, `settings.companyDeletedDesc` — **MISSING**
- `settings.companySelected`, `settings.activeCompany` — **MISSING**
- `settings.selected`, `settings.active`, `settings.inactive` — **MISSING**

---

## Phase 6 — Polish & UX (Banners, Badges, Changelog)

### 6.1 Environment Banner (PROD/TEST/DEMO)

**What web has:** A thin 4px colored strip at the very top of the page indicating the KSeF environment:
- PROD: Teal `#23edd1`
- TEST: Orange `#f59e0b`  
- DEMO: Navy `#174372`

Implemented as `<EnvironmentBanner>` in `page-wrapper.tsx`, immediately above the Header. Also exports `EnvironmentBadge` (used in company selector) and `getEnvironmentConfig()`.

**What code-app has:** Nothing.

**What to implement:**
- Create `src/components/layout/environment-banner.tsx` with `EnvironmentBanner` + `EnvironmentBadge` + `getEnvironmentConfig()`
- Import `useCompanyContext` for selected company environment
- Render in `AppLayout` above `<Header />`

| Action | File | Reference |
|--------|------|-----------|
| **Create** `src/components/layout/environment-banner.tsx` | Port from web, replace `useSelectedCompany` with `useCompanyContext` | [web environment-banner.tsx](../web/src/components/layout/environment-banner.tsx) |
| **Modify** `src/components/layout/app-layout.tsx` | Add `<EnvironmentBanner />` above `<Header />` | [web page-wrapper.tsx](../web/src/components/layout/page-wrapper.tsx) |

**No i18n keys needed** (hardcoded labels: PROD/TEST/DEMO).

---

### 6.2 KSeF Sync Button in Header

**What web has:** A small sync icon button (`RefreshCw`) in the header's right-side action bar. Triggers `useRunSync` for the last 30 days. Shows spinner while syncing. Invalidates invoice queries on success. Shows toast for success/error.

**What code-app has:** Nothing — sync only from dedicated `/sync` page.

**What to implement:**
- Create `src/components/layout/ksef-sync-button.tsx`
- Quick-sync last 30 days for selected company
- Show spinner state, toast on complete/error
- Add to header between company selector and language switcher

| Action | File | Reference |
|--------|------|-----------|
| **Create** `src/components/layout/ksef-sync-button.tsx` | Port from web, adapt `useTranslations` → `useIntl`, `useToast` → `sonner` toast | [web ksef-sync-button.tsx](../web/src/components/layout/ksef-sync-button.tsx) |
| **Modify** `src/components/layout/header.tsx` | Import & render `<KsefSyncButton />` | [web header.tsx L147](../web/src/components/layout/header.tsx) |
| **Already have:** hook | `useRunSync` | ✅ in `use-api.ts` |

---

### 6.3 System Status Badge in Header

**What web has:** A small icon button in the header showing system health status:
- Green checkmark (`CheckCircle`) = all healthy
- Yellow alert (`AlertCircle`) = degraded
- Red X (`XCircle`) = unhealthy
- Spinner while loading
- Tooltip showing service details on hover

**What code-app has:** Nothing.

**What to implement:**
- Create `src/components/health/system-status-badge.tsx`
- Uses `useHealthDetailed` hook (exists ✅)
- Add to header between sync button and language switcher

| Action | File | Reference |
|--------|------|-----------|
| **Create** `src/components/health/system-status-badge.tsx` | Port from web, adapt Next.js patterns to React | [web system-status-badge.tsx](../web/src/components/health/system-status-badge.tsx) |
| **Modify** `src/components/layout/header.tsx` | Import & render `<SystemStatusBadge />` | [web header.tsx L150](../web/src/components/layout/header.tsx) |
| **Already have:** `Tooltip` component | `src/components/ui/tooltip.tsx` | ✅ exists |
| **Already have:** hook | `useHealthDetailed` | ✅ in `use-api.ts` |

---

### 6.4 Changelog Modal

**What web has:** 
- `ChangelogModal` component: fetches `/changelog.md`, renders with `react-markdown` in a slide-down modal
- **Easter egg trigger:** Triple-click on logo in header opens it
- Shows app version, loading spinner, styled markdown rendering

**What code-app has:** Nothing. The header logo has no click handler.

**What to implement:**
- Create `src/components/layout/changelog-modal.tsx` — port from web
- Create `public/changelog.md` — copy from web or create code-app specific version
- Add triple-click easter egg to logo in header
- Note: `react-markdown` is already installed in code-app ✅ (check `package.json`)

| Action | File | Reference |
|--------|------|-----------|
| **Create** `src/components/layout/changelog-modal.tsx` | Port from web, remove `'use client'`, replace Next.js Image if any | [web changelog-modal.tsx](../web/src/components/layout/changelog-modal.tsx) |
| **Create** `public/changelog.md` | Copy from web or create fresh | [web changelog.md](../web/public/changelog.md) |
| **Modify** `src/components/layout/header.tsx` | Add triple-click handler on logo + render `<ChangelogModal />` | [web header.tsx L34-60, L200-210](../web/src/components/layout/header.tsx) |

**Verify dependency:** `react-markdown` in code-app's `package.json`.

---

### 6.5 Full Edit of Manual Invoices

**What web has:** Full edit form for manually-created invoices on the detail page — all fields editable (supplier, amounts, dates, etc.)

**What code-app has:** Read-only invoice detail. Only "Mark as Paid" action.

**What to implement:**
- Add edit mode toggle on invoice detail page
- Editable fields: supplier name/NIP, amounts, dates, payment status
- Use existing `useUpdateInvoice` hook ✅
- Only for manual invoices (source !== 'KSeF')

| Action | File | Reference |
|--------|------|-----------|
| **Modify** `src/pages/invoice-detail.tsx` | Add edit mode, form fields, save/cancel | [web invoice detail page](../web/src/app/[locale]/invoices/[id]/page.tsx) |
| **Already have:** hook | `useUpdateInvoice` | ✅ in `use-api.ts` |

---

## Summary — Files to Create

| # | File | Phase | Type |
|---|------|-------|------|
| 1 | `src/components/health/health-status-panel.tsx` | 5.7 | New component |
| 2 | `src/components/layout/environment-banner.tsx` | 6.1 | New component |
| 3 | `src/components/layout/ksef-sync-button.tsx` | 6.2 | New component |
| 4 | `src/components/health/system-status-badge.tsx` | 6.3 | New component |
| 5 | `src/components/layout/changelog-modal.tsx` | 6.4 | New component |
| 6 | `public/changelog.md` | 6.4 | New content |

## Summary — Files to Modify

| # | File | Phase(s) | Changes |
|---|------|----------|---------|
| 1 | `src/pages/sync.tsx` | 5.1, 5.2, 5.3 | Checkboxes, log panel, KSeF links |
| 2 | `src/pages/settings.tsx` | 5.4, 5.5, 5.6, 5.7, 5.8 | Tabs UI, cost center CRUD, test data, health panel, manual-only/prefix, company edit |
| 3 | `src/hooks/use-api.ts` | 5.1 | Add `useImportInvoices` hook |
| 4 | `src/lib/api.ts` | 5.1 | Add `importInvoices()` method |
| 5 | `src/lib/types.ts` | 5.1 | Add import request/response types |
| 6 | `src/components/layout/header.tsx` | 6.2, 6.3, 6.4 | Sync button, status badge, changelog easter egg |
| 7 | `src/components/layout/app-layout.tsx` | 6.1 | Environment banner |
| 8 | `src/pages/invoice-detail.tsx` | 6.5 | Full edit mode for manual invoices |
| 9 | `src/messages/en.json` | 5.2, 5.3, 5.5, 5.6, 5.8 | ~40 new keys |
| 10 | `src/messages/pl.json` | 5.2, 5.3, 5.5, 5.6, 5.8 | ~40 new keys |

## Existing Hooks Available (no creation needed)

| Hook | Used in Phase |
|------|---------------|
| `useRunSync` | 5.1, 6.2 |
| `useStartKsefSession` | 5.2 (log calls) |
| `useEndKsefSession` | 5.2 (log calls) |
| `useSyncPreview` | 5.1 (enriched) |
| `useCreateCostCenter` | 5.5 |
| `useUpdateCostCenter` | 5.5 |
| `useDeleteCostCenter` | 5.5 |
| `useGenerateTestData` | 5.6 |
| `useKsefCleanupPreview` | 5.6 |
| `useKsefCleanup` | 5.6 |
| `useHealthDetailed` | 5.7, 6.3 |
| `useHealth` | 6.3 |
| `useUpdateCompany` | 5.8 |
| `useUpdateInvoice` | 6.5 |
| `useCompanies` | 5.4 (exists) |
| `useCostCenters` | 5.5 (exists) |
| `useTestToken` | 5.8 (exists) |

## Existing UI Components Available

| Component | File | Used in |
|-----------|------|---------|
| `Tabs` | `src/components/ui/tabs.tsx` | 5.4 |
| `Checkbox` | `src/components/ui/checkbox.tsx` | 5.1, 5.6 |
| `Dialog` | `src/components/ui/dialog.tsx` | 5.5, 5.8, 6.4 |
| `Select` | `src/components/ui/select.tsx` | 5.6, 5.8 |
| `Label` | `src/components/ui/label.tsx` | 5.6 |
| `Input` | `src/components/ui/input.tsx` | 5.6, 5.8 |
| `Tooltip` | `src/components/ui/tooltip.tsx` | 6.3 |
| `ScrollArea` | `src/components/ui/scroll-area.tsx` | 5.2 |
| `Badge` | `src/components/ui/badge.tsx` | all |
| `Card` | `src/components/ui/card.tsx` | all |
| `Separator` | `src/components/ui/separator.tsx` | 5.5 |
| `Skeleton` | `src/components/ui/skeleton.tsx` | 5.7 |
| `Progress` | `src/components/ui/progress.tsx` | 5.7 |

## UI Components to Create

| Component | Needed by | Action |
|-----------|-----------|--------|
| `Slider` | 5.6 (test data count/percent) | **MISSING** — run `npx shadcn@latest add slider` |

## Dependency Check

| Package | Phase | Status |
|---------|-------|--------|
| `react-markdown` | 6.4 | ✅ installed (`^10.1.0`) |
| `lucide-react` | all | ✅ installed |
| `@tanstack/react-query` | all | ✅ installed |
| `react-intl` | all | ✅ installed |

## Estimated Effort

| Phase | Steps | Estimated Days |
|-------|-------|----------------|
| Phase 5 (Sync & Settings) | 8 steps | 2–3 days |
| Phase 6 (Polish & UX) | 5 steps | 1–2 days |
| **Total** | **13 steps** | **3–5 days** |
