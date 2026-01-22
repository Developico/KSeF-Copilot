# KSeF Integration Module - Requirements & Architecture Plan

## Overview

Open-source module for integrating with Polish National e-Invoice System (KSeF) with Dataverse backend, AI categorization, and multi-tenant support.

**Architecture:** Azure Functions + Static Web App + Dataverse Solution + Entra ID  
**License:** MIT  
**MVP:** 1 company, manual categorization  
**Extended:** Multi-tenant, AI categorization, exports, notifications

---

## Deployment Philosophy

> **Cel:** Maksymalna prostota wdrożenia dla klientów końcowych

| Aspekt | Podejście |
|--------|-----------|
| **Backend (Dataverse)** | Managed Solution - import jednym kliknięciem |
| **Frontend (Web)** | Azure Static Web App - deploy via GitHub Actions |
| **API (Functions)** | Bundled z SWA lub osobny deploy via CLI |
| **Konfiguracja** | Skrypty PowerShell + interaktywny wizard |
| **Dokumentacja** | Krok po kroku z screenshotami |
| **UI/UX** | Spójny z ekosystemem dvlp (styl planner) |

### Artefakty wdrożeniowe

```
deployment/
├── dataverse/
│   ├── KSeFIntegration_1_0_0_managed.zip    # Managed Solution
│   ├── KSeFIntegration_1_0_0_unmanaged.zip  # Unmanaged (dev)
│   └── solution-config.json                  # Konfiguracja
│
├── scripts/
│   ├── Install-KSeF.ps1                      # Główny skrypt instalacyjny
│   ├── Configure-Azure.ps1                   # Setup Azure resources
│   ├── Deploy-Functions.ps1                  # Deploy API
│   └── Deploy-Web.ps1                        # Deploy frontend
│
├── templates/
│   ├── azure-resources.bicep                 # IaC template
│   └── github-workflow.yml                   # CI/CD template
│
└── docs/
    ├── QUICK_START.md                        # 5-minute setup
    ├── DEPLOYMENT_GUIDE.md                   # Full guide
    └── TROUBLESHOOTING.md                    # Common issues
```

---

## Scope: MVP vs Extended

| Funkcja | MVP (Free) | Extended |
|---------|------------|----------|
| Synchronizacja faktur z KSeF | ✅ | ✅ |
| **Obsługa 1 spółki** | ✅ | ✅ |
| **Multi-tenant (wiele spółek)** | ❌ | ✅ |
| Parsowanie XML FA(2) | ✅ | ✅ |
| Ręczna kategoryzacja (MPK, kategoria) | ✅ | ✅ |
| Status płatności + termin | ✅ | ✅ |
| Podstawowy UI (dashboard) | ✅ | ✅ |
| RBAC: Admin + Reader | ✅ | ✅ |
| Azure Key Vault (tokeny) | ✅ | ✅ |
| **AI kategoryzacja** | ❌ | ✅ |
| **Supplier mapping cache** | ❌ | ✅ |
| **Feedback loop (uczenie się)** | ❌ | ✅ |
| **Export CSV/Excel** | ❌ | ✅ |
| **Powiadomienia email** | ❌ | ✅ |
| **API webhooks** | ❌ | ✅ |
| **Timer sync (automatyczny)** | ❌ | ✅ |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     Azure Static Web App                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React/Next.js SPA - Dashboard do zarządzania fakturami      │  │
│  │  - Lista spółek (multi-tenant)                                │  │
│  │  - Preview faktur z KSeF                                      │  │
│  │  - Akceptacja/edycja kategoryzacji AI                         │  │
│  │  - Status płatności                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Azure Functions (Node.js)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ ksef-session │ │ ksef-sync    │ │ ksef-import  │               │
│  │ HTTP Trigger │ │ HTTP/Timer   │ │ HTTP Trigger │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ ai-categorize│ │ tenants-mgmt │ │ dataverse-   │               │
│  │ HTTP Trigger │ │ HTTP Trigger │ │ sync         │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   KSeF API       │  │  Azure OpenAI    │  │   Dataverse      │
│   (MF.gov.pl)    │  │  (GPT-4o-mini)   │  │   (Backend)      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │
          ▼
