# Changelog

Wszystkie istotne zmiany w projekcie **Developico KSeF** będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

---

## [1.0.0] - 2026-04-12

### 📋 Moduł dokumentów kosztowych

Nowy moduł obsługi 7 typów dokumentów kosztowych (nie-VAT): Paragon, Pokwitowanie, Pro forma, Nota księgowa, Rachunek, Umowa zlecenie/o dzieło, Inne.

#### Warstwa danych i API
- Nowa tabela Dataverse `dvlp_ksefcostdocument` z pełnym schematem (15+ kolumn)
- 18 endpointów API: CRUD, operacje batch, AI kategoryzacja, notatki, załączniki, import CSV/Excel, raporty, OCR
- 3 nowe typy powiadomień: wniosek o zatwierdzenie, decyzja, ostrzeżenie budżetowe
- Integracja z budżetami MPK i prognozami

#### Frontend
- Strona `/costs` — lista z filtrami, zaznaczanie grupowe, operacje batch
- Formularz tworzenia dokumentu kosztowego z OCR i AI kategoryzacją
- Dialog szczegółów dokumentu z notatkami, załącznikami i historią approval
- Zakładka „Dokumenty kosztowe" w raportach — KPI, wykres kołowy, top kategorie, stacked bar chart
- Responsywny mobile-first UI z widokiem kart na małych ekranach

### 🌐 i18n

- Nowe klucze tłumaczeń: `costs` (38 kluczy), `reports.costDistribution` (19 kluczy), `navigation.costs` — PL + EN

---

## [0.9.4] - 2026-04-01

### 📋 Samofakturowanie — zgodność XML z interpretacją KIS

Implementacja wymagań interpretacji KIS z 27.02.2026 (0112-KDIL1-3.4012.874.2025.2.KK) — zatwierdzanie samofaktur na podstawie pliku XML przed wysyłką do KSeF.

#### Backend (API)
- **Generowanie XML przy składaniu do akceptacji** — endpoint `POST /submit` generuje XML via `buildInvoiceXml()`, oblicza hash SHA256 i zapisuje `xmlContent` + `xmlHash` na fakturze (wcześniej XML był generowany dopiero przy wysyłce do KSeF)
- **DodatkowyOpis w XML** — metadane zatwierdzenia dodawane do XML po akceptacji sprzedawcy: data zatwierdzenia, osoba zatwierdzająca, system, hash XML
- **Stopka z informacją o zatwierdzeniu** — nota w sekcji `Stopka/StopkaFaktury`: „Zatwierdzona przez {name} dnia {date} w systemie KSeF Copilot by Developico"
- **Endpoint `GET /xml`** — pobieranie pliku XML faktury samofakturowania (`Content-Type: application/xml`)
- **Wysyłka do KSeF z zapisanego XML** — endpoint `send-ksef` używa przechowywanego XML zamiast regeneracji, z walidacją integralności hash
- **Czyszczenie XML przy cofaniu do Draft** — `revert-to-draft` kasuje `xmlContent` i `xmlHash` (XML musi być wygenerowany ponownie po edycji)
- **Auto-approve** — umowy z flagą `autoApprove` pomijają etap PendingSeller, faktury są automatycznie zatwierdzane przy submicie
- **Rozszerzony audit trail** — notatka po zatwierdzeniu zawiera timestamp i hash XML
- **SystemInfo** — zmiana identyfikatora systemu w XML na „KSeF Copilot by Developico"

#### Frontend
- **Komponent `<InvoiceXmlPreview>`** — wizualizacja faktury w czytelnym formacie tabelarycznym inspirowanym oficjalnym XSL MF:
  - Nagłówek: kod formularza, wariant, data wytworzenia
  - Sprzedawca (Podmiot1) | Nabywca (Podmiot2) obok siebie
  - Podmiot3 (wystawca) — dla samofakturowania
  - Tabela pozycji: Nr | Nazwa | Ilość | Jm. | Cena netto | Stawka VAT | Kwota netto | Kwota brutto
  - Podsumowanie VAT per stawka + kwota brutto ogółem
  - Adnotacje, warunki płatności, rachunek bankowy
  - DodatkowyOpis (tabela klucz-wartość z danymi zatwierdzenia)
  - Stopka
- **Zakładki w widoku szczegółów SB** — „Dane" | „Podgląd faktury" | „XML" (surowy, zwinięty domyślnie)
- **Przycisk „Drukuj / Zapisz PDF"** — `window.print()` z dedykowanym layoutem druku (`@media print`, format A4)
- **Przycisk „Pobierz XML"** — link do endpointu `/xml`
- **Podgląd XML dla faktur zsynchronizowanych z KSeF** — reużycie `<InvoiceXmlPreview>` dla istniejącego pola `rawXml` na fakturach pobranych z KSeF (sekcja zwijalna w widoku szczegółów)
- **Naprawiony mapping pól** — ujednolicenie nazw `rawXml` / `xmlContent` między API a frontendem

