# Historia zmian

Wszystkie istotne zmiany w **KSeF Copilot — Code App** (Vite + React SPA) są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.5.1] - 2026-02-22

### ♻️ Uspójnienie ról i branding

- **Tryb Reader w pełni tylko do odczytu** — wszystkie akcje edycji, notatek, załączników, AI i płatności ukryte lub zablokowane dla roli Reader
- **Etykieta roli w menu użytkownika** — poprawiona z "USER" na "READER" dla spójności z uprawnieniami
- **Branding logowania** — ekran logowania używa logo Developico (spójnie z web)


## [2.5.0] - 2026-02-21

### ✏️ Pełna edycja faktury

- **Edycja wszystkich sekcji** — formularz edycji dostępny dla wszystkich typów faktur (KSeF i ręczne), nie tylko dla faktur ręcznych
- **Edycja danych dostawcy** — rozszerzenie formularza o pola adresowe: ulica, kod pocztowy, miasto, kraj (oprócz nazwy i NIP)
- **Zmiana waluty w kwotach** — selektor waluty (PLN/EUR/USD) w boksie z kwotami z automatycznym przeliczeniem brutto PLN
- **Date picker dla kursu walut** — możliwość wyboru daty, dla której pobierany jest kurs NBP; automatyczne pobranie kursu z API po zmianie waluty lub daty
- **Spinner ładowania kursu** — wizualna informacja o pobieraniu kursu z NBP API
- **Zapis źródła kursu** — przekazywanie `exchangeDate` i `exchangeSource: 'NBP'` przy zapisie faktury

### 🏗️ Uproszczenie adresu dostawcy

- **Jedno pole adresowe** — konsolidacja pól `supplierCity`, `supplierPostalCode`, `supplierCountry` w jedno pole `supplierAddress` we wszystkich formularzach (edycja, dodawanie ręczne, skanowanie AI) — zarówno w web jak i code-app
- **Wyszukiwanie dostawcy w edycji** — dodanie kontrolki wyszukiwania dostawcy w rejestrze VAT (Biała Lista) w formularzu edycji faktury
- **Poprawka mapowania walut** — korekta wartości OptionSet walut w Dataverse: PLN=100000000, USD=100000001, EUR=100000002
- **Adres dostawcy z KSeF** — synchronizacja faktur z KSeF zapisuje teraz adres dostawcy (`supplierAddress`) do Dataverse

### 🐛 Poprawki

- **Usunięcie GBP** — usunięcie opcji GBP z selektora walut (nieobsługiwana przez API, powodowała błąd walidacji Zod)
- **Zapis adresu przy tworzeniu faktury** — naprawienie brakującego mapowania `supplierAddress` w funkcji `mapToDataverse`

### 🔧 Backend

- **Rozszerzenie InvoiceUpdateSchema** — dodanie pól adresu dostawcy (`supplierAddress`, `supplierCity`, `supplierPostalCode`, `supplierCountry`)
- **Mapowanie pól w updateInvoice** — dodanie mapowania pól danych faktury (dostawca, kwoty, daty, waluta) do Dataverse w funkcji aktualizacji

---

## [2.4.0] - 2026-02-14

### 🔄 Migracja GUS → VAT (Biała Lista)

- **Integracja z WL VAT API** — zastąpienie GUS SOAP API darmowym REST API Białej Listy VAT (`wl-api.mf.gov.pl`) do weryfikacji dostawców po NIP
- **Wywołania VAT przez Connector** — operacje lookup/validate/check-account kierowane przez Power Platform Custom Connector → Azure Functions (proxy po stronie serwera), omijając ograniczenia CORS w iframe Power Apps
- **Aktualizacja wygenerowanego SDK** — dodanie metod `VatLookup()`, `VatValidate()`, `VatCheckAccount()` do `DVLP_KSeF_PP_ConnectorService` oraz 4 interfejsów modeli (`VatLookupResult`, `VatSubjectData`, `VatValidateResult`, `VatCheckAccountResult`)
- **Swagger Custom Connector** — dodanie 3 ścieżek VAT (`/vat/lookup`, `/vat/validate/{nip}`, `/vat/check-account`) do `apiDefinition.swagger.json` i `swagger.yaml`, usunięcie operacji GUS
- **Parsowanie adresów** — helper `parsePolishAddress()` dzieli ciąg adresowy z WL VAT API (np. `"ul. Kochanowskiego 42, 01-864 WARSZAWA"`) na ulicę, kod pocztowy i miasto
- **Usunięcie bezpośrednich wywołań WL API** — wyeliminowanie 130+ linii kodu `fetch` blokowanego przez CORS; wszystkie wywołania przechodzą teraz przez SDK connectora `safeCall()`

