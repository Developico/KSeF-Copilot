# Wdrożenie KSeF Integration

Kompletna dokumentacja wdrożenia rozwiązania KSeF Integration — od infrastruktury Azure po konfigurację Power Platform.

## Architektura rozwiązania

```
┌─────────────────────────────────────────────────────────────────┐
│                        Power Platform                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  MDA App     │  │  Code App    │  │  Power Automate    │    │
│  │  (Admin)     │  │  (Dashboard) │  │  (Flows)           │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
│  ┌──────┴─────────────────┴────────────────────┴───────────┐   │
│  │              Custom Connector (OAuth 2.0)                │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │              Dataverse (tabele, role, option sets)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┴───────────────────────────────────┐
│                           Azure                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Azure Functions │  │  Key Vault   │  │  App Insights   │    │
│  │  (API backend)   │  │  (tokeny)    │  │  (monitoring)   │    │
│  └────────┬────────┘  └──────────────┘  └─────────────────┘    │
│           │                                                      │
│  ┌────────┴────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Static Web App │  │  Storage     │  │  Entra ID       │    │
│  │  (web frontend) │  │  Account     │  │  (auth/RBAC)    │    │
│  └─────────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   KSeF API (MF)    │
                    │   NBP API          │
                    │   OpenAI API       │
                    └────────────────────┘
```

## Struktura katalogu deployment

```
deployment/
├── README.md                    ← Ten plik
├── CHECKLIST.md                 # Interaktywna lista kontrolna wdrożenia
├── dataverse/                   # Dokumentacja schematu Dataverse
│   ├── README.md
│   └── solution/
├── powerplatform/               # Artefakty Power Platform
│   ├── README.md
│   ├── solution/                # Plik solucji (.zip) — managed + unmanaged
│   ├── connector/               # Custom Connector (OpenAPI)
│   └── flows/                   # Przykładowe procesy Power Automate
├── scripts/                     # Skrypty PowerShell
│   ├── Install-KSeF.ps1         # Główny skrypt wdrożenia
│   ├── Configure-Azure.ps1      # Konfiguracja App Registration
│   ├── Setup-EntraId.ps1        # Konfiguracja Entra ID (rozbudowany)
│   └── helpers/Common.ps1       # Funkcje pomocnicze
└── templates/                   # Szablony IaC (Bicep)
    ├── main.bicep               # Infrastruktura Azure
    ├── main.bicepparam          # Parametry (dev)
    ├── main.test.bicepparam     # Parametry (test)
    └── main.prod.bicepparam     # Parametry (prod)
```

## Wymagania wstępne

### Narzędzia

