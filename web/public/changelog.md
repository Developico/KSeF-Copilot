# Changelog

Wszystkie istotne zmiany w projekcie **Developico KSeF** będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

---

## [0.5.0] - 2026-01-31

### ✨ Dodane - Wielojęzyczność (i18n)

- **Obsługa wielu języków** - pełna implementacja next-intl z dynamicznym routingiem `[locale]`
- **Języki**: Polski (domyślny) i Angielski
- **Przełącznik języków** w nagłówku aplikacji z flagami (PL/GB)
- **Przetłumaczone strony**:
  - Dashboard - tytuły, statystyki, ostatnia aktywność
  - Faktury - lista, filtry, statusy płatności i opisu
  - Raporty - wykresy, tabele, formatowanie dat i kwot
  - Synchronizacja - status sesji, historia, komunikaty
  - Ustawienia - zakładki, formularze, komunikaty walidacji
- **Przetłumaczone komponenty**:
  - Nagłówek i nawigacja boczna
  - Modal skanowania dokumentów (DocumentScannerModal)
  - Podgląd ekstrakcji danych (ExtractionPreview)
  - Formularz ręcznego wprowadzenia faktury (ManualInvoiceForm)
  - Dialogi potwierdzenia, komunikaty toast, błędy walidacji
- **Formatowanie locale-aware** - daty (DD.MM.YYYY / MM/DD/YYYY), kwoty (PLN/currency)

### 🔧 Zmiany

- Middleware next-intl dla automatycznego wykrywania języka
- Routing z prefiksem `/pl/` i `/en/` dla wszystkich stron
- Struktura plików tłumaczeń: `src/messages/pl.json`, `src/messages/en.json`

---

## [0.4.0] - 2026-01-30

### ✨ Dodane

- **Ikony przy tytułach stron** - każda strona ma teraz ikonę obok tytułu (Dashboard, Faktury, Raporty, Synchronizacja, Ustawienia), konsystentnie z projektem planner
- **Podpis "Cost analysis"** w nagłówku aplikacji pod tytułem "C-Level KSeF"
- **Filtry statusu opisu faktur** - trzy nowe interaktywne filtry:
  - "Bez opisu" - faktury bez MPK i kategorii
  - "Propozycja AI" - faktury z sugestiami AI oczekującymi na akceptację
  - "Opisane" - faktury z ustawionym MPK lub kategorią
- **Edycja danych firmy** - możliwość edycji nazwy, środowiska i ustawień synchronizacji w Ustawieniach
- **Unikalność NIP per środowisko** - ten sam NIP może być dodany w różnych środowiskach (test/demo/production)

### 🔧 Zmiany

- **Zoptymalizowany widok Faktur** - kompaktowy pasek KPI zamiast dwóch rzędów kafli:
  - Wszystkie 7 filtrów (4 płatności + 3 opisu) w jednej linii
  - Przyciski rozłożone równomiernie na całą szerokość
  - Zmniejszone spacingi dla większej przestrzeni na listę faktur
- **Uproszczone etykiety MPK** - usunięte polskie tłumaczenia, wyświetlane bezpośrednio wartości z Dataverse
- **Naprawione mapowanie środowisk** - poprawione wartości KSEF_ENVIRONMENT (TEST=100000000, DEMO=100000001, PRODUCTION=100000002)

### 🗑️ Usunięte

- **Zakładka Bezpieczeństwo** w Ustawieniach (zawierała tylko statyczne informacje referencyjne)
- **Floating Action Button** (FAB) do skanowania dokumentów - funkcja zintegrowana z przyciskiem "Dodaj fakturę"

---

## [0.3.0] - 2026-01-27

### ✨ Dodane - Integracja Dataverse

- **CRUD Services dla Dataverse** - pełna warstwa dostępu do danych:
  - `InvoiceService` - operacje CRUD na fakturach
  - `SettingService` - zarządzanie konfiguracją firm (per NIP)
  - `SessionService` - zarządzanie sesjami KSeF
  - `SyncLogService` - historia i statystyki synchronizacji

- **Nowe endpointy API** (Azure Functions):
  - `GET/POST/PATCH/DELETE /api/settings` - zarządzanie ustawieniami firm
  - `GET/POST /api/sessions` - zarządzanie sesjami Dataverse
  - `POST /api/sync` - uruchamianie synchronizacji
  - `GET /api/sync/logs`, `GET /api/sync/stats` - historia i statystyki

- **React Query Hooks** dla Dataverse:
  - `useDvSettings`, `useDvSetting`, `useCreateDvSetting`, `useUpdateDvSetting`
  - `useDvSessions`, `useTerminateDvSession`
  - `useStartDvSync`, `useDvSyncLogs`, `useDvSyncStats`

- **Skrypty testowe**:
  - `test-dataverse.ts` - weryfikacja połączenia z Dataverse
  - `test-crud.ts` - testy CRUD dla Settings i Invoices
  - `get-schema.ts` - inspekcja schematu encji Dataverse
  - `list-entities.ts` - lista encji w Dataverse

### 🔧 Zmiany

- **Dataverse Config** - naprawione nazwy kolumn zgodnie z rzeczywistym schematem:
  - `dvlp_direction` zamiast `dvlp_ksefdirection`
  - `dvlp_invoicestatus` zamiast `dvlp_ksefstatus`
  - `dvlp_downloadedat` zamiast `dvlp_ksefdownloadedat`
  - `dvlp_ksefsynclogs` (z 's') jako entitySet