#### Infrastruktura
- **Nowe kolumny Dataverse** — `dvlp_xmlcontent` (Memo, max 1MB) i `dvlp_xmlhash` (String, max 100) na tabeli `dvlp_ksefselfbillinginvoice`
- **Skrypt prowizji** — `Provision-SbApprovalColumns.ps1` rozszerzony o tworzenie kolumn XML

### 🌐 i18n

- **Nowe klucze tłumaczeń** — `xmlPreview.*` (35+ kluczy) w `pl.json` i `en.json` dla komponentu podglądu XML

---

## [0.9.3] - 2026-03-23

### 📋 Samofakturowanie

- **Szablon numeru faktury SB per dostawca** — nowe pole `sbInvoiceNumberTemplate` na stronie szczegółów dostawcy umożliwiające konfigurację szablonu numeracji faktur samofakturowania. Dostępne zmienne: `{YYYY}`, `{MM}`, `{NNN}`, `{NNNN}`, `{SUPPLIER}`, `{NIP}`. Domyślny szablon: `SF/{YYYY}/{MM}/{NNN}`.
- **Tooltip z opisem zmiennych** — ikona pomocy obok pola szablonu wyświetlająca listę wszystkich dostępnych zmiennych z opisami

### 🌐 i18n

- **Nowe klucze tłumaczeń** — `suppliers.invoiceNumberTemplate`, `suppliers.invoiceNumberTemplateHelp`, `suppliers.templateVar*` w `pl.json` i `en.json`

---

## [0.9.2] - 2026-03-21

### 🌐 i18n — wybór miesiąca

- **Komponent `MonthPicker`** — natywny `<input type="month">` w dialogu generowania samofaktur zastąpiony własnym komponentem z pełną lokalizacją (nazwy miesięcy, przyciski „Wyczyść" / „Bieżący miesiąc" w języku aplikacji)
- **Nowe klucze i18n** — `common.monthPicker.*` (placeholder, clear, thisMonth, nazwy miesięcy) w `pl.json` i `en.json`

### 🐛 Poprawki

- **Zakładka Akceptujący** — nazwy i adresy e-mail członków grupy Entra ID wyświetlane poprawnie (fallback na dane Dataverse gdy Graph API zwraca puste pola)

---

## [0.9.1] - 2026-03-19

### 📋 Samofakturowanie — ulepszenia akceptacji

- **Edycja numeru faktury przy akceptacji SB** — dialog akceptacji z polem numeru faktury i komentarzem (endpoint API, warstwa serwisowa, UI)
- **Dialog akceptacji na stronach list** — strony `/approvals` i `/self-billing` wyświetlają dialog z polem numeru faktury zamiast bezpośredniego wywołania API
- **Auto-przełączanie na zakładkę SB** — gdy brak zwykłych faktur oczekujących, automatyczne otwarcie zakładki samofakturowania

### 🔔 Powiadomienia — nowe funkcje

- **Scrollowanie panelu** — naprawiony overflow dla dużej liczby powiadomień (zamiana ScrollArea na natywne `overflow-y-auto` z `maxHeight`)
- **Filtrowanie powiadomień** — przyciski „Wszystkie" / „Nowe" z badge liczbą nieprzeczytanych
- **Oznacz wszystkie jako przeczytane** — przycisk z ikoną CheckCheck + nowy endpoint `POST /api/notifications/mark-all-read`
- **Typy powiadomień SB** — obsługa `SbApprovalRequested` (5) i `SbApprovalDecided` (6) w Dataverse option set

### 🐛 Poprawki

- **Sygnatura `RowActions`** — komponent przyjmuje obiekt faktury (`SelfBillingInvoice`) zamiast samego ID

---

## [0.9.0] - 2026-03-24

### 📋 Samofakturowanie (Self-Billing)

#### Dostawcy
- **Strona dostawców** — `/suppliers` z listą dostawców, filtrowaniem po statusie, wyszukiwaniem i paginacją
- **Szczegóły dostawcy** — `/suppliers/[id]` z danymi kontaktowymi, statystykami, kartą umowy SB i sekcją szablonów
- **Szablony SB per dostawca** — komponent CRUD z dialogiem dodawania/edycji (nazwa, opis pozycji, ilość, jednostka, cena, stawka VAT, waluta)

