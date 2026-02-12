# Custom Connector — Power Platform (KSeF API)

Instrukcja konfiguracji Custom Connector w Power Platform do połączenia z KSeF API (Azure Functions).

---

## 1. Podsumowanie zabezpieczeń API

### Uwierzytelnianie — Azure Entra ID (OAuth 2.0 / JWT Bearer)

| Warstwa | Mechanizm | Szczegóły |
|---------|-----------|-----------|
| **Autentykacja** | Azure Entra ID JWT (OAuth 2.0) | Weryfikacja podpisu JWKS, walidacja issuer/audience |
| **Autoryzacja** | RBAC (Admin / Reader) | Kontrola ról per-endpoint przez `requireRole()` |
| **Zarządzanie sekretami** | Azure Key Vault | Tokeny KSeF przechowywane jako sekrety |
| **API → Dataverse** | Client Credentials (OAuth 2.0) | Osobna tożsamość serwisowa |
| **Walidacja danych** | Zod schemas | Ciała żądań walidowane z typowanymi schematami |
| **Functions Auth Level** | `anonymous` | Auth realizowany w kodzie aplikacji, nie na poziomie Azure Functions |
| **Bezpieczeństwo dev** | Hard crash guard | `SKIP_AUTH=true` w produkcji powoduje natychmiastowy crash |

**Jak działa flow uwierzytelniania:**

1. Klient uzyskuje token JWT z Azure Entra ID (endpoint `/oauth2/v2.0/token`)
2. Token przekazywany w nagłówku `Authorization: Bearer <token>`
3. API weryfikuje podpis tokena kryptograficznie (JWKS)
4. API sprawdza issuer (akceptuje v1.0 `sts.windows.net` i v2.0 `login.microsoftonline.com`)
5. API sprawdza audience (akceptuje `{CLIENT_ID}` i `api://{CLIENT_ID}`)
6. Role wyciągane z claim `roles` (App Roles) lub `groups` (Security Groups)

**Role RBAC:**

| Rola | Poziom dostępu |
|------|----------------|
| **Admin** | Pełny dostęp — synchronizacja, import, zapis, usuwanie, AI, ustawienia |
| **Reader** | Tylko odczyt — lista faktur, dashboard, kursy walut |

---

## 2. Wymagane App Registration w Azure Entra ID

### Istniejące API App Registration

| Parametr | Wartość |
|----------|---------|
| Tenant ID | `YOUR_TENANT_ID` |
| Client ID (API) | `YOUR_CLIENT_ID` |
| Audience | `api://YOUR_CLIENT_ID` |

### Nowa App Registration dla Custom Connector

Aby Power Platform mógł się uwierzytelniać, potrzebujesz **drugiej** App Registration (klient), która będzie żądać tokenów z uprawnieniami do API:

1. **Portal Azure → App registrations → + New registration**
   - Name: `KSeF-PowerPlatform-Connector`
   - Supported account types: Single tenant
   - Redirect URI: (uzupełnisz po utworzeniu connectora — patrz krok 5)

2. **Certificates & secrets → + New client secret**
   - Description: `power-platform-connector`
   - Zapisz wygenerowany **Client Secret** (wartość)

3. **API permissions → + Add a permission → My APIs**
   - Wybierz rejestrację API: `YOUR_CLIENT_ID`
   - Dodaj uprawnienie delegowane lub aplikacyjne (Application) zależnie od scenariusza:
     - **Delegated** — jeśli chcesz, żeby connector działał w kontekście użytkownika
     - **Application** — jeśli chcesz, żeby działał jako serwis (bez kontekstu użytkownika)
   - Kliknij **Grant admin consent**

4. **Na rejestracji API** (`YOUR_CLIENT_ID`):
   - **Expose an API → + Add a scope** (jeśli jeszcze nie istnieje):
     - Scope name: `access_as_user`
     - Admin consent display name: `Access KSeF API`
     - State: Enabled
   - **Expose an API → + Add a client application**:
     - Client ID: (ID nowej rejestracji `KSeF-PowerPlatform-Connector`)
     - Authorized scopes: zaznacz `access_as_user`

5. **Redirect URI** — po utworzeniu connectora w Power Platform skopiuj redirect URL i dodaj go do rejestracji `KSeF-PowerPlatform-Connector`:
   - Typowy format: `https://global.consent.azure-apim.net/redirect`

---

## 3. Konfiguracja Custom Connector — krok po kroku

### 3.1. Utwórz nowy connector

1. Przejdź do **Power Automate** → ⚙ **Data** → **Custom connectors** → **+ New custom connector** → **Create from blank**
2. Nazwa: `KSeF API`

### 3.2. Tab: General

