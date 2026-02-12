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
  - [Integracja GUS](#integracja-gus)
  - [Przetwarzanie dokumentów](#przetwarzanie-dokumentów)
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

**Ważne**: Ustaw `SKIP_AUTH=true` wyłącznie dla lokalnego developmentu. Aplikacja crashuje przy starcie jeśli `SKIP_AUTH=true` w produkcji (`NODE_ENV=production`).

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
Lista wszystkich centrów kosztów (wartości MPK).

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
Aktualizacja metadanych faktury.

**Autentykacja**: Admin lub User (ograniczone pola)

**Treść żądania**:
```json
{
  "mpk": 100000001,
  "category": "Marketing",
  "paymentStatus": "paid",
  "notes": "Zapłacono przelewem bankowym"
}
```

**Odpowiedź** (200):
```json
{
  "id": "uuid",
  "mpk": 100000001,
  "category": "Marketing",
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

### Integracja GUS

#### POST /api/gus/lookup
Wyszukanie firmy po NIP w rejestrze GUS.

**Autentykacja**: User

**Treść żądania**:
```json
{
  "nip": "1234567890"
}
```

**Odpowiedź** (200):
```json
{
  "nip": "1234567890",
  "name": "Firma Sp. z o.o.",
  "address": "ul. Przykładowa 1, 00-000 Warszawa",
  "status": "active",
  "regon": "123456789"
}
```

#### POST /api/gus/search
Wyszukanie firm po nazwie.

**Autentykacja**: User

**Treść żądania**:
```json
{
  "query": "Microsoft"
}
```

**Odpowiedź** (200):
```json
{
  "results": [
    {
      "nip": "1234567890",
      "name": "Microsoft Sp. z o.o.",
      "regon": "123456789"
    }
  ]
}
```

#### GET /api/gus/validate/{nip}
Walidacja formatu i istnienia NIP.

**Autentykacja**: User

**Odpowiedź** (200):
```json
{
  "nip": "1234567890",
  "valid": true,
  "exists": true
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

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 2.0  
**Opiekun:** dvlp-dev team