#### Umowy samofakturowania
- **Karta umowy** na stronie dostawcy — aktywna umowa z datami obowiązywania i statusem
- **Załączniki umów** — przesyłanie i lista załączników do umów SB

#### Faktury samofakturowania
- **Strona samofakturowania** — `/self-billing` z listą faktur SB, filtrami statusu i wyszukiwaniem
- **Generowanie faktur** — dialog z wyborem okresu, podglądem faktur do wygenerowania i potwierdzeniem
- **Import z pliku** — dialog importu z pobieraniem szablonu (CSV/XLSX), przesyłaniem pliku i dwuetapową walidacją
- **Akcje wierszowe** — podgląd, wysyłka do KSeF, akceptacja/odrzucenie z komentarzem — zależne od statusu faktury

#### Dashboard
- **Kafelki KPI samofakturowania** — nowe karty: wysłane w bieżącym miesiącu, wygasające umowy (≤30 dni)

#### Architektura
- **Ekstrakcja komponentów** — `StatusBadge`, `RowActions`, `GenerateDialog`, `ImportDialog` wyodrębnione z pliku strony do `components/self-billing/`
- **Ekstrakcja szablonów dostawcy** — `SupplierSbTemplates` wyodrębniony do `components/suppliers/`

---

## [0.8.0] - 2026-03-10

### 🏢 Zarządzanie MPK — migracja na encje

- **Centra kosztowe jako tabela Dataverse** — MPK zmigrowane z OptionSet (`dvlp_costcenter`) na dedykowaną tabelę `dvlp_ksefmpkcenter` z pełnym CRUD (tworzenie, edycja, dezaktywacja)
- **Akceptanci MPK** — zarządzanie akceptantami per centrum kosztowe z progami kwotowymi
- **Budżetowanie MPK** — definiowanie i śledzenie budżetów miesięcznych/kwartalnych per MPK

### ✅ Workflow zatwierdzania faktur

- **Strona zatwierdzania** — `/approvals` z listą oczekujących faktur, filtrowaniem po kwocie/MPK/dostawcy
- **Szybkie akcje** — zatwierdzanie/odrzucanie z komentarzem, masowe zatwierdzanie
- **SLA monitoring** — wizualne oznaczenie faktur z przekroczonym SLA
- **Kolumna statusu akceptacji** na liście faktur

### 🔔 System powiadomień

- **Panel powiadomień** — lista powiadomień użytkownika z oznaczaniem jako przeczytane/odrzucone
- **Licznik nieprzeczytanych** — badge w nawigacji
- **Typy powiadomień** — nowa faktura, przekroczenie SLA, przekroczenie budżetu

### 📊 Raporty

- **Wykorzystanie budżetu** — raport per MPK z wykresami i alertami
- **Historia akceptacji** — z filtrami (data, MPK, status akceptacji)
- **Wydajność akceptantów** — statystyki per akceptant
- **Przetwarzanie faktur** — pipeline faktur z podziałem na statusy

---

## [0.7.8] - 2026-02-27

### ✨ Wielowalutowość na liście faktur

- **`InvoiceAmountCell`** — nowy komponent tabeli wyświetlający kwotę w oryginalnej walucie z tooltipem `≈ X zł` (hover) dla faktur EUR/USD, gdy dostępne jest pole `grossAmountPln`
- **Sumy grup w PLN** — sumy grupowe na liście faktur normalizowane do PLN przy użyciu `grossAmountPln ?? grossAmount`; prefiks `~` gdy co najmniej jedna faktura w grupie nie ma przeliczonej kwoty PLN
- **Widok mobilny** — karty mobilne faktur używają `InvoiceAmountCell` zamiast lokalnej funkcji `formatCurrency`

### 🎨 UX — formularz szczegółów faktury

- **Przyciski Zapisz/Anuluj w nagłówku** — ikony `[X][✓]` przeniesione z oddzielnego paska na dole do nagłówka karty „Dane faktury"; spinner `Loader2` podczas zapisu — spójnie z kartą Klasyfikacja

### 🌐 i18n — badge statusu systemu

- **Namespace `systemStatus`** — wszystkie teksty tooltipów w `SystemStatusBadge` przeniesione do kluczy i18n (`checking`, `cannotConnect`, `allOperational`, `servicesDegraded`, `servicesUnavailable`, `servicesHealthy`) w `en.json` i `pl.json`

### 🔧 Backend — parser KSeF i synchronizacja

