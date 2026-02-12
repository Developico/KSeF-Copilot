# Dokumentacja projektu dvlp-ksef

> Przewodnik po dokumentacji integracji z Krajowym Systemem e-Faktur (KSeF)

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja dokumentacji:** 2.0

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

1. [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) — tworzenie infrastruktury
2. [Konfiguracja Entra ID](./ENTRA_ID_KONFIGURACJA.md) — autentykacja i autoryzacja
3. [Tokeny KSeF](./TOKEN_SETUP_GUIDE.md) — zarządzanie tokenami
4. [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — kompletna lista env vars
5. [Wdrożenie API](./API_DEPLOYMENT.md) — deploy Azure Functions
6. [Wdrożenie Web](./WEB_DEPLOYMENT.md) — deploy Azure App Service

---

## Spis dokumentów

### Dokumentacja główna

| Dokument | Opis |
|----------|------|
| [Architektura](./ARCHITEKTURA.md) | Architektura systemu, wzorce projektowe, stos technologiczny, przepływy danych |
| [Dokumentacja API (PL)](./API_PL.md) | Pełna dokumentacja REST API — endpointy, autentykacja, błędy, limity |
| [Schemat Dataverse](./DATAVERSE_SCHEMA.md) | Model danych Dataverse — tabele, relacje, OptionSets, indeksy |

### Konfiguracja i setup

| Dokument | Opis |
|----------|------|
| [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) | Tworzenie Resource Group, Key Vault, Azure Functions |
| [Entra ID — konfiguracja](./ENTRA_ID_KONFIGURACJA.md) | App Registration, grupy bezpieczeństwa, RBAC, MSAL |
| [Tokeny KSeF](./TOKEN_SETUP_GUIDE.md) | Zarządzanie tokenami KSeF, diagnostyka, Key Vault |
| [AI Kategoryzacja](./AI_CATEGORIZATION_SETUP.md) | Konfiguracja Azure OpenAI dla kategoryzacji faktur |
| [Custom Connector](./POWER_PLATFORM_CUSTOM_CONNECTOR.md) | Konfiguracja Custom Connector w Power Platform |

### Wdrożenie

| Dokument | Opis |
|----------|------|
| [Wdrożenie API](./API_DEPLOYMENT.md) | Deploy Azure Functions (Flex Consumption) — krok po kroku |
| [Wdrożenie Web](./WEB_DEPLOYMENT.md) | Deploy Azure App Service (Next.js standalone) — krok po kroku |

### Materiały referencyjne

| Dokument | Opis |
|----------|------|
| [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) | Jedno źródło prawdy dla wszystkich env vars (API + Web) |
| [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) | Troubleshooting zebrane z całej dokumentacji |
| [Uruchomienie lokalne](./LOCAL_DEVELOPMENT.md) | Instrukcja uruchomienia projektu od zera |
| [swagger.yaml](./swagger.yaml) | Specyfikacja OpenAPI (Swagger) dla Custom Connector |

### Wersje angielskie (nice-to-have)

| Dokument | Opis |
|----------|------|
| [Architecture (EN)](./en/ARCHITECTURE.md) | System architecture — English version |
| [API Reference (EN)](./en/API.md) | REST API documentation — English version |

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
- **Diagramy:** ASCII art w blokach kodu
- **Metadane:** każdy dokument zawiera datę aktualizacji na końcu

---

**Opiekun dokumentacji:** dvlp-dev team
