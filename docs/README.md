# Dokumentacja projektu dvlp-ksef

> Przewodnik po dokumentacji integracji z Krajowym Systemem e-Faktur (KSeF)

**Ostatnia aktualizacja:** 2026-04-14
**Wersja dokumentacji:** 4.0

---

## Nawigacja

### Dla nowego developera

Zalecana ścieżka czytania:

1. [README projektu](../README.md) — ogólny opis, quick start
2. [Uruchomienie lokalne](./pl/LOKALNE_WDRO%C5%BBENIE.md) — jak uruchomić projekt na swoim komputerze
3. [Architektura](./pl/ARCHITEKTURA.md) — jak działa system
4. [Dokumentacja API](./pl/API.md) — endpointy REST API
5. [Schemat Dataverse](./pl/DATAVERSE_SCHEMAT.md) — model danych

### Dla administratora / DevOps

1. [Przewodnik wdrożenia](../deployment/README.md) — **pełny przewodnik 13 kroków**
2. [Lista kontrolna](../deployment/CHECKLIST.md) — interaktywna checklist z polami danych
3. [Zmienne środowiskowe](./pl/ZMIENNE_SRODOWISKOWE.md) — kompletna lista env vars
4. [Rozwiązywanie problemów](./pl/ROZWIAZYWANIE_PROBLEMOW.md) — troubleshooting

---

## Dokumentacja techniczna (ten katalog)

### Architektura i API

| Dokument | Opis |
|----------|------|
| [Architektura](./pl/ARCHITEKTURA.md) | Architektura systemu, wzorce projektowe, stos technologiczny, przepływy danych |
| [Dokumentacja API (PL)](./pl/API.md) | Pełna dokumentacja REST API — endpointy, autentykacja, błędy, limity |
| [Prognozowanie i anomalie](./pl/PROGNOZOWANIE_I_ANOMALIE.md) | Algorytmy prognozowania, reguły anomalii, parametry, presety |
| [Schemat Dataverse](./pl/DATAVERSE_SCHEMAT.md) | Model danych Dataverse — tabele, relacje, OptionSets, indeksy |

### Materiały referencyjne

| Dokument | Opis |
|----------|------|
| [Zmienne środowiskowe](./pl/ZMIENNE_SRODOWISKOWE.md) | Jedno źródło prawdy dla wszystkich env vars (API + Web) |
| [Rozwiązywanie problemów](./pl/ROZWIAZYWANIE_PROBLEMOW.md) | Troubleshooting zebrane z całej dokumentacji |
| [Uruchomienie lokalne](./pl/LOKALNE_WDRO%C5%BBENIE.md) | Instrukcja uruchomienia projektu od zera |
| [Custom Connector](./pl/POWER_PLATFORM_CUSTOM_CONNECTOR.md) | Konfiguracja Custom Connector w Power Platform |
| [Code Apps — plan](./pl/POWER_APPS_CODE_APPS_PLAN.md) | Analiza, fazy wdrożenia, Code App (Vite + React) |
| [Analiza kosztów](./pl/ANALIZA_KOSZTOW.md) | Analiza kosztów rozwiązania w Azure |
| [Role i uprawnienia](./pl/ROLE.md) | Model RBAC — role Admin/User/Approver, macierz dostępu |
| [Konektor samofakturowania](./pl/SAMOFAKTUROWANIE_CONNECTOR.md) | Operacje konektora Self-Billing, przykłady Power Automate, Copilot Studio |
| [Konektor — dokumenty kosztowe](./COST_DOCUMENTS_CONNECTOR.md) | Operacje konektora dla dokumentów kosztowych (10 operacji) |

### English versions

| Document | Description |
|----------|------|
| [Architecture (EN)](./en/ARCHITECTURE.md) | System architecture — English version |
| [API Reference (EN)](./en/API.md) | REST API documentation — English version |
| [Forecasting & Anomalies (EN)](./en/FORECASTING_AND_ANOMALIES.md) | Forecasting algorithms, anomaly rules, parameters, presets |
| [Dataverse Schema (EN)](./en/DATAVERSE_SCHEMA.md) | Dataverse schema & entity definitions — English version |
| [Environment Variables (EN)](./en/ENVIRONMENT_VARIABLES.md) | All env vars (API + Web) — English version |
| [Troubleshooting (EN)](./en/TROUBLESHOOTING.md) | Troubleshooting guide — English version |
| [Local Development (EN)](./en/LOCAL_DEVELOPMENT.md) | Local setup instructions — English version |
| [Custom Connector (EN)](./en/POWER_PLATFORM_CUSTOM_CONNECTOR.md) | Power Platform Custom Connector — English version |
| [Code Apps Plan (EN)](./en/POWER_APPS_CODE_APPS_PLAN.md) | Code App analysis & rollout plan — English version |
| [Cost Analysis (EN)](./en/COST_ANALYSIS.md) | Azure cost analysis — English version |
| [Roles & Permissions (EN)](./en/ROLES.md) | RBAC model — Admin/User/Approver roles, access matrix |
| [Self-Billing Connector (EN)](./en/SELF_BILLING_CONNECTOR.md) | Self-Billing connector operations, Power Automate examples, Copilot Studio |
| [Cost Documents Connector](./COST_DOCUMENTS_CONNECTOR.md) | Cost document connector operations (10 operations) |

