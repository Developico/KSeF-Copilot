# Wdrożenie KSeF Integration

Ten folder zawiera wszystkie zasoby potrzebne do wdrożenia rozwiązania KSeF Integration.

## Struktura

```
deployment/
├── dataverse/           # Dataverse Solution
│   ├── solution/        # Pliki rozwiązania
│   └── data/            # Dane referencyjne (opcjonalne)
├── scripts/             # Skrypty PowerShell
│   ├── Install-KSeF.ps1
│   ├── Configure-Azure.ps1
│   └── helpers/
├── templates/           # Szablony Azure (Bicep/ARM)
│   ├── main.bicep
│   └── modules/
└── docs/                # Dokumentacja wdrożeniowa
```

## Szybki start

### Wymagania wstępne

1. **Azure CLI** - [Instalacja](https://docs.microsoft.com/cli/azure/install-azure-cli)
2. **Azure Functions Core Tools v4** - [Instalacja](https://docs.microsoft.com/azure/azure-functions/functions-run-local)
3. **PowerShell 7+** - [Instalacja](https://docs.microsoft.com/powershell/scripting/install/installing-powershell)
4. **Power Platform CLI** - [Instalacja](https://docs.microsoft.com/power-platform/developer/cli/introduction)

### Kroki wdrożenia

#### 1. Przygotowanie środowiska Azure

```powershell
# Zaloguj się do Azure
az login

# Ustaw subskrypcję
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Uruchom skrypt konfiguracji
.\scripts\Configure-Azure.ps1 -ResourceGroupName "rg-ksef-prod" -Location "westeurope"
```

#### 2. Import rozwiązania Dataverse

```powershell
# Zaloguj się do Power Platform
pac auth create --environment "https://yourorg.crm4.dynamics.com"

# Importuj rozwiązanie
pac solution import --path ./dataverse/solution/KSeF_1_0_0_0_managed.zip
```

#### 3. Wdrożenie Azure Functions

```powershell
# Kompletne wdrożenie
.\scripts\Install-KSeF.ps1 -Environment "prod" -DataverseUrl "https://yourorg.crm4.dynamics.com"
```

## Konfiguracja

### Zmienne środowiskowe

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `DATAVERSE_URL` | URL instancji Dataverse | Tak |
| `AZURE_TENANT_ID` | ID tenanta Azure AD | Tak |
| `AZURE_CLIENT_ID` | ID aplikacji (App Registration) | Tak |
| `AZURE_CLIENT_SECRET` | Secret aplikacji | Tak |
| `KEY_VAULT_URL` | URL Azure Key Vault | Tak |
| `KSEF_ENVIRONMENT` | Środowisko KSeF: `test` / `demo` / `prod` | Tak |

### Azure Key Vault Secrets

Tokeny KSeF przechowujemy bezpiecznie w Azure Key Vault:

| Secret Name | Opis |
|-------------|------|
| `ksef-token-{NIP}` | Token autoryzacyjny dla firmy o danym NIP |

## Aktualizacja

```powershell
# Aktualizacja Azure Functions
.\scripts\Install-KSeF.ps1 -Environment "prod" -UpdateOnly

# Aktualizacja rozwiązania Dataverse
pac solution import --path ./dataverse/solution/KSeF_1_1_0_0_managed.zip --upgrade
```

## Wdrożenie ręczne Azure Functions (Flex Consumption)

Projekt korzysta z Azure Functions Flex Consumption plan dla optymalnej skalowalności.

### Wymagania przed deploymentem

1. **Zbuduj projekt:**
   ```bash
   cd api
   npm install
   npm run build
   ```

2. **Upewnij się że zależność `cookie` jest zainstalowana:**
   ```bash
   npm install cookie
   ```

3. **Ustaw wymaganą zmienną środowiskową w Azure:**
   ```bash
   az functionapp config appsettings set \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --settings "FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true"
   ```

### Deploy przez Azure Functions Core Tools

```bash
cd api
func azure functionapp publish <FUNCTION_APP_NAME>
```

Pomyślny deploy powinien wyświetlić listę wszystkich zarejestrowanych funkcji.

### Weryfikacja

```bash
# Sprawdź listę funkcji
func azure functionapp list-functions <FUNCTION_APP_NAME>

# Test endpointu health
curl https://<FUNCTION_APP_URL>/api/health
```

### Rozwiązywanie problemów "No functions found"

Jeśli po deployu nie ma zarejestrowanych funkcji:

1. **Sprawdź logi Application Insights:**
   ```bash
   az monitor app-insights query --app <APP_INSIGHTS_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --analytics-query "traces | where message has 'entry point' | take 10"
   ```

2. **Typowe błędy:**
   - `Cannot find module 'cookie'` - brakuje zależności, uruchom `npm install cookie`
   - `Cannot find module '@azure/functions'` - brakuje node_modules, uruchom `npm install`

3. **Plik `.funcignore`:**
   Upewnij się że NIE ignorujesz `node_modules` jeśli nie używasz remote build:
   ```
   # .funcignore
   *.js.map
   *.ts
   .git*
   .vscode
   local.settings.json
   src
   test
   tests
   ```

## Rozwiązywanie problemów

### Logi

```powershell
# Podgląd logów Azure Functions
func azure functionapp logstream ksef-api-prod
```

### Diagnostyka Dataverse

1. Otwórz Power Platform Admin Center
2. Przejdź do Analytics → Dataverse
3. Sprawdź logi API

## Bezpieczeństwo

- Tokeny KSeF są przechowywane w Azure Key Vault
- Dostęp do API chroniony przez Entra ID
- Role RBAC: Admin (pełny dostęp) / Reader (tylko odczyt)
