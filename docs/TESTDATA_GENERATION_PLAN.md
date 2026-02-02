# Plan: Generowanie i czyszczenie danych testowych KSeF

> **Data utworzenia:** 2026-02-01  
> **Status:** Do przemyślenia  
> **Autor:** Copilot + Łukasz

---

## 📋 Analiza obecnego stanu

### Istniejące funkcjonalności

1. **Endpointy testowe w KSeF API** (plik `api/src/functions/ksef-testdata.ts`):
   - `GET /api/ksef/testdata/permissions` - sprawdzenie uprawnień tokenów
   - `POST /api/ksef/testdata/permissions` - nadawanie uprawnień testowych
   - `POST /api/ksef/testdata/person` - tworzenie testowych osób/JDG
   - `GET /api/ksef/testdata/environments` - info o środowiskach

2. **Struktura środowisk** (`api/src/lib/ksef/config.ts`):
   ```typescript
   KSEF_ENDPOINTS = {
     test: 'https://api-test.ksef.mf.gov.pl/v2',
     demo: 'https://api-demo.ksef.mf.gov.pl/v2',
     prod: 'https://api.ksef.mf.gov.pl/v2',
   }
   ```

3. **Dataverse - powiązanie faktur ze środowiskiem** (`docs/DATAVERSE_SCHEMA.md`):
   - Faktury są powiązane z `dvlp_ksefsettingid` (lookup)
   - Setting ma pole `dvlp_environment` (test/demo/production)
   - Dzięki temu można filtrować faktury per środowisko

4. **Istniejące skrypty testowe** (`api/scripts/test-crud.ts`):
   - CRUD dla faktur w Dataverse
   - Możliwość zachowania danych (`--keep`) lub usunięcia

---

### Czego brakuje

1. **Generowanie faktur testowych w KSeF API** - obecnie możemy tworzyć osoby/JDG i nadawać uprawnienia, ale nie ma endpointów do generowania faktur testowych
2. **Masowe generowanie danych** - brak narzędzi do seed'owania większej ilości danych
3. **Czyszczenie danych per środowisko** - brak dedykowanego mechanizmu do usuwania danych testowych
4. **Wysyłanie faktur na środowisko testowe** - logika do wysyłania faktur istnieje, ale brak narzędzi do masowego testowania

---

## 🎯 Proponowany Plan Implementacji

### Faza 1: Rozszerzenie funkcjonalności testdata

| # | Zadanie | Opis | Priorytet |
|---|---------|------|-----------|
| 1.1 | **Endpoint wysyłki testowej faktury** | `POST /api/ksef/testdata/invoice` - wysyła przykładową fakturę na środowisko test/demo | 🔴 Wysoki |
| 1.2 | **Endpoint generowania zestawu faktur** | `POST /api/ksef/testdata/generate` - generuje N losowych faktur (5-50) | 🔴 Wysoki |
| 1.3 | **Konfiguracja generatora** | Parametry: ilość, zakres dat, wartości, typy faktur | 🟡 Średni |

### Faza 2: Mechanizm czyszczenia danych

| # | Zadanie | Opis | Priorytet |
|---|---------|------|-----------|
| 2.1 | **Endpoint czyszczenia faktur** | `DELETE /api/ksef/testdata/invoices` - usuwa faktury z Dataverse dla danego środowiska | 🔴 Wysoki |
| 2.2 | **Filtrowanie po źródle** | Flaga do usuwania tylko faktur importowanych z KSeF lub wszystkich | 🟡 Średni |
| 2.3 | **Dry-run mode** | Możliwość podglądu co zostanie usunięte bez usuwania | 🟢 Niski |
| 2.4 | **Cleanup script** | Skrypt CLI `pnpm cleanup:testdata` | 🟡 Średni |

### Faza 3: Narzędzia developerskie

| # | Zadanie | Opis | Priorytet |
|---|---------|------|-----------|
| 3.1 | **Seed script** | `pnpm seed:testdata` - tworzy kompletny zestaw danych testowych | 🔴 Wysoki |
| 3.2 | **Reset script** | `pnpm reset:testdata` - czyści i generuje od nowa | 🟡 Średni |
| 3.3 | **Dokumentacja** | README z opisem użycia narzędzi testowych | 🟢 Niski |

### Faza 4: UI do zarządzania danymi testowymi

| # | Zadanie | Opis | Priorytet |
|---|---------|------|-----------|
| 4.1 | **Panel administracyjny** | Sekcja w UI do generowania/czyszczenia danych | 🟢 Niski |
| 4.2 | **Wizualizacja stanu** | Liczniki faktur per środowisko | 🟢 Niski |

---

## 📁 Proponowana struktura plików

```
api/
├── scripts/
│   ├── seed-testdata.ts       # Nowy: generator danych
│   ├── cleanup-testdata.ts    # Nowy: czyszczenie danych
│   └── reset-testdata.ts      # Nowy: reset (cleanup + seed)
├── src/
│   ├── functions/
│   │   └── ksef-testdata.ts   # Rozszerzenie o nowe endpointy
│   └── lib/
│       └── testdata/          # Nowy: moduł testdata
│           ├── generator.ts   # Logika generowania faktur
│           ├── cleanup.ts     # Logika czyszczenia
│           └── templates.ts   # Szablony faktur testowych
```

---

## ⚠️ Ważne uwagi

### Środowisko DEMO vs TEST

| Środowisko | Charakterystyka | Użycie |
|------------|-----------------|--------|
| **TEST** | Dane współdzielone między wszystkimi integratorami, niestabilne | Szybkie testy jednostkowe |
| **DEMO** | Dane izolowane per integrator, bardziej stabilne | Testy integracyjne, prezentacje |

**Rekomendacja:** Używać DEMO do testów integracyjnych.

### Zabezpieczenia

- ✅ Wszystkie endpointy testdata wymagają autoryzacji + roli Admin
- ✅ Blokada dla środowiska `prod` już istnieje
- ⚠️ Dodać potwierdzenie przed masowym usuwaniem

### API KSeF 2.0

- Od 1 lutego 2026 wszystkie endpointy używają `/v2`
- Testdata endpoints: `/v2/testdata/permissions`, `/v2/testdata/person`
- **Brak oficjalnego endpointu do generowania faktur testowych** - trzeba wysyłać prawdziwe faktury

### Strategia generowania faktur

| Opcja | Opis | Zalety | Wady |
|-------|------|--------|------|
| **A: Przez API KSeF** | Wysyłać faktury przez API KSeF | Pełna integracja, realistyczne testy | Wymaga poprawnego XML FA(2), wolniejsze |
| **B: Tylko Dataverse** | Lokalne dane bez synchronizacji z KSeF | Szybkie, niezależne od KSeF | Brak testów integracji z KSeF |

**Rekomendacja:** Opcja B dla szybkich testów developerskich, Opcja A dla testów integracyjnych przed deploymentem.

---

## 📝 Notatki

<!-- Miejsce na własne notatki i przemyślenia -->

---

## 📚 Powiązane dokumenty

- [DATAVERSE_SCHEMA.md](./DATAVERSE_SCHEMA.md) - Schemat danych Dataverse
- [API.md](./API.md) - Dokumentacja API
- [README.md](../README.md) - Główna dokumentacja projektu
