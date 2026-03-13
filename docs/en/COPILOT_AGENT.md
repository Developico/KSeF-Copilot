# Copilot Studio Agent — KSeF Copilot

## Overview

KSeF Copilot includes a ready-to-use agent for **Microsoft Copilot Studio**, running inside Microsoft Teams. The agent uses a Custom Connector and allows users to query the invoicing system using natural language.

## Prerequisites

- Microsoft Copilot Studio (license)
- Custom Connector configured and connected to the KSeF Copilot API
- Power Platform environment with the imported solution

## Agent Tools (14)

The agent exposes the following tools through the Custom Connector:

### Invoices
| Tool | Operation | Endpoint |
|------|-----------|----------|
| Search invoices | `ListInvoices` | `GET /invoices` |
| Invoice details | `GetInvoice` | `GET /invoices/{id}` |
| Invoice notes | `ListInvoiceNotes` | `GET /invoices/{id}/notes` |
| Add note | `CreateInvoiceNote` | `POST /invoices/{id}/notes` |

### Analytics
| Tool | Operation | Endpoint |
|------|-----------|----------|
| Dashboard stats | `GetDashboardStats` | `GET /stats` |
| Spending forecast | `GetForecast` | `GET /forecasts` |
| Anomaly detection | `GetAnomalies` | `GET /anomalies` |
| VAT verification | `VerifyVat` | `GET /vat-whitelist/{nip}` |

### Synchronization
| Tool | Operation | Endpoint |
|------|-----------|----------|
| KSeF sync | `StartKsefSync` | `POST /ksef/sync` |

### Approval
| Tool | Operation | Endpoint |
|------|-----------|----------|
| Pending approvals | `GetPendingApprovals` | `GET /approvals/pending` |
| Approve invoice | `ApproveInvoice` | `POST /invoices/{id}/approve` |

### Cost Centers & Budgets
| Tool | Operation | Endpoint |
|------|-----------|----------|
| List cost centers | `ListMpkCenters` | `GET /mpk-centers` |
| Budget status | `GetBudgetStatus` | `GET /mpk-centers/{id}/budget-status` |

### Notifications
| Tool | Operation | Endpoint |
|------|-----------|----------|
| Notifications | `ListNotifications` | `GET /notifications` |

## Agent Configuration

1. Open [Copilot Studio](https://copilotstudio.microsoft.com/)
2. Create a new agent or edit an existing one
3. Add **Custom Connector** as a data source
4. Select the **KSeF Copilot API** connector
5. Configure authentication (Entra ID OAuth2)
6. Activate agent tools (topics)
7. Publish the agent to Microsoft Teams

## Sample Queries

- *"Show invoices from last week"*
- *"How much did we spend on hosting in February?"*
- *"Are there any anomalies in invoices?"*
- *"What's the Marketing cost center budget?"*
- *"Sync invoices from KSeF"*
- *"Approve invoice FV/2026/03/001"*

## Related Documentation

- [Custom Connector](../../deployment/powerplatform/connector/README.md)
- [API Reference](API.md)
- [Power Platform](../../deployment/powerplatform/README.md)
