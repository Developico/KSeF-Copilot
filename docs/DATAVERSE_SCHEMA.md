# Dataverse Schema - KSeF Integration

Specyfikacja modelu danych dla integracji z Krajowym Systemem e-Faktur (KSeF).

## Spis treści

1. [Przegląd](#przegląd)
2. [Publisher](#publisher)
3. [Tabele (Entities)](#tabele-entities)
   - [dvlp_ksefsetting](#dvlp_ksefsetting)
   - [dvlp_ksefsession](#dvlp_ksefsession)
   - [dvlp_ksefsynclog](#dvlp_ksefsynclog)
   - [dvlp_ksefinvoice](#dvlp_ksefinvoice)
4. [Option Sets (Choices)](#option-sets-choices)
5. [Relacje](#relacje)
6. [Role bezpieczeństwa](#role-bezpieczeństwa)
7. [Indeksy i wydajność](#indeksy-i-wydajność)
8. [Migracja danych](#migracja-danych)

---

## Przegląd

### Architektura danych

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dataverse                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ dvlp_ksefsetting│     │ dvlp_ksefsession│                    │
│  │   (per NIP)     │     │  (per session)  │                    │
│  └────────┬────────┘     └────────┬────────┘                    │
│           │                       │                              │
│           │    1:N                │    1:N                       │
│           ▼                       ▼                              │
│  ┌─────────────────────────────────────────┐                    │
│  │          dvlp_ksefinvoice               │                    │
│  │  (pełna tabela faktur KSeF)             │                    │
│  │  + Dane podstawowe faktury              │                    │
│  │  + Dane sprzedawcy/nabywcy              │                    │
│  │  + Pozycje i sumy                       │                    │
│  │  + Metadane KSeF                        │                    │
│  │  + Status płatności                     │                    │
│  └─────────────────────────────────────────┘                    │
│                        │                                         │
│                        │ 1:N                                     │
│                        ▼                                         │
│  ┌─────────────────────────────────────────┐                    │
│  │          dvlp_ksefsynclog               │                    │
│  │      (historia synchronizacji)          │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Konwencje nazewnictwa

| Element | Wzorzec | Przykład |
|---------|---------|----------|
| Prefix | `dvlp_` | `dvlp_ksefsetting` |
| Tabela | `dvlp_{moduł}{obiekt}` | `dvlp_ksefsession` |
| Pole | `dvlp_{nazwa}` | `dvlp_companyname` |
| OptionSet | `dvlp_{obiekt}{cecha}` | `dvlp_ksefstatus` |
| Relacja | `dvlp_{parent}_{child}` | `dvlp_ksefsetting_invoices` |

---

## Publisher

```yaml
UniqueName: developico
DisplayName: Developico
Description: Developico sp. z o.o.
CustomizationPrefix: dvlp
OptionValuePrefix: 10000
```

---

## Tabele (Entities)

### dvlp_ksefsetting

**Nazwa wyświetlana:** Ustawienia KSeF / KSeF Setting  
**Nazwa logiczna:** `dvlp_ksefsetting`  
**Nazwa zestawu:** `dvlp_ksefsettings`  
**Typ własności:** Organization  
**Opis:** Konfiguracja integracji KSeF dla każdej firmy (NIP)

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefsettingid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_nip` | NIP | String(10) | ✅ | NIP firmy (Primary Name) |
| `dvlp_companyname` | Nazwa firmy | String(250) | ✅ | Pełna nazwa firmy |
| `dvlp_environment` | Środowisko KSeF | OptionSet | ✅ | test/demo/prod |
| `dvlp_autosync` | Automatyczna synchronizacja | Boolean | ❌ | Domyślnie: false |
| `dvlp_syncinterval` | Interwał synchronizacji | Integer | ❌ | Minuty (5-1440) |
| `dvlp_lastsyncat` | Ostatnia synchronizacja | DateTime | ❌ | Czas ostatniego sync |
| `dvlp_lastsyncstatus` | Status ostatniej sync | OptionSet | ❌ | success/error |
| `dvlp_keyvaultsecretname` | Nazwa sekretu Key Vault | String(100) | ✅ | ksef-token-{NIP} |
| `dvlp_tokenexpiresat` | Wygaśnięcie tokenu | DateTime | ❌ | Czas wygaśnięcia tokenu |
| `dvlp_isactive` | Aktywna | Boolean | ❌ | Domyślnie: true |
| `dvlp_invoiceprefix` | Prefix numeracji | String(10) | ❌ | Prefix dla faktur |
| `dvlp_defaultcategory` | Domyślna kategoria | Lookup | ❌ | Kategoria dla nowych faktur |

#### Klucze alternatywne

| Nazwa | Atrybuty |
|-------|----------|
| `dvlp_nip_key` | `dvlp_nip` |

#### Widoki

| Nazwa | Filtr | Domyślne kolumny |
|-------|-------|------------------|
| Aktywne ustawienia | `dvlp_isactive = true` | NIP, Nazwa firmy, Środowisko, Ostatnia sync |
| Wszystkie ustawienia | - | NIP, Nazwa firmy, Środowisko, Aktywna |
| Wymagające uwagi | `dvlp_lastsyncstatus = error` | NIP, Nazwa firmy, Status sync |

---

### dvlp_ksefsession

**Nazwa wyświetlana:** Sesja KSeF / KSeF Session  
**Nazwa logiczna:** `dvlp_ksefsession`  
**Nazwa zestawu:** `dvlp_ksefsessions`  
**Typ własności:** Organization  
**Opis:** Sesje komunikacji z API KSeF

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefsessionid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_sessionreference` | Referencja sesji | String(100) | ✅ | ID sesji z KSeF (Primary Name) |
| `dvlp_ksefsettingid` | Ustawienie KSeF | Lookup | ✅ | Powiązanie z konfiguracją |
| `dvlp_nip` | NIP | String(10) | ✅ | NIP firmy (denormalizacja) |
| `dvlp_sessiontoken` | Token sesji | String(500) | ❌ | Zaszyfrowany token |
| `dvlp_sessiontype` | Typ sesji | OptionSet | ✅ | interactive/batch |
| `dvlp_startedat` | Rozpoczęta | DateTime | ✅ | Czas rozpoczęcia |
| `dvlp_expiresat` | Wygasa | DateTime | ❌ | Czas wygaśnięcia |
| `dvlp_terminatedat` | Zakończona | DateTime | ❌ | Czas zakończenia |
| `dvlp_status` | Status | OptionSet | ✅ | active/expired/terminated/error |
| `dvlp_invoicesprocessed` | Przetworzono faktur | Integer | ❌ | Licznik faktur |
| `dvlp_errormessage` | Komunikat błędu | String(2000) | ❌ | Opis błędu (jeśli wystąpił) |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sessions` |

---

### dvlp_ksefsynclog

**Nazwa wyświetlana:** Log synchronizacji KSeF / KSeF Sync Log  
**Nazwa logiczna:** `dvlp_ksefsynclog`  
**Nazwa zestawu:** `dvlp_ksefsynclog`  
**Typ własności:** Organization  
**Opis:** Historia operacji synchronizacji z KSeF

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefsynclogid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(100) | Auto | Auto: "{NIP}-{timestamp}" |
| `dvlp_ksefsettingid` | Ustawienie KSeF | Lookup | ✅ | Powiązanie z konfiguracją |
| `dvlp_ksefsessionid` | Sesja KSeF | Lookup | ❌ | Powiązanie z sesją |
| `dvlp_operationtype` | Typ operacji | OptionSet | ✅ | sync_incoming/sync_outgoing/send/status_check |
| `dvlp_startedat` | Rozpoczęto | DateTime | ✅ | Czas rozpoczęcia |
| `dvlp_completedat` | Zakończono | DateTime | ❌ | Czas zakończenia |
| `dvlp_status` | Status | OptionSet | ✅ | in_progress/success/partial/error |
| `dvlp_invoicesprocessed` | Przetworzono | Integer | ❌ | Liczba przetworzonych |
| `dvlp_invoicesfailed` | Błędne | Integer | ❌ | Liczba z błędami |
| `dvlp_errormessage` | Komunikat błędu | Memo | ❌ | Szczegóły błędu |
| `dvlp_requestpayload` | Request | Memo | ❌ | Payload żądania (debug) |
| `dvlp_responsepayload` | Response | Memo | ❌ | Payload odpowiedzi (debug) |

---

### dvlp_ksefinvoice

**Nazwa wyświetlana:** Faktura KSeF / KSeF Invoice  
**Nazwa logiczna:** `dvlp_ksefinvoice`  
**Nazwa zestawu:** `dvlp_ksefinvoices`  
**Typ własności:** Organization  
**Opis:** Faktury kosztowe pobrane z Krajowego Systemu e-Faktur (KSeF)

#### Konfiguracja tabeli

| Ustawienie | Wartość | Opis |
|------------|---------|------|
| Track changes | ✅ | Śledzenie zmian dla synchronizacji |
| Enable auditing | ✅ | Audyt zmian |
| Enable for mobile | ❌ | Tylko desktop/web |
| Enable activities | ❌ | Bez aktywności |
| Enable notes | ✅ | Notatki/załączniki |
| Enable connections | ❌ | Bez połączeń |
| Enable queues | ❌ | Bez kolejek |
| Enable duplicate detection | ✅ | Wykrywanie duplikatów |
| Enable for offline | ❌ | Bez trybu offline |
| Enable quick create | ✅ | Szybkie tworzenie |
| Primary image | ❌ | Bez obrazka |
| Color | #2E7D32 | Zielony (faktury) |
| Icon | 📄 | Ikona dokumentu |

#### Atrybuty - Klucz główny i nazwa

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefinvoiceid` | ID | Uniqueidentifier | Auto | Klucz główny (GUID) |
| `dvlp_name` | Numer faktury | String(100) | ✅ | Primary Name - numer faktury od wystawcy |

#### Atrybuty - Dane podstawowe faktury

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_invoicedate` | Data wystawienia | Date | ✅ | Data wystawienia faktury |
| `dvlp_saledate` | Data sprzedaży | Date | ❌ | Data sprzedaży/wykonania usługi |
| `dvlp_duedate` | Termin płatności | Date | ❌ | Data zapadalności |
| `dvlp_invoicetype` | Typ faktury | OptionSet | ✅ | Typ dokumentu (VAT, korygująca, zaliczkowa) |
| `dvlp_description` | Opis | String(500) | ❌ | Dodatkowy opis/komentarz |

#### Atrybuty - Dane sprzedawcy

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_sellernip` | NIP sprzedawcy | String(10) | ✅ | Numer NIP sprzedawcy |
| `dvlp_sellername` | Nazwa sprzedawcy | String(500) | ✅ | Pełna nazwa/firma sprzedawcy |

#### Atrybuty - Dane nabywcy

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_buyernip` | NIP nabywcy | String(10) | ✅ | Numer NIP nabywcy (nasz NIP) |

#### Atrybuty - Kwoty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_netamount` | Kwota netto | Decimal(12,2) | ✅ | Suma wartości netto |
| `dvlp_vatamount` | Kwota VAT | Decimal(12,2) | ✅ | Suma podatku VAT |
| `dvlp_grossamount` | Kwota brutto | Decimal(12,2) | ✅ | Suma wartości brutto |
| `dvlp_currency` | Waluta | OptionSet | ✅ | Waluta faktury (PLN domyślnie) |

#### Atrybuty - Status płatności

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_paymentstatus` | Status płatności | OptionSet | ✅ | pending/paid/overdue |
| `dvlp_paidat` | Data płatności | DateTime | ❌ | Kiedy zapłacono |

#### Atrybuty - Kategoryzacja

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_category` | Kategoria | String(100) | ❌ | Kategoria kosztowa (tekst) |
| `dvlp_costcenter` | MPK | OptionSet | ❌ | Miejsce Powstawania Kosztów |

#### Atrybuty - Metadane KSeF

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefreferencenumber` | Numer referencyjny KSeF | String(50) | ❌ | Unikalny identyfikator z KSeF |
| `dvlp_ksefstatus` | Status KSeF | OptionSet | ❌ | Status synchronizacji z KSeF |
| `dvlp_ksefdirection` | Kierunek | OptionSet | ✅ | incoming / outgoing |
| `dvlp_ksefdownloadedat` | Pobrano z KSeF | DateTime | ❌ | Kiedy pobrano z KSeF |
| `dvlp_ksefrawxml` | XML faktury | Memo | ❌ | Surowy XML w formacie FA(2) |

#### Atrybuty - Relacje

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefsettingid` | Ustawienie KSeF | Lookup | ✅ | Konfiguracja firmy (per NIP) |
| `dvlp_parentinvoiceid` | Faktura źródłowa | Lookup | ❌ | Dla korekt - oryginalna faktura |
| `statecode` | Status | State | Auto | Active/Inactive |
| `statuscode` | Status Reason | Status | Auto | Powód statusu |

#### Klucze alternatywne

| Nazwa | Atrybuty | Opis |
|-------|----------|------|
| `dvlp_ksefref_key` | `dvlp_ksefreferencenumber` | Unikalność numeru KSeF |
| `dvlp_invoice_composite_key` | `dvlp_sellernip`, `dvlp_name`, `dvlp_invoicedate` | Unikalność faktury (NIP+numer+data) |

#### Widoki (Views)

| Nazwa | Typ | Filtr | Domyślne kolumny |
|-------|-----|-------|------------------|
| Wszystkie faktury | Public | - | Numer, Data, Sprzedawca, Brutto, Status płatności |
| Aktywne faktury | Public | `statecode = 0` | Numer, Data, Sprzedawca, Brutto, Status |
| Faktury do zapłaty | Public | `dvlp_paymentstatus = pending` | Numer, Data, Sprzedawca, Brutto, Termin |
| Opłacone | Public | `dvlp_paymentstatus = paid` | Numer, Data, Sprzedawca, Brutto, Data płatności |
| Przeterminowane | Public | `dvlp_paymentstatus = overdue` | Numer, Data, Sprzedawca, Brutto, Termin |
| Faktury przychodzące | Public | `dvlp_ksefdirection = incoming` | Numer, Data, Sprzedawca, Brutto |
| Błędy KSeF | Public | `dvlp_ksefstatus = error` | Numer, Data, Sprzedawca, Status KSeF |
| Quick Find | QuickFind | - | Numer, Sprzedawca, NIP |

#### Formularze (Forms)

| Nazwa | Typ | Opis |
|-------|-----|------|
| Faktura KSeF | Main | Główny formularz edycji |
| Faktura - Quick Create | Quick Create | Szybkie tworzenie |
| Faktura - Card | Card | Widok karty |

**Struktura głównego formularza (Main):**

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│ [Numer faktury] [Status płatności] [Status KSeF]                │
├─────────────────────────────────────────────────────────────────┤
│ TAB: Ogólne                                                      │
│ ┌─────────────────────────┬─────────────────────────┐           │
│ │ SEKCJA: Dane faktury    │ SEKCJA: Sprzedawca      │           │
│ │ - Numer faktury         │ - NIP sprzedawcy        │           │
│ │ - Data wystawienia      │ - Nazwa sprzedawcy      │           │
│ │ - Data sprzedaży        │                         │           │
│ │ - Termin płatności      │                         │           │
│ │ - Typ faktury           │                         │           │
│ └─────────────────────────┴─────────────────────────┘           │
│ ┌─────────────────────────┬─────────────────────────┐           │
│ │ SEKCJA: Kwoty           │ SEKCJA: Płatność        │           │
│ │ - Kwota netto           │ - Status płatności      │           │
│ │ - Kwota VAT             │ - Data płatności        │           │
│ │ - Kwota brutto          │                         │           │
│ │ - Waluta                │                         │           │
│ └─────────────────────────┴─────────────────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│ TAB: Kategoryzacja                                               │
│ - Kategoria                                                      │
│ - MPK                                                            │
├─────────────────────────────────────────────────────────────────┤
│ TAB: KSeF                                                        │
│ - Numer referencyjny KSeF                                        │
│ - Status KSeF                                                    │
│ - Kierunek                                                       │
│ - Pobrano z KSeF                                                 │
│ - XML faktury (read-only)                                        │
├─────────────────────────────────────────────────────────────────┤
│ TAB: Powiązania                                                  │
│ - Faktura źródłowa (dla korekt)                                  │
│ - Ustawienie KSeF                                                │
├─────────────────────────────────────────────────────────────────┤
│ FOOTER: Timeline/Notes                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Wykresy (Charts)

| Nazwa | Typ | Opis |
|-------|-----|------|
| Faktury wg statusu płatności | Pie Chart | Podział: oczekujące/opłacone/przeterminowane |
| Faktury miesięcznie | Bar Chart | Liczba faktur per miesiąc |
| Kwoty miesięcznie | Line Chart | Suma brutto per miesiąc |
| Top 10 dostawców | Horizontal Bar | Najwięksi dostawcy wg kwoty |
| Faktury wg kategorii | Pie Chart | Podział kosztów na kategorie |

#### Business Rules

| Nazwa | Warunek | Akcja |
|-------|---------|-------|
| Blokuj edycję XML | `dvlp_ksefrawxml != null` | Lock field `dvlp_ksefrawxml` |
| Auto-ustaw datę płatności | `dvlp_paymentstatus = paid AND dvlp_paidat = null` | Set `dvlp_paidat = Now()` |

#### Indeksy

| Nazwa | Atrybuty | Typ | Uzasadnienie |
|-------|----------|-----|--------------|
| `PK_ksefinvoice` | `dvlp_ksefinvoiceid` | Primary | Klucz główny |
| `AK_ksefref` | `dvlp_ksefreferencenumber` | Unique | Wyszukiwanie po numerze KSeF |
| `AK_composite` | `dvlp_sellernip`, `dvlp_name`, `dvlp_invoicedate` | Unique | Deduplikacja |
| `IX_paymentstatus` | `dvlp_paymentstatus`, `dvlp_duedate` | Non-unique | Filtrowanie płatności |
| `IX_sellernip` | `dvlp_sellernip` | Non-unique | Wyszukiwanie po dostawcy |
| `IX_invoicedate` | `dvlp_invoicedate` | Non-unique | Sortowanie/filtrowanie dat |
| `IX_ksefsetting` | `dvlp_ksefsettingid` | Non-unique | Relacja z konfiguracją |

---

## Option Sets (Choices)

### dvlp_ksefenvironment

**Nazwa wyświetlana:** Środowisko KSeF  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Test | Test | Środowisko testowe KSeF |
| 100000002 | Demo | Demo | Środowisko demo KSeF |
| 100000003 | Production | Produkcja | Środowisko produkcyjne KSeF |

---

### dvlp_ksefstatus

**Nazwa wyświetlana:** Status KSeF  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Kolor | Opis |
|---------|------------|------------|-------|------|
| 100000001 | Draft | Szkic | Gray | Faktura utworzona, nie wysłana |
| 100000002 | Pending | Oczekuje | Yellow | W trakcie wysyłki |
| 100000003 | Sent | Wysłano | Blue | Wysłano, oczekuje na potwierdzenie |
| 100000004 | Accepted | Zaakceptowano | Green | Zaakceptowano przez KSeF |
| 100000005 | Rejected | Odrzucono | Red | Odrzucono przez KSeF |
| 100000006 | Error | Błąd | Red | Błąd techniczny |

---

### dvlp_ksefdirection

**Nazwa wyświetlana:** Kierunek faktury  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Ikona |
|---------|------------|------------|-------|
| 100000001 | Incoming | Przychodzące | ⬇️ |
| 100000002 | Outgoing | Wychodzące | ⬆️ |

---

### dvlp_sessionstatus

**Nazwa wyświetlana:** Status sesji  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | Active | Aktywna |
| 100000002 | Expired | Wygasła |
| 100000003 | Terminated | Zakończona |
| 100000004 | Error | Błąd |

---

### dvlp_sessiontype

**Nazwa wyświetlana:** Typ sesji  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Interactive | Interaktywna | Sesja użytkownika |
| 100000002 | Batch | Wsadowa | Sesja automatyczna |

---

### dvlp_syncoperationtype

**Nazwa wyświetlana:** Typ operacji synchronizacji  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | Sync Incoming | Pobierz przychodzące |
| 100000002 | Sync Outgoing | Synchronizuj wychodzące |
| 100000003 | Send Invoice | Wyślij fakturę |
| 100000004 | Check Status | Sprawdź status |
| 100000005 | Download UPO | Pobierz UPO |

---

### dvlp_syncstatus

**Nazwa wyświetlana:** Status synchronizacji  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | In Progress | W trakcie |
| 100000002 | Success | Sukces |
| 100000003 | Partial | Częściowy |
| 100000004 | Error | Błąd |

---

### dvlp_paymentstatus

**Nazwa wyświetlana:** Status płatności  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Kolor |
|---------|------------|------------|-------|
| 100000001 | Pending | Oczekuje | Yellow |
| 100000002 | Paid | Opłacona | Green |
| 100000003 | Overdue | Przeterminowana | Red |

---

### dvlp_invoicetype

**Nazwa wyświetlana:** Typ faktury  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | VAT Invoice | Faktura VAT |
| 100000002 | Corrective | Faktura korygująca |
| 100000003 | Advance | Faktura zaliczkowa |

---

### dvlp_currency

**Nazwa wyświetlana:** Waluta  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | PLN | PLN |
| 100000002 | EUR | EUR |
| 100000003 | USD | USD |

---

### dvlp_category

**Nazwa wyświetlana:** Kategoria kosztowa  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | IT & Software | IT i oprogramowanie |
| 100000002 | Office | Biuro |
| 100000003 | Marketing | Marketing |
| 100000004 | Travel | Podróże |
| 100000005 | Utilities | Media |
| 100000006 | Professional Services | Usługi profesjonalne |
| 100000007 | Equipment | Sprzęt |
| 100000008 | Materials | Materiały |
| 100000009 | Other | Inne |

---

### dvlp_costcenter

**Nazwa wyświetlana:** MPK (Miejsce Powstawania Kosztów)  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000001 | General Administration | Administracja ogólna |
| 100000002 | Sales | Sprzedaż |
| 100000003 | Production | Produkcja |
| 100000004 | R&D | Badania i rozwój |
| 100000005 | IT | IT |
| 100000006 | Marketing | Marketing |
| 100000007 | HR | Kadry |
| 100000008 | Finance | Finanse |

---

### dvlp_invoicesource

**Nazwa wyświetlana:** Źródło faktury  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | KSeF Sync | Synchronizacja KSeF | Pobrano automatycznie z KSeF |
| 100000002 | Manual | Ręczne | Wprowadzono ręcznie |
| 100000003 | Import | Import | Zaimportowano z pliku |

---

## Relacje

### Diagram relacji

```
dvlp_ksefsetting (1)
    │
    ├──── (N) dvlp_ksefsession
    │           │
    │           └──── (N) dvlp_ksefinvoice (via dvlp_ksefsessionid)
    │
    ├──── (N) dvlp_ksefsynclog
    │
    └──── (N) dvlp_ksefinvoice (via dvlp_ksefsettingid)
```

### Definicje relacji

| Relacja | Typ | Parent | Child | Cascade |
|---------|-----|--------|-------|---------|
| `dvlp_ksefsetting_sessions` | 1:N | dvlp_ksefsetting | dvlp_ksefsession | Delete: Cascade |
| `dvlp_ksefsetting_synclogs` | 1:N | dvlp_ksefsetting | dvlp_ksefsynclog | Delete: Cascade |
| `dvlp_ksefsetting_invoices` | 1:N | dvlp_ksefsetting | dvlp_ksefinvoice | Delete: Restrict |
| `dvlp_ksefsession_synclogs` | 1:N | dvlp_ksefsession | dvlp_ksefsynclog | Delete: RemoveLink |
| `dvlp_ksefsession_invoices` | 1:N | dvlp_ksefsession | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_ksefinvoice_parent` | 1:N | dvlp_ksefinvoice | dvlp_ksefinvoice | Delete: RemoveLink |

---

## Role bezpieczeństwa

### KSeF Admin

Pełny dostęp do wszystkich operacji KSeF.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefinvoice | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |

### KSeF Reader

Dostęp tylko do odczytu.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefinvoice | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |

### KSeF Operator

Może wykonywać synchronizację i zarządzać fakturami, ale nie może zmieniać konfiguracji.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefinvoice | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |

### KSeF Approver

Może akceptować faktury do płatności.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefinvoice | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

---

## Indeksy i wydajność

### Zalecane indeksy

| Tabela | Indeks | Atrybuty | Uzasadnienie |
|--------|--------|----------|--------------|
| dvlp_ksefsetting | PK | `dvlp_ksefsettingid` | Auto |
| dvlp_ksefsetting | AK_NIP | `dvlp_nip` | Wyszukiwanie po NIP |
| dvlp_ksefsession | IX_NIP_Status | `dvlp_nip`, `dvlp_status` | Aktywne sesje dla NIP |
| dvlp_ksefsession | IX_ExpiredAt | `dvlp_expiresat` | Czyszczenie wygasłych |
| dvlp_ksefsynclog | IX_Setting_Date | `dvlp_ksefsettingid`, `dvlp_startedat` | Historia sync |
| dvlp_ksefinvoice | PK | `dvlp_ksefinvoiceid` | Klucz główny |
| dvlp_ksefinvoice | AK_KSeFRef | `dvlp_ksefreferencenumber` | Wyszukiwanie po numerze KSeF |
| dvlp_ksefinvoice | AK_Composite | `dvlp_sellernip`, `dvlp_name`, `dvlp_invoicedate` | Deduplikacja |
| dvlp_ksefinvoice | IX_PaymentStatus | `dvlp_paymentstatus`, `dvlp_duedate` | Filtrowanie płatności |
| dvlp_ksefinvoice | IX_SellerNIP | `dvlp_sellernip` | Wyszukiwanie po dostawcy |
| dvlp_ksefinvoice | IX_InvoiceDate | `dvlp_invoicedate` | Sortowanie/filtrowanie dat |

### Partycjonowanie danych (Extended)

Dla dużych wolumenów (>100k faktur):

```
Partycja po: dvlp_invoicedate (miesięcznie)
Retencja: 7 lat (wymagania prawne dla faktur)
Archiwizacja: Po 2 latach do cold storage
```

---

## Migracja danych

### Import początkowy

1. **Ustawienia KSeF** - ręczna konfiguracja per firma
2. **Faktury KSeF** - tworzenie nowej tabeli `dvlp_ksefinvoice`

### Skrypt mapowania (przykład)

```javascript
// Mapowanie statusów KSeF
const ksefStatusMapping = {
  'NEW': 100000001,       // Draft
  'SENT': 100000003,      // Sent
  'CONFIRMED': 100000004, // Accepted
  'FAILED': 100000006     // Error
};

// Mapowanie kierunku
const directionMapping = {
  'IN': 100000001,   // Incoming
  'OUT': 100000002   // Outgoing
};

// Mapowanie statusów płatności
const paymentStatusMapping = {
  'UNPAID': 100000001,    // Pending
  'PAID': 100000002,      // Paid
  'OVERDUE': 100000003    // Overdue
};

// Mapowanie typów faktur
const invoiceTypeMapping = {
  'VAT': 100000001,        // VAT Invoice
  'CORRECTION': 100000002, // Corrective
  'ADVANCE': 100000003     // Advance
};

// Mapowanie walut
const currencyMapping = {
  'PLN': 100000001,
  'EUR': 100000002,
  'USD': 100000003
};
```

### Walidacja po migracji

```sql
-- Sprawdzenie spójności - faktury z KSeF powinny mieć numer referencyjny
SELECT COUNT(*) as total,
       SUM(CASE WHEN dvlp_ksefreferencenumber IS NULL THEN 1 ELSE 0 END) as missing_ref
FROM dvlp_ksefinvoice
WHERE dvlp_ksefstatus IN (100000003, 100000004) -- Sent, Accepted

-- Sprawdzenie duplikatów
SELECT dvlp_sellernip, dvlp_name, dvlp_invoicedate, COUNT(*) as cnt
FROM dvlp_ksefinvoice
GROUP BY dvlp_sellernip, dvlp_name, dvlp_invoicedate
HAVING COUNT(*) > 1

-- Sprawdzenie relacji z konfiguracją
SELECT i.dvlp_name, i.dvlp_buyernip
FROM dvlp_ksefinvoice i
LEFT JOIN dvlp_ksefsetting s ON i.dvlp_ksefsettingid = s.dvlp_ksefsettingid
WHERE s.dvlp_ksefsettingid IS NULL
```

---

## Tworzenie tabeli - Kolejność kroków

### 1. Utworzenie Global Option Sets

Utwórz najpierw wszystkie globalne zestawy opcji:

1. `dvlp_ksefenvironment` - Środowisko KSeF
2. `dvlp_ksefstatus` - Status KSeF
3. `dvlp_ksefdirection` - Kierunek faktury
4. `dvlp_sessionstatus` - Status sesji
5. `dvlp_sessiontype` - Typ sesji
6. `dvlp_syncoperationtype` - Typ operacji synchronizacji
7. `dvlp_syncstatus` - Status synchronizacji
8. `dvlp_paymentstatus` - Status płatności
9. `dvlp_invoicetype` - Typ faktury
10. `dvlp_currency` - Waluta
11. `dvlp_category` - Kategoria kosztowa
12. `dvlp_costcenter` - MPK

### 2. Utworzenie tabel w kolejności

1. `dvlp_ksefsetting` - Ustawienia KSeF (bez relacji)
2. `dvlp_ksefsession` - Sesje KSeF (z relacją do dvlp_ksefsetting)
3. `dvlp_ksefinvoice` - Faktury KSeF (z relacją do dvlp_ksefsetting)
4. `dvlp_ksefsynclog` - Logi synchronizacji (z relacjami do powyższych)

### 3. Utworzenie kluczy alternatywnych

- `dvlp_ksefsetting`: `dvlp_nip_key`
- `dvlp_ksefinvoice`: `dvlp_ksefref_key`, `dvlp_invoice_composite_key`

### 4. Utworzenie widoków, formularzy i wykresów

Zgodnie ze specyfikacją dla każdej tabeli.

---

## Changelog

| Wersja | Data | Opis zmian |
|--------|------|------------|
| 1.0.0 | 2026-01 | Wersja początkowa |
| 1.1.0 | 2026-01 | Zmiana z rozszerzenia Invoice na nową tabelę dvlp_ksefinvoice |
| 1.2.0 | 2026-01 | Uproszczenie struktury: 22 kolumny zamiast 50+, Decimal zamiast Currency, MPK/Kategoria jako OptionSet |

---

## Powiązane dokumenty

- [REQUIREMENTS.md](REQUIREMENTS.md) - Wymagania funkcjonalne
- [plan-ksefIntegration.prompt.md](plan-ksefIntegration.prompt.md) - Plan implementacji
- [deployment/dataverse/README.md](../deployment/dataverse/README.md) - Instrukcja wdrożenia