| Pole | Wartość |
|------|---------|
| Scheme | `HTTPS` |
| Host | `<nazwa-azure-function-app>.azurewebsites.net` |
| Base URL | `/api` |
| Description | `Connector do KSeF API — zarządzanie fakturami, synchronizacja z KSeF, dashboard` |

> **Uwaga:** Jeśli API jest za Azure Static Web App proxy, host to URL SWA, np. `<app-name>.azurestaticapps.net`, a base URL to `/api`.

### 3.3. Tab: Security

| Pole | Wartość |
|------|---------|
| Authentication type | `OAuth 2.0` |
| Identity Provider | `Azure Active Directory` |
| Client ID | `<Client ID nowej rejestracji KSeF-PowerPlatform-Connector>` |
| Client Secret | `<Client Secret nowej rejestracji>` |
| Tenant ID | `YOUR_TENANT_ID` |
| Resource URL | `api://YOUR_CLIENT_ID` |
| Scope | `api://YOUR_CLIENT_ID/access_as_user` |
| Authorization URL | `https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/authorize` |
| Token URL | `https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token` |
| Refresh URL | `https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token` |

Po zapisaniu sekcji Security, skopiuj **Redirect URL** (wyświetlony przez Power Platform) i dodaj go w App Registration → Authentication → Redirect URIs.

### 3.4. Tab: Definition — definiowanie akcji

Dodaj akcje odpowiadające endpointom API. Poniżej **kluczowe akcje** do zdefiniowania:

#### Health Check

| Pole | Wartość |
|------|---------|
| Summary | `Health Check` |
| Operation ID | `HealthCheck` |
| Method | `GET` |
| URL | `/health` |
| Visibility | `internal` |

#### List Invoices

| Pole | Wartość |
|------|---------|
| Summary | `List Invoices` |
| Operation ID | `ListInvoices` |
| Method | `GET` |
| URL | `/invoices` |
| Visibility | `important` |

**Parametry Query:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | integer | No | Numer strony |
| `pageSize` | integer | No | Rozmiar strony |
| `search` | string | No | Wyszukiwanie tekstowe |
| `direction` | string | No | `income` lub `outcome` |
| `status` | string | No | Status faktury |
| `dateFrom` | string | No | Data od (ISO 8601) |
| `dateTo` | string | No | Data do (ISO 8601) |

#### Get Invoice

| Pole | Wartość |
|------|---------|
| Summary | `Get Invoice` |
| Operation ID | `GetInvoice` |
| Method | `GET` |
| URL | `/invoices/{id}` |
| Path param `id` | string, required |

#### Update Invoice

| Pole | Wartość |
|------|---------|
| Summary | `Update Invoice` |
| Operation ID | `UpdateInvoice` |
| Method | `PATCH` |
| URL | `/invoices/{id}` |
| Path param `id` | string, required |
| Body | JSON — pola do aktualizacji (mpk, status, notes) |

#### Create Manual Invoice

| Pole | Wartość |
|------|---------|
| Summary | `Create Manual Invoice` |
| Operation ID | `CreateManualInvoice` |
| Method | `POST` |
| URL | `/invoices/manual` |
| Body | JSON — dane faktury |

#### Dashboard Stats

| Pole | Wartość |
|------|---------|
| Summary | `Get Dashboard Stats` |
| Operation ID | `GetDashboardStats` |
| Method | `GET` |
| URL | `/dashboard/stats` |

#### Start KSeF Sync

| Pole | Wartość |
|------|---------|
| Summary | `Start KSeF Sync` |
| Operation ID | `StartSync` |
| Method | `POST` |
| URL | `/sync` |
| Body | JSON — `{ "settingsId": "<guid>" }` |

#### Get Sync Logs

| Pole | Wartość |
|------|---------|
| Summary | `Get Sync Logs` |
| Operation ID | `GetSyncLogs` |
| Method | `GET` |
| URL | `/sync/logs` |

#### List Settings (Companies)

| Pole | Wartość |
|------|---------|
| Summary | `List Settings` |
| Operation ID | `ListSettings` |
| Method | `GET` |
| URL | `/settings` |

#### GUS Lookup (NIP)

| Pole | Wartość |
|------|---------|
| Summary | `GUS Lookup by NIP` |
| Operation ID | `GusLookup` |
| Method | `POST` |
| URL | `/gus/lookup` |
| Body | `{ "nip": "string" }` |

#### Exchange Rate

| Pole | Wartość |
|------|---------|
| Summary | `Get Exchange Rate` |
| Operation ID | `GetExchangeRate` |
| Method | `GET` |
| URL | `/exchange-rates` |
| Query params | `currency` (string), `date` (string, optional) |

#### AI Categorize Invoice

| Pole | Wartość |
|------|---------|
| Summary | `AI Categorize Invoice` |
| Operation ID | `AICategorize` |
| Method | `POST` |
| URL | `/ai/categorize` |
| Body | JSON — `{ "invoiceId": "string" }` |

