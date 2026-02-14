# GUS REGON API (BIR1) — Raport integracji

## 1. O usłudze GUS BIR1

**Baza Internetowa REGON 1 (BIR1)** to darmowa usługa sieciowa udostępniana przez Główny Urząd Statystyczny (GUS) poprzez protokół **SOAP 1.2**. Umożliwia przeszukiwanie rejestru REGON i pobieranie danych o podmiotach gospodarczych.

### Endpointy

| Środowisko | URL | Klucz API |
|------------|-----|-----------|
| **Test** | `https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/wsBIR.svc` | `abcde12345abcde12345` (publiczny) |
| **Produkcja** | `https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc` | Wymagana rejestracja na [api.stat.gov.pl](https://api.stat.gov.pl/Home/RegonApi) |

### Kryteria wyszukiwania (oficjalne)
- **NIP** — Numer Identyfikacji Podatkowej (10 cyfr)
- **REGON** — numer REGON (9 lub 14 cyfr)
- **KRS** — numer KRS (10 cyfr)
- **Nazwy** — wyszukiwanie po nazwie firmy (zwraca max 100 wyników)

### Operacje SOAP
| Operacja | Opis |
|----------|------|
| `Zaloguj` | Logowanie — zwraca `sessionId` (ważny 60 min) |
| `Wyloguj` | Wylogowanie sesji |
| `DaneSzukajPodmioty` | Wyszukiwanie podmiotów po NIP/REGON/KRS/Nazwie |
| `DaneSzczegoloweRaport` / `DanePobierzPelnyRaport` | Pobranie szczegółowego raportu o podmiocie |
| `GetValue` | Diagnostyka (status sesji, kod błędu, stan danych) |

### Kody błędów
| Kod | Opis |
|-----|------|
| `0` | Brak błędów |
| `1` | Sesja wygasła |
| `2` | Niepoprawny identyfikator sesji |
| `4` | Nie znaleziono podmiotu |
| `5` | Zbyt wiele wyników (max 100) |
| `7` | Błąd wewnętrzny usługi |

### Typy raportów szczegółowych (najważniejsze)
| Raport | Typ podmiotu |
|--------|-------------|
| `BIR11OsFizycznaDaneOgolne` | Osoba fizyczna — dane ogólne |
| `BIR11OsFizycznaDzialalnoscCeidg` | Osoba fizyczna — działalność CEIDG |
| `BIR11OsFizycznaPkd` | Osoba fizyczna — kody PKD |
| `BIR11OsPrawna` | Osoba prawna — pełne dane |
| `BIR11OsPrawnaPkd` | Osoba prawna — kody PKD |
| `BIR11JednLokalnaOsFizycznej` | Jednostka lokalna os. fizycznej |
| `BIR11JednLokalnaOsPrawnej` | Jednostka lokalna os. prawnej |
| `BIR11TypPodmiotu` | Typ podmiotu |

### Uwaga dot. środowiska testowego
Baza testowa zawiera **stare i zanonimizowane dane**. Nie odzwierciedla aktualnego stanu rejestru REGON. Nadaje się wyłącznie do testowania integracji (weryfikacja formatu odpowiedzi, flow logowania, obsługa błędów), ale **nie do weryfikacji prawdziwych danych firm**.

---

## 2. Obecna implementacja w projekcie

### 2.1 Pliki w projekcie

| # | Plik | Projekt | Rola |
|---|------|---------|------|
| 1 | `api/src/lib/gus/types.ts` | API | Definicje typów (167 linii) |
| 2 | `api/src/lib/gus/client.ts` | API | **Własny klient SOAP** (510 linii) |
| 3 | `api/src/lib/gus/index.ts` | API | Barrel export |
| 4 | `api/src/functions/gus.ts` | API | 3 Azure Functions HTTP triggers (298 linii) |
| 5 | `web/src/hooks/use-gus-lookup.ts` | Web | 3 hooki React (501 linii) |
| 6 | `web/src/components/invoices/supplier-lookup-dialog.tsx` | Web | Dialog wyszukiwania (GUS **wyłączony**) |
| 7 | `code-app/src/hooks/use-api.ts` | Code-App | 3 hooki (linie 764–798) |
| 8 | `code-app/src/components/invoices/gus-lookup-dialog.tsx` | Code-App | Dialog GUS (141 linii) |
| 9 | `code-app/src/components/invoices/supplier-lookup-dialog.tsx` | Code-App | Pełny dialog z zakładkami (GUS **włączony**) |
| 10 | `code-app/src/lib/nip-utils.ts` | Code-App | Walidacja NIP |

### 2.2 Architektura backendu

Backend (`api/src/lib/gus/client.ts`) to **ręcznie napisany klient SOAP** który:
- Buduje koperty SOAP ręcznie (template string)
- Parsuje XML odpowiedzi za pomocą **regex** (nie XML parser)
- Obsługuje MTOM/XOP multipart responses (regex extraction)
- Zarządza sesją (cache 55 min, auto-login)
- Implementuje 3 operacje: `lookupByNip`, `searchByCompanyName`, `validateNip`

### 2.3 Azure Functions (endpointy)

| Route | Metoda | Funkcja | Auth |
|-------|--------|---------|------|
| `POST /api/gus/lookup` | POST | NIP lookup + szczegółowy raport | Bearer + AD role "Reader" |
| `POST /api/gus/search` | POST | Szukanie po nazwie/NIP | Bearer + AD role "Reader" |
| `GET /api/gus/validate/{nip}` | GET | Walidacja sumy kontrolnej NIP | Brak (anonymous) |

### 2.4 Status konfiguracji

| Ustawienie | Status |
|------------|--------|
| `GUS_API_KEY` | **❌ Nie skonfigurowany** w `local.settings.json` |
| `GUS_API_URL` | **❌ Nie skonfigurowany** — domyślnie endpoint testowy |
| Klucz produkcyjny | **❌ Nie uzyskany** z api.stat.gov.pl |

---

## 3. Zidentyfikowane problemy

### 🔴 Krytyczne

1. **Literówki w nazwach raportów** — powodują błędy 500 przy pobieraniu danych szczegółowych:
   - `BIR11OsFizycznaDzwordzewna` — **nie istnieje** w API GUS (poprawnie powinno być np. `BIR11OsFizycznaDzialalnoscCeidg` lub specyficzny raport w zależności od kontekstu)
   - `BIR11JednijstkiLokalne` — **nie istnieje** (poprawnie: `BIR11JednLokalnaOsPrawnej` lub `BIR11JednLokalnaOsFizycznej`)

2. **Parsowanie XML regex-ami** — kruche, podatne na edge case'y (CDATA, namespace prefixes, self-closing tags, wielolinijkowe wartości). Prawdopodobna przyczyna problemów produkcyjnych.

3. **GUS search wyłączony w web** — komentarz w `supplier-lookup-dialog.tsx`: `{/* Recent suppliers only - GUS search disabled */}`. Zakładka GUS nie jest renderowana.

### 🟡 Istotne

4. **Brak testów** — zero testów dla całej funkcjonalności GUS (backend i frontend)

5. **Brak konfiguracji produkcyjnej** — `GUS_API_KEY` nie ustawiony, działa tylko na testowym środowisku ze starymi danymi

6. **Duplikacja kodu walidacji NIP** — ten sam algorytm mod-11 istnieje w 4 odrębnych miejscach (backend client.ts, web use-gus-lookup.ts, code-app nip-utils.ts, code-app gus-lookup-dialog.tsx)

7. **Cache sesji w zmiennej globalnej** — `cachedSession` jest zmienną modułową. W Azure Functions to może powodować problemy przy cold starts i skalowaniu

### 🟢 Co działa dobrze

- Poprawna struktura Azure Functions z Zod walidacją
- Flow logowania/sesji jest koncepcyjnie poprawny
- Smart search (automatyczne przekierowanie NIP→lookup w search handler)
- Typy TypeScript są spójne między projektami
- Algorytm walidacji sumy kontrolnej NIP jest poprawny

---

## 4. Gotowa biblioteka: `bir1` (npm)

### Opis

Pakiet [`bir1`](https://www.npmjs.com/package/bir1) (v4.1.0) to dojrzały klient TypeScript dla GUS BIR1:

| Cecha | Wartość |
|-------|--------|
| Ostatnia wersja | 4.1.0 (luty 2025) |
| Pobrania/tydzień | ~1,300 |
| Licencja | MIT |
| TypeScript | Natywny (pisany w TS) |
| Moduł | Pure ESM |
| Zależności | 2 |
| Rozmiar | 33.8 kB |

### Funkcje
```typescript
import Bir from 'bir1'
import { modern } from 'bir1/normalize'

const bir = new Bir({ normalizeFn: modern }) // test env (brak klucza)
// lub:
const birProd = new Bir({ key: 'TWOJ_KLUCZ', normalizeFn: modern }) // produkcja

// Wyszukiwanie po NIP
await bir.search({ nip: '5261040567' })

// Wyszukiwanie po REGON  
await bir.search({ regon: '012100784' })

// Wyszukiwanie po KRS
await bir.search({ krs: '0000022784' })

// Szczegółowy raport
await bir.report({ regon: '012100784', report: 'BIR11OsPrawna' })

// Diagnostyka
await bir.value('KomunikatKod')
```

### Zalety vs. obecna implementacja
| Aspekt | Obecny custom client | Biblioteka `bir1` |
|--------|---------------------|-------------------|
| Parsowanie SOAP/XML | Regex (kruche) | Własny parser (testowany) |
| MTOM/XOP | Regex extraction | Obsługiwane natywnie |
| Sesja | Manual cache + refresh | Automatyczne zarządzanie |
| Logowanie | Ręczne (Zaloguj/Wyloguj) | Auto-login (od v3.0) |
| Normalizacja danych | Ręczne mapowanie pól | Wbudowane funkcje `modern`/`legacy` |
| Typy raportów | Hardcoded z literówkami | Pełna lista z dokumentację |
| Błędy w nazwach raportów | ✅ TAK (2 literówki) | ❌ NIE |
| Linii kodu | ~510 (tylko client) | 0 (biblioteka) |
| Utrzymanie | Na nas | Autor (aktywny) |
| Testy | Brak | Własne testy biblioteki |

### Ograniczenia `bir1`
| Ograniczenie | Wpływ | Rozwiązanie |
|-------------|-------|-------------|
| **Brak wyszukiwania po nazwie** — `search()` obsługuje tylko `nip`, `regon`, `krs` | Nie zaimplementujemy szukania po nazwie firmy z marszu | Opcja A: Rozszerzyć `bir1` (PR do autora) / Opcja B: Dodać wrapper SOAP tylko dla `Nazwy` / Opcja C: Ominąć — na początek NIP/REGON/KRS wystarczą |
| Pure ESM module | Może wymagać `"type": "module"` w package.json lub dynamicznego importu | Azure Functions v4 Node 18+ obsługuje ESM |

---

## 5. Plan działania

### Faza 1: Dry-run test API (bez UI)

**Cel:** Przetestować działanie GUS BIR1 API w izolacji, zweryfikować connectivity, formaty danych, obsługę błędów.

#### Krok 1.1 — Skrypt testowy standalone
Stworzyć prosty skrypt Node.js (nie związany z Azure Functions), który:
- [ ] Zainstaluje `bir1` jako zależność
- [ ] Przetestuje logowanie do środowiska testowego (bez klucza)
- [ ] Wykona `search({ nip: '...' })` z kilkoma testowymi NIP-ami
- [ ] Wykona `report()` z poprawnymi nazwami raportów
- [ ] Zaloguje strukturę odpowiedzi i zweryfikuje format danych
- [ ] Przetestuje obsługę błędów (nieistniejący NIP, nieprawidłowy format)

#### Krok 1.2 — Porównanie z custom clientem
- [ ] Wywołać te same operacje obecnym custom clientem
- [ ] Porównać wyniki (format, kompletność danych, obsługa edge cases)
- [ ] Zidentyfikować przypadki, gdzie custom client zawodzi (literówki w raportach, MTOM parsing)

#### Krok 1.3 — Test wyszukiwania po nazwie
- [ ] Przetestować operację `DaneSzukajPodmioty` z parametrem `<Nazwy>` ręcznie (SOAP request)
- [ ] Ocenić czy warto implementować wrapper na `Nazwy` czy wystarczy NIP/REGON/KRS
- [ ] Sprawdzić jakość wyników (testy środowiska testowego mogą zwracać zanonimizowane dane)

### Faza 2: Refactoring backendu

#### Krok 2.1 — Zamiana custom clienta na `bir1`
- [ ] Zainstalować `bir1` w `api/`
- [ ] Przepisać `client.ts` używając biblioteki `bir1`
- [ ] Zachować istniejące interfejsy (`GusCompanyData`, `GusLookupResult`, itd.)
- [ ] Obsłużyć normalizację danych (`modern` normalizer)
- [ ] Dodać obsługę wyszukiwania po nazwie (wrapper SOAP lub rozszerzenie)

#### Krok 2.2 — Naprawienie raportów
- [ ] Poprawić logikę `getReportType()` z poprawnymi nazwami raportów
- [ ] Dodać obsługę różnych typów osób fizycznych (CEIDG, rolnicza, pozostała)
- [ ] Dodać obsługę jednostek lokalnych (inna logika niż zwykły podmiot)

#### Krok 2.3 — Testy
- [ ] Testy jednostkowe z mockowanymi odpowiedziami SOAP
- [ ] Testy integracyjne (opcjonalne, z prawdziwym API testowym)
- [ ] Testy walidacji NIP
- [ ] Testy Azure Functions (request/response)

### Faza 3: Konfiguracja produkcyjna

- [ ] Rejestracja na api.stat.gov.pl i uzyskanie klucza produkcyjnego
- [ ] Konfiguracja `GUS_API_KEY` w Azure Key Vault
- [ ] Dodanie zmiennych środowiskowych do `local.settings.json` (development)
- [ ] Konfiguracja w App Settings Azure Functions (production)

### Faza 4: Podłączenie UI (po weryfikacji)

- [ ] Włączenie zakładki GUS w `supplier-lookup-dialog.tsx` (web)
- [ ] Weryfikacja działania dialogów GUS w code-app
- [ ] Testy E2E

---

## 6. Rekomendacje

### Podejście rekomendowane: Hybrydowe

1. **Użyć `bir1`** jako głównego klienta dla operacji `search` (NIP/REGON/KRS) i `report` (raporty szczegółowe)
2. **Dodać prosty wrapper SOAP** tylko dla wyszukiwania po nazwie (`Nazwy`) — albo wykorzystać istniejący kod z `searchByName()` w client.ts  
3. **Zachować istniejące interfejsy TypeScript** — typy `GusCompanyData`, `GusLookupResult`, `GusSearchResult` są dobrze zaprojektowane
4. **Nie ruszać Azure Functions** — endpointy i walidacja Zod są poprawne, zmieni się tylko warstwa klienta

### Kolejność priorytetów
1. 🏁 **Najpierw dry-run** — skrypt testowy weryfikujący działanie API
2. 🔧 **Potem refactoring** — zamiana custom clienta na `bir1`  
3. ✅ **Potem testy** — unit + integration
4. 🔑 **Potem klucz produkcyjny** — rejestracja na api.stat.gov.pl
5. 🖥️ **Na końcu UI** — dopiero po potwierdzeniu działania

---

## 7. Szacowanie czasowe

| Faza | Estymacja |
|------|-----------|
| Faza 1: Dry-run test | 1-2h |
| Faza 2: Refactoring backendu | 3-4h |
| Faza 3: Konfiguracja produkcyjna | wymaga rejestracji (czas oczekiwania na klucz) |
| Faza 4: UI integration | 1-2h |
| **Łącznie (bez czekania na klucz)** | **5-8h** |

---

---

## 8. Wyniki Dry-Run (2026-02-14)

### Test 1: Pakiet `bir1` — SUKCES

Pakiet `bir1` działa out-of-the-box na środowisku testowym (bez klucza API).

#### Wyszukiwanie po NIP ✅
```
search({ nip: '5261040567' })
→ T-MOBILE POLSKA SPÓŁKA AKCYJNA, MAZOWIECKIE, Warszawa, 02-674, Typ: P
```

#### Wyszukiwanie po REGON ✅
```
search({ regon: '012100784' })
→ ORANGE POLSKA SPÓŁKA AKCYJNA, MAZOWIECKIE, Warszawa, 02-326, Typ: P
```

#### Wyszukiwanie po KRS ✅
```
search({ krs: '0000022784' })
→ LASER SERVICES POLSKA SPÓŁKA AKCYJNA, MAZOWIECKIE, Warszawa, 02-676
```

#### Raport szczegółowy (BIR11OsPrawna) ✅
```
report({ regon: '011417295', report: 'BIR11OsPrawna' })
→ Pełne dane: NIP, REGON, nazwa, adres, telefon, fax, forma prawna,
   forma własności, organ rejestrowy, data powstania, data wpisu do REGON, itd.
```

Normalizacja `modern` działa poprawnie — klucze w camelCase, prefiksy (`praw_`, `fiz_`) usunięte, puste wartości = `undefined`.

#### Diagnostyka ✅
```
StanDanych: 19-10-2018  ← baza testowa z 2018 roku
StatusSesji: 1 (aktywna)
StatusUslugi: 1 (dostępna)
```

### Test 2: Custom SOAP client — AWARIA

Obecny custom client (`api/src/lib/gus/client.ts`) **nie działa** — zwraca **404 Not Found** na wszystkich operacjach.

**Przyczyna:** Endpoint testowy jest nieprawidłowy.
- Custom client: `https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/wsBIR.svc` → **404**
- Poprawny URL: `https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc` → **200**

Ścieżka `/wsBIR/wsBIR.svc` nie istnieje — URL w dokumentacji/WSDL zmienił się od czasu implementacji.

Dodatkowo: `validateNip('0000000000')` zwraca `true` (false positive — suma kontrolna 0%11=0 pokrywa się z cyfrą kontrolną 0).

### Test 3: Wyszukiwanie po nazwie (Nazwy) — NIE DZIAŁA NA TEŚCIE

Przetestowano **6 różnych formatów SOAP** z parametrem `<Nazwy>` (różne namespace'y) — **wszystkie zwracają pusty wynik**.

```
DaneSzukajPodmiotyResult → <DaneSzukajPodmiotyResult/>  (empty, self-closing)
KomunikatKod → (empty)  — brak kodu błędu
```

**Interpretacja:**
- API akceptuje request (HTTP 200, brak faultu), ale nie zwraca danych
- Baza testowa prawdopodobnie **nie obsługuje wyszukiwania po nazwie** (nie ma indeksu nazw)
- Oficjalna dokumentacja GUS wymienia tylko: NIP, REGON, KRS jako kryteria
- Wyszukiwanie po nazwie może wymagać klucza produkcyjnego lub nie jest dostępne

**Wniosek:** Na tym etapie rezygnujemy z wyszukiwania po nazwie. NIP/REGON/KRS pokrywa nasze potrzeby — dostawca zawsze ma znany NIP.

### Podsumowanie Dry-Run

| Funkcja | `bir1` | Custom client | Raw SOAP |
|---------|--------|---------------|----------|
| Login/sesja | ✅ auto | ❌ 404 (zły URL) | ✅ |
| Search by NIP | ✅ | ❌ 404 | ✅ |
| Search by REGON | ✅ | N/A | N/A |
| Search by KRS | ✅ | N/A | N/A |
| Search by name | N/A (nie obsługuje) | ❌ 404 | ⚠️ empty result |
| Detailed report | ✅ | ❌ 404 | N/A |
| NIP validation | N/A | ✅ (ale 0000000000 bug) | N/A |
| Logout | ✅ | N/A | ✅ |

**Decyzja: Zastąpić custom client pakietem `bir1`.**

---

## 9. Biała Lista VAT — API Wykazu Podatników VAT

### 9.1 O usłudze

**Biała Lista VAT** (White List) to darmowe REST/JSON API udostępniane przez Krajową Administrację Skarbową (KAS). Umożliwia sprawdzanie danych podatników VAT — bez rejestracji i klucza API.

| Cecha | Biała Lista VAT | GUS BIR1 |
|-------|----------------|----------|
| **Protokół** | REST/JSON | SOAP 1.2 |
| **Klucz API** | Nie wymaga | Wymaga rejestracji |
| **Dane** | Produkcyjne, aktualne | Test: zanonimizowane z 2018 |
| **Status VAT** | ✅ Czynny/Zwolniony/Niezarejestrowany | ❌ |
| **Konta bankowe** | ✅ pełna lista | ❌ |
| **Adres** | ✅ aktualny | ✅ (produkcja) / zanonimizowany (test) |
| **PKD** | ❌ | ✅ |
| **Forma prawna** | ❌ | ✅ |
| **Wyszukiwanie po nazwie** | ❌ | ⚠️ nie działa na test |
| **KRS** | ✅ | ✅ |
| **REGON** | ✅ | ✅ |
| **Limity** | 100 search/dzień, 5000 check/dzień | Brak info |

### 9.2 Endpointy

| Środowisko | URL |
|------------|-----|
| **Produkcja** | `https://wl-api.mf.gov.pl` |
| **Test** | `https://wl-test.mf.gov.pl` |

### 9.3 Metody API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| `GET` | `/api/search/nip/{nip}?date=YYYY-MM-DD` | Szukaj po NIP |
| `GET` | `/api/search/nips/{nips}?date=YYYY-MM-DD` | Szukaj po wielu NIP (max 30, przecinek) |
| `GET` | `/api/search/regon/{regon}?date=YYYY-MM-DD` | Szukaj po REGON |
| `GET` | `/api/search/regons/{regons}?date=YYYY-MM-DD` | Szukaj po wielu REGON |
| `GET` | `/api/search/bank-account/{account}?date=YYYY-MM-DD` | Szukaj po numerze konta |
| `GET` | `/api/check/nip/{nip}/bank-account/{account}?date=YYYY-MM-DD` | Weryfikuj parę NIP+konto |
| `GET` | `/api/check/regon/{regon}/bank-account/{account}?date=YYYY-MM-DD` | Weryfikuj parę REGON+konto |

### 9.4 Struktura odpowiedzi (Entity)

```json
{
  "name": "ŁUKASZ FALACIŃSKI",
  "nip": "1181753234",
  "regon": "140907349",
  "krs": null,
  "statusVat": "Czynny",
  "residenceAddress": "CEDROWA 11, 05-152 DĘBINA",
  "workingAddress": null,
  "accountNumbers": ["23114020040000300246113199"],
  "hasVirtualAccounts": false,
  "registrationLegalDate": "2007-03-30",
  "representatives": [],
  "authorizedClerks": [],
  "partners": []
}
```

### 9.5 Dry-run produkcyjny (2026-02-14)

| Test | Wynik |
|------|-------|
| NIP 1181753234 (DG Łukasz Falaciński) | ✅ Found, Czynny, 1 konto bankowe |
| NIP 5261040567 (T-Mobile) | ✅ Found, Czynny, 88 kont bankowych |
| REGON 140907349 | ✅ Found, Czynny |

**Decyzja: Migracja z GUS BIR1 na Biała Lista VAT.**

---

## 10. Plan wdrożenia — Biała Lista VAT

### Zakres zmian

Migracja obejmuje **25 plików** w 3 warstwach projektu. Plan podzielony na 4 fazy.

### Inwentaryzacja plików do zmiany

#### API (backend — Azure Functions)
| # | Plik | Akcja | Opis |
|---|------|-------|------|
| 1 | `api/src/lib/gus/client.ts` (510 linii) | **USUNĄĆ** | Custom SOAP client — zastąpi go nowy REST client |
| 2 | `api/src/lib/gus/types.ts` (167 linii) | **USUNĄĆ** | Stare typy GUS — nowe typy WL |
| 3 | `api/src/lib/gus/index.ts` (7 linii) | **USUNĄĆ** | Barrel export — nowy barrel |
| 4 | `api/src/functions/gus.ts` (298 linii) | **PRZEPISAĆ** | 3 endpointy — nowe routes `/api/vat/*` |
| 5 | `api/package.json` | **EDYCJA** | Usunąć zależność `bir1` (nie potrzebna) |

#### Web (Next.js)
| # | Plik | Akcja | Opis |
|---|------|-------|------|
| 6 | `web/src/lib/api.ts` | **EDYCJA** | Zmienić `api.gus.*` → `api.vat.*`, nowe typy |
| 7 | `web/src/hooks/use-gus-lookup.ts` (501 linii) | **PRZEPISAĆ** | Nowe hooki: `useVatLookup()`, `useRecentSuppliers()` |
| 8 | `web/src/components/invoices/supplier-lookup-dialog.tsx` | **PRZEPISAĆ** | Odblokować wyszukiwanie, nowy UI |
| 9 | `web/src/messages/en.json` | **EDYCJA** | Zaktualizować klucze i18n |
| 10 | `web/src/messages/pl.json` | **EDYCJA** | j.w. |

#### Code-App (PCF / Power Apps)
| # | Plik | Akcja | Opis |
|---|------|-------|------|
| 11 | `code-app/src/lib/types.ts` | **EDYCJA** | Nowe interfejsy VAT zamiast GUS |
| 12 | `code-app/src/lib/api.ts` | **EDYCJA** | `api.gus.*` → `api.vat.*` |
| 13 | `code-app/src/lib/query-keys.ts` | **EDYCJA** | Nowe query keys |
| 14 | `code-app/src/lib/nip-utils.ts` (56 linii) | **ZACHOWAĆ** | Walidacja NIP — reuse |
| 15 | `code-app/src/hooks/use-api.ts` | **EDYCJA** | Nowe hooki VAT |
| 16 | `code-app/src/components/invoices/gus-lookup-dialog.tsx` (165 linii) | **USUNĄĆ** | Zastąpi go zaktualizowany supplier-lookup-dialog |
| 17 | `code-app/src/components/invoices/supplier-lookup-dialog.tsx` (468 linii) | **PRZEPISAĆ** | Nowy UI z danymi VAT |

#### Testy
| # | Plik | Akcja | Opis |
|---|------|-------|------|
| 18 | `code-app/src/__tests__/invoice-phase2.test.tsx` | **ZAKTUALIZOWAĆ** | Zmienić mocki i oczekiwania GUS → VAT |
| 19 | `code-app/src/__tests__/invoice-edit-phase6.test.tsx` | **ZAKTUALIZOWAĆ** | j.w. |
| 20 | `code-app/src/__tests__/hooks.test.tsx` | **ZAKTUALIZOWAĆ** | j.w. |
| 21 | `code-app/src/__tests__/api.test.ts` | **ZAKTUALIZOWAĆ** | j.w. |

#### Skrypty i dokumentacja (do usunięcia)
| # | Plik | Akcja |
|---|------|-------|
| 22 | `api/scripts/gus-dry-run.ts` | USUNĄĆ |
| 23 | `api/scripts/gus-name-search-test.ts` | USUNĄĆ |
| 24 | `api/scripts/gus-debug-namespaces.ts` | USUNĄĆ |
| 25 | `api/scripts/gus-debug-error.ts` | USUNĄĆ |
| 26 | `api/scripts/gus-nip-test.ts` | USUNĄĆ |
| 27 | `api/scripts/wl-vat-test.ts` | ZACHOWAĆ (referencja) |

---

### FAZA 1: Nowy backend client + endpointy API

**Cel:** Zastąpić GUS SOAP client prostym REST clientem do Białej Listy VAT.

**Nowe pliki:**

1. **`api/src/lib/vat/types.ts`** — Nowe interfejsy TypeScript
   ```typescript
   // Podmiot z Białej Listy VAT
   export interface VatSubject {
     name: string
     nip: string
     regon: string
     krs: string | null
     pesel: string | null
     statusVat: 'Czynny' | 'Zwolniony' | 'Niezarejestrowany' | string
     residenceAddress: string | null
     workingAddress: string | null
     accountNumbers: string[]
     hasVirtualAccounts: boolean
     registrationLegalDate: string | null
     registrationDenialDate: string | null
     restorationDate: string | null
     removalDate: string | null
     representatives: VatPerson[]
     authorizedClerks: VatPerson[]
     partners: VatPerson[]
   }
   
   export interface VatPerson {
     firstName: string
     lastName: string
     nip: string
     companyName: string
   }
   
   // Odpowiedzi API
   export interface VatLookupResponse {
     success: boolean
     data?: VatSubject
     requestId?: string
     requestDateTime?: string
     error?: string
   }
   
   export interface VatValidateResponse {
     valid: boolean
     nip: string
     error?: string
   }
   
   // Do weryfikacji konta bankowego (check endpoint)
   export interface VatCheckResponse {
     accountAssigned: 'TAK' | 'NIE'
     requestId: string
     requestDateTime: string
   }
   ```

2. **`api/src/lib/vat/client.ts`** — Prosty REST client (~80 linii vs 510 SOAP)
   ```typescript
   const WL_API_URL = process.env.WL_API_URL || 'https://wl-api.mf.gov.pl'
   
   export async function lookupByNip(nip: string): Promise<VatLookupResponse>
   export async function lookupByRegon(regon: string): Promise<VatLookupResponse>
   export async function checkBankAccount(nip: string, account: string): Promise<VatCheckResponse>
   export function validateNip(nip: string): boolean
   ```

3. **`api/src/lib/vat/index.ts`** — Barrel export

4. **`api/src/functions/vat.ts`** — Nowe endpointy Azure Functions
   | Route | Metoda | Opis | Auth |
   |-------|--------|------|------|
   | `POST /api/vat/lookup` | lookup | Szukaj po NIP lub REGON | Bearer + AD Reader |
   | `GET /api/vat/validate/{nip}` | validate | Walidacja NIP (lokalna) | Anonymous |
   | `POST /api/vat/check-account` | check | Weryfikuj NIP + konto bankowe | Bearer + AD Reader |

   Endpoint `/api/vat/lookup` przyjmuje body:
   ```typescript
   // Jeden z dwóch parametrów musi być podany
   { nip: string }       // szukaj po NIP (10 cyfr)
   { regon: string }     // szukaj po REGON (9 lub 14 cyfr)
   ```

**Usunięte pliki:**
- `api/src/lib/gus/` — cały katalog (3 pliki, 684 linii)
- `api/src/functions/gus.ts` (298 linii)
- `bir1` z dependencies

**Uwaga:** Endpoint `/api/gus/search` (wyszukiwanie po nazwie) **nie ma odpowiednika** w WL API.

### Możliwości wyszukiwania — API vs UI

| Kryterium | WL API | Obecne GUS UI (code-app) | Obecne GUS UI (web) | **Nowe UI (oba)** |
|-----------|--------|--------------------------|---------------------|-------------------|
| NIP | ✅ `/api/search/nip/{nip}` | ✅ auto-lookup po 10 cyfrach | ❌ wyłączone | ✅ |
| REGON | ✅ `/api/search/regon/{regon}` | ❌ | ❌ | ✅ |
| Nr konta bankowego | ✅ `/api/search/bank-account/{account}` | ❌ | ❌ | ❌ (nie potrzebne w supplier lookup) |
| Nazwa firmy | ❌ brak w API | ✅ (ale nie działało w GUS test) | ❌ wyłączone | ❌ — **tylko po recent suppliers** |
| Weryfikacja NIP+konto | ✅ `/api/check/nip/{nip}/bank-account/{account}` | ❌ | ❌ | ⏳ (przyszła faza) |
| Batch NIP (do 30) | ✅ `/api/search/nips/{nips}` | ❌ | ❌ | ❌ (nie potrzebne w UI) |
| Recent suppliers | ✅ (z Dataverse) | ✅ tab "Recent" | ✅ tab "Recent" | ✅ |

---

### FAZA 2: Aktualizacja code-app (PCF)

**Cel:** Podłączyć code-app do nowych endpointów VAT. Zmienić UI wyszukiwania.

#### Zmiany backend-facing:

1. **`code-app/src/lib/types.ts`** — Usunąć `GusCompanyData`, `GusLookupResponse`, `GusSearchResult`, `GusSearchResponse`, `GusValidateResponse`. Dodać nowe typy `VatSubject`, `VatLookupResponse` itd.

2. **`code-app/src/lib/api.ts`** — Zmienić:
   ```typescript
   // BYŁO:
   gus: {
     lookup: (nip) => post('/api/gus/lookup', { nip }),
     search: (query, type) => post('/api/gus/search', { query, type }),
     validate: (nip) => get(`/api/gus/validate/${nip}`),
   }
   // BĘDZIE:
   vat: {
     lookup: (nip) => post('/api/vat/lookup', { nip }),
     validate: (nip) => get(`/api/vat/validate/${nip}`),
     checkAccount: (nip, account) => post('/api/vat/check-account', { nip, account }),
   }
   ```

3. **`code-app/src/lib/query-keys.ts`** — Zmienić `gusLookup` → `vatLookup` itd.

4. **`code-app/src/hooks/use-api.ts`** — Zmienić hooki:
   - `useGusLookup()` → `useVatLookup()` — zwraca pełne dane VAT (VatSubject)
   - `useGusSearch()` → **USUNĄĆ** (nie ma wyszukiwania po nazwie w WL API)
   - `useGusValidate()` → `useVatValidate()`
   - `useRecentSuppliers()` → bez zmian

5. **`code-app/src/components/invoices/gus-lookup-dialog.tsx`** — **USUNĄĆ** (scalone z supplier-lookup-dialog)

#### Zmiany UI — `supplier-lookup-dialog.tsx` (code-app):

**Obecne zachowanie (GUS):**
- Jedno pole input
- Wpisanie 10 cyfr → auto-lookup NIP przez GUS
- Wpisanie 3+ znaków tekstu → wyszukiwanie po nazwie firmy (GUS search)
- Tab "Recent" z historią dostawców

**Nowe zachowanie (VAT):**
- Jedno pole input z placeholderem: _"Wpisz NIP (10 cyfr) lub REGON (9/14 cyfr)..."_
- Wpisanie **10 cyfr** → rozpoznaj jako NIP:
  - Walidacja sumy kontrolnej NIP (lokalna)
  - Jeśli OK → `POST /api/vat/lookup` z NIP
  - Wyświetl kartę wynikową z danymi VAT
- Wpisanie **9 lub 14 cyfr** → rozpoznaj jako REGON:
  - `POST /api/vat/lookup` z REGON (nowy param w endpoincie)
  - Wyświetl kartę wynikową
- Wpisanie **tekstu** (nie-cyfrowego) → filtruj listę "Recent suppliers" po nazwie (lokalnie, bez API)
- Tab "Recent" — bez zmian (historia dostawców z Dataverse)

**Karta wynikowa VAT (nowa):** Zamiast obecnej karty GUS, nowa karta wyświetla:
```
┌──────────────────────────────────────────┐
│ 🏢  ŁUKASZ FALACIŃSKI                   │
│     NIP: 118-175-32-34                   │
│     REGON: 140907349                     │
│     Status VAT: ✅ Czynny                │
│     Adres: CEDROWA 11, 05-152 DĘBINA     │
│     Konta bankowe: 1                     │
│                            [Wybierz ▶]   │
└──────────────────────────────────────────┘
```

Pola widoczne na karcie:
| Pole | Źródło | Wymagane |
|------|--------|----------|
| Nazwa (name) | `VatSubject.name` | ✅ |
| NIP (sformatowany) | `VatSubject.nip` | ✅ |
| REGON | `VatSubject.regon` | ✅ |
| Status VAT | `VatSubject.statusVat` | ✅ (badge z kolorem) |
| Adres | `residenceAddress \|\| workingAddress` | ✅ |
| Liczba kont bankowych | `accountNumbers.length` | opcjonalnie |

Badge statusu VAT:
- `Czynny` → zielony ✅
- `Zwolniony` → żółty ⚠️
- `Niezarejestrowany` → czerwony ❌

**Dane przekazywane po kliknięciu "Wybierz":**
```typescript
onSelect({
  supplierNip: subject.nip,
  supplierName: subject.name,
  supplierAddress: subject.residenceAddress || subject.workingAddress,
  supplierCountry: 'PL',
})
```

7. **Testy** — Zaktualizować 4 pliki testowe (mocki, nazwy hooków, oczekiwane dane)

---

### FAZA 3: Aktualizacja web app

**Cel:** Odblokować wyszukiwanie dostawców w web i podłączyć do VAT API.

#### Zmiany backend-facing:

1. **`web/src/lib/api.ts`** — `api.gus.*` → `api.vat.*` z nowymi typami

2. **`web/src/hooks/use-gus-lookup.ts`** → **RENAME** do `use-vat-lookup.ts`:
   - `useGusLookup()` → `useVatLookup()`
   - `useGusSearch()` → **USUNĄĆ**
   - `useRecentSuppliers()` → bez zmian
   - `validateNipChecksum()` → przenieść do wspólnego `nip-utils.ts`

3. **`web/src/messages/en.json`** + **`pl.json`** — Zaktualizować klucze i18n:
   - `gusLookup` → `vatLookup`
   - Dodać: `statusVat`, `bankAccounts`, `searchByNipOrRegon`
   - Zmienić placeholder wyszukiwania

#### Zmiany UI — `supplier-lookup-dialog.tsx` (web):

**Obecne zachowanie:**
- Jedno pole input (placeholder: `supplierLookup.searchPlaceholder`)
- GUS search **wyłączony** — komentarz: `{/* Recent suppliers only - GUS search disabled */}`
- Tylko `RecentSuppliersList` — filtrowanie lokalne po wpisanym tekście
- Brak tabulacji (tabs wyłączone)

**Nowe zachowanie — identyczne jak code-app:**
- Jedno pole input z placeholderem: _"Wpisz NIP (10 cyfr) lub REGON (9/14 cyfr)..."_
- Wpisanie **10 cyfr** → auto-lookup NIP z walidacją sumy kontrolnej
- Wpisanie **9 lub 14 cyfr** → lookup po REGON
- Wpisanie **tekstu** → filtruj "Recent suppliers" lokalnie
- **Przywrócić Tabs** — "Recent" | "Szukaj"
- Tab "Szukaj" — pole NIP/REGON + karta wynikowa VAT (jak w code-app)
- Tab "Recent" — lista ostatnich dostawców z filtrowanie

**Karta wynikowa** — identyczna jak w code-app (nazwa, NIP, REGON, status VAT, adres).

**Dane przekazywane po kliknięciu "Wybierz":**
```typescript
onSelect({
  nip: subject.nip,
  name: subject.name,
  address: subject.residenceAddress || subject.workingAddress,
  city: extractCity(subject.residenceAddress), // parsowanie z adresu
})
```

> **Uwaga:** Interfejs `SupplierData` różni się między web (`nip`, `name`) a code-app (`supplierNip`, `supplierName`). Zachowujemy obie konwencje — nie refaktorujemy teraz konsumentów.

4. **`web/src/messages/en.json`** + **`pl.json`** — Zaktualizować klucze i18n

---

### FAZA 4: Porządki i testy

**Cel:** Uprzątnąć stary kod, dodać testy, zaktualizować dokumentację.

1. **Usunąć stare skrypty GUS** — 5 plików z `api/scripts/gus-*.ts`
2. **Usunąć `bir1`** z `package.json`
3. **Dodać testy:**
   - `api/tests/vat-client.test.ts` — unit testy REST clienta (mockowany fetch)
   - `api/tests/vat-functions.test.ts` — testy endpointów Azure Functions
   - `code-app/src/__tests__/vat-lookup.test.tsx` — test komponentu supplier-lookup
4. **Zaktualizować dokumentację** — ten raport → dodać sekcję "Post-migration"
5. **Konfiguracja** — dodać `WL_API_URL` do `local.settings.json` (opcjonalnie, domyślny = produkcja)

---

### Szacunkowy nakład pracy

| Faza | Pliki | Nowe linii kodu | Usunięte linii | Szacunek |
|------|-------|----------------|----------------|----------|
| **Faza 1** — Backend | 4 nowe + 4 usunięte | ~200 | ~982 | 30 min |
| **Faza 2** — Code-App | 7 edycji + 1 usunięcie | ~100 | ~300 | 30 min |
| **Faza 3** — Web | 4 edycje + 1 rename | ~80 | ~250 | 20 min |
| **Faza 4** — Porządki + testy | 5 usunięć + 3 nowe | ~200 | ~100 | 30 min |
| **RAZEM** | ~25 plików | ~580 | ~1632 | ~2h |

### Kluczowe decyzje

1. **Brak wyszukiwania po nazwie firmy** — WL API nie obsługuje. Dostawcy będą szukani po **NIP** lub **REGON**. Wpisanie tekstu filtruje lokalnie listę recent suppliers. To akceptowalne — NIP jest na każdej fakturze, REGON na większości dokumentów.

2. **Wyszukiwanie w UI: NIP (10 cyfr) lub REGON (9/14 cyfr)** — auto-detekcja na podstawie liczby cyfr. Tekst (non-digit) → filtrowanie recent suppliers po nazwie (bez API call).

3. **Nowe routes** — `/api/vat/*` zamiast `/api/gus/*` — czystsze nazewnictwo, unikamy mylenia z GUS.

4. **Bonus: weryfikacja kont bankowych** — WL API daje za darmo sprawdzanie, czy konto bankowe jest przypisane do NIP. Przydatne do weryfikacji płatności (split payment, biała lista). Endpoint gotowy w Fazie 1, UI może być dodane w przyszłości.

5. **Spójna logika UI w web i code-app** — identyczne zachowanie wyszukiwania, identyczne karty wynikowe. Jedyna różnica to interfejs `SupplierData` (web: `nip/name`, code-app: `supplierNip/supplierName`).

6. **Walidacja NIP** — zachowujemy lokalną (bez zapytania do API), konsolidujemy zduplikowany kod do jednego `nip-utils.ts`.

7. **Brak env vars** — WL API nie wymaga klucza. Jedyna konfiguracja to `WL_API_URL` (opcjonalna, domyślna = produkcja).

---

*Raport przygotowany: 2026-02-14*
*Dry-run GUS wykonany: 2026-02-14*
*Dry-run WL VAT wykonany: 2026-02-14*
*Decyzja: Migracja z GUS BIR1 na Biała Lista VAT*
*Projekt: dvlp-ksef (KSeF Copilot by Developico)*
