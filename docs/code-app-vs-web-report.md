# KSeF Copilot — Porównanie funkcji: code-app vs web

> Data raportu: 2026-02-13

## 1. Podsumowanie

| | **web** (Next.js) | **code-app** (Vite + React SPA) |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vite 6 + React 19 |
| Routing | File-based (`app/[locale]/...`) | React Router DOM 7 |
| Auth | MSAL + RBAC (grupy Azure AD) | MSAL (bez RBAC) |
| i18n | `next-intl` (PL/EN) | `react-intl` (PL/EN) |
| Data fetching | TanStack Query | TanStack Query + Zustand |
| Charts | Recharts (aktywnie używany) | Recharts (zainstalowany, nieużywany) |
| Strony | 8 tras + podstrony | 7 tras |
| Stan dojrzałości | **Produkcja** — pełna funkcjonalność | **MVP** — bazowe strony gotowe, brak wielu funkcji UI |

---

## 2. Porównanie funkcji — strona po stronie

### 2.1 Dashboard / Strona główna

| Funkcja | web | code-app |
|---|:---:|:---:|
| Karty KPI (faktury, wartość brutto, zapłacone, oczekujące) | ✅ | ✅ |
| Animacje liczników (Framer Motion / react-countup) | ✅ | ❌ |
| Quick action cards (linki do Faktur, Sync, Raportów) | ✅ | ✅ |
| Ostatnia aktywność (5 ostatnich faktur) | ✅ | ❌ |
| Wykres słupkowy — miesięczne wydatki (Recharts) | ✅ | ❌ (CSS bars) |
| Wykres kołowy — rozkład MPK (Recharts) | ✅ | ❌ |
| Top 5 dostawców | ❌ | ✅ |
| Filtr zakresu dat | ✅ | ❌ |

### 2.2 Lista faktur (`/invoices`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| Wyszukiwanie tekstowe | ✅ | ✅ |
| Filtr statusu płatności (All/Paid/Pending) | ✅ | ✅ |
| Filtr statusu płatności — Overdue | ✅ | ❌ |
| Filtr statusu opisu (Not described / AI Suggested / Described) | ✅ | ❌ |
| Zaawansowany panel filtrów (źródło, MPK, kategoria, kwoty, daty) | ✅ | ❌ |
| Sortowanie kolumn | ✅ | ✅ |
| Grupowanie (data / MPK / kategoria) | ✅ | ❌ |
| Eksport CSV (z BOM, format PL/EN) | ✅ | ❌ |
| Document Scanner — upload PDF/image → AI ekstrakcja → faktura | ✅ | ❌ |
| Responsywny layout (tabela desktop / karty mobile) | ✅ | ✅ |
| Inline: mark paid/unpaid | ✅ | ❌ |
| Inline: delete (Admin) | ✅ | ❌ |
| Paginacja | ✅ | ❌ |
| Przycisk odświeżania | ❌ | ✅ |

### 2.3 Nowa faktura (`/invoices/new`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| Formularz ręcznego tworzenia faktury | ✅ | ❌ **brak strony** |
| Walidacja NIP (suma kontrolna modulo-11) | ✅ | ❌ |
| GUS auto-lookup (NIP / nazwa firmy) | ✅ | ❌ |
| Supplier lookup dialog (GUS + ostatni dostawcy) | ✅ | ❌ |
| Kalkulator stawek VAT (23/8/5/0/zw/np/oo) | ✅ | ❌ |
| Multi-currency (PLN/EUR/USD) + kurs NBP | ✅ | ❌ |
| Wybór MPK | ✅ | ❌ |
| Category combobox z free-text | ✅ | ❌ |
| Upload załącznika z PDF thumbnail | ✅ | ❌ |

