# Lokalne środowisko deweloperskie

Instrukcja uruchomienia projektu KSeF na lokalnym komputerze — od klonowania repozytorium po uruchomienie testów.

## Spis treści

1. [Wymagania wstępne](#wymagania-wstępne)
2. [Klonowanie repozytorium](#klonowanie-repozytorium)
3. [Instalacja zależności](#instalacja-zależności)
4. [Konfiguracja zmiennych środowiskowych](#konfiguracja-zmiennych-środowiskowych)
5. [Uruchomienie API (Azure Functions)](#uruchomienie-api)
6. [Uruchomienie Web (Next.js)](#uruchomienie-web)
7. [Testy](#testy)
8. [Codzienne workflow](#codzienne-workflow)
9. [Częste problemy](#częste-problemy)

---

## Wymagania wstępne

### Narzędzia

| Narzędzie | Wersja | Instalacja |
|-----------|--------|------------|
| **Node.js** | ≥ 20 (rekomendowane: 22 LTS) | https://nodejs.org/ |
| **npm** | ≥ 9 (wbudowane w Node.js) | — |
| **Azure Functions Core Tools** | v4 | `npm install -g azure-functions-core-tools@4` |
| **Azure CLI** | najnowsza | https://learn.microsoft.com/cli/azure/install-azure-cli |
| **Git** | najnowsza | https://git-scm.com/ |
| **VS Code** | najnowsza | https://code.visualstudio.com/ |

### Rozszerzenia VS Code (rekomendowane)

- **Azure Functions** — debugowanie i deploy
- **ESLint** — linting
- **Prettier** — formatowanie kodu
- **TypeScript and JavaScript** — wbudowany support

### Dostęp

- Konto Azure z uprawnieniami do tenanta Entra ID
- Uprawnienia `az login` do subskrypcji (dla Key Vault)
- Opcjonalnie: dostęp do środowiska testowego KSeF

---

## Klonowanie repozytorium

```bash
git clone https://github.com/dvlp-dev/dvlp-ksef.git
cd dvlp-ksef
```

### Struktura projektu

```
dvlp-ksef/
├── package.json          # Root — npm workspaces
├── api/                  # Azure Functions (Node.js, TypeScript)
│   ├── package.json
│   ├── host.json
│   ├── local.settings.json  # ← konfiguracja lokalna (nie commitowana)
│   ├── src/              # Kod źródłowy (TypeScript)
│   └── tests/            # Testy (vitest)
├── web/                  # Next.js 15 (App Router, React 19)
│   ├── package.json
│   ├── .env.local        # ← zmienne lokalne (nie commitowane)
│   └── src/              # Kod źródłowy
├── deployment/           # Skrypty i szablony wdrożeniowe
└── docs/                 # Dokumentacja
```

> Projekt używa **npm workspaces** — `api/` i `web/` to osobne workspace'y.

---

## Instalacja zależności

Z katalogu root:

```bash
npm install
```

To instaluje zależności zarówno dla `api/` jak i `web/` (npm workspaces hoistuje pakiety do root `node_modules/`).

### Weryfikacja

```bash
# Sprawdź czy workspace'y działają
npm ls --workspaces --depth=0

# Zbuduj API (TypeScript → JavaScript)
cd api && npm run build && cd ..

# Sprawdź testy
npm test
```

---

## Konfiguracja zmiennych środowiskowych

### API: `api/local.settings.json`

Skopiuj szablon i uzupełnij wartości:

```bash
# Jeśli plik nie istnieje, utwórz:
cp api/local.settings.json.example api/local.settings.json
# Lub utwórz ręcznie — patrz poniżej
```

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "NODE_ENV": "development",
    "SKIP_AUTH": "true",

    "AZURE_TENANT_ID": "<tenant-id>",
    "AZURE_CLIENT_ID": "<client-id>",
    "AZURE_CLIENT_SECRET": "<client-secret>",

    "DATAVERSE_URL": "https://developico-tt.api.crm4.dynamics.com",

    "DV_ENTITY_INVOICE": "dvlp_ksefinvoices",
    "DV_ENTITY_SETTING": "dvlp_ksefsettings",
    "DV_ENTITY_SESSION": "dvlp_ksefsessions",
    "DV_ENTITY_SYNCLOG": "dvlp_ksefsynclogs",

    "DV_LOG_LEVEL": "info",
    "DV_LOG_TRAFFIC": "false",
    "DV_LOG_CONSOLE": "true",

    "AZURE_KEYVAULT_URL": "https://YOUR_KEYVAULT.vault.azure.net",

    "KSEF_ENVIRONMENT": "test",

    "ADMIN_GROUP_ID": "<admin-group-object-id>",
    "USER_GROUP_ID": "<user-group-object-id>",

    "FEATURE_AI_CATEGORIZATION": "true",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-4o-mini",
    "AZURE_OPENAI_API_VERSION": "2024-10-21"
  },
  "Host": {
    "CORS": "http://localhost:3001",
    "CORSCredentials": true
  }
}
```

> `SKIP_AUTH=true` — pomija walidację JWT, przydatne przy lokalnym dev bez konfiguracji MSAL.

### Web: `web/.env.local`

Skopiuj z szablonu:

```bash
cp web/.env.example web/.env.local
```

Uzupełnij wartości:

```bash
# Autentykacja MSAL
NEXT_PUBLIC_AZURE_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<tenant-id>

# API (Azure Functions lokal)
NEXT_PUBLIC_API_URL=http://localhost:7071/api

# Grupy bezpieczeństwa
NEXT_PUBLIC_ADMIN_GROUP=<admin-group-object-id>
NEXT_PUBLIC_USER_GROUP=<user-group-object-id>

# Feature flags (opcjonalnie)
FEATURE_AI_CATEGORIZATION=false
```

> Pełna referencja: [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md)

### Azure CLI logowanie (dla Key Vault)

```bash
az login
az account set --subscription "73d82af2-b751-4bd5-9750-70a8a5378d93"
```

Potrzebne, gdy API próbuje pobrać sekrety z Key Vault przy użyciu `DefaultAzureCredential`.

---

## Uruchomienie API

### Build + start

```bash
cd api
npm run build    # TypeScript → JavaScript (dist/)
func start       # Uruchom Azure Functions lokalnie
```

lub krócej:

```bash
cd api
npm start        # Wykonuje clean, build, func start
```

### Oczekiwany output

```
Azure Functions Core Tools
Core Tools Version: 4.x.x

Functions:
  health:          http://localhost:7071/api/health
  healthDetailed:  http://localhost:7071/api/health/detailed
  settings:        http://localhost:7071/api/settings
  invoices:        http://localhost:7071/api/invoices
  ... (62 endpointy)
```

### Weryfikacja

```bash
curl http://localhost:7071/api/health
# → {"status":"healthy","timestamp":"...","version":"1.0.0","environment":"development"}
```

### Tryb watch (opcjonalnie)

W osobnym terminalu (rekompilacja przy zmianach):

```bash
cd api
npm run watch
```

---

## Uruchomienie Web

```bash
cd web
npm run dev
```

### Oczekiwany output

```
▲ Next.js 15.x.x
- Local:   http://localhost:3001
- Network: http://192.168.x.x:3001
✓ Ready in Xms
```

Otwórz http://localhost:3001 w przeglądarce.

> **Port:** Web startuje domyślnie na 3001 (nie 3000), aby nie kolidować z innymi projektami Next.js.

### Proxy do API

Next.js konfiguruje proxy do API przez `rewrites` w `next.config.mjs`:
```
http://localhost:3001/api/* → http://localhost:7071/api/*
```

Dzięki temu frontend i API działają jako jeden serwis.

---

## Testy

### API (vitest)

```bash
cd api
npm test          # Jednorazowe uruchomienie
npm run test:watch  # Tryb watch (uruchamia ponownie przy zmianach)
```

### Typecheck (TypeScript)

```bash
# API
cd api && npm run typecheck

# Lub z root:
npm run typecheck --workspaces
```

### Lint

```bash
npm run lint          # Sprawdź błędy
npm run lint:fix     # Automatyczna naprawa
```

### Wszystko naraz

```bash
# Z root projektu:
npm test              # Testy w obu workspace'ach
npm run typecheck     # Typecheck w obu workspace'ach
```

---

## Codzienne workflow

### 1. Aktualizacja repozytorium

```bash
git pull origin main
npm install    # W razie zmian w zależnościach
```

### 2. Uruchomienie projektu (dwa terminale)

**Terminal 1 — API:**
```bash
cd api && npm start
```

**Terminal 2 — Web:**
```bash
cd web && npm run dev
```

### 3. Przed commitem

```bash
npm run typecheck    # Sprawdź typy
npm test             # Uruchom testy
npm run lint         # Sprawdź lint
```

### 4. Deploy

Patrz: [Wdrożenie API](./API_DEPLOYMENT.md) i [Wdrożenie Web](./WEB_DEPLOYMENT.md)

---

## Częste problemy

### `func: command not found`

```bash
npm install -g azure-functions-core-tools@4
```

### Port 7071 jest zajęty

```bash
npx kill-port 7071
```

### API zwraca 401 mimo `SKIP_AUTH=true`

Sprawdź, czy `local.settings.json` zawiera poprawnie ustawione `"SKIP_AUTH": "true"` (stringowy `"true"`, nie boolean `true`).

### CORS error w przeglądarce

Sprawdź `Host.CORS` w `api/local.settings.json` — port musi zgadzać się z adresem Web (domyślnie `http://localhost:3001`).

### `npm install` zmienia `api/package-lock.json`

To normalne zachowanie npm workspaces — lock file jest zarządzany na poziomie root `package-lock.json`.

### Key Vault: Access denied (lokalne dev)

```bash
az login
az account set --subscription "73d82af2-b751-4bd5-9750-70a8a5378d93"
```

`DefaultAzureCredential` w dev używa Azure CLI credentials.

---

## Powiązane dokumenty

- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna referencja env vars
- [Architektura](./ARCHITEKTURA.md) — przegląd systemu
- [API REST](./API_PL.md) — dokumentacja endpointów
- [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) — zaawansowana diagnostyka

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 1.0  
**Opiekun:** dvlp-dev team
