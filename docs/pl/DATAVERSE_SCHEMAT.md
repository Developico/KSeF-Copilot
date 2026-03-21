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
   - [dvlp_aifeedback](#dvlp_aifeedback)
   - [dvlp_ksefmpkcenter](#dvlp_ksefmpkcenter)
   - [dvlp_ksefmpkapprover](#dvlp_ksefmpkapprover)
   - [dvlp_ksefnotification](#dvlp_ksefnotification)
   - [dvlp_ksefsupplier](#dvlp_ksefsupplier)
   - [dvlp_ksefsbagrement](#dvlp_ksefsbagrement)
   - [dvlp_ksefselfbillingtemplate](#dvlp_ksefselfbillingtemplate)
   - [dvlp_ksefselfbillinginvoice](#dvlp_ksefselfbillinginvoice)
   - [dvlp_ksefselfbillinglineitem](#dvlp_ksefselfbillinglineitem)
4. [Option Sets (Choices)](#option-sets-choices)
5. [Relacje](#relacje)
6. [Role bezpieczeństwa](#role-bezpieczeństwa)
7. [Indeksy i wydajność](#indeksy-i-wydajność)
8. [Migracja danych](#migracja-danych)
9. [Wdrożenie pól AI](#wdrożenie-pól-ai)
10. [Zmiany w kodzie po wdrożeniu AI](#zmiany-w-kodzie-po-wdrożeniu-ai)

---

## Przegląd

### Architektura danych

```mermaid
erDiagram
    dvlp_ksefsetting ||--o{ dvlp_ksefsession : "1:N (per NIP)"
    dvlp_ksefsetting ||--o{ dvlp_ksefsynclog : "1:N"
    dvlp_ksefsetting ||--o{ dvlp_ksefinvoice : "1:N (via settingid)"
    dvlp_ksefsetting ||--o{ dvlp_ksefmpkcenter : "1:N"
    dvlp_ksefsetting ||--o{ dvlp_ksefnotification : "1:N"
    dvlp_ksefsetting ||--o{ dvlp_ksefsupplier : "1:N"
    dvlp_ksefsetting ||--o{ dvlp_ksefsbagrement : "1:N"
    dvlp_ksefsetting ||--o{ dvlp_ksefselfbillingtemplate : "1:N"
    dvlp_ksefsetting ||--o{ dvlp_ksefselfbillinginvoice : "1:N"
    dvlp_ksefsupplier ||--o{ dvlp_ksefsbagrement : "1:N"
    dvlp_ksefsupplier ||--o{ dvlp_ksefselfbillingtemplate : "1:N"
    dvlp_ksefsupplier ||--o{ dvlp_ksefselfbillinginvoice : "1:N"
    dvlp_ksefsbagrement ||--o{ dvlp_ksefselfbillinginvoice : "1:N"
    dvlp_ksefselfbillinginvoice ||--o{ dvlp_ksefselfbillinglineitem : "1:N"
    dvlp_ksefselfbillinginvoice ||--o| dvlp_ksefinvoice : "0..1 (KSeF link)"
    dvlp_ksefselfbillinginvoice ||--o| dvlp_ksefmpkcenter : "0..1 (MPK)"
    dvlp_ksefselfbillinglineitem ||--o| dvlp_ksefselfbillingtemplate : "0..1 (traceability)"
    dvlp_ksefsession ||--o{ dvlp_ksefinvoice : "1:N (via sessionid)"
    dvlp_ksefinvoice ||--o{ dvlp_aifeedback : "1:N"
    dvlp_ksefinvoice ||--o{ dvlp_ksefnotification : "1:N"
    dvlp_ksefinvoice ||--o| dvlp_ksefinvoice : "self-ref (parent)"
    dvlp_ksefmpkcenter ||--o{ dvlp_ksefmpkapprover : "1:N"
    dvlp_ksefmpkcenter ||--o{ dvlp_ksefinvoice : "1:N (via mpkcenterid)"
    dvlp_ksefmpkcenter ||--o{ dvlp_ksefnotification : "1:N"

    dvlp_ksefsetting {
        guid dvlp_ksefsettingid PK
        string dvlp_nip
        string dvlp_name
        string dvlp_tokensecretname
        boolean dvlp_isactive
    }
    dvlp_ksefsession {
        guid dvlp_ksefsessionid PK
        string dvlp_nip
        string dvlp_sessiontoken
        datetime dvlp_expiresat
        boolean dvlp_isactive
    }
    dvlp_ksefinvoice {
        guid dvlp_ksefinvoiceid PK
        string dvlp_ksefreferencenumber
        string dvlp_name
        string dvlp_sellernip
        string dvlp_buyernip
        money dvlp_grossamount
        choice dvlp_aimpksuggestion "AI MPK"
        string dvlp_aicategorysuggestion "AI Category"
        decimal dvlp_aiconfidence "AI Confidence"
    }
    dvlp_ksefsynclog {
        guid dvlp_ksefsynclogid PK
        datetime dvlp_starttime
        datetime dvlp_endtime
        choice dvlp_status
        int dvlp_totalcount
    }
    dvlp_aifeedback {
        guid dvlp_ksefaifeedbackid PK
        choice dvlp_feedbacktype
        string dvlp_originalsuggestion
        string dvlp_finalvalue
    }
```

<details>
<summary>ASCII fallback (kliknij aby rozwinąć)</summary>

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
│  │  + Kategoryzacja AI                     │                    │
│  │    ├── dvlp_aimpksuggestion (OptionSet) │                    │
│  │    ├── dvlp_aicategorysuggestion (Text) │                    │
│  │    ├── dvlp_aidescription (Text)        │                    │
│  │    ├── dvlp_airationale (Text)          │                    │
│  │    ├── dvlp_aiconfidence (Decimal)      │                    │
│  │    └── dvlp_aiprocessedat (DateTime)    │                    │
│  └─────────────────────────────────────────┘                    │
│                        │                                         │
│                        │ 1:N                                     │
│                        ▼                                         │
│  ┌─────────────────────────────────────────┐                    │
│  │          dvlp_ksefsynclog               │                    │
│  │      (historia synchronizacji)          │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  ┌─────────────────────────────────────────┐                    │
│  │          dvlp_aifeedback                │                    │
│  │    (feedback dla uczenia AI)            │                    │
│  │  + Sugestie AI vs wybory użytkownika    │                    │
│  │  + Historia poprawek per dostawca       │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

</details>

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
| `dvlp_costcenter` | MPK | OptionSet (dvlp_costcenter) | ❌ | Miejsce Powstawania Kosztów (stary OptionSet) |
| `dvlp_mpkcenterid` | Centrum kosztów MPK | Lookup (dvlp_ksefmpkcenter) | ❌ | Encja centrum kosztów (zastępuje OptionSet) |

#### Atrybuty - Workflow zatwierdzania

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_approvalstatus` | Status zatwierdzenia | OptionSet (dvlp_approvalstatus) | ❌ | szkic/oczekuje/zatwierdzony/odrzucony/anulowany |
| `dvlp_approvedby` | Zatwierdzony przez | String(200) | ❌ | Nazwa wyświetlana osoby zatwierdzającej |
| `dvlp_approvedbyoid` | OID zatwierdzającego | String(50) | ❌ | Azure AD Object ID osoby zatwierdzającej |
| `dvlp_approvedat` | Data zatwierdzenia | DateTime | ❌ | Kiedy podjęto decyzję |
| `dvlp_approvalcomment` | Komentarz zatwierdzenia | String(500) | ❌ | Komentarz od osoby zatwierdzającej |

#### Atrybuty - Kategoryzacja AI

| # | Nazwa logiczna | Nazwa wyświetlana (EN) | Nazwa wyświetlana (PL) | Typ | Wymagane | Opis |
|---|----------------|------------------------|------------------------|-----|----------|------|
| 1 | `dvlp_aimpksuggestion` | AI MPK Suggestion | Sugestia MPK (AI) | OptionSet (dvlp_costcenter) | ❌ | MPK zasugerowane przez AI |
| 2 | `dvlp_aicategorysuggestion` | AI Category Suggestion | Sugestia kategorii (AI) | String(100) | ❌ | Kategoria zasugerowana przez AI |
| 3 | `dvlp_aidescription` | AI Description | Opis (AI) | String(500) | ❌ | Krótki opis faktury wygenerowany przez AI |
| 4 | `dvlp_airationale` | AI Rationale | Uzasadnienie (AI) | String(500) | ❌ | Uzasadnienie decyzji kategoryzacji AI |
| 5 | `dvlp_aiconfidence` | AI Confidence | Pewność AI | Decimal(3,2) | ❌ | Poziom pewności AI (0.00-1.00) |
| 6 | `dvlp_aiprocessedat` | AI Processed At | Przetworzono przez AI | DateTime | ❌ | Timestamp kiedy AI przetworzyło fakturę |

##### Konfiguracja pól AI w Dataverse

**1. dvlp_aimpksuggestion**

```yaml
Display Name: AI MPK Suggestion / Sugestia MPK (AI)
Schema Name: dvlp_aimpksuggestion
Data Type: Choice (OptionSet)
Option Set: dvlp_costcenter (use existing or create new)
Required: No
Searchable: Yes
Description: MPK suggested by AI categorization. User can accept or override.
Audit: Yes
```

**2. dvlp_aicategorysuggestion**

```yaml
Display Name: AI Category Suggestion / Sugestia kategorii (AI)
Schema Name: dvlp_aicategorysuggestion
Data Type: Single Line of Text
Format: Text
Max Length: 100
Required: No
Searchable: Yes
Description: Cost category suggested by AI. Examples: "Licencje software", "Usługi hostingowe"
Audit: Yes
```

**3. dvlp_aidescription**

```yaml
Display Name: AI Description / Opis (AI)
Schema Name: dvlp_aidescription
Data Type: Single Line of Text
Format: Text Area
Max Length: 500
Required: No
Searchable: No
Description: Short description of the invoice generated by AI for easier identification.
Audit: No
```

**4. dvlp_airationale**

```yaml
Display Name: AI Rationale / Uzasadnienie (AI)
Schema Name: dvlp_airationale
Data Type: Single Line of Text
Format: Text Area
Max Length: 500
Required: No
Searchable: No
Description: AI reasoning for the categorization decision.
Audit: No
```

**5. dvlp_aiconfidence**

```yaml
Display Name: AI Confidence / Pewność AI
Schema Name: dvlp_aiconfidence
Data Type: Decimal Number
Precision: 2
Minimum Value: 0
Maximum Value: 1
Required: No
Searchable: No
Description: AI model confidence score (0.00 = uncertain, 1.00 = very confident)
Audit: No
```

**6. dvlp_aiprocessedat**

```yaml
Display Name: AI Processed At / Przetworzono przez AI
Schema Name: dvlp_aiprocessedat
Data Type: Date and Time
Format: Date and Time
Behavior: User Local
Required: No
Searchable: No
Description: Timestamp when AI categorization was performed on this invoice.
Audit: No
```

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
| Faktury do kategoryzacji AI | Public | `dvlp_aiprocessedat = null AND dvlp_category = null` | Numer, Sprzedawca, Brutto, Data |
| Skategoryzowane przez AI | Public | `dvlp_aiprocessedat != null` | Numer, Sprzedawca, Sugestia MPK, Pewność AI |
| Niska pewność AI | Public | `dvlp_aiconfidence < 0.7` | Numer, Sprzedawca, Sugestia, Pewność |

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
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SEKCJA: Ręczna kategoryzacja                                │ │
│ │ ┌─────────────────────┬─────────────────────┐               │ │
│ │ │ Kategoria           │ MPK                 │               │ │
│ │ │ [dvlp_category]     │ [dvlp_costcenter]   │               │ │
│ │ └─────────────────────┴─────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SEKCJA: Sugestie AI                          [Read-only]    │ │
│ │ ┌─────────────────────┬─────────────────────┐               │ │
│ │ │ Sugestia kategorii  │ Sugestia MPK        │               │ │
│ │ │ [dvlp_aicategory..] │ [dvlp_aimpksugge..] │               │ │
│ │ ├─────────────────────┴─────────────────────┤               │ │
│ │ │ Opis (AI)                                 │               │ │
│ │ │ [dvlp_aidescription]                      │               │ │
│ │ ├─────────────────────┬─────────────────────┤               │ │
│ │ │ Pewność AI          │ Przetworzono        │               │ │
│ │ │ [dvlp_aiconfidence] │ [dvlp_aiprocessed..]│               │ │
│ │ └─────────────────────┴─────────────────────┘               │ │
│ │                                                              │ │
│ │ [🤖 Uruchom kategoryzację AI] [✓ Akceptuj sugestię]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
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
| Lock AI fields | Always | Lock: `dvlp_aimpksuggestion`, `dvlp_aicategorysuggestion`, `dvlp_aidescription`, `dvlp_airationale`, `dvlp_aiconfidence`, `dvlp_aiprocessedat` |
| Show AI confidence as % | `dvlp_aiconfidence != null` | Format as percentage in UI |

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

### dvlp_aifeedback

**Nazwa wyświetlana:** AI Feedback / Feedback AI  
**Nazwa logiczna:** `dvlp_aifeedback`  
**Nazwa zestawu:** `dvlp_aifeedbacks`  
**Typ własności:** Organization  
**Opis:** Historia poprawek użytkowników do sugestii AI - używana do uczenia modelu

#### Cel

Tabela przechowuje informacje o tym jak użytkownicy reagują na sugestie AI:
- **applied** - użytkownik zaakceptował sugestię AI bez zmian
- **modified** - użytkownik zmienił sugestię AI na inną wartość
- **rejected** - użytkownik odrzucił sugestię i ustawił własną wartość

Te dane są wykorzystywane do budowania kontekstu w promptach AI (few-shot learning).

#### Jak działa uczenie

1. Użytkownik klika "Kategoryzuj z AI" → AI generuje sugestię
2. Użytkownik akceptuje lub modyfikuje sugestię
3. Przy zapisie faktury system tworzy rekord w `dvlp_aifeedback`
4. Przy kolejnej kategoryzacji tego samego dostawcy:
   - System pobiera historię z `dvlp_aifeedback`
   - Dodaje do promptu: "Dla dostawcy X użytkownicy zazwyczaj wybierają MPK=Y, Kategoria=Z"
   - AI bierze to pod uwagę przy kategoryzacji

#### Atrybuty - Główne

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_aifeedbackid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(100) | Auto | Auto: "{SupplierName} - {Date}" |
| `dvlp_invoiceid` | Faktura | Lookup (dvlp_ksefinvoice) | ✅ | Powiązanie z fakturą źródłową |
| `dvlp_tenantnip` | NIP Firmy | String(10) | ✅ | NIP firmy (tenant) |
| `dvlp_suppliernip` | NIP Dostawcy | String(15) | ✅ | NIP dostawcy |
| `dvlp_suppliername` | Nazwa Dostawcy | String(250) | ✅ | Nazwa dostawcy |
| `dvlp_invoicedescription` | Kontekst faktury | Memo(500) | ❌ | Fragment opisu/pozycji faktury |

#### Atrybuty - Sugestie AI

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_aimpksuggestion` | Sugestia MPK (AI) | String(50) | ❌ | MPK zasugerowane przez AI |
| `dvlp_aicategorysuggestion` | Sugestia kategorii (AI) | String(100) | ❌ | Kategoria zasugerowana przez AI |
| `dvlp_aiconfidence` | Pewność AI | Decimal(3,2) | ❌ | Poziom pewności AI (0.00-1.00) |

#### Atrybuty - Wybory użytkownika

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_usermpk` | Wybrane MPK | String(50) | ❌ | MPK wybrane przez użytkownika |
| `dvlp_usercategory` | Wybrana kategoria | String(100) | ❌ | Kategoria wybrana przez użytkownika |
| `dvlp_feedbacktype` | Typ feedbacku | OptionSet | ✅ | applied/modified/rejected |

#### Atrybuty - Systemowe

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia rekordu |
| `createdby` | Utworzył | Lookup (User) | Auto | Użytkownik który zapisał feedback |
| `statecode` | Status | State | Auto | Active/Inactive |
| `statuscode` | Status Reason | Status | Auto | Powód statusu |

#### Option Set - dvlp_feedbacktype

**Nazwa wyświetlana:** Typ Feedback AI  
**Typ:** Local OptionSet (lub Global)

| Wartość | Label (EN) | Label (PL) | Kolor | Opis |
|---------|------------|------------|-------|------|
| 100000000 | Applied | Zaakceptowano | Green | Użytkownik zaakceptował sugestię AI |
| 100000001 | Modified | Zmieniono | Orange | Użytkownik zmienił sugestię AI |
| 100000002 | Rejected | Odrzucono | Red | Użytkownik odrzucił sugestię AI |

#### Indeksy

| Nazwa | Atrybuty | Typ | Uzasadnienie |
|-------|----------|-----|--------------|
| `PK_aifeedback` | `dvlp_aifeedbackid` | Primary | Klucz główny |
| `IX_tenant_supplier` | `dvlp_tenantnip`, `dvlp_suppliernip` | Non-unique | Agregacja per dostawca |
| `IX_createdon` | `createdon` | Non-unique | Sortowanie chronologiczne |
| `IX_feedbacktype` | `dvlp_feedbacktype` | Non-unique | Filtrowanie typów feedbacku |

#### Widoki (Views)

| Nazwa | Typ | Filtr | Domyślne kolumny |
|-------|-----|-------|------------------|
| Wszystkie feedbacki | Public | - | Dostawca, Sugestia AI, Wybór usera, Typ, Data |
| Zaakceptowane | Public | `feedbacktype = applied` | Dostawca, MPK, Kategoria |
| Zmienione | Public | `feedbacktype = modified` | Dostawca, Sugestia AI, Wybór usera |
| Per dostawca | Public | GROUP BY suppliernip | Dostawca, Count, Avg confidence |

#### Bezpieczeństwo

- **Read**: Wszyscy użytkownicy KSeF
- **Create**: System (via API) przy zapisie faktury
- **Update**: Brak (rekordy są immutable)
- **Delete**: Admin only

---

### dvlp_ksefmpkcenter

**Nazwa wyświetlana:** Centrum Kosztów MPK / KSeF MPK Center  
**Nazwa logiczna:** `dvlp_ksefmpkcenter`  
**Nazwa zestawu:** `dvlp_ksefmpkcenters`  
**Typ własności:** Organization  
**Opis:** Centra kosztów (MPK) jako dedykowane encje z konfiguracją budżetu i zatwierdzania

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefmpkcenterid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(100) | ✅ | Nazwa centrum kosztów (Primary Name), np. "IT & Software" |
| `dvlp_description` | Opis | Memo | ❌ | Dodatkowy opis |
| `dvlp_settingid` | Ustawienie KSeF | Lookup (dvlp_ksefsetting) | ✅ | Konfiguracja firmy/tenanta |
| `dvlp_isactive` | Aktywna | Boolean | ✅ | Czy centrum jest aktywne |
| `dvlp_approvalrequired` | Wymagane zatwierdzenie | Boolean | ✅ | Czy faktury przypisane do tego MPK wymagają zatwierdzenia |
| `dvlp_approvalslahours` | SLA zatwierdzenia (godz.) | Integer | ❌ | Maksymalna liczba godzin na zatwierdzenie przed alertem SLA |
| `dvlp_approvaleffectivefrom` | Zatwierdzanie od daty | DateOnly | ❌ | Jeśli ustawiono, tylko faktury wystawione od tej daty wymagają zatwierdzenia. Faktury sprzed tej daty są traktowane jako "nie wymaga zatwierdzenia". Null oznacza, że wszystkie faktury wymagają zatwierdzenia |
| `dvlp_budgetamount` | Kwota budżetu | Decimal(12,2) | ❌ | Limit budżetowy |
| `dvlp_budgetperiod` | Okres budżetowy | OptionSet (dvlp_budgetperiod) | ❌ | Typ okresu: miesięczny/kwartalny/półroczny/roczny |
| `dvlp_budgetstartdate` | Początek okresu budżetowego | Date | ❌ | Data początkowa okresu budżetowego |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia rekordu |
| `modifiedon` | Zmodyfikowano | DateTime | Auto | Data ostatniej modyfikacji |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_mpkcenters` |
| 1:N | dvlp_ksefmpkapprover | `dvlp_mpkcenter_approvers` |
| 1:N | dvlp_ksefinvoice | `dvlp_mpkcenter_invoices` |
| 1:N | dvlp_ksefnotification | `dvlp_mpkcenter_notifications` |

---

### dvlp_ksefmpkapprover

**Nazwa wyświetlana:** Zatwierdzający MPK / KSeF MPK Approver  
**Nazwa logiczna:** `dvlp_ksefmpkapprover`  
**Nazwa zestawu:** `dvlp_ksefmpkapprovers`  
**Typ własności:** Organization  
**Opis:** Zatwierdzający przypisani do centrów kosztów — łączy użytkowników systemowych z centrami MPK

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefmpkapproverid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(100) | Auto | Auto: "{Nazwa użytkownika} – {Nazwa MPK}" |
| `dvlp_mpkcenterid` | Centrum kosztów MPK | Lookup (dvlp_ksefmpkcenter) | ✅ | Powiązanie z centrum kosztów |
| `dvlp_systemuserid` | Użytkownik systemowy | Lookup (systemuser) | ✅ | Użytkownik Dataverse przypisany jako zatwierdzający |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefmpkcenter | `dvlp_mpkcenter_approvers` |
| N:1 | systemuser | `dvlp_systemuser_approvers` |

---

### dvlp_ksefnotification

**Nazwa wyświetlana:** Powiadomienie KSeF / KSeF Notification  
**Nazwa logiczna:** `dvlp_ksefnotification`  
**Nazwa zestawu:** `dvlp_ksefnotifications`  
**Typ własności:** Organization  
**Opis:** Powiadomienia w aplikacji dla alertów SLA, ostrzeżeń budżetowych i decyzji zatwierdzania

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefnotificationid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Tytuł | String(200) | ✅ | Tytuł powiadomienia (Primary Name) |
| `dvlp_recipientid` | Odbiorca | Lookup (systemuser) | ✅ | Użytkownik systemowy otrzymujący powiadomienie |
| `dvlp_settingid` | Ustawienie KSeF | Lookup (dvlp_ksefsetting) | ✅ | Konfiguracja firmy/tenanta |
| `dvlp_type` | Typ powiadomienia | OptionSet (dvlp_notificationtype) | ✅ | Typ powiadomienia |
| `dvlp_message` | Treść | String(1000) | ❌ | Szczegółowa treść powiadomienia |
| `dvlp_isread` | Przeczytane | Boolean | ✅ | Czy użytkownik przeczytał powiadomienie |
| `dvlp_isdismissed` | Odrzucone | Boolean | ✅ | Czy użytkownik odrzucił powiadomienie |
| `dvlp_invoiceid` | Faktura | Lookup (dvlp_ksefinvoice) | ❌ | Powiązana faktura (jeśli dotyczy) |
| `dvlp_mpkcenterid` | Centrum kosztów MPK | Lookup (dvlp_ksefmpkcenter) | ❌ | Powiązane centrum kosztów (jeśli dotyczy) |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia rekordu |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | systemuser | `dvlp_recipient_notifications` |
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_notifications` |
| N:1 | dvlp_ksefinvoice | `dvlp_invoice_notifications` |
| N:1 | dvlp_ksefmpkcenter | `dvlp_mpkcenter_notifications` |

| N:1 | dvlp_ksefmpkcenter | `dvlp_mpkcenter_notifications` |

---

### dvlp_ksefsupplier

**Nazwa wyświetlana:** Dostawca KSeF / KSeF Supplier  
**Nazwa logiczna:** `dvlp_ksefsupplier`  
**Nazwa zestawu:** `dvlp_ksefsuppliers`  
**Typ własności:** Organization  
**Opis:** Rejestr dostawców dla zarządzania fakturami samofakturowania

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefsupplierid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(255) | ✅ | Pełna nazwa dostawcy (Primary Name) |
| `dvlp_nip` | NIP | String(10) | ✅ | Numer identyfikacji podatkowej dostawcy |
| `dvlp_shortname` | Nazwa skrócona | String(100) | ❌ | Krótka nazwa wyświetlana |
| `dvlp_regon` | REGON | String(14) | ❌ | Numer REGON |
| `dvlp_krs` | KRS | String(10) | ❌ | Numer KRS |
| `dvlp_street` | Ulica | String(250) | ❌ | Adres ulicy |
| `dvlp_city` | Miasto | String(100) | ❌ | Miasto |
| `dvlp_postalcode` | Kod pocztowy | String(10) | ❌ | Kod pocztowy |
| `dvlp_country` | Kraj | String(100) | ❌ | Kraj |
| `dvlp_email` | Email | String(200) | ❌ | Email kontaktowy |
| `dvlp_phone` | Telefon | String(20) | ❌ | Telefon kontaktowy |
| `dvlp_bankaccount` | Konto bankowe | String(50) | ❌ | Numer rachunku IBAN |
| `dvlp_vatstatus` | Status VAT | String(50) | ❌ | Status podatnika VAT z API MF |
| `dvlp_vatstatusdate` | Data statusu VAT | Date | ❌ | Data ostatniego sprawdzenia statusu VAT |
| `dvlp_paymenttermsdays` | Termin płatności (dni) | Integer | ❌ | Domyślny termin płatności w dniach |
| `dvlp_defaultcategory` | Domyślna kategoria | String(100) | ❌ | Domyślna kategoria kosztowa |
| `dvlp_notes` | Notatki | Memo(10000) | ❌ | Notatki tekstowe |
| `dvlp_tags` | Tagi | String(500) | ❌ | Tagi oddzielone przecinkami |
| `dvlp_hasselfbillingagreement` | Ma umowę SB | Boolean | ❌ | Prawda gdy istnieje aktywna umowa samofakturowania |
| `dvlp_selfbillingagreementdate` | Data umowy SB | Date | ❌ | Data umowy samofakturowania |
| `dvlp_selfbillingagreementexpiry` | Wygaśnięcie umowy SB | Date | ❌ | Data wygaśnięcia umowy |
| `dvlp_firstinvoicedate` | Data pierwszej faktury | Date | ❌ | Cache: data najwcześniejszej faktury |
| `dvlp_lastinvoicedate` | Data ostatniej faktury | Date | ❌ | Cache: data najnowszej faktury |
| `dvlp_totalinvoicecount` | Liczba faktur | Integer | ❌ | Cache: łączna liczba faktur |
| `dvlp_totalgrossamount` | Łączna kwota brutto | Decimal(12,2) | ❌ | Cache: łączna kwota brutto |
| `dvlp_status` | Status | OptionSet (dvlp_supplierstatus) | ✅ | Aktywny/Nieaktywny/Zablokowany |
| `dvlp_source` | Źródło | OptionSet (dvlp_suppliersource) | ❌ | Sposób dodania dostawcy |
| `dvlp_settingid` | Ustawienie KSeF | Lookup (dvlp_ksefsetting) | ✅ | Izolacja tenanta |
| `dvlp_defaultmpkid` | Domyślne MPK | Lookup (dvlp_ksefmpkcenter) | ❌ | Domyślne centrum kosztów MPK |
| `dvlp_sbcontactuserid` | Zatwierdzający SB | Lookup (systemuser) | ❌ | Użytkownik systemowy odpowiedzialny za zatwierdzanie faktur samofakturowania tego dostawcy |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia |
| `modifiedon` | Zmodyfikowano | DateTime | Auto | Data modyfikacji |

#### Klucze alternatywne

| Nazwa | Atrybuty | Opis |
|-------|----------|------|
| `dvlp_supplier_nip_setting` | `dvlp_nip`, `dvlp_settingid` | Unikalny NIP dostawcy per tenant |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_suppliers` |
| N:1 | dvlp_ksefmpkcenter | `dvlp_ksefmpkcenter_suppliers` |
| N:1 | systemuser | `dvlp_systemuser_supplier_sbcontact` |
| 1:N | dvlp_ksefsbagrement | `dvlp_ksefsupplier_sbagrements` |
| 1:N | dvlp_ksefselfbillingtemplate | `dvlp_ksefsupplier_sbtemplates` |
| 1:N | dvlp_ksefselfbillinginvoice | `dvlp_ksefsupplier_sbinvoices` |
| 1:N | dvlp_ksefinvoice | `dvlp_ksefsupplier_invoices` |

---

### dvlp_ksefsbagrement

**Nazwa wyświetlana:** Umowa samofakturowania KSeF / KSeF SB Agreement  
**Nazwa logiczna:** `dvlp_ksefsbagrement`  
**Nazwa zestawu:** `dvlp_ksefsbagrements`  
**Typ własności:** Organization  
**Opis:** Umowy samofakturowania między nabywcą a dostawcą

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefsbagrement_id` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(255) | ✅ | Nazwa umowy (Primary Name) |
| `dvlp_agreementdate` | Data umowy | Date | ✅ | Data podpisania umowy |
| `dvlp_validfrom` | Ważna od | Date | ✅ | Data rozpoczęcia ważności |
| `dvlp_validto` | Ważna do | Date | ❌ | Data zakończenia ważności (null = bezterminowo) |
| `dvlp_renewaldate` | Data odnowienia | Date | ❌ | Data następnego odnowienia |
| `dvlp_approvalprocedure` | Procedura zatwierdzania | String(500) | ❌ | Opis procedury akceptacji faktur |
| `dvlp_status` | Status | OptionSet (dvlp_sbagreementstatus) | ✅ | Aktywna/Wygasła/Rozwiązana |
| `dvlp_credentialreference` | Referencja poświadczeń | String(200) | ❌ | Referencja do certyfikatu autoryzacji |
| `dvlp_notes` | Notatki | Memo(10000) | ❌ | Notatki o umowie |
| `dvlp_hasdocument` | Ma dokument | Boolean | ❌ | Prawda gdy dokument umowy został przesłany |
| `dvlp_documentfilename` | Nazwa pliku dokumentu | String(255) | ❌ | Nazwa przesłanego pliku |
| `dvlp_supplierid` | Dostawca | Lookup (dvlp_ksefsupplier) | ✅ | Dostawca, do którego należy umowa |
| `dvlp_settingid` | Ustawienie KSeF | Lookup (dvlp_ksefsetting) | ✅ | Izolacja tenanta |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia |
| `modifiedon` | Zmodyfikowano | DateTime | Auto | Data modyfikacji |

#### Klucze alternatywne

| Nazwa | Atrybuty | Opis |
|-------|----------|------|
| `dvlp_sbagrement_name_supplier` | `dvlp_name`, `dvlp_supplierid` | Unikalna nazwa umowy per dostawca |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefsupplier | `dvlp_ksefsupplier_sbagrements` |
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sbagrements` |
| 1:N | dvlp_ksefinvoice | `dvlp_ksefsbagrement_invoices` |

---

### dvlp_ksefselfbillingtemplate

**Nazwa wyświetlana:** Szablon samofakturowania KSeF / KSeF SB Template  
**Nazwa logiczna:** `dvlp_ksefselfbillingtemplate`  
**Nazwa zestawu:** `dvlp_ksefselfbillingtemplates`  
**Typ własności:** Organization  
**Opis:** Szablony do automatycznego generowania faktur samofakturowania

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefselfbillingtemplateid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Nazwa | String(255) | ✅ | Nazwa szablonu (Primary Name) |
| `dvlp_description` | Opis | Memo(2000) | ❌ | Opis szablonu |
| `dvlp_itemdescription` | Opis pozycji | String(500) | ✅ | Domyślny opis pozycji fakturowej |
| `dvlp_quantity` | Ilość | Decimal(6,4) | ❌ | Domyślna ilość |
| `dvlp_unit` | Jednostka | String(20) | ❌ | Jednostka miary (np. szt., godz., usł.) |
| `dvlp_unitprice` | Cena jednostkowa | Decimal(9,2) | ❌ | Domyślna cena netto |
| `dvlp_vatrate` | Stawka VAT | String(10) | ❌ | Kod stawki VAT (23, 8, 5, 0, zw, np) |
| `dvlp_currency` | Waluta | String(3) | ❌ | Kod waluty ISO 4217 (PLN, EUR) |
| `dvlp_isactive` | Aktywny | Boolean | ✅ | Nieaktywne szablony ukryte w listach wyboru |
| `dvlp_sortorder` | Kolejność sortowania | Integer | ❌ | Pozycja wyświetlania na liście szablonów |
| `dvlp_paymenttermsdays` | Termin płatności (dni) | Integer | ❌ | Domyślny termin płatności w dniach |
| `dvlp_supplierid` | Dostawca | Lookup (dvlp_ksefsupplier) | ✅ | Dostawca, do którego należy szablon |
| `dvlp_settingid` | Ustawienie KSeF | Lookup (dvlp_ksefsetting) | ✅ | Izolacja tenanta |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia |
| `modifiedon` | Zmodyfikowano | DateTime | Auto | Data modyfikacji |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefsupplier | `dvlp_ksefsupplier_sbtemplates` |
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sbtemplates` |

---

### dvlp_ksefselfbillinginvoice

**Nazwa wyświetlana:** Samofaktura KSeF / KSeF Self-Billing Invoice  
**Nazwa logiczna:** `dvlp_ksefselfbillinginvoice`  
**Nazwa zestawu:** `dvlp_ksefselfbillinginvoices`  
**Typ własności:** User  
**Opis:** Dedykowana tabela dla faktur samofakturowania (wystawianych przez nabywcę)

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefselfbillinginvoiceid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Numer faktury | String(200) | ✅ | Numer faktury (Primary Name) |
| `dvlp_invoicedate` | Data wystawienia | Date | ✅ | Data wystawienia faktury |
| `dvlp_duedate` | Termin płatności | Date | ❌ | Data terminu płatności |
| `dvlp_netamount` | Kwota netto | Decimal(9,2) | ❌ | Łączna kwota netto |
| `dvlp_vatamount` | Kwota VAT | Decimal(9,2) | ❌ | Łączna kwota VAT |
| `dvlp_grossamount` | Kwota brutto | Decimal(9,2) | ❌ | Łączna kwota brutto |
| `dvlp_currency` | Waluta | String(3) | ❌ | Kod waluty (domyślnie PLN) |
| `dvlp_status` | Status | OptionSet (dvlp_selfbillingstatus) | ✅ | Status workflow samofakturowania |
| `dvlp_sellerrejectionreason` | Powód odrzucenia | String(1000) | ❌ | Powód odrzucenia przez sprzedawcę |
| `dvlp_sentdate` | Data wysłania | DateTime | ❌ | Data wysłania do KSeF |
| `dvlp_ksefreferencenumber` | Numer referencyjny KSeF | String(100) | ❌ | Numer nadany po wysłaniu do KSeF |
| `dvlp_settingid` | Ustawienie KSeF | Lookup (dvlp_ksefsetting) | ✅ | Izolacja tenanta |
| `dvlp_supplierid` | Dostawca | Lookup (dvlp_ksefsupplier) | ✅ | Dostawca (sprzedawca) |
| `dvlp_sbagreementid` | Umowa SB | Lookup (dvlp_ksefsbagrement) | ❌ | Umowa samofakturowania |
| `dvlp_kseFinvoiceid` | Faktura KSeF | Lookup (dvlp_ksefinvoice) | ❌ | Powiązanie z rekordem faktury KSeF po wysłaniu |
| `dvlp_mpkcenterid` | Centrum MPK | Lookup (dvlp_ksefmpkcenter) | ❌ | Centrum kosztów do alokacji |
| `dvlp_submittedbyuserid` | Przesłane przez | Lookup (systemuser) | ❌ | Użytkownik systemowy, który przesłał fakturę do weryfikacji sprzedawcy |
| `dvlp_submittedat` | Data przesłania | DateTime | ❌ | Znacznik czasu przesłania faktury do weryfikacji |
| `dvlp_approvedbyuserid` | Zatwierdzono/Odrzucono przez | Lookup (systemuser) | ❌ | Użytkownik systemowy, który zatwierdził lub odrzucił fakturę |
| `dvlp_approvedat` | Data zatwierdzenia/odrzucenia | DateTime | ❌ | Znacznik czasu zatwierdzenia lub odrzucenia faktury |
| `statecode` | Stan | State | Auto | Aktywny/Nieaktywny |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia |
| `modifiedon` | Zmodyfikowano | DateTime | Auto | Data modyfikacji |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefsetting | `dvlp_ksefsetting_sbinvoices` |
| N:1 | dvlp_ksefsupplier | `dvlp_ksefsupplier_sbinvoices` |
| N:1 | dvlp_ksefsbagrement | `dvlp_ksefsbagrement_sbinvoices` |
| N:1 | dvlp_ksefinvoice | `dvlp_ksefinvoice_sbinvoices` |
| N:1 | dvlp_ksefmpkcenter | `dvlp_ksefmpkcenter_sbinvoices` |
| N:1 | systemuser | `dvlp_systemuser_sbinvoice_submittedby` |
| N:1 | systemuser | `dvlp_systemuser_sbinvoice_approvedby` |
| 1:N | dvlp_ksefselfbillinglineitem | `dvlp_ksefselfbillinginvoice_lineitems` |

---

### dvlp_ksefselfbillinglineitem

**Nazwa wyświetlana:** Pozycja samofaktury KSeF / KSeF SB Line Item  
**Nazwa logiczna:** `dvlp_ksefselfbillinglineitem`  
**Nazwa zestawu:** `dvlp_ksefselfbillinglineitems`  
**Typ własności:** User  
**Opis:** Pozycje faktur samofakturowania

#### Atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefselfbillinglineitemid` | ID | Uniqueidentifier | Auto | Klucz główny |
| `dvlp_name` | Opis pozycji | String(500) | ✅ | Opis pozycji (Primary Name) |
| `dvlp_quantity` | Ilość | Decimal(6,3) | ✅ | Ilość |
| `dvlp_unit` | Jednostka | String(20) | ✅ | Jednostka miary |
| `dvlp_unitprice` | Cena jednostkowa | Decimal(9,2) | ✅ | Cena jednostkowa netto |
| `dvlp_vatrate` | Stawka VAT | Integer | ✅ | Stawka VAT w procentach (23, 8, 5, 0, -1=zw) |
| `dvlp_netamount` | Kwota netto | Decimal(9,2) | ❌ | Kwota netto pozycji |
| `dvlp_vatamount` | Kwota VAT | Decimal(9,2) | ❌ | Kwota VAT pozycji |
| `dvlp_grossamount` | Kwota brutto | Decimal(9,2) | ❌ | Kwota brutto pozycji |
| `dvlp_paymenttermsdays` | Termin płatności (dni) | Integer | ❌ | Termin płatności dla pozycji |
| `dvlp_sortorder` | Kolejność | Integer | ❌ | Kolejność wyświetlania pozycji |
| `dvlp_sbinvoiceid` | Samofaktura | Lookup (dvlp_ksefselfbillinginvoice) | ✅ | Faktura nadrzędna |
| `dvlp_templateid` | Szablon | Lookup (dvlp_ksefselfbillingtemplate) | ❌ | Szablon, z którego utworzono pozycję (traceability) |
| `createdon` | Utworzono | DateTime | Auto | Data utworzenia |
| `modifiedon` | Zmodyfikowano | DateTime | Auto | Data modyfikacji |

#### Relacje

| Typ | Powiązana tabela | Nazwa relacji |
|-----|------------------|---------------|
| N:1 | dvlp_ksefselfbillinginvoice | `dvlp_ksefselfbillinginvoice_lineitems` |
| N:1 | dvlp_ksefselfbillingtemplate | `dvlp_ksefselfbillingtemplate_lineitems` |

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
| 100000000 | VAT Invoice | Faktura VAT |
| 100000001 | Corrective | Faktura korygująca |
| 100000002 | Advance | Faktura zaliczkowa |

---

### dvlp_currency

**Nazwa wyświetlana:** Waluta  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) |
|---------|------------|------------|
| 100000000 | PLN | PLN |
| 100000001 | USD | USD |
| 100000002 | EUR | EUR |

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

**Nazwa wyświetlana:** MPK / Cost Center (Miejsce Powstawania Kosztów)  
**Typ:** Global OptionSet  
**Opis:** Miejsca Powstawania Kosztów dla kategoryzacji

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Consultants | Konsultanci | Usługi konsultingowe, szkolenia, outsourcing |
| 100000002 | BackOffice | Back Office | Biuro, administracja, sprzątanie |
| 100000003 | Management | Zarząd | Zarząd, strategia, reprezentacja |
| 100000004 | Cars | Samochody | Pojazdy, paliwo, serwis, ubezpieczenia |
| 100000005 | Legal | Prawne | Usługi prawne, notarialne, compliance |
| 100000006 | Marketing | Marketing | Reklama, promocja, eventy |
| 100000007 | Sales | Sprzedaż | Sprzedaż, CRM, lead generation |
| 100000008 | Delivery | Realizacja | Projekty, narzędzia developerskie |
| 100000009 | Finance | Finanse | Księgowość, audyt, bankowość |
| 100000010 | Other | Inne | Wszystko inne |

#### Mapowanie MPK enum → Dataverse OptionSet

| MPK (TypeScript) | Wartość Dataverse |
|------------------|-------------------|
| `Consultants` | 100000001 |
| `BackOffice` | 100000002 |
| `Management` | 100000003 |
| `Cars` | 100000004 |
| `Legal` | 100000005 |
| `Marketing` | 100000006 |
| `Sales` | 100000007 |
| `Delivery` | 100000008 |
| `Finance` | 100000009 |
| `Other` | 100000010 |

---

### dvlp_feedbacktype

**Nazwa wyświetlana:** Typ Feedback AI  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Kolor | Opis |
|---------|------------|------------|-------|------|
| 100000000 | Applied | Zaakceptowano | Green | Użytkownik zaakceptował sugestię AI bez zmian |
| 100000001 | Modified | Zmieniono | Orange | Użytkownik zmienił sugestię AI |
| 100000002 | Rejected | Odrzucono | Red | Użytkownik odrzucił sugestię AI |

---

### dvlp_approvalstatus

**Nazwa wyświetlana:** Status zatwierdzenia  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Kolor | Opis |
|---------|------------|------------|-------|------|
| 0 | Draft | Szkic | Szary | Faktura jeszcze nie wysłana do zatwierdzenia |
| 1 | Pending | Oczekuje | Żółty | Oczekuje na decyzję zatwierdzającego |
| 2 | Approved | Zatwierdzono | Zielony | Zatwierdzona przez zatwierdzającego |
| 3 | Rejected | Odrzucono | Czerwony | Odrzucona przez zatwierdzającego |
| 4 | Cancelled | Anulowano | Szary | Wniosek o zatwierdzenie anulowany |

---

### dvlp_budgetperiod

**Nazwa wyświetlana:** Okres budżetowy  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 0 | Monthly | Miesięczny | Budżet resetowany co miesiąc |
| 1 | Quarterly | Kwartalny | Budżet resetowany co kwartał |
| 2 | Half-yearly | Półroczny | Budżet resetowany co 6 miesięcy |
| 3 | Annual | Roczny | Budżet resetowany co rok |

---

### dvlp_notificationtype

**Nazwa wyświetlana:** Typ powiadomienia  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 0 | Approval Requested | Prośba o zatwierdzenie | Nowa faktura wysłana do zatwierdzenia |
| 1 | SLA Exceeded | Przekroczono SLA | Przekroczono czas SLA zatwierdzania |
| 2 | Budget Warning 80% | Ostrzeżenie budżetowe 80% | Budżet MPK osiągnął 80% wykorzystania |
| 3 | Budget Exceeded | Przekroczono budżet | Przekroczono budżet MPK |
| 4 | Approval Decided | Decyzja zatwierdzenia | Podjęto decyzję (zatwierdzono/odrzucono) |

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

### dvlp_supplierstatus

**Nazwa wyświetlana:** Status dostawcy  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Active | Aktywny | Dostawca aktywny — może być używany w nowych fakturach |
| 100000002 | Inactive | Nieaktywny | Dostawca nieaktywny — ukryty z list wyboru |
| 100000003 | Blocked | Zablokowany | Dostawca zablokowany — niedostępny operacyjnie |

---

### dvlp_suppliersource

**Nazwa wyświetlana:** Źródło dostawcy  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Manual | Ręcznie | Wprowadzony ręcznie przez użytkownika |
| 100000002 | KSeF Sync | Synchronizacja KSeF | Utworzony automatycznie podczas synchronizacji KSeF |
| 100000003 | Import | Import | Zaimportowany z pliku CSV/XLSX |

---

### dvlp_sbagreementstatus

**Nazwa wyświetlana:** Status umowy samofakturowania  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Active | Aktywna | Umowa obowiązuje |
| 100000002 | Expired | Wygasła | Umowa wygasła po dacie validTo |
| 100000003 | Terminated | Rozwiązana | Umowa rozwiązana przed terminem |

---

### dvlp_selfbillingstatus

**Nazwa wyświetlana:** Status samofakturowania  
**Typ:** Global OptionSet

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Draft | Szkic | Faktura w przygotowaniu |
| 100000002 | Pending Approval | Oczekuje na akceptację | Wysłana do dostawcy do zatwierdzenia |
| 100000003 | Approved | Zatwierdzona | Zaakceptowana przez dostawcę |
| 100000004 | Rejected | Odrzucona | Odrzucona przez dostawcę |
| 100000005 | Sent to KSeF | Wysłana do KSeF | Przekazana do systemu KSeF |

---

## Relacje

### Diagram relacji

```mermaid
graph TD
    Setting["dvlp_ksefsetting (1)"] -->|1:N| Session["dvlp_ksefsession"]
    Setting -->|1:N| SyncLog["dvlp_ksefsynclog"]
    Setting -->|1:N| Invoice1["dvlp_ksefinvoice<br/>(via dvlp_ksefsettingid)"]
    Setting -->|1:N| MpkCenter["dvlp_ksefmpkcenter"]
    Setting -->|1:N| Notification["dvlp_ksefnotification"]
    Setting -->|1:N| Supplier["dvlp_ksefsupplier"]
    Setting -->|1:N| SbAgreement["dvlp_ksefsbagrement"]
    Setting -->|1:N| SbTemplate["dvlp_ksefselfbillingtemplate"]
    Session -->|1:N| Invoice2["dvlp_ksefinvoice<br/>(via dvlp_ksefsessionid)"]
    Invoice1 -->|1:N| Feedback["dvlp_aifeedback<br/>(via dvlp_invoiceid)"]
    Invoice1 -->|1:N| Notification
    MpkCenter -->|1:N| Approver["dvlp_ksefmpkapprover"]
    MpkCenter -->|1:N| Invoice1
    MpkCenter -->|1:N| Notification
    MpkCenter -->|1:N| Supplier
    Supplier -->|1:N| SbAgreement
    Supplier -->|1:N| SbTemplate
    Supplier -->|1:N| Invoice1
    SbAgreement -->|1:N| Invoice1
    SystemUser["systemuser"] -->|1:N| Approver
    SystemUser -->|1:N| Notification
```

<details>
<summary>ASCII fallback (kliknij aby rozwinąć)</summary>

```
dvlp_ksefsetting (1)
    │
    ├──── (N) dvlp_ksefsession
    │           │
    │           └──── (N) dvlp_ksefinvoice (via dvlp_ksefsessionid)
    │
    ├──── (N) dvlp_ksefsynclog
    │
    ├──── (N) dvlp_ksefmpkcenter (1)
    │           ├──── (N) dvlp_ksefmpkapprover
    │           ├──── (N) dvlp_ksefinvoice (via dvlp_mpkcenterid)
    │           └──── (N) dvlp_ksefnotification
    │
    ├──── (N) dvlp_ksefnotification
    │
    └──── (N) dvlp_ksefinvoice (via dvlp_ksefsettingid)
                    │
                    ├──── (N) dvlp_aifeedback (via dvlp_invoiceid)
                    └──── (N) dvlp_ksefnotification
```

</details>

### Definicje relacji

| Relacja | Typ | Parent | Child | Cascade |
|---------|-----|--------|-------|---------|
| `dvlp_ksefsetting_sessions` | 1:N | dvlp_ksefsetting | dvlp_ksefsession | Delete: Cascade |
| `dvlp_ksefsetting_synclogs` | 1:N | dvlp_ksefsetting | dvlp_ksefsynclog | Delete: Cascade |
| `dvlp_ksefsetting_invoices` | 1:N | dvlp_ksefsetting | dvlp_ksefinvoice | Delete: Restrict |
| `dvlp_ksefsession_synclogs` | 1:N | dvlp_ksefsession | dvlp_ksefsynclog | Delete: RemoveLink |
| `dvlp_ksefsession_invoices` | 1:N | dvlp_ksefsession | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_ksefinvoice_parent` | 1:N | dvlp_ksefinvoice | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_ksefinvoice_feedbacks` | 1:N | dvlp_ksefinvoice | dvlp_aifeedback | Delete: Cascade |
| `dvlp_ksefsetting_mpkcenters` | 1:N | dvlp_ksefsetting | dvlp_ksefmpkcenter | Delete: Restrict |
| `dvlp_mpkcenter_approvers` | 1:N | dvlp_ksefmpkcenter | dvlp_ksefmpkapprover | Delete: Cascade |
| `dvlp_mpkcenter_invoices` | 1:N | dvlp_ksefmpkcenter | dvlp_ksefinvoice | Delete: RemoveLink |
| `dvlp_mpkcenter_notifications` | 1:N | dvlp_ksefmpkcenter | dvlp_ksefnotification | Delete: RemoveLink |
| `dvlp_ksefsetting_notifications` | 1:N | dvlp_ksefsetting | dvlp_ksefnotification | Delete: Cascade |
| `dvlp_invoice_notifications` | 1:N | dvlp_ksefinvoice | dvlp_ksefnotification | Delete: RemoveLink |
| `dvlp_recipient_notifications` | 1:N | systemuser | dvlp_ksefnotification | Delete: RemoveLink |
| `dvlp_systemuser_approvers` | 1:N | systemuser | dvlp_ksefmpkapprover | Delete: Cascade |

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
| dvlp_aifeedback | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefmpkcenter | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefmpkapprover | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefnotification | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |

### KSeF Reader

Dostęp tylko do odczytu.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefinvoice | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_aifeedback | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkcenter | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkapprover | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefnotification | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

### KSeF Operator

Może wykonywać synchronizację i zarządzać fakturami, ale nie może zmieniać konfiguracji.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefinvoice | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_aifeedback | ✅ Org | ✅ Org | ❌ | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefmpkcenter | ❌ | ✅ Org | ❌ | ❌ | ❌ | ✅ Org |
| dvlp_ksefmpkapprover | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefnotification | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

### KSeF Approver

Może akceptować faktury do płatności.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefinvoice | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |
| dvlp_aifeedback | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkcenter | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefmpkapprover | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefnotification | ❌ | ✅ Org | ✅ Org | ❌ | ❌ | ❌ |

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
| dvlp_aifeedback | IX_tenant_supplier | `dvlp_tenantnip`, `dvlp_suppliernip` | Agregacja per dostawca dla uczenia |
| dvlp_aifeedback | IX_createdon | `createdon` | Sortowanie chronologiczne |

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
  'VAT': 100000000,        // VAT Invoice
  'CORRECTION': 100000001, // Corrective
  'ADVANCE': 100000002     // Advance
};

// Mapowanie walut
const currencyMapping = {
  'PLN': 100000000,
  'USD': 100000001,
  'EUR': 100000002
};

// Mapowanie MPK (Cost Center)
const costCenterMapping = {
  'Consultants': 100000001,
  'BackOffice': 100000002,
  'Management': 100000003,
  'Cars': 100000004,
  'Legal': 100000005,
  'Marketing': 100000006,
  'Sales': 100000007,
  'Delivery': 100000008,
  'Finance': 100000009,
  'Other': 100000010
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

## Wdrożenie pól AI

### Kolejność kroków

#### Krok 1: Utwórz Option Set `dvlp_costcenter` (jeśli nie istnieje)

1. Przejdź do **Power Apps** → **Solutions** → **dvlp-ksef**
2. Dodaj nowy **Choice** (Global OptionSet):
   - Name: `dvlp_costcenter`
   - Display Name: `Cost Center / MPK`
   - Dodaj wartości wg tabeli w sekcji [dvlp_costcenter](#dvlp_costcenter)

#### Krok 2: Utwórz Option Set `dvlp_feedbacktype`

1. Dodaj nowy **Choice** (Global OptionSet):
   - Name: `dvlp_feedbacktype`
   - Display Name: `Typ Feedback AI`
   - Dodaj wartości: Applied (100000000), Modified (100000001), Rejected (100000002)

#### Krok 3: Dodaj pola AI do tabeli `dvlp_ksefinvoice`

1. Przejdź do tabeli **dvlp_ksefinvoice**
2. Kliknij **+ New column** dla każdego pola AI
3. Wypełnij wg konfiguracji w sekcji [Atrybuty - Kategoryzacja AI](#atrybuty---kategoryzacja-ai)
4. **Save** po każdym polu

#### Krok 4: Utwórz tabelę `dvlp_aifeedback`

1. Utwórz tabelę wg specyfikacji w sekcji [dvlp_aifeedback](#dvlp_aifeedback)
2. Dodaj wszystkie atrybuty, indeksy i widoki

#### Krok 5: Zaktualizuj formularz

1. Otwórz główny formularz **Faktura KSeF**
2. Dodaj nową sekcję "Sugestie AI" w zakładce Kategoryzacja
3. Przeciągnij nowe pola AI do sekcji
4. Ustaw pola AI jako **Read-only**
5. **Save and Publish**

#### Krok 6: Utwórz widoki AI

1. Dodaj widoki: "Faktury do kategoryzacji AI", "Skategoryzowane przez AI", "Niska pewność AI"
2. Skonfiguruj filtry i kolumny wg specyfikacji

#### Krok 7: Opublikuj zmiany

1. Kliknij **Publish all customizations**
2. Zweryfikuj w **Solutions** że wersja się zwiększyła

### Checklist wdrożenia

- [ ] Option Set `dvlp_costcenter` utworzony z 10 wartościami
- [ ] Option Set `dvlp_feedbacktype` utworzony z 3 wartościami
- [ ] Pole `dvlp_aimpksuggestion` dodane jako Choice
- [ ] Pole `dvlp_aicategorysuggestion` dodane jako Text(100)
- [ ] Pole `dvlp_aidescription` dodane jako Text(500)
- [ ] Pole `dvlp_airationale` dodane jako Text(500)
- [ ] Pole `dvlp_aiconfidence` dodane jako Decimal(3,2)
- [ ] Pole `dvlp_aiprocessedat` dodane jako DateTime
- [ ] Formularz zaktualizowany z sekcją "Sugestie AI"
- [ ] Widoki AI utworzone (do kategoryzacji, skategoryzowane, niska pewność)
- [ ] Tabela `dvlp_aifeedback` utworzona
- [ ] Customizations opublikowane
- [ ] Kod zaktualizowany (config.ts, mappers.ts, ai-categorize.ts)
- [ ] Testy przeszły

### Szacowany czas wdrożenia

| Zadanie | Czas |
|---------|------|
| Utworzenie Option Set `dvlp_costcenter` | 5 min |
| Utworzenie Option Set `dvlp_feedbacktype` | 5 min |
| Dodanie 6 pól AI w `dvlp_ksefinvoice` | 15 min |
| Aktualizacja formularza | 10 min |
| Utworzenie widoków | 10 min |
| Utworzenie tabeli `dvlp_aifeedback` | 15 min |
| Publikacja | 2 min |
| Aktualizacja kodu | 15 min |
| Testy | 15 min |
| **RAZEM** | **~1h 30min** |

---

## Zmiany w kodzie po wdrożeniu AI

### 1. Aktualizacja config.ts

```typescript
// api/src/lib/dataverse/config.ts

// W sekcji invoice dodaj:
invoice: {
  // ... istniejące pola ...
  
  // AI Categorization fields
  aiMpkSuggestion: process.env.DV_FIELD_INVOICE_AI_MPK || 'dvlp_aimpksuggestion',
  aiCategorySuggestion: process.env.DV_FIELD_INVOICE_AI_CATEGORY || 'dvlp_aicategorysuggestion',
  aiDescription: process.env.DV_FIELD_INVOICE_AI_DESC || 'dvlp_aidescription',
  aiConfidence: process.env.DV_FIELD_INVOICE_AI_CONFIDENCE || 'dvlp_aiconfidence',
  aiProcessedAt: process.env.DV_FIELD_INVOICE_AI_PROCESSED || 'dvlp_aiprocessedat',
}
```

### 2. Aktualizacja mappers.ts

```typescript
// api/src/lib/dataverse/mappers.ts

// W mapDvInvoiceToApp - zamień undefined na prawdziwe mapowanie:
export function mapDvInvoiceToApp(raw: DvInvoice): Invoice {
  // ... istniejący kod ...
  
  // AI fields - zmień z undefined na:
  aiMpkSuggestion: mapDvCostCenterToMpk(raw[s.aiMpkSuggestion]),
  aiCategorySuggestion: raw[s.aiCategorySuggestion] as string | undefined,
  aiDescription: raw[s.aiDescription] as string | undefined,
  aiConfidence: raw[s.aiConfidence] as number | undefined,
  aiProcessedAt: raw[s.aiProcessedAt] as string | undefined,
}

// W mapAppInvoiceToDv - odkomentuj:
export function mapAppInvoiceToDv(app: Partial<Invoice>): Record<string, unknown> {
  // ... istniejący kod ...
  
  // AI fields
  if (app.aiMpkSuggestion !== undefined) payload[s.aiMpkSuggestion] = mapMpkToDvCostCenter(app.aiMpkSuggestion)
  if (app.aiCategorySuggestion !== undefined) payload[s.aiCategorySuggestion] = app.aiCategorySuggestion
  if (app.aiDescription !== undefined) payload[s.aiDescription] = app.aiDescription
  if (app.aiConfidence !== undefined) payload[s.aiConfidence] = app.aiConfidence
  if (app.aiProcessedAt !== undefined) payload[s.aiProcessedAt] = app.aiProcessedAt
}
```

### 3. Odkomentuj w ai-categorize.ts

```typescript
// api/src/functions/ai-categorize.ts

// Odkomentuj bloki zapisujące do Dataverse:
await invoiceService.update(invoiceId, {
  aiMpkSuggestion: categorization.mpk as MPK,
  aiCategorySuggestion: categorization.category,
  aiDescription: categorization.description,
  aiConfidence: categorization.confidence,
  aiProcessedAt: new Date().toISOString(),
})
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
13. `dvlp_feedbacktype` - Typ Feedback AI
14. `dvlp_approvalstatus` - Status akceptacji
15. `dvlp_budgetperiod` - Okres budżetowy
16. `dvlp_notificationtype` - Typ powiadomienia
17. `dvlp_invoicesource` - Źródło faktury
18. `dvlp_supplierstatus` - Status dostawcy
19. `dvlp_suppliersource` - Źródło dostawcy
20. `dvlp_sbagreementstatus` - Status umowy samofakturowania
21. `dvlp_selfbillingstatus` - Status samofakturowania

### 2. Utworzenie tabel w kolejności

1. `dvlp_ksefsetting` - Ustawienia KSeF (bez relacji)
2. `dvlp_ksefsession` - Sesje KSeF (z relacją do dvlp_ksefsetting)
3. `dvlp_ksefinvoice` - Faktury KSeF (z relacją do dvlp_ksefsetting + pola AI)
4. `dvlp_ksefsynclog` - Logi synchronizacji (z relacjami do powyższych)
5. `dvlp_aifeedback` - Feedback AI (z relacją do dvlp_ksefinvoice)
6. `dvlp_ksefmpkcenter` — Centra MPK (z relacją do dvlp_ksefsetting)
7. `dvlp_ksefmpkapprover` — Akceptanci MPK (z relacjami do dvlp_ksefmpkcenter + systemuser)
8. `dvlp_ksefnotification` — Powiadomienia (z relacjami do systemuser, dvlp_ksefsetting, dvlp_ksefinvoice, dvlp_ksefmpkcenter)
9. `dvlp_ksefsupplier` — Dostawcy (z relacjami do dvlp_ksefsetting, dvlp_ksefmpkcenter)
10. `dvlp_ksefsbagrement` — Umowy samofakturowania (z relacjami do dvlp_ksefsupplier, dvlp_ksefsetting)
11. `dvlp_ksefselfbillingtemplate` — Szablony samofakturowania (z relacjami do dvlp_ksefsupplier, dvlp_ksefsetting)
12. `dvlp_ksefselfbillinginvoice` — Faktury samofakturowania (z relacjami do dvlp_ksefsetting, dvlp_ksefsupplier, dvlp_ksefsbagrement, dvlp_ksefinvoice, dvlp_ksefmpkcenter)
13. `dvlp_ksefselfbillinglineitem` — Pozycje faktur samofakturowania (z relacjami do dvlp_ksefselfbillinginvoice, dvlp_ksefselfbillingtemplate)

### 3. Utworzenie kluczy alternatywnych

- `dvlp_ksefsetting`: `dvlp_nip_key`
- `dvlp_ksefinvoice`: `dvlp_ksefref_key`, `dvlp_invoice_composite_key`
- `dvlp_ksefsupplier`: `dvlp_supplier_nip_setting`
- `dvlp_ksefsbagrement`: `dvlp_sbagrement_name_supplier`

### 4. Utworzenie widoków, formularzy i wykresów

Zgodnie ze specyfikacją dla każdej tabeli.

---

## Changelog

| Wersja | Data | Opis zmian |
|--------|------|------------|
| 1.0.0 | 2026-01 | Wersja początkowa |
| 1.1.0 | 2026-01 | Zmiana z rozszerzenia Invoice na nową tabelę dvlp_ksefinvoice |
| 1.2.0 | 2026-01 | Uproszczenie struktury: 22 kolumny zamiast 50+, Decimal zamiast Currency, MPK/Kategoria jako OptionSet |
| 1.3.0 | 2026-02 | Połączenie ze specyfikacją pól AI: dvlp_aimpksuggestion, dvlp_aicategorysuggestion, dvlp_aidescription, dvlp_airationale, dvlp_aiconfidence, dvlp_aiprocessedat + tabela dvlp_aifeedback + dvlp_costcenter szczegółowy + instrukcja wdrożenia |
| 1.4.0 | 2026-03 | Dodano encję Centrum MPK (dvlp_ksefmpkcenter), Akceptant MPK (dvlp_ksefmpkapprover), Powiadomienie (dvlp_ksefnotification). Pola workflow akceptacji faktur (dvlp_approvalstatus, dvlp_approvedby, dvlp_approvedbyoid, dvlp_approvedat, dvlp_approvalcomment, dvlp_mpkcenterid). Nowe OptionSets: dvlp_approvalstatus, dvlp_budgetperiod, dvlp_notificationtype |
| 1.5.0 | 2026-04 | Dodano encje samofakturowania: dvlp_ksefsupplier (Dostawca), dvlp_ksefsbagrement (Umowa SB), dvlp_ksefselfbillingtemplate (Szablon SB). Nowe OptionSets: dvlp_supplierstatus, dvlp_suppliersource, dvlp_sbagreementstatus, dvlp_selfbillingstatus. Wersja rozwiązania: 1.0.0.9 |
| 1.6.0 | 2026-04 | Migracja faktur SB do dedykowanych tabel: dvlp_ksefselfbillinginvoice (Faktura SB) + dvlp_ksefselfbillinglineitem (Pozycja SB). Usunięto pola SB z dvlp_ksefinvoice (dvlp_isselfbilling, dvlp_selfbillingstatus, dvlp_sellerrejectionreason, dvlp_selfbillingsentdate, dvlp_supplierid, dvlp_sbagrementid). Pozycje faktur jako osobne rekordy zamiast JSON w polu description. |
| 1.7.0 | 2026-03 | Workflow zatwierdzania SB: dodano dvlp_sbcontactuserid (lookup systemuser) do dvlp_ksefsupplier. Dodano kolumny audytu do dvlp_ksefselfbillinginvoice: dvlp_submittedbyuserid (lookup systemuser), dvlp_submittedat (DateTime), dvlp_approvedbyuserid (lookup systemuser), dvlp_approvedat (DateTime). Nowy endpoint GET /api/self-billing/approvals/pending. Endpointy submit/approve/reject wymuszają autoryzację wyznaczonego zatwierdzającego. |

---

## Powiązane dokumenty

- [Architektura](./ARCHITEKTURA.md) — przegląd systemu
- [API REST](./API_PL.md) — endpointy operujące na tych tabelach
- [Konfiguracja Entra ID](./ENTRA_ID_KONFIGURACJA.md) — rola Dataverse, Application User
- [deployment/dataverse/README.md](../deployment/dataverse/README.md) — instrukcja wdrożenia

---

**Ostatnia aktualizacja:** 2026-03-15  
**Wersja:** 1.7  
**Opiekun:** dvlp-dev team
