# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Invoice document field (`dvlp_doc`) for storing invoice scans/images up to 128MB
- Drag & drop document upload component with progress indicator
- Modern document preview with fullscreen mode and zoom
- Document/attachment status icons on invoice list (📄 document, 📎 attachments)
- Azure Functions endpoints for document upload, download, and delete
- Chunked upload support for large files via Dataverse File column API
- Multi-environment invoice separation using `dvlp_settingid` lookup field
- Test data seed script with `--name` parameter for targeting specific settings
- Helper scripts for checking settings and invoices (`check-settings.ts`, `check-invoices.ts`)

### Changed
- Attachments section on invoice detail is now collapsed by default
- KSeF sync now properly links imported invoices to their environment setting
- Updated sync API endpoints to accept and use `settingId` parameter
- Frontend sync page passes selected company's settingId to backend
- Invoice queries filter by `_dvlp_settingid_value` for environment isolation

### Fixed
- Fixed session creation field name (`dvlp_sessionstatus` instead of `dvlp_status`)
- Fixed OData binding syntax for lookup fields in session and synclog services
- Invoices from same NIP now correctly separated by environment (PROD vs Demo)

### Security
- Implemented proper JWT signature verification using `jose` library
- Added startup validation to prevent SKIP_AUTH in production
- Configured security group to role mapping for authorization

### Added
- Open source documentation (SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md)
- GitHub Actions CI/CD workflow
- Dependabot configuration for automated dependency updates
- ESLint configuration for API
- Issue and PR templates
- Pre-commit hooks for type checking and linting

## [0.1.0] - 2026-01-31

### Added
- Initial release of KSeF integration module
- Azure Functions REST API for KSeF operations
- Next.js dashboard for invoice management
- Microsoft Dataverse integration for data storage
- Azure Entra ID authentication and authorization
- Azure Key Vault integration for secure token storage
- KSeF API client for invoice synchronization
- Manual invoice categorization (MPK, category, project)
- Payment status tracking
- AI-powered automatic categorization (Azure OpenAI)
- Multi-language support (Polish, English)
- Multi-tenant support (multiple companies)
- Export functionality (CSV, Excel)
- Comprehensive documentation

### Security
- Azure Key Vault for token management
- RBAC with Admin and Reader roles
- Security group-based authorization

### Infrastructure
- Bicep templates for Azure deployment
- Dataverse solution package
- PowerShell deployment scripts

[Unreleased]: https://github.com/dvlp-dev/dvlp-ksef/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dvlp-dev/dvlp-ksef/releases/tag/v0.1.0