### 2.4 Szczegóły faktury (`/invoices/:id`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| Wyświetlenie pełnych danych faktury | ✅ | ✅ |
| Edycja klasyfikacji (MPK, kategoria, opis) | ✅ | ❌ |
| Akceptacja sugestii AI (z confidence %) | ✅ | ✅ (wyświetlanie) |
| Pełna edycja faktury manualnej | ✅ | ❌ |
| Załączniki — upload (drag-and-drop) | ✅ | ❌ |
| Załączniki — download / delete / podgląd | ✅ | ❌ |
| Document sidebar (PDF thumbnail, fullscreen) | ✅ | ❌ |
| Sekcja notatek (CRUD + rich editor) | ✅ | ❌ |
| Mark as Paid / Unpaid | ✅ | ✅ (tylko Paid) |
| Pozycje faktury — tabela line items | ✅ | ✅ |
| Konwersja walut z kursem NBP | ✅ | ❌ |
| Przycisk "Trigger AI categorization" | ❌ | ❌ (hook gotowy) |

### 2.5 Prognoza (`/forecast`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| Selektor horyzontu (1/6/12 miesięcy) | ✅ | ✅ |
| Karty KPI prognozy | ✅ (4 karty) | ✅ (3 karty) |
| Area Chart — dane historyczne + predykcja (Recharts) | ✅ | ❌ (CSS bars) |
| Tabbed views (Monthly / MPK / Category / Supplier) | ✅ | ❌ |
| Tabela prognozy (miesiąc, predicted, bounds) | ❌ | ✅ |
| Detekcja anomalii z kodowaniem severity | ✅ | ✅ |
| Metoda & confidence badge | ❌ | ✅ |

### 2.6 Raporty (`/reports`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| Filtry rok/miesiąc | ✅ | ❌ |
| Karty KPI (total count, gross, net, VAT) | ✅ | ✅ (3 karty) |
| Zakładki (Monthly/Suppliers/MPK/Categories) | ✅ | ❌ (wszystko w jednym) |
| Wykres słupkowy — miesięczny | ✅ | ❌ |
| Tabela miesięcznego rozbicia | ✅ | ✅ |
| Top dostawcy | ✅ | ✅ |
| Rozkład MPK (progress bars + tabela) | ✅ | ✅ |
| Rozkład kategorii | ✅ | ❌ |
| Payment breakdown (paid/pending/overdue) | ❌ | ✅ |

### 2.7 Synchronizacja KSeF (`/sync`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| Status połączenia KSeF | ✅ | ✅ |
| Zarządzanie sesją (start/end) | ✅ | ✅ |
| Wybór zakresu dat do synchronizacji | ✅ | ✅ |
| Podgląd importu (already imported / new) | ✅ | ✅ |
| Selektywny import (checkboxes) | ✅ | ❌ |
| Bulk "sync all" | ✅ | ✅ |
| Log operacji (terminal-style) | ✅ | ❌ |
| Linki do portalu KSeF per faktura | ✅ | ❌ |
| Wyniki importu (count imported/skipped) | ✅ | ✅ |

### 2.8 Ustawienia (`/settings`)

| Funkcja | web | code-app |
|---|:---:|:---:|
| CRUD firm (KSeF registrations) | ✅ | ✅ (częściowy) |
| Tryb manual-only toggle | ✅ | ❌ |
| Prefiks faktur | ✅ | ❌ |
| Test tokenu KSeF (validate) | ✅ | ✅ |
| Token status badges | ✅ | ✅ |
| Lista centrów kosztowych | ✅ | ✅ |
| CRUD centrów kosztowych | ✅ | ❌ |
| Generator danych testowych | ✅ | ❌ |
| Cleanup danych testowych | ✅ | ❌ |
| Health Status Panel (per-service health) | ✅ | ❌ |
| Zakładkowy UI (Tabs) | ✅ | ❌ (jedna lista) |

---

## 3. Porównanie funkcji layoutu i nawigacji

