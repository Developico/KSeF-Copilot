# Plan integracji Dataverse - dvlp-ksef

## Przegląd

Plan implementacji integracji Dataverse dla modułu KSeF, oparty na sprawdzonych rozwiązaniach z projektu dvlp-planner.

### Kluczowe wzorce z planner

1. **Dedykowany plik konfiguracji** (`lib/dataverse-config.ts`) - wszystkie nazwy kolumn jako zmienne ENV
2. **Dedykowany logger** (`lib/dataverse-logger.ts`) - logi do pliku z rotacją i redakcją
3. **Mappers** (`lib/dataverse-mappers.ts`) - konwersja Dataverse ↔ App types
4. **Client** (`lib/dataverse-client.ts`) - abstrakcja HTTP z retry logic

---

## Faza 1: Infrastruktura bazowa

### Task 1.1: Dataverse Config

**Plik:** `api/src/lib/dataverse/config.ts`

Centralna konfiguracja z nazwami kolumn jako ENV vars:

```typescript
export const DV = {
  baseUrl: process.env.DATAVERSE_URL?.replace(/\/$/, ""),
  
  // Faktury (dvlp_ksefinvoice)
  invoice: {
    entitySet: process.env.DV_ENTITY_INVOICE || "dvlp_ksefinvoices",
    id: process.env.DV_FIELD_INVOICE_ID || "dvlp_ksefinvoiceid",
    name: process.env.DV_FIELD_INVOICE_NAME || "dvlp_name",
    ksefNumber: process.env.DV_FIELD_INVOICE_KSEF_NUMBER || "dvlp_ksefnumber",
    invoiceDate: process.env.DV_FIELD_INVOICE_DATE || "dvlp_invoicedate",
    // ... wszystkie pola zgodnie z DATAVERSE_SCHEMA.md
  },
  
  // Ustawienia (dvlp_ksefsetting)
  setting: {
    entitySet: process.env.DV_ENTITY_SETTING || "dvlp_ksefsettings",
    id: process.env.DV_FIELD_SETTING_ID || "dvlp_ksefsettingid",
    nip: process.env.DV_FIELD_SETTING_NIP || "dvlp_nip",
    companyName: process.env.DV_FIELD_SETTING_COMPANY || "dvlp_companyname",
    // ...
  },
  
  // Sesje (dvlp_ksefsession)
  session: {
    entitySet: process.env.DV_ENTITY_SESSION || "dvlp_ksefsessions",
    // ...
  },
  
  // Log synchronizacji (dvlp_ksefsynclog)
  syncLog: {
    entitySet: process.env.DV_ENTITY_SYNCLOG || "dvlp_ksefsynclog",
    // ...
  },
}
```

**Acceptance Criteria:**
- [ ] Wszystkie kolumny z DATAVERSE_SCHEMA.md jako zmienne ENV
- [ ] Sensowne wartości domyślne (prefix `dvlp_`)
- [ ] TypeScript eksportuje stałą `DV`

---

### Task 1.2: Dataverse Logger

**Plik:** `api/src/lib/dataverse/logger.ts`

Dedykowany logger zapisujący do pliku `dataverse-debug.log`:

```typescript
/**
 * Dataverse API Logger
 * 
 * Levels: error (default) | warn | info | debug | trace
 * Traffic logs (REQUEST/RESPONSE) require: DV_LOG_TRAFFIC=true + DV_LOG_LEVEL=trace
 * 
 * ENV:
 * - DV_LOG_LEVEL: error|warn|info|debug|trace (default: error)
 * - DV_LOG_TRAFFIC: true|false (default: false) - enable request/response logging
 * - DV_LOG_CONSOLE: true|false (default: false) - echo to console
 * - DV_LOG_FILE_MAX_MB: number (default: 5) - max log file size before rotation
 */
```

Features:
- ✅ Rotacja logów (domyślnie 5MB)
- ✅ Redakcja wrażliwych danych (tokeny, sekrety)
- ✅ Poziomy logowania (error → trace)
- ✅ Opcjonalny output do konsoli
- ✅ Traffic logging za dodatkowym przełącznikiem

**Funkcje eksportowane:**
```typescript
export const logDataverseRequest = (operation: string, url: string, options?: any) => ...
export const logDataverseResponse = (operation: string, response: any, duration?: number) => ...
export const logDataverseMapping = (operation: string, rawData: any, mappedData: any) => ...
export const logDataverseError = (operation: string, error: any) => ...
```

---

### Task 1.3: Dataverse Client

**Plik:** `api/src/lib/dataverse/client.ts`

Rozszerzenie istniejącego klienta:

```typescript
export class DataverseClient {
  private baseUrl: string
  
  // Generic CRUD
  async list<T>(entitySet: string, query?: string): Promise<T[]>
  async listAll<T>(entitySet: string, query?: string): Promise<T[]>  // z paginacją
  async getById<T>(entitySet: string, id: string): Promise<T | null>
  async create<T>(entitySet: string, body: unknown): Promise<T>
  async update<T>(entitySet: string, id: string, body: unknown): Promise<T>
  async delete(entitySet: string, id: string): Promise<void>
  
  // Request z retry logic i logging
  private async request<T>(path: string, options?: RequestOptions): Promise<T>
}

export const dataverseClient = new DataverseClient()
```

---

## Faza 2: Typy i Mappers

### Task 2.1: Interfejsy Dataverse

**Plik:** `api/src/types/dataverse.ts`

```typescript
// Raw Dataverse types (z prefiksem dvlp_)
export interface DvInvoice {
  dvlp_ksefinvoiceid: string
  dvlp_name: string
  dvlp_ksefnumber: string
  dvlp_invoicedate: string
  // ... wszystkie pola
}

export interface DvSetting {
  dvlp_ksefsettingid: string
  dvlp_nip: string
  dvlp_companyname: string
  // ...
}

export interface DvSession { ... }
export interface DvSyncLog { ... }
```

### Task 2.2: Mappers

**Plik:** `api/src/lib/dataverse/mappers.ts`

```typescript
import { DV } from './config'
import { logDataverseMapping } from './logger'

// Dataverse → App
export function mapDvInvoiceToApp(raw: DvInvoice): Invoice {
  const mapped = {
    id: raw[DV.invoice.id],
    invoiceNumber: raw[DV.invoice.name],
    ksefNumber: raw[DV.invoice.ksefNumber],
    invoiceDate: raw[DV.invoice.invoiceDate],
    // ...
  }
  logDataverseMapping('mapDvInvoiceToApp', raw, mapped)
  return mapped
}

// App → Dataverse (for create/update)
export function mapAppInvoiceToDv(app: Invoice): Partial<DvInvoice> {
  return {
    [DV.invoice.name]: app.invoiceNumber,
    [DV.invoice.ksefNumber]: app.ksefNumber,
    // ...
  }
}
```

---

## Faza 3: Serwisy CRUD

### Task 3.1: Invoice Service

**Plik:** `api/src/lib/dataverse/services/invoice-service.ts`

```typescript
export class InvoiceService {
  async getAll(filters?: InvoiceFilters): Promise<Invoice[]>
  async getById(id: string): Promise<Invoice | null>
  async getByKsefNumber(ksefNumber: string): Promise<Invoice | null>
  async create(invoice: CreateInvoiceDto): Promise<Invoice>
  async update(id: string, updates: UpdateInvoiceDto): Promise<Invoice>
  async upsertByKsefNumber(invoice: Invoice): Promise<Invoice>
  async markAsProcessed(id: string): Promise<void>
}

export const invoiceService = new InvoiceService()
```

### Task 3.2: Setting Service

**Plik:** `api/src/lib/dataverse/services/setting-service.ts`

```typescript
export class SettingService {
  async getByNip(nip: string): Promise<Setting | null>
  async getAll(activeOnly?: boolean): Promise<Setting[]>
  async create(setting: CreateSettingDto): Promise<Setting>
  async update(id: string, updates: UpdateSettingDto): Promise<Setting>
  async updateLastSync(id: string, status: 'success' | 'error'): Promise<void>
}
```

### Task 3.3: Session Service

**Plik:** `api/src/lib/dataverse/services/session-service.ts`

### Task 3.4: SyncLog Service

**Plik:** `api/src/lib/dataverse/services/synclog-service.ts`

---

## Faza 4: Endpoints API

### Task 4.1: Invoices Endpoints

```
GET    /api/invoices           - Lista faktur (z filtrami)
GET    /api/invoices/:id       - Szczegóły faktury
POST   /api/invoices           - Utwórz fakturę (manual)
PATCH  /api/invoices/:id       - Aktualizuj fakturę
DELETE /api/invoices/:id       - Usuń fakturę
POST   /api/invoices/sync      - Synchronizuj z KSeF
```

### Task 4.2: Settings Endpoints

```
GET    /api/settings           - Lista ustawień
GET    /api/settings/:nip      - Ustawienia dla NIP
POST   /api/settings           - Dodaj konfigurację NIP
PATCH  /api/settings/:id       - Aktualizuj ustawienia
```

---

## Faza 5: Web App Integration

### Task 5.1: API Client w Web

**Plik:** `web/src/lib/dataverse-api.ts`