- **Obsługa formatu FA(3)** — parser XML KSeF obsługuje nowy format adresu `AdresL1/AdresL2` (schemat od 2025) jako fallback przed strukturalnym formatem FA(2) (`Ulica`, `NrDomu`, `KodPocztowy`, `Miejscowosc`)
- **Ekstrakcja kraju** — parser wyodrębnia `KodKraju` (kod kraju ISO) dla dostawcy i nabywcy z XML
- **Zapis kraju/adresu nabywcy** — synchronizacja KSeF zapisuje do Dataverse pola `supplierCountry`, `buyerAddress`, `buyerCountry` z danych parsera

---

## [0.7.7] - 2026-02-26

### ✨ Faktury korygujące — pełna obsługa

- **Wykrywanie korekt** — logika wykrywania faktur korygujących na podstawie pola `invoiceType === 'Corrective'` z fallbackiem na prefiks numeru `KOR/` (odporność na brak pola w starszych danych)
- **Zagnieżdżone wyświetlanie korekt** — korekty widoczne bezpośrednio pod fakturą nadrzędną na liście faktur z wcięciem i ikoną `CornerDownRight`
- **Filtr „Z korektami"** — nowy szybki filtr na liście faktur z licznikiem wykrytych korekt
- **Karta faktury nadrzędnej** — na stronie szczegółów korekty wyświetlana jest karta z numerem, dostawcą, datą i kwotą faktury nadrzędnej (klikalny link)
- **Karta powiązanych korekt** — na stronie szczegółów faktury nadrzędnej wyświetlana jest lista powiązanych korekt z numerem, datą, przyczyną korekty i kwotą brutto
- **Filtr `parentInvoiceId`** — nowy parametr API do pobierania korekt powiązanych z daną fakturą nadrzędną

### 🐛 Poprawki

- **Walidacja kwoty brutto** — usunięto ograniczenie `min(0)` dla pól `netAmount`, `vatAmount`, `grossAmount` i `grossAmountPln` w `InvoiceUpdateSchema` i `ManualInvoiceCreateSchema` — faktury korygujące mogą mieć wartości ujemne
- **Klucz i18n `invoices.loading`** — dodano brakujący klucz `loading` w namespace `invoices` (powodował błąd MISSING_MESSAGE w konsoli przeglądarki)

### 🔧 Backend

- **Nowe pola Dataverse** — encja faktur rozszerzona o `invoiceType`, `parentInvoiceId`, `correctedInvoiceNumber`, `correctionReason` (mapowanie do/z Dataverse)
- **Parser KSeF XML** — automatyczne wykrywanie faktur korygujących z pola `TypFaktury` w XML KSeF oraz ekstrakcja numeru korygowanej faktury
- **Filtr OData `parentInvoiceId`** — funkcja `listInvoices` obsługuje filtrowanie po polu `_dvlp_parentinvoiceid_value`

---

## [0.7.6] - 2026-02-24

### ✨ Automatyczna kategoryzacja AI po synchronizacji

- **Checkbox „AI categorization after sync"** — nowa opcja (domyślnie wyłączona) w panelu synchronizacji, uruchamiająca automatyczny opis faktur przez AI po imporcie z KSeF
- **Auto-apply sugestii AI** — nowy parametr `autoApply` w endpoincie `POST /api/ai/batch-categorize`; gdy włączony, AI zapisuje wyniki bezpośrednio do pól MPK, kategoria i opis (a nie tylko do pól sugestii)
- **Pasek postępu AI** — wizualizacja postępu kategoryzacji z procentem, kolorami statusu (fioletowy=w toku, zielony=ukończono, czerwony=błąd)
- **Informacja o czasie** — komunikat „Adds ~2s per invoice to the sync time" przy checkboxie
- **Przetwarzanie wsadowe** — faktury przetwarzane w partiach po 50 z śledzeniem postępu
- **`newInvoiceIds` w odpowiedzi sync** — endpointy `POST /api/ksef/sync` i `POST /api/ksef/sync/import` zwracają teraz ID nowo utworzonych faktur

### 📚 Dokumentacja

- **Studium wykonalności** — `docs/pl/AUTO_KATEGORYZACJA_AI_STUDIUM.md` z analizą 5 wariantów implementacji

---

## [0.7.5] - 2026-02-23

### 🐛 Poprawki — Moduł prognozowania