| Funkcja | web | code-app |
|---|:---:|:---:|
| Sidebar z nawigacją | ✅ | ✅ |
| Collapsible sidebar | ✅ | ✅ |
| Sidebar — admin-only items (Sync, Settings) | ✅ (filtrowane) | ⚠️ (flaga istnieje, ale nie filtruje) |
| Mobile sidebar (Sheet/Drawer) | ✅ | ❌ (placeholder) |
| Company selector (dropdown) | ✅ | ✅ |
| KSeF Sync button (quick-sync) | ✅ | ❌ |
| System Status badge (header) | ✅ | ❌ |
| Language switcher (PL/EN) | ✅ | ✅ |
| Theme toggle (light/dark) | ✅ | ✅ |
| User avatar menu + sign-out | ✅ | ✅ |
| Environment banner (PROD/TEST/DEMO) | ✅ | ❌ |
| Changelog modal (Easter egg) | ✅ | ❌ |
| Page wrapper / shell | ✅ | ✅ |

---

## 4. Porównanie warstwy backendowej (hooks/API)

| Obszar API | web hooks | code-app hooks | code-app UI |
|---|:---:|:---:|:---:|
| Dashboard stats | ✅ | ✅ | ✅ |
| Faktury CRUD | ✅ | ✅ | ⚠️ częściowy |
| Attachments (upload/download/delete) | ✅ | ✅ | ❌ |
| Notes CRUD | ✅ | ✅ | ❌ |
| Documents (extract, scan) | ✅ | ✅ | ❌ |
| KSeF (session, sync) | ✅ | ✅ | ✅ |
| Companies CRUD | ✅ | ✅ | ⚠️ częściowy |
| Cost centers CRUD | ✅ | ✅ | ❌ (tylko lista) |
| Test data (generate/cleanup) | ✅ | ✅ | ❌ |
| Health check | ✅ | ✅ | ❌ |
| Forecast (monthly/MPK/cat/supplier) | ✅ | ✅ | ⚠️ częściowy |
| Anomaly detection | ✅ | ✅ | ✅ |
| GUS/REGON lookup | ✅ | ✅ | ❌ |
| Exchange rates (NBP) | ✅ | ✅ | ❌ |
| AI categorization | ❌ | ✅ | ❌ |
| Dataverse integration | ❌ | ✅ | ❌ |
| KSeF testdata environments | ❌ | ✅ | ❌ |

> **Kluczowy wniosek**: code-app ma **więcej hooków API niż web** (Dataverse, AI, KSeF testdata), ale **znacznie mniej z nich jest podłączonych do UI**.

---

## 5. Brakujące elementy w code-app — pełna lista

### 5.1 Brakujące strony
| # | Element | Priorytet |
|---|---------|-----------|
| 1 | `/invoices/new` — formularz ręcznego tworzenia faktur | 🔴 Wysoki |

### 5.2 Brakujące komponenty UI (nie istniejące w code-app)
| # | Komponent | Opis | Priorytet |
|---|-----------|------|-----------|
| 2 | Document Scanner Modal | Upload PDF/image → AI extraction → preview → create invoice | 🔴 Wysoki |
| 3 | Supplier Lookup Dialog | GUS search (NIP/nazwa) + Recent suppliers | 🔴 Wysoki |
| 4 | Invoice Filters (zaawansowane) | Źródło, MPK, kategoria, kwota, daty, due date | 🟡 Średni |
| 5 | Invoice Notes Section | CRUD notatek z rich editor | 🟡 Średni |
| 6 | Document Sidebar / Viewer | Podgląd PDF, thumbnails, fullscreen | 🟡 Średni |
| 7 | Manual Invoice Form | Pełny formularz z walidacją NIP, VAT calc, multi-currency | 🔴 Wysoki |
| 8 | Currency Amount | Multi-currency display + NBP exchange rate | 🟡 Średni |
| 9 | Health Status Panel | Per-service health checks z response times | 🟢 Niski |
| 10 | Environment Banner | Kolorowy pasek PROD/TEST/DEMO | 🟢 Niski |
| 11 | Mobile Sidebar | Sheet/Drawer menu na mobile | 🟡 Średni |
| 12 | Changelog Modal | Historia zmian w aplikacji | 🟢 Niski |
| 13 | KSeF Sync Button (header) | Quick-sync ostatnich 30 dni | 🟢 Niski |
| 14 | System Status Badge (header) | Ikona health w headerze | 🟢 Niski |

