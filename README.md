# KSeF Copilot

🇬🇧 [English version](README.en.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-blue.svg)](https://azure.microsoft.com/en-us/products/functions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io/)

> Otwarte rozwiązanie do integracji z Krajowym Systemem e-Faktur (KSeF). Umożliwia automatyczną synchronizację faktur zakupowych, ich kategoryzację z wykorzystaniem sztucznej inteligencji (Azure OpenAI) oraz zarządzanie przez intuicyjny dashboard webowy. Backend oparty o Azure Functions i Microsoft Dataverse, frontend w Next.js. Gotowe do wdrożenia w chmurze Azure.

## 🎯 Funkcjonalności

### MVP (darmowe)
- ✅ Synchronizacja faktur zakupowych z KSeF
- ✅ Ręczna kategoryzacja (MPK, kategoria, projekt)
- ✅ Śledzenie statusu płatności (oczekująca/zapłacona)
- ✅ Dashboard webowy
- ✅ RBAC: role Administrator + Czytelnik
- ✅ Bezpieczne przechowywanie tokenów (Azure Key Vault)

### Rozszerzone
- 🤖 Automatyczna kategoryzacja AI (Azure OpenAI)
- 🏢 Obsługa wielu firm (multi-tenant)
- 📊 Eksport do CSV/Excel
- 📧 Powiadomienia e-mail
- 🔗 Webhooki API
- ⏰ Automatyczna synchronizacja wg harmonogramu

## 🏗️ Architektura

```
┌─────────────────────────────────────────────────────────┐
│           Azure App Service (Next.js)                   │
│  Dashboard do zarządzania fakturami i kategoryzacji     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Azure Functions (Node.js)                  │
│  REST API: synchronizacja, import, kategoryzacja        │
└─────────────────────────────────────────────────────────┘
        │                │                │
        ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   KSeF API  │  │ Azure OpenAI│  │  Dataverse  │
│  (MF.gov.pl)│  │ (GPT-4o)    │  │  (Backend)  │
└─────────────┘  └─────────────┘  └─────────────┘
        │
        ▼
┌─────────────┐
│ Key Vault   │
│ (Tokeny)    │
└─────────────┘
```

## 📦 Struktura projektu

```
KSeFCopilot/
├── api/                 # Azure Functions (REST API)
│   ├── src/
│   │   ├── functions/   # HTTP triggers (endpointy)
│   │   ├── lib/         # Biblioteki (ksef, dataverse, auth)
│   │   └── types/       # Typy TypeScript
│   └── tests/
├── web/                 # Aplikacja webowa (Next.js)
│   ├── app/             # App router (strony)
│   ├── components/      # Komponenty React
│   └── lib/             # Narzędzia klienckie
├── docs/                # Dokumentacja
└── deployment/          # IaC (Bicep)
```

## 🚀 Szybki start

### Wymagania wstępne

- Node.js 20+
- pnpm 9+
- Subskrypcja Azure
- Środowisko Dataverse
- Konto KSeF (test/demo/prod)
- Rejestracja aplikacji Azure Entra ID

### Instalacja

```bash
# Klonowanie repozytorium
git clone https://github.com/Developico/KSeFCopilot.git
cd KSeFCopilot

# Instalacja zależności
pnpm install
```

### Konfiguracja API

```bash
# Przejdź do katalogu API
cd api

# Skopiuj szablon konfiguracji
cp local.settings.example.json local.settings.json

# Uzupełnij local.settings.json:
# - AZURE_TENANT_ID
# - AZURE_CLIENT_ID
# - AZURE_CLIENT_SECRET
# - DATAVERSE_URL
# - AZURE_KEYVAULT_URL
# - KSEF_ENVIRONMENT (test/demo/prod)
# - KSEF_NIP
```

### Konfiguracja aplikacji webowej

```bash
# Przejdź do katalogu Web
cd web

# Skopiuj szablon zmiennych środowiskowych
cp .env.example .env.local

# Uzupełnij .env.local:
# - NEXT_PUBLIC_AZURE_CLIENT_ID - Client ID rejestracji aplikacji
# - NEXT_PUBLIC_AZURE_TENANT_ID - Tenant ID Azure
# - NEXT_PUBLIC_API_BASE_URL - URL API (domyślnie: http://localhost:7071/api)
```

### Konfiguracja Azure Entra ID

1. Utwórz App Registration w Azure Portal
2. Dodaj redirect URI: `http://localhost:3000` (rozwój)
3. Włącz „ID tokens" w sekcji Authentication
4. Dodaj uprawnienia API dla Microsoft Dataverse
5. Skopiuj Client ID i Tenant ID do plików konfiguracyjnych

### Uruchamianie

```bash
# Uruchom API i aplikację webową w trybie deweloperskim
pnpm dev

# Lub osobno:
pnpm --filter api dev      # API: http://localhost:7071
pnpm --filter web dev      # Web: http://localhost:3000
```

### Testy

```bash
# Uruchom wszystkie testy
pnpm test

# Sprawdzenie typów
pnpm typecheck

# Linting
pnpm lint
```

## ⚙️ Konfiguracja

### Zmienne środowiskowe

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `AZURE_TENANT_ID` | Tenant ID Azure Entra ID | ✅ |
| `AZURE_CLIENT_ID` | Client ID rejestracji aplikacji | ✅ |
| `AZURE_CLIENT_SECRET` | Client Secret rejestracji aplikacji | ✅ |
| `DATAVERSE_URL` | URL środowiska Dataverse | ✅ |
| `AZURE_KEYVAULT_URL` | URL Key Vault do przechowywania tokenów | ✅ |
| `KSEF_ENVIRONMENT` | Środowisko KSeF: test/demo/prod | ✅ |
| `KSEF_NIP` | NIP firmy (10 cyfr) | ✅ |

Pełna lista w pliku [.env.example](.env.example).

### Konfiguracja tokenu KSeF

1. Zaloguj się do [Portalu KSeF](https://ap-demo.ksef.mf.gov.pl/) (użyj demo do testów)
2. Uwierzytelnij się jako przedstawiciel firmy
3. Wygeneruj token autoryzacyjny (uprawnienie INVOICE_READ)
4. Zapisz token w Azure Key Vault

## 📚 Dokumentacja

- [Architektura](docs/ARCHITEKTURA.md) — Szczegóły architektury systemu
- [API Reference](docs/API.md) — Dokumentacja REST API
- [Zmienne środowiskowe](docs/ZMIENNE_SRODOWISKOWE.md) — Opis konfiguracji
- [Wdrożenie API](docs/API_DEPLOYMENT.md) — Przewodnik wdrażania w Azure

## 🤝 Współpraca

Zapraszamy do współtworzenia projektu! Przeczytaj [Contributing Guide](CONTRIBUTING.md) (EN).

1. Zrób fork repozytorium
2. Utwórz branch (`git checkout -b feature/nowa-funkcja`)
3. Zatwierdź zmiany (`git commit -m 'feat: opis zmian'`)
4. Wypchnij branch (`git push origin feature/nowa-funkcja`)
5. Otwórz Pull Request

## 💼 Wsparcie komercyjne

Potrzebujesz pomocy we wdrożeniu KSeF w swojej organizacji? Oferujemy:

- Wdrożenie i konfigurację rozwiązania
- Dostosowanie do indywidualnych potrzeb
- Integrację z istniejącymi systemami
- Szkolenia i wsparcie techniczne

📧 **contact@developico.com**

## 📄 Licencja

Projekt udostępniony na licencji MIT — szczegóły w pliku [LICENSE](LICENSE).

## 🙏 Podziękowania

- [Ministerstwo Finansów](https://www.podatki.gov.pl/ksef/) — dokumentacja API KSeF
- [Microsoft Dataverse](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/) — platforma backendowa
- [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/) — obliczenia serverless

---

Stworzone przez **[Developico Sp. z o.o.](https://developico.com)** | Łukasz Falaciński

📍 Hajoty 53/1, 01-821 Warszawa, Polska | 📧 contact@developico.com
