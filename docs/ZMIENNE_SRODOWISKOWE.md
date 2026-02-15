# Zmienne środowiskowe — Kompletna referencja

Centralne źródło informacji o wszystkich zmiennych środowiskowych używanych w projekcie KSeF.

## Spis treści

- [Zmienne środowiskowe — Kompletna referencja](#zmienne-środowiskowe--kompletna-referencja)
  - [Spis treści](#spis-treści)
  - [Azure Functions — API](#azure-functions--api)
    - [Autentykacja (Entra ID)](#autentykacja-entra-id)
    - [Dataverse](#dataverse)
    - [Key Vault](#key-vault)
    - [KSeF](#ksef)
    - [Azure OpenAI (AI Categorization)](#azure-openai-ai-categorization)
    - [Grupy bezpieczeństwa](#grupy-bezpieczeństwa)
    - [Logowanie](#logowanie)
    - [Konfiguracja runtime](#konfiguracja-runtime)
  - [Web App — Next.js](#web-app--nextjs)
    - [Autentykacja (MSAL)](#autentykacja-msal)
    - [API](#api)
    - [Grupy bezpieczeństwa (Web)](#grupy-bezpieczeństwa-web)
    - [Feature flags](#feature-flags)
    - [Konfiguracja Azure App Service](#konfiguracja-azure-app-service)
  - [Gdzie przechowywać wartości](#gdzie-przechowywać-wartości)
    - [Zasady bezpieczeństwa](#zasady-bezpieczeństwa)
  - [Pliki konfiguracyjne](#pliki-konfiguracyjne)
    - [API: `api/local.settings.json` (lokalny development)](#api-apilocalsettingsjson-lokalny-development)
    - [Web: `web/.env.local` (lokalny development)](#web-webenvlocal-lokalny-development)
    - [Web: `web/.env.production` (baked into build)](#web-webenvproduction-baked-into-build)
  - [Produkcja — Azure App Settings](#produkcja--azure-app-settings)
    - [Azure Functions (`YOUR_FUNCTION_APP`)](#azure-functions-YOUR_FUNCTION_APP)
    - [Azure App Service (`dvlp-ksef` — Web)](#azure-app-service-dvlp-ksef--web)
  - [Powiązane dokumenty](#powiązane-dokumenty)

---

## Azure Functions — API

Plik konfiguracyjny: `api/local.settings.json`

### Autentykacja (Entra ID)

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `AZURE_TENANT_ID` | ✅ | `your-tenant-...` | Directory (tenant) ID z Entra ID |
| `AZURE_CLIENT_ID` | ✅ | `your-client-...` | Application (client) ID z App Registration |
| `AZURE_CLIENT_SECRET` | ✅ | `your-client-secret` | Client Secret (dla Client Credentials flow) |
| `SKIP_AUTH` | ❌ | `true` | Pominięcie walidacji JWT w dev (`true` = brak auth) |

> ⚠️ `AZURE_CLIENT_SECRET` — w produkcji **NIGDY** nie ustawiaj bezpośrednio. Użyj Key Vault Reference.

### Dataverse

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `DATAVERSE_URL` | ✅ | `https://your-org.api.crm4.dynamics.com` | URL środowiska Dataverse |
| `DV_ENTITY_INVOICE` | ✅ | `dvlp_ksefinvoices` | Nazwa tabeli faktur |
| `DV_ENTITY_SETTING` | ✅ | `dvlp_ksefsettings` | Nazwa tabeli ustawień |
| `DV_ENTITY_SESSION` | ✅ | `dvlp_ksefsessions` | Nazwa tabeli sesji |
| `DV_ENTITY_SYNCLOG` | ✅ | `dvlp_ksefsynclogs` | Nazwa tabeli logów synchronizacji |

### Key Vault

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `AZURE_KEYVAULT_URL` | ✅ | `https://your-keyvault-name.vault.azure.net` | URL Azure Key Vault |

Key Vault przechowuje następujące sekrety:

| Sekret w KV | Mapowanie | Opis |
|-------------|-----------|------|
| `ENTRA-CLIENT-SECRET` | → `AZURE_CLIENT_SECRET` | Client Secret aplikacji |
| `ENTRA-CLIENT-ID` | → `AZURE_CLIENT_ID` | Client ID aplikacji |
| `ENTRA-TENANT-ID` | → `AZURE_TENANT_ID` | Tenant ID |
| `DATAVERSE-URL` | → `DATAVERSE_URL` | URL Dataverse |
| `AZURE-OPENAI-API-KEY` | (pobierany w runtime) | Klucz API Azure OpenAI |
| `AZURE-OPENAI-ENDPOINT` | (pobierany w runtime) | Endpoint Azure OpenAI |
| `ksef-token-{NIP}` | (pobierany w runtime) | Token KSeF dla danego NIP |

### KSeF

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `KSEF_ENVIRONMENT` | ❌ | `test` | Środowisko KSeF: `test`, `demo`, `prod` |
| `KSEF_NIP` | ❌ | `0000000000` | Domyślny NIP (fallback) |
| `KSEF_TOKEN_SECRET_NAME` | ❌ | `ksef-token-primary` | Nazwa sekretu z tokenem w KV |

### Azure OpenAI (AI Categorization)

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `AZURE_OPENAI_DEPLOYMENT` | ❌ | `gpt-4o-mini` | Nazwa deployment modelu |
| `AZURE_OPENAI_API_VERSION` | ❌ | `2024-10-21` | Wersja API OpenAI |

> Endpoint i API Key pobierane z Key Vault w runtime — **NIE** ustawiaj ich jako App Settings.

### WL VAT API (Biała Lista)

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `WL_VAT_API_URL` | ❌ | `https://wl-api.mf.gov.pl` | URL API Białej Listy (domyślnie produkcja) |

> API publiczne — nie wymaga klucza. Limit: 100 zapytań search/dzień, 5000 check/dzień.  
> Do testów użyj `https://wl-test.mf.gov.pl`.

### Grupy bezpieczeństwa

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `ADMIN_GROUP_ID` | ✅ | `your-admin-group-...` | Object ID grupy Administratorów |
| `USER_GROUP_ID` | ✅ | `your-user-group-...` | Object ID grupy Użytkowników |

### Logowanie

| Zmienna | Wymagana | Domyślnie | Opis |
|---------|----------|-----------|------|
| `DV_LOG_LEVEL` | ❌ | `info` | Poziom logów: `debug`, `info`, `warn`, `error` |
| `DV_LOG_TRAFFIC` | ❌ | `false` | Logowanie ruchu HTTP do Dataverse |
| `DV_LOG_CONSOLE` | ❌ | `true` | Wypisywanie logów na konsolę |
| `DV_LOG_FILE_MAX_MB` | ❌ | `5` | Maksymalny rozmiar pliku logów (MB) |
| `DV_LOG_ALLOW_VERBOSE` | ❌ | `false` | Zezwalanie na logi verbose |

### Konfiguracja runtime

| Zmienna | Wymagana | Wartość | Opis |
|---------|----------|---------|------|
| `AzureWebJobsStorage` | ✅ | `""` (lokal) | Connection string do Azure Storage |
| `FUNCTIONS_WORKER_RUNTIME` | ✅ | `node` | Runtime Azure Functions |
| `NODE_ENV` | ❌ | `development` | Środowisko Node.js |
| `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR` | ❌ | `true` | Blokuj na błędach entry point (debug) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | ❌ | `InstrumentationKey=...` | Monitoring Application Insights |
| `FEATURE_AI_CATEGORIZATION` | ❌ | `true` | Feature flag: kategoryzacja AI |

> Na Flex Consumption: `FUNCTIONS_WORKER_RUNTIME` jest **zablokowane** jako app setting. Runtime konfiguruje się na poziomie `functionAppConfig`.

---

## Web App — Next.js

Pliki konfiguracyjne: `web/.env.local` (dev), `web/.env.production` (produkcja)

### Autentykacja (MSAL)

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | ✅ | `your-client-...` | Client ID (publiczny — wbudowany w JS) |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | ✅ | `your-tenant-...` | Tenant ID (publiczny) |
| `NEXT_PUBLIC_AZURE_REDIRECT_URI` | ❌ | `http://localhost:3000` | Redirect URI po logowaniu |
| `NEXT_PUBLIC_API_SCOPE` | ❌ | `api://your-client-.../access_as_user` | Scope dla token acquisition |

> Zmienne z prefixem `NEXT_PUBLIC_` są **wbudowane** w build i widoczne w client-side JS.

### API

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:7071/api` | URL bazowy API (lokal) |
| `API_URL` | ✅ (prod) | `https://YOUR_FUNCTION_APP-...azurewebsites.net` | URL API dla rewrites (server-side) |
| `NEXT_PUBLIC_APP_URL` | ❌ | `https://dvlp-ksef-...azurewebsites.net` | Publiczny URL aplikacji |

### Grupy bezpieczeństwa (Web)

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `NEXT_PUBLIC_ADMIN_GROUP` | ✅ | `your-admin-group-...` | Object ID grupy Admin (RBAC) |
| `NEXT_PUBLIC_USER_GROUP` | ✅ | `your-user-group-...` | Object ID grupy User (RBAC) |

### Feature flags

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `FEATURE_AI_CATEGORIZATION` | `false` | Kategoryzacja AI faktur |
| `FEATURE_MULTI_TENANT` | `false` | Wsparcie wielu firm |
| `FEATURE_EXPORT` | `false` | Eksport CSV/Excel |

### Konfiguracja Azure App Service

| Zmienna | Wartość | Opis |
|---------|---------|------|
| `PORT` | `8080` (auto) | Port serwera (ustawiany przez Azure) |
| `HOSTNAME` | `0.0.0.0` | Adres nasłuchu standalone server |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | Wyłączenie Oryx build |
| `ENABLE_ORYX_BUILD` | `false` | Dodatkowe wyłączenie Oryx |
| `WEBSITE_RUN_FROM_PACKAGE` | `1` | ⚡ **KRYTYCZNE** — montowanie ZIP jako filesystem |

---

## Code App — Power Platform (Vite + React SPA)

Zmienne konfigurowane w `code-app/.env` (dev) lub Power Platform environment settings.

### Autentykacja (MSAL — tryb standalone)

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `VITE_AZURE_CLIENT_ID` | ✅ | `your-client-...` | Client ID app registration |
| `VITE_AZURE_TENANT_ID` | ✅ | `your-tenant-...` | Tenant ID |
| `VITE_AZURE_REDIRECT_URI` | ❌ | `http://localhost:5173` | Redirect URI (standalone dev) |

### API

| Zmienna | Wymagana | Przykład | Opis |
|---------|----------|---------|------|
| `VITE_API_URL` | ✅ | `http://localhost:7071/api` | URL bazowy Azure Functions API |
| `VITE_API_SCOPE` | ❌ | `api://your-client-.../access_as_user` | Scope tokenu MSAL (standalone) |

> W trybie Power Apps managed auth: zmienne `VITE_AZURE_*` nie są wymagane — autentykacja jest zarządzana przez host.

---

## Gdzie przechowywać wartości

| Typ danych | Lokalne dev | Produkcja |
|------------|-------------|-----------|
| Sekrety (secrets) | `local.settings.json` / `.env.local` | **Azure Key Vault** + KV Reference |
| Konfiguracja publiczna | `local.settings.json` / `.env.local` | Azure App Settings |
| Feature flags | `.env.local` | Azure App Settings |
| Parametry runtime | `local.settings.json` | Azure App Settings (lub `functionAppConfig`) |

### Zasady bezpieczeństwa

1. **Nigdy** nie commituj plików z sekretami (`.env.local`, `local.settings.json`)
2. **Nigdy** nie ustawiaj `AZURE_CLIENT_SECRET` jako App Setting — użyj Key Vault Reference
3. Endpoint i API Key Azure OpenAI — **zawsze** z Key Vault (pobierane w runtime)
4. Tokeny KSeF — **wyłącznie** w Key Vault (`ksef-token-{NIP}`)

---

## Pliki konfiguracyjne

### API: `api/local.settings.json` (lokalny development)

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
    
    "DATAVERSE_URL": "https://your-org.api.crm4.dynamics.com",
    
    "DV_ENTITY_INVOICE": "dvlp_ksefinvoices",
    "DV_ENTITY_SETTING": "dvlp_ksefsettings",
    "DV_ENTITY_SESSION": "dvlp_ksefsessions",
    "DV_ENTITY_SYNCLOG": "dvlp_ksefsynclogs",
    
    "DV_LOG_LEVEL": "info",
    "DV_LOG_TRAFFIC": "false",
    "DV_LOG_CONSOLE": "true",
    
    "AZURE_KEYVAULT_URL": "https://your-keyvault-name.vault.azure.net",
    
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

### Web: `web/.env.local` (lokalny development)

```bash
# Autentykacja MSAL
NEXT_PUBLIC_AZURE_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<tenant-id>

# API (Azure Functions lokal)
NEXT_PUBLIC_API_URL=http://localhost:7071/api

# Scope (opcjonalnie — po konfiguracji "Expose an API")
NEXT_PUBLIC_API_SCOPE=api://<client-id>/access_as_user

# Grupy bezpieczeństwa
NEXT_PUBLIC_ADMIN_GROUP=<admin-group-object-id>
NEXT_PUBLIC_USER_GROUP=<user-group-object-id>

# Feature flags
FEATURE_AI_CATEGORIZATION=false
FEATURE_MULTI_TENANT=false
FEATURE_EXPORT=false
```

### Web: `web/.env.production` (baked into build)

```bash
# API URL (rewrites + client-side)
API_URL=https://your-function-app.polandcentral-01.azurewebsites.net
NEXT_PUBLIC_API_URL=https://your-function-app.polandcentral-01.azurewebsites.net

# Autentykacja
NEXT_PUBLIC_AZURE_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<tenant-id>
NEXT_PUBLIC_API_SCOPE=api://<client-id>/access_as_user

# Grupy bezpieczeństwa
NEXT_PUBLIC_ADMIN_GROUP=<admin-group-object-id>
NEXT_PUBLIC_USER_GROUP=<user-group-object-id>
```

---

## Produkcja — Azure App Settings

### Azure Functions (`YOUR_FUNCTION_APP`)

Konfiguracja przez Key Vault References:

```bash
az functionapp config appsettings set \
  --name YOUR_FUNCTION_APP \
  --resource-group rg-ksef \
  --settings \
    "AZURE_CLIENT_ID=@Microsoft.KeyVault(SecretUri=https://your-keyvault-name.vault.azure.net/secrets/ENTRA-CLIENT-ID/)" \
    "AZURE_TENANT_ID=@Microsoft.KeyVault(SecretUri=https://your-keyvault-name.vault.azure.net/secrets/ENTRA-TENANT-ID/)" \
    "AZURE_CLIENT_SECRET=@Microsoft.KeyVault(SecretUri=https://your-keyvault-name.vault.azure.net/secrets/ENTRA-CLIENT-SECRET/)" \
    "DATAVERSE_URL=@Microsoft.KeyVault(SecretUri=https://your-keyvault-name.vault.azure.net/secrets/DATAVERSE-URL/)" \
    "AZURE_KEYVAULT_URL=https://your-keyvault-name.vault.azure.net" \
    "DV_ENTITY_INVOICE=dvlp_ksefinvoices" \
    "DV_ENTITY_SETTING=dvlp_ksefsettings" \
    "DV_ENTITY_SESSION=dvlp_ksefsessions" \
    "DV_ENTITY_SYNCLOG=dvlp_ksefsynclogs" \
    "AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini" \
    "AZURE_OPENAI_API_VERSION=2024-10-21" \
    "ADMIN_GROUP_ID=<admin-group-object-id>" \
    "USER_GROUP_ID=<user-group-object-id>" \
    "FEATURE_AI_CATEGORIZATION=true" \
    "FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true"
```

### Azure App Service (`dvlp-ksef` — Web)

```bash
az webapp config appsettings set \
  --name dvlp-ksef \
  --resource-group rg-ksef \
  --settings \
    "SCM_DO_BUILD_DURING_DEPLOYMENT=false" \
    "ENABLE_ORYX_BUILD=false" \
    "WEBSITE_RUN_FROM_PACKAGE=1" \
    "API_URL=https://your-function-app.polandcentral-01.azurewebsites.net"
```

> Zmienne `NEXT_PUBLIC_*` **nie mogą** być ustawiane jako App Settings — muszą być w `.env.production` **przed** buildem, bo Next.js je inline'uje do JS w czasie kompilacji.

---

## Powiązane dokumenty

- [Konfiguracja Entra ID](./ENTRA_ID_KONFIGURACJA.md) — App Registration, grupy, RBAC
- [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) — Key Vault, Functions, App Service
- [Wdrożenie API](./API_DEPLOYMENT.md) — deploy Azure Functions
- [Wdrożenie Web](./WEB_DEPLOYMENT.md) — deploy Next.js standalone
- [AI Categorization](./AI_CATEGORIZATION_SETUP.md) — Azure OpenAI

---

**Ostatnia aktualizacja:** 2026-02-14  
**Wersja:** 2.0  
**Opiekun:** dvlp-dev team