### 5.3 Brakujące funkcje w istniejących stronach
| # | Strona | Brakująca funkcja | Priorytet |
|---|--------|-------------------|-----------|
| 15 | Dashboard | Wykresy Recharts (bar + pie) zamiast CSS bars | 🟡 Średni |
| 16 | Dashboard | Animacje KPI (Framer Motion / CountUp) | 🟢 Niski |
| 17 | Dashboard | Filtr zakresu dat | 🟡 Średni |
| 18 | Dashboard | Ostatnia aktywność (recent invoices) | 🟢 Niski |
| 19 | Invoices | Filtr statusu opisu (described/AI/not) | 🟡 Średni |
| 20 | Invoices | Grupowanie (data/MPK/kategoria) | 🟡 Średni |
| 21 | Invoices | Eksport CSV | 🟡 Średni |
| 22 | Invoices | Inline mark paid/unpaid | 🟡 Średni |
| 23 | Invoices | Inline delete (Admin) | 🟡 Średni |
| 24 | Invoices | Paginacja | 🟡 Średni |
| 25 | Invoice Detail | Edycja klasyfikacji (MPK, kategoria, opis) | 🔴 Wysoki |
| 26 | Invoice Detail | Pełna edycja faktur manualnych | 🔴 Wysoki |
| 27 | Invoice Detail | Upload/download/delete załączników | 🔴 Wysoki |
| 28 | Invoice Detail | Mark as Unpaid | 🟢 Niski |
| 29 | Forecast | Area Chart (Recharts) zamiast CSS | 🟡 Średni |
| 30 | Forecast | Tabbed views (Monthly/MPK/Category/Supplier) | 🟡 Średni |
| 31 | Reports | Filtry rok/miesiąc | 🟡 Średni |
| 32 | Reports | Zakładkowy UI (Tabs) | 🟡 Średni |
| 33 | Reports | Wykresy Recharts | 🟡 Średni |
| 34 | Reports | Rozkład kategorii | 🟢 Niski |
| 35 | Sync | Selektywny import (checkboxes) | 🟡 Średni |
| 36 | Sync | Log operacji (terminal-style) | 🟢 Niski |
| 37 | Sync | Linki do portalu KSeF | 🟢 Niski |
| 38 | Settings | Zakładkowy UI (Tabs) | 🟡 Średni |
| 39 | Settings | Generator danych testowych | 🟡 Średni |
| 40 | Settings | Health Status Panel | 🟢 Niski |
| 41 | Settings | CRUD centrów kosztowych | 🟡 Średni |
| 42 | Settings | Tryb manual-only / prefiks faktur | 🟢 Niski |
| 43 | Sidebar | Admin-only filtering (faktyczne ukrywanie) | 🟡 Średni |

### 5.4 Brakujące wrapper'y komponentów UI (Radix zainstalowany, brak wrappera)
| # | Komponent | Status |
|---|-----------|--------|
| 44 | Dialog | zainstalowany, brak wrappera |
| 45 | DropdownMenu | zainstalowany, brak wrappera |
| 46 | Select | zainstalowany, brak wrappera |
| 47 | Tabs | zainstalowany, brak wrappera |
| 48 | Toast | zainstalowany, brak wrappera |
| 49 | Tooltip | zainstalowany, brak wrappera |
| 50 | Checkbox | zainstalowany, brak wrappera |
| 51 | Popover | zainstalowany, brak wrappera |
| 52 | AlertDialog | zainstalowany, brak wrappera |
| 53 | Label | zainstalowany, brak wrappera |
| 54 | Progress | zainstalowany, brak wrappera |
| 55 | ScrollArea | zainstalowany, brak wrappera |
| 56 | Slider | zainstalowany, brak wrappera |
| 57 | Collapsible | zainstalowany, brak wrappera |
| 58 | Input | potrzebny |
| 59 | Textarea | potrzebny |