┌──────────────────┐
│  Azure Key Vault │
│  (KSeF tokens)   │
└──────────────────┘
```

---

## Project Structure

```
dvlp-ksef/
├── README.md                    # Dokumentacja projektu
├── LICENSE                      # MIT License
├── .gitignore
├── .env.example                 # Przykładowe zmienne środowiskowe
│
├── docs/
│   ├── REQUIREMENTS.md          # Wymagania (funkcjonalne + niefunkcjonalne)
│   ├── ARCHITECTURE.md          # Dokumentacja architektury
│   ├── API.md                   # Dokumentacja API
│   └── DEPLOYMENT.md            # Instrukcja wdrożenia
│
├── api/                         # Azure Functions (Node.js/TypeScript)
│   ├── host.json
│   ├── local.settings.json
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── functions/           # HTTP Triggers
│   │   │   ├── ksef-session.ts
│   │   │   ├── ksef-sync.ts
│   │   │   ├── ksef-import.ts
│   │   │   ├── invoices.ts
│   │   │   └── health.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── ksef/            # Klient KSeF
│   │   │   │   ├── client.ts
│   │   │   │   ├── session.ts
│   │   │   │   ├── invoices.ts
│   │   │   │   ├── parser.ts
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── dataverse/       # Klient Dataverse
│   │   │   │   ├── client.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── entities.ts
│   │   │   │
│   │   │   ├── auth/            # Entra ID + RBAC
│   │   │   │   ├── middleware.ts
│   │   │   │   └── roles.ts
│   │   │   │
│   │   │   └── keyvault/        # Azure Key Vault
│   │   │       └── secrets.ts
│   │   │
│   │   └── types/
│   │       ├── invoice.ts
│   │       ├── tenant.ts
│   │       └── api.ts
│   │
│   └── tests/
│       ├── ksef/
│       ├── dataverse/
│       └── fixtures/
│
├── web/                         # Static Web App (React/Next.js)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── invoices/
│   │   └── settings/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── invoices/
│   │   └── layout/
│   │
│   └── lib/
│       ├── api.ts
│       └── auth.ts
│
├── infrastructure/              # IaC (Bicep/Terraform)
│   ├── main.bicep
│   ├── modules/
│   │   ├── functions.bicep
│   │   ├── staticwebapp.bicep
│   │   ├── keyvault.bicep
│   │   └── dataverse.bicep
│   └── parameters/
│       ├── dev.json
│       └── prod.json
│
└── scripts/
    ├── setup.sh
    └── deploy.sh
