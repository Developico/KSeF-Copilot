# Konfiguracja Entra ID (Azure AD) dla integracji KSeF

Instrukcja konfiguracji App Registration w Microsoft Entra ID do autentykacji API z Dataverse.

## Spis treści

1. [Przegląd](#przegląd)
2. [Wymagania wstępne](#wymagania-wstępne)
3. [Konfiguracja manualna](#konfiguracja-manualna)
4. [Konfiguracja automatyczna (skrypt)](#konfiguracja-automatyczna)
5. [Konfiguracja uprawnień Dataverse](#konfiguracja-uprawnień-dataverse)
6. [Zmienne środowiskowe](#zmienne-środowiskowe)
7. [Testowanie połączenia](#testowanie-połączenia)
8. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Przegląd

### Architektura autentykacji

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Azure        │     │   Microsoft     │     │    Dataverse    │
│   Functions    │────▶│   Entra ID      │────▶│    (CRM)        │
│   (API)        │     │   (OAuth 2.0)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │  Client Credentials   │  Access Token
        │  (client_id +         │  (scope: Dataverse)
        │   client_secret)      │
        ▼                       ▼
```

### Flow autentykacji

1. **Azure Functions API** żąda tokenu od Entra ID
2. **Entra ID** weryfikuje credentials i zwraca Access Token
3. **API** używa tokenu do wywołań Dataverse Web API
4. **Dataverse** weryfikuje token i autoryzuje operacje

---

## Wymagania wstępne

### Uprawnienia użytkownika

- **Global Administrator** lub **Application Administrator** w Entra ID
- **System Administrator** w Dataverse (do nadania uprawnień)

### Narzędzia

- Azure CLI (`az`) lub Azure PowerShell (`Az`)
- Dostęp do [Azure Portal](https://portal.azure.com)
- Dostęp do [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)

### Informacje do zebrania

| Wartość | Opis | Gdzie znaleźć |
|---------|------|---------------|
| Tenant ID | ID organizacji Azure | Azure Portal → Entra ID → Overview |
| Dataverse URL | URL środowiska | Power Platform Admin Center → Environments |
| Subscription ID | ID subskrypcji Azure | Azure Portal → Subscriptions |

---

## Konfiguracja manualna

### Krok 1: Utworzenie App Registration

1. Przejdź do [Azure Portal](https://portal.azure.com)
2. Wyszukaj **"App registrations"** lub **"Entra ID"**
3. Kliknij **"+ New registration"**
4. Wypełnij formularz:
   - **Name:** `YOUR_APP_REGISTRATION`
   - **Supported account types:** `Accounts in this organizational directory only`
   - **Redirect URI:** zostaw puste (używamy client credentials)
5. Kliknij **"Register"**

### Krok 2: Zapisz identyfikatory

Po utworzeniu, zapisz:

- **Application (client) ID** - będzie `AZURE_CLIENT_ID`
- **Directory (tenant) ID** - będzie `AZURE_TENANT_ID`

### Krok 3: Utwórz Client Secret

1. W App Registration przejdź do **"Certificates & secrets"**
2. Kliknij **"+ New client secret"**
3. Wypełnij:
   - **Description:** `ksef-api-secret`
   - **Expires:** `24 months` (lub zgodnie z polityką organizacji)
4. Kliknij **"Add"**
5. **NATYCHMIAST skopiuj wartość secret** - nie będzie widoczna później!
   - To będzie `AZURE_CLIENT_SECRET`

### Krok 4: Dodaj uprawnienia Dataverse API

1. W App Registration przejdź do **"API permissions"**
2. Kliknij **"+ Add a permission"**
3. Wybierz zakładkę **"APIs my organization uses"**
4. Wyszukaj i wybierz **"Dataverse"** (lub "Common Data Service")
5. Wybierz **"Delegated permissions"** lub **"Application permissions"**:
   - Dla client credentials wybierz **Application permissions**
   - Zaznacz: `user_impersonation`
6. Kliknij **"Add permissions"**
7. Kliknij **"Grant admin consent for [Organization]"**

### Krok 5: Utwórz Application User w Dataverse

1. Przejdź do [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Wybierz odpowiednie środowisko → **Settings** → **Users + permissions** → **Application users**
3. Kliknij **"+ New app user"**
4. Wybierz utworzoną App Registration (`YOUR_APP_REGISTRATION`)
5. Wybierz **Business Unit** (zwykle root)
6. Przypisz role bezpieczeństwa:
   - **KSeF Admin** (jeśli utworzona wcześniej)
   - lub **System Administrator** (do testów)
7. Kliknij **"Create"**

---

## Konfiguracja automatyczna

### Użycie skryptu PowerShell

```powershell
# Z katalogu głównego projektu:
.\deployment\scripts\Setup-EntraId.ps1 -DataverseUrl "https://[org].crm4.dynamics.com"
```

### Parametry skryptu

| Parametr | Wymagany | Domyślnie | Opis |
|----------|----------|-----------|------|
| `-AppName` | ❌ | `YOUR_APP_REGISTRATION` | Nazwa App Registration |
| `-DataverseUrl` | ✅ | - | URL środowiska Dataverse |
| `-SecretValidityMonths` | ❌ | `24` | Ważność client secret |
| `-OutputEnvFile` | ❌ | `false` | Czy zapisać do `.env` |
| `-AssignDataverseRole` | ❌ | `false` | Czy przypisać rolę w Dataverse |

### Przykłady użycia

```powershell
# Podstawowe użycie
.\deployment\scripts\Setup-EntraId.ps1 -DataverseUrl "https://org123.crm4.dynamics.com"

# Z zapisaniem do .env
.\deployment\scripts\Setup-EntraId.ps1 `
  -DataverseUrl "https://org123.crm4.dynamics.com" `
  -OutputEnvFile

# Pełna konfiguracja
.\deployment\scripts\Setup-EntraId.ps1 `
  -AppName "my-ksef-api" `
  -DataverseUrl "https://org123.crm4.dynamics.com" `
  -SecretValidityMonths 12 `
  -OutputEnvFile `
  -AssignDataverseRole
```

---

## Konfiguracja uprawnień Dataverse

### Opcja A: Użycie wbudowanej roli

Jeśli nie utworzyłeś custom ról, możesz użyć:

- **System Administrator** - pełny dostęp (tylko do testów!)
- **Service Writer** - dostęp do zapisu

### Opcja B: Użycie custom roli KSeF

Zgodnie z [DATAVERSE_SCHEMA.md](DATAVERSE_SCHEMA.md), utworzyłeś role:

| Rola | Opis |
|------|------|
| KSeF Admin | Pełny dostęp do tabel KSeF |
| KSeF Operator | Synchronizacja i zarządzanie fakturami |
| KSeF Reader | Tylko odczyt |

**Zalecenie:** Dla API produkcyjnego użyj **KSeF Operator**.

### Przypisanie roli manualnie

1. Power Platform Admin Center → Environment → Settings
2. Users + permissions → Application users
3. Znajdź `YOUR_APP_REGISTRATION`
4. Kliknij → Manage Roles
5. Zaznacz odpowiednią rolę
6. Save

---

## Zmienne środowiskowe

### Dla Azure Functions (`api/local.settings.json`)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    "AZURE_TENANT_ID": "<tenant-id>",
    "AZURE_CLIENT_ID": "<client-id>",
    "AZURE_CLIENT_SECRET": "<client-secret>",
    
    "DATAVERSE_URL": "https://[org].crm4.dynamics.com",
    "DATAVERSE_ENTITY_INVOICES": "dvlp_ksefinvoices",
    "DATAVERSE_ENTITY_SETTINGS": "dvlp_ksefsettings"
  }
}
```

### Dla Next.js (`web/.env.local`)

```env
# API URL (Azure Functions)
NEXT_PUBLIC_API_URL=http://localhost:7071/api

# MSAL Configuration (dla autentykacji użytkowników)
NEXT_PUBLIC_AZURE_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<tenant-id>
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000
```

### Dla produkcji (Azure App Configuration / Key Vault)

```bash
# Azure CLI - ustawienie secrets
az functionapp config appsettings set \
  --name YOUR_APP_REGISTRATION \
  --resource-group YOUR_RESOURCE_GROUP \
  --settings \
    AZURE_TENANT_ID="@Microsoft.KeyVault(VaultName=YOUR_KEYVAULT;SecretName=azure-tenant-id)" \
    AZURE_CLIENT_ID="@Microsoft.KeyVault(VaultName=YOUR_KEYVAULT;SecretName=azure-client-id)" \
    AZURE_CLIENT_SECRET="@Microsoft.KeyVault(VaultName=YOUR_KEYVAULT;SecretName=azure-client-secret)"
```

---

## Testowanie połączenia

### Test 1: Weryfikacja tokenu

```powershell
# Pobierz token
$tenantId = "<tenant-id>"
$clientId = "<client-id>"
$clientSecret = "<client-secret>"
$dataverseUrl = "https://[org].crm4.dynamics.com"

$body = @{
    grant_type    = "client_credentials"
    client_id     = $clientId
    client_secret = $clientSecret
    scope         = "$dataverseUrl/.default"
}

$response = Invoke-RestMethod `
    -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" `
    -Method POST `
    -Body $body

Write-Host "Token otrzymany: $($response.access_token.Substring(0, 50))..."
```

### Test 2: Wywołanie Dataverse API

```powershell
# Użyj tokenu do pobrania danych
$headers = @{
    Authorization = "Bearer $($response.access_token)"
    "OData-MaxVersion" = "4.0"
    "OData-Version" = "4.0"
}

$result = Invoke-RestMethod `
    -Uri "$dataverseUrl/api/data/v9.2/dvlp_ksefinvoices?`$top=1" `
    -Headers $headers

Write-Host "Połączenie OK! Znaleziono $($result.value.Count) rekordów."
```

### Test 3: Test z API (Node.js)

```bash
cd api
npm run build
npm run start

# W innym terminalu:
curl http://localhost:7071/api/health
curl http://localhost:7071/api/invoices
```

---

## Rozwiązywanie problemów

### Błąd: "AADSTS700016: Application not found"

**Przyczyna:** Nieprawidłowy Client ID lub aplikacja nie istnieje.

**Rozwiązanie:**
1. Sprawdź czy `AZURE_CLIENT_ID` jest poprawny
2. Upewnij się, że App Registration istnieje w tym samym tenant

### Błąd: "AADSTS7000215: Invalid client secret"

**Przyczyna:** Client secret wygasł lub jest nieprawidłowy.

**Rozwiązanie:**
1. Utwórz nowy client secret w App Registration
2. Zaktualizuj `AZURE_CLIENT_SECRET`

### Błąd: "403 Forbidden" przy wywołaniu Dataverse

**Przyczyna:** Brak uprawnień Application User w Dataverse.

**Rozwiązanie:**
1. Sprawdź czy Application User istnieje w Dataverse
2. Sprawdź przypisane role bezpieczeństwa
3. Upewnij się, że admin consent został nadany

### Błąd: "The user is not a member of the organization"

**Przyczyna:** Application User nie został utworzony w odpowiednim środowisku.

**Rozwiązanie:**
1. Sprawdź czy używasz właściwego środowiska Dataverse
2. Utwórz Application User w Power Platform Admin Center

### Błąd: "Insufficient privileges"

**Przyczyna:** Rola nie ma uprawnień do tabel KSeF.

**Rozwiązanie:**
1. Sprawdź uprawnienia roli w Dataverse
2. Przypisz rolę z wystarczającymi uprawnieniami (np. KSeF Admin)

---

## Checklist

- [ ] App Registration utworzona w Entra ID
- [ ] Client ID zapisany
- [ ] Tenant ID zapisany  
- [ ] Client Secret utworzony i zapisany
- [ ] Uprawnienia Dataverse dodane
- [ ] Admin consent nadany
- [ ] Application User utworzony w Dataverse
- [ ] Rola bezpieczeństwa przypisana
- [ ] Zmienne środowiskowe skonfigurowane
- [ ] Test połączenia przeszedł pomyślnie

---

## Powiązane dokumenty

- [DATAVERSE_SCHEMA.md](DATAVERSE_SCHEMA.md) - Schema bazy danych
- [deployment/scripts/Setup-EntraId.ps1](../deployment/scripts/Setup-EntraId.ps1) - Skrypt automatyzujący
- [api/local.settings.example.json](../api/local.settings.example.json) - Przykładowa konfiguracja