- **Naprawione klucze presetów i18n** — zmiana kluczy `strict`/`relaxed` na `conservative`/`aggressive` w pl.json i en.json (zgodność z kodem backendu)
- **Naprawiony licznik aktywnych reguł** — zmienna formatowania `enabledCount` poprawiona z `enabled` na `count` w panelu ustawień anomalii
- **Naprawiony scroll panelu anomalii** — dodanie flex/overflow do SheetContent i naprawienie wewnętrznego wrappera w komponencie Sheet (Radix Dialog)
- **Naprawione ostrzeżenia Recharts** — dodanie `initialDimension={{ width: 1, height: 1 }}` do `ResponsiveContainer` w forecast-comparison i dashboard-content (eliminacja `width(-1) height(-1)`)
- **Route Handlers z fallbackiem** — nowe Next.js Route Handlers dla `/api/forecast/algorithms` i `/api/anomalies/rules` z proxy do Azure Functions i automatycznym fallbackiem do lokalnych metadanych (eliminacja błędów 404 w konsoli)

### 📚 Dokumentacja algorytmów i anomalii

- **Nowy dokument PL** — `docs/pl/PROGNOZOWANIE_I_ANOMALIE.md` — kompletna dokumentacja 5 algorytmów prognozowania (wzory matematyczne, parametry, presety) i 5 reguł anomalii (logika detekcji, scoring, progi) z diagramami Mermaid
- **Nowy dokument EN** — `docs/en/FORECASTING_AND_ANOMALIES.md` — angielska wersja powyższego
- **Rozszerzenie API.md** — dodanie sekcji Prognoza wydatków (5 endpointów) i Wykrywanie anomalii (3 endpointy) do dokumentacji API w PL i EN
- **Rozszerzenie ARCHITEKTURA.md** — nowy diagram sekwencji przepływu danych prognozowania i anomalii w sekcji Data Flows (PL i EN)
- **Aktualizacja nawigacji** — linki do nowych dokumentów w `docs/README.md`

---

## [0.7.4] - 2026-02-22

### ♻️ Uspójnienie ról i branding

- **Tryb Reader w pełni tylko do odczytu** — wszystkie akcje edycji, notatek, załączników, AI i płatności ukryte lub zablokowane dla roli Reader
- **Etykieta roli w menu użytkownika** — poprawiona z "USER" na "READER" dla spójności z uprawnieniami
- **Branding logowania** — ekran logowania używa logo Developico (spójnie z code-app)


## [0.7.3] - 2026-02-14

### 🔄 GUS → VAT (Biała Lista) Migration

- **WL VAT API** — replaced GUS SOAP API with free White List VAT REST API (`wl-api.mf.gov.pl`) for supplier verification by NIP
- **Address parsing** — `parsePolishAddress()` helper in `supplier-lookup-dialog.tsx` splits WL VAT API address string (e.g. `"ul. Kochanowskiego 42, 01-864 WARSZAWA"`) into street, postal code, and city for form auto-fill
- **VAT Azure Functions endpoints** — 3 new API endpoints deployed: `POST /api/vat/lookup`, `GET /api/vat/validate/{nip}`, `POST /api/vat/check-account`

---

## [0.7.2] - 2026-02-13

### 🐛 Poprawki - Formularz skanera AI i podgląd dokumentów

- **Miniaturki PDF** — generowanie miniaturki pierwszej strony PDF po przesłaniu dokumentu (pdfjs-dist, client-side). Miniaturka zapisywana w Dataverse jako annotation, ładowana zamiast pełnego pliku przy liście faktur.
- **Worker pdfjs serwowany z /public** — plik `pdf.worker.min.mjs` kopiowany do `web/public/`, workaround dla hoistingu `pdfjs-dist` w monorepo.
- **CSP: worker-src** — dodano `worker-src 'self' blob:` do `next.config.mjs` i `staticwebapp.config.json`, aby pdfjs worker mógł się załadować.
- **Błąd SSR Object.defineProperty** — zmiana importu `react-pdf` z top-level na lazy `await import('react-pdf')` w `pdf-thumbnail.ts`.
- **Pusty podgląd po przesłaniu PDF** — usunięto blokujący warunek `hasPreviewData`, dodano `retry: false` dla zapytania o miniaturkę (404 = brak miniaturki, nie błąd).
- **Błąd po usunięciu dokumentu** — sidebar pokazywał "Nie udało się załadować dokumentu" zamiast pustego stanu. Naprawiono logikę `localHasDocument` na optymistyczny override (`null | true | false`).
- **Waluta w formularzu skanera** — dodano selektor waluty (PLN/EUR/USD) w sekcji kwot, inicjalizowany z wartości rozpoznanej przez AI. Waluta przekazywana do `ManualInvoiceCreate`.
- **Pozycje faktury — waluta dynamiczna** — sekcja pozycji pokazuje walutę wybraną w formularzu zamiast zahardkodowanego `PLN`.
- **Walidacja NIP w formularzu skanera** — pola NIP, nazwa i numer faktury mają wizualną walidację (czerwona ramka + komunikat) po blur i przy próbie zapisu.

---

