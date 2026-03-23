# Power Platform — Artefakty wdrożeniowe

Ten katalog zawiera wszystkie komponenty Power Platform wymagane do wdrożenia rozwiązania KSeF Integration.

---

## Struktura

```
powerplatform/
├── README.md                              ← Ten plik
├── DevelopicoKSeF_0_1_0_0.zip                          # Solucja v0.1.0 — unmanaged
├── DevelopicoKSeF_0_2_0_0.zip                          # Solucja v0.2.0 — unmanaged
├── DevelopicoKSeF_0_3_0_0.zip                          # Solucja v0.3.0 — unmanaged (samofakturowanie)
├── DevelopicoKSeF_0_3_0_1.zip                          # Solucja v0.3.0.1 — szablon numeracji faktur SB
├── KSeFCopilotCustomConnectorbyDevelopico_0_1_0_0.zip  # Custom Connector v0.1.0 — unmanaged
├── KSeFCopilotCustomConnectorbyDevelopico_0_2_0_0.zip  # Custom Connector v0.2.0 — unmanaged
├── KSeFCopilotCustomConnectorbyDevelopico_0_3_0_0.zip  # Custom Connector v0.3.0 — endpointy SB
├── KSeFCopilotCustomConnectorbyDevelopico_0_3_0_1.zip  # Custom Connector v0.3.0.1 — sync z solucją
├── Provision-FullEnvironment.ps1          # Skrypt provisioningu środowiska
├── Provision-MpkSchema.ps1                # Skrypt provisioningu schematu MPK
├── Provision-SelfBillingSchema.ps1         # Skrypt provisioningu kolumn SB (szablon numeracji)
├── Provision-SbApprovalColumns.ps1         # Skrypt provisioningu kolumn akceptacji SB
├── Grant-SelfBillingPrivileges.ps1         # Skrypt nadawania uprawnień SB
├── CODE_APPS_DEPLOYMENT.md                # Plan wdrożenia Code Apps
├── CODE_APPS_WDROZENIE.md                 # Instrukcja wdrożenia Code Apps (pac code push)
├── welcome.html                           # Strona powitalna Code App
└── connector/                             # Custom Connector
    ├── README.md                          # Dokumentacja konektora
    ├── swagger.yaml                       # Definicja OpenAPI (produkcja)
    └── swagger.local.yaml                 # Definicja OpenAPI (dev)
```

> **Historia wersji solucji:** Wewnętrzna numeracja Power Platform (1.0.0.6, 1.1.0.1) została zsynchronizowana z wersją projektu od v0.2.0.

---

## Zawartość solucji Power Platform

Plik solucji (`.zip`) zawiera:

| Komponent | Opis |
|-----------|------|
| **Tabele Dataverse** | 13 tabel z prefixem `dvlp_ksef` (faktury, ustawienia, sesje, logi sync, dostawcy, MPK, akceptanci MPK, notyfikacje, umowy SB, szablony SB, faktury SB, pozycje SB, AI feedback) |
| **Model-Driven App (MDA)** | Aplikacja administracyjna do zarządzania fakturami i ustawieniami |
| **Code Component (PCF)** | Aplikacja frontendowa (React/Vite) osadzona w Power Apps |
| **Custom Connector** | Konektor do API Azure Functions (KSeF Integration) |
| **Procesy Power Automate** | Przepływy automatyzacji (sync, kategoryzacja AI, alerty) |
| **Security Roles** | Role bezpieczeństwa: KSeF Admin, KSeF Reader, KSeF Approver |
| **Option Sets** | Zestawy opcji: status faktury, kierunek, środowisko KSeF, status sesji |

---

## Schemat Dataverse

### dvlp_ksefinvoice (Faktury)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefinvoiceid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Numer faktury |
| `dvlp_ksef_reference_number` | String | Numer referencyjny KSeF |
| `dvlp_seller_name` | String | Nazwa sprzedawcy |
| `dvlp_seller_nip` | String | NIP sprzedawcy |
| `dvlp_buyer_name` | String | Nazwa nabywcy |
| `dvlp_buyer_nip` | String | NIP nabywcy |
| `dvlp_net_amount` | Currency | Kwota netto |
| `dvlp_vat_amount` | Currency | Kwota VAT |
| `dvlp_gross_amount` | Currency | Kwota brutto |
| `dvlp_issue_date` | DateTime | Data wystawienia |
| `dvlp_invoice_direction` | OptionSet | Kierunek (zakup/sprzedaż) |
| `dvlp_payment_status` | OptionSet | Status płatności |
| `dvlp_mpk` | String | Miejsce Powstawania Kosztów |
| `dvlp_category` | String | Kategoria |
| `dvlp_project` | String | Projekt |
| `dvlp_ai_categorized` | Boolean | Czy AI skategoryzował |
| `dvlp_setting` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefsetting (Ustawienia firmy)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefsettingid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Nazwa firmy |
| `dvlp_nip` | String | NIP firmy |
| `dvlp_ksef_environment` | OptionSet | Środowisko KSeF (test/demo/prod) |
| `dvlp_is_active` | Boolean | Czy firma aktywna |

