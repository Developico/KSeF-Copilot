# Dokumentacja API

## Spis treści
- [Autentykacja](#autentykacja)
- [Endpointy API](#endpointy-api)
  - [Health i status](#health-i-status)
  - [Zarządzanie ustawieniami](#zarządzanie-ustawieniami)
  - [Zarządzanie sesjami KSeF](#zarządzanie-sesjami-ksef)
  - [Faktury KSeF](#faktury-ksef)
  - [Synchronizacja KSeF](#synchronizacja-ksef)
  - [Zarządzanie fakturami](#zarządzanie-fakturami)
  - [Załączniki](#załączniki)
  - [Kategoryzacja AI](#kategoryzacja-ai)
  - [Dashboard i analityka](#dashboard-i-analityka)
  - [Prognoza wydatków](#prognoza-wydatków)
  - [Wykrywanie anomalii](#wykrywanie-anomalii)
  - [Centra kosztów MPK](#centra-kosztów-mpk)
  - [Zatwierdzanie faktur](#zatwierdzanie-faktur)
  - [Budżet](#budżet)
  - [Powiadomienia](#powiadomienia)
  - [Raporty](#raporty)
  - [Wyszukiwanie WL VAT (Biała Lista)](#wyszukiwanie-wl-vat-biała-lista)
  - [Przetwarzanie dokumentów](#przetwarzanie-dokumentów)
  - [Dostawcy](#dostawcy)
  - [Umowy samofakturowania](#umowy-samofakturowania)
  - [Szablony samofakturowania](#szablony-samofakturowania)
  - [Faktury samofakturowania](#faktury-samofakturowania)
  - [Zatwierdzanie samofakturowania](#zatwierdzanie-samofakturowania)
  - [Import samofakturowania](#import-samofakturowania)
- [Obsługa błędów](#obsługa-błędów)
- [Limity zapytań](#limity-zapytań)

## Autentykacja

Wszystkie endpointy API (z wyjątkiem `/api/health`) wymagają autentykacji za pomocą tokenów JWT z Azure Entra ID (dawniej Azure AD).

### Nagłówki
```http
Authorization: Bearer <jwt_token>
```

### Role
- **Admin**: Pełny dostęp do wszystkich operacji
- **User**: Dostęp tylko do odczytu i ograniczone operacje zapisu

### Walidacja tokenu
- Tokeny są walidowane przy użyciu JWKS (JSON Web Key Set) z Azure Entra ID
- Weryfikowane są: issuer, audience i czas wygaśnięcia
- Grupy bezpieczeństwa są mapowane na role aplikacji przez `GROUP_ROLE_MAPPING`

**Ważne**: Ustaw `SKIP_AUTH=true` wyłącznie dla lokalnego developmentu. Flaga pomija **cały pipeline autentykacji** (nie tylko walidację JWT) — nie odczytuje tokenu, nie weryfikuje podpisu, nie mapuje grup na role. Zamiast tego wstrzykuje hardcoded użytkownika `dev-user` z rolą `Admin`. Aplikacja crashuje przy starcie jeśli `SKIP_AUTH=true` w produkcji (`NODE_ENV=production`).

---

## Endpointy API

### Health i status

#### GET /api/health
Sprawdzenie stanu API i łączności.

**Autentykacja**: Nie wymagana

**Odpowiedź** (200):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T10:00:00.000Z",
  "services": {
    "dataverse": "connected",
    "keyVault": "connected"
  }
}
```

#### GET /api/ksef/status
Sprawdzenie statusu API KSeF.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "status": "online",
  "environment": "production",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

---

### Zarządzanie ustawieniami

#### GET /api/settings
Lista wszystkich ustawień (firmy/tenanci).

**Autentykacja**: User  
**Rola**: Admin lub User

**Parametry zapytania**:
- `active` (boolean): Filtrowanie po statusie aktywności

**Odpowiedź** (200):
```json
{
  "settings": [
    {
      "id": "uuid",
      "nip": "1234567890",
      "name": "Nazwa Firmy",
      "tokenSecretName": "ksef-token-1234567890",
      "isActive": true,
      "createdOn": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/settings/{id}
Pobranie pojedynczego ustawienia po ID.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "nip": "1234567890",
  "name": "Nazwa Firmy",
  "tokenSecretName": "ksef-token-1234567890",
  "isActive": true,
  "createdOn": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/settings
Utworzenie nowego ustawienia.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "nip": "1234567890",
  "name": "Nazwa Firmy",
  "tokenSecretName": "ksef-token-1234567890"
}
```

**Odpowiedź** (201):
```json
{
  "id": "uuid",
  "nip": "1234567890",
  "name": "Nazwa Firmy",
  "tokenSecretName": "ksef-token-1234567890",
  "isActive": true
}
```

#### PATCH /api/settings/{id}
Aktualizacja ustawienia.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "name": "Zaktualizowana Nazwa Firmy",
  "isActive": false
}
```

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "nip": "1234567890",
  "name": "Zaktualizowana Nazwa Firmy",
  "isActive": false
}
```

#### DELETE /api/settings/{id}
Miękkie usunięcie ustawienia (ustawia isActive=false).

**Autentykacja**: Admin

**Odpowiedź** (204): Brak treści

#### GET /api/settings/costcenters
> **Przestarzałe** — Zwraca starsze, oparte na OptionSet centra kosztów. Użyj [GET /api/mpk-centers](#get-apimpk-centers) zamiast tego.

Lista wszystkich centrów kosztów (wartości MPK) z modelu OptionSet.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "costCenters": [
    { "value": 100000000, "label": "Consultants" },
    { "value": 100000001, "label": "BackOffice" },
    { "value": 100000002, "label": "Management" }
  ]
}
```

---

### Zarządzanie sesjami KSeF

#### POST /api/ksef/session
Inicjalizacja nowej sesji KSeF.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "nip": "1234567890",
  "token": "ksef_authorization_token"
}
```

**Odpowiedź** (200):
```json
{
  "sessionToken": "session-uuid",
  "expiresAt": "2024-01-31T12:00:00.000Z"
}
```

#### GET /api/ksef/session
Sprawdzenie statusu bieżącej sesji.

**Autentykacja**: User

**Parametry zapytania**:
- `nip` (wymagany): NIP firmy

**Odpowiedź** (200):
```json
{
  "isActive": true,
  "sessionToken": "session-uuid",
  "expiresAt": "2024-01-31T12:00:00.000Z"
}
```

#### DELETE /api/ksef/session
Zakończenie aktywnej sesji KSeF.

**Autentykacja**: Admin

**Parametry zapytania**:
- `nip` (wymagany): NIP firmy

**Odpowiedź** (200):
```json
{
  "terminated": true
}
```

---

### Faktury KSeF

#### POST /api/ksef/invoices/send
Wysłanie faktury do KSeF.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "nip": "1234567890",
  "xml": "<Invoice>...</Invoice>"
}
```

**Odpowiedź** (200):
```json
{
  "elementReferenceNumber": "ref-12345",
  "status": "pending"
}
```

#### POST /api/ksef/invoices/batch
Wysłanie wielu faktur do KSeF.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "nip": "1234567890",
  "invoices": [
    { "xml": "<Invoice>...</Invoice>" },
    { "xml": "<Invoice>...</Invoice>" }
  ]
}
```

**Odpowiedź** (200):
```json
{
  "results": [
    { "elementReferenceNumber": "ref-12345", "status": "accepted" },
    { "error": "Nieprawidłowy XML" }
  ]
}
```

#### GET /api/ksef/invoices/{ksefReferenceNumber}
Pobranie faktury po numerze referencyjnym KSeF.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "referenceNumber": "ref-12345",
  "invoiceNumber": "FV/2024/001",
  "supplierNip": "9876543210",
  "supplierName": "Dostawca Sp. z o.o.",
  "invoiceDate": "2024-01-15",
  "grossAmount": 1230.00,
  "xml": "<Invoice>...</Invoice>"
}
```

#### GET /api/ksef/invoices/{elementReferenceNumber}/status
Pobranie statusu przetwarzania faktury.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "elementReferenceNumber": "ref-12345",
  "status": "accepted",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

#### POST /api/ksef/invoices/query
Zapytanie o faktury z KSeF.

**Autentykacja**: User

**Treść żądania**:
```json
{
  "nip": "1234567890",
  "direction": "incoming",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31"
}
```

**Odpowiedź** (200):
```json
{
  "invoices": [
    {
      "referenceNumber": "ref-12345",
      "invoiceNumber": "FV/2024/001",
      "supplierNip": "9876543210",
      "invoiceDate": "2024-01-15",
      "grossAmount": 1230.00
    }
  ],
  "count": 1
}
```

#### GET /api/ksef/invoices/{ksefReferenceNumber}/upo
Pobranie UPO (Urzędowego Poświadczenia Odbioru) dla faktury.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "referenceNumber": "ref-12345",
  "upo": "<UPO>...</UPO>",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

---

### Synchronizacja KSeF

#### POST /api/ksef/sync
Uruchomienie pełnej synchronizacji z KSeF.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "direction": "incoming",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31"
}
```

**Odpowiedź** (200):
```json
{
  "syncId": "uuid",
  "status": "in_progress",
  "total": 150,
  "processed": 0
}
```

#### GET /api/ksef/sync/preview
Podgląd faktur przed importem.

**Autentykacja**: User

**Parametry zapytania**:
- `settingId` (uuid, wymagany)
- `dateFrom` (data, opcjonalny)
- `dateTo` (data, opcjonalny)

**Odpowiedź** (200):
```json
{
  "preview": [
    {
      "referenceNumber": "ref-12345",
      "invoiceNumber": "FV/2024/001",
      "supplierNip": "9876543210",
      "grossAmount": 1230.00,
      "alreadyImported": false
    }
  ],
  "count": 50,
  "newCount": 45,
  "duplicateCount": 5
}
```

#### POST /api/ksef/sync/import
Import podglądniętych faktur.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "referenceNumbers": ["ref-12345", "ref-67890"]
}
```

**Odpowiedź** (200):
```json
{
  "imported": 2,
  "failed": 0,
  "errors": []
}
```

---

### Zarządzanie fakturami

#### GET /api/invoices
Lista wszystkich faktur z filtrowaniem.

**Autentykacja**: User

**Parametry zapytania**:
- `settingId` (uuid): Filtr po ustawieniu/tenancie
- `dateFrom` (data): Data początkowa
- `dateTo` (data): Data końcowa
- `status` (string): Status płatności (pending/paid)
- `mpk` (number): Centrum kosztów
- `limit` (number): Maks. wyników (domyślnie: 100)
- `offset` (number): Offset paginacji

**Odpowiedź** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "referenceNumber": "ref-12345",
      "invoiceNumber": "FV/2024/001",
      "supplierNip": "9876543210",
      "supplierName": "Dostawca Sp. z o.o.",
      "invoiceDate": "2024-01-15",
      "grossAmount": 1230.00,
      "paymentStatus": "pending",
      "mpk": 100000000,
      "category": "Usługi",
      "aiConfidence": 0.95
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

#### GET /api/invoices/{id}
Pobranie pojedynczej faktury po ID.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "referenceNumber": "ref-12345",
  "invoiceNumber": "FV/2024/001",
  "supplierNip": "9876543210",
  "supplierName": "Dostawca Sp. z o.o.",
  "invoiceDate": "2024-01-15",
  "grossAmount": 1230.00,
  "paymentStatus": "pending",
  "mpk": 100000000,
  "category": "Usługi",
  "xml": "<Invoice>...</Invoice>"
}
```

#### PATCH /api/invoices/{id}
Aktualizacja danych faktury. Obsługuje edycję wszystkich sekcji (dane faktury, dostawca, kwoty, waluta, klasyfikacja, status płatności) dla faktur dowolnego źródła (KSeF i ręczne).

**Autentykacja**: Admin

**Treść żądania** (wszystkie pola opcjonalne):
```json
{
  "mpk": 100000001,
  "category": "Marketing",
  "description": "Opis faktury",
  "paymentStatus": "paid",
  "supplierName": "Dostawca Sp. z o.o.",
  "supplierNip": "9876543210",
  "supplierAddress": "ul. Przykładowa 10, 00-001 Warszawa",
  "invoiceNumber": "FV/2025/001",
  "invoiceDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "netAmount": 1000.00,
  "vatAmount": 230.00,
  "grossAmount": 1230.00,
  "currency": "EUR",
  "exchangeRate": 4.3215,
  "exchangeDate": "2025-01-14",
  "exchangeSource": "NBP",
  "grossAmountPln": 5315.45
}
```

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "supplierName": "Dostawca Sp. z o.o.",
  "invoiceNumber": "FV/2025/001",
  "grossAmount": 1230.00,
  "currency": "EUR",
  "paymentStatus": "paid"
}
```

#### DELETE /api/invoices/{id}
Usunięcie faktury (miękkie usunięcie).

**Autentykacja**: Admin

**Odpowiedź** (204): Brak treści

#### POST /api/invoices/manual
Utworzenie faktury ręcznej (nie z KSeF).

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "invoiceNumber": "FV/2024/001",
  "supplierNip": "9876543210",
  "supplierName": "Dostawca Sp. z o.o.",
  "invoiceDate": "2024-01-15",
  "grossAmount": 1230.00,
  "mpk": 100000000
}
```

**Odpowiedź** (201):
```json
{
  "id": "uuid",
  "invoiceNumber": "FV/2024/001",
  "source": "manual"
}
```

---

### Załączniki

#### GET /api/invoices/{id}/attachments
Lista załączników faktury.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "attachments": [
    {
      "id": "uuid",
      "fileName": "faktura.pdf",
      "fileSize": 102400,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-31T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/invoices/{id}/attachments
Wgranie załącznika.

**Autentykacja**: Admin lub User

**Żądanie**: Multipart form-data
- `file`: Plik do wgrania

**Odpowiedź** (201):
```json
{
  "id": "uuid",
  "fileName": "faktura.pdf",
  "fileSize": 102400,
  "url": "https://..."
}
```

#### GET /api/attachments/{id}/download
Pobranie załącznika.

**Autentykacja**: User

**Odpowiedź** (200): Strumień binarny z odpowiednim Content-Type

#### DELETE /api/attachments/{id}
Usunięcie załącznika.

**Autentykacja**: Admin

**Odpowiedź** (204): Brak treści

#### GET /api/attachments/config
Pobranie konfiguracji wgrywania załączników.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "maxFileSize": 10485760,
  "allowedTypes": [".pdf", ".jpg", ".png", ".xml"],
  "maxFilesPerInvoice": 10
}
```

---

### Kategoryzacja AI

#### POST /api/ai/categorize
Kategoryzacja pojedynczej faktury z użyciem AI.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "invoiceId": "uuid"
}
```

**Odpowiedź** (200):
```json
{
  "invoiceId": "uuid",
  "suggestions": {
    "mpk": {
      "value": 100000000,
      "label": "Consultants",
      "confidence": 0.95
    },
    "category": {
      "value": "Usługi",
      "confidence": 0.92
    }
  }
}
```

#### POST /api/ai/batch-categorize
Kategoryzacja wielu faktur.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "invoiceIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Odpowiedź** (200):
```json
{
  "results": [
    {
      "invoiceId": "uuid1",
      "suggestions": { "..." : "..." },
      "applied": true
    }
  ],
  "total": 3,
  "successful": 3,
  "failed": 0
}
```

#### POST /api/ai/test
Test kategoryzacji AI z danymi wejściowymi.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "supplierName": "Microsoft Corporation",
  "description": "Usługi chmurowe Azure"
}
```

**Odpowiedź** (200):
```json
{
  "suggestions": {
    "mpk": { "value": 100000002, "label": "IT", "confidence": 0.98 }
  }
}
```

---

### Dashboard i analityka

#### GET /api/dashboard/stats
Pobranie statystyk dashboardu.

**Autentykacja**: User

**Parametry zapytania**:
- `settingId` (uuid, opcjonalny): Filtr po ustawieniu
- `dateFrom` (data, opcjonalny)
- `dateTo` (data, opcjonalny)

**Odpowiedź** (200):
```json
{
  "totalInvoices": 1500,
  "totalAmount": 1250000.00,
  "byStatus": {
    "pending": 450,
    "paid": 1050
  },
  "byMpk": {
    "100000000": 500,
    "100000001": 300
  },
  "recentInvoices": [ "..." ],
  "topSuppliers": [ "..." ]
}
```

---

### Prognoza wydatków

#### GET /api/forecast/monthly
Zwraca prognozę miesięcznych wydatków na podstawie historii faktur.

**Autentykacja**: User

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawień klienta
- `tenantNip` (string, opcjonalny): NIP klienta (jeśli brak settingId)
- `horizon` (1 | 6 | 12, domyślnie 6): Liczba miesięcy do przodu
- `historyMonths` (3–60, domyślnie 24): Liczba miesięcy historii
- `algorithm` (string, opcjonalny): Wymuszony algorytm (`auto`, `moving-average`, `linear-regression`, `seasonal`, `exponential-smoothing`)
- `algorithmConfig` (JSON, opcjonalny): Parametry algorytmu

**Odpowiedź** (200):
```json
{
  "points": [
    { "month": "2024-03", "predicted": 12000, "lower": 10000, "upper": 14000 },
    ...
  ],
  "trend": "up",
  "summary": { "total": 72000, "avg": 12000 }
}
```

#### GET /api/forecast/by-mpk
Prognoza wydatków z podziałem na MPK (ośrodek kosztów).

**Parametry**: jak wyżej + `top` (int, domyślnie 10, max 20)

**Odpowiedź**: tablica prognoz per MPK

#### GET /api/forecast/by-category
Prognoza wydatków z podziałem na kategorię.

**Parametry**: jak wyżej + `top` (int, domyślnie 10, max 20)

**Odpowiedź**: tablica prognoz per kategoria

#### GET /api/forecast/by-supplier
Prognoza wydatków z podziałem na dostawcę.

**Parametry**: jak wyżej + `top` (int, domyślnie 10, max 20)

**Odpowiedź**: tablica prognoz per dostawca

#### GET /api/forecast/algorithms
Zwraca listę dostępnych algorytmów prognozowania i ich parametry.

**Odpowiedź** (200):
```json
[
  {
    "id": "linear-regression",
    "name": "Regresja liniowa",
    "minDataPoints": 3,
    "parameters": [ ... ]
  }, ...
]
```

---

### Wykrywanie anomalii

#### GET /api/anomalies
Wykrywa anomalie w wydatkach na podstawie reguł.

**Autentykacja**: User

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawień klienta
- `tenantNip` (string, opcjonalny): NIP klienta
- `periodDays` (7–365, domyślnie 30): Okres analizy w dniach
- `sensitivity` (1–5, domyślnie 2.0): Czułość wykrywania
- `enabledRules` (string, opcjonalny): Lista aktywnych reguł (np. `amount-spike,new-supplier`)
- `ruleConfig` (JSON, opcjonalny): Nadpisania parametrów reguł

**Odpowiedź** (200):
```json
{
  "anomalies": [
    { "id": "a1", "type": "amount-spike", "score": 85, "severity": "critical", ... },
    ...
  ],
  "summary": { "critical": 2, "high": 3, "medium": 1, "low": 0 }
}
```

#### GET /api/anomalies/summary
Podsumowanie wykrytych anomalii (liczby, kwoty, typy).

**Parametry**: jak wyżej

**Odpowiedź**: jak wyżej, tylko pole `summary`

#### GET /api/anomalies/rules
Zwraca listę dostępnych reguł wykrywania anomalii i ich parametry.

**Odpowiedź** (200):
```json
[
  {
    "id": "amount-spike",
    "name": "Skok kwoty",
    "parameters": [ ... ]
  }, ...
]
```

---

### Centra kosztów MPK

#### GET /api/mpk-centers
Lista centrów kosztów (MPK).

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, opcjonalny): Filtr po ustawieniu/tenancie
- `activeOnly` (boolean, domyślnie: true): Pokaż tylko aktywne centra

**Odpowiedź** (200):
```json
{
  "mpkCenters": [
    {
      "id": "uuid",
      "name": "IT & Software",
      "code": "MPK-IT",
      "monthlyBudget": 50000,
      "quarterlyBudget": 150000,
      "slaHours": 48,
      "isActive": true,
      "settingId": "uuid"
    }
  ],
  "count": 5
}
```

#### POST /api/mpk-centers
Utworzenie nowego centrum kosztów.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "name": "IT & Software",
  "code": "MPK-IT",
  "monthlyBudget": 50000,
  "quarterlyBudget": 150000,
  "slaHours": 48,
  "settingId": "uuid"
}
```

**Odpowiedź** (201):
```json
{
  "mpkCenter": { "id": "uuid", "name": "IT & Software", ... }
}
```

#### GET /api/mpk-centers/{id}
Pobranie pojedynczego centrum kosztów.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "mpkCenter": { "id": "uuid", "name": "IT & Software", ... }
}
```

#### PATCH /api/mpk-centers/{id}
Aktualizacja centrum kosztów.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "name": "IT & Software (zaktualizowane)",
  "monthlyBudget": 60000
}
```

**Odpowiedź** (200): Zaktualizowany obiekt mpkCenter

#### DELETE /api/mpk-centers/{id}
Dezaktywacja centrum kosztów (miękkie usunięcie).

**Autentykacja**: Admin

**Odpowiedź** (200):
```json
{
  "mpkCenter": { "id": "uuid", "isActive": false, ... }
}
```

#### GET /api/mpk-centers/{id}/approvers
Lista zatwierdzających dla centrum kosztów.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "approvers": [
    {
      "id": "uuid",
      "systemUserId": "uuid",
      "displayName": "Jan Kowalski",
      "email": "jan@firma.com",
      "maxAmount": 50000
    }
  ]
}
```

#### PUT /api/mpk-centers/{id}/approvers
Ustawienie zatwierdzających dla centrum kosztów (zastępuje istniejącą listę).

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "approvers": [
    { "systemUserId": "uuid", "maxAmount": 50000 },
    { "systemUserId": "uuid", "maxAmount": 100000 }
  ]
}
```

**Odpowiedź** (200):
```json
{
  "approvers": [ ... ],
  "count": 2
}
```

---

### Zatwierdzanie faktur

#### POST /api/invoices/{id}/approve
Zatwierdzenie faktury.

**Autentykacja**: Reader (musi być przypisanym zatwierdzającym dla MPK faktury)

**Treść żądania**:
```json
{
  "comment": "Zatwierdzono — prawidłowe przypisanie."
}
```

**Odpowiedź** (200):
```json
{
  "invoiceId": "uuid",
  "status": "approved",
  "approvedBy": "user-oid",
  "approvedAt": "2026-03-10T10:00:00.000Z"
}
```

#### POST /api/invoices/{id}/reject
Odrzucenie faktury (komentarz wymagany).

**Autentykacja**: Reader (musi być przypisanym zatwierdzającym)

**Treść żądania**:
```json
{
  "comment": "Błędne przypisanie MPK — powinno być Marketing."
}
```

**Odpowiedź** (200):
```json
{
  "invoiceId": "uuid",
  "status": "rejected",
  "rejectedBy": "user-oid",
  "rejectedAt": "2026-03-10T10:00:00.000Z"
}
```

#### POST /api/invoices/{id}/cancel-approval
Anulowanie oczekującego zatwierdzenia (tylko Admin).

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "comment": "Zmiana przypisania do innego MPK."
}
```

**Odpowiedź** (200):
```json
{
  "invoiceId": "uuid",
  "status": "new"
}
```

#### POST /api/invoices/{id}/refresh-approvers
Odświeżenie listy zatwierdzających dla faktury na podstawie przypisania MPK.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "invoiceId": "uuid",
  "approvers": [ ... ]
}
```

#### POST /api/invoices/bulk-approve
Masowe zatwierdzanie wielu faktur jednocześnie.

**Autentykacja**: Reader (musi być zatwierdzającym dla MPK każdej faktury)

**Treść żądania**:
```json
{
  "invoiceIds": ["uuid1", "uuid2", "uuid3"],
  "comment": "Miesięczne zatwierdzenie zbiorcze."
}
```

**Odpowiedź** (200):
```json
{
  "total": 3,
  "approved": 2,
  "failed": 1,
  "results": [
    { "invoiceId": "uuid1", "status": "approved" },
    { "invoiceId": "uuid2", "status": "approved" },
    { "invoiceId": "uuid3", "error": "Nie jest autoryzowanym zatwierdzającym" }
  ]
}
```

#### GET /api/approvals/pending
Lista faktur oczekujących na zatwierdzenie przez bieżącego użytkownika.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, opcjonalny): Filtr po ustawieniu/tenancie

**Odpowiedź** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "FV/2026/001",
      "supplierName": "Dostawca Sp. z o.o.",
      "grossAmount": 5000.00,
      "mpkCenterId": "uuid",
      "mpkCenterName": "IT & Software",
      "submittedForApprovalAt": "2026-03-09T08:00:00.000Z"
    }
  ],
  "count": 5
}
```

---

### Budżet

#### GET /api/mpk-centers/{id}/budget-status
Status budżetu dla pojedynczego centrum kosztów MPK.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "data": {
    "mpkCenterId": "uuid",
    "mpkCenterName": "IT & Software",
    "monthlyBudget": 50000,
    "monthlySpent": 32000,
    "monthlyUtilization": 0.64,
    "quarterlyBudget": 150000,
    "quarterlySpent": 98000,
    "quarterlyUtilization": 0.653
  }
}
```

#### GET /api/budget/summary
Podsumowanie budżetu dla wszystkich centrów kosztów.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta

**Odpowiedź** (200):
```json
{
  "data": [
    {
      "mpkCenterId": "uuid",
      "mpkCenterName": "IT & Software",
      "monthlyBudget": 50000,
      "monthlySpent": 32000,
      "monthlyUtilization": 0.64
    }
  ],
  "count": 5
}
```

---

### Powiadomienia

#### GET /api/notifications
Lista powiadomień dla bieżącego użytkownika.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta
- `unreadOnly` (boolean, opcjonalny): Filtr tylko nieprzeczytane
- `top` (number, opcjonalny): Maks. wyników

**Odpowiedź** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "SLA_EXCEEDED",
      "title": "Przekroczono SLA zatwierdzania",
      "message": "Faktura FV/2026/001 oczekuje od 72 godzin",
      "invoiceId": "uuid",
      "isRead": false,
      "createdAt": "2026-03-10T08:00:00.000Z"
    }
  ],
  "count": 3
}
```

#### PATCH /api/notifications/{id}/read
Oznaczenie powiadomienia jako przeczytanego.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "success": true
}
```

#### POST /api/notifications/{id}/dismiss
Odrzucenie powiadomienia.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "success": true
}
```

#### GET /api/notifications/unread-count
Liczba nieprzeczytanych powiadomień bieżącego użytkownika.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta

**Odpowiedź** (200):
```json
{
  "count": 5
}
```

---

### Raporty

#### GET /api/reports/budget-utilization
Raport wykorzystania budżetu per MPK.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta
- `mpkCenterId` (uuid, opcjonalny): Filtr do pojedynczego MPK

**Odpowiedź** (200):
```json
{
  "data": {
    "centers": [
      {
        "mpkCenterId": "uuid",
        "name": "IT & Software",
        "monthlyBudget": 50000,
        "spent": 32000,
        "utilization": 0.64,
        "overBudget": false
      }
    ],
    "totalBudget": 250000,
    "totalSpent": 180000
  }
}
```

#### GET /api/reports/approval-history
Raport historii zatwierdzeń.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta
- `dateFrom` (data, opcjonalny): Data początkowa
- `dateTo` (data, opcjonalny): Data końcowa
- `mpkCenterId` (uuid, opcjonalny): Filtr po MPK
- `status` (string, opcjonalny): Filtr po statusie zatwierdzenia

**Odpowiedź** (200):
```json
{
  "data": {
    "items": [
      {
        "invoiceId": "uuid",
        "invoiceNumber": "FV/2026/001",
        "approvalStatus": "approved",
        "approvedBy": "Jan Kowalski",
        "approvedAt": "2026-03-10T10:00:00.000Z",
        "mpkCenterName": "IT & Software"
      }
    ],
    "summary": {
      "total": 100,
      "approved": 80,
      "rejected": 15,
      "pending": 5
    }
  }
}
```

#### GET /api/reports/approver-performance
Statystyki wydajności zatwierdzających.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta

**Odpowiedź** (200):
```json
{
  "data": [
    {
      "approverName": "Jan Kowalski",
      "totalProcessed": 50,
      "approved": 45,
      "rejected": 5,
      "avgProcessingHours": 12.5,
      "slaComplianceRate": 0.92
    }
  ]
}
```

#### GET /api/reports/invoice-processing
Raport pipeline przetwarzania faktur.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (uuid, wymagany): Identyfikator ustawienia/tenanta

**Odpowiedź** (200):
```json
{
  "data": {
    "total": 500,
    "byStatus": {
      "new": 50,
      "pending_approval": 30,
      "approved": 350,
      "rejected": 20,
      "paid": 300
    },
    "avgProcessingDays": 3.2
  }
}
```

---

### Wyszukiwanie WL VAT (Biała Lista)

Endpointy do weryfikacji podmiotów w rejestrze Białej Listy Podatników VAT (API KAS — `wl-api.mf.gov.pl`).  
API publiczne — nie wymaga klucza. Limity: 100 wyszukiwań/dzień, 5000 weryfikacji/dzień.

#### POST /api/vat/lookup
Wyszukanie podmiotu po NIP lub REGON w Białej Liście.

**Autentykacja**: User

**Treść żądania**:
```json
{
  "nip": "1234567890"
}
```

lub:

```json
{
  "regon": "123456789"
}
```

> Dokładnie jedno z pól `nip` / `regon` jest wymagane.

**Odpowiedź** (200):
```json
{
  "success": true,
  "data": {
    "name": "Firma Sp. z o.o.",
    "nip": "1234567890",
    "regon": "123456789",
    "krs": "0000123456",
    "statusVat": "Czynny",
    "residenceAddress": "ul. Przykładowa 1, 00-000 Warszawa",
    "workingAddress": "ul. Biurowa 5, 00-001 Warszawa",
    "accountNumbers": [
      "PL12345678901234567890123456"
    ],
    "registrationLegalDate": "2020-01-15",
    "hasVirtualAccounts": false
  }
}
```

**Błędy**:
- `400`: Nieprawidłowy NIP/REGON (walidacja Zod + checksum)
- `404`: Podmiot nie znaleziony w Białej Liście

#### GET /api/vat/validate/{nip}
Walidacja sumy kontrolnej NIP (offline, bez wywołania API).

**Autentykacja**: Nie wymagana

**Odpowiedź** (200):
```json
{
  "valid": true,
  "nip": "1234567890"
}
```

lub:

```json
{
  "valid": false,
  "nip": "1234567891",
  "error": "Invalid NIP checksum"
}
```

#### POST /api/vat/check-account
Weryfikacja czy rachunek bankowy jest zarejestrowany dla danego NIP w Białej Liście.

**Autentykacja**: User

**Treść żądania**:
```json
{
  "nip": "1234567890",
  "account": "PL12345678901234567890123456"
}
```

**Odpowiedź** (200):
```json
{
  "accountAssigned": true,
  "nip": "1234567890",
  "account": "PL12345678901234567890123456",
  "requestId": "abc-123-def"
}
```

---

### Przetwarzanie dokumentów

#### POST /api/documents/extract
Ekstrakcja danych z dokumentu faktury (OCR/AI).

**Autentykacja**: Admin

**Żądanie**: Multipart form-data
- `file`: Dokument faktury (PDF, obraz)

**Odpowiedź** (200):
```json
{
  "extractedData": {
    "invoiceNumber": "FV/2024/001",
    "supplierNip": "9876543210",
    "supplierName": "Dostawca Sp. z o.o.",
    "invoiceDate": "2024-01-15",
    "grossAmount": 1230.00
  },
  "confidence": 0.92
}
```

---

### Dostawcy

#### GET /api/suppliers
Lista dostawców.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (string, wymagane): ID ustawień firmy
- `status` (string): Filtr statusu (`Active`, `Inactive`, `Blocked`)
- `search` (string): Wyszukiwanie po nazwie lub NIP
- `hasSelfBillingAgreement` (boolean): Filtr dostawców z aktywnymi umowami SB
- `top` (number): Maks. wyników (domyślnie 100)
- `skip` (number): Przesunięcie do paginacji

**Odpowiedź** (200):
```json
{
  "suppliers": [
    {
      "id": "uuid",
      "settingId": "uuid",
      "name": "Nazwa dostawcy",
      "nip": "1234567890",
      "street": "ul. Przykładowa 1",
      "city": "Warszawa",
      "postalCode": "00-001",
      "email": "kontakt@dostawca.pl",
      "phone": "+48 111 222 333",
      "status": "Active",
      "source": "VAT",
      "hasSelfBillingAgreement": true,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/suppliers
Utworzenie nowego dostawcy.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "name": "Nazwa dostawcy",
  "nip": "1234567890",
  "street": "ul. Przykładowa 1",
  "city": "Warszawa",
  "postalCode": "00-001",
  "email": "kontakt@dostawca.pl",
  "phone": "+48 111 222 333"
}
```

**Odpowiedź** (201):
```json
{
  "id": "uuid",
  "name": "Nazwa dostawcy",
  "nip": "1234567890",
  "status": "Active"
}
```

Zwraca `409 Conflict` jeśli dostawca o tym samym NIP już istnieje.

#### GET /api/suppliers/{id}
Pobranie dostawcy po ID.

**Autentykacja**: Reader

**Odpowiedź** (200): Pełny obiekt dostawcy.

#### PATCH /api/suppliers/{id}
Aktualizacja pól dostawcy.

**Autentykacja**: Admin

**Treść żądania**: Częściowy obiekt dostawcy (tylko zmieniane pola).

**Odpowiedź** (200): Zaktualizowany obiekt dostawcy.

#### DELETE /api/suppliers/{id}
Dezaktywacja (soft-delete) dostawcy.

**Autentykacja**: Admin

**Odpowiedź** (200):
```json
{ "success": true }
```

#### GET /api/suppliers/{id}/stats
Statystyki dostawcy.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "invoiceCount": 42,
  "totalGross": 125000.00,
  "avgInvoiceAmount": 2976.19,
  "pendingPayments": 3,
  "selfBillingInvoiceCount": 15
}
```

#### POST /api/suppliers/{id}/stats/refresh
Odświeżenie cache'owanych statystyk dostawcy.

**Autentykacja**: Admin

**Odpowiedź** (200): Zaktualizowany obiekt statystyk.

#### GET /api/suppliers/{id}/invoices
Faktury dla danego dostawcy.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "SF/2024/01/001",
      "invoiceDate": "2024-01-15",
      "grossAmount": 1230.00,
      "status": "SentToKsef"
    }
  ]
}
```

#### POST /api/suppliers/from-vat
Utworzenie dostawcy z rejestru VAT.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "nip": "1234567890"
}
```

**Odpowiedź** (201): Utworzony obiekt dostawcy z danymi z rejestru VAT.

#### POST /api/suppliers/{id}/refresh-vat
Odświeżenie danych dostawcy z rejestru VAT.

**Autentykacja**: Admin

**Odpowiedź** (200): Zaktualizowany obiekt dostawcy.

---

### Umowy samofakturowania

#### GET /api/sb-agreements
Lista umów samofakturowania.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (string, wymagane): ID ustawień firmy
- `supplierId` (string): Filtr po dostawcy
- `status` (string): Filtr statusu (`Active`, `Terminated`, `Expired`)

**Odpowiedź** (200):
```json
{
  "agreements": [
    {
      "id": "uuid",
      "settingId": "uuid",
      "supplierId": "uuid",
      "supplierName": "Nazwa dostawcy",
      "status": "Active",
      "validFrom": "2024-01-01",
      "validTo": "2025-12-31",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/sb-agreements
Utworzenie nowej umowy samofakturowania.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "supplierId": "uuid",
  "validFrom": "2024-01-01",
  "validTo": "2025-12-31"
}
```

Waliduje, że dostawca ma status `Active`. Ustawia flagę `hasSelfBillingAgreement` dostawcy.

**Odpowiedź** (201): Utworzony obiekt umowy.

#### GET /api/sb-agreements/{id}
Pobranie umowy po ID.

**Autentykacja**: Reader

**Odpowiedź** (200): Pełny obiekt umowy.

#### PATCH /api/sb-agreements/{id}
Aktualizacja pól umowy.

**Autentykacja**: Admin

**Treść żądania**: Częściowy obiekt umowy.

**Odpowiedź** (200): Zaktualizowany obiekt umowy.

#### POST /api/sb-agreements/{id}/terminate
Rozwiązanie aktywnej umowy.

**Autentykacja**: Admin

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "status": "Terminated"
}
```

#### GET /api/sb-agreements/{id}/attachments
Lista załączników umowy.

**Autentykacja**: Reader

**Odpowiedź** (200):
```json
{
  "attachments": [
    {
      "id": "uuid",
      "fileName": "skan-umowy.pdf",
      "mimeType": "application/pdf",
      "size": 125000,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/sb-agreements/{id}/attachments
Przesłanie załącznika do umowy.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "fileName": "skan-umowy.pdf",
  "mimeType": "application/pdf",
  "content": "zawartość-w-base64",
  "description": "Skan podpisanej umowy"
}
```

Waliduje typ i rozmiar pliku.

**Odpowiedź** (201):
```json
{
  "id": "uuid",
  "fileName": "skan-umowy.pdf"
}
```

---

### Szablony samofakturowania

#### GET /api/sb-templates
Lista szablonów faktur.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (string, wymagane): ID ustawień firmy
- `supplierId` (string): Filtr po dostawcy
- `activeOnly` (boolean): Tylko aktywne szablony (domyślnie: `true`)

**Odpowiedź** (200):
```json
{
  "templates": [
    {
      "id": "uuid",
      "settingId": "uuid",
      "supplierId": "uuid",
      "name": "Usługa miesięczna",
      "itemDescription": "Usługi konsultacji IT",
      "quantity": 1,
      "unit": "szt.",
      "unitPrice": 5000.00,
      "vatRate": 23,
      "currency": "PLN",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/sb-templates
Utworzenie nowego szablonu.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "supplierId": "uuid",
  "name": "Usługa miesięczna",
  "itemDescription": "Usługi konsultacji IT",
  "quantity": 1,
  "unit": "szt.",
  "unitPrice": 5000.00,
  "vatRate": 23,
  "currency": "PLN"
}
```

**Odpowiedź** (201): Utworzony obiekt szablonu.

#### GET /api/sb-templates/{id}
Pobranie szablonu po ID.

**Autentykacja**: Reader

**Odpowiedź** (200): Pełny obiekt szablonu.

#### PATCH /api/sb-templates/{id}
Aktualizacja pól szablonu.

**Autentykacja**: Admin

**Treść żądania**: Częściowy obiekt szablonu.

**Odpowiedź** (200): Zaktualizowany obiekt szablonu.

#### DELETE /api/sb-templates/{id}
Dezaktywacja (soft-delete) szablonu.

**Autentykacja**: Admin

**Odpowiedź** (200):
```json
{ "success": true }
```

#### POST /api/sb-templates/duplicate
Duplikacja szablonów z jednego dostawcy do drugiego.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "fromSupplierId": "uuid",
  "toSupplierId": "uuid",
  "settingId": "uuid"
}
```

**Odpowiedź** (200):
```json
{
  "duplicated": 3
}
```

---

### Faktury samofakturowania

#### POST /api/invoices/self-billing
Utworzenie pojedynczej faktury samofakturowania.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "supplierId": "uuid",
  "invoiceDate": "2024-01-31",
  "items": [
    {
      "description": "Usługi konsultacji IT",
      "quantity": 1,
      "unit": "szt.",
      "unitPrice": 5000.00,
      "vatRate": 23
    }
  ]
}
```

Automatycznie rozwiązuje umowę na podstawie `agreementId` lub `supplierId`. Generuje numer faktury w formacie `SF/{RRRR}/{MM}/{NNN}`.

**Odpowiedź** (201):
```json
{
  "id": "uuid",
  "invoiceNumber": "SF/2024/01/001",
  "status": "Draft",
  "grossAmount": 6150.00
}
```

#### GET /api/invoices/self-billing
Lista faktur samofakturowania.

**Autentykacja**: Reader

**Parametry zapytania**:
- `settingId` (string): ID ustawień firmy
- `supplierId` (string): Filtr po dostawcy
- `selfBillingStatus` (string): Filtr statusu (`Draft`, `PendingSeller`, `SellerApproved`, `SellerRejected`, `SentToKsef`)
- `top` (number): Maks. wyników

**Odpowiedź** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "SF/2024/01/001",
      "supplierId": "uuid",
      "supplierName": "Nazwa dostawcy",
      "invoiceDate": "2024-01-31",
      "grossAmount": 6150.00,
      "status": "Draft",
      "createdAt": "2024-01-31T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### POST /api/invoices/self-billing/preview
Podgląd generowania faktur za okres.

**Autentykacja**: Reader

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "period": { "month": 1, "year": 2024 },
  "supplierIds": ["uuid"]
}
```

`supplierIds` jest opcjonalne — pominięcie uwzględnia wszystkich dostawców z aktywnymi umowami.

**Odpowiedź** (200):
```json
{
  "previews": [
    {
      "supplierId": "uuid",
      "supplierName": "Nazwa dostawcy",
      "items": [{ "description": "...", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }],
      "totals": { "net": 5000.00, "vat": 1150.00, "gross": 6150.00 }
    }
  ],
  "totals": { "invoiceCount": 1, "totalGross": 6150.00 }
}
```

#### POST /api/invoices/self-billing/generate
Generowanie faktur za okres. Używa tej samej treści żądania co podgląd.

**Autentykacja**: Admin

**Odpowiedź** (200):
```json
{
  "created": 3,
  "invoiceIds": ["uuid", "uuid", "uuid"]
}
```

#### POST /api/invoices/self-billing/generate/confirm
Potwierdzenie wygenerowanych faktur — zmiana statusu z Draft na PendingSeller.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "invoiceIds": ["uuid", "uuid"]
}
```

**Odpowiedź** (200):
```json
{
  "confirmed": 2
}
```

#### POST /api/invoices/self-billing/{id}/submit
Przesłanie faktury do akceptacji sprzedawcy.

**Autentykacja**: Admin

Rozwiązuje tożsamość Dataverse bieżącego użytkownika. Weryfikuje, czy dostawca ma przypisanego użytkownika kontaktowego SB (`sbContactUserId`). Rejestruje `submittedByUserId` i `submittedAt`. Wysyła powiadomienie `SbApprovalRequested` do osoby kontaktowej SB dostawcy.

Przejście: `Draft` → `PendingSeller`

**Odpowiedź** (200):
```json
{
  "invoice": {
    "id": "uuid",
    "status": "PendingSeller",
    "submittedByUserId": "uuid",
    "submittedAt": "2026-03-15T14:30:00.000Z"
  }
}
```

**Błędy**:
- `400` — Dostawca nie ma przypisanego użytkownika kontaktowego SB
- `400` — Status faktury nie jest Draft
- `403` — Nie można rozwiązać konta użytkownika Dataverse
- `404` — Nie znaleziono faktury lub dostawcy

#### POST /api/invoices/self-billing/{id}/approve
Akceptacja faktury przez sprzedawcę.

**Autentykacja**: Reader (minimum) — autoryzacja dla wyznaczonego użytkownika kontaktowego SB dostawcy lub Admin

Rozwiązuje tożsamość Dataverse wywołującego i sprawdza autoryzację: wywołujący odpowiada `sbContactUserId` dostawcy lub posiada rolę Admin. Rejestruje `approvedByUserId` i `approvedAt`.

Przejście: `PendingSeller` → `SellerApproved`

**Odpowiedź** (200):
```json
{
  "invoice": {
    "id": "uuid",
    "status": "SellerApproved",
    "approvedByUserId": "uuid",
    "approvedAt": "2026-03-15T15:00:00.000Z"
  }
}
```

**Błędy**:
- `400` — Status faktury nie jest PendingSeller
- `403` — Tylko wyznaczony kontakt dostawcy lub Admin może zatwierdzić

#### POST /api/invoices/self-billing/{id}/reject
Odrzucenie faktury przez sprzedawcę.

**Autentykacja**: Reader (minimum) — autoryzacja dla wyznaczonego użytkownika kontaktowego SB dostawcy lub Admin

Ten sam model autoryzacji co zatwierdzanie. Rejestruje powód odrzucenia, `approvedByUserId` i `approvedAt`.

**Treść żądania**:
```json
{
  "reason": "Nieprawidłowe kwoty"
}
```

Przejście: `PendingSeller` → `SellerRejected`

**Odpowiedź** (200):
```json
{
  "invoice": {
    "id": "uuid",
    "status": "SellerRejected",
    "sellerRejectionReason": "Nieprawidłowe kwoty",
    "approvedByUserId": "uuid",
    "approvedAt": "2026-03-15T15:00:00.000Z"
  }
}
```

**Błędy**:
- `400` — Powód odrzucenia jest wymagany
- `400` — Status faktury nie jest PendingSeller
- `403` — Tylko wyznaczony kontakt dostawcy lub Admin może odrzucić

#### POST /api/invoices/self-billing/{id}/send-ksef
Wysłanie zaakceptowanej faktury do KSeF.

**Autentykacja**: Admin

Buduje XML KSeF z `isSelfBilling: true` (ustawia P_17=1, dodaje Podmiot3 — wystawcę). Faktura musi mieć status `SellerApproved`.

Przejście: `SellerApproved` → `SentToKsef`

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "status": "SentToKsef",
  "ksefReferenceNumber": "KSeF-123456"
}
```

#### PATCH /api/invoices/self-billing/{id}/status
Ogólna zmiana statusu (dla nadpisań administracyjnych).

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "status": "Draft",
  "rejectionReason": "opcjonalny powód"
}
```

**Odpowiedź** (200): Zaktualizowany obiekt faktury.

#### POST /api/invoices/self-billing/batch
Wsadowe utworzenie do 100 faktur.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "invoices": [
    {
      "supplierId": "uuid",
      "invoiceDate": "2024-01-31",
      "items": [{ "description": "...", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }]
    }
  ]
}
```

**Odpowiedź** (200):
```json
{
  "created": 5,
  "invoiceIds": ["uuid", "uuid", "uuid", "uuid", "uuid"]
}
```

---

### Zatwierdzanie samofakturowania

#### GET /api/self-billing/approvals/pending
Lista faktur samofakturowania oczekujących na zatwierdzenie przez bieżącego użytkownika.

**Autentykacja**: Reader

Zwraca faktury ze statusem `PendingSeller`, dla których `sbContactUserId` dostawcy odpowiada identyfikatorowi systemowego użytkownika Dataverse bieżącego użytkownika. Administratorzy mogą przekazać `?all=true`, aby zobaczyć wszystkie oczekujące faktury ze wszystkich dostawców.

**Parametry zapytania**:
- `settingId` (string, wymagany): Identyfikator ustawień firmy
- `all` (string, opcjonalny): `true` — lista wszystkich oczekujących faktur (tylko Admin)

**Odpowiedź** (200):
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "SF/2024/01/001",
      "supplierId": "uuid",
      "supplierName": "Nazwa dostawcy",
      "supplierNip": "1234567890",
      "invoiceDate": "2024-01-31",
      "grossAmount": 6150.00,
      "status": "PendingSeller",
      "submittedAt": "2024-01-31T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Import samofakturowania

#### POST /api/invoices/self-billing/import
Parsowanie i walidacja pliku CSV lub Excel do importu.

**Autentykacja**: Admin

**Parametry zapytania**:
- `settingId` (string, wymagane): ID ustawień firmy

Wyślij zawartość pliku w treści żądania z odpowiednim `Content-Type` (`text/csv` lub `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). Format jest wykrywany automatycznie.

**Odpowiedź** (200):
```json
{
  "importId": "uuid",
  "rows": [
    {
      "rowNumber": 1,
      "supplierNip": "1234567890",
      "supplierName": "Nazwa dostawcy",
      "isValid": true,
      "hasAgreement": true,
      "items": [{ "description": "Usługa", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }]
    }
  ],
  "validCount": 5,
  "invalidCount": 1
}
```

#### POST /api/invoices/self-billing/import/confirm
Utworzenie faktur z zwalidowanych wierszy importu.

**Autentykacja**: Admin

**Treść żądania**:
```json
{
  "settingId": "uuid",
  "rows": [
    {
      "supplierNip": "1234567890",
      "items": [{ "description": "Usługa", "quantity": 1, "unitPrice": 5000.00, "vatRate": 23 }]
    }
  ]
}
```

**Odpowiedź** (200):
```json
{
  "created": 5,
  "invoiceIds": ["uuid", "uuid", "uuid", "uuid", "uuid"]
}
```

#### GET /api/invoices/self-billing/import/template
Pobranie szablonu importu CSV lub Excel.

**Autentykacja**: User

**Parametry zapytania**:
- `format` (string): `csv` lub `xlsx` (domyślnie: `csv`)

**Odpowiedź** (200): Pobranie pliku z odpowiednim Content-Type.

---

## Obsługa błędów

Wszystkie endpointy zwracają standardowe odpowiedzi błędów:

### Format odpowiedzi błędu
```json
{
  "error": "Komunikat błędu",
  "code": "KOD_BLEDU",
  "details": { "..." : "..." }
}
```

### Kody statusu HTTP
- `200`: Sukces
- `201`: Utworzono
- `204`: Brak treści
- `400`: Błąd żądania (błąd walidacji)
- `401`: Nieautoryzowany (brak/nieprawidłowy token)
- `403`: Zabroniony (niewystarczające uprawnienia)
- `404`: Nie znaleziono
- `409`: Konflikt (duplikat zasobu)
- `422`: Nieprzetworzona encja (błąd logiki biznesowej)
- `500`: Wewnętrzny błąd serwera
- `503`: Usługa niedostępna (zewnętrzna usługa niedostępna)

### Typowe kody błędów
- `AUTH_REQUIRED`: Wymagana autentykacja
- `INSUFFICIENT_PERMISSIONS`: Użytkownik nie posiada wymaganej roli
- `VALIDATION_ERROR`: Błąd walidacji żądania
- `NOT_FOUND`: Zasób nie znaleziony
- `DATAVERSE_ERROR`: Błąd operacji Dataverse
- `KSEF_ERROR`: Błąd API KSeF
- `KEYVAULT_ERROR`: Błąd Azure Key Vault
- `AI_ERROR`: Błąd usługi AI

---

## Limity zapytań

- **Domyślny**: 100 zapytań na minutę na użytkownika
- **Endpointy AI**: 10 zapytań na minutę na użytkownika
- **Operacje wsadowe**: 5 zapytań na minutę na użytkownika

Nagłówki limitów:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706700000
```

Po przekroczeniu limitu API zwraca `429 Too Many Requests` z nagłówkiem `Retry-After`.

---

## Wersjonowanie

Aktualna wersja API: **v1**

Wszystkie endpointy mają prefix `/api/`. Przyszłe wersje będą używać `/api/v2/` itd.

---

## Powiązane dokumenty

- [Architektura](./ARCHITEKTURA.md) — projekt systemu
- [Schemat Dataverse](./DATAVERSE_SCHEMA.md) — model danych
- [swagger.yaml](./swagger.yaml) — specyfikacja OpenAPI
- [Wersja angielska](./en/API.md) — English version

---

**Ostatnia aktualizacja:** 2026-02-14  
**Wersja:** 3.0  
**Opiekun:** dvlp-dev team
