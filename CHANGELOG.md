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

[Nieudostępnione]: https://github.com/Developico/KSeFCopilot/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Developico/KSeFCopilot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Developico/KSeFCopilot/releases/tag/v0.1.0