### dvlp_ksefsession (Sesje KSeF)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefsessionid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Identyfikator sesji |
| `dvlp_session_token` | String | Token sesji KSeF |
| `dvlp_status` | OptionSet | Status sesji |
| `dvlp_started_at` | DateTime | Początek sesji |
| `dvlp_ended_at` | DateTime | Koniec sesji |
| `dvlp_setting` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefsynclog (Logi synchronizacji)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefsynclogid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Opis operacji |
| `dvlp_sync_type` | OptionSet | Typ (manual/scheduled) |
| `dvlp_status` | OptionSet | Status (success/error) |
| `dvlp_started_at` | DateTime | Początek |
| `dvlp_ended_at` | DateTime | Koniec |
| `dvlp_invoices_count` | Integer | Liczba faktur |
| `dvlp_error_message` | String | Komunikat błędu |
| `dvlp_setting` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefsupplier (Dostawcy)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefsupplierid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Nazwa dostawcy |
| `dvlp_shortname` | String | Nazwa skrócona |
| `dvlp_nip` | String | NIP dostawcy |
| `dvlp_regon` | String | REGON |
| `dvlp_krs` | String | KRS |
| `dvlp_street` | String | Ulica |
| `dvlp_city` | String | Miasto |
| `dvlp_postalcode` | String | Kod pocztowy |
| `dvlp_country` | String | Kraj |
| `dvlp_email` | String | Email kontaktowy |
| `dvlp_phone` | String | Telefon |
| `dvlp_bankaccount` | String | Numer konta bankowego |
| `dvlp_vatstatus` | String | Status VAT (Biała Lista) |
| `dvlp_vatstatusdate` | DateTime | Data weryfikacji VAT |
| `dvlp_paymenttermsdays` | Integer | Termin płatności (dni) |
| `dvlp_defaultcategory` | String | Domyślna kategoria |
| `dvlp_notes` | String | Notatki |
| `dvlp_tags` | String | Tagi |
| `dvlp_hasselfbillingagreement` | Boolean | Czy ma aktywną umowę SB |
| `dvlp_selfbillingagreementdate` | DateTime | Data umowy SB |
| `dvlp_selfbillingagreementexpiry` | DateTime | Data wygaśnięcia umowy SB |
| `dvlp_firstinvoicedate` | DateTime | Data pierwszej faktury |
| `dvlp_lastinvoicedate` | DateTime | Data ostatniej faktury |
| `dvlp_totalinvoicecount` | Integer | Łączna liczba faktur |
| `dvlp_totalgrossamount` | Currency | Łączna kwota brutto |
| `dvlp_status` | OptionSet | Status (Active/Inactive/Blocked) |
| `dvlp_source` | OptionSet | Źródło (Manual/VAT/Import) |
| `dvlp_setting` | Lookup | FK → `dvlp_ksefsetting` |
| `dvlp_defaultmpkid` | Lookup | FK → `dvlp_ksefmpkcenter` |

