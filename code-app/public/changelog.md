# Changelog

All notable changes to the **KSeF Copilot — Code App** (Vite + React SPA) are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.1.0] - 2026-02-14

### ✅ Tests — Phase 5 & 6 Coverage

- **sync-phase5.test.tsx** (26 tests) — page rendering, preview table, KSeF portal links, checkbox selection, sync/import actions, session control, scenarios for no active session and no preview data
- **settings-phase5.test.tsx** (37 tests) — 4-tab navigation, Companies CRUD (NIP, badges, token status, add/edit/delete/test), Cost Centers CRUD, Test Data Generator (sliders, generate, cleanup), System Status (health, services, response times, refresh)
- **phase6-components.test.tsx** (23 tests) — EnvironmentBanner (color per env, null without company), KsefSyncButton (renders, calls mutate, styling), SystemStatusBadge (healthy/degraded/unhealthy colors), ChangelogModal (open/close, fetch, markdown, fallback), useTripleClick hook
- **invoice-edit-phase6.test.tsx** (6 tests) — edit button visibility for manual vs KSeF invoices, edit form pre-fill, cancel, save calls updateInvoice
- **Test infrastructure fixes**: ResizeObserver polyfill for Radix Slider, TooltipProvider wrapping, `getAllByText` for desktop+mobile dual rendering
- **Total: 200 tests passing across 11 test files**

---

## [2.0.0] - 2026-02-13

### ✨ Phase 5 — Sync & Settings

- **Selective Import** — checkbox selection of invoices to import from KSeF preview
- **Select All / Deselect All** — bulk selection toggle for new invoices
- **Import Selected** — import only selected invoices with reference number tracking
- **KSeF Portal Links** — direct links to verify invoices on ksef-test.mf.gov.pl / ksef.mf.gov.pl
- **Operation Log** — terminal-style sync operation log with timestamped entries
- **Tabbed Settings** — 4-tab layout: Companies, Cost Centers, Test Data, System Status
- **Company Inline Edit** — edit company name and invoice prefix without leaving the page
- **Cost Center CRUD** — full create/edit/delete for cost centers with active/inactive badge
- **Test Data Generator** — generate invoices with sliders (count, paid%, KSeF%), date range, cleanup preview
- **Health Dashboard** — service-level health with response times, summary counts, auto-refresh (60s)

### ✨ Phase 6 — Polish & UX

- **Environment Banner** — 1px colored strip (orange=test, teal=production, navy=demo)
- **Quick Sync Button** — one-click KSeF sync (last 30 days) from the header
- **System Status Badge** — CircleDot health indicator with color-coded tooltip in header
- **Changelog Modal** — fetches `/changelog.md`, renders with react-markdown, hidden behind triple-click easter egg
- **useTripleClick Hook** — custom hook for triple-click detection with 500ms timeout
- **Edit Manual Invoices** — inline edit form for supplier, amounts, dates (manual invoices only)
- **Mobile Preview Cards** — responsive mobile layout for sync preview table
- **Consistent Button Component** — replaced all anchor/div-based buttons with shadcn/ui Button

---

## [1.3.0] - 2026-02-12

### ✨ Phase 4 — Dashboard & Analytics

- **Dashboard KPI Cards** — 4 animated cards (total invoices, gross sum, paid, pending) with AnimatedKpiCard
- **framer-motion Animations** — staggered card entry animations
- **react-countup** — animated number counters in KPI tiles
- **Revenue Trend Chart** — area chart with monthly revenue data (Recharts)
- **Recent Activity Feed** — latest invoice import events
- **KSeF Status Widget** — connection status and last sync time
- **Quick Actions Panel** — shortcuts to sync, scan, add invoice

### 🧪 Tests

- **dashboard-phase4.test.tsx** (39 tests) — KPI tiles rendering, chart labels, recent activity, KSeF widget, quick actions, edge cases

---

## [1.2.0] - 2026-02-11

### ✨ Phase 3 — Invoice List Enhancements

- **Export to CSV** — download filtered invoice list as CSV
- **Date Range Filter** — filter invoices by date range picker
- **Payment Status Filters** — quick filter buttons (All, Paid, Pending, Overdue)
- **Description Status Filters** — filter by AI classification state (No description, AI Suggestion, Described)
- **Sorting** — clickable column headers with ascending/descending toggle
- **Search** — real-time search across invoice number, supplier name, NIP
- **Responsive Layout** — mobile card view for invoice list

### 🧪 Tests

- **invoice-phase3.test.tsx** (20 tests) — filters, search, sorting, export, responsive view

---

## [1.1.0] - 2026-02-10

### ✨ Phase 2 — Invoice Detail

- **Invoice Detail Page** — full view with supplier info, amounts, dates, VAT breakdown
- **Payment Status** — mark as paid/unpaid with optimistic updates
- **Classification Edit** — edit MPK, category, description via dialog
- **AI Suggestions Panel** — display and accept AI-generated MPK/category suggestions
- **Attachments Section** — upload/download/delete invoice attachments
- **Notes Section** — add/edit/delete notes on invoices
- **GUS Lookup** — verify supplier via GUS (REGON) API
- **Exchange Rate** — display NBP exchange rate for foreign currency invoices

### 🧪 Tests

- **invoice-phase2.test.tsx** (18 tests) — rendering, payment actions, classification, attachments, notes

---

## [1.0.0] - 2026-02-09

### 🎉 Phase 0 & 1 — Initial Release

- **Vite + React 19 SPA** — standalone frontend (no Next.js dependency)
- **React Router DOM 7** — client-side routing with sidebar navigation
- **react-intl (i18n)** — full Polish/English translations
- **Azure Entra ID Auth** — MSAL authentication with group-based roles (Admin/User)
- **Company Context** — multi-company support with company selector
- **shadcn/ui Components** — consistent UI with Tailwind CSS 4
- **Dark/Light Theme** — theme toggle with system preference detection
- **API Layer** — shared hooks connecting to Azure Functions API (`/api/*`)
- **Dashboard** — placeholder with navigation
- **Invoice List** — basic data table with pagination
- **Settings** — company management (add/delete)
- **Sync** — basic KSeF sync with date range

### 🧪 Tests

- **setup.test.ts** (3 tests) — utility functions, i18n config
- **api.test.ts** (12 tests) — API client, error handling
- **hooks.test.tsx** (12 tests) — React Query hooks
- **auth-provider.test.tsx** (4 tests) — authentication provider

---

*Part of the [Developico KSeF](https://github.com/developico) platform. Companion to the [web](../web/) Next.js frontend.*
