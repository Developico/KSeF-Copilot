# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.2.0] — 2026-03-01

### Added
- **Power Platform Custom Connector** — full OpenAPI connector definition for KSeF Copilot API (`deployment/powerplatform/connector/`)
- **Copilot Studio Agent** — sample agent for Microsoft Teams with 14 connector tools (invoice search, expense reports, anomaly detection, forecasts, VAT lookup)
- `POST /ksef/sync` (`StartKsefSync`) — native KSeF session-based invoice synchronization endpoint
- `POST /invoices/{id}/notes` (`CreateInvoiceNote`) — add internal notes to invoices
- `GET /invoices/{id}/notes` (`ListInvoiceNotes`) — list notes attached to an invoice
- New response schemas: `InvoiceListResponse`, `Note`, `KsefSyncResult`

### Fixed
- `GET /invoices` response schema was empty (`schema: {}`) — now returns `InvoiceListResponse` with pagination metadata
- Custom Connector swagger: corrected sync route from legacy `/sync` to `/ksef/sync`

### Changed
- Updated `.gitignore` to exclude internal architecture and audit documents from public repository

---

## [0.1.0] — 2026-01-15

### Added
- Initial release of KSeF Copilot API
- Azure Functions v4 (Node.js/TypeScript) REST API core
- Microsoft Dataverse backend integration
- KSeF (Krajowy System e-Faktur) session-based invoice synchronization
- Azure OpenAI (GPT-4o-mini) invoice categorization — MPK, category, project assignment
- Anomaly detection engine with configurable rules
- Monthly expense forecasting (by category, MPK, supplier)
- Dashboard statistics endpoint
- VAT White List lookup (Polish tax authority)
- NBP exchange rate integration (PLN/EUR/USD)
- Entra ID (Azure AD) OAuth2 authentication middleware
- Multi-company support via `settingId` / `tenantNip`

[Unreleased]: https://github.com/Developico/KSeF-Copilot/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Developico/KSeF-Copilot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Developico/KSeF-Copilot/releases/tag/v0.1.0