> **Tip:** Nie musisz definiować wszystkich 72 endpointów od razu. Zacznij od tych najczęściej używanych w automatyzacjach i dodawaj kolejne w miarę potrzeb.

### 3.5. Tab: Code (opcjonalnie)

Nie jest wymagana custom code policy. Standardowy OAuth flow wystarczy.

### 3.6. Tab: Test

1. Kliknij **Create connector** (zapisz)
2. Kliknij **+ New connection**
3. Zaloguj się kontem z Azure Entra ID (konto musi mieć przypisane role Admin lub Reader)
4. Przetestuj akcję **Health Check** — oczekiwana odpowiedź:
   ```json
   {
     "status": "ok",
     "version": "1.0.0",
     "environment": "production"
   }
   ```

---

## 4. Użycie w Power Automate

### Przykład 1: Automatyczna synchronizacja KSeF (Schedule)

```
Trigger:   Recurrence (co 1 godzinę)
   ↓
Action:    KSeF API → List Settings
   ↓
Apply to each: dla każdego settingu
   ↓
Action:    KSeF API → Start KSeF Sync (settingsId = current item ID)
   ↓
Action:    KSeF API → Get Sync Logs (sprawdź wynik)
   ↓
Condition: jeśli sync error → wyślij email/Teams notification
```

### Przykład 2: Nowa faktura → kategoryzacja AI

```
Trigger:   Recurrence / When invoice synced (polling ListInvoices z filtrem)
   ↓
Action:    KSeF API → List Invoices (status=new, dateFrom=utcNow - 1h)
   ↓
Apply to each: dla każdej nowej faktury
   ↓
Action:    KSeF API → AI Categorize Invoice (invoiceId)
   ↓
Action:    KSeF API → Update Invoice (przypisz MPK z wyniku AI)
```

### Przykład 3: Sprawdzanie kontrahenta (GUS)

```
Trigger:   When manually triggered (input: NIP)
   ↓
Action:    KSeF API → GUS Lookup by NIP
   ↓
Action:    Compose / Respond → zwróć dane firmy
```

---

## 5. Pełna lista endpointów API

Poniżej kompletna lista do referencji przy definiowaniu kolejnych akcji connectora.

### Health (bez auth)
| Method | Route | Opis |
|--------|-------|------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health (Key Vault, Dataverse, KSeF) |

### Settings
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| GET | `/settings` | Reader | Lista firm/ustawień |
| POST | `/settings` | Admin | Utwórz ustawienie |
| GET | `/settings/{id}` | Reader | Pobierz ustawienie |
| PATCH | `/settings/{id}` | Admin | Aktualizuj ustawienie |
| DELETE | `/settings/{id}` | Admin | Usuń ustawienie (soft) |
| POST | `/settings/{id}/test-token` | Any | Test połączenia z KSeF |
| GET | `/settings/costcenters` | Reader | Lista MPK |
| POST | `/settings/costcenters` | Admin | Utwórz MPK |
| PATCH | `/settings/costcenters/{id}` | Admin | Aktualizuj MPK |
| DELETE | `/settings/costcenters/{id}` | Admin | Usuń MPK |

### KSeF Session
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/ksef/session` | Admin | Rozpocznij sesję KSeF |
| GET | `/ksef/session` | Reader | Status sesji |
| DELETE | `/ksef/session` | Admin | Zakończ sesję |

### KSeF Invoices (bezpośrednie operacje KSeF)
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/ksef/invoices/send` | Admin | Wyślij fakturę do KSeF |
| POST | `/ksef/invoices/batch` | Admin | Wyślij batch faktur |
| GET | `/ksef/invoices/{ref}` | Reader | Pobierz po numerze KSeF |
| GET | `/ksef/invoices/{ref}/status` | Reader | Status przetwarzania |
| POST | `/ksef/invoices/query` | Reader | Zapytanie do KSeF |
| GET | `/ksef/invoices/{ref}/upo` | Reader | Pobierz UPO |

