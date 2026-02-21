# Dokumentacja projektu dvlp-ksef

> Przewodnik po dokumentacji integracji z Krajowym Systemem e-Faktur (KSeF)

**Ostatnia aktualizacja:** 2025-06-14
**Wersja dokumentacji:** 3.1

---

## Nawigacja

### Dla nowego developera

Zalecana ścieżka czytania:

1. [README projektu](../README.md) — ogólny opis, quick start
2. [Uruchomienie lokalne](./LOCAL_DEVELOPMENT.md) — jak uruchomić projekt na swoim komputerze
3. [Architektura](./ARCHITEKTURA.md) — jak działa system
4. [Dokumentacja API](./API_PL.md) — endpointy REST API
5. [Schemat Dataverse](./DATAVERSE_SCHEMA.md) — model danych

### Dla administratora / DevOps

1. [Przewodnik wdrożenia](../deployment/README.md) — **pełny przewodnik 13 kroków**
2. [Lista kontrolna](../deployment/CHECKLIST.md) — interaktywna checklist z polami danych
3. [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — kompletna lista env vars
4. [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) — troubleshooting

---

## Dokumentacja techniczna (ten katalog)

### Architektura i API

| Dokument | Opis |
|----------|------|
| [Architektura](./ARCHITEKTURA.md) | Architektura systemu, wzorce projektowe, stos technologiczny, przepływy danych |
| [Dokumentacja API (PL)](./API_PL.md) | Pełna dokumentacja REST API — endpointy, autentykacja, błędy, limity |
| [Schemat Dataverse](./DATAVERSE_SCHEMA.md) | Model danych Dataverse — tabele, relacje, OptionSets, indeksy |

### Materiały referencyjne

| Dokument | Opis |
|----------|------|
| [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) | Jedno źródło prawdy dla wszystkich env vars (API + Web) |
| [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) | Troubleshooting zebrane z całej dokumentacji |
| [Uruchomienie lokalne](./LOCAL_DEVELOPMENT.md) | Instrukcja uruchomienia projektu od zera |
| [Custom Connector](./POWER_PLATFORM_CUSTOM_CONNECTOR.md) | Konfiguracja Custom Connector w Power Platform |
| [Code Apps — plan](./POWER_APPS_CODE_APPS_PLAN.md) | Analiza, fazy wdrożenia, Code App (Vite + React) |
| [Analiza kosztów](./ANALIZA_KOSZTÓW.md) | Analiza kosztów rozwiązania w Azure |

### Wersje angielskie (nice-to-have)

| Dokument | Opis |
|----------|------|
| [Architecture (EN)](./en/ARCHITECTURE.md) | System architecture — English version |
| [API Reference (EN)](./en/API.md) | REST API documentation — English version |

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

- **Język główny:** polski 🇵🇱
- **Wersje EN:** dostępne w folderze `docs/en/` (nice-to-have)
- **Format:** Markdown (`.md`)
- **Diagramy:** Mermaid (w blokach ` ```mermaid `)
- **Metadane:** każdy dokument zawiera datę aktualizacji na końcu

---

**Opiekun dokumentacji:** dvlp-dev team