- **Rozszerzone pola Invoice** - dodane brakujące kolumny:
  - Seller: `sellerAddress`, `sellerCountry`, `sellerEmail`, `sellerPhone`, `sellerBank`
  - Buyer: `buyerName`, `buyerAddress`, `buyerCountry`
  - Amounts: `grossAmountPln`, `exchangeRate`, `paidAmount`
  - VAT breakdown: `vat23Amount`, `vat8Amount`, `vat5Amount`, `vat0Amount`, `vatZwAmount`
  - Payment: `paymentMethod`, `paymentReference`, `isOverdue`

- **host.json** - wyłączone `dynamicConcurrencyEnabled` (wymaga Storage Emulator)

### ✅ Zweryfikowane

- Połączenie z Dataverse działa (WhoAmI API)
- CRUD Settings - wszystkie operacje działają
- CRUD Invoices - wszystkie operacje działają
- Azure Functions uruchamiają się lokalnie (34 endpointy)
- TypeScript kompiluje się bez błędów

### 📝 Notatki

> Integracja z KSeF API wymaga tokena autoryzacyjnego.
> Endpointy API wymagają JWT z Entra ID.
> Pola AI (aiDescription, aiCategory, etc.) zakomentowane - nie istnieją jeszcze w Dataverse.

---

## [0.2.0] - 2026-01-27

### ✨ Dodane

- **Autentykacja Entra ID** - logowanie przez Microsoft Entra ID z MSAL
- **Grupy zabezpieczeń** - role Admin/User oparte na grupach Azure AD
- **Avatar użytkownika** - pobieranie zdjęcia z Microsoft Graph API
- **Ekran logowania** - spójny design z projektem dvlp-planner
- **Favicon i logo** - nowy design gradient "KS" w stylu Developico
- **AI Categorization** - dokumentacja i przygotowanie do kategoryzacji AI faktur

### 🔧 Zmiany

- **Header** - prawdziwe dane użytkownika zamiast mock, działający logout
- **Auth config** - obsługa opcjonalnego API scope
- **Dostępność** - poprawione atrybuty aria-label dla przycisków

### 📚 Dokumentacja

- `docs/AI_CATEGORIZATION_SETUP.md` - przewodnik konfiguracji Azure OpenAI
- Aktualizacja typów invoice dla AI (aiDescription, AICategorization)

### 🔐 Bezpieczeństwo

- Sekrety przechowywane wyłącznie w Azure Key Vault
- MSAL client-side auth (minimalizacja rozmiaru ciastek)

---

## [0.1.0] - 2026-01-22

### 🎉 Initial Release - Phase 0 Complete

Pierwsza wersja dvlp-ksef - moduł integracji KSeF z Microsoft Dataverse.

### ✨ Aplikacja Web (Next.js 15)

- **Dashboard** - przegląd statystyk faktur, status połączenia KSeF
- **Lista faktur** - tabela z filtrami, zakładki przychodzące/wychodzące
- **Szczegóły faktury** - pełny widok z pozycjami, podsumowaniem VAT, podgląd XML
- **Panel synchronizacji** - zarządzanie sesją, wybór zakresu dat, log operacji
- **Ustawienia** - zarządzanie firmami, centra kosztów (MPK), konfiguracja

### ⚡ API (Azure Functions v4)

- **Sesje KSeF**: `POST/GET/DELETE /api/ksef/session`
- **Operacje na fakturach**:
  - `POST /api/ksef/invoices/send` - wysyłka pojedynczej faktury
  - `POST /api/ksef/invoices/batch` - wysyłka wsadowa
  - `GET /api/ksef/invoices/{ref}` - pobranie faktury
  - `POST /api/ksef/invoices/query` - zapytanie o faktury
  - `POST /api/ksef/sync/incoming` - synchronizacja przychodzących
  - `GET /api/ksef/invoices/{ref}/upo` - pobranie UPO

### 🔧 Infrastruktura

- Struktura monorepo z `pnpm workspaces`
- Azure Functions API (TypeScript)
- Next.js 15 frontend z React 19
- Tailwind CSS 4 z design system Developico
- Komponenty shadcn/ui
- Azure Bicep templates dla deployment

### 📝 Notatki

> Wersja alfa - API KSeF nie jest jeszcze połączone.  
> Dane na dashboardzie są mockowane.

---

## Planowane

### [0.3.0] - Integracja KSeF

- [ ] Autoryzacja tokenem KSeF
- [ ] Pobieranie faktur przychodzących
- [ ] Wysyłanie faktur do KSeF
- [ ] Automatyczna synchronizacja

### [0.4.0] - AI Categorization

- [ ] Endpoint kategoryzacji AI (`POST /api/invoices/categorize`)
- [ ] Cache kategorii dostawców
- [ ] UI przycisk "Kategoryzuj AI"

### [0.5.0] - Dataverse

- [ ] Zapis faktur do Dataverse
- [ ] Mapowanie pól faktury
- [ ] Obsługa wielu firm (multi-tenant)

---

*Projekt rozwijany przez [Developico](https://developico.com) na licencji MIT.*