## [0.7.1] - 2026-02-13

### 🐛 Poprawki - Skaner dokumentów i Dashboard

- **Skan faktury zapisywany do pola dokumentu** — skaner zapisywał obraz jako załącznik (`uploadAttachment`) zamiast do pola dokumentu/skanu (`uploadDocument`). Naprawiono w `extraction-preview.tsx`.
- **Setting ID ustawiane przy tworzeniu faktury ze skanera** — faktury tworzone ze skanera nie miały ustawionego `settingId`, przez co nie były widoczne na liście. Dodano `settingId` do interfejsu `ManualInvoiceCreate` (frontend), schematu Zod `ManualInvoiceCreateSchema` (API) i przekazywanie `selectedCompany.id` w komponencie skanera.
- **Przycisk usuwania dla wszystkich faktur (admin)** — przycisk kasowania jest teraz widoczny przy wszystkich fakturach (nie tylko manualnych), ale dostępny wyłącznie dla użytkowników z rolą Admin.
- **Skan przeniesiony do prawego sidebara** — obraz faktury przeniesiony z głównej kolumny do prawego panelu bocznego (pod AI Asystentem), z kompaktową miniaturką i pełnoekranowym podglądem w modalu.
- **Skeleton loading na kafelkach Dashboard** — kafelki KPI wyświetlają animację ładowania (Skeleton) zamiast wartości „0" podczas ładowania kontekstu firmy.
- **Poprawka podglądu dokumentu (mimeType)** — Dataverse zwraca `application/octet-stream` jako Content-Type; dodano wykrywanie typu MIME na podstawie rozszerzenia pliku.
- **Poprawka cache po usunięciu dokumentu** — zmiana z `invalidateQueries` na `removeQueries` dla natychmiastowego odświeżenia miniaturki po usunięciu.

---

## [0.7.0] - 2026-02-11

### ✨ Dodane - Moduł Prognoza Wydatków

- **Silnik prognozowania** (`api/src/lib/forecast/engine.ts`) — regresja liniowa, ważona średnia krocząca, wykrywanie sezonowości z przedziałem ufności 80%
- **Wykrywanie anomalii** (`api/src/lib/forecast/anomalies.ts`) — 5 reguł: amount-spike (>2σ), new-supplier, duplicate-suspect, category-shift, frequency-change
- **4 endpointy API prognoz** — `/api/forecast/monthly`, `/by-mpk`, `/by-category`, `/by-supplier` z horyzontem 1/6/12 miesięcy
- **2 endpointy API anomalii** — `/api/anomalies` (lista) i `/api/anomalies/summary` (podsumowanie)
- **Strona Prognoza** — nowa zakładka w nawigacji z ikoną TrendingUp
- **Kafelki KPI** — prognoza następnego miesiąca, trend %, łączna prognoza, pewność (AnimatedKpiCard)
- **Wykres AreaChart** — dane historyczne + prognoza z pasmem przedziału ufności (Recharts)
- **Zakładki** — Przegląd, Wg MPK, Wg kategorii, Wg dostawcy, Anomalie
- **Karty anomalii** — kolorowane wg severity z linkiem do faktury
- **i18n** — pełne tłumaczenia PL/EN dla modułu forecast
- **Układ zgodny z Raportami** — kafelki na górze, pasek zakładek na pełną szerokość

---

## [0.6.4] - 2026-02-11

### 🔧 Poprawki - Logowanie Synchronizacji (Sync Log)

- **Integracja `syncLogService` z endpointem `POST /api/ksef/sync`** — każda synchronizacja tworzy teraz rekord w tabeli Dataverse `dvlp_ksefsynclogs` z pełnymi statystykami (imported, skipped, failed)
- **Integracja `syncLogService` z endpointem `POST /api/ksef/sync/import`** — selektywny import faktur również logowany do Sync Log
- **Aktualizacja `lastSyncAt` / `lastSyncStatus` na Setting** — po każdej synchronizacji aktualizowany jest status ostatniego synca na rekordzie firmy
- **Non-blocking logging** — błędy zapisu do Sync Log nie blokują samej synchronizacji (graceful degradation)
- **`syncLogId` w odpowiedzi API** — endpointy sync i import zwracają ID loga synchronizacji w odpowiedzi
- **Obsługa błędów** — w przypadku crashu synchronizacji, log jest oznaczany jako `failed` z komunikatem błędu

### 📝 Kontekst

- Tabela `dvlp_ksefsynclogs` była pusta, ponieważ frontend wywoływał `/api/ksef/sync` (w `ksef-sync.ts`), który nie korzystał z `syncLogService`. Istniejący endpoint `/api/sync` (w `sync.ts`) miał pełne logowanie, ale nie był używany przez UI.

