# Historia zmian

Wszystkie istotne zmiany w projekcie **KSeF Copilot** są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).
Projekt stosuje [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Ten plik obejmuje zmiany w **API** (`api/`) oraz zasobach **Power Platform** (`deployment/powerplatform/`).
> Historia zmian poszczególnych frontendów dostępna jest osobno:
> - 📄 [Web App (Next.js) — changelog](web/public/changelog.md)
> - 📄 [Code App (React SPA) — changelog](code-app/public/changelog.md)

---

## [Nieudostępnione]

---

## [0.3.5] — 2026-04-01

### Dodane — Zgodność XML z interpretacją KIS (Self-Billing)

Implementacja wymagań interpretacji KIS z 27.02.2026 (0112-KDIL1-3.4012.874.2025.2.KK) — zatwierdzanie samofaktur na podstawie pliku XML.

#### Generowanie i przechowywanie XML
- `POST /self-billing/invoices/{id}/submit` — generowanie XML na etapie submit (nie przy wysyłce do KSeF), zapis `xmlContent` + `xmlHash` (SHA256) na fakturze
- `GET /self-billing/invoices/{id}/xml` — nowy endpoint pobierania pliku XML (`Content-Type: application/xml`)
- `POST /self-billing/invoices/{id}/send-ksef` — korzysta z zapisanego XML (bez regeneracji), walidacja integralności hash
- `POST /self-billing/invoices/{id}/revert` — czyszczenie `xmlContent` i `xmlHash` przy cofnięciu do Draft

#### Metadane zatwierdzenia (DodatkowyOpis)
- `POST /self-billing/invoices/{id}/approve` — regeneracja XML z sekcją `DodatkowyOpis`: data zatwierdzenia, osoba, system, hash
- Stopka (`StopkaFaktury`) z notą zatwierdzenia
- Rozszerzony audit trail — notatka z timestamp i hash XML
- `SystemInfo` w nagłówku XML: „KSeF Copilot by Developico"

#### Auto-approve
- Umowy SB z flagą `autoApprove` — faktury automatycznie zatwierdzane przy submicie (pominięcie PendingSeller)

#### Pole `additionalDescriptions` w interfejsie `KsefInvoice`
- `api/src/lib/ksef/types.ts` — nowe opcjonalne pole `additionalDescriptions?: { key: string; value: string }[]`
- `api/src/lib/ksef/parser.ts` — `buildInvoiceXml()` generuje elementy `DodatkowyOpis` z par klucz-wartość

### Dodane — Infrastruktura Dataverse
- Nowa kolumna `dvlp_xmlcontent` (Memo, max 1 048 576) na `dvlp_ksefselfbillinginvoice` — przechowywanie wygenerowanego XML
- Nowa kolumna `dvlp_xmlhash` (String, max 100) na `dvlp_ksefselfbillinginvoice` — hash SHA256
- `Provision-SbApprovalColumns.ps1` — rozszerzony o tworzenie kolumn XML (Step 5)

### Dodane — UI (Web App + Code App)
- Komponent `<InvoiceXmlPreview>` — wizualizacja faktury w formacie tabelarycznym (MF XSL-inspired)
- Zakładki w widoku SB: „Dane" | „Podgląd faktury" | „XML"
- Druk / PDF via `window.print()` z layoutem A4
- Podgląd XML dla faktur zsynchronizowanych z KSeF (reużycie komponentu)
- Nowe klucze i18n `xmlPreview.*` (35+ kluczy, PL + EN)

### Naprawione
- Mapping pól `rawXml` / `xmlContent` — API zwraca oba pola (backward-compatible alias)

---

## [0.3.0.1] — 2026-03-23

### Dodane

- **Szablon numeru faktury SB per dostawca** — nowa kolumna `dvlp_sbinvoicenumbertemplate` (String, MaxLength 200) w tabeli `dvlp_ksefsupplier`
- `PATCH /suppliers/{id}` obsługuje pole `sbInvoiceNumberTemplate`
- Generowanie numerów faktur SB na podstawie szablonu dostawcy (zmienne: `{YYYY}`, `{MM}`, `{NNN}`, `{NNNN}`, `{SUPPLIER}`, `{NIP}`)
- Nowy skrypt PowerShell `Provision-SelfBillingSchema.ps1` tworzy kolumnę w Dataverse

### Eksport solucji

- `DevelopicoKSeF_0_3_0_1.zip` — solucja Dataverse z definicją kolumny `dvlp_sbinvoicenumbertemplate` na tabeli `dvlp_ksefsupplier`
- `KSeFCopilotCustomConnectorbyDevelopico_0_3_0_1.zip` — Custom Connector zsynchronizowany z solucją

---

## [0.3.0] — 2026-03-20

### Dodane — Samofakturowanie (Self-Billing)

#### Zarządzanie dostawcami
- `GET /suppliers` — lista dostawców (filtrowanie, paginacja)
- `POST /suppliers` — tworzenie dostawcy
- `GET /suppliers/{id}` — szczegóły dostawcy
- `PATCH /suppliers/{id}` — aktualizacja dostawcy
- `DELETE /suppliers/{id}` — dezaktywacja dostawcy (soft delete)
- `GET /suppliers/{id}/stats` — statystyki dostawcy (faktury, kwoty, SB)
- `POST /suppliers/{id}/refresh-stats` — odświeżenie statystyk
- `GET /suppliers/{id}/invoices` — faktury dostawcy
- `POST /suppliers/{id}/refresh-vat` — odświeżenie danych z Białej Listy
- `POST /suppliers/create-from-vat` — tworzenie dostawcy na podstawie NIP (Biała Lista)
- Nowa tabela Dataverse: `dvlp_supplier`

#### Umowy samofakturowania (SB Agreements)
- `GET /sb-agreements` — lista umów SB
- `POST /sb-agreements` — tworzenie umowy
- `GET /sb-agreements/{id}` — szczegóły umowy
- `PATCH /sb-agreements/{id}` — aktualizacja umowy
- `POST /sb-agreements/{id}/terminate` — terminacja umowy
- Nowa tabela Dataverse: `dvlp_sbagreement`

#### Szablony samofakturowania (SB Templates)
- `GET /sb-templates` — lista szablonów
- `POST /sb-templates` — tworzenie szablonu
- `GET /sb-templates/{id}` — szczegóły szablonu
- `PATCH /sb-templates/{id}` — aktualizacja szablonu
- `DELETE /sb-templates/{id}` — usunięcie szablonu
- `POST /sb-templates/{id}/duplicate` — duplikowanie szablonu
- Nowa tabela Dataverse: `dvlp_sbtemplate`

#### Faktury samofakturowania (SB Invoices)
- `GET /sb-invoices` — lista faktur SB (filtrowanie po statusie, paginacja)
- `GET /sb-invoices/{id}` — szczegóły faktury SB
- `POST /sb-invoices/generate` — podgląd generowania faktur na okres
- `POST /sb-invoices/generate/confirm` — potwierdzenie i utworzenie faktur
- `POST /sb-invoices/{id}/submit` — wysłanie do akceptacji sprzedawcy
- `POST /sb-invoices/{id}/approve` — zatwierdzenie przez sprzedawcę
- `POST /sb-invoices/{id}/reject` — odrzucenie (z powodem)
- `PATCH /sb-invoices/{id}/status` — aktualizacja statusu
- `POST /sb-invoices/{id}/send-to-ksef` — wysłanie do KSeF
- `POST /sb-invoices/import` — import z CSV/Excel (walidacja + podgląd)
- `POST /sb-invoices/import/confirm` — potwierdzenie importu
- `GET /sb-invoices/import/template` — pobranie szablonu importu
- Nowa tabela Dataverse: `dvlp_selfbillinginvoice`
- Workflow statusów: Draft → PendingSeller → SellerApproved → SentToKsef

### Dodane — UI
- Code App (React SPA): strony dostawców, szczegółów dostawcy, samofakturowania z generowaniem i importem
- Web App (Next.js): strony dostawców, szczegółów dostawcy, samofakturowania, nawigacja, dashboard KPIs
- Tłumaczenia PL/EN dla obu aplikacji

### Dodane — Tooling
- `swagger.local.yaml` — lokalna wersja specyfikacji OpenAPI (localhost:7071)
- Rozszerzenie `seed-testdata.ts` o encje SB (dostawcy, umowy, faktury)

---

## [0.2.0] — 2026-03-10

### Dodane — Centra kosztowe (MPK)
- `GET /mpk-centers` — lista centrów kosztowych (z filtrowaniem po settingId, activeOnly)
- `POST /mpk-centers` — tworzenie centrum kosztowego (Admin)
- `GET /mpk-centers/{id}` — szczegóły centrum kosztowego
- `PATCH /mpk-centers/{id}` — aktualizacja centrum kosztowego (Admin)
- `DELETE /mpk-centers/{id}` — dezaktywacja centrum kosztowego (Admin, soft delete)
- `GET /mpk-centers/{id}/approvers` — lista akceptantów centrum kosztowego
- `PUT /mpk-centers/{id}/approvers` — ustawienie akceptantów (Admin)
- Nowa tabela Dataverse: `dvlp_ksefmpkcenter` (name, code, budget, SLA, settingId)
- Nowa tabela Dataverse: `dvlp_ksefmpkapprover` (link MPK↔SystemUser, thresholds)

### Dodane — Workflow zatwierdzania faktur
- `POST /invoices/{id}/approve` — zatwierdzenie faktury z opcjonalnym komentarzem
- `POST /invoices/{id}/reject` — odrzucenie faktury (komentarz wymagany)
- `POST /invoices/{id}/cancel-approval` — anulowanie zatwierdzenia (Admin)
- `POST /invoices/{id}/refresh-approvers` — odświeżenie listy akceptantów
- `POST /invoices/bulk-approve` — masowe zatwierdzanie (do 100 faktur)
- `GET /approvals/pending` — lista faktur oczekujących na zatwierdzenie
- Timer trigger `approval-sla-check` — co godzinę sprawdza przekroczenia SLA
- Nowe pola na fakturze: `approvalStatus`, `mpkCenterId`, `approvedBy`, `approvedAt`, `approvalComment`, `submittedForApprovalAt`

### Dodane — Budżetowanie
- `GET /mpk-centers/{id}/budget-status` — status budżetu dla pojedynczego MPK
- `GET /budget/summary` — podsumowanie budżetów dla wszystkich MPK

### Dodane — Powiadomienia
- `GET /notifications` — lista powiadomień użytkownika
- `PATCH /notifications/{id}/read` — oznaczenie jako przeczytane
- `POST /notifications/{id}/dismiss` — odrzucenie powiadomienia
- `GET /notifications/unread-count` — licznik nieprzeczytanych
- Nowa tabela Dataverse: `dvlp_ksefnotification` (type, recipientId, invoiceId, read, dismissed)

### Dodane — Raporty
- `GET /reports/budget-utilization` — raport wykorzystania budżetu per MPK
- `GET /reports/approval-history` — historia akceptacji z filtrami (data, MPK, status)
- `GET /reports/approver-performance` — statystyki wydajności akceptantów
- `GET /reports/invoice-processing` — raport przetwarzania faktur

---

## [0.1.0] — 2026-02-09

### Dodane
- Pierwsze publiczne wydanie KSeF Copilot API
- Azure Functions v4 (Node.js/TypeScript) — rdzeń REST API
- Integracja z Microsoft Dataverse
- Synchronizacja faktur zakupowych z KSeF przez sesję
- Kategoryzacja faktur przez Azure OpenAI (GPT-4o-mini) — MPK, kategoria, projekt
- Silnik wykrywania anomalii z konfigurowalnymi regułami
- Prognozowanie wydatków miesięcznych (wg kategorii, MPK, dostawcy)
- Endpoint statystyk dashboardu
- Weryfikacja dostawców na białej liście VAT
- Integracja z kursami walut NBP (PLN/EUR/USD)
- Middleware uwierzytelniania Entra ID (Azure AD) OAuth2
- Obsługa wielu firm (`settingId` / `tenantNip`)
- **Power Platform Custom Connector** — pełna definicja OpenAPI konektora do KSeF Copilot API (`deployment/powerplatform/connector/`)
- **Copilot Studio Agent** — przykładowy agent dla Microsoft Teams z 14 narzędziami konektora (wyszukiwanie faktur, raporty wydatków, wykrywanie anomalii, prognozy, weryfikacja VAT)
- `POST /ksef/sync` (`StartKsefSync`) — endpoint natywnej synchronizacji faktur z KSeF przez sesję
- `POST /invoices/{id}/notes` (`CreateInvoiceNote`) — dodawanie notatek wewnętrznych do faktur
- `GET /invoices/{id}/notes` (`ListInvoiceNotes`) — pobieranie notatek przypisanych do faktury
- Nowe schematy odpowiedzi: `InvoiceListResponse`, `Note`, `KsefSyncResult`

[Nieudostępnione]: https://github.com/Developico/KSeFCopilot/compare/v0.3.5...HEAD
[0.3.0]: https://github.com/Developico/KSeFCopilot/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Developico/KSeFCopilot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Developico/KSeFCopilot/releases/tag/v0.1.0