### dvlp_ksefsbagrement (Umowy samofakturowania)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefsbagrement_id` | Uniqueidentifier | PK |
| `dvlp_name` | String | Nazwa/numer umowy |
| `dvlp_agreementdate` | DateTime | Data zawarcia umowy |
| `dvlp_validfrom` | DateTime | Obowiązuje od |
| `dvlp_validto` | DateTime | Obowiązuje do |
| `dvlp_renewaldate` | DateTime | Data odnowienia |
| `dvlp_approvalprocedure` | String | Procedura akceptacji |
| `dvlp_status` | OptionSet | Status (Active/Terminated/Expired) |
| `dvlp_credentialreference` | String | Referencja poświadczenia |
| `dvlp_notes` | String | Notatki |
| `dvlp_hasdocument` | Boolean | Czy ma załączony dokument |
| `dvlp_documentfilename` | String | Nazwa pliku dokumentu |
| `dvlp_autoapprove` | Boolean | Auto-akceptacja — pomija akceptację dostawcy przy submit (domyślnie: false) |
| `dvlp_supplierid` | Lookup | FK → `dvlp_ksefsupplier` |
| `dvlp_setting` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefselfbillingtemplate (Szablony samofakturowania)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefselfbillingtemplateid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Nazwa szablonu |
| `dvlp_description` | String | Opis |
| `dvlp_itemdescription` | String | Opis pozycji faktury |
| `dvlp_quantity` | Decimal | Ilość |
| `dvlp_unit` | String | Jednostka miary |
| `dvlp_unitprice` | Currency | Cena jednostkowa |
| `dvlp_vatrate` | Integer | Stawka VAT (%) |
| `dvlp_currency` | String | Waluta (PLN/EUR/USD) |
| `dvlp_isactive` | Boolean | Czy aktywny |
| `dvlp_sortorder` | Integer | Kolejność sortowania |
| `dvlp_paymenttermsdays` | Integer | Termin płatności (dni) |
| `dvlp_supplierid` | Lookup | FK → `dvlp_ksefsupplier` |
| `dvlp_setting` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefmpkcenter (Centra kosztów MPK)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefmpkcenterid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Nazwa centrum kosztów |
| `dvlp_description` | String | Opis |
| `dvlp_isactive` | Boolean | Czy aktywne |
| `dvlp_approvalrequired` | Boolean | Czy wymaga akceptacji |
| `dvlp_approvalslahours` | Integer | SLA akceptacji (godziny) |
| `dvlp_approvaleffectivefrom` | DateTime | Akceptacja obowiązuje od |
| `dvlp_budgetamount` | Currency | Kwota budżetu |
| `dvlp_budgetperiod` | String | Okres budżetowy |
| `dvlp_budgetstartdate` | DateTime | Data rozpoczęcia budżetu |
| `dvlp_settingid` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefmpkapprover (Akceptanci MPK)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefmpkapproverid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Nazwa (auto: user + MPK) |
| `dvlp_mpkcenterid` | Lookup | FK → `dvlp_ksefmpkcenter` |
| `dvlp_systemuserid` | Lookup | FK → `systemuser` |

### dvlp_ksefnotification (Notyfikacje)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefnotificationid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Opis notyfikacji |
| `dvlp_type` | OptionSet | Typ (approval_request, approved, rejected, itp.) |
| `dvlp_message` | String | Treść wiadomości |
| `dvlp_isread` | Boolean | Czy przeczytana |
| `dvlp_isdismissed` | Boolean | Czy odrzucona |
| `dvlp_recipientid` | Lookup | FK → `systemuser` |
| `dvlp_invoiceid` | Lookup | FK → `dvlp_ksefinvoice` |
| `dvlp_mpkcenterid` | Lookup | FK → `dvlp_ksefmpkcenter` |
| `dvlp_settingid` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefselfbillinginvoice (Faktury samofakturowania)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefselfbillinginvoiceid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Numer faktury SB |
| `dvlp_invoicedate` | DateTime | Data wystawienia |
| `dvlp_duedate` | DateTime | Termin płatności |
| `dvlp_netamount` | Currency | Kwota netto |
| `dvlp_vatamount` | Currency | Kwota VAT |
| `dvlp_grossamount` | Currency | Kwota brutto |
| `dvlp_currency` | String | Waluta |
| `dvlp_status` | OptionSet | Status (Draft/Pending/Approved/Rejected/Sent) |
| `dvlp_sellerrejectionreason` | String | Powód odrzucenia przez dostawcę |
| `dvlp_sentdate` | DateTime | Data wysłania do KSeF |
| `dvlp_ksefreferencenumber` | String | Numer referencyjny KSeF |
| `dvlp_submittedbyuserid` | Lookup | FK → `systemuser` (kto złożył) |
| `dvlp_submittedat` | DateTime | Data złożenia |
| `dvlp_approvedbyuserid` | Lookup | FK → `systemuser` (kto zaakceptował) |
| `dvlp_approvedat` | DateTime | Data akceptacji |
| `dvlp_supplierid` | Lookup | FK → `dvlp_ksefsupplier` |
| `dvlp_sbagreementid` | Lookup | FK → `dvlp_ksefsbagrement` |
| `dvlp_mpkcenterid` | Lookup | FK → `dvlp_ksefmpkcenter` |
| `dvlp_kseFinvoiceid` | Lookup | FK → `dvlp_ksefinvoice` (po wysłaniu) |
| `dvlp_settingid` | Lookup | FK → `dvlp_ksefsetting` |

