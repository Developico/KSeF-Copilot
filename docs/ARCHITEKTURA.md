# Dokumentacja architektury

## Spis treści
- [Przegląd](#przegląd)
- [Architektura systemu](#architektura-systemu)
- [Projekt komponentów](#projekt-komponentów)
- [Przepływy danych](#przepływy-danych)
- [Architektura bezpieczeństwa](#architektura-bezpieczeństwa)
- [Architektura wdrożenia](#architektura-wdrożenia)
- [Stos technologiczny](#stos-technologiczny)
- [Wzorce projektowe](#wzorce-projektowe)
- [Wydajność i skalowalność](#wydajność-i-skalowalność)

---

## Przegląd

**dvlp-ksef** to natywna chmurowo platforma integracji z Krajowym Systemem e-Faktur (KSeF) z kategoryzacją AI i backendem Microsoft Dataverse. System oparty jest na architekturze serverless, wdrożony na Azure.

### Kluczowe zasady architektoniczne
- **Serverless-First**: Azure Functions (Flex Consumption) dla compute, Azure Storage dla persystencji
- **API-Driven**: RESTful API z 62 endpointami (21 modułów)
- **Security by Design**: Zero-trust z autentykacją Entra ID, walidacją JWT, RBAC
- **Cloud-Native**: Usługi PaaS (Functions, Dataverse, Key Vault, OpenAI)
- **Separation of Concerns**: Jasny podział między API, frontend i integracje zewnętrzne
- **Data Sovereignty**: Wszystkie dane w Microsoft Dataverse (zgodność z wymogami EU)

---

## Architektura systemu

### Architektura wysokopoziomowa

```
┌────────────────────────────────────────────────────────────────────┐
│                     Użytkownicy (przeglądarki)                     │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                Azure Entra ID (Autentykacja)                       │
│            Wydawanie tokenów JWT + grupy RBAC                      │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│          Azure App Service (Next.js 15 Frontend — standalone)      │
│    • Dashboard UI                                                  │
│    • Zarządzanie fakturami                                         │
│    • Ustawienia i konfiguracja                                     │
│    • Renderowanie UI oparte na rolach                              │
└────────────────────────────────────────────────────────────────────┘
                               │
                          HTTPS/REST
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│       Azure Functions v4 — Flex Consumption (Node.js 22 API)       │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Auth       │  │   KSeF       │  │  Dataverse   │            │
│  │   Middleware  │  │   Client     │  │  Services    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   AI         │  │   GUS        │  │  Kursy walut │            │
│  │   Service    │  │   Client     │  │  (NBP)       │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└────────────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Azure      │  │     KSeF     │  │  Microsoft   │
│   OpenAI     │  │   API v2     │  │  Dataverse   │
│  (GPT-4o)    │  │ (MF.gov.pl)  │  │  (CRM/DB)    │
└──────────────┘  └──────────────┘  └──────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ Azure Key    │
                 │ Vault        │
                 │ (tokeny KSeF)│
                 └──────────────┘
```

---

## Projekt komponentów

### 1. Warstwa frontendowa (web/)

**Technologia**: Next.js 15 z App Router, React 19, TypeScript 5.7  
**Wdrożenie**: Azure App Service (tryb standalone)

**Struktura**:
```
web/
├── app/                    # Strony App Router
│   ├── api/               # Route handlery (NextAuth proxy)
│   ├── dashboard/         # Strony dashboardu
│   ├── invoices/          # Zarządzanie fakturami
│   ├── settings/          # UI ustawień
│   └── layout.tsx         # Root layout z auth
├── components/            # Komponenty React
│   ├── ui/               # Komponenty shadcn/ui
│   ├── invoices/         # Komponenty faktur
│   ├── dashboard/        # Widgety dashboardu
│   └── layout/           # Komponenty layoutu (nav, header)
└── lib/
    ├── api-client.ts     # Klient API (wrapper fetch)
    ├── auth.ts           # Konfiguracja MSAL
    └── utils.ts          # Funkcje narzędziowe
```

**Kluczowe cechy**:
- Renderowanie po stronie serwera (SSR) — wydajność i SEO
- Renderowanie komponentów UI oparte na rolach (RBAC)
- Optymistyczne aktualizacje UI
- Ładowanie danych przy użyciu React Server Components
- Responsywny design z Tailwind CSS
- Autentykacja przez MSAL (Microsoft Authentication Library)

**Zarządzanie stanem**:
- React Server Components do pobierania danych
- Stan kliencki przez hooki React
- Sesja MSAL (sessionStorage/localStorage)

---

### 2. Warstwa API (api/)

**Technologia**: Azure Functions v4 (Flex Consumption), Node.js 22, TypeScript 5.7

**Struktura**:
```
api/
├── src/
│   ├── functions/              # Funkcje HTTP-triggered (21 modułów, 62 endpointy)
│   │   ├── health.ts          # Health check
│   │   ├── settings.ts        # CRUD ustawień
│   │   ├── sessions.ts        # Zarządzanie sesjami KSeF
│   │   ├── ksef-invoices.ts   # Operacje na fakturach KSeF
│   │   ├── ksef-sync.ts       # Synchronizacja KSeF
│   │   ├── invoices.ts        # Zarządzanie fakturami
│   │   ├── attachments.ts     # Załączniki plików
│   │   ├── ai-categorize.ts   # Kategoryzacja AI
│   │   ├── dashboard.ts       # Analityka
│   │   ├── gus.ts             # Integracja GUS
│   │   ├── exchange-rates.ts  # Kursy walut NBP
│   │   └── documents.ts       # Przetwarzanie dokumentów
│   │
│   └── lib/                   # Biblioteki rdzeniowe
│       ├── auth/              # Autentykacja i autoryzacja
│       │   └── middleware.ts  # Walidacja JWT, RBAC
│       ├── dataverse/         # Integracja z Dataverse
│       │   ├── client.ts      # Klient HTTP
│       │   ├── entities.ts    # Definicje encji
│       │   └── services/      # Serwisy CRUD
│       ├── ksef/              # Integracja z API KSeF
│       │   ├── client.ts      # Klient HTTP
│       │   ├── invoices.ts    # Operacje na fakturach
│       │   ├── session.ts     # Zarządzanie sesjami
│       │   └── parser.ts      # Parsowanie XML
│       ├── ai/                # Usługi AI
│       │   └── categorizer.ts # Kategoryzacja OpenAI
│       ├── gus/               # Klient API GUS
│       │   └── client.ts      # Wyszukiwanie firm
│       ├── prompts/           # Szablony promptów AI (.prompt.md)
│       └── storage/           # Azure Storage
│           └── blobs.ts       # Operacje na blobachach
│
└── tests/                     # Testy jednostkowe i integracyjne
```

**Wzorce architektoniczne**:
- **Service Layer Pattern**: Logika biznesowa w serwisach
- **Repository Pattern**: Dostęp do danych abstrakcyjny przez serwisy Dataverse
- **Middleware Pattern**: Autentykacja/autoryzacja jako middleware
- **Factory Pattern**: Tworzenie encji i klientów
- **Dependency Injection**: Serwisy otrzymują zależności (klient, konfiguracja)

---

### 3. Autentykacja i autoryzacja

**Przepływ**:
```
1. Użytkownik autentykuje się przez Azure Entra ID (OAuth 2.0 / OIDC)
   ↓
2. Entra ID wydaje JWT z claims użytkownika + grupami bezpieczeństwa
   ↓
3. Frontend (MSAL) przechowuje JWT w sessionStorage
   ↓
4. Frontend wysyła JWT w nagłówku Authorization do API
   ↓
5. Middleware API waliduje JWT:
   - Weryfikuje podpis kryptograficznie (JWKS z Entra ID)
   - Sprawdza issuer, audience, czas wygaśnięcia
   - Mapuje grupy bezpieczeństwa na role (Admin/User)
   ↓
6. API przyznaje/odmawia dostępu na podstawie wymaganej roli
```

**Mapowanie grup bezpieczeństwa → ról**:
```typescript
// Zmienne środowiskowe
ADMIN_GROUP_ID=<Azure Entra ID Group Object ID>
USER_GROUP_ID=<Azure Entra ID Group Object ID>

// Logika middleware (api/src/lib/auth/middleware.ts)
if (groups.includes(ADMIN_GROUP_ID)) {
  roles.push('Admin')
}
if (groups.includes(USER_GROUP_ID)) {
  roles.push('User')
}
```

**Wymagania ról**:
- **Admin**: CRUD, kategoryzacja AI, synchronizacja, ustawienia
- **User**: Dostęp read-only, ograniczone aktualizacje (metadane faktur)

> Szczegóły konfiguracji: [Entra ID — konfiguracja](./ENTRA_ID_KONFIGURACJA.md)

---

### 4. Warstwa danych (Microsoft Dataverse)

Pełna specyfikacja encji, relacji, OptionSetów i indeksów znajduje się w: [Schemat Dataverse](./DATAVERSE_SCHEMA.md)

**Główne encje**:

| Encja | Opis |
|-------|------|
| `dvlp_ksefsetting` | Konfiguracja per firma (NIP, środowisko, sync) |
| `dvlp_ksefsession` | Sesje komunikacji z API KSeF |
| `dvlp_ksefinvoice` | Faktury KSeF + metadane + kategoryzacja AI |
| `dvlp_ksefsynclog` | Historia synchronizacji |
| `dvlp_aifeedback` | Feedback użytkownika dla uczenia AI |

**Relacje**:
- `SettingEntity 1:N InvoiceEntity` (jedna firma, wiele faktur)
- `SettingEntity 1:N SyncLogEntity` (jedna firma, wiele operacji sync)
- `InvoiceEntity 1:N AIFeedbackEntity` (jedna faktura, wiele feedbacków)

---

### 5. Integracje zewnętrzne

#### KSeF API (MF.gov.pl)
Integracja z Krajowym Systemem e-Faktur.

**Używane endpointy**:
- `POST /api/online/Session/InitToken` — inicjalizacja sesji
- `POST /api/online/Session/Terminate` — zakończenie sesji
- `GET /api/online/Invoice/Get/{referenceNumber}` — pobranie faktury
- `POST /api/online/Query/Invoice/Sync` — zapytanie o faktury
- `POST /api/online/Invoice/Send` — wysłanie faktury
- `GET /api/online/Invoice/Status/{elementReferenceNumber}` — status
- `GET /api/online/Invoice/Upo/{referenceNumber}` — pobranie UPO

**Środowiska**:
- **Produkcja**: `https://ksef.mf.gov.pl/api/`
- **Demo**: `https://ksef-demo.mf.gov.pl/api/`
- **Test**: `https://ksef-test.mf.gov.pl/api/`

**Obsługa błędów**: Retry z exponential backoff, logowanie do Application Insights.

#### Azure OpenAI (GPT-4o-mini)
Kategoryzacja faktur z użyciem AI.

**Model**: GPT-4o-mini (konfigurowalny)  
**Funkcje**: Sugestia MPK, kategorii, generowanie opisu faktury  
**Feedback**: Śledzenie applied/modified/rejected, cache dostawca → kategoria

> Szczegóły konfiguracji: [AI Kategoryzacja](./AI_CATEGORIZATION_SETUP.md)

#### GUS API (REGON/NIP)
Weryfikacja podmiotów w rejestrze GUS.

**Możliwości**: Walidacja NIP, wyszukiwanie firm, pobieranie adresów i REGON.

#### NBP API
Pobieranie kursów walut z Narodowego Banku Polskiego.

---

## Przepływy danych

### Synchronizacja faktur

```
1. Użytkownik uruchamia sync (POST /api/ksef/sync)
   ↓
2. API pobiera ustawienie (tenant) z Dataverse
   ↓
3. API pobiera token KSeF z Azure Key Vault
   ↓
4. API inicjalizuje sesję KSeF (jeśli nieaktywna)
   ↓
5. API odpytuje KSeF o faktury (zakres dat)
   ↓
6. Dla każdej faktury:
   a. Sprawdź czy już istnieje w Dataverse (po referenceNumber)
   b. Jeśli nowa:
      - Parsuj XML
      - Utwórz rekord InvoiceEntity w Dataverse
      - Wyzwól kategoryzację AI (jeśli włączona)
   ↓
7. Utwórz rekord SyncLogEntity ze statystykami
   ↓
8. Zwróć podsumowanie synchronizacji
```

### Kategoryzacja AI

```
1. Użytkownik wyzwala kategoryzację (POST /api/ai/categorize)
   ↓
2. API pobiera fakturę z Dataverse
   ↓
3. API konstruuje prompt z danymi faktury + centrami kosztów
   ↓
4. API wywołuje Azure OpenAI (GPT-4o-mini)
   ↓
5. API parsuje odpowiedź JSON
   ↓
6. API waliduje wartość MPK w Dataverse
   ↓
7. API aktualizuje fakturę z:
   - dvlp_aimpksuggestion
   - dvlp_aicategorysuggestion
   - dvlp_aiconfidence
   ↓
8. Zwróć sugestie użytkownikowi
   ↓
9. Użytkownik zatwierdza/modyfikuje/odrzuca
   ↓
10. API zapisuje wpis AIFeedbackEntity
```

### Autentykacja

```
1. Użytkownik odwiedza frontend (Next.js)
   ↓
2. MSAL przekierowuje do Azure Entra ID
   ↓
3. Użytkownik autentykuje się (login/hasło lub SSO)
   ↓
4. Entra ID wydaje JWT z:
   - Claims użytkownika (oid, name, email)
   - Grupami bezpieczeństwa (Admin/User)
   ↓
5. MSAL przechowuje JWT w sessionStorage
   ↓
6. Frontend wykonuje wywołanie API z Authorization: Bearer <JWT>
   ↓
7. Middleware API weryfikuje JWT:
   - Pobiera JWKS z Entra ID
   - Waliduje podpis, issuer, audience, wygaśnięcie
   - Mapuje grupy na role (Admin/User)
   ↓
8. API wykonuje żądanie z kontekstem roli
```

---

## Architektura bezpieczeństwa

### Obrona warstwowa (Defense in Depth)

**Warstwa 1: Sieć**
- HTTPS/TLS 1.2+ wyłącznie
- CORS skonfigurowany tylko dla originu frontendu

**Warstwa 2: Autentykacja**
- Azure Entra ID OAuth 2.0 / OIDC
- JWT z kryptograficzną walidacją podpisu (RS256)
- Krótkotrwałe tokeny (domyślnie 1 godzina)
- Brak dostępu anonymous (z wyjątkiem `/api/health`)

**Warstwa 3: Autoryzacja**
- RBAC (Role-Based Access Control)
- Członkostwo w grupach z Entra ID
- Szczegółowe uprawnienia per endpoint
- Walidacja startowa: crash jeśli `SKIP_AUTH=true` w produkcji

**Warstwa 4: Dane**
- Wrażliwe dane (tokeny KSeF) w Azure Key Vault
- Managed Identity do dostępu Key Vault (bez credentials)
- Szyfrowanie w spoczynku (domyślnie Azure)

**Warstwa 5: Aplikacja**
- Walidacja danych wejściowych (Zod schemas)
- Zapobieganie SQL injection (sanityzacja zapytań OData)
- Zapobieganie XSS (React auto-escaping)

### Zarządzanie sekretami

- **Tokeny KSeF**: Przechowywane w Azure Key Vault jako sekrety
- **Konwencja nazewnictwa**: `ksef-token-{nip}`
- **Rotacja**: Ręczna przez UI ustawień (tylko Admin)
- **Dostęp**: Managed Identity z minimalnymi uprawnieniami

> Szczegóły: [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md)

---

## Architektura wdrożenia

### Zasoby Azure

```
Resource Group: rg-ksef
├── Azure App Service (Frontend)               ← Next.js 15 standalone
│   ├── Runtime: Node.js 22 LTS (Linux)
│   ├── Tryb: WEBSITE_RUN_FROM_PACKAGE=1
│   └── Application Insights (monitoring)
├── Azure Functions App — Flex Consumption (API)
│   ├── Runtime: Node.js 22
│   ├── Application Insights (monitoring)
│   └── Storage Account (function runtime)
├── Azure Key Vault
│   ├── Tokeny KSeF (ksef-token-{nip})
│   ├── Client Secret, OpenAI Key, Endpoint
│   └── Managed Identity access (RBAC)
├── Azure OpenAI Service
│   └── Model: gpt-4o-mini
├── Dataverse Environment
│   └── Encje dvlp_ksef*
└── Azure Entra ID App Registration
    ├── Uprawnienia API (Dataverse, Graph)
    └── Grupy bezpieczeństwa (Admin, User)
```

> Szczegóły wdrożenia: [API Deployment](./API_DEPLOYMENT.md) | [Web Deployment](./WEB_DEPLOYMENT.md)

### CI/CD

**GitHub Actions** (`.github/workflows/`):
- `ci.yml`: Type check, lint, test, build, security scan (Trivy)
- `deploy-api.yml`: Deploy Azure Functions
- `deploy-web.yml`: Deploy Azure App Service

---

## Stos technologiczny

### Backend (API)
- **Runtime**: Node.js 22 LTS
- **Framework**: Azure Functions v4 (Flex Consumption, HTTP triggers)
- **Język**: TypeScript 5.7 (strict mode)
- **Klient HTTP**: `axios` (z retry interceptors)
- **Walidacja**: `zod` schemas
- **JWT**: `jose` (walidacja JWKS)
- **Testowanie**: Vitest 2.1.9
- **Linting**: ESLint 9 z regułami TypeScript

### Frontend (Web)
- **Framework**: Next.js 15 z App Router (tryb standalone)
- **Runtime**: React 19
- **Język**: TypeScript 5.7
- **Stylowanie**: Tailwind CSS 3
- **Komponenty UI**: shadcn/ui (Radix UI primitives)
- **Autentykacja**: MSAL (Microsoft Authentication Library)
- **Stan**: React Server Components + hooki
- **Formularze**: React Hook Form + Zod

### Infrastruktura
- **Compute API**: Azure Functions (Flex Consumption)
- **Compute Web**: Azure App Service (Linux, Node.js 22)
- **Baza danych**: Microsoft Dataverse
- **Sekrety**: Azure Key Vault (RBAC)
- **AI**: Azure OpenAI (GPT-4o-mini)
- **Monitoring**: Application Insights
- **Storage**: Azure Blob Storage

### DevOps
- **Kontrola wersji**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Menadżer pakietów**: npm (workspaces)
- **Skanowanie bezpieczeństwa**: Trivy, Dependabot
- **Pre-commit**: Husky (typecheck + lint)

---

## Wzorce projektowe

### 1. Service Layer Pattern
Logika biznesowa zakapulowana w wielokrotnie używalnych serwisach.
```typescript
export class InvoiceService {
  async getById(id: string): Promise<Invoice> { ... }
  async query(filter: string): Promise<Invoice[]> { ... }
  async create(data: CreateInvoice): Promise<Invoice> { ... }
}
```

### 2. Middleware Pattern
Autentykacja i autoryzacja jako middleware.
```typescript
export async function verifyAuth(req: HttpRequest, context: InvocationContext) {
  const token = extractToken(req)
  const decoded = await jose.jwtVerify(token, JWKS, { ... })
  return { user: decoded.payload, roles: extractRoles(decoded.payload) }
}
```

### 3. Repository Pattern
Abstrakcja dostępu do danych przez serwisy Dataverse.

### 4. Factory Pattern
Spójne tworzenie instancji encji.

### 5. Dependency Injection
Serwisy otrzymują zależności, umożliwiając testowalność.

---

## Wydajność i skalowalność

### Optymalizacje wydajności

**API**:
- Serverless auto-scaling (Azure Functions Flex Consumption)
- Optymalizacja zapytań Dataverse (select tylko potrzebnych pól)
- Cache: Tokeny sesji w Dataverse (unikanie roundtripów Key Vault)
- Async/await dla równoczesnych operacji

**Frontend**:
- React Server Components (redukcja klienckiego JS)
- Code splitting (automatyczny Next.js)
- Optymalizacja obrazów (next/image)
- Tryb standalone (~40 MB vs ~500 MB z pełnym node_modules)

### Monitoring i obserwacja

**Application Insights**:
- Telemetria żądań/odpowiedzi
- Śledzenie wyjątków
- Custom events (synchronizacja, kategoryzacja AI)
- Metryki wydajności (czasy odpowiedzi, zależności)

**Alerty**:
- Awarie wykonania funkcji (>5% error rate)
- Wysoka latencja (>2s p95)
- Błędy dostępu Key Vault
- Throttling Dataverse

---

## Planowane ulepszenia

1. **Architektura event-driven** — Azure Event Grid dla zdarzeń synchronizacji
2. **Warstwa cache** — Redis dla częstych zapytań
3. **Przetwarzanie wsadowe** — Azure Durable Functions dla długotrwałych operacji sync
4. **Infrastructure as Code** — Kompletne szablony Bicep
5. **Zaawansowane AI** — Fine-tuning modeli z danymi feedbacków, wykrywanie anomalii

---

## Powiązane dokumenty

- [Dokumentacja API](./API_PL.md) — pełna dokumentacja endpointów
- [Schemat Dataverse](./DATAVERSE_SCHEMA.md) — model danych
- [Wersja angielska](./en/ARCHITECTURE.md) — English version
- [README](../README.md) — quick start
- [SECURITY](../SECURITY.md) — polityka bezpieczeństwa

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 2.0  
**Opiekun:** dvlp-dev team
