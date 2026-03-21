# Samofakturowanie — operacje Custom Connector

> **Wersja:** 1.1  
> **Data:** 2026-03-20  
> **Moduł:** Samofakturowanie (Self-Billing)

Dokument opisuje 38 operacji Power Platform Custom Connector dodanych dla modułu samofakturowania. Wszystkie operacje wymagają uwierzytelniania OAuth 2.0 przez Entra ID i respektują role RBAC (Admin / Approver / User).

---

## Spis treści

- [Samofakturowanie — operacje Custom Connector](#samofakturowanie--operacje-custom-connector)
  - [Spis treści](#spis-treści)
  - [1. Dostawcy](#1-dostawcy)
    - [Parametry zapytań (ListSuppliers)](#parametry-zapytań-listsuppliers)
  - [2. Umowy samofakturowania](#2-umowy-samofakturowania)
    - [Statusy umów](#statusy-umów)
  - [3. Szablony samofakturowania](#3-szablony-samofakturowania)
    - [Pola szablonu](#pola-szablonu)
  - [4. Faktury samofakturowania i przepływ pracy](#4-faktury-samofakturowania-i-przepływ-pracy)
    - [Przepływ pracy](#przepływ-pracy)
    - [Statusy faktur](#statusy-faktur)
  - [5. Import samofakturowania](#5-import-samofakturowania)
    - [Przepływ importu](#przepływ-importu)
  - [6. Timer Trigger](#6-timer-trigger)
  - [7. Przykłady Power Automate](#7-przykłady-power-automate)
    - [Przykład 1: Miesięczne generowanie faktur](#przykład-1-miesięczne-generowanie-faktur)
    - [Przykład 2: Import z SharePoint](#przykład-2-import-z-sharepoint)
    - [Przykład 3: Powiadomienie o akceptacji sprzedawcy](#przykład-3-powiadomienie-o-akceptacji-sprzedawcy)
  - [8. Copilot Studio Agent](#8-copilot-studio-agent)

---

## 1. Dostawcy

| # | operationId | Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|---|---|
| 1 | `ListSuppliers` | GET | `/suppliers` | User | Lista dostawców z filtrami. Wymaga `settingId`. |
| 2 | `CreateSupplier` | POST | `/suppliers` | Admin | Tworzenie dostawcy. NIP musi mieć poprawną sumę kontrolną. |
| 3 | `GetSupplier` | GET | `/suppliers/{id}` | User | Pobranie szczegółów dostawcy po ID. |
| 4 | `UpdateSupplier` | PATCH | `/suppliers/{id}` | Admin | Częściowa aktualizacja pól dostawcy. |
| 5 | `DeleteSupplier` | DELETE | `/suppliers/{id}` | Admin | Usunięcie dostawcy. |
| 6 | `GetSupplierStats` | GET | `/suppliers/{id}/stats` | User | Statystyki faktur (liczba, sumy, zaległe). |
| 7 | `RefreshSupplierStats` | POST | `/suppliers/{id}/stats/refresh` | Admin | Wymuszenie przeliczenia cache'owanych statystyk. |
| 8 | `GetSupplierInvoices` | GET | `/suppliers/{id}/invoices` | User | Lista faktur dla konkretnego dostawcy. |
| 9 | `RefreshSupplierVat` | POST | `/suppliers/{id}/refresh-vat` | Admin | Odświeżenie danych z Białej Listy VAT. |
| 10 | `CreateSupplierFromVat` | POST | `/suppliers/from-vat` | Admin | Tworzenie dostawcy z danych rejestru VAT. |

### Parametry zapytań (ListSuppliers)

| Parametr | Typ | Wymagany | Opis |
|---|---|---|---|
| `settingId` | string (UUID) | Tak | ID ustawień firmy |
| `status` | string | Nie | `Active`, `Inactive`, `Blocked` |
| `search` | string | Nie | Wyszukiwanie po nazwie lub NIP |
| `hasSelfBillingAgreement` | boolean | Nie | Filtrowanie po fladze samofakturowania |
| `top` / `skip` | integer | Nie | Paginacja |

---

## 2. Umowy samofakturowania

| # | operationId | Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|---|---|
| 1 | `ListSbAgreements` | GET | `/sb-agreements` | User | Lista umów. Wymaga `settingId`. |
| 2 | `CreateSbAgreement` | POST | `/sb-agreements` | Admin | Tworzenie umowy. Dostawca musi istnieć i być aktywny. |
| 3 | `GetSbAgreement` | GET | `/sb-agreements/{id}` | User | Pobranie szczegółów umowy. |
| 4 | `UpdateSbAgreement` | PATCH | `/sb-agreements/{id}` | Admin | Aktualizacja pól umowy. |
| 5 | `TerminateSbAgreement` | POST | `/sb-agreements/{id}/terminate` | Admin | Zakończenie umowy → status = Terminated. |
| 6 | `ListSbAgreementAttachments` | GET | `/sb-agreements/{id}/attachments` | User | Lista załączników umowy. |
| 7 | `UploadSbAgreementAttachment` | POST | `/sb-agreements/{id}/attachments` | Admin | Przesłanie podpisanej umowy PDF (maks. 10 MB). |

### Statusy umów

- **Active** — Umowa obowiązuje
- **Expired** — Po dacie `validTo` (ustawiane automatycznie przez timer trigger)
- **Terminated** — Zakończona ręcznie przez API

---

## 3. Szablony samofakturowania

| # | operationId | Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|---|---|
| 1 | `ListSbTemplates` | GET | `/sb-templates` | User | Lista szablonów. Wymaga `settingId`. |
| 2 | `CreateSbTemplate` | POST | `/sb-templates` | Admin | Tworzenie nowego szablonu pozycji faktury. |
| 3 | `GetSbTemplate` | GET | `/sb-templates/{id}` | User | Pobranie szczegółów szablonu. |
| 4 | `UpdateSbTemplate` | PATCH | `/sb-templates/{id}` | Admin | Aktualizacja pól szablonu. |
| 5 | `DeleteSbTemplate` | DELETE | `/sb-templates/{id}` | Admin | Usunięcie szablonu. |
| 6 | `DuplicateSbTemplate` | POST | `/sb-templates/duplicate` | Admin | Duplikacja szablonu dla innego dostawcy. |

### Pola szablonu

| Pole | Typ | Opis |
|---|---|---|
| `itemDescription` | string | Opis pozycji faktury |
| `quantity` | number | Domyślna ilość |
| `unit` | string | Jednostka miary (np. "szt.", "godz.", "m²") |
| `unitPrice` | number | Cena jednostkowa (netto) |
| `vatRate` | integer | Stawka VAT w %. -1 = zwolniony |
| `currency` | string | Domyślnie: PLN |

---

## 4. Faktury samofakturowania i przepływ pracy

| # | operationId | Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|---|---|
| 1 | `ListSelfBillingInvoices` | GET | `/invoices/self-billing` | User | Lista z filtrami. Wymaga `settingId`. |
| 2 | `CreateSelfBillingInvoice` | POST | `/invoices/self-billing` | Admin | Tworzenie pojedynczej faktury samofakturowania. |
| 3 | `PreviewSelfBillingInvoice` | POST | `/invoices/self-billing/preview` | User | Podgląd bez zapisywania. |
| 4 | `GenerateSelfBillingInvoices` | POST | `/invoices/self-billing/generate` | Admin | Generowanie faktur z szablonów za okres. |
| 5 | `ConfirmGeneratedSelfBilling` | POST | `/invoices/self-billing/generate/confirm` | Admin | Zatwierdzenie i zapisanie wygenerowanych faktur. |
| 6 | `BatchCreateSelfBillingInvoices` | POST | `/invoices/self-billing/batch` | Admin | Tworzenie wsadowe (maks. 100). |
| 7 | `UpdateSelfBillingStatus` | PATCH | `/invoices/self-billing/{id}/status` | Admin | Bezpośrednia zmiana statusu. |
| 8 | `SubmitForSellerReview` | POST | `/invoices/self-billing/{id}/submit` | Admin | Draft → PendingSeller. |
| 9 | `SellerApproveInvoice` | POST | `/invoices/self-billing/{id}/approve` | Approver | PendingSeller → SellerApproved. |
| 10 | `SellerRejectInvoice` | POST | `/invoices/self-billing/{id}/reject` | Approver | PendingSeller → SellerRejected (wymagany powód). |
| 11 | `SendSelfBillingToKsef` | POST | `/invoices/self-billing/{id}/send-ksef` | Admin | SellerApproved → SentToKsef. |

### Przepływ pracy

```
Draft → PendingSeller → SellerApproved → SentToKsef
                      ↘ SellerRejected
```

### Statusy faktur

| Status | Opis |
|---|---|
| `Draft` | Nowo utworzona, edytowalna |
| `PendingSeller` | Oczekuje na akceptację sprzedawcy |
| `SellerApproved` | Sprzedawca zatwierdził, gotowa do KSeF |
| `SellerRejected` | Sprzedawca odrzucił (patrz `rejectionReason`) |
| `SentToKsef` | Wysłana do KSeF (posiada `ksefReferenceNumber`) |

---

## 5. Import samofakturowania

| # | operationId | Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|---|---|
| 1 | `ImportSelfBillingFile` | POST | `/invoices/self-billing/import` | Admin | Przesłanie pliku CSV/XLSX → zwraca podgląd. |
| 2 | `ConfirmSelfBillingImport` | POST | `/invoices/self-billing/import/confirm` | Admin | Zatwierdzenie i utworzenie faktur z importu. |
| 3 | `DownloadSelfBillingTemplate` | GET | `/invoices/self-billing/import/template` | User | Pobranie szablonu CSV/XLSX. |

### Przepływ importu

1. Przesłanie pliku przez `ImportSelfBillingFile` → otrzymanie `importId` + podgląd wierszy z walidacją
2. Przegląd podglądów (wiersze poprawne/niepoprawne)
3. Zatwierdzenie przez `ConfirmSelfBillingImport` z `importId` → faktury utworzone w Dataverse

---

## 6. Timer Trigger

| Nazwa | Harmonogram | Opis |
|---|---|---|
| `sb-agreement-expiry-check` | Codziennie 06:00 UTC | Automatyczne zakończenie wygasłych umów, ostrzeżenie o wygasających (30 dni), aktualizacja flagi `hasSelfBillingAgreement` dostawcy |

Jest to timer trigger Azure Functions działający w tle — nie jest dostępny przez konektor.

---

## 7. Przykłady Power Automate

### Przykład 1: Miesięczne generowanie faktur

```
Trigger: Cykliczny (1. dnia każdego miesiąca, 08:00)
  ↓
Akcja: DVLP-KSeF → GenerateSelfBillingInvoices
  Body: { settingId: "<UUID>", period: { month: @{triggerOutputs()['queries']['month']}, year: @{triggerOutputs()['queries']['year']} } }
  ↓
Warunek: liczba podglądów > 0
  ↓ Tak
Akcja: DVLP-KSeF → ConfirmGeneratedSelfBilling
  Body: { settingId: "<UUID>", previews: @{body('GenerateSelfBillingInvoices')?['previews']} }
  ↓
Akcja: Wyślij powiadomienie e-mail z podsumowaniem (liczba utworzonych, łączna kwota brutto)
```

### Przykład 2: Import z SharePoint

```
Trigger: Gdy plik zostanie utworzony (SharePoint → /Self-Billing/Import/)
  ↓
Akcja: Pobierz zawartość pliku (SharePoint)
  ↓
Akcja: DVLP-KSeF → ImportSelfBillingFile
  Query: settingId = "<UUID>"
  Body: zawartość pliku z SharePoint
  ↓
Warunek: liczba niepoprawnych = 0
  ↓ Tak
Akcja: DVLP-KSeF → ConfirmSelfBillingImport
  Body: { importId: @{body('ImportSelfBillingFile')?['importId']} }
  ↓ Nie
Akcja: Wyślij wiadomość Teams do zespołu finansowego z błędami walidacji
```

### Przykład 3: Powiadomienie o akceptacji sprzedawcy

```
Trigger: Gdy zmieni się status faktury samofakturowania
  ↓
Warunek: status = "PendingSeller"
  ↓ Tak
Akcja: Wyślij e-mail z prośbą o akceptację do kontaktu dostawcy
  Zawartość: numer faktury, kwota brutto, termin płatności, linki akceptuj/odrzuć
```

---

## 8. Copilot Studio Agent

Rekomendowane operacje do integracji z Copilot Studio:

| Operacja | Przypadek użycia |
|---|---|
| `ListSuppliers` | „Pokaż dostawców z umowami samofakturowania" |
| `GetSupplierStats` | „Jakie są statystyki dostawcy X?" |
| `ListSelfBillingInvoices` | „Pokaż oczekujące faktury samofakturowania" |
| `GenerateSelfBillingInvoices` | „Wygeneruj faktury za styczeń 2026" |
| `ListSbAgreements` | „Pokaż aktywne umowy" |
| `CreateSupplierFromVat` | „Dodaj dostawcę z NIP 5260250995" |

Skonfiguruj jako **Akcje** w Copilot Studio z opisowymi frazami wyzwalającymi.