---

## [2.3.0] - 2026-02-14

### 🔌 Power Apps Code App — Integracja z Connectorem

- **Custom Connector API** — wszystkie wywołania API kierowane przez Power Platform Custom Connector (`DVLP-KSeF-PP-Connector`) za pomocą mostu SDK `postMessage`, omijając ograniczenie CSP `connect-src 'none'`
- **Leniwy import dynamiczny** — moduł connectora ładowany przez `import()` z ES Proxy, unikając błędów inicjalizacji klas z wygenerowanego SDK
- **Dwutrybowe API** — automatyczna detekcja: tryb connectora wewnątrz Power Apps, tryb direct-fetch w standalone
- **Wykrywanie hosta Power Apps** — wielostrategiowa detekcja (powerAppsBridge, URL, referrer, cross-origin iframe)
- **Pominięcie MSAL Auth** — pomijanie inicjalizacji MSAL wewnątrz Power Apps (host dostarcza kontekst autoryzacji)
- **HashRouter** — przełączenie z BrowserRouter dla kompatybilności z iframe
- **Error Boundary** — globalny error boundary opakowujący aplikację w celu zapobiegania białym ekranom
- **Osadzenie logo** — logo Developico osadzone jako base64 data URI (bez zewnętrznych żądań)
- **Wyłączenie modulePreload Vite** — zapobiega wstrzykiwaniu linków preload blokowanych przez CSP
- **15 operacji connectora** — HealthCheck, statystyki dashboardu, faktury (lista/szczegóły/aktualizacja/tworzenie), ustawienia, firmy, synchronizacja, kursy walut, kategoryzacja AI, dane testowe

---

## [2.2.0] - 2026-02-14

### ✨ P4 — Poprawki zgodności z wersją webową

- **Badge przeterminowane** — PaymentBadge pokazuje czerwony status „Przeterminowane" gdy faktura jest po terminie płatności (lista + szczegóły)
- **Badge źródła** — badge pochodzenia KSeF / Ręczna obok statusu płatności w szczegółach faktury
- **Wyświetlanie kursu walut** — wartość kursu i data pod odpowiednikiem w PLN dla faktur walutowych
- **Edycja kursu walut** — selektor waluty (PLN/EUR/USD/GBP) i pole kursu w formularzu edycji faktury ręcznej, automatyczne przeliczenie brutto PLN
- **Filtr przeterminowanych** — dodanie opcji „Przeterminowane" do filtrów statusu płatności
- **Przycisk AI** — zawsze widoczna karta analizy AI z przyciskiem „Uruchom analizę AI" / „Analizuj ponownie" w szczegółach faktury
- **Karty KPI dashboardu** — zmiana kart 3/4 z Opłacone+Do zapłaty na Oczekujące+Przeterminowane (zgodność z web app)
- **Rola i profil w nagłówku** — menu użytkownika pokazuje rolę Admin/User i link do profilu Microsoft
- **Domyślne ustawienia synchronizacji** — zakres dat domyślnie ostatnie 30 dni, podgląd auto-pobiera gdy sesja KSeF jest aktywna
- **i18n** — dodanie kluczy EN/PL dla wszystkich nowych elementów UI

---

## [2.1.0] - 2026-02-14

### ✅ Testy — Pokrycie fazy 5 i 6