### KSeF Sync
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/ksef/sync` | Admin | Pełna synchronizacja |
| GET | `/ksef/sync/preview` | Reader | Podgląd przed importem |
| POST | `/ksef/sync/import` | Admin | Import z podglądu |
| POST | `/ksef/sync/incoming` | Admin | Sync przychodzących |
| GET | `/ksef/status` | Admin | Status połączenia per firma |

### Invoices (Dataverse CRUD)
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| GET | `/invoices` | Reader | Lista faktur |
| GET | `/invoices/{id}` | Reader | Pojedyncza faktura |
| PATCH | `/invoices/{id}` | Admin | Aktualizuj fakturę |
| DELETE | `/invoices/{id}` | Admin | Usuń fakturę |
| POST | `/invoices/manual` | Admin | Utwórz ręcznie |

### Documents & Attachments
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| PUT | `/invoices/{id}/document` | Admin | Upload dokumentu |
| GET | `/invoices/{id}/document` | Reader | Metadata dokumentu |
| GET | `/invoices/{id}/document/stream` | Reader | Stream dokumentu |
| DELETE | `/invoices/{id}/document` | Admin | Usuń dokument |
| POST | `/invoices/{id}/attachments` | Admin | Upload załącznika |
| GET | `/invoices/{id}/attachments` | Reader | Lista załączników |
| GET | `/attachments/{id}/download` | Reader | Pobierz załącznik |
| DELETE | `/attachments/{id}` | Admin | Usuń załącznik |
| GET | `/documents/config` | Reader | Konfiguracja uploadu |
| GET | `/attachments/config` | Reader | Konfiguracja załączników |

### Notes
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/invoices/{id}/notes` | Admin | Utwórz notatkę |
| GET | `/invoices/{id}/notes` | Reader | Lista notatek |
| GET | `/notes/{id}` | Reader | Pojedyncza notatka |
| PATCH | `/notes/{id}` | Admin | Aktualizuj |
| DELETE | `/notes/{id}` | Admin | Usuń |

### AI
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/ai/categorize` | Admin | Kategoryzuj fakturę |
| POST | `/ai/batch-categorize` | Admin | Batch kategoryzacja |
| GET | `/ai/test` | Admin | Test połączenia AI |

### Dashboard
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| GET | `/dashboard/stats` | Reader | Statystyki |

### Sync v2
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/sync` | Admin | Start sync |
| GET | `/sync/logs` | Reader | Historia logów |
| GET | `/sync/logs/{id}` | Reader | Pojedynczy log |
| GET | `/sync/stats/{settingId}` | Reader | Statystyki sync |

### Exchange Rates
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| GET | `/exchange-rates` | Reader | Kurs NBP |
| POST | `/exchange-rates/convert` | Reader | Przelicz na PLN |

### GUS
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/gus/lookup` | Any | Wyszukaj po NIP |
| POST | `/gus/search` | Any | Wyszukaj po nazwie |
| GET | `/gus/validate/{nip}` | Any | Waliduj NIP |

### Document Processing
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| POST | `/documents/extract` | Admin | OCR/AI ekstrakcja danych |

### KSeF Test Data (dev/test)
| Method | Route | Rola | Opis |
|--------|-------|------|------|
| GET | `/ksef/testdata/permissions` | Admin | Sprawdź uprawnienia |
| POST | `/ksef/testdata/permissions` | Admin | Nadaj uprawnienia |
| POST | `/ksef/testdata/person` | Admin | Utwórz osobę testową |
| GET | `/ksef/testdata/environments` | Admin | Lista środowisk KSeF |
| DELETE | `/ksef/testdata/cleanup` | Admin | Wyczyść dane testowe |
| GET | `/ksef/testdata/cleanup/preview` | Admin | Podgląd czyszczenia |
| POST | `/ksef/testdata/generate` | Admin | Generuj dane testowe |

---

## 6. Troubleshooting

| Problem | Rozwiązanie |
|---------|-------------|
| `401 Unauthorized` | Sprawdź czy token jest prawidłowy; sprawdź audience w App Registration |
| `403 Forbidden` | Sprawdź przypisane role — endpoint wymaga Admin, a user ma Reader |
| `AADSTS65001` (consent) | Nie nadano admin consent w App Registration |
| `AADSTS700016` (app not found) | Nieprawidłowy Client ID — sprawdź ID nowej rejestracji |
| Connector nie widzi odpowiedzi | Zdefiniuj Response schema w Definition tab (skopiuj przykładową odpowiedź) |
| CORS error | Nie dotyczy — Power Platform wywołuje API server-side, CORS nie ma znaczenia |

---

## 7. Uwagi bezpieczeństwa

- **Nie eksponuj endpointów test data** w connectorze produkcyjnym — to narzędzia deweloperskie
- **Health endpoints** nie wymagają auth — można je użyć do monitorowania bez uwierzytelnienia
- **Zasada najmniejszych uprawnień** — jeśli flow potrzebuje tylko odczytu, użyj konta z rolą Reader
- **Client Secret rotation** — ustaw reminder na wygaśnięcie secretu w App Registration
- **Audit** — Power Automate loguje każde wywołanie connectora, sprawdzaj w DLP i audit logs

---

## Powiązane dokumenty

- [API REST](./API_PL.md) — pełna dokumentacja endpointów
- [Konfiguracja Entra ID](./ENTRA_ID_KONFIGURACJA.md) — App Registration, scope
- [Schemat Dataverse](./DATAVERSE_SCHEMA.md) — model danych

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 1.0  
**Opiekun:** dvlp-dev team
