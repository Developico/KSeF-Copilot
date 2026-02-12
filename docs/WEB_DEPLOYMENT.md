# Wdrożenie Web — Azure App Service (Next.js Standalone)

Dokument opisuje proces przygotowania, przeprowadzenia i weryfikacji wdrożenia aplikacji webowej (`dvlp-ksef` web) na platformę Azure App Service w trybie Next.js standalone.

**Data wdrożenia:** 2026-02-09  
**Wersja:** 0.1.0  
**Ostatnia aktualizacja dokumentu:** 2026-02-09  

---

## Spis treści

1. [Infrastruktura docelowa](#infrastruktura-docelowa)
2. [Architektura deploymentu](#architektura-deploymentu)
3. [Przygotowanie do wdrożenia](#przygotowanie-do-wdrożenia)
4. [Proces wdrożenia](#proces-wdrożenia)
5. [Konfiguracja Azure App Service](#konfiguracja-azure-app-service)
6. [Rozwiązane problemy](#rozwiązane-problemy)
7. [Weryfikacja](#weryfikacja)
8. [Komendy pomocnicze](#komendy-pomocnicze)
9. [Zmienne środowiskowe](#zmienne-środowiskowe)

---

## Infrastruktura docelowa

| Parametr | Wartość |
|---|---|
| Nazwa zasobu | `dvlp-ksef` |
| Typ | **Azure App Service** (Linux) |
| Runtime | Node.js 22 LTS |
| Region | Poland Central |
| Resource Group | `rg-ksef` |
| Subscription | `73d82af2-b751-4bd5-9750-70a8a5378d93` |
| URL | `https://dvlp-ksef-bmgjdsb6gzbdhjgs.polandcentral-01.azurewebsites.net` |
| SCM URL | `https://dvlp-ksef-bmgjdsb6gzbdhjgs.scm.polandcentral-01.azurewebsites.net` |
| Startup command | `node server.js` |
| Port | `8080` (wymuszony przez Azure, standalone serwer nasłuchuje automatycznie na `PORT` env) |

### Powiązane zasoby

- **Azure Functions API:** `YOUR_FUNCTION_APP` — backend (proxy przez `rewrites` w `next.config.mjs`)
- **Entra ID App:** `dvlp-ksef` (Client ID: `YOUR_CLIENT_ID`)
- **Application Insights:** połączony przez `APPLICATIONINSIGHTS_CONNECTION_STRING`

---

## Architektura deploymentu

Aplikacja korzysta z trybu **Next.js standalone output**, który generuje samodzielny serwer Node.js z minimalnymi zależnościami. Dzięki temu:

- **Brak potrzeby `npm install` na serwerze** — wszystko jest w paczce ZIP
- **Brak Oryx build** — Azure nie buduje aplikacji, tylko ją uruchamia
- **Mały rozmiar** — standalone zawiera tylko potrzebne pliki (~40 MB vs ~500 MB z pełnym `node_modules`)

### Kluczowa konfiguracja: `next.config.mjs`

```js
const nextConfig = {
  output: 'standalone',  // ← Generuje samodzielny serwer
  reactStrictMode: true,
  async rewrites() {
    return [{
      source: '/api/:path*',
      destination: process.env.API_URL
        ? `${process.env.API_URL}/api/:path*`
        : 'http://localhost:7071/api/:path*',
    }]
  },
}
```

### npm Workspaces — specyfika

Projekt używa npm workspaces (`api` + `web`). To powoduje, że standalone output zagnieżdża aplikację w podfolderze `web/`:

```
.next/standalone/
├── node_modules/           ← współdzielone zależności workspace
├── package.json
└── web/
    ├── server.js           ← serwer aplikacji
    ├── package.json
    ├── .next/              ← skompilowana aplikacja
    └── node_modules/       ← zależności specyficzne dla web
```

Skrypt `build-deploy.mjs` automatycznie wykrywa tę strukturę i prawidłowo kopiuje pliki.

---

## Przygotowanie do wdrożenia

### 1. Build projektu

Build wykonuje skrypt `build-deploy.mjs`, który:
1. Uruchamia `next build` (z `output: 'standalone'`)
2. Konstruuje katalog `.deploy/` z gotową aplikacją
3. Instaluje natywne binaria Linux (`@next/swc-linux-x64-gnu`)
4. Weryfikuje obecność `BUILD_ID` i `server.js`

```bash
cd web
node scripts/build-deploy.mjs
```

### 2. Struktura `.deploy/` (gotowa do deployu)

```
web/.deploy/
├── server.js               # Standalone Next.js serwer (~6.6 KB)
├── package.json             # Minimalny — scripts.start: "node server.js"
├── startup.sh               # Skrypt startowy Azure
├── .deployment              # SCM_DO_BUILD_DURING_DEPLOYMENT=false
├── .env.production          # Zmienne środowiskowe (jeśli istnieje)
├── node_modules/            # Zależności (standalone + workspace + Linux SWC)
├── .next/
│   ├── BUILD_ID             # Identyfikator builda
│   ├── required-server-files.json
│   ├── server/              # Skompilowane strony i API routes
│   └── static/              # Zasoby statyczne (CSS, JS, media)
└── public/                  # Pliki publiczne (favicons, images)
```

### 3. Skrypt `build-deploy.mjs` — co robi

| Krok | Opis |
|---|---|
| 1/3 Build | `npx next build` z `NODE_ENV=production` |
| 2/3 Prepare | Kopiuje standalone app → `.deploy/`, kopiuje `.next/static/`, `public/`, `startup.sh`, `.env.production`, tworzy `.deployment` i minimalny `package.json` |
| 3/3 Native + Merge | Najpierw `npm install --no-save --force @next/swc-linux-x64-gnu` (Linux binaries), **potem** kopiuje współdzielone workspace `node_modules` — kolejność jest krytyczna! |
| Verify | Sprawdza obecność `.next/BUILD_ID` i `server.js` |

> **WAŻNE:** Krok 3/3 musi najpierw zainstalować Linux binaries, a **dopiero potem** skopiować
> współdzielone `node_modules` z standalone output. W odwrotnej kolejności `npm install`
> czyści (prune) moduły nie wymienione w `package.json` (np. `next`, `react`, `sharp`),
> co skutkuje błędem `Cannot find module 'next'` na serwerze. Zobacz [Problem 7](#problem-7).

### 4. Skrypt `startup.sh`

Azure App Service uruchamia ten skrypt przy starcie kontenera:

```bash
#!/bin/bash
cd /home/site/wwwroot
echo "=== KSeF Web Startup ==="
echo "Node: $(node --version)"
echo "PWD:  $(pwd)"

if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found — standalone build missing"
    exit 1
fi

if [ ! -d ".next" ]; then
    echo "ERROR: .next/ directory not found"
    exit 1
fi

echo "Starting Next.js standalone server..."
node server.js
```

### 5. Tworzenie paczki ZIP

**WAŻNE:** Używaj `tar`, nie PowerShell `Compress-Archive`. PowerShell ma bug z plikami bez rozszerzenia (np. `BUILD_ID`) — pomija je.

```bash
cd web/.deploy
tar -acf ../deploy-package.zip *
```

Weryfikacja zawartości:
```bash
cd web
tar -tf deploy-package.zip | Select-String "BUILD_ID|server.js"
```

Oczekiwany wynik:
```
.next/BUILD_ID
server.js
```

---

## Proces wdrożenia

### Komenda wdrożenia (Azure CLI)

```bash
az webapp deploy \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --src-path web/deploy-package.zip \
  --type zip \
  --clean true \
  --async true
```

Parametry:
- `--clean true` — czyści stary content przed deployem
- `--async true` — nie czeka na zakończenie (deploy trwa ~1-2 min)
- `--type zip` — deploy z paczki ZIP

### Pełny cykl wdrożenia (krok po kroku)

```bash
# 1. Build i przygotowanie .deploy/
cd web
node scripts/build-deploy.mjs

# 2. Tworzenie paczki ZIP
cd .deploy
tar -acf ../deploy-package.zip *
cd ..

# 3. Deploy na Azure
az webapp deploy \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --src-path deploy-package.zip \
  --type zip \
  --clean true \
  --async true

# 4. Weryfikacja (po ~1-2 min na restart)
az webapp log tail --name dvlp-ksef --resource-group rg-ksef
```

### Oczekiwany przebieg

1. `build-deploy.mjs` buduje aplikację (~2-3 min)
2. `tar` tworzy ZIP (~40 MB)
3. `az webapp deploy` uploaduje paczkę i restartuje App Service
4. Azure uruchamia `startup.sh` → `node server.js`
5. Serwer startuje na porcie `8080` (zmienna `PORT` ustawiana przez Azure)

---

## Konfiguracja Azure App Service

### App Settings (wymagane)

| Setting | Wartość | Opis |
|---|---|---|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | Wyłącza Oryx build — app jest pre-built |
| `ENABLE_ORYX_BUILD` | `false` | Dodatkowe wyłączenie Oryx |
| `WEBSITE_RUN_FROM_PACKAGE` | **`1`** | Montuje ZIP jako read-only filesystem — **kluczowe!** Zobacz [Problem 8](#problem-8) |
| `API_URL` | `https://YOUR_FUNCTION_APP-...azurewebsites.net` | URL do Azure Functions API |

### Startup command

```bash
az webapp config set \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --startup-file "node server.js"
```

**WAŻNE:** Domyślna komenda Azure (`node node_modules/next/dist/bin/next start`) **nie działa** w trybie standalone. Musi być `node server.js`.

### Konfiguracja via Azure CLI

```bash
# Ustawienie startup command
az webapp config set \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --startup-file "node server.js"

# Wyłączenie Oryx build + run-from-package
az webapp config appsettings set \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false \
    ENABLE_ORYX_BUILD=false \
    WEBSITE_RUN_FROM_PACKAGE=1
```

---

## Rozwiązane problemy

### Problem 1: `Cannot find module '@swc/helpers/_/_interop_require_default'`

**Objaw:** Aplikacja crashowała przy starcie z błędem `MODULE_NOT_FOUND` dla `@swc/helpers`.

**Przyczyna:** Pakiet `@swc/helpers` nie był jawną zależnością — Next.js zakładał jego obecność jako transitive dependency, ale standalone mode go nie dołączał.

**Rozwiązanie:** Dodanie `@swc/helpers` jako explicit dependency:
```json
"dependencies": {
  "@swc/helpers": "^0.5.17"
}
```

### Problem 2: `mv: cannot move 'node_modules': Permission denied`

**Objaw:** Oryx build na Azure próbował przenosić `node_modules` i kończył się błędem uprawnień, a następnie `.next` nie istniał.

**Przyczyna:** Azure Oryx próbował zbudować aplikację na serwerze (remote build), co nie działało ze standalone output.

**Rozwiązanie:** Przejście na model pre-built deployment:
- `output: 'standalone'` w `next.config.mjs`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false` w `.deployment`
- `ENABLE_ORYX_BUILD=false` w app settings
- Deploy gotowej paczki ZIP zamiast source code

### Problem 3: Standalone output zagnieżdżony pod `web/`

**Objaw:** Po bulidzie `.next/standalone/server.js` nie istniał — był pod `.next/standalone/web/server.js`.

**Przyczyna:** npm workspaces powodują, że Next.js standalone zagnieżdża output w podfolderze odpowiadającym nazwie workspace.

**Rozwiązanie:** Automatyczne wykrywanie w `build-deploy.mjs`:
```js
function findStandaloneApp(standaloneDir) {
  const nested = join(standaloneDir, 'web')
  if (existsSync(join(nested, 'server.js'))) return nested
  if (existsSync(join(standaloneDir, 'server.js'))) return standaloneDir
  return null
}
```

### Problem 4: Zła komenda startowa na Azure

**Objaw:** Serwer zwracał 503. W logach Azure widoczny był błąd `Could not find a production build in the '.next' directory`.

**Przyczyna:** Azure domyślnie uruchamiał `node node_modules/next/dist/bin/next start -p 8080` zamiast standalone `server.js`.

**Rozwiązanie:** Zmiana startup command na `node server.js`:
```bash
az webapp config set \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --startup-file "node server.js"
```

### Problem 5: Brak `BUILD_ID` po deployu (503)

**Objaw:** Server startował (`Ready on http://0.0.0.0:8080`) ale aplikacja zwracała 503. W SSH na serwerze brakowało pliku `.next/BUILD_ID`.

**Przyczyna:** PowerShell `Compress-Archive` ma bug — pomija pliki bez rozszerzenia (np. `BUILD_ID`). Plik był w `.deploy/`, ale nie został dołączony do ZIP.

**Rozwiązanie:** Użycie `tar` zamiast `Compress-Archive` do tworzenia ZIP:
```bash
# ❌ NIE UŻYWAĆ — pomija pliki bez rozszerzenia
Compress-Archive -Path .deploy\* -DestinationPath deploy-package.zip

# ✅ UŻYWAĆ — poprawnie dołącza wszystkie pliki
cd .deploy
tar -acf ../deploy-package.zip *
```

### Problem 6: Migracja z pnpm na npm

**Objaw:** Projekt używał pnpm, co komplikowało deployment.

**Przyczyna:** Potrzeba spójnego zarządzania zależnościami z npm workspaces.

**Rozwiązanie:** Pełna migracja:
1. Root `package.json` — dodanie `"workspaces": ["api", "web"]`, zmiana skryptów na `npm run ... --workspaces`
2. Root `.npmrc` — `legacy-peer-deps=true`, `optional=true`
3. `azure.yaml` — zmiana `pnpm` → `npm` w hookach
4. Usunięcie: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `web/.npmrc`

### Problem 7: `Cannot find module 'next'` — npm prune niszczy standalone modules

**Objaw:** Server crashował z `Error: Cannot find module 'next'` (exit code 1). W `node_modules/` na serwerze znajdowały się tylko `@img/`, `@next/` — brakowało `next`, `react`, `sharp` i 11 innych pakietów.

**Przyczyna:** W skrypcie `build-deploy.mjs` krok instalacji Linux binaries (`npm install --no-save --force @next/swc-linux-x64-gnu`) uruchamiany był **po** skopiowaniu współdzielonych workspace `node_modules`. Ponieważ `.deploy/package.json` nie zawiera żadnych zależności (ma tylko `scripts.start`), npm **automatycznie prune'ował** wszystkie moduły nie wymienione w `package.json`, pozostawiając jedynie zainstalowany `@next/swc-linux-x64-gnu` oraz `@img`. Współdzielone moduły (`next`, `react`, `react-dom`, `sharp` itd.) były usuwane.

**Rozwiązanie:** Zmiana kolejności w `build-deploy.mjs`:
1. **Najpierw** `npm install --no-save --force @next/swc-linux-x64-gnu` (Linux binaries)
2. **Potem** `cpSync(sharedNM, ...)` — skopiowanie współdzielonych workspace `node_modules`

Dzięki temu npm prune nie ma czego usunąć (tylko Linux binary), a następnie kopia nadpisuje `node_modules/` pełnym zestawem z standalone output.

```js
// ✅ POPRAWNA kolejność (w build-deploy.mjs)
// 1. npm install Linux binaries (npm może prune'ować)
execSync(`npm install --no-save --force @next/swc-linux-x64-gnu`, { cwd: DEPLOY_DIR })
// 2. Kopia shared node_modules NADPISUJE wynik npm install
cpSync(sharedNM, join(DEPLOY_DIR, 'node_modules'), { recursive: true })
```

### Problem 8: Kudu tworzy `node_modules.tar.gz` — Oryx niszczy standalone modules przy starcie

**Objaw:** Mimo `SCM_DO_BUILD_DURING_DEPLOYMENT=false` i `ENABLE_ORYX_BUILD=false`, serwer zwracał 503 z błędem `Cannot find module 'next'`. W Docker logach widoczne:
```
Found tar.gz based node_modules.
Removing existing modules directory from root...
Extracting modules...
Done.
Error: Cannot find module 'next'
```

**Przyczyna:** To osobny mechanizm od Oryx build! Kudu podczas ekstrakcji ZIP automatycznie:
1. Wykrywa folder `node_modules/` w paczce ZIP
2. Kompresuje go do `node_modules.tar.gz` (~40 MB) i **usuwa oryginalny** `node_modules/`
3. Tworzy plik `oryx-manifest.toml`

Następnie przy starcie kontenera, Oryx init script:
1. Znajduje `oryx-manifest.toml` → generuje skrypt startowy
2. Znajduje `node_modules.tar.gz` → rozpakowuje do `/node_modules` (globalnie!)
3. Przenosi `mv -f node_modules _del_node_modules` (usuwa standalone modules)
4. Tworzy symlink `node_modules -> /node_modules`

Rozpakowane moduły nie zawierają `next` bo archiwizacja/ekstrakcja gubi strukturę standalone.

**Rozwiązanie:** Zmiana `WEBSITE_RUN_FROM_PACKAGE` z `0` na **`1`**:
```bash
az webapp config appsettings set \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --settings WEBSITE_RUN_FROM_PACKAGE=1
```

Z `WEBSITE_RUN_FROM_PACKAGE=1`:
- ZIP jest montowany bezpośrednio jako read-only filesystem
- **Kudu nie ekstrahuje** zawartości → nie tworzy `node_modules.tar.gz`
- **Oryx nie ingeruje** w `node_modules` → wszystko działa jak lokalnie
- Filesystem jest read-only (co nie jest problemem dla Next.js standalone)

> **UWAGA:** Z `WEBSITE_RUN_FROM_PACKAGE=0` Kudu **ZAWSZE** tworzy `node_modules.tar.gz` z ZIP,
> nawet gdy `SCM_DO_BUILD_DURING_DEPLOYMENT=false`. Te ustawienia dotyczą tylko Oryx build,
> nie mechanizmu archiwizacji Kudu. Jedynym skutecznym rozwiązaniem jest `=1`.

### Problem 9: Brakująca zależność `react-is`

**Objaw:** Build Next.js kończył się błędem:
```
Module not found: Can't resolve 'react-is'
```

**Przyczyna:** Biblioteka `recharts` wymaga `react-is` jako peer dependency, ale nie była ona wymieniona w `package.json`.

**Rozwiązanie:**
```bash
cd web
npm install react-is --save
```

---

## Weryfikacja

### 1. Status App Service

```bash
az webapp show \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --query "{state:state,defaultHostName:defaultHostName}" -o table
```

### 2. Test HTTP

```bash
curl -I https://dvlp-ksef-bmgjdsb6gzbdhjgs.polandcentral-01.azurewebsites.net
```

Oczekiwany wynik: `HTTP/2 200`

### 3. Weryfikacja plików na serwerze (SSH)

Przez Kudu SSH (`https://dvlp-ksef-bmgjdsb6gzbdhjgs.scm.polandcentral-01.azurewebsites.net/webssh/host`):

```bash
# Sprawdzenie BUILD_ID
cat /home/site/wwwroot/.next/BUILD_ID

# Sprawdzenie server.js
ls -la /home/site/wwwroot/server.js

# Sprawdzenie rozmiaru
du -sh /home/site/wwwroot/
```

### 4. Logi aplikacji

```bash
# Logi na żywo
az webapp log tail --name dvlp-ksef --resource-group rg-ksef

# Oczekiwany output przy starcie:
# === KSeF Web Startup ===
# Node: v22.x.x
# Starting Next.js standalone server...
# ▲ Next.js 15.5.x
# - Local: http://0.0.0.0:8080
# ✓ Ready in Xms
```

### 5. Wynik weryfikacji z 2026-02-09

```
✅ HTTP Status:       200 OK
✅ Startup:           node server.js — Ready on 0.0.0.0:8080
✅ BUILD_ID:          6gKdwfXbEoVGE-FIUloY-
✅ Rozmiar .deploy/:  ~176 MB (ZIP: ~119 MB)
✅ Runtime:           Node.js 22 LTS (Linux)
✅ Oryx build:        Wyłączony
✅ Run-from-package:  Włączony (WEBSITE_RUN_FROM_PACKAGE=1)
✅ node_modules:      14 pakietów (w tym next, react, sharp)
```

---

## Komendy pomocnicze

### Pełny deploy (skrót)

```bash
cd web
node scripts/build-deploy.mjs && cd .deploy && tar -acf ../deploy-package.zip * && cd .. && az webapp deploy --name dvlp-ksef --resource-group rg-ksef --src-path deploy-package.zip --type zip --clean true
```

### Restart App Service

```bash
az webapp restart --name dvlp-ksef --resource-group rg-ksef
```

### Sprawdzenie app settings

```bash
az webapp config appsettings list \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --query "[].{name:name,value:value}" -o table
```

### Sprawdzenie startup command

```bash
az webapp config show \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --query "appCommandLine" -o tsv
```

### Logi (Application Insights)

```bash
az monitor app-insights query \
  --app dvlp-ksef \
  --analytics-query "requests | where timestamp > ago(1h) | order by timestamp desc | take 20"
```

### Debugowanie na serwerze (Kudu SSH)

```bash
# Wejście przez przeglądarkę:
# https://dvlp-ksef-bmgjdsb6gzbdhjgs.scm.polandcentral-01.azurewebsites.net/webssh/host

cd /home/site/wwwroot
node --version
ls -la
cat .next/BUILD_ID
PORT=8080 node server.js   # Ręczne uruchomienie serwera
```

---

## Zmienne środowiskowe

### Wymagane na Azure

| Zmienna | Źródło | Opis |
|---|---|---|
| `PORT` | Azure (automatycznie) | Port, na którym nasłuchuje serwer (`8080`) |
| `API_URL` | App Setting | URL Azure Functions API (dla rewrites/proxy) |
| `HOSTNAME` | `0.0.0.0` (domyślnie) | Standalone server nasłuchuje na wszystkich interfejsach |

### Opcjonalne

| Zmienna | Opis |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Publiczny URL aplikacji |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Monitoring Azure |
| `AZURE_CLIENT_ID` | Entra ID — Client ID |
| `AZURE_TENANT_ID` | Entra ID — Tenant ID |

### Plik `.env.production`

Jeśli istnieje w `web/`, jest kopiowany do `.deploy/` przez `build-deploy.mjs`.

---

## Uwagi dotyczące Next.js standalone na Azure

1. **`node server.js`** — jedyna prawidłowa komenda startowa. `next start` nie działa z standalone.
2. **Port 8080** — Azure App Service wymusza ten port. Standalone server odczytuje go z `PORT` env.
3. **Brak `npm install` na serwerze** — wszystkie zależności muszą być w paczce ZIP.
4. **Linux SWC binary** — build-deploy.mjs instaluje `@next/swc-linux-x64-gnu`, ponieważ budujemy na Windows, a deploy jest na Linux.
5. **`Compress-Archive` bug** — NIGDY nie używać PowerShell `Compress-Archive` do tworzenia paczki. Używać `tar -acf`.
6. **npm workspaces** — standalone output zagnieżdża app w `web/`. Skrypt `build-deploy.mjs` automatycznie to obsługuje.
7. **Oryx musi być wyłączony** — bez tego Azure próbuje `npm install` i `npm run build` na serwerze, co kończy się błędami uprawnień.
8. **`WEBSITE_RUN_FROM_PACKAGE=1`** — **KRYTYCZNE!** Bez tego Kudu tworzy `node_modules.tar.gz` z paczki ZIP i niszczy standalone modules. Z `=1` ZIP jest montowany bezpośrednio jako read-only filesystem, omijając cały problem.
9. **Kolejność w build-deploy.mjs** — Linux binaries (`npm install`) muszą być instalowane PRZED kopiowaniem shared workspace `node_modules`. Inaczej `npm` prune'uje standalone moduły.
10. **Debugowanie Docker logów** — Najszybsza metoda diagnozy 503: `az rest --method get --url "<SCM_URL>/api/vfs/LogFiles/" ...` → znaleźć najnowszy `*_default_docker.log` → przeczytać ostatnie linie.

---

## Powiązane dokumenty

- [Wdrożenie API](./API_DEPLOYMENT.md) — deploy Azure Functions
- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna referencja env vars
- [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) — tworzenie zasobów
- [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) — centralna diagnostyka

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 1.0  
**Opiekun:** dvlp-dev team
