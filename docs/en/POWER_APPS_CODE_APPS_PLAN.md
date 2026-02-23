# Power Apps Code Apps Plan

> **Polish version:** [POWER_APPS_CODE_APPS_PLAN.md](../pl/POWER_APPS_CODE_APPS_PLAN.md) | **English version:** [POWER_APPS_CODE_APPS_PLAN.md](./POWER_APPS_CODE_APPS_PLAN.md)

## Table of Contents
- [Overview](#overview)
- [Why Code Apps?](#why-code-apps)
- [Architecture](#architecture)
- [Implementation Phases](#implementation-phases)
  - [Phase 1 — Foundation](#phase-1--foundation)
  - [Phase 2 — Core Features](#phase-2--core-features)
  - [Phase 3 — AI Integration](#phase-3--ai-integration)
  - [Phase 4 — Optimization](#phase-4--optimization)
- [Technology Stack](#technology-stack)
- [Authentication Flow](#authentication-flow)
- [Code App Structure](#code-app-structure)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Risk Analysis](#risk-analysis)
- [Timeline and Estimates](#timeline-and-estimates)

---

## Overview

This document describes the plan for migrating from the **Next.js web application** to **Power Apps Code Apps** — a new Power Platform feature that allows embedding custom React/JavaScript applications directly within Model-Driven Apps.

### What Are Code Apps?

**Code Apps** (formerly "Custom Pages with Code Components") allow developers to:
- Build the full UI in **React + TypeScript** (or vanilla JS)
- Deploy directly to Power Platform via `pac code push`
- Integrate natively with Dataverse and Model-Driven Apps
- Use the **Power Apps component framework (PCF)** architecture

### Goal

Replace the standalone Next.js web frontend with a Code App embedded in the Model-Driven App, achieving:
- **Single platform** — everything runs in Power Platform
- **Native authentication** — no separate login flow
- **Seamless data access** — direct Dataverse connection via Component Framework API
- **Simplified deployment** — `pac code push` instead of managing App Service

---

## Why Code Apps?

### Comparison: Next.js Web vs. Code App

| Aspect | Next.js Web | Code App |
|--------|-------------|----------|
| Hosting | Azure App Service ($13+/month) | Power Platform (included) |
| Authentication | NextAuth.js + Entra ID | Automatic (Power Platform SSO) |
| Data access | REST API via Custom Connector | Direct Dataverse Client API |
| Deployment | CI/CD + Azure | `pac code push` |
| User management | Separate | Built-in (Power Platform roles) |
| Maintenance | Node.js + React + hosting | React only |
| Offline support | Limited | Power Platform offline capabilities |
| Mobile | Responsive web | Power Apps mobile app |

### Benefits

1. **Cost reduction** — eliminate App Service hosting costs
2. **Simplified architecture** — remove one deployment target
3. **Better security** — native Power Platform RBAC
4. **Mobile support** — Power Apps mobile app with offline
5. **Integration** — direct access to Model-Driven App features (views, dashboards, workflows)

### Risks

1. **Limited browser APIs** — Code Apps run in a sandbox
2. **Bundle size limits** — 16 MB max for the code package
3. **API restrictions** — some browser APIs are blocked in the sandbox
4. **New technology** — Code Apps are relatively new (GA in late 2025)
5. **Debugging** — less straightforward than standard web debugging

---

## Architecture

### Current Architecture (Next.js)

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Next.js Web │────▶│  Azure Functions  │────▶│  Dataverse   │
│  (App Service)│    │  (REST API)       │     │  (data)      │
└──────────────┘     └──────────────────┘     └─────────────┘
        │
  NextAuth.js
  (Entra ID)
```

### Target Architecture (Code App)

```
┌──────────────────────────────────────┐     ┌─────────────┐
│  Power Platform                       │     │             │
│  ┌──────────────┐  ┌──────────────┐  │     │  Azure      │
│  │ Model-Driven │  │   Code App   │  │────▶│  Functions   │
│  │    App        │  │ (React SPA)  │  │     │  (KSeF,AI)  │
│  └──────────────┘  └──────────────┘  │     └─────────────┘
│         │                  │          │
│         └──────┬───────────┘          │
│                ▼                      │
│          Dataverse                    │
└──────────────────────────────────────┘
```

### Key Difference

In the Code App architecture:
- **Dataverse CRUD** is handled directly via the Component Framework Client API (no REST call needed)
- **Azure Functions** are only called for external integrations (KSeF, Azure OpenAI, GUS)
- **Authentication** is automatic via Power Platform SSO

---

## Implementation Phases

### Phase 1 — Foundation

**Duration:** 1–2 weeks  
**Goal:** Set up the Code App project, authentication, and basic navigation.

#### Tasks

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 1.1 | Initialize Code App project (Vite + React + TypeScript) | 2h | P0 |
| 1.2 | Configure PAC CLI and Power Platform connection | 1h | P0 |
| 1.3 | Implement authentication bridge (Power Platform → Custom Connector) | 4h | P0 |
| 1.4 | Set up routing (React Router or internal navigation) | 2h | P0 |
| 1.5 | Create base layout (sidebar, header, content area) | 4h | P1 |
| 1.6 | Implement theming (Fluent UI v9 or shadcn/ui) | 3h | P1 |
| 1.7 | First `pac code push` deployment | 1h | P0 |

**Deliverable:** Code App deployed to Power Platform with navigation and authentication working.

---

### Phase 2 — Core Features

**Duration:** 2–3 weeks  
**Goal:** Migrate the core invoice management UI.

#### Tasks

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 2.1 | Invoice list view (table with sorting, filtering, pagination) | 8h | P0 |
| 2.2 | Invoice detail view (full invoice data) | 6h | P0 |
| 2.3 | KSeF sync panel (manual sync trigger, status display) | 4h | P0 |
| 2.4 | Settings management (KSeF settings CRUD) | 4h | P1 |
| 2.5 | Dashboard (charts: monthly invoices, by status, top suppliers) | 8h | P1 |
| 2.6 | Dataverse Client API integration for CRUD operations | 6h | P0 |
| 2.7 | Custom Connector calls for KSeF operations | 4h | P0 |

**Deliverable:** Full invoice management functionality in the Code App.

---

### Phase 3 — AI Integration

**Duration:** 1–2 weeks  
**Goal:** Integrate AI categorization with the user feedback loop.

#### Tasks

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 3.1 | AI categorization trigger ("Categorize" button per invoice) | 4h | P0 |
| 3.2 | AI suggestion display (MPK, category, confidence, rationale) | 4h | P0 |
| 3.3 | Accept/Modify/Reject feedback flow | 6h | P0 |
| 3.4 | Batch categorization (multiple invoices at once) | 4h | P1 |
| 3.5 | AI confidence visualization (color-coded, threshold alerts) | 2h | P2 |
| 3.6 | Feedback history view (per supplier learning context) | 4h | P2 |

**Deliverable:** AI categorization fully functional with learning feedback loop.

---

### Phase 4 — Optimization

**Duration:** 1–2 weeks  
**Goal:** Polish the UX, optimize performance, and prepare for production.

#### Tasks

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 4.1 | Responsive design for tablet/mobile | 4h | P1 |
| 4.2 | Error handling and user notifications | 3h | P0 |
| 4.3 | Loading states and skeleton screens | 2h | P1 |
| 4.4 | Keyboard navigation and accessibility (WCAG 2.1 AA) | 4h | P1 |
| 4.5 | Bundle optimization (tree-shaking, lazy loading) | 3h | P1 |
| 4.6 | Performance testing (Lighthouse, load testing) | 2h | P2 |
| 4.7 | Documentation and handoff | 4h | P1 |

**Deliverable:** Production-ready Code App with good UX.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 18+ | JSX, hooks, functional components |
| Language | TypeScript | Strict mode |
| Build tool | Vite | Fast builds, HMR |
| UI library | Fluent UI v9 | Native Power Platform look & feel |
| State management | React Query (TanStack Query) | Server state, caching |
| Routing | React Router v6+ | Client-side routing |
| Charts | Recharts | Lightweight charting |
| Data access | Dataverse Client API + Custom Connector | CRUD + external ops |
| Deployment | PAC CLI | `pac code push` |

### Why Fluent UI v9?

- **Consistency** — matches the Model-Driven App design language
- **Themeable** — supports Power Platform themes automatically
- **Accessible** — built-in WCAG 2.1 AA compliance
- **Tree-shakeable** — only imported components are bundled

---

## Authentication Flow

### In Code App (automatic)

```
User opens MDA → Power Platform SSO → Code App loads → 
Component Framework provides auth context →
Custom Connector calls use automatic token pass-through
```

No manual login flow needed. The user's Power Platform session is reused.

### For Custom Connector calls (KSeF, AI)

```
Code App → Custom Connector → Azure Functions
            ↓
    OAuth 2.0 automatic
    (token from Power Platform)
```

The Custom Connector handles token acquisition automatically using the connection configured by the admin.

---

## Code App Structure

```
code-app/
├── src/
│   ├── index.tsx                 # Entry point
│   ├── App.tsx                   # Root component with routing
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx     # Main layout
│   │   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   │   └── Header.tsx        # Top bar
│   │   ├── invoices/
│   │   │   ├── InvoiceList.tsx   # Invoice table
│   │   │   ├── InvoiceDetail.tsx # Invoice detail view
│   │   │   └── InvoiceFilters.tsx
│   │   ├── ai/
│   │   │   ├── AiSuggestion.tsx  # AI categorization panel
│   │   │   ├── FeedbackForm.tsx  # Accept/Modify/Reject
│   │   │   └── ConfidenceBadge.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   └── charts/
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── useDataverse.ts       # Dataverse Client API hook
│   │   ├── useConnector.ts       # Custom Connector hook
│   │   └── useInvoices.ts        # Invoice operations
│   ├── services/
│   │   ├── dataverse.ts          # Dataverse CRUD service
│   │   └── connector.ts          # Custom Connector service
│   ├── types/
│   │   └── invoice.ts            # TypeScript interfaces
│   └── utils/
│       └── formatters.ts         # Date, currency formatters
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## API Integration

### Dataverse Client API (direct CRUD)

```typescript
// Using Component Framework's WebApi
const invoices = await context.webAPI.retrieveMultipleRecords(
  "dvlp_ksefinvoice",
  "?$select=dvlp_name,dvlp_invoicedate,dvlp_grossamount&$top=50"
);
```

### Custom Connector (external operations)

```typescript
// KSeF sync via Custom Connector
const response = await connector.invoke("SyncIncoming", {
  settingId: "...",
  dateFrom: "2026-01-01"
});

// AI categorization
const result = await connector.invoke("CategorizeInvoice", {
  invoiceId: "..."
});
```

---

## Deployment

### Initial Setup

```bash
# 1. Install PAC CLI
npm install -g pac

# 2. Authenticate
pac auth create --environment https://org.crm4.dynamics.com

# 3. Build the Code App
cd code-app
pnpm build

# 4. Push to Power Platform
pac code push --solution-unique-name DevelopicoKSeF
```

### Update Deployment

```bash
cd code-app
pnpm build
pac code push
```

### CI/CD (future)

```yaml
# GitHub Actions
- name: Build Code App
  run: |
    cd code-app
    pnpm install
    pnpm build

- name: Deploy to Power Platform
  run: |
    pac auth create --tenant ${{ secrets.TENANT_ID }}
    pac code push --solution-unique-name DevelopicoKSeF
```

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Code App API limitations | Medium | High | Build a PoC first; test all needed APIs |
| Bundle size exceeds 16 MB | Low | High | Tree-shaking, lazy loading, lightweight dependencies |
| Performance in sandbox | Medium | Medium | Benchmark early; optimize rendering |
| Authentication issues | Low | High | Test Custom Connector auth in Phase 1 |
| Debugging complexity | High | Medium | Use browser DevTools; add logging |
| Breaking changes (preview→GA) | Medium | Medium | Follow Power Platform release plan |

### Fallback Plan

If Code Apps prove insufficient, the fallback is:
1. **Keep the Next.js web app** as the primary UI
2. **Use Canvas App** as a lightweight Power Platform UI
3. **Hybrid approach** — Canvas App for basic operations, web app for advanced features

---

## Timeline and Estimates

| Phase | Duration | Effort (person-hours) |
|-------|----------|-----------------------|
| Phase 1 — Foundation | 1–2 weeks | ~17h |
| Phase 2 — Core Features | 2–3 weeks | ~40h |
| Phase 3 — AI Integration | 1–2 weeks | ~24h |
| Phase 4 — Optimization | 1–2 weeks | ~22h |
| **Total** | **5–9 weeks** | **~103h** |

### Prerequisites

- [ ] PAC CLI installed and configured
- [ ] Code App feature enabled in the target Power Platform environment
- [ ] Custom Connector deployed and tested
- [ ] Model-Driven App created with navigation structure

---

## Related Documents

- [Architecture](./ARCHITECTURE.md) — system design
- [Custom Connector](./POWER_PLATFORM_CUSTOM_CONNECTOR.md) — connector setup
- [Dataverse Schema](./DATAVERSE_SCHEMA.md) — data model
- [API Reference](./API.md) — REST API documentation

---

**Last updated:** 2026-02-11  
**Version:** 1.0  
**Maintainer:** dvlp-dev team