### dvlp_ksefselfbillinglineitem (Pozycje faktur SB)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefselfbillinglineitemid` | Uniqueidentifier | PK |
| `dvlp_name` | String | Opis pozycji |
| `dvlp_quantity` | Decimal | Ilość |
| `dvlp_unit` | String | Jednostka miary |
| `dvlp_unitprice` | Currency | Cena jednostkowa |
| `dvlp_vatrate` | Integer | Stawka VAT (%) |
| `dvlp_netamount` | Currency | Kwota netto |
| `dvlp_vatamount` | Currency | Kwota VAT |
| `dvlp_grossamount` | Currency | Kwota brutto |
| `dvlp_paymenttermsdays` | Integer | Termin płatności (dni) |
| `dvlp_sortorder` | Integer | Kolejność sortowania |
| `dvlp_sbinvoiceid` | Lookup | FK → `dvlp_ksefselfbillinginvoice` |
| `dvlp_templateid` | Lookup | FK → `dvlp_ksefselfbillingtemplate` |

### dvlp_ksefaifeedback (Feedback AI)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `dvlp_ksefaifeedbackid` | Uniqueidentifier | PK |
| `dvlp_invoiceid` | Lookup | FK → `dvlp_ksefinvoice` |
| `dvlp_tenantnip` | String | NIP firmy |
| `dvlp_suppliernip` | String | NIP dostawcy |
| `dvlp_suppliername` | String | Nazwa dostawcy |
| `dvlp_invoicedescription` | String | Opis faktury |
| `dvlp_aimpksuggestion` | String | Sugestia AI — MPK |
| `dvlp_aicategorysuggestion` | String | Sugestia AI — kategoria |
| `dvlp_aiconfidence` | Decimal | Pewność AI (0–1) |
| `dvlp_usermpk` | String | MPK wybrane przez użytkownika |
| `dvlp_usercategory` | String | Kategoria wybrana przez użytkownika |
| `dvlp_feedbacktype` | OptionSet | Typ (Applied/Modified/Rejected) |

---

## Wersje solucji

| Plik | Typ | Wersja projektu |
|------|-----|----------------|
| `DevelopicoKSeF_0_1_0_0.zip` | Solucja Dataverse (unmanaged) | v0.1.0 |
| `KSeFCopilotCustomConnectorbyDevelopico_0_1_0_0.zip` | Custom Connector (unmanaged) | v0.1.0 |
| `DevelopicoKSeF_0_2_0_0.zip` | Solucja Dataverse (unmanaged) | v0.2.0 |
| `KSeFCopilotCustomConnectorbyDevelopico_0_2_0_0.zip` | Custom Connector (unmanaged) | v0.2.0 |

---

## Instrukcja importu

### Opcja A — Power Platform CLI

```powershell
# Solucja Dataverse
pac solution import `
    --path "deployment\powerplatform\DevelopicoKSeF_0_2_0_0.zip"

# Custom Connector
pac solution import `
    --path "deployment\powerplatform\KSeFCopilotCustomConnectorbyDevelopico_0_2_0_0.zip"

# Sprawdź
pac solution list
```

### Opcja B — Maker Portal

1. [make.powerapps.com](https://make.powerapps.com) → Solutions → Import solution
2. Wybierz plik `.zip` → Next → Import
3. Czas importu: 2-5 minut

---

## Kolejność wdrożenia

1. **Krok 2** — Entra ID (App Registration) — `deployment/README.md`
2. **Krok 3** — Import solucji (ten katalog) ← TUTAJ
3. **Krok 4** — Application User w Dataverse
4. **Krok 5-8** — Infrastruktura Azure + deploy API/Web
5. **Krok 9** — Konfiguracja Custom Connector
6. **Krok 10** — Connection References i Power Automate

Pełny przewodnik: [`deployment/README.md`](../README.md)

---

## Wymagania

- Środowisko Power Platform z licencją Dataverse
- Rola **System Administrator** lub **System Customizer** w środowisku docelowym
- Power Platform CLI (`pac`) — [Instalacja](https://learn.microsoft.com/power-platform/developer/cli/introduction)
- Wdrożone API Azure Functions (Custom Connector wymaga działającego backendu)

---

## Powiązane dokumenty

| Dokument | Opis |
|----------|------|
| [`deployment/README.md`](../README.md) | Główny przewodnik wdrożenia (13 kroków) |
| [`connector/README.md`](connector/README.md) | Konfiguracja Custom Connector |
| [`connector/swagger.yaml`](connector/swagger.yaml) | Definicja OpenAPI (produkcja) |
| [`CODE_APPS_DEPLOYMENT.md`](CODE_APPS_DEPLOYMENT.md) | Plan wdrożenia Code Apps |
| [`CODE_APPS_WDROZENIE.md`](CODE_APPS_WDROZENIE.md) | Instrukcja wdrożenia (`pac code push`) |
