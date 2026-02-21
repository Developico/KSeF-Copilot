# Wdrożenie API — Azure Functions (Flex Consumption)

Dokument opisuje proces przygotowania, przeprowadzenia i weryfikacji wdrożenia API (`your-functionapp-name`) na platformę Azure Functions w planie Flex Consumption.

**Data wdrożenia:** 2026-02-09  
**Wersja:** 0.6.1  

> **Uwaga — placeholdery:** W całym dokumencie występują nazwy zaczynające się od `your-` (np. `your-functionapp-name`, `your-resource-group`). Zamień je na rzeczywiste nazwy swoich zasobów Azure. Przykład: `your-functionapp-name` → `func-ksef-prod`.

---

## Spis treści

1. [Infrastruktura docelowa](#infrastruktura-docelowa)
2. [Przygotowanie do wdrożenia](#przygotowanie-do-wdrożenia)
3. [Proces wdrożenia](#proces-wdrożenia)
4. [Rozwiązane problemy](#rozwiązane-problemy)
5. [Weryfikacja](#weryfikacja)
6. [Komendy pomocnicze](#komendy-pomocnicze)
7. [Kontakt z serwisami zewnętrznymi](#kontakt-z-serwisami-zewnętrznymi)

---

## Infrastruktura docelowa

| Parametr | Wartość |
|---|---|
| Nazwa zasobu | `your-functionapp-name` |
| Plan | **Flex Consumption** |
| Runtime | Node.js 22 |
| Region | Poland Central |
| Resource Group | `rg-ksef` |
| Subscription | `your-azure-subscription-id` |
| URL | `https://your-function-app.polandcentral-01.azurewebsites.net` |
| Deployment Storage | `yourstorageaccount` (blob: `app-package-your-functionapp-name-*`) |

### Powiązane zasoby

- **Key Vault:** `your-keyvault-name` — przechowuje secrets (ClientSecret, KSeF Token, OpenAI Key)
- **Application Insights:** połączony przez `APPLICATIONINSIGHTS_CONNECTION_STRING`
- **Entra ID App:** `your-webapp-name` (Client ID: `your-azure-client-id`)
- **Dataverse:** `https://your-org.api.crm4.dynamics.com/`
- **KSeF API (test):** Krajowy System e-Faktur — środowisko testowe

---

## Przygotowanie do wdrożenia

### 1. Build projektu

API jest projektem TypeScript kompilowanym do JavaScript. Pliki wynikowe trafiają do `dist/`.

```bash
cd api
npm run build
```

Komenda `build` wykonuje:
1. `tsc` — kompilacja TypeScript → JavaScript do `dist/`
2. `npm run copy-prompts` — kopiowanie plików `.prompt.md` do `dist/src/lib/prompts/`

### 2. Instalacja zależności produkcyjnych

Flex Consumption **nie wykonuje `npm install` na serwerze** (brak remote build). Zależności muszą być dołączone do paczki.

> **⚠️ WAŻNE — npm workspaces:**  
> Projekt używa npm workspaces (root `package.json` → `"workspaces": ["api", "web"]`).  
> Domyślnie `npm install` hoistuje zależności do root `your-webapp-name/node_modules/`,  
> pozostawiając `api/node_modules/` pusty. Paczka ZIP deployu nie zawiera wtedy  
> zależności, co powoduje **404 na wszystkich endpointach** (funkcje się nie rejestrują).  
>  
> **Rozwiązanie:** Użyj flagi `--no-workspaces`, aby wymusić instalację lokalnie w `api/node_modules/`.  
> Dodaj `--ignore-scripts`, ponieważ skrypt `prepare` (husky) jest niedostępny bez devDependencies.

```bash
npm install --omit=dev --no-workspaces --ignore-scripts
```

**Weryfikacja:** Po instalacji upewnij się, że `api/node_modules/@azure/functions` istnieje:
```bash
# PowerShell
Test-Path "api/node_modules/@azure/functions"   # → True

# bash
ls api/node_modules/@azure/functions/             # powinien istnieć
```

Wersja z dev dependencies po deployu — przywrócenie:
```bash
npm install --ignore-scripts
```

### 3. Struktura plików do deployu

Entry point: `dist/src/functions/index.js` (ustawiony w `package.json` → `"main"`)

```
api/
├── host.json                          # Konfiguracja Azure Functions host
├── package.json                       # main → dist/src/functions/index.js
├── node_modules/                      # Zależności produkcyjne (WYMAGANE!)
└── dist/
    └── src/
        ├── functions/
        │   ├── index.js               # Entry point — importuje wszystkie moduły
        │   ├── health.js
        │   ├── health-detailed.js
        │   ├── invoices.js
        │   ├── settings.js
        │   ├── ... (21 modułów)
        └── lib/
            ├── auth/
            ├── dataverse/
            ├── ksef/
            ├── prompts/               # Pliki .prompt.md dla AI
            └── ...
```

### 4. Konfiguracja `.funcignore`

Plik `.funcignore` kontroluje, co jest wykluczane z paczki ZIP podczas `func publish`.

**Krytyczna uwaga:** na Flex Consumption **`node_modules/` NIE MOŻE być w `.funcignore`**.

```ini
# Source files (only dist is needed)
*.ts
src/
tsconfig.json

# Tests
test/
tests/
coverage/
*.test.js
vitest.config.ts

# Build artifacts
*.js.map
*.d.ts.map

# Development files
.git*
.vscode/
.env
.env.local
local.settings.json
# node_modules/ — must be included for Flex Consumption (no remote build)

# Scripts and documentation
scripts/
*.md
LICENSE

# Logs and temp files
*.log
.DS_Store
```

### 5. Zarejestrowane funkcje (21 modułów → 62 endpointy)

| Moduł | Opis |
|---|---|
| `health` | Health check (`GET /api/health`) |
| `health-detailed` | Szczegółowy health check z weryfikacją Key Vault, Dataverse, KSeF |
| `settings` | CRUD ustawień KSeF (firmy, centra kosztowe) |
| `settings-test-token` | Testowanie tokena KSeF |
| `invoices` | CRUD faktur w Dataverse |
| `invoice-document` | Pobieranie dokumentów faktur |
| `manual-invoice` | Ręczne dodawanie faktur |
| `ksef-session` | Zarządzanie sesjami KSeF |
| `ksef-invoices` | Pobieranie faktur z KSeF |
| `ksef-status` | Status połączenia z KSeF |
| `ksef-sync` | Synchronizacja faktur KSeF ↔ Dataverse |
| `ksef-testdata` | Generowanie danych testowych KSeF |
| `sync` | Główny endpoint synchronizacji |
| `sessions` | Historia sesji |
| `dashboard` | Dane dashboardu |
| `documents` | Zarządzanie dokumentami |
| `attachments` | Załączniki do faktur |
| `notes` | Notatki do faktur |
| `exchange-rates` | Kursy walut (NBP) |
| `gus` | Weryfikacja podmiotów w GUS |
| `ai-categorize` | Kategoryzacja AI faktur (Azure OpenAI) |

---

## Proces wdrożenia

### Komenda wdrożenia

```bash
cd api
func azure functionapp publish your-functionapp-name
```

`func` CLI automatycznie:
1. Tworzy archiwum ZIP z katalogu `api/` (z pominięciem `.funcignore`)
2. Uploaduje paczkę do blob storage (`yourstorageaccount`)
3. Konfiguruje Function App do uruchomienia z paczki
4. Restartuje host, który odkrywa zarejestrowane funkcje

### Oczekiwany output

```
Resolving worker runtime to 'node'.
Getting site publishing info...
[...] Starting the function app deployment...
[...] Creating archive for current directory...
Uploading 89.91 MB [##############################################]
Upload completed successfully.
Deployment completed successfully.
[...] Syncing triggers...

Functions in your-functionapp-name:
    health - [GET] https://your-functionapp-name-....azurewebsites.net/api/health
    healthDetailed - [GET] https://your-functionapp-name-....azurewebsites.net/api/health/detailed
    ... (62 funkcje)
```

Rozmiar paczki: ~90 MB (głównie `node_modules/` z zależnościami produkcyjnymi).

---

## Rozwiązane problemy

### Problem 1: `node_modules/` w `.funcignore`

**Objaw:** Deploy raportował sukces, ale lista funkcji była pusta. Wszystkie endpointy zwracały 404.

**Przyczyna:** `.funcignore` zawierał linię `node_modules/`, co powodowało, że `func` CLI wykluczał katalog zależności z paczki ZIP. Na Flex Consumption nie ma mechanizmu remote build (`npm install` na serwerze) — zależności muszą być w paczce.

**Rozwiązanie:** Zakomentowanie `node_modules/` w `.funcignore`:
```diff
- node_modules/
+ # node_modules/ — must be included for Flex Consumption (no remote build)
```

### Problem 2: Stare artefakty blokujące deploy

**Objaw:** `func azure functionapp publish` kończył się błędem "Array dimensions exceeded supported range".

**Przyczyna:** Stare katalogi (`node_modules_prod/`, `deploy-final/`, `check-pkg/`) zawierały rekurencyjnie zagnieżdżone `node_modules` (36 808+ plików), przekraczając limity ZIP.

**Rozwiązanie:** Usunięcie starych artefaktów:
```bash
Remove-Item -Recurse -Force node_modules_prod, deploy-final, check-pkg
```

### Problem 3: npm workspaces hoisting — pusty `api/node_modules/`

**Objaw:** Deploy raportował sukces, `func` CLI wyświetlał "The deployment was successful!", ale sekcja "Functions in your-functionapp-name:" była pusta. Wszystkie endpointy zwracały 404.

**Przyczyna:** Projekt używa npm workspaces (`"workspaces": ["api", "web"]` w root `package.json`). Komenda `npm install --omit=dev` wykonywana w `api/` instalowała zależności do root `your-webapp-name/node_modules/` (hoisting). Katalog `api/node_modules/` zawierał jedynie `.vite` i nie miał `@azure/functions` ani żadnych innych pakietów. Paczka ZIP deployowana na Azure nie zawierała żadnych zależności runtime.

**Diagnoza:**
```bash
# Sprawdź czy @azure/functions jest w api/node_modules
Test-Path "api/node_modules/@azure/functions"   # → False = problem!

# Sprawdź liczbę pakietów w api/node_modules
Get-ChildItem "api/node_modules" | Measure-Object   # → Count: 1 (.vite tylko)
```

**Rozwiązanie:** Użycie flagi `--no-workspaces` wymusza instalację lokalnie:
```bash
npm install --omit=dev --no-workspaces --ignore-scripts
```

Po tej zmianie `api/node_modules/` zawiera ~57 pakietów, paczka ZIP waży ~90 MB, a funkcje są poprawnie odkrywane.

### Problem 4: `FUNCTIONS_WORKER_RUNTIME` na Flex Consumption

**Obserwacja:** Na Flex Consumption ustawienie `FUNCTIONS_WORKER_RUNTIME` jest **zablokowane** jako app setting (Azure zwraca błąd). Runtime jest konfigurowany na poziomie infrastruktury (`functionAppConfig.runtime.name=node`).

Weryfikacja konfiguracji runtime:
```bash
az resource show \
  --ids "/subscriptions/.../providers/Microsoft.Web/sites/your-functionapp-name" \
  --query "properties.functionAppConfig.runtime" -o json
# → { "name": "node", "version": "22" }
```

---

## Weryfikacja

### Lista zarejestrowanych funkcji

Po wdrożeniu weryfikujemy, czy wszystkie funkcje zostały poprawnie zarejestrowane w Azure:

```bash
az functionapp function list \
  --name your-functionapp-name \
  --resource-group rg-ksef \
  --query "[].name"
```

Oczekiwany wynik: lista ~78 nazw funkcji w formacie `your-functionapp-name/<nazwa-funkcji>`.

> **Uwaga:** Endpointy health (`/api/health`, `/api/health/detailed`) wymagają uwierzytelnienia
> i zwracają 401 Unauthorized przy bezpośrednim wywołaniu z CLI. Nie należy ich używać
> jako kroku weryfikacji wdrożenia. Lista funkcji przez Azure CLI jest wystarczającą
> metodą potwierdzenia poprawności deployu.

### Wynik weryfikacji z 2026-02-13

```
✅ Funkcje:           78 zarejestrowanych httpTrigger
✅ Rozmiar paczki:    ~90 MB
✅ Runtime:           Node.js 22 (Flex Consumption)
```

---

## Komendy pomocnicze

### Pełny cykl wdrożenia

```bash
cd api

# 1. Build
npm run build

# 2. Zależności produkcyjne (--no-workspaces wymusza instalację w api/node_modules!)
npm install --omit=dev --no-workspaces --ignore-scripts

# 3. Weryfikacja — upewnij się, że @azure/functions jest lokalnie
#    Test-Path "node_modules/@azure/functions"  → powinno zwrócić True

# 4. Deploy
func azure functionapp publish your-functionapp-name

# 5. Przywróć dev dependencies (do dalszego developmentu)
npm install --ignore-scripts

# 6. Weryfikacja — lista zarejestrowanych funkcji w Azure
az functionapp function list --name your-functionapp-name --resource-group rg-ksef --query "[].name"
```

### Sprawdzenie logów

```bash
# Logi na żywo
az webapp log tail --name your-functionapp-name --resource-group rg-ksef

# Logi z Application Insights
az monitor app-insights query \
  --app your-functionapp-name \
  --analytics-query "traces | where timestamp > ago(1h) | order by timestamp desc | take 50"
```

### Sprawdzenie app settings

```bash
az functionapp config appsettings list \
  --name your-functionapp-name \
  --resource-group rg-ksef \
  --query "[].{name:name,value:value}" -o table
```

### Restart function app

```bash
az functionapp restart --name your-functionapp-name --resource-group rg-ksef
```

---

## Kontakt z serwisami zewnętrznymi

API komunikuje się z następującymi serwisami:

| Serwis | URL | Uwierzytelnianie |
|---|---|---|
| Azure Key Vault | `https://your-keyvault-name.vault.azure.net/` | Managed Identity + RBAC |
| Dataverse | `https://your-org.api.crm4.dynamics.com/` | Entra ID (Client Credentials) |
| KSeF (test) | `https://ksef-test.mf.gov.pl/` | Token z Key Vault |
| Azure OpenAI | Endpoint z Key Vault | API Key z Key Vault |
| GUS (REGON) | `https://wyszukiwarkaregon.stat.gov.pl/` | Klucz API (publiczny) |
| NBP (kursy walut) | `https://api.nbp.pl/` | Brak (publiczne API) |

---

## Uwagi Flex Consumption

Plan Flex Consumption różni się od klasycznego Consumption:

1. **Brak remote build** — `node_modules` musi być w paczce ZIP
2. **Runtime config** — `FUNCTIONS_WORKER_RUNTIME` i `WEBSITE_NODE_DEFAULT_VERSION` są **zablokowane** jako app settings; konfiguracja runtime odbywa się na poziomie `functionAppConfig`
3. **Deployment storage** — paczka jest przechowywana w Azure Blob Storage (nie w App Service filesystem)
4. **Skalowanie** — automatyczne skalowanie do zera (cold start) i per-function scaling
5. **App settings** — pewne ustawienia (jak `FUNCTIONS_WORKER_RUNTIME`) są read-only i zarządzane przez platformę

Weryfikacja konfiguracji Flex Consumption:
```bash
az resource show \
  --ids "/subscriptions/your-azure-subscription-id/resourceGroups/rg-ksef/providers/Microsoft.Web/sites/your-functionapp-name" \
  --query "properties.functionAppConfig" -o json
```

---

## Powiązane dokumenty

- [Wdrożenie Web](./WEB_DEPLOYMENT.md) — deploy Next.js na App Service
- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna referencja env vars
- [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) — tworzenie zasobów
- [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) — centralna diagnostyka

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 1.0  
**Opiekun:** dvlp-dev team
