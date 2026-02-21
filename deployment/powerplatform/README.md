# Power Platform — Artefakty wdrożeniowe

Ten katalog zawiera wszystkie komponenty Power Platform wymagane do wdrożenia rozwiązania KSeF Integration.

---

## Struktura

```
powerplatform/
├── README.md                              ← Ten plik
├── DevelopicoKSeF_1_0_0_6.zip             # Solucja — unmanaged (dev)
├── DevelopicoKSeF_1_0_0_6_managed.zip     # Solucja — managed (produkcja/UAT)
├── Solution DevelopicoKSeF_1_0_0_6/       # Rozpakowana solucja (referencja)
├── CODE_APPS_DEPLOYMENT.md                # Plan wdrożenia Code Apps
├── CODE_APPS_WDROZENIE.md                # Instrukcja wdrożenia Code Apps (pac code push)
├── welcome.html                           # Strona powitalna Code App
└── connector/                             # Custom Connector
    ├── README.md                          # Dokumentacja konektora
    ├── swagger.yaml                       # Definicja OpenAPI (produkcja)
    └── swagger.local.yaml                # Definicja OpenAPI (dev)
```

---

## Zawartość solucji Power Platform

Plik solucji (`.zip`) zawiera:

| Komponent | Opis |
|-----------|------|
| **Tabele Dataverse** | 4 tabele z prefixem `dvlp_ksef` |
| **Model-Driven App (MDA)** | Aplikacja administracyjna do zarządzania fakturami i ustawieniami |
| **Code Component (PCF)** | Aplikacja frontendowa (React/Vite) osadzona w Power Apps |
| **Custom Connector** | Konektor do API Azure Functions (KSeF Integration) |
| **Procesy Power Automate** | Przepływy automatyzacji (sync, kategoryzacja AI, alerty) |
| **Security Roles** | Role bezpieczeństwa: KSeF Admin, KSeF Reader |
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

---

## Wersje solucji

| Typ | Zastosowanie | Plik |
|-----|-------------|------|
| **Managed** | Środowiska produkcyjne i UAT | `*_managed.zip` |
| **Unmanaged** | Środowiska deweloperskie | `*.zip` (bez suffiksu `_managed`) |

> **Uwaga:** Na produkcji zawsze używaj wersji **managed**. Unmanaged solution służy wyłącznie do dalszego rozwoju.

---

## Instrukcja importu

### Opcja A — Power Platform CLI

```powershell
# Managed (produkcja)
pac solution import `
    --path "deployment\powerplatform\DevelopicoKSeF_1_0_0_6_managed.zip" `
    --activate-plugins

# Unmanaged (dev)
pac solution import `
    --path "deployment\powerplatform\DevelopicoKSeF_1_0_0_6.zip"

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