---

## [0.6.3] - 2026-02-08

### ✨ Dodane - Animowane Kafelki Dashboard

- **Nowy komponent `AnimatedKpiCard`** — kafelki KPI z animacjami wejścia i licznikami
- **Biblioteka framer-motion** — płynne animacje wejścia dla kafelków z opóźnieniem staggered (0s, 0.1s, 0.2s, 0.3s)
- **Biblioteka react-countup** — animowane liczniki wartości w kafelkach
- **Wrapper AnimatedCardGrid** — kontener z animacją staggerChildren dla grupy kafelków
- **Helper formatCurrency** — wyeksportowana funkcja formatowania walut PLN

### 🎨 Ulepszenia UI - Dashboard

- **Unifikacja stylistyki kafelków** — identyczne kolory, ikony i format między stroną główną a raportami
- **Kafelki z wartościami finansowymi**:
  - **Wszystkie faktury** — liczba faktur z informacją o dostawcach (ikona: FileText, kolor: #64748b szary)
  - **Suma brutto** — łączna wartość w PLN ze średnią na fakturę (ikona: TrendingUp, kolor: #3b82f6 niebieski)
  - **Opłacone** — kwota opłacona z procentem całości (ikona: CreditCard, kolor: #10b981 zielony)
  - **Do zapłaty** — kwota do zapłaty z procentem całości (ikona: CreditCard, kolor: #ef4444 czerwony)
- **Lewa ramka akcentująca** — kolorowe `border-l-4` na każdym kafelku odpowiadające tematowi
- **Efekty hover** — podniesienie cienia przy najechaniu myszką
- **Ikony z okrągłym tłem** — kolorowe ikony w kółkach dopasowane do kafelka

### 🔧 Zmiany Techniczne

- **Instalacja `framer-motion@^12.33.0`** — biblioteka animacji dla React
- **Instalacja `react-countup@^6.5.3`** — animowane liczniki wartości
- **Nowe klucze tłumaczeń** — dodano 8 kluczy (`allInvoices`, `suppliers`, `totalGross`, `average`, `perInvoice`, `paidAmount`, `pendingAmount`, `ofTotal`) do namespace'u `dashboard` w plikach EN i PL
- **Aktualizacja kalkulacji statystyk** — strona główna oblicza kwoty zamiast liczników (suma brutto, kwota opłacona, kwota do zapłaty)

---

## [0.6.2] - 2026-02-08

### ✨ Dodane - Generator Danych Testowych

- **Nowa zakładka "Dane testowe" w Ustawieniach** — kompleksowy UI do generowania i zarządzania testowymi fakturami
- **Zaawansowane opcje generowania**:
  - Slider liczby faktur (1-100)
  - Slider proporcji źródeł: KSeF vs Ręczne (0-100%)
  - Slider procentu opłaconych faktur (0-100%)
  - Wybór zakresu dat (od-do)
  - Checkbox do czyszczenia istniejących danych przed generowaniem
- **Panel zarządzania danymi testowymi** — podgląd i usuwanie wygenerowanych faktur
- **Backend `ksefPercentage`** — możliwość generowania mixu faktur KSeF i Manual w jednym requestcie
- **Instalacja Radix UI Slider** — komponent `@radix-ui/react-slider@^1.3.6` dla kontrolek procentowych
- **Tłumaczenia EN/PL** — 45+ nowych kluczy tłumaczeń dla funkcji danych testowych

### 🔧 Poprawki - Dane Testowe

- **Naprawiony problem z wieloma firmami o tym samym NIP** — API przyjmuje `companyId` do jednoznacznej identyfikacji firmy
- **Dodane `settingId` do generowanych faktur** — faktury testowe są teraz poprawnie powiązane z firmą i widoczne w aplikacji
- **Walidacja środowiska case-insensitive** — akceptuje "Demo", "DEMO", "demo" etc.
- **Whitelist zamiast blacklist** — API sprawdza czy środowisko to 'test' lub 'demo' (bezpieczniejsze niż blacklist 'production')
- **Polskie komunikaty błędów** — wykrywanie błędów środowiska i pokazywanie przetłumaczonych komunikatów z informacją o wykrytym środowisku
- **Sortowanie faktur po dacie** — mix KSeF/Manual jest automatycznie sortowany chronologicznie

### 🎨 Ulepszenia UI

- **Wyrównanie ikon w kolumnach tabeli faktur** — ikony "Dokumenty" i "Akcje" mają stałe pozycje (3 sloty każda kolumna)
- **Eliminacja przeskakiwania wierszy** — placeholder dla nieobecnych ikon zapewnia spójny layout
- **Lepsza czytelność** — każdy typ ikony (dokument, załącznik, notatka, płatność, podgląd, usuń) zawsze w tym samym miejscu

---

## [0.6.1] - 2026-02-08

### 🔧 Poprawki - Deployment i Autentykacja

- **Naprawiony token issuer mismatch** — API middleware akceptuje zarówno tokeny v1.0 (`sts.windows.net`) jak i v2.0 (`login.microsoftonline.com`)
- **Dodane uprawnienia Key Vault** — nadano rolę "Key Vault Secrets User" dla managed identity Function App oraz service principal aplikacji
- **Skonfigurowane zmienne środowiskowe**:
  - Web App: dodano wszystkie `NEXT_PUBLIC_*` (CLIENT_ID, TENANT_ID, API_SCOPE, ADMIN_GROUP, USER_GROUP)
  - Function App: dodano `ADMIN_GROUP_ID`, `USER_GROUP_ID`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_KEYVAULT_URL`
- **Naprawiony problem z pamięcią Function App** — usunięto folder `.ignored` z devDependencies (redukcja z 1.17GB do 137MB)
- **Deployment zoptymalizowany** — paczka deployment zmniejszona o 92% (602MB → 137MB)

### 🔒 Bezpieczeństwo

- Funkcje API sprawdzają przynależność użytkownika do grup zabezpieczeń (Admin/User) przed wykonaniem operacji
- Key Vault RBAC poprawnie skonfigurowany dla odczytu sekretów KSeF token
- Autentykacja działa end-to-end: frontend → MSAL → Bearer token → API validation → Key Vault access

---

## [0.6.0] - 2026-02-08

### 🚀 Wdrożenie - Azure App Service

- **Deployment web przez VS Code** - konfiguracja identyczna jak planner (Oryx build na serwerze)
- **Usunięte podejście local build** - pozbycie się 654 MB artefaktu `.deploy/` z node_modules
- **Konfiguracja Azure App Service**:
  - Startup command: `node node_modules/next/dist/bin/next start -p 8080`
  - Oryx remote build z `npm install` + `npm run build`
  - `SCM_COMMAND_IDLE_TIMEOUT=3600` dla dłuższego buildu na B1
- **Usunięte zbędne artefakty**: `.deployment`, `.deploy/`, nadmiarowe ustawienia Azure

### 🔒 Poprawione - Autentykacja API

- **Dodany `NEXT_PUBLIC_API_SCOPE`** w `.env.production` — frontend teraz pobiera access token MSAL dla API
- **Skonfigurowany "Expose an API"** w Entra ID — Application ID URI + scope `access_as_user`
- **Poprawiona walidacja audience w middleware** — akceptuje zarówno `<client-id>` jak i `api://<client-id>`
- **Naprawione 401 Unauthorized** — requesty z frontu teraz zawierają nagłówek `Authorization: Bearer <token>`

### 🔧 Zmiany

- Usunięte dane mockowe z Settings page (Developico Sp. z o.o., Test Company S.A.)
- Fallback na pustą tablicę `[]` zamiast mockowych firm gdy API nie odpowiada
- `package.json` script `start` zmieniony z `node server.js` na `next start`
- Dodane flagi buildu w `next.config.mjs`: `eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors`, `images.unoptimized`

---

## [0.5.1] - 2026-01-31

### 🔧 Zmiany - Modularyzacja promptów AI

- **Wydzielone prompty do osobnych plików** - prompty AI przeniesione z kodu TypeScript do edytowalnych plików Markdown
- **Nowa struktura `api/src/lib/prompts/`**:
  - `categorization.prompt.md` - kategoryzacja faktur (MPK, kategoria)
  - `vision-extraction.prompt.md` - ekstrakcja danych z obrazów faktur (GPT-4o Vision)
  - `pdf-text-extraction.prompt.md` - ekstrakcja danych z PDF tekstowych
  - `index.ts` - loader promptów z cache i systemem placeholderów `{{zmienna}}`
- **Funkcje loadera**:
  - `loadPrompt(name)` - ładowanie szablonu z pliku
  - `fillPromptTemplate(template, vars)` - podstawianie zmiennych
  - `preloadPrompts()` - pre-cache przy starcie aplikacji
- **Korzyści**: łatwiejsza edycja promptów bez modyfikacji kodu, lepsze wersjonowanie, możliwość A/B testów

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
- **Podpis "Cost analysis"** w nagłówku aplikacji pod tytułem "KSeF Copilot"
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

*Projekt rozwijany przez [Developico](https://developico.com) na licencji MIT.*
