# Copilot Studio Agent — KSeF Copilot

## Przegląd

KSeF Copilot zawiera gotowego agenta dla **Microsoft Copilot Studio**, działającego w Microsoft Teams. Agent korzysta z Custom Connector i pozwala użytkownikom odpytywać system fakturowy w języku naturalnym.

## Wymagania

- Microsoft Copilot Studio (licencja)
- Custom Connector skonfigurowany i podłączony do API KSeF Copilot
- Środowisko Power Platform z zaimportowaną solucją

## Narzędzia agenta (14)

Agent udostępnia następujące narzędzia poprzez Custom Connector:

### Faktury
| Narzędzie | Operacja | Endpoint |
|-----------|----------|----------|
| Wyszukiwanie faktur | `ListInvoices` | `GET /invoices` |
| Szczegóły faktury | `GetInvoice` | `GET /invoices/{id}` |
| Notatki do faktury | `ListInvoiceNotes` | `GET /invoices/{id}/notes` |
| Dodaj notatkę | `CreateInvoiceNote` | `POST /invoices/{id}/notes` |

### Analityka
| Narzędzie | Operacja | Endpoint |
|-----------|----------|----------|
| Statystyki dashboard | `GetDashboardStats` | `GET /stats` |
| Prognoza wydatków | `GetForecast` | `GET /forecasts` |
| Wykrywanie anomalii | `GetAnomalies` | `GET /anomalies` |
| Weryfikacja VAT | `VerifyVat` | `GET /vat-whitelist/{nip}` |

### Synchronizacja
| Narzędzie | Operacja | Endpoint |
|-----------|----------|----------|
| Synchronizacja KSeF | `StartKsefSync` | `POST /ksef/sync` |

### Zatwierdzanie
| Narzędzie | Operacja | Endpoint |
|-----------|----------|----------|
| Oczekujące akceptacje | `GetPendingApprovals` | `GET /approvals/pending` |
| Zatwierdź fakturę | `ApproveInvoice` | `POST /invoices/{id}/approve` |

### MPK i budżety
| Narzędzie | Operacja | Endpoint |
|-----------|----------|----------|
| Lista centrów kosztowych | `ListMpkCenters` | `GET /mpk-centers` |
| Status budżetu | `GetBudgetStatus` | `GET /mpk-centers/{id}/budget-status` |

### Powiadomienia
| Narzędzie | Operacja | Endpoint |
|-----------|----------|----------|
| Powiadomienia | `ListNotifications` | `GET /notifications` |

## Konfiguracja agenta

1. Otwórz [Copilot Studio](https://copilotstudio.microsoft.com/)
2. Utwórz nowego agenta lub edytuj istniejącego
3. Dodaj **Custom Connector** jako źródło danych
4. Wybierz connector **KSeF Copilot API**
5. Skonfiguruj uwierzytelnianie (Entra ID OAuth2)
6. Aktywuj narzędzia (topics) agenta
7. Opublikuj agenta w Microsoft Teams

## Przykładowe zapytania

- *"Pokaż faktury z ostatniego tygodnia"*
- *"Ile wydaliśmy w lutym na hosting?"*
- *"Czy są jakieś anomalie w fakturach?"*
- *"Jaki jest budżet MPK Marketing?"*
- *"Zsynchronizuj faktury z KSeF"*
- *"Zatwierdź fakturę FV/2026/03/001"*

## Powiązane dokumenty

- [Custom Connector](../../deployment/powerplatform/connector/README.md)
- [API Reference](API.md)
- [Power Platform](../../deployment/powerplatform/README.md)
