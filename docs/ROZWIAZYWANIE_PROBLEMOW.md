# Rozwiązywanie problemów

Centralny przewodnik diagnostyczny dla projektu KSeF. Zebrane rozwiązania ze wszystkich komponentów: API, Web, autentykacja, Key Vault, KSeF, AI.

## Spis treści

1. [Autentykacja (Entra ID / MSAL)](#autentykacja-entra-id--msal)
2. [Key Vault](#key-vault)
3. [Dataverse](#dataverse)
4. [KSeF API](#ksef-api)
5. [Wdrożenie API (Azure Functions)](#wdrożenie-api-azure-functions)
6. [Wdrożenie Web (App Service)](#wdrożenie-web-app-service)
7. [AI Categorization (Azure OpenAI)](#ai-categorization-azure-openai)
8. [Development lokalny](#development-lokalny)
9. [Narzędzia diagnostyczne](#narzędzia-diagnostyczne)

---

## Autentykacja (Entra ID / MSAL)

### AADSTS700016: Application not found

**Objaw:** Błąd logowania z kodem `AADSTS700016`.  
**Przyczyna:** Nieprawidłowy Client ID.  
**Rozwiązanie:**
1. Sprawdź `AZURE_CLIENT_ID` / `NEXT_PUBLIC_AZURE_CLIENT_ID`
2. Porównaj z wartością w Azure Portal → App registrations → Overview

### AADSTS7000215: Invalid client secret

**Objaw:** API nie może uzyskać tokena.  
**Przyczyna:** Secret wygasł lub jest nieprawidłowy.  
**Rozwiązanie:**
1. Sprawdź datę wygaśnięcia w App Registration → Certificates & secrets
2. Utwórz nowy secret, zaktualizuj `AZURE_CLIENT_SECRET` (lub sekret w Key Vault)

### Brak grup w tokenie ID

**Objaw:** Użytkownik zalogowany, ale nie ma roli `Admin` ani `User`.  
**Przyczyna:** Groups claim nie skonfigurowany lub użytkownik nie jest w grupie.  
**Rozwiązanie:**
1. Sprawdź App Registration → Token configuration → Groups claim
2. Upewnij się, że zaznaczone jest **Security groups** z **Group ID**
3. Sprawdź członkostwo użytkownika w grupie Entra ID
4. **Wyloguj i zaloguj ponownie** — zmiana grup wymaga nowego tokena

### `_claim_sources` zamiast tablicy `groups`

**Objaw:** Token zawiera `_claim_sources` zamiast listy grup.  
**Przyczyna:** Użytkownik ma >200 grup (**groups overage**).  
**Rozwiązanie:**
- Zaimplementuj fallback do Microsoft Graph API
- Lub ogranicz liczbę grup użytkownika

### 403 Forbidden na endpointach API

**Objaw:** Użytkownik zalogowany, ale API zwraca 403.  
**Przyczyna:** Brak wymaganej roli (Admin/User).  
**Rozwiązanie:**
1. Sprawdź `ADMIN_GROUP_ID` i `USER_GROUP_ID` w API config
2. Sprawdź czy Object ID grup zgadza się z Entra ID
3. Użyj jwt.ms aby zdekodować token i sprawdzić claim `groups`
4. W dev: ustaw `SKIP_AUTH=true` aby ominąć weryfikację

### Sesja wygasa zbyt szybko

**Rozwiązanie:** Zmień `cacheLocation` w konfiguracji MSAL:
```typescript
cache: { cacheLocation: 'localStorage' }  // zamiast 'sessionStorage'
```

---

## Key Vault

### Access denied to Key Vault

**Objaw:** `ForbiddenError` przy próbie odczytu secretów.  
**Rozwiązanie:**
1. Sprawdź Permission model Key Vault — **musi być RBAC** (nie Access policies)
2. Sprawdź rolę Azure Functions w IAM:
   ```bash
   az role assignment list --scope "/subscriptions/.../resourceGroups/rg-ksef/providers/Microsoft.KeyVault/vaults/YOUR_KEYVAULT" --output table
   ```
3. Function App musi mieć rolę **Key Vault Secrets User**

### Key Vault Reference — czerwona ikona ❌

**Objaw:** W Application Settings zmienne z KV referencją pokazują błąd.  
**Rozwiązanie:**
1. Sprawdź Managed Identity: Function App → Identity → Status = **On**
2. Sprawdź format SecretUri (końcowy `/`):
   ```
   ✅ @Microsoft.KeyVault(SecretUri=https://YOUR_KEYVAULT.vault.azure.net/secrets/ENTRA-CLIENT-SECRET/)
   ❌ @Microsoft.KeyVault(SecretUri=https://YOUR_KEYVAULT.vault.azure.net/secrets/ENTRA-CLIENT-SECRET)
   ```
3. Restartuj Function App po zmianie

### Managed Identity not found

**Objaw:** Przypisanie roli Key Vault Secrets User kończy się błędem.  
**Rozwiązanie:**
1. Wyłącz i włącz ponownie System-assigned Managed Identity
2. Odczekaj ~2-3 min na propagację w AAD
3. Zrestartuj Function App

### Token KSeF — status "missing"

**Objaw:** W Settings firma pokazuje `Missing` dla tokena KSeF.  
**Przyczyna:** Token nie znaleziony w Key Vault.  
**Rozwiązanie:**
1. Użyj **Test Token** (🧪) przy firmie — przeczytaj szczegółowy komunikat
2. Sprawdź nazwę sekretu — format: `ksef-token-{NIP}` (np. `ksef-token-5272976789`)
3. Sprawdź `AZURE_KEYVAULT_URL` w API config
4. Sprawdź uprawnienia: Function App → **Key Vault Secrets User**

---

## Dataverse

### 403 Forbidden przy Dataverse

**Objaw:** API nie może odczytać/zapisać danych.  
**Przyczyna:** Brak uprawnień Application User.  
**Rozwiązanie:**
1. Sprawdź, czy Application User istnieje w Power Platform Admin Center
2. Sprawdź, czy ma rolę `DVLP-KSeF Application`
3. Sprawdź uprawnienia roli (Organization-level CRUD na tabelach `dvlp_ksef*`)

### Puste wyniki przy zapytaniach

**Przyczyna:** Nieprawidłowa nazwa tabeli lub filtrowanie.  
**Rozwiązanie:**
1. Sprawdź `DV_ENTITY_INVOICE`, `DV_ENTITY_SETTING` itd.
2. Upewnij się, że w Dataverse istnieją dane
3. Testuj ręcznie:
   ```bash
   curl "$DATAVERSE_URL/api/data/v9.2/dvlp_ksefinvoices?\$top=1" -H "Authorization: Bearer $TOKEN"
   ```

### Błąd HTTP 401 przy Dataverse

**Przyczyna:** Token wygasł lub jest z niewłaściwego tenanta.  
**Rozwiązanie:**
1. Sprawdź `DATAVERSE_URL` — musi odpowiadać środowisku w `AZURE_TENANT_ID`
2. Przetestuj ręczne uzyskanie tokena Client Credentials (patrz [Testowanie](./ENTRA_ID_KONFIGURACJA.md#testowanie))

---

## KSeF API

### KSeF API — status "unhealthy"

**Przyczyny:**
1. Środowisko KSeF jest w konserwacji (normalne zjawisko)
2. Problem sieciowy (Azure → mf.gov.pl)
3. Środowisko niedostępne (sprawdź na stronie MF)

**Rozwiązanie:**
1. Sprawdź status KSeF na stronie ministerstwa
2. Zweryfikuj health check: `GET /api/health/detailed`
3. Sprawdź, czy wybrane środowisko KSeF (test/demo/prod) jest aktywne

### Token KSeF nie działa przy synchronizacji

**Rozwiązanie:**
1. Sprawdź pole `keyVaultSecretName` w ustawieniach firmy
2. Domyślnie: `ksef-token-{NIP}`
3. Zweryfikuj token w Key Vault — czy nie wygasł
4. Przetestuj przyciskiem 🧪 **Test Token** przy firmie

### Środowiska KSeF — adresy

| Środowisko | Portal | API |
|------------|--------|-----|
| Test | `https://ap-test.ksef.mf.gov.pl/` | `https://api-test.ksef.mf.gov.pl/v2` |
| Demo | `https://ap-demo.ksef.mf.gov.pl/` | `https://api-demo.ksef.mf.gov.pl/v2` |
| Produkcja | `https://ap.ksef.mf.gov.pl/` | `https://api.ksef.mf.gov.pl/v2` |

---

## Wdrożenie API (Azure Functions)

### "No functions found" / puste endpointy po deployu

**Przyczyna 1:** `node_modules/` w `.funcignore`.  
**Rozwiązanie:** Zakomentuj `node_modules/` w `.funcignore`:
```diff
- node_modules/
+ # node_modules/ — must be included for Flex Consumption
```

**Przyczyna 2:** npm workspaces hoisting — pusty `api/node_modules/`.  
**Rozwiązanie:** Użyj `--no-workspaces`:
```bash
npm install --omit=dev --no-workspaces --ignore-scripts
```
Weryfikacja:
```bash
Test-Path "api/node_modules/@azure/functions"  # → True
```

**Przyczyna 3:** Brak `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true`.  
**Rozwiązanie:** Dodaj to ustawienie — pozwoli zobaczyć błędy importu w logach.

### "Array dimensions exceeded" przy deployu

**Przyczyna:** Stare katalogi z zagnieżdżonymi `node_modules`.  
**Rozwiązanie:**
```bash
Remove-Item -Recurse -Force node_modules_prod, deploy-final, check-pkg
```

### `FUNCTIONS_WORKER_RUNTIME` nie można ustawić

**Przyczyna:** Na Flex Consumption to ustawienie jest **zablokowane** jako app setting.  
**Rozwiązanie:** Runtime konfigurowany na poziomie `functionAppConfig`:
```bash
az resource show \
  --ids "/.../providers/Microsoft.Web/sites/YOUR_FUNCTION_APP" \
  --query "properties.functionAppConfig.runtime" -o json
```

### Weryfikacja po deployu

```bash
# 1. Lista funkcji
az functionapp function list --name YOUR_FUNCTION_APP --resource-group rg-ksef --query "[].name" -o tsv

# 2. Health check
curl https://YOUR_FUNCTION_APP.azurewebsites.net/api/health

# 3. Szczegółowy health check
curl https://YOUR_FUNCTION_APP.azurewebsites.net/api/health/detailed

# 4. Logi na żywo
az webapp log tail --name YOUR_FUNCTION_APP --resource-group rg-ksef
```

---

## Wdrożenie Web (App Service)

### 503 — `Cannot find module 'next'`

**Przyczyna 1:** Kudu tworzył `node_modules.tar.gz` i niszczył standalone modules.  
**Rozwiązanie:** Ustaw `WEBSITE_RUN_FROM_PACKAGE=1`:
```bash
az webapp config appsettings set --name dvlp-ksef --resource-group rg-ksef \
  --settings WEBSITE_RUN_FROM_PACKAGE=1
```

**Przyczyna 2:** Zła kolejność w `build-deploy.mjs` — npm prune usunął moduły.  
**Rozwiązanie:** W skrypcie: **najpierw** `npm install` (Linux binaries), **potem** `cpSync` (workspace modules).

### 503 — `Could not find a production build`

**Przyczyna:** Zła komenda startowa (domyślna `next start` zamiast standalone).  
**Rozwiązanie:**
```bash
az webapp config set --name dvlp-ksef --resource-group rg-ksef --startup-file "node server.js"
```

### 503 — brak `BUILD_ID`

**Przyczyna:** PowerShell `Compress-Archive` pomija pliki bez rozszerzenia.  
**Rozwiązanie:** Użyj `tar` zamiast `Compress-Archive`:
```bash
cd web/.deploy
tar -acf ../deploy-package.zip *
```

### `Cannot find module '@swc/helpers'`

**Rozwiązanie:** Dodaj jawną zależność:
```bash
cd web && npm install @swc/helpers --save
```

### `Cannot find module 'react-is'`

**Przyczyna:** `recharts` wymaga `react-is` jako peer dependency.  
**Rozwiązanie:**
```bash
cd web && npm install react-is --save
```

### Standalone output zagnieżdżony pod `web/`

**Przyczyna:** npm workspaces powodują zagnieżdżenie w podfolderze.  
**Rozwiązanie:** Skrypt `build-deploy.mjs` automatycznie wykrywa tę strukturę. Jeśli ręcznie:
```
.next/standalone/web/server.js  ← serwer jest tutaj, nie w standalone/
```

### Oryx buduje mimo wyłączenia

**Przyczyna:** `SCM_DO_BUILD_DURING_DEPLOYMENT=false` i `ENABLE_ORYX_BUILD=false` **nie blokują** mechanizmu archiwizacji Kudu.  
**Rozwiązanie:** `WEBSITE_RUN_FROM_PACKAGE=1` — jedyne skuteczne rozwiązanie.

### Weryfikacja po deployu Web

```bash
# 1. HTTP status
curl -I https://dvlp-ksef-bmgjdsb6gzbdhjgs.polandcentral-01.azurewebsites.net

# 2. Logi
az webapp log tail --name dvlp-ksef --resource-group rg-ksef

# 3. SSH na serwer
# https://dvlp-ksef-bmgjdsb6gzbdhjgs.scm.polandcentral-01.azurewebsites.net/webssh/host
cat /home/site/wwwroot/.next/BUILD_ID
ls -la /home/site/wwwroot/server.js
```

---

## AI Categorization (Azure OpenAI)

### "Resource not found"

**Rozwiązanie:**
1. Sprawdź czy zasób Azure OpenAI został utworzony
2. Sprawdź czy model deployment istnieje
3. Sprawdź `AZURE_OPENAI_DEPLOYMENT` — nazwa musi zgadzać się z AI Foundry

### "Access denied"

**Rozwiązanie:**
1. Sprawdź czy Function App ma dostęp do Key Vault (Managed Identity)
2. Sprawdź sekrety w Key Vault: `AZURE-OPENAI-API-KEY`, `AZURE-OPENAI-ENDPOINT`
3. Sprawdź `AZURE_OPENAI_API_VERSION` — musi być obsługiwana

### "Rate limit exceeded"

**Rozwiązanie:**
1. Zwiększ **Tokens per Minute** w AI Foundry → Deployments
2. Zaimplementuj retry z exponential backoff
3. Użyj batch processing zamiast pojedynczych requestów

---

## Development lokalny

### API nie startuje (`func start`)

**Rozwiązanie:**
1. Sprawdź `api/local.settings.json` — czy wszystkie wymagane zmienne są ustawione
2. Sprawdź czy `api/node_modules/` nie jest pusty (npm workspaces hoisting):
   ```bash
   npm install --ignore-scripts
   ```
3. Sprawdź build: `cd api && npm run build`
4. Zweryfikuj: `func start` w katalogu `api/`

### Web nie startuje (`npm run dev`)

**Rozwiązanie:**
1. Sprawdź `web/.env.local` — czy `NEXT_PUBLIC_API_URL` wskazuje na `http://localhost:7071/api`
2. Sprawdź zależności: `cd web && npm install`
3. Sprawdź, czy port 3001 jest wolny

### CORS error w przeglądarce

**Rozwiązanie:**
1. Sprawdź `api/local.settings.json` → `Host.CORS`:
   ```json
   "Host": {
     "CORS": "http://localhost:3001",
     "CORSCredentials": true
   }
   ```
2. Port musi zgadzać się z uruchomioną aplikacją Web

### Testy nie przechodzą

**Rozwiązanie:**
1. `cd api && npm test` — testy API
2. Sprawdź czy zmienne środowiskowe nie wpływają na testy (mock)
3. W `vitest.config.ts` sprawdź konfigurację

---

## Narzędzia diagnostyczne

### Health check (wbudowany)

| Endpoint | Opis |
|----------|------|
| `GET /api/health` | Podstawowy — status + wersja |
| `GET /api/health/detailed` | Szczegółowy — Key Vault, Dataverse, KSeF (z czasami odpowiedzi) |

### Test Token (UI)

Ikona 🧪 przy firmie w **Settings → Companies** — testuje:
- Działanie Key Vault
- Istnienie tokena KSeF
- Połączenie z KSeF API

### System Status Panel (UI)

Zakładka **Settings → System Status** — monitoring:
- Azure Key Vault (połączenie + liczba tokenów)
- Microsoft Dataverse (połączenie z bazą)
- KSeF API (status każdego środowiska)

### Status Badge (UI)

Badge w prawym górnym rogu aplikacji:
- 🟢 All Systems — wszystko działa
- 🟡 Degraded — częściowe problemy
- 🔴 Issues — błędy krytyczne

### Azure CLI — diagnostyka

```bash
# Logi API (na żywo)
az webapp log tail --name YOUR_FUNCTION_APP --resource-group rg-ksef

# Logi Web (na żywo)
az webapp log tail --name dvlp-ksef --resource-group rg-ksef

# Application Insights
az monitor app-insights query --app YOUR_FUNCTION_APP --analytics-query \
  "traces | where timestamp > ago(1h) | order by timestamp desc | take 50"

# Lista funkcji
az functionapp function list --name YOUR_FUNCTION_APP --resource-group rg-ksef --query "[].name" -o tsv

# App Settings
az functionapp config appsettings list --name YOUR_FUNCTION_APP --resource-group rg-ksef -o table
az webapp config appsettings list --name dvlp-ksef --resource-group rg-ksef -o table
```

---

## Code App — Power Platform

### Code App nie ładuje się w Power Apps

| Symptom | Rozwiązanie |
|---------|-------------|
| Biały ekran po otwarciu | Sprawdź konsolę przeglądarki — brak CORS lub błąd MSAL |
| `pac code push` — błąd auth | Wykonaj `pac auth create --environment <url>` ponownie |
| Connector zwraca `401` | Sprawdź konfigurację OAuth w Custom Connector (audience, scope) |
| Dane nie wyświetlają się | Zweryfikuj czy connector SDK jest poprawnie zainicjalizowany (lazy loading) |
| `AADSTS700016` w standalone | Nieprawidłowy `VITE_AZURE_CLIENT_ID` — sprawdź App Registration |

### WL VAT API — problemy

| Symptom | Rozwiązanie |
|---------|-------------|
| `404` z `/api/vat/lookup` | NIP/REGON nie istnieje w rejestrze Białej Listy |
| Limit 100 zapytań/dzień | API publiczne KAS ma limit — użyj cache lub ogranicz zapytania |
| `400 Bad Request` | Sprawdź format NIP (10 cyfr) lub REGON (9/14 cyfr) |

---

## Powiązane dokumenty

- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna referencja env vars
- [Konfiguracja Entra ID](./ENTRA_ID_KONFIGURACJA.md) — App Registration, grupy, RBAC
- [Wdrożenie API](./API_DEPLOYMENT.md) — pełna instrukcja deployu Functions
- [Wdrożenie Web](./WEB_DEPLOYMENT.md) — pełna instrukcja deployu App Service
- [Tokeny KSeF](./TOKEN_SETUP_GUIDE.md) — konfiguracja tokenów

---

**Ostatnia aktualizacja:** 2026-02-14  
**Wersja:** 2.0  
**Opiekun:** dvlp-dev team
