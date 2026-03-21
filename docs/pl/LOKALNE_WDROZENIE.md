# Uruchomienie lokalne

> **Wersja polska:** [LOKALNE_WDROZENIE.md](./LOKALNE_WDROZENIE.md) | **English version:** [LOCAL_DEVELOPMENT.md](../en/LOCAL_DEVELOPMENT.md)

## Spis treści
- [Wymagania wstępne](#wymagania-wstępne)
- [Klonowanie repozytorium](#klonowanie-repozytorium)
- [Konfiguracja API (Azure Functions)](#konfiguracja-api-azure-functions)
  - [Instalacja zależności](#instalacja-zależności)
  - [Konfiguracja](#konfiguracja)
  - [Uruchomienie API](#uruchomienie-api)
- [Konfiguracja Web (Next.js)](#konfiguracja-web-nextjs)
  - [Instalacja zależności](#instalacja-zależności-1)
  - [Konfiguracja](#konfiguracja-1)
  - [Uruchomienie aplikacji Web](#uruchomienie-aplikacji-web)
- [Code App (Vite + React SPA)](#code-app-vite--react-spa)
- [Pełny stos lokalny](#pełny-stos-lokalny)
- [Testowanie](#testowanie)
- [Typowe problemy](#typowe-problemy)
- [Konfiguracja IDE](#konfiguracja-ide)

---

## Wymagania wstępne

| Narzędzie | Wersja | Instalacja |
|-----------|--------|------------|
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Azure Functions Core Tools** | 4.x | `npm install -g azure-functions-core-tools@4` |
| **Git** | 2.x+ | [git-scm.com](https://git-scm.com/) |
| **VS Code** | Najnowszy | [code.visualstudio.com](https://code.visualstudio.com/) |

### Zalecane rozszerzenia VS Code

| Rozszerzenie | ID | Przeznaczenie |
|--------------|----|---------------|
| Azure Functions | `ms-azuretools.vscode-azurefunctions` | Debugowanie Functions |
| ESLint | `dbaeumer.vscode-eslint` | Analiza statyczna kodu |
| Prettier | `esbenp.prettier-vscode` | Formatowanie kodu |
| REST Client | `humao.rest-client` | Testowanie API |
| Thunder Client | `rangav.vscode-thunder-client` | GUI do testowania API |

---

## Klonowanie repozytorium

```bash
git clone https://github.com/Developico/KSeF-Copilot.git
cd dvlp-ksef
```

Struktura projektu:
```
dvlp-ksef/
├── api/            # Azure Functions (Node.js/TypeScript)
├── web/            # Frontend Next.js
├── code-app/       # Vite + React SPA (Power Platform Code App)
├── deployment/     # Konfiguracje i skrypty wdrożeniowe
├── docs/           # Dokumentacja
└── README.md
```

---

## Konfiguracja API (Azure Functions)

### Instalacja zależności

```bash
cd api
npm install
```

### Konfiguracja

1. **Skopiuj szablon:**

```bash
cp local.settings.example.json local.settings.json
```

2. **Uzupełnij wartości w `local.settings.json`:**

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "NODE_ENV": "development",

    "DV_URL": "https://twoja-org.crm4.dynamics.com",
    "DV_CLIENT_ID": "client-id-z-app-registration",
    "DV_CLIENT_SECRET": "secret-z-app-registration",
    "DV_TENANT_ID": "id-tenanta",

    "ENTRA_TENANT_ID": "id-tenanta",
    "ENTRA_CLIENT_ID": "client-id-api-app-registration",
    "SKIP_AUTH": "true",

    "KSEF_ENV": "test",

    "OPENAI_API_KEY": "klucz-openai",
    "OPENAI_ENDPOINT": "https://twoj-zasob.openai.azure.com",
    "OPENAI_MODEL": "gpt-4o-mini"
  }
}
```

> **Minimum do uruchomienia:** `DV_URL`, `DV_CLIENT_ID`, `DV_CLIENT_SECRET`, `DV_TENANT_ID`, `SKIP_AUTH=true`
>
> **Pełna referencja:** [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md)

3. **Weryfikacja połączenia z Dataverse:**

```bash
npm run build
func start
# W innym terminalu:
curl http://localhost:7071/api/health
```

Oczekiwana odpowiedź:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "dataverse": "connected",
    "keyVault": "skipped",
    "ksef": "test"
  }
}
```

### Uruchomienie API

```bash
# Tryb deweloperski (z auto-przebudową)
npm run watch
# W innym terminalu:
func start

# Lub jedno polecenie:
npm run dev
```

API będzie dostępne pod adresem: `http://localhost:7071/api`

---

## Konfiguracja Web (Next.js)

### Instalacja zależności

```bash
cd web
pnpm install
```

### Konfiguracja

1. **Utwórz `web/.env.local`:**

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=wygeneruj-openssl-rand-base64-32

AZURE_AD_CLIENT_ID=client-id-web-app-registration
AZURE_AD_CLIENT_SECRET=secret-web-app-registration
AZURE_AD_TENANT_ID=id-tenanta

NEXT_PUBLIC_API_URL=http://localhost:7071/api
NEXT_PUBLIC_API_SCOPE=api://twoj-api-client-id/access_as_user
```

2. **Wygeneruj `NEXTAUTH_SECRET`:**

```bash
openssl rand -base64 32
```

### Uruchomienie aplikacji Web

```bash
pnpm dev
```

Aplikacja webowa będzie dostępna pod adresem: `http://localhost:3000`

> **Uwaga:** Do działania aplikacji webowej wymagane jest uruchomione API na porcie 7071.

---

## Code App (Vite + React SPA)

Code App to lekka aplikacja SPA zaprojektowana do osadzania w Power Platform jako Code Component.

```bash
cd code-app
pnpm install
pnpm dev
```

Dostępna pod adresem: `http://localhost:3002`

> **Uwaga:** Code App korzysta z tego samego API, ale może wymagać osobnej konfiguracji Entra ID dla przepływu autoryzacji Power Platform.

### Proxy Vite

Code App zawiera wbudowane proxy Vite, które przekierowuje żądania `/api` do lokalnej instancji Azure Functions. Konfiguracja w `code-app/vite.config.ts`:

```typescript
server: {
  port: 3002,
  proxy: {
    '/api': {
      target: 'http://localhost:7071',
      changeOrigin: true,
    },
  },
}
```

Dzięki temu wywołania API z Code App (np. `fetch('/api/invoices')`) są transparentnie przekierowywane na `http://localhost:7071/api/invoices` podczas lokalnego developmentu. Osobna konfiguracja `VITE_API_URL` nie jest wymagana.

---

## Pełny stos lokalny

Aby uruchomić całą aplikację lokalnie:

### Terminal 1 — API
```bash
cd api
npm run dev
```

### Terminal 2 — Web
```bash
cd web
pnpm dev
```

### Terminal 3 — Code App (opcjonalnie)
```bash
cd code-app
pnpm dev
```

### Dostępne porty

| Usługa | Port | URL |
|--------|------|-----|
| API (Azure Functions) | 7071 | `http://localhost:7071/api` |
| Web (Next.js) | 3000 | `http://localhost:3000` |
| Code App (Vite) | 3002 | `http://localhost:3002` |

---

## Testowanie

### Testy API

```bash
cd api

# Uruchom wszystkie testy
npm test

# Uruchom testy w trybie watch
npm run test:watch

# Uruchom testy z pokryciem kodu
npm run test:coverage

# Uruchom konkretny plik testowy
npx vitest run tests/unit/service.test.ts
```

### Testy Web

```bash
cd web
pnpm test
```

### Sprawdzanie typów

```bash
# API
cd api
npm run build  # Kompilacja TypeScript

# Web
cd web
pnpm typecheck
```

---

## Typowe problemy

### „Nie można połączyć się z Dataverse"

1. Sprawdź czy `DV_URL` wskazuje na poprawne środowisko
2. Zweryfikuj poprawność `DV_CLIENT_ID` i `DV_CLIENT_SECRET`
3. Upewnij się, że Application User jest utworzony w Power Platform Admin Center
4. Sprawdź czy Application User ma rolę bezpieczeństwa `KSeF Admin`

### „func: command not found"

```bash
npm install -g azure-functions-core-tools@4
```

### „Port 7071 jest już zajęty"

```bash
# Windows
npx kill-port 7071

# macOS/Linux
lsof -ti:7071 | xargs kill -9
```

### „Crash SKIP_AUTH na produkcji"

To jest **zamierzone zachowanie**. `SKIP_AUTH=true` nie jest dozwolone gdy `NODE_ENV=production`. Ustaw `SKIP_AUTH=false` lub całkowicie usuń tę zmienną.

### „Key Vault niedostępny lokalnie"

Dla lokalnego developmentu ustaw `KV_ENABLED=false` w `local.settings.json` i podaj sekrety bezpośrednio jako zmienne środowiskowe (`OPENAI_API_KEY`, `DV_CLIENT_SECRET`, itp.).

### „Błędy CORS w przeglądarce"

Azure Functions automatycznie zezwala na originy `localhost` w trybie deweloperskim. Jeśli nadal widzisz błędy CORS:
1. Sprawdź czy `NEXT_PUBLIC_API_URL` odpowiada rzeczywistemu adresowi API
2. Upewnij się, że API jest uruchomione i zdrowe

---

## Konfiguracja IDE

### Ustawienia VS Code (zalecane)

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "azureFunctions.projectSubpath": "api",
  "azureFunctions.projectLanguage": "TypeScript",
  "azureFunctions.projectRuntime": "~4"
}
```

### Konfiguracja debugowania

`.vscode/launch.json` umożliwia debugowanie Azure Functions bezpośrednio w VS Code. Naciśnij `F5` aby uruchomić API z podpiętym debuggerem.

---

## Powiązane dokumenty

- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna referencja zmiennych
- [Architektura](./ARCHITEKTURA.md) — przegląd systemu
- [Dokumentacja API](./API.md) — dokumentacja REST API
- [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) — typowe problemy i rozwiązania

---

**Ostatnia aktualizacja:** 2026-03-20
**Wersja:** 1.1
**Opiekun:** dvlp-dev team