```

---

## Data Model (Dataverse)

### Table: `ksef_invoices`

| Kolumna | Typ | Opis | MVP |
|---------|-----|------|-----|
| `ksef_invoiceid` | GUID | PK | ✅ |
| `ksef_tenantNip` | Text(10) | NIP spółki (dla multi-tenant) | ✅* |
| `ksef_tenantName` | Text(200) | Nazwa spółki | ✅* |
| `ksef_referenceNumber` | Text(100) | Unikalny numer KSeF | ✅ |
| `ksef_invoiceNumber` | Text(50) | Numer faktury dostawcy | ✅ |
| `ksef_supplierNip` | Text(10) | NIP dostawcy | ✅ |
| `ksef_supplierName` | Text(200) | Nazwa dostawcy | ✅ |
| `ksef_invoiceDate` | Date | Data wystawienia | ✅ |
| `ksef_dueDate` | Date | Termin płatności | ✅ |
| `ksef_netAmount` | Currency | Kwota netto | ✅ |
| `ksef_vatAmount` | Currency | Kwota VAT | ✅ |
| `ksef_grossAmount` | Currency | Kwota brutto | ✅ |
| `ksef_paymentStatus` | Choice | pending/paid | ✅ |
| `ksef_paymentDate` | Date | Data opłacenia | ✅ |
| `ksef_mpk` | Choice | Centrum kosztów | ✅ |
| `ksef_category` | Text(50) | Kategoria kosztu | ✅ |
| `ksef_project` | Text(100) | Projekt (opcjonalnie) | ✅ |
| `ksef_tags` | Text(500) | Tagi (JSON array) | ✅ |
| `ksef_rawXml` | Multiline | Pełny XML faktury | ✅ |
| `ksef_importedAt` | DateTime | Data importu | ✅ |
| `ksef_aiMpkSuggestion` | Choice | Propozycja AI | ❌ |
| `ksef_aiCategorySuggestion` | Text | Propozycja AI | ❌ |
| `ksef_aiConfidence` | Decimal | Pewność AI | ❌ |

*W MVP hardcoded na 1 spółkę, w Extended dynamiczne

### Table: `ksef_tenants` (Extended only)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `ksef_tenantid` | GUID | PK |
| `ksef_nip` | Text(10) | NIP spółki |
| `ksef_name` | Text(200) | Nazwa spółki |
| `ksef_tokenSecretName` | Text(100) | Nazwa sekretu w Key Vault |
| `ksef_tokenExpiry` | Date | Data wygaśnięcia tokena |
| `ksef_isActive` | Boolean | Czy aktywna |
| `ksef_createdAt` | DateTime | Data utworzenia |

---

## RBAC Roles

| Rola | Uprawnienia |
|------|-------------|
| **Admin** | Wszystko: sync, import, edycja, usuwanie, ustawienia |
| **Reader** | Tylko odczyt: przeglądanie faktur, statusów |

---

## Implementation Roadmap

### Faza 0: Setup projektu (~1-2 dni)
- [ ] Utworzenie repo, struktura plików
- [ ] Konfiguracja TypeScript, ESLint
- [ ] README, LICENSE (MIT)
- [ ] .env.example

### Faza 1: Infrastruktura Azure (~2-3 dni)
- [ ] Azure Functions project (Node.js v4)
- [ ] Dataverse connection (MSAL)
- [ ] Key Vault integration
- [ ] Entra ID auth middleware

### Faza 2: KSeF Core (~1 tydzień)
- [ ] Klient KSeF (sesja, autoryzacja)
- [ ] Pobieranie listy faktur
- [ ] Parser XML FA(2)
- [ ] Zapis do Dataverse

### Faza 3: MVP UI (~1 tydzień)
- [ ] Static Web App (Next.js)
- [ ] Dashboard z listą faktur
- [ ] Formularz kategoryzacji (MPK, kategoria, projekt)
- [ ] Status płatności

### Faza 4: Testing & Docs (~3-4 dni)
- [ ] Testy jednostkowe i integracyjne
- [ ] Dokumentacja API
- [ ] Deployment guide

### Faza 5: Extended - Multi-tenant (~1 tydzień)
- [ ] Tabela tenants, wybór spółki
- [ ] Dynamiczne tokeny per spółka
- [ ] UI: przełączanie spółek

### Faza 6: Extended - AI (~1 tydzień)
- [ ] Azure OpenAI integration
- [ ] Auto-kategoryzacja przy imporcie
- [ ] Feedback loop

---

## Key Decisions

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|--------------|
| Backend | Azure Functions | Serverless, niskie koszty, skalowalność |
| Frontend | Static Web App (Next.js) | Szybki, integracja z Functions |
| Database | Dataverse | Zgodność z ekosystemem, Power Platform |
| Auth | Entra ID | Enterprise-ready, RBAC |
| Secrets | Azure Key Vault | Bezpieczeństwo tokenów KSeF |
| AI | Azure OpenAI (GPT-4o-mini) | Niskie koszty, wysoka jakość |
| License | MIT | Najbardziej permissive |
| Monorepo | pnpm workspaces | Łatwiejsze zarządzanie api/ i web/ |

---

## Environment Variables

```bash
# Azure
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# Dataverse
DATAVERSE_URL=https://your-org.crm4.dynamics.com
DATAVERSE_ENTITY_INVOICES=ksef_invoices
DATAVERSE_ENTITY_TENANTS=ksef_tenants

# Key Vault
AZURE_KEYVAULT_URL=https://your-vault.vault.azure.net

# KSeF (MVP - single tenant)
KSEF_ENVIRONMENT=test  # test | demo | prod
KSEF_NIP=1234567890
KSEF_TOKEN_SECRET_NAME=ksef-token-primary

# AI (Extended)
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

---

## Next Steps

1. [ ] Finalize REQUIREMENTS.md with detailed functional specs
2. [ ] Initialize repo with package.json, tsconfig
3. [ ] Set up Azure Functions project skeleton
4. [ ] Create Dataverse tables
5. [ ] Implement KSeF client (session + auth)