---

## 6. Proponowana kolejność wdrożenia

Poniższy plan uwzględnia: **zależności między komponentami**, **wartość biznesową**, **łatwość implementacji** (wiele hooków już istnieje), oraz **re-use infrastruktury** (wrappery UI blokerami dla wielu funcji).

### Faza 1 — Fundamenty UI (prerequisite dla reszty)
> **Szacowany czas: 2–3 dni**

| Krok | Element | Uzasadnienie |
|------|---------|-------------|
| 1.1 | Wygenerować wrappery shadcn/ui: Dialog, Select, Tabs, Toast, Tooltip, Checkbox, DropdownMenu, Popover, AlertDialog, Label, Input, Textarea, Progress, ScrollArea | Wymagane przez prawie wszystkie poniższe funkcje. Radix jest już zainstalowany — wystarczy `npx shadcn@latest add ...` |
| 1.2 | Mobile Sidebar (Sheet) | Poprawia UX na urządzeniach mobilnych |
| 1.3 | Admin-only sidebar filtering | Bezpieczeństwo — ukrycie Sync i Settings dla non-admin |
| 1.4 | Toast notifications system | Potrzebny do feedback z operacji CRUD |

### Faza 2 — Zarządzanie fakturami (core business value)
> **Szacowany czas: 4–5 dni**

| Krok | Element | Uzasadnienie |
|------|---------|-------------|
| 2.1 | Invoice Detail — edycja klasyfikacji (MPK, kategoria, opis) | Kluczowa funkcja, hooki już gotowe |
| 2.2 | Invoice Detail — upload/download/delete załączników | Hooki gotowe, wymaga Dialog + drag-and-drop |
| 2.3 | Invoice Detail — notatki (CRUD + editor) | Hooki gotowe, wymaga Dialog + textarea |
| 2.4 | Invoice Detail — mark as unpaid | Prosty do dodania do istniejącego buttona |
| 2.5 | Strona `/invoices/new` + Manual Invoice Form | Nowa strona + formularz (NIP validation, VAT calc) |
| 2.6 | Supplier Lookup Dialog (GUS) | Zależność od formularza new invoice |
| 2.7 | Currency Amount + NBP exchange rates | Uzupełnienie wyświetlania walut |

### Faza 3 — Document Scanner i zaawansowane filtry
> **Szacowany czas: 3–4 dni**

| Krok | Element | Uzasadnienie |
|------|---------|-------------|
| 3.1 | Document Scanner Modal (upload → AI extraction → preview → create) | Hooki extraction gotowe, duża wartość biznesowa |
| 3.2 | Document Sidebar / Viewer (PDF thumbnail, fullscreen) | Wymaga react-pdf (zainstalowany) |
| 3.3 | Zaawansowany panel filtrów na liście faktur | Wymaga Select, Popover, Slider |
| 3.4 | Filtr statusu opisu (not described / AI / described) | Prosty filtr — dodanie do istniejącego panelu |
| 3.5 | Grupowanie faktur (data/MPK/kategoria) | Logika kliencka |
| 3.6 | Eksport CSV | Port z web — lekka adaptacja |
| 3.7 | Inline mark paid/unpaid + delete na liście | Wymaga AlertDialog + mutacje |
| 3.8 | Paginacja | Kontrolka paginacji |

### Faza 4 — Wizualizacja danych (wykresy i dashboard)
> **Szacowany czas: 2–3 dni**

| Krok | Element | Uzasadnienie |
|------|---------|-------------|
| 4.1 | Dashboard — wykresy Recharts (bar + pie) | Recharts zainstalowany, replace CSS bars |
| 4.2 | Dashboard — filtr zakresu dat | Date picker |
| 4.3 | Dashboard — animacje KPI (CountUp + Framer Motion) | Zainstalowane, podpiąć |
| 4.4 | Dashboard — ostatnia aktywność (recent invoices) | Prosty komponent |
| 4.5 | Forecast — Area Chart (Recharts) | Replace CSS bars |
| 4.6 | Forecast — tabbed views (Monthly/MPK/Category/Supplier) | Wymaga Tabs |
| 4.7 | Reports — wykresy Recharts + tabs + filtry | Wymaga Tabs + Recharts |
| 4.8 | Reports — rozkład kategorii | Dodanie do istniejącej strony |

