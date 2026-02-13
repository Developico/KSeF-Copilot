# Analiza i plan wdrożenia — Power Apps Code Apps

Dokument zawiera analizę porównawczą obecnego rozwiązania WEB (Next.js na Azure App Service) z nowym modelem **Power Apps Code Apps** oraz plan ewentualnej migracji/wdrożenia alternatywnej wersji aplikacji KSeF Copilot.

**Data analizy:** 2026-02-13  
**Status Power Apps Code Apps:** Preview  
**Źródła:**
- https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview
- https://github.com/microsoft/PowerAppsCodeApps/
- https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/code

---

## Spis treści

1. [Czym jest Power Apps Code Apps](#czym-jest-power-apps-code-apps)
2. [Analiza obecnego rozwiązania](#analiza-obecnego-rozwiązania)
3. [Mapowanie komponentów](#mapowanie-komponentów)
4. [Analiza różnic architektonicznych](#analiza-różnic-architektonicznych)
5. [Ryzyka i ograniczenia](#ryzyka-i-ograniczenia)
6. [Plan wdrożenia — fazy](#plan-wdrożenia--fazy)
7. [Porównanie kosztów i infrastruktury](#porównanie-kosztów-i-infrastruktury)
8. [Rekomendacja](#rekomendacja)

---

## Czym jest Power Apps Code Apps

Power Apps Code Apps to nowa usługa (preview) pozwalająca deweloperom budować **Single-Page Applications (SPA)** w code-first IDE (VS Code), używając popularnych frameworków (React, Vue), i hostować je w **Power Platform**.

### Kluczowe cechy

| Cecha | Opis |
|---|---|
| **Typ aplikacji** | SPA (Single-Page Application) — Vite + React/Vue |
| **Framework** | Vite (NIE Next.js) — brak SSR/ISR/SSG |
| **Autentykacja** | Microsoft Entra ID — zarządzana przez Power Apps host |
| **Dane** | Power Platform connectors (1500+) — wywoływane z JS via SDK |
| **Hosting** | Power Platform — `pac code push` → `apps.powerapps.com/play/e/{env}/a/{app}` |
| **SDK** | `@microsoft/power-apps` (npm) — generuje modele/serwisy z connectorów |
| **CLI** | PAC CLI (`pac code init`, `pac code push`, `pac code add-data-source`) |
| **Licencja** | Power Apps Premium wymagana dla end-userów |
| **Starter template** | Vite + React + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router |

### Architektura runtime

```
┌─────────────────────────────────────────────┐
│              Power Apps Host                │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Twój    │  │ Power    │  │ Entra ID  │  │
│  │ kod     │──│ Apps SDK │──│ Auth      │  │
│  │ (React) │  │ @ms/     │  │ (managed) │  │
│  │         │  │power-apps│  │           │  │
│  └─────────┘  └──────────┘  └───────────┘  │
│                     │                       │
│              ┌──────┴──────┐                │
│              │ Connectors  │                │
│              │ (Dataverse, │                │
│              │  SQL, HTTP, │                │
│              │  Custom)    │                │
│              └─────────────┘                │
└─────────────────────────────────────────────┘
```

### Komendy PAC CLI

| Komenda | Funkcja |
|---|---|
| `pac code init` | Inicjalizacja Code App (tworzy `power.config.json`) |
| `pac code add-data-source` | Dodanie connectora (generuje modele TypeScript) |
| `pac code push` | Publikacja buildu do Power Platform |
| `pac code run` | Lokalna proxy do connectorów Power Platform |
| `pac code list` | Lista Code Apps w environment |
| `pac code list-tables` | Lista tabel dla connectora |

---

## Analiza obecnego rozwiązania

### Obecna architektura (WEB + API)

```
┌──────────────────────┐     ┌──────────────────────┐
│   Azure App Service  │     │  Azure Functions      │
│   (dvlp-ksef)        │────→│  (YOUR_FUNCTION_APP)     │
│                      │     │                        │
│   Next.js 15         │     │  24 funkcje:           │
│   Standalone         │     │  - invoices            │
│   React 19           │     │  - ksef-session        │
│   Tailwind CSS       │     │  - ksef-sync           │
│   MSAL Browser       │     │  - dashboard           │
│   TanStack Query     │     │  - forecast            │
│   next-intl (i18n)   │     │  - ai-categorize       │
│   recharts           │     │  - settings            │
│   react-pdf          │     │  - attachments         │
│                      │     │  - health              │
│   Port: 8080         │     │  - exchange-rates      │
│   Node.js 22         │     │  - gus (REGON)         │
│   Linux              │     │  - anomalies           │
└──────────────────────┘     │  ...                   │
         │                   │                        │
    rewrites                 │  Zależności:            │
    /api/* → API_URL         │  - MSAL Node           │
         │                   │  - Dataverse Web API    │
         └──────────────────→│  - KSeF API (gov.pl)   │
                             │  - OpenAI              │
                             │  - Key Vault           │
                             │  - fast-xml-parser     │
                             └──────────────────────┘
                                      │
                             ┌────────┴────────┐
                             │   Dataverse     │
                             │   (backend DB)  │
                             └─────────────────┘
```

### Kluczowe elementy WEB do zmapowania

| Element | Technologia | Rozmiar/Złożoność |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR + standalone output |
| **Auth** | MSAL Browser (`@azure/msal-browser`) | Entra ID, token acquisition, scopes |
| **Routing** | Next.js App Router (`/[locale]/...`) | ~8 sekcji + i18n |
| **API Client** | Custom `apiFetch()` z MSAL tokenami | ~1500 LOC, 50+ endpointów |
| **UI** | Radix UI + Tailwind + shadcn/ui | ~30 komponentów |
| **Wykresy** | recharts | Dashboard, forecast |
| **Tabele** | TanStack Table | Invoices list |
| **State** | TanStack Query | Cache, mutations |
| **i18n** | next-intl | PL/EN |
| **PDF** | react-pdf, react-medium-image-zoom | Podgląd dokumentów |
| **API backend** | Azure Functions (24 funkcje) | Dataverse, KSeF, AI, GUS |

---

## Mapowanie komponentów

### Kompatybilne (bezpośrednie przeniesienie)

| Element WEB | Code Apps equivalent | Status |
|---|---|---|
| React 19 | React (Vite) | ✅ Zgodne |
| Tailwind CSS | Tailwind CSS | ✅ W starter template |
| shadcn/ui (Radix) | shadcn/ui (Radix) | ✅ W starter template |
| TanStack Query | TanStack Query | ✅ W starter template |
| TanStack Table | TanStack Table | ✅ W starter template |
| Lucide icons | Lucide | ✅ W starter template |
| recharts | recharts | ✅ Standardowy npm package |
| framer-motion | framer-motion | ✅ Standardowy npm package |
| clsx, tailwind-merge | clsx, tailwind-merge | ✅ Standardowy npm package |
| react-countup | react-countup | ✅ Standardowy npm package |

### Wymagające adaptacji

| Element WEB | Problem | Podejście Code Apps |
|---|---|---|
| **Next.js App Router** | Code Apps = SPA (Vite), brak SSR | Migracja na React Router (w starter template) |
| **MSAL Browser** | Code Apps zarządza auth automatycznie | Usunąć MSAL — auth jest managed przez Power Apps host |
| **next-intl (i18n)** | Brak Next.js | Użyć `react-intl` lub `i18next` (client-side) |
| **react-pdf** | Działa, ale pliki PDF mogą być duże | Bez zmian — standardowy React komponent |
| **`apiFetch()` z tokenami** | Connectors obsługują auth automatycznie | Przepisać na Power Apps SDK calls lub Custom Connector |
| **Server-side rewrites** | Brak serwera Node.js | Eliminacja — dane bezpośrednio z connectorów |
| **styled-jsx** | Minimalne użycie | Usunąć — Tailwind wystarczy |

### Wymagające przeprojektowania

| Element WEB | Problem | Rozwiązanie Code Apps |
|---|---|---|
| **Azure Functions API (24 funkcje)** | Backend logika — KSeF, AI, GUS | Custom Connector + Power Automate lub utrzymanie Functions |
| **KSeF API integration** | Złożona logika sesji, tokenów, XML | Custom Connector do KSeF API (lub HTTP connector) |
| **AI Categorization (OpenAI)** | Wymaga server-side secrets | AI Builder / Custom Connector do Azure OpenAI |
| **Dataverse direct access** | Web API via Functions | Natywny Dataverse connector w Code Apps (SDK) |
| **GUS/REGON lookup** | Zewnętrzne API gov.pl | Custom Connector |
| **PDF generation/thumbnails** | Server-side processing | Power Automate flow lub Custom Connector |
| **Exchange rates (NBP)** | Zewnętrzne API NBP | HTTP connector lub Custom Connector |
| **Key Vault secrets** | Server-side only | Zarządzane przez Power Platform (connection auth) |

---

## Analiza różnic architektonicznych

### 1. Rendering model

| Aspekt | Obecne (Next.js) | Code Apps (Vite SPA) |
|---|---|---|
| SSR | Tak (standalone server) | ❌ Brak — czyste SPA |
| SEO | Server-rendered HTML | ❌ Client-only rendering |
| Initial load | Szybki (SSR + hydration) | Wolniejszy (SPA bootstrap) |
| Hosting | Custom Node.js server | Managed (Power Apps host) |

**Wpływ:** Aplikacja KSeF to wewnętrzna LOB app — SEO nie jest wymagane. Brak SSR jest akceptowalny.

### 2. Autentykacja

| Aspekt | Obecne | Code Apps |
|---|---|---|
| Konfiguracja | Manual (MSAL config, scopes, redirects) | Automatic (Entra ID managed by host) |
| Token acquisition | `acquireTokenSilent()` w `apiFetch()` | SDK zarządza tokenami automatycznie |
| User context | `useMsal()` hook → accounts | SDK API (do zbadania) |
| Conditional Access | Manual implementation | Managed by Power Platform |

**Wpływ:** Duże uproszczenie — cała warstwa auth (`auth-config.ts`, `AuthProvider`, `MsalProvider`) staje się zbędna.

### 3. Dostęp do danych

| Aspekt | Obecne | Code Apps |
|---|---|---|
| Pattern | Frontend → HTTP API → Azure Functions → Dataverse | Frontend → Power Apps SDK → Connector → Dataverse |
| Auth do danych | Bearer token (MSAL → Functions) | Connector auth (managed) |
| Typing | Manual interfaces (~100 types) | Auto-generated models (`pac code add-data-source`) |
| Custom logic | Azure Functions (TypeScript) | Custom Connector / Power Automate / utrzymanie Functions |

**Wpływ:** Największa zmiana. Dataverse connector eliminuje potrzebę wielu Azure Functions, ale złożona logika (KSeF, AI) wymaga pozostawienia backendu.

### 4. Deployment

| Aspekt | Obecne | Code Apps |
|---|---|---|
| Build | `next build` → standalone → ZIP → `az webapp deploy` | `vite build` → `pac code push` |
| Infrastruktura | Azure App Service (Linux, Node.js 22) | Power Platform environment |
| CI/CD | Azure CLI pipeline | PAC CLI w pipeline |
| Koszt hostingu | App Service plan (~$13/mies. B1) | Wliczone w Power Apps Premium |
| Rollback | Poprzedni ZIP deploy | Wbudowane wersjonowanie |

---

## Ryzyka i ograniczenia

### Ryzyka krytyczne 🔴

| # | Ryzyko | Szczegóły | Mitygacja |
|---|---|---|---|
| R1 | **Preview status** | Code Apps jest w preview — może się zmienić, brak SLA | Prowadzić jako POC, nie produkcja |
| R2 | **Licencja Power Apps Premium** | Wymagana dla każdego użytkownika końcowego (~$20/user/mies.) | Analiza kosztowa vs obecne App Service |
| R3 | **Brak wsparcia mobile** | Code Apps nie działają w Power Apps Mobile/Windows | KSeF web jest mobile-responsive — to regresja |
| R4 | **Złożoność KSeF integration** | KSeF API wymaga sesji, certyfikatów, XML parsing — nie mapuje się na proste connectors | Utrzymać Azure Functions jako Custom Connector |

### Ryzyka umiarkowane 🟡

| # | Ryzyko | Szczegóły | Mitygacja |
|---|---|---|---|
| R5 | **Brak SSR** | Wolniejszy initial load dla LOB app | Akceptowalne — SPA z code splitting |
| R6 | **i18n migration** | next-intl → react-intl/i18next | Jednorazowy wysiłek |
| R7 | **Custom Connectors** | Trzeba utworzyć connectors dla KSeF API, GUS REGON, NBP | Czas na konfigurację i testowanie |
| R8 | **Brak Power Platform Git integration** | Code Apps nie wspierają PP Git integration | Standardowy Git repo jako source of truth |
| R9 | **System limits** | Nieznane limity na rozmiar app, liczbę connectorów | Testować w POC |

### Ograniczenia techniczne

- ❌ Brak SSR/ISR/SSG (tylko SPA)
- ❌ Brak Power Apps Mobile
- ❌ Brak Power Platform Git integration
- ❌ Brak SharePoint forms integration
- ❌ Brak Power BI data integration (PowerBIIntegration)
- ❌ Brak SAS IP restriction support
- ⚠️ Sensitive data nie powinny być w app code — tylko w data sources

---

## Plan wdrożenia — fazy

### Faza 0: Przygotowanie środowiska (1 tydzień)

| Krok | Opis | Odpowiedzialny |
|---|---|---|
| 0.1 | Weryfikacja dostępu do Power Platform environment | Admin |
| 0.2 | Włączenie Code Apps w PP Admin Center (Settings → Features → Enable code apps) | PP Admin |
| 0.3 | Instalacja PAC CLI (`winget install Microsoft.PowerAppsCLI` lub npm `@microsoft/powerplatform-cli`) | Dev |
| 0.4 | Weryfikacja licencji Power Apps Premium | Admin |
| 0.5 | Utworzenie dedykowanego environment DEV dla POC | Admin |
| 0.6 | `pac auth create --environment <envUrl>` — połączenie CLI z environment | Dev |

### Faza 1: POC — Hello World + Dataverse (1-2 tygodnie)

**Cel:** Weryfikacja, że Code Apps działają z istniejącymi tabelami Dataverse.

| Krok | Opis |
|---|---|
| 1.1 | Scaffold z starter template: `npx degit microsoft/PowerAppsCodeApps/templates/starter#main ksef-code-app` |
| 1.2 | `cd ksef-code-app && npm install` |
| 1.3 | `pac code init --environment <envId> --displayName "KSeF Code App POC"` |
| 1.4 | Dodanie Dataverse connector: `pac code add-data-source --apiId shared_commondataserviceforapps --table dvlp_invoice` |
| 1.5 | Dodanie pozostałych tabel: `dvlp_ksefsetting`, `dvlp_ksefsession`, `dvlp_costcenter` |
| 1.6 | Implementacja prostego widoku listy faktur (React + TanStack Table + SDK) |
| 1.7 | `pac code push` — deploy do Power Platform |
| 1.8 | Test: otworzenie app w przeglądarce (`apps.powerapps.com/play/e/{envId}/a/{appId}`) |
| 1.9 | Weryfikacja auth (czy Entra ID działa automatycznie) |
| 1.10 | Weryfikacja CRUD na Dataverse (odczyt, zapis, edycja faktury) |

**Deliverable:** Działająca aplikacja z listą faktur z Dataverse, push na Power Platform.

### Faza 2: Custom Connectors (2-3 tygodnie)

**Cel:** Podłączenie zewnętrznych API (KSeF, GUS, NBP) jako Custom Connectors.

| Krok | Opis |
|---|---|
| 2.1 | **Custom Connector — Azure Functions API:** Utworzenie connectora wskazującego na `YOUR_FUNCTION_APP` |
| 2.2 | Definicja OpenAPI spec dla Azure Functions (eksport endpointów) |
| 2.3 | Konfiguracja auth w connectorze (Entra ID OAuth → Functions API scope) |
| 2.4 | `pac code add-data-source --apiId <custom-connector-id>` |
| 2.5 | **Alternatywa:** Utrzymanie bezpośredniego HTTP fetch do Functions z użyciem HTTP connector |
| 2.6 | Test: wywołanie endpointów dashboard, invoices, settings z Code App |
| 2.7 | **Custom Connector — KSeF API** (jeśli bezpośredni dostęp zamiast via Functions) |
| 2.8 | **Custom Connector — GUS REGON** |
| 2.9 | **Custom Connector — NBP exchange rates** |

**Decyzja architektoniczna:**

Opcja A — **Thin Custom Connector** (rekomendowana):
```
Code App → Custom Connector → Azure Functions → [Dataverse | KSeF | AI | GUS]
```
- Minimalna zmiana backendu
- Functions endpoint jako Custom Connector z OpenAPI spec
- Auth flow: Power Platform connector auth → Entra ID → Functions

Opcja B — **Native Connectors + Functions hybrid:**
```
Code App → Dataverse connector (bezpośrednio)
Code App → Custom Connector → Functions (tylko KSeF, AI, GUS)
```
- Dataverse CRUD bezpośrednio z SDK (eliminacja ~8 Functions: invoices, settings, sessions, dashboard, attachments, notes)
- Functions tylko dla złożonej logiki (ksef-sync, ai-categorize, gus, forecast, anomalies)

### Faza 3: Migracja UI (3-4 tygodnie)

**Cel:** Przeniesienie komponentów React z Next.js na Vite SPA.

| Krok | Opis | Wysiłek |
|---|---|---|
| 3.1 | Konfiguracja React Router (zamiennik App Router) | 1 dzień |
| 3.2 | Migracja i18n: next-intl → react-intl lub i18next | 2-3 dni |
| 3.3 | Usunięcie MSAL — auth managed by host | 1 dzień |
| 3.4 | Przepisanie API client (`api.ts`) na SDK calls / connector | 3-5 dni |
| 3.5 | Migracja layout (sidebar, header, theme) | 1-2 dni |
| 3.6 | Migracja Dashboard (recharts, cards, stats) | 2 dni |
| 3.7 | Migracja Invoices (tabela, filtry, szczegóły) | 3-4 dni |
| 3.8 | Migracja Sync (KSeF sync preview, import) | 2 dni |
| 3.9 | Migracja Settings (companies, cost centers) | 1-2 dni |
| 3.10 | Migracja Forecast + Anomalies | 2 dni |
| 3.11 | Migracja Documents (react-pdf, upload, thumbnails) | 2-3 dni |
| 3.12 | Migracja Reports | 1 dzień |

**Uwaga:** Komponenty React, shadcn/ui, Tailwind, TanStack — wszystkie przenoszą się bez zmian. Główny wysiłek to:
1. Routing (App Router → React Router)
2. API client (apiFetch → SDK connectors)
3. Auth (MSAL → eliminacja)
4. i18n (next-intl → react-intl)

### Faza 4: Testy i walidacja (1-2 tygodnie)

| Krok | Opis |
|---|---|
| 4.1 | Testy funkcjonalne wszystkich widoków |
| 4.2 | Testy auth (logowanie, wylogowanie, Conditional Access) |
| 4.3 | Testy connectorów (Dataverse CRUD, KSeF session, AI) |
| 4.4 | Testy wydajności (SPA load time, connector latency) |
| 4.5 | Testy DLP (Data Loss Prevention policies) |
| 4.6 | Testy sharing (udostępnianie app użytkownikom) |
| 4.7 | Test `hideNavBar=true` (ukrycie Power Apps header) |

### Faza 5: Deployment produkcyjny (1 tydzień)

| Krok | Opis |
|---|---|
| 5.1 | Utworzenie production Power Platform environment |
| 5.2 | `pac code push --environment <prodEnvId> --solutionName "KSeFCodeApp"` |
| 5.3 | Konfiguracja Custom Connectors w produkcji |
| 5.4 | Test end-to-end na produkcji |
| 5.5 | Udostępnienie użytkownikom (Power Apps sharing) |
| 5.6 | Monitoring (Health metrics w PP Admin Center) |

---

## Porównanie kosztów i infrastruktury

### Obecne koszty (Azure)

| Zasób | Koszt miesięczny (szacunkowy) |
|---|---|
| Azure App Service (B1 Linux) | ~$13 |
| Azure Functions (Consumption) | ~$0-5 |
| Application Insights | ~$0-5 |
| **Razem infrastruktura** | **~$18-23/mies.** |
| **Koszt per user** | **$0** (brak dodatkowych licencji) |

### Koszty Code Apps (Power Platform)

| Zasób | Koszt miesięczny (szacunkowy) |
|---|---|
| Power Apps Premium (per user) | ~$20/user/mies. |
| Azure Functions (utrzymane) | ~$0-5 |
| **Dla 5 userów** | **~$100-105/mies.** |
| **Dla 10 userów** | **~$200-205/mies.** |
| **Dla 20 userów** | **~$400-405/mies.** |

> **Uwaga:** Jeśli użytkownicy już mają licencję Power Apps Premium (np. z innego powodu), dodatkowy koszt wynosi $0 + Functions.

### Porównanie infrastruktury operacyjnej

| Aspekt | Azure App Service | Code Apps |
|---|---|---|
| **Deployment** | `build-deploy.mjs` → ZIP → `az webapp deploy` | `vite build` → `pac code push` |
| **Złożoność deployment** | Wysoka (standalone, SWC binaries, workspace) | Niska (prosty SPA build + push) |
| **Skalowanie** | Manual (App Service plan) | Managed (Power Platform) |
| **Monitoring** | Application Insights | PP Admin Center + Health metrics |
| **Auth management** | Manual (MSAL config, scopes, redirects) | Automatic (managed) |
| **Maintenance** | Node.js updates, OS patches, cert renewal | Managed by Microsoft |
| **Disaster recovery** | Manual (backup/restore) | Managed |

---

## Rekomendacja

### Krótkoterminowa (teraz)

**➡️ NIE migrować.** Obecne rozwiązanie (Next.js + Azure App Service + Functions) działa, jest wdrożone i sprawdzone. Power Apps Code Apps jest w **preview** — brak stabilności i SLA.

### Średnioterminowa (po GA — orientacyjnie H2 2026)

**➡️ Rozważyć pilotaż** jeśli:
1. Użytkownicy już posiadają licencje Power Apps Premium
2. Organizacja chce konsolidować na Power Platform
3. Istnieje potrzeba szybszego onboardingu nowych aplikacji LOB

### Korzyści z ewentualnej migracji

1. **Eliminacja infrastruktury hostingowej** — brak App Service, brak zarządzania Node.js, Linux, certyfikatami
2. **Uproszczenie deployment** — `pac code push` zamiast złożonego pipeline (`build-deploy.mjs` → ZIP → Azure CLI)
3. **Zarządzana autentykacja** — eliminacja MSAL config, redirect URIs, token management
4. **Natywny Dataverse connector** — auto-generowane typy, eliminacja wielu Azure Functions
5. **Governance** — DLP, Conditional Access, app sharing — managed by Power Platform
6. **Szybszy development** — starter template z identycznym stack (React + Tailwind + shadcn/ui + TanStack)

### Co zachować niezależnie od decyzji

1. **Azure Functions API** — złożona logika KSeF, AI, GUS nie przenosi się na connectors
2. **Dataverse schema** — identyczne tabele niezależnie od frontendu
3. **Testy** — vitest testy komponentów można zachować (Vite)

### Szacunkowy wysiłek migracji

| Faza | Czas | FTE |
|---|---|---|
| 0: Przygotowanie | 1 tydzień | 0.5 |
| 1: POC | 1-2 tygodnie | 1 |
| 2: Custom Connectors | 2-3 tygodnie | 1 |
| 3: Migracja UI | 3-4 tygodnie | 1-2 |
| 4: Testy | 1-2 tygodnie | 1 |
| 5: Deployment | 1 tydzień | 0.5 |
| **Razem** | **9-13 tygodni** | **1-2 FTE** |

---

## Następne kroki (jeśli decyzja = TAK)

1. [ ] Rejestracja do Power Apps Code Apps Early Access Preview: https://aka.ms/paCodeAppsEAP
2. [ ] Weryfikacja licencji Power Apps Premium w organizacji
3. [ ] Utworzenie DEV environment z włączonymi Code Apps
4. [ ] POC: scaffold + Dataverse connector + jedna tabela
5. [ ] Decyzja Go/No-Go po POC (Faza 1)

---

**Autor:** dvlp-dev team  
**Status:** Plan — do decyzji  
**Następny review:** Po GA Power Apps Code Apps

