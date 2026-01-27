# Changelog

Wszystkie istotne zmiany w projekcie **Developico KSeF** będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

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