---

## Dokumentacja wdrożeniowa (→ `deployment/`)

Instrukcje wdrożenia przeniesione do katalogu `deployment/` i podzielone wg architektury:

| Katalog | Zawartość |
|---------|-----------|
| [`deployment/`](../deployment/README.md) | Przewodnik wdrożenia (13 kroków) + lista kontrolna |
| [`deployment/azure/`](../deployment/azure/) | Bicep IaC, skrypty PS, Entra ID, deploy API/Web, tokeny |
| [`deployment/powerplatform/`](../deployment/powerplatform/README.md) | Solucja PP, Custom Connector, Code Apps |
| [`deployment/local/`](../deployment/local/LOCAL_DEVELOPMENT.md) | Lokalne uruchomienie deweloperskie |

Kluczowe dokumenty wdrożeniowe:

| Dokument | Opis |
|----------|------|
| [Przewodnik wdrożenia](../deployment/README.md) | Kompletny przewodnik krok po kroku (13 kroków) |
| [Lista kontrolna](../deployment/CHECKLIST.md) | Interaktywna checklist z polami do zapisywania danych |
| [Wdrożenie API](../deployment/azure/API_DEPLOYMENT.md) | Deploy Azure Functions (Flex Consumption) |
| [Wdrożenie Web](../deployment/azure/WEB_DEPLOYMENT.md) | Deploy Azure App Service (Next.js standalone) |
| [Entra ID](../deployment/azure/ENTRA_ID_KONFIGURACJA.md) | Konfiguracja App Registration |
| [Zasoby Azure](../deployment/azure/AZURE_RESOURCES_SETUP.md) | Infrastruktura Azure (Bicep) |
| [Tokeny KSeF](../deployment/azure/TOKEN_SETUP_GUIDE.md) | Zarządzanie tokenami KSeF w Key Vault |
| [AI Kategoryzacja](../deployment/azure/AI_CATEGORIZATION_SETUP.md) | Setup kategoryzacji AI |
| [Solucja Power Platform](../deployment/powerplatform/README.md) | Schema Dataverse, import, artefakty |
| [Custom Connector](../deployment/powerplatform/connector/README.md) | Konfiguracja konektora + swagger |
| [Code Apps](../deployment/powerplatform/CODE_APPS_WDROZENIE.md) | Wdrożenie Code App (`pac code push`) |

---

## Dokumenty w katalogu głównym

| Dokument | Opis |
|----------|------|
| [README](../README.md) | Opis projektu, funkcjonalności, quick start |
| [CONTRIBUTING](../CONTRIBUTING.md) | Zasady współtworzenia projektu |
| [SECURITY](../SECURITY.md) | Polityka bezpieczeństwa, raportowanie luk |
| [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) | Kodeks postępowania |
| [LICENSE](../LICENSE) | Licencja MIT |

---

## Konwencje dokumentacji

- **Zrzuty ekranu:** folder [`docs/screenshots/`](./screenshots/) — lista zaplanowanych screenshotów i konwencje nazewnictwa

- **Język główny:** polski 🇵🇱 → folder `docs/pl/` (nazwy plików po polsku)
- **Wersje EN:** folder `docs/en/` (nazwy plików po angielsku)
- **Konwencja nazw:** tytuł pliku w języku danego podkatalogu (np. `pl/ANALIZA_KOSZTOW.md`, `en/COST_ANALYSIS.md`)
- **Format:** Markdown (`.md`)
- **Diagramy:** Mermaid (w blokach ` ```mermaid `)
- **Metadane:** każdy dokument zawiera datę aktualizacji na końcu

---

**Opiekun dokumentacji:** dvlp-dev team
