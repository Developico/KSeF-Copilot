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

## [0.2.0] — 2026-03-01

### Dodane
- **Power Platform Custom Connector** — pełna definicja OpenAPI konektora do KSeF Copilot API (`deployment/powerplatform/connector/`)
- **Copilot Studio Agent** — przykładowy agent dla Microsoft Teams z 14 narzędziami konektora (wyszukiwanie faktur, raporty wydatków, wykrywanie anomalii, prognozy, weryfikacja VAT)
- `POST /ksef/sync` (`StartKsefSync`) — endpoint natywnej synchronizacji faktur z KSeF przez sesję
- `POST /invoices/{id}/notes` (`CreateInvoiceNote`) — dodawanie notatek wewnętrznych do faktur
- `GET /invoices/{id}/notes` (`ListInvoiceNotes`) — pobieranie notatek przypisanych do faktury
- Nowe schematy odpowiedzi: `InvoiceListResponse`, `Note`, `KsefSyncResult`

### Poprawki
- `GET /invoices` — pusty schemat odpowiedzi (`schema: {}`) zastąpiony przez `InvoiceListResponse` z metadanymi paginacji
- Custom Connector swagger: poprawiona trasa synchronizacji z przestarzałej `/sync` na `/ksef/sync`

### Zmiany
- Zaktualizowano `.gitignore` — wewnętrzne dokumenty architektoniczne i audytowe wykluczone z publicznego repozytorium

---

## [0.1.0] — 2026-01-15

### Dodane
- Pierwsze wydanie KSeF Copilot API
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

[Nieudostępnione]: https://github.com/Developico/KSeF-Copilot/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Developico/KSeF-Copilot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Developico/KSeF-Copilot/releases/tag/v0.1.0