### Faza 5 — Sync i Settings improvements
> **Szacowany czas: 2–3 dni**

| Krok | Element | Uzasadnienie |
|------|---------|-------------|
| 5.1 | Sync — selektywny import (checkboxes) | Wymaga Checkbox |
| 5.2 | Sync — log operacji (terminal-style) | ScrollArea + styled log |
| 5.3 | Sync — linki do portalu KSeF | Proste linki |
| 5.4 | Settings — Tabs UI | Wymaga komponentu Tabs |
| 5.5 | Settings — CRUD centrów kosztowych | Hooki gotowe |
| 5.6 | Settings — generator danych testowych | Hooki gotowe |
| 5.7 | Settings — Health Status Panel | Hook health gotowy |
| 5.8 | Settings — tryb manual-only / prefiks faktur | Drobne pole w formularzu firmy |

### Faza 6 — Polish & UX extras
> **Szacowany czas: 1–2 dni**

| Krok | Element | Uzasadnienie |
|------|---------|-------------|
| 6.1 | Environment Banner (PROD/TEST/DEMO) | Prosty UI element |
| 6.2 | KSeF Sync Button w headerze | Quick-sync z dowolnej strony |
| 6.3 | System Status Badge w headerze | Hook health gotowy |
| 6.4 | Changelog Modal | react-markdown zainstalowany |
| 6.5 | Pełna edycja faktur manualnych | Rozbudowa invoice detail |

---

## 7. Podsumowanie ilościowe

| Kategoria | Ilość brakujących elementów |
|-----------|:-:|
| Brakujące strony | 1 |
| Brakujące komponenty UI (nowe) | 13 |
| Brakujące funkcje w istniejących stronach | 29 |
| Brakujące wrapper'y UI (Radix → shadcn) | 16 |
| **Razem** | **59** |

### Hooki API gotowe, ale bez UI
code-app ma **więcej hooków niż web** (Dataverse, AI categorization, KSeF testdata environments), ale aż **~60% z nich nie jest podłączonych do żadnego komponentu UI**. To oznacza, że warstwa danych jest mocno rozbudowana i implementacja UI będzie szybsza niż w przypadku budowania od zera.

### Szacowany łączny czas implementacji
**14–20 dni roboczych** (dla jednego developera), z czego:
- Faza 1 (fundamenty): 2–3 dni
- Faza 2 (faktury — core): 4–5 dni  
- Faza 3 (scanner + filtry): 3–4 dni
- Faza 4 (wykresy): 2–3 dni
- Faza 5 (sync + settings): 2–3 dni
- Faza 6 (polish): 1–2 dni

---

## 8. Uwagi dodatkowe

1. **RBAC**: code-app nie implementuje filtrowania po rolach (Admin/User). Flaga `adminOnly` istnieje na elementach sidebar, ale jest ignorowana. Warto to wdrożyć w Fazie 1 razem z filtrowaniem sidebar.

2. **Zainstalowane, nieużywane zależności**: `recharts`, `framer-motion`, `react-countup`, `react-pdf`, `react-markdown`, `react-medium-image-zoom`, `cmdk` — wszystkie są gotowe do użycia, co znacznie skraca czas implementacji.

3. **code-app ma unikalne hooki**, których web nie posiada:
   - Dataverse integration (settings, sessions, sync)
   - AI categorization trigger
   - KSeF testdata environments/permissions management
   
   Te funkcje mogą być wdrożone jako **dodatkowa wartość code-app** w przyszłych fazach.

4. **Testy**: Każda faza powinna obejmować aktualizację testów zgodnie z `Testing Discipline` z copilot-instructions.