| Narzędzie | Wersja min. | Link |
|-----------|------------|------|
| Azure CLI | 2.50+ | [Instalacja](https://docs.microsoft.com/cli/azure/install-azure-cli) |
| Azure Functions Core Tools | v4 | [Instalacja](https://docs.microsoft.com/azure/azure-functions/functions-run-local) |
| PowerShell | 7+ | [Instalacja](https://docs.microsoft.com/powershell/scripting/install/installing-powershell) |
| Power Platform CLI (`pac`) | latest | [Instalacja](https://learn.microsoft.com/power-platform/developer/cli/introduction) |
| Node.js | 20 LTS | [Instalacja](https://nodejs.org) |
| pnpm | 8+ | `npm install -g pnpm` |

### Uprawnienia

| Zasób | Wymagana rola |
|-------|---------------|
| Azure Subscription | Contributor (lub Owner do RBAC) |
| Azure AD / Entra ID | Application Administrator (do App Registration) |
| Power Platform | System Administrator (do importu solucji) |
| Dataverse | System Administrator (do tworzenia Application User) |

### Dane wejściowe

Przed rozpoczęciem wdrożenia przygotuj:

| Parametr | Opis | Przykład |
|----------|------|---------|
| `AZURE_SUBSCRIPTION_ID` | ID subskrypcji Azure | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `DATAVERSE_URL` | URL środowiska Dataverse | `https://contoso.crm4.dynamics.com` |
| `KSEF_ENVIRONMENT` | Środowisko KSeF | `test` / `demo` / `prod` |
| Tokeny KSeF | Tokeny autoryzacyjne per firma (NIP) | Wygenerowane w KSeF |

---

## Kroki wdrożenia

### Krok 1: Instalacja narzędzi i weryfikacja

Zainstaluj wymagane narzędzia i zweryfikuj dostępy.

```powershell
# Weryfikacja narzędzi
az --version
func --version
pwsh --version
pac --help
node --version
pnpm --version

# Logowanie Azure
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Logowanie Power Platform
pac auth create --environment "https://twoja-org.crm4.dynamics.com"
```

**Walidacja:** Wszystkie narzędzia zainstalowane, logowanie do Azure i Power Platform przebiegło pomyślnie.

---

### Krok 2: Konfiguracja Entra ID (App Registration)

Tworzy App Registration w Microsoft Entra ID z uprawnieniami do Dataverse API.

```powershell
cd deployment/scripts

# Wariant automatyczny (zalecany)
.\Setup-EntraId.ps1 -DataverseUrl "https://twoja-org.crm4.dynamics.com" -OutputEnvFile

# Wariant uproszczony
.\Configure-Azure.ps1 -ResourceGroupName "rg-ksef-prod"
```

**Co robi skrypt:**
1. Tworzy App Registration (`YOUR_APP_REGISTRATION`)
2. Generuje Client Secret (ważność 24 miesiące)
3. Dodaje uprawnienie Dataverse API (`user_impersonation`)
4. Nadaje Admin Consent
5. (Opcjonalnie) Zapisuje zmienne do `api/local.settings.json`

**Wynik — zapisz te wartości:**
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

**Instrukcja manualna:** Jeśli Admin Consent nie został nadany automatycznie:
1. Azure Portal → App registrations → `YOUR_APP_REGISTRATION`
2. API permissions → "Grant admin consent for {Tenant}"

---

### Krok 3: Infrastruktura Azure (Bicep)

Wdraża wszystkie zasoby Azure: Functions, Key Vault, Storage, App Insights, Static Web App.

```powershell
# Utwórz grupę zasobów
az group create --name "rg-ksef-prod" --location "polandcentral"

# Wdroż infrastrukturę
az deployment group create `
  --resource-group "rg-ksef-prod" `
  --template-file deployment/templates/main.bicep `
  --parameters deployment/templates/main.prod.bicepparam `
  --parameters dataverseUrl="https://twoja-org.crm4.dynamics.com"
```

**Alternatywnie — przez główny skrypt:**

```powershell
.\deployment\scripts\Install-KSeF.ps1 `
  -Environment "prod" `
  -DataverseUrl "https://twoja-org.crm4.dynamics.com" `
  -Location "polandcentral"
```

**Tworzone zasoby:**

| Zasób | Nazwa | Opis |
|-------|-------|------|
| Function App | `ksef-api-{env}-{suffix}` | API backend (Node.js 20, Flex/Consumption) |
| Key Vault | `kv-ksef-{env}` | Przechowywanie tokenów KSeF |
| Storage Account | `stksef{env}{suffix}` | Storage dla Functions |
| Application Insights | `ai-ksef-{env}` | Monitoring i logi |
| Log Analytics | `la-ksef-{env}` | Workspace logów |
| Static Web App | `swa-ksef-{env}` | Frontend webowy (Next.js) |

**Walidacja:**
```powershell
az resource list --resource-group "rg-ksef-prod" --output table
```

---

### Krok 4: Konfiguracja zmiennych środowiskowych (App Settings)

Skonfiguruj zmienne dla Azure Functions.

```powershell
az functionapp config appsettings set `
  --name "ksef-api-prod-XXXX" `
  --resource-group "rg-ksef-prod" `
  --settings `
    AZURE_TENANT_ID="<z kroku 2>" `
    AZURE_CLIENT_ID="<z kroku 2>" `
    AZURE_CLIENT_SECRET="<z kroku 2>" `
    DATAVERSE_URL="https://twoja-org.crm4.dynamics.com" `
    DATAVERSE_ENTITY_INVOICES="dvlp_ksefinvoices" `
    DATAVERSE_ENTITY_SETTINGS="dvlp_ksefsettings" `
    DATAVERSE_ENTITY_SESSIONS="dvlp_ksefsessions" `
    DATAVERSE_ENTITY_SYNC_LOGS="dvlp_ksefsynclogs" `
    KEY_VAULT_URL="https://kv-ksef-prod.vault.azure.net" `
    KSEF_ENVIRONMENT="prod" `
    OPENAI_API_KEY="<klucz OpenAI>" `
    OPENAI_MODEL="gpt-4o" `
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR="true"
```

**Pełna lista zmiennych:**

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `AZURE_TENANT_ID` | ID tenanta Entra ID | Tak |
| `AZURE_CLIENT_ID` | ID aplikacji (App Registration) | Tak |
| `AZURE_CLIENT_SECRET` | Secret aplikacji | Tak |
| `DATAVERSE_URL` | URL instancji Dataverse | Tak |
| `DATAVERSE_ENTITY_INVOICES` | Nazwa tabeli faktur | Tak |
| `DATAVERSE_ENTITY_SETTINGS` | Nazwa tabeli ustawień | Tak |
| `DATAVERSE_ENTITY_SESSIONS` | Nazwa tabeli sesji | Tak |
| `DATAVERSE_ENTITY_SYNC_LOGS` | Nazwa tabeli logów sync | Tak |
| `KEY_VAULT_URL` | URL Azure Key Vault | Tak |
| `KSEF_ENVIRONMENT` | Środowisko KSeF (`test`/`demo`/`prod`) | Tak |
| `OPENAI_API_KEY` | Klucz API OpenAI (do kategoryzacji AI) | Tak (dla AI) |
| `OPENAI_MODEL` | Model OpenAI (`gpt-4o`) | Nie (default: `gpt-4o`) |
| `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR` | Blokuj start przy błędach entry point | Tak |

---

### Krok 5: Wdrożenie Azure Functions (API)

Build i deploy backendu API na Azure Functions.

```powershell
cd api

# Instalacja zależności i build
pnpm install --frozen-lockfile
pnpm run build

# Deploy
func azure functionapp publish "ksef-api-prod-XXXX"
```

**Walidacja:**
```powershell
# Sprawdź listę funkcji
func azure functionapp list-functions "ksef-api-prod-XXXX"

# Test endpointu health
curl https://ksef-api-prod-XXXX.azurewebsites.net/api/health
```

**Rozwiązywanie problemów "No functions found":**
1. Sprawdź czy `node_modules` jest w deploymencie (patrz `.funcignore`)
2. Sprawdź logi: `az monitor app-insights query --analytics-query "traces | where message has 'entry point'"`
3. Typowy brak: `npm install cookie` jeśli moduł nie jest w `package.json`

---

### Krok 6: Wdrożenie Web App (Static Web App)

Build i deploy frontendu webowego (Next.js).

```powershell
cd web

# Build
pnpm install --frozen-lockfile
pnpm run build

# Pobierz token SWA
$swaToken = az staticwebapp secrets list `
  --name "swa-ksef-prod" `
  --resource-group "rg-ksef-prod" `
  --query "properties.apiKey" -o tsv

# Deploy
npx @azure/static-web-apps-cli deploy ./out `
  --deployment-token $swaToken `
  --env Production
```

**Alternatywnie (azd):**
```powershell
azd deploy web
```

**Walidacja:** Otwórz `https://swa-ksef-prod.azurestaticapps.net` w przeglądarce.

---

### Krok 7: Import solucji Power Platform

Import solucji z tabelami Dataverse, MDA App, Code App, Custom Connector i procesami Power Automate.

> **Wymagania:** Przed importem muszą być wdrożone Azure Functions (krok 5) — Custom Connector wymaga działającego API.

```powershell
# Zaloguj się do Power Platform
pac auth create --environment "https://twoja-org.crm4.dynamics.com"

# Import managed solution (produkcja)
pac solution import --path deployment/powerplatform/solution/DvlpKSeF_1_0_0_0_managed.zip

# Import unmanaged solution (development)
pac solution import --path deployment/powerplatform/solution/DvlpKSeF_1_0_0_0.zip
```

**Przez Maker Portal:**
1. [make.powerapps.com](https://make.powerapps.com) → wybierz środowisko
2. **Solutions** → **Import solution**
3. Wybierz plik `.zip` z `deployment/powerplatform/solution/`
4. Postępuj zgodnie z kreatorem
5. Skonfiguruj Connection References (krok 8)

**Co zawiera solucja:**
- Tabele Dataverse (faktury, ustawienia, sesje, logi sync)
- Model-Driven App (administracja)
- Code Component / Code App (dashboard React)
- Custom Connector (API KSeF)
- Przykładowe procesy Power Automate
- Role bezpieczeństwa (KSeF Admin, KSeF Reader)
- Option Sets (statusy, kierunki, środowiska)

Szczegóły → [`deployment/powerplatform/solution/README.md`](powerplatform/solution/README.md)

---

### Krok 8: Konfiguracja Connection References

Po imporcie solucji skonfiguruj połączenia między komponentami.

#### 8a. Custom Connector — OAuth 2.0

1. W Maker Portal: **Data** → **Custom connectors** → **KSeF Integration**
2. Edytuj ustawienia:

   | Pole | Wartość |
   |------|---------|
   | Host | `ksef-api-prod-XXXX.azurewebsites.net` |
   | Base URL | `/api` |
   | Authentication | OAuth 2.0 |
   | Identity Provider | Azure Active Directory |
   | Client ID | `<AZURE_CLIENT_ID z kroku 2>` |
   | Client Secret | `<AZURE_CLIENT_SECRET z kroku 2>` |
   | Tenant ID | `<AZURE_TENANT_ID z kroku 2>` |
   | Resource URL | `api://<AZURE_CLIENT_ID>` |
   | Scope | `api://<AZURE_CLIENT_ID>/.default` |

3. **Update connector** → **Test** → sprawdź akcję `HealthCheck`

#### 8b. Connection References w solucji

1. **Solutions** → **DvlpKSeF** → **Connection References**
2. Dla **KSeF API** → utwórz lub wybierz połączenie z Custom Connector
3. Dla **Dataverse** → wybierz domyślne połączenie

---

### Krok 9: Konfiguracja tokenów KSeF w Key Vault

Dodaj tokeny autoryzacyjne KSeF dla każdej firmy.

```powershell
# Dodaj token KSeF dla firmy o NIP 1234567890
az keyvault secret set `
  --vault-name "kv-ksef-prod" `
  --name "ksef-token-1234567890" `
  --value "<TOKEN_KSEF>"

# Weryfikacja
az keyvault secret show `
  --vault-name "kv-ksef-prod" `
  --name "ksef-token-1234567890" `
  --query "name"
```

**Konwencja nazw:**
- Secret name: `ksef-token-{NIP}` (np. `ksef-token-1234567890`)
- Wartość: token autoryzacyjny wygenerowany na stronie KSeF

**Skąd wziąć token KSeF:**
1. Zaloguj się na [ksef-test.mf.gov.pl](https://ksef-test.mf.gov.pl) (test) lub [ksef.mf.gov.pl](https://ksef.mf.gov.pl) (prod)
2. Wygeneruj token autoryzacyjny dla danego NIP
3. Skopiuj token i dodaj do Key Vault

---

### Krok 10: Konfiguracja ról i uprawnień

#### 10a. Entra ID — Role aplikacyjne (RBAC)

Przypisz użytkownikom role w App Registration:

```powershell
# Pobierz Object ID Service Principal
$spObjectId = az ad sp list --display-name "YOUR_APP_REGISTRATION" --query "[0].id" -o tsv

# Przypisz rolę Admin
az ad app role assignment create `
  --app-object-id $spObjectId `
  --role-id "<ADMIN_ROLE_ID>" `
  --user-id "<USER_OBJECT_ID>"
```

**Role:**

| Rola | Uprawnienia |
|------|-------------|
| **Admin** | Pełny CRUD, sync, kategoryzacja AI, zarządzanie konfiguracją |
| **Reader** | Odczyt faktur, dashboard, lookup VAT |

#### 10b. Dataverse — Application User

Utwórz Application User w Dataverse:

1. **Power Platform Admin Center** → Environments → wybierz środowisko
2. **Settings** → **Users + permissions** → **Application users**
3. **+ New app user** → wybierz `YOUR_APP_REGISTRATION`
4. Przypisz rolę: **KSeF Admin** (lub System Administrator do testów)

#### 10c. Dataverse — Security Roles

Przypisz użytkownikom końcowym role z solucji:

1. **Power Platform Admin Center** → Users
2. Dla administratorów: rola **KSeF Admin**
3. Dla użytkowników: rola **KSeF Reader**

---

### Krok 11: Weryfikacja i testy

#### Health Check

```powershell
# Test API
curl https://ksef-api-prod-XXXX.azurewebsites.net/api/health

# Oczekiwany wynik:
# { "status": "healthy", "services": [...] }
```

#### Test synchronizacji

```powershell
# Przez API (wymaga tokenu OAuth)
curl -X POST https://ksef-api-prod-XXXX.azurewebsites.net/api/sync `
  -H "Authorization: Bearer <TOKEN>" `
  -H "Content-Type: application/json" `
  -d '{"settingId": "<SETTING_UUID>"}'
```

#### Test Custom Connector

1. W Maker Portal: **Custom connectors** → **KSeF Integration** → **Test**
2. Przetestuj akcje: `HealthCheck`, `ListSettings`, `ListCompanies`

#### Test procesów Power Automate

1. Włącz wybrany proces
2. Uruchom ręcznie (Run flow)
3. Sprawdź historię uruchomień

#### Checklist walidacji

- [ ] Health endpoint zwraca `status: healthy`
- [ ] Wszystkie serwisy (Dataverse, Key Vault, KSeF) raportują `healthy`
- [ ] Custom Connector połączony i przetestowany
- [ ] MDA App wyświetla dane z Dataverse
- [ ] Code App / Dashboard ładuje się poprawnie
- [ ] Procesy Power Automate włączone i działają
- [ ] Role bezpieczeństwa działają (Admin vs Reader)

---

## Aktualizacja wdrożenia

### Aktualizacja Azure Functions

```powershell
cd api
pnpm install --frozen-lockfile
pnpm run build
func azure functionapp publish "ksef-api-prod-XXXX"
```

### Aktualizacja Web App

```powershell
cd web
pnpm install --frozen-lockfile
pnpm run build
# deploy jak w kroku 6
```

### Upgrade solucji Power Platform

```powershell
pac solution import --path DvlpKSeF_1_1_0_0_managed.zip --upgrade
```

> **Uwaga:** Po upgrade'ie solucji sprawdź Connection References i stan procesów Power Automate — mogą wymagać ponownej konfiguracji.

### Aktualizacja przez Azure Developer CLI (azd)

```powershell
azd up
```

---

## Rollback / Przywracanie

### Rollback Azure Functions

```powershell
# Przywrócenie poprzedniej wersji — redeploy z gita lub lokalnego builda
cd api
git checkout <PREVIOUS_COMMIT>
pnpm install --frozen-lockfile
pnpm run build
func azure functionapp publish "ksef-api-prod-XXXX"
```

### Rollback Web App (Static Web App)

```powershell
# Przywrócenie: ponowny deploy poprzedniej wersji
cd web
git checkout <PREVIOUS_COMMIT>
pnpm install --frozen-lockfile
pnpm run build
# deploy jak w kroku 6
```

### Rollback solucji Power Platform

```powershell
# Managed solution — usuwanie (powoduje usunięcie komponentów!)
pac solution delete --solution-name "DvlpKSeF"

# Następnie import poprzedniej wersji
pac solution import --path DvlpKSeF_PREVIOUS_VERSION_managed.zip
```

> **UWAGA:** Usunięcie managed solution powoduje usunięcie tabel i danych!
> Przed rollbackiem wykonaj backup danych z Dataverse.

### Rollback infrastruktury Azure

```powershell
# Usunięcie grupy zasobów (NIEODWRACALNE — usunie wszystkie zasoby)
az group delete --name "rg-ksef-prod" --yes

# Przywrócenie Key Vault (soft-delete)
az keyvault recover --name "kv-ksef-prod"
```

### Backup danych przed rollbackiem

```powershell
# Opcja 1: Power Platform Admin Center → Environments → Backup
# Opcja 2: Export danych przez API
curl https://ksef-api-prod-XXXX.azurewebsites.net/api/invoices?pageSize=5000 `
  -H "Authorization: Bearer <TOKEN>" > backup-invoices.json
```

---

## Rozwiązywanie problemów

### Azure Functions

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| "No functions found" po deploy | Brak `node_modules` lub błąd entry point | Sprawdź `.funcignore`, dodaj `npm install cookie` |
| 401 Unauthorized | Brak/niepoprawny token OAuth | Sprawdź App Registration, Client Secret |
| 403 Forbidden | Brak roli (Admin/Reader) | Przypisz rolę w Entra ID |
| 500 Internal Server Error | Błąd konfiguracji | Sprawdź App Settings, logi App Insights |
| Timeout | Zbyt długie połączenie z Dataverse/KSeF | Sprawdź logi, zwiększ timeout |

### Power Platform

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Import solucji nie powiódł się | Brakujące zależności | Sprawdź wymagane komponenty |
| Connection Reference błąd | Brak autoryzacji OAuth | Skonfiguruj Custom Connector (krok 8) |
| MDA App nie wyświetla danych | Brak Security Role | Przypisz rolę KSeF Admin/Reader |
| Code App nie ładuje się | Brak bundla PCF | Sprawdź czy PCF jest w solucji |
| Flow nie uruchamia się | Wyłączony po imporcie | Włącz i skonfiguruj Connection References |

### Diagnostyka

```powershell
# Logi Azure Functions (stream)
func azure functionapp logstream "ksef-api-prod-XXXX"

# Logi Application Insights (query)
az monitor app-insights query `
  --app "ai-ksef-prod" `
  --resource-group "rg-ksef-prod" `
  --analytics-query "traces | order by timestamp desc | take 50"

# Stan zasobów Azure
az resource list --resource-group "rg-ksef-prod" --output table
```

---

## Bezpieczeństwo

- **Tokeny KSeF** — przechowywane w Azure Key Vault, nigdy w kodzie
- **Client Secret** — rotowany co 24 miesiące (skrypt `Setup-EntraId.ps1`)
- **Dostęp do API** — chroniony OAuth 2.0 (Entra ID)
- **Role RBAC** — granularne uprawnienia: Admin (CRUD + sync) / Reader (odczyt)
- **Dataverse** — Security Roles na poziomie tabel
- **CORS** — ograniczony do domeny Static Web App
- **HTTPS** — wymuszone na wszystkich endpointach
- **Key Vault** — soft-delete + purge protection włączone
- **Managed Identity** — Functions korzysta z System Assigned MI dla Key Vault

---

## Pliki konfiguracyjne

| Plik | Ścieżka | Opis |
|------|---------|------|
| Bicep template | `deployment/templates/main.bicep` | Infrastruktura Azure |
| Bicep params (dev) | `deployment/templates/main.bicepparam` | Parametry dev |
| Bicep params (test) | `deployment/templates/main.test.bicepparam` | Parametry test |
| Bicep params (prod) | `deployment/templates/main.prod.bicepparam` | Parametry prod |
| Azure Developer CLI | `azure.yaml` | Konfiguracja azd |
| Connector definition | `deployment/powerplatform/connector/apiDefinition.swagger.json` | OpenAPI Custom Connector |
| API swagger | `docs/swagger.yaml` | Pełna specyfikacja API |