```typescript
export const dataverseApi = {
  invoices: {
    list: (filters?: InvoiceFilters) => fetchApi('/api/invoices', { params: filters }),
    get: (id: string) => fetchApi(`/api/invoices/${id}`),
    sync: (nip: string, dateRange: DateRange) => fetchApi('/api/invoices/sync', { 
      method: 'POST', 
      body: { nip, dateRange } 
    }),
  },
  settings: {
    list: () => fetchApi('/api/settings'),
    get: (nip: string) => fetchApi(`/api/settings/${nip}`),
    update: (id: string, data: UpdateSettingDto) => fetchApi(`/api/settings/${id}`, {
      method: 'PATCH',
      body: data,
    }),
  },
}
```

### Task 5.2: React Query Hooks

**Plik:** `web/src/hooks/use-invoices.ts`

```typescript
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => dataverseApi.invoices.list(filters),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => dataverseApi.invoices.get(id),
    enabled: !!id,
  })
}

export function useSyncInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dataverseApi.invoices.sync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
```

---

## Konfiguracja ENV

### API (Azure Functions)

```env
# Dataverse Connection
DATAVERSE_URL=https://org.crm4.dynamics.com

# Entity Sets (opcjonalne - domyślne wartości z prefixem dvlp_)
DV_ENTITY_INVOICE=dvlp_ksefinvoices
DV_ENTITY_SETTING=dvlp_ksefsettings
DV_ENTITY_SESSION=dvlp_ksefsessions
DV_ENTITY_SYNCLOG=dvlp_ksefsynclog

# Field overrides (tylko jeśli schema się różni)
# DV_FIELD_INVOICE_NAME=dvlp_name
# DV_FIELD_INVOICE_DATE=dvlp_invoicedate

# Logging
DV_LOG_LEVEL=error           # error|warn|info|debug|trace
DV_LOG_TRAFFIC=false         # true to enable request/response logs
DV_LOG_CONSOLE=false         # true to echo to console
DV_LOG_FILE_MAX_MB=5         # max log file size before rotation
```

### local.settings.json (Azure Functions)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    "DATAVERSE_URL": "https://org.crm4.dynamics.com",
    "AZURE_TENANT_ID": "...",
    "AZURE_CLIENT_ID": "...",
    "AZURE_CLIENT_SECRET": "@Microsoft.KeyVault(...)",
    
    "DV_LOG_LEVEL": "debug",
    "DV_LOG_TRAFFIC": "true"
  }
}
```

---

## Struktura plików

```
api/src/lib/dataverse/
├── config.ts           # DV const z nazwami kolumn jako ENV
├── client.ts           # DataverseClient class (rozszerzony)
├── logger.ts           # DataverseLogger (dedykowany plik logów)
├── mappers.ts          # Dataverse ↔ App converters
├── index.ts            # Re-exports
└── services/
    ├── invoice-service.ts
    ├── setting-service.ts
    ├── session-service.ts
    └── synclog-service.ts

api/src/types/
├── dataverse.ts        # Raw Dataverse interfaces (Dv*)
└── invoice.ts          # App interfaces (już istnieje)
```

---

## Kolejność implementacji

| # | Task | Zależności | Estymacja |
|---|------|------------|-----------|
| 1 | Task 1.1: config.ts | - | 1h |
| 2 | Task 1.2: logger.ts | - | 2h |
| 3 | Task 1.3: client.ts | 1.1, 1.2 | 2h |
| 4 | Task 2.1: types/dataverse.ts | - | 1h |
| 5 | Task 2.2: mappers.ts | 1.1, 2.1 | 2h |
| 6 | Task 3.1: invoice-service.ts | 1.3, 2.2 | 3h |
| 7 | Task 3.2-3.4: remaining services | 1.3, 2.2 | 4h |
| 8 | Task 4.1-4.2: API endpoints | 3.* | 4h |
| 9 | Task 5.1-5.2: Web integration | 4.* | 3h |

**Całkowity szacowany czas: ~22h**

---

## Checklist przed startem

- [ ] Dataverse environment dostępne
- [ ] App Registration z uprawnieniami do Dataverse
- [ ] Tabele utworzone zgodnie z DATAVERSE_SCHEMA.md
- [ ] Zmienne ENV skonfigurowane w local.settings.json
- [ ] Testy połączenia z Dataverse

---

## Notatki

### Różnice vs Planner

| Aspekt | Planner | KSeF |
|--------|---------|------|
| Location | Next.js API routes | Azure Functions |
| Auth | Session-based | Service principal |
| Entities | Projects, TimeRegisters | Invoices, Sessions |
| Prefix | tt_ | dvlp_ |

### Potencjalne problemy

1. **Paginacja** - KSeF może zwracać dużo faktur, potrzebna obsługa `@odata.nextLink`
2. **Rate limiting** - Dataverse ma limity, dodać retry z backoff
3. **Concurrency** - Unikać równoległych UPDATE na tym samym rekordzie
4. **Timeouts** - Azure Functions timeout (10min consumption, 30min premium)

---

*Utworzono: 2026-01-27*
*Bazowane na: dvlp-planner dataverse integration*
