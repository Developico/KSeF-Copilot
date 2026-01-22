# Dataverse Schema - KSeF Integration

Specyfikacja modelu danych dla integracji z Krajowym Systemem e-Faktur (KSeF).

## Spis treści

1. [Przegląd](#przegląd)
2. [Publisher](#publisher)
3. [Tabele (Entities)](#tabele-entities)
   - [dvlp_ksefsetting](#dvlp_ksefsetting)
   - [dvlp_ksefsession](#dvlp_ksefsession)
   - [dvlp_ksefsynclog](#dvlp_ksefsynclog)
   - [Rozszerzenie tabeli Invoice](#rozszerzenie-tabeli-invoice)
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
│  │           Invoice (extended)             │                    │
│  │  + dvlp_ksefreferencenumber             │                    │
│  │  + dvlp_ksefstatus                      │                    │
│  │  + dvlp_ksefsentat                      │                    │
│  │  + dvlp_ksefupo                         │                    │
│  │  + dvlp_ksefrawxml                      │                    │
│  │  + dvlp_ksefdirection                   │                    │
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

### Rozszerzenie tabeli Invoice

Pola dodawane do istniejącej tabeli faktur (np. `invoice` lub custom `dvlp_invoice`).

#### Nowe atrybuty

| Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|----------------|-------------------|-----|----------|------|
| `dvlp_ksefreferencenumber` | Numer referencyjny KSeF | String(50) | ❌ | Unikalny numer z KSeF |
| `dvlp_ksefstatus` | Status KSeF | OptionSet | ❌ | Status w systemie KSeF |
| `dvlp_ksefdirection` | Kierunek | OptionSet | ❌ | incoming/outgoing |
| `dvlp_ksefsentat` | Wysłano do KSeF | DateTime | ❌ | Czas wysłania |
| `dvlp_ksefacceptedat` | Zaakceptowano w KSeF | DateTime | ❌ | Czas akceptacji |
| `dvlp_ksefupo` | UPO | String(500) | ❌ | Urzędowe Poświadczenie Odbioru |
| `dvlp_ksefrawxml` | XML faktury | Memo | ❌ | Surowy XML FA(2) |
| `dvlp_ksefhash` | Hash faktury | String(64) | ❌ | SHA-256 dla weryfikacji |
| `dvlp_ksefsessionid` | Sesja wysyłki | Lookup | ❌ | Sesja w której wysłano |
| `dvlp_kseferrormessage` | Błąd KSeF | String(2000) | ❌ | Komunikat błędu |
| `dvlp_ksefretrycount` | Próby wysyłki | Integer | ❌ | Licznik ponowień |
| `dvlp_kseflastretryat` | Ostatnia próba | DateTime | ❌ | Czas ostatniej próby |
| `dvlp_categoryid` | Kategoria | Lookup | ❌ | Kategoria kosztowa |

#### Indeksy na tabeli Invoice

| Nazwa | Atrybuty | Typ |
|-------|----------|-----|
| `idx_ksefreference` | `dvlp_ksefreferencenumber` | Unique |
| `idx_ksefstatus_direction` | `dvlp_ksefstatus`, `dvlp_ksefdirection` | Non-unique |

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

## Relacje

### Diagram relacji

```
dvlp_ksefsetting (1)
    │
    ├──── (N) dvlp_ksefsession
    │           │
    │           └──── (N) Invoice (via dvlp_ksefsessionid)
    │
    ├──── (N) dvlp_ksefsynclog
    │
    └──── (N) Invoice (via tenant NIP)
```

### Definicje relacji

| Relacja | Typ | Parent | Child | Cascade |
|---------|-----|--------|-------|---------|
| `dvlp_ksefsetting_sessions` | 1:N | dvlp_ksefsetting | dvlp_ksefsession | Delete: Cascade |
| `dvlp_ksefsetting_synclogs` | 1:N | dvlp_ksefsetting | dvlp_ksefsynclog | Delete: Cascade |
| `dvlp_ksefsession_synclogs` | 1:N | dvlp_ksefsession | dvlp_ksefsynclog | Delete: RemoveLink |
| `dvlp_ksefsession_invoices` | 1:N | dvlp_ksefsession | Invoice | Delete: RemoveLink |

---

## Role bezpieczeństwa

### KSeF Admin

Pełny dostęp do wszystkich operacji KSeF.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |

### KSeF Reader

Dostęp tylko do odczytu.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsession | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |
| dvlp_ksefsynclog | ❌ | ✅ Org | ❌ | ❌ | ❌ | ❌ |

### KSeF Operator

Może wykonywać synchronizację ale nie może zmieniać konfiguracji.

| Tabela | Create | Read | Write | Delete | Append | AppendTo |
|--------|--------|------|-------|--------|--------|----------|
| dvlp_ksefsetting | ❌ | ✅ Org | ❌ | ❌ | ❌ | ✅ Org |
| dvlp_ksefsession | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |
| dvlp_ksefsynclog | ✅ Org | ✅ Org | ✅ Org | ❌ | ✅ Org | ✅ Org |

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
| Invoice | IX_KSeFRef | `dvlp_ksefreferencenumber` | Wyszukiwanie po numerze KSeF |
| Invoice | IX_KSeFStatus | `dvlp_ksefstatus`, `dvlp_ksefdirection` | Filtrowanie statusów |

### Partycjonowanie danych (Extended)

Dla dużych wolumenów (>100k faktur):

```
Partycja po: dvlp_ksefsentat (miesięcznie)
Retencja: 7 lat (wymagania prawne)
Archiwizacja: Po 2 latach do cold storage
```

---

## Migracja danych

### Import początkowy

1. **Ustawienia KSeF** - ręczna konfiguracja per firma
2. **Istniejące faktury** - mapowanie pól jeśli migracja z innego systemu

### Skrypt mapowania (przykład)

```javascript
// Mapowanie statusów z systemu źródłowego
const statusMapping = {
  'NEW': 100000001,      // Draft
  'SENT': 100000003,     // Sent
  'CONFIRMED': 100000004, // Accepted
  'FAILED': 100000006    // Error
};

// Mapowanie kierunku
const directionMapping = {
  'IN': 100000001,  // Incoming
  'OUT': 100000002  // Outgoing
};
```

### Walidacja po migracji

```sql
-- Sprawdzenie spójności
SELECT COUNT(*) as total,
       SUM(CASE WHEN dvlp_ksefreferencenumber IS NULL THEN 1 ELSE 0 END) as missing_ref
FROM Invoice
WHERE dvlp_ksefstatus IN (100000003, 100000004) -- Sent, Accepted
```

---

## Changelog

| Wersja | Data | Opis zmian |
|--------|------|------------|
| 1.0.0 | 2026-01 | Wersja początkowa |

---

## Powiązane dokumenty

- [REQUIREMENTS.md](REQUIREMENTS.md) - Wymagania funkcjonalne
- [plan-ksefIntegration.prompt.md](plan-ksefIntegration.prompt.md) - Plan implementacji
- [deployment/dataverse/README.md](../deployment/dataverse/README.md) - Instrukcja wdrożenia