- **sync-phase5.test.tsx** (26 testów) — renderowanie strony, tabela podglądu, linki do portalu KSeF, zaznaczanie checkboxów, akcje sync/import, kontrola sesji, scenariusze bez aktywnej sesji i bez danych podglądu
- **settings-phase5.test.tsx** (37 testów) — nawigacja 4 zakładek, CRUD firm (NIP, badge'e, status tokena, dodawanie/edycja/usuwanie/test), CRUD MPK, generator danych testowych (suwaki, generowanie, czyszczenie), status systemu (health, serwisy, czasy odpowiedzi, odświeżanie)
- **phase6-components.test.tsx** (23 testy) — EnvironmentBanner (kolor per środowisko, null bez firmy), KsefSyncButton (renderowanie, wywołanie mutate, stylowanie), SystemStatusBadge (kolory healthy/degraded/unhealthy), ChangelogModal (otwórz/zamknij, fetch, markdown, fallback), hook useTripleClick
- **invoice-edit-phase6.test.tsx** (6 testów) — widoczność przycisku edycji dla faktur ręcznych vs KSeF, wypełnienie formularza, anulowanie, zapis wywołuje updateInvoice
- **Poprawki infrastruktury testowej**: polyfill ResizeObserver dla Radix Slider, wrapping TooltipProvider, `getAllByText` dla podwójnego renderowania desktop+mobile
- **Łącznie: 200 testów przechodzących w 11 plikach testowych**

---

## [2.0.0] - 2026-02-13

### ✨ Faza 5 — Synchronizacja i ustawienia

- **Selektywny import** — zaznaczanie checkboxami faktur do importu z podglądu KSeF
- **Zaznacz wszystko / Odznacz wszystko** — masowe przełączanie zaznaczenia nowych faktur
- **Importuj zaznaczone** — import wyłącznie wybranych faktur ze śledzeniem numeru referencyjnego
- **Linki do portalu KSeF** — bezpośrednie linki do weryfikacji faktur na ksef-test.mf.gov.pl / ksef.mf.gov.pl
- **Log operacji** — log operacji synchronizacji w stylu terminala z wpisami ze znacznikami czasu
- **Ustawienia w zakładkach** — układ 4 zakładek: Firmy, MPK, Dane testowe, Status systemu
- **Edycja firmy inline** — edycja nazwy firmy i prefiksu faktur bez opuszczania strony
- **CRUD MPK** — pełne tworzenie/edycja/usuwanie centrów kosztowych z badge'm aktywny/nieaktywny
- **Generator danych testowych** — generowanie faktur z suwakami (liczba, % opłaconych, % KSeF), zakres dat, podgląd czyszczenia
- **Dashboard zdrowia systemu** — status zdrowia na poziomie serwisów z czasami odpowiedzi, podsumowaniami, auto-odświeżaniem (60s)

### ✨ Faza 6 — Szlify i UX

- **Banner środowiska** — 1px kolorowy pasek (pomarańczowy=test, turkusowy=produkcja, granatowy=demo)
- **Szybka synchronizacja** — synchronizacja KSeF jednym kliknięciem (ostatnie 30 dni) z nagłówka
- **Badge statusu systemu** — wskaźnik zdrowia CircleDot z kolorowym tooltipem w nagłówku
- **Modal z historią zmian** — pobiera `/changelog.md`, renderuje z react-markdown, ukryty za easter eggiem potrójnego kliknięcia
- **Hook useTripleClick** — własny hook do detekcji potrójnego kliknięcia z timeoutem 500ms
- **Edycja faktur ręcznych** — formularz edycji inline dla dostawcy, kwot, dat (tylko faktury ręczne)
- **Karty podglądu mobilnego** — responsywny układ mobilny dla tabeli podglądu synchronizacji
- **Spójny komponent Button** — zastąpienie wszystkich przycisków opartych na anchor/div komponentem shadcn/ui Button

---

## [1.3.0] - 2026-02-12

### ✨ Faza 4 — Dashboard i analityka

- **Karty KPI dashboardu** — 4 animowane karty (łączna liczba faktur, suma brutto, opłacone, oczekujące) z AnimatedKpiCard
- **Animacje framer-motion** — kaskadowe animacje wejścia kart
- **react-countup** — animowane liczniki w kafelkach KPI
- **Wykres trendu przychodów** — wykres powierzchniowy z miesięcznymi danymi przychodów (Recharts)
- **Feed ostatniej aktywności** — ostatnie zdarzenia importu faktur
- **Widget statusu KSeF** — status połączenia i czas ostatniej synchronizacji
- **Panel szybkich akcji** — skróty do synchronizacji, skanowania, dodawania faktury

### 🧪 Testy

- **dashboard-phase4.test.tsx** (39 testów) — renderowanie kafelków KPI, etykiety wykresu, ostatnia aktywność, widget KSeF, szybkie akcje, przypadki brzegowe

---

## [1.2.0] - 2026-02-11

### ✨ Faza 3 — Rozbudowa listy faktur

- **Eksport do CSV** — pobieranie przefiltrowanej listy faktur jako CSV
- **Filtr zakresu dat** — filtrowanie faktur za pomocą selektora zakresu dat
- **Filtry statusu płatności** — przyciski szybkiego filtrowania (Wszystkie, Opłacone, Oczekujące, Przeterminowane)
- **Filtry statusu opisu** — filtrowanie po stanie klasyfikacji AI (Brak opisu, Sugestia AI, Opisana)
- **Sortowanie** — klikalne nagłówki kolumn z przełączaniem rosnąco/malejąco
- **Wyszukiwanie** — wyszukiwanie w czasie rzeczywistym po numerze faktury, nazwie dostawcy, NIP
- **Responsywny układ** — mobilny widok kart dla listy faktur

### 🧪 Testy

- **invoice-phase3.test.tsx** (20 testów) — filtry, wyszukiwanie, sortowanie, eksport, widok responsywny

---

## [1.1.0] - 2026-02-10

### ✨ Faza 2 — Szczegóły faktury

- **Strona szczegółów faktury** — pełny widok z danymi dostawcy, kwotami, datami, rozbiciem VAT
- **Status płatności** — oznaczanie jako opłacona/nieopłacona z optymistycznymi aktualizacjami
- **Edycja klasyfikacji** — edycja MPK, kategorii, opisu przez dialog
- **Panel sugestii AI** — wyświetlanie i akceptowanie sugestii MPK/kategorii wygenerowanych przez AI
- **Sekcja załączników** — wysyłanie/pobieranie/usuwanie załączników faktur
- **Sekcja notatek** — dodawanie/edycja/usuwanie notatek do faktur
- **Weryfikacja GUS** — weryfikacja dostawcy przez API GUS (REGON)
- **Kurs walut** — wyświetlanie kursu NBP dla faktur w walutach obcych

### 🧪 Testy

- **invoice-phase2.test.tsx** (18 testów) — renderowanie, akcje płatności, klasyfikacja, załączniki, notatki

---

## [1.0.0] - 2026-02-09

### 🎉 Faza 0 i 1 — Pierwsze wydanie

- **Vite + React 19 SPA** — samodzielny frontend (bez zależności od Next.js)
- **React Router DOM 7** — routing po stronie klienta z nawigacją sidebar
- **react-intl (i18n)** — pełne tłumaczenia polskie/angielskie
- **Azure Entra ID Auth** — uwierzytelnianie MSAL z rolami opartymi na grupach (Admin/User)
- **Kontekst firmy** — obsługa wielu firm z selektorem firmy
- **Komponenty shadcn/ui** — spójne UI z Tailwind CSS 4
- **Ciemny/jasny motyw** — przełącznik motywu z detekcją preferencji systemowych
- **Warstwa API** — współdzielone hooki łączące się z Azure Functions API (`/api/*`)
- **Dashboard** — placeholder z nawigacją
- **Lista faktur** — podstawowa tabela danych z paginacją
- **Ustawienia** — zarządzanie firmami (dodawanie/usuwanie)
- **Synchronizacja** — podstawowa synchronizacja KSeF z zakresem dat

### 🧪 Testy

- **setup.test.ts** (3 testy) — funkcje narzędziowe, konfiguracja i18n
- **api.test.ts** (12 testów) — klient API, obsługa błędów
- **hooks.test.tsx** (12 testów) — hooki React Query
- **auth-provider.test.tsx** (4 testy) — dostawca uwierzytelniania

---

*Część platformy [Developico KSeF](https://github.com/developico). Aplikacja towarzysząca do frontendu [web](../web/) (Next.js).*
