# Konfiguracja Entra ID (Azure AD) dla integracji KSeF

> **⚠️ Ten dokument został zastąpiony przez [ENTRA_ID_KONFIGURACJA.md](./ENTRA_ID_KONFIGURACJA.md)**  
> Nowy dokument zawiera scalone i zaktualizowane treści z tego pliku oraz z `AUTH_GROUPS_SETUP.md`.  
> Ten plik zachowano jako archiwum.

Instrukcja konfiguracji App Registration w Microsoft Entra ID do autentykacji API z Dataverse.

## Spis treści

1. [Przegląd](#przegląd)
2. [Wymagania wstępne](#wymagania-wstępne)
3. [Konfiguracja manualna](#konfiguracja-manualna)
   - Krok 1-6: App Registration i Dataverse
   - Krok 7-9: Grupy bezpieczeństwa dla Web App
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

### Krok 4: Dodaj uprawnienia API

#### 4.1 Uprawnienia Dataverse (dla Azure Functions API)

1. W App Registration przejdź do **"API permissions"**
2. Kliknij **"+ Add a permission"**
3. Wybierz zakładkę **"APIs my organization uses"**
4. Wyszukaj i wybierz **"Dataverse"** (lub "Common Data Service")
5. Wybierz **"Application permissions"** (dla client credentials flow)
6. Zaznacz: `user_impersonation`
7. Kliknij **"Add permissions"**

#### 4.2 Uprawnienia Microsoft Graph (dla Web App)

1. Kliknij **"+ Add a permission"**
2. Wybierz **"Microsoft Graph"**
3. Wybierz **"Delegated permissions"** (dla user context)
4. Dodaj następujące uprawnienia:

| Uprawnienie | Opis | Wymagane |
|-------------|------|----------|
| `openid` | Logowanie OpenID Connect | ✅ Tak |
| `profile` | Podstawowe dane profilu | ✅ Tak |
| `email` | Adres email użytkownika | ✅ Tak |
| `User.Read` | Odczyt profilu zalogowanego użytkownika | ✅ Tak |
| `User.ReadBasic.All` | Odczyt podstawowych profili innych użytkowników (avatary) | ⚡ Opcjonalnie |
| `GroupMember.Read.All` | Odczyt członkostwa w grupach (fallback dla >200 grup) | ⚡ Opcjonalnie |

5. Kliknij **"Add permissions"**

#### 4.3 Udziel Admin Consent

1. Kliknij **"Grant admin consent for [Organization]"**
2. Potwierdź w oknie dialogowym
3. Wszystkie uprawnienia powinny mieć zielony znacznik ✅

> ⚠️ **Uwaga:** `GroupMember.Read.All` wymaga Admin Consent i jest potrzebne tylko gdy użytkownicy mają >200 grup (groups overage scenario).

### Krok 5: Utwórz dedykowaną rolę zabezpieczeń w Dataverse

Przed utworzeniem Application User, należy przygotować dedykowaną rolę z pełnymi uprawnieniami do tabel KSeF.

#### 5.1 Przejdź do ustawień zabezpieczeń

1. Otwórz [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Wybierz odpowiednie **środowisko** (Environment)
3. Kliknij **Settings** → **Users + permissions** → **Security roles**

#### 5.2 Utwórz nową rolę

1. Kliknij **"+ New role"**
2. Wypełnij:
   - **Role Name:** `DVLP-KSeF Application`
   - **Business Unit:** pozostaw domyślną (root)
   - **Description:** `Rola dla aplikacji KSeF API - pełny dostęp do tabel dvlp_ksef*`
3. Kliknij **"Save"**

#### 5.3 Skonfiguruj uprawnienia do tabel KSeF

Po zapisaniu roli, przejdź do zakładki **"Custom Entities"** (lub "Custom Tables") i znajdź tabele KSeF:

| Tabela | Create | Read | Write | Delete | Append | Append To |
|--------|--------|------|-------|--------|--------|-----------|
| `dvlp_ksefinvoice` (Faktura KSeF) | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization |
| `dvlp_ksefsetting` (Ustawienia KSeF) | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization |
| `dvlp_ksefsession` (Sesja KSeF) | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization |
| `dvlp_ksefsynclog` (Log synchronizacji) | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization | ✅ Organization |

**Dla każdej tabeli:**

1. Znajdź tabelę na liście (mogą być w sekcji "Custom Entities" lub pod nazwą wyświetlaną)
2. Kliknij na każdą ikonę uprawnienia, aż będzie pokazywać **pełne koło** (Organization level)
3. Upewnij się, że wszystkie 6 uprawnień są ustawione na **Organization**:
   - **Create** - tworzenie rekordów
   - **Read** - odczyt rekordów
   - **Write** - modyfikacja rekordów
   - **Delete** - usuwanie rekordów
   - **Append** - dołączanie do innych rekordów
   - **Append To** - pozwalanie innym rekordom na dołączanie

#### 5.4 Dodaj uprawnienia podstawowe

W zakładce **"Core Records"** ustaw minimalne uprawnienia potrzebne do działania API:

| Encja | Read | Opis |
|-------|------|------|
| User | ✅ Organization | Potrzebne do WhoAmI |
| Business Unit | ✅ Organization | Kontekst organizacji |

#### 5.5 Zapisz rolę

1. Kliknij **"Save and Close"**
2. Rola `DVLP-KSeF Application` jest gotowa do przypisania

#### Wskazówki

- **Organization level** oznacza dostęp do wszystkich rekordów w organizacji
- Jeśli tabele KSeF nie są widoczne, upewnij się że solution został opublikowany
- Możesz później zawęzić uprawnienia do **Business Unit** jeśli potrzebujesz izolacji danych

### Krok 6: Utwórz Application User w Dataverse

1. Przejdź do [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Wybierz odpowiednie środowisko → **Settings** → **Users + permissions** → **Application users**
3. Kliknij **"+ New app user"**
4. Wybierz utworzoną App Registration (`YOUR_APP_REGISTRATION`)
5. Wybierz **Business Unit** (zwykle root)
6. Przypisz rolę zabezpieczeń:
   - **DVLP-KSeF Application** (utworzona w kroku 5)
7. Kliknij **"Create"**

### Krok 7: Utwórz grupy bezpieczeństwa dla Web App

Grupy bezpieczeństwa kontrolują dostęp użytkowników do aplikacji webowej KSeF.

#### 7.1 Utwórz grupę Administratorów

1. Przejdź do [Entra ID Portal](https://entra.microsoft.com)
2. Wybierz **Groups** → **All groups**
3. Kliknij **"+ New group"**
4. Wypełnij formularz:

| Pole | Wartość |
|------|---------|
| Group type | **Security** |
| Group name | `DVLP-KSeF-Administrators` |
| Group description | `Administratorzy integracji KSeF - pełny dostęp` |
| Microsoft Entra roles can be assigned | **No** |
| Membership type | **Assigned** |

5. Kliknij **"Create"**
6. Po utworzeniu, kliknij **"Members"** → **"+ Add members"**
7. Dodaj użytkowników-administratorów

#### 7.2 Utwórz grupę Użytkowników

1. Powtórz kroki 1-5 z następującymi danymi:

| Pole | Wartość |
|------|---------|
| Group type | **Security** |
| Group name | `DVLP-KSeF-Users` |
| Group description | `Użytkownicy integracji KSeF - dostęp tylko do odczytu` |
| Microsoft Entra roles can be assigned | **No** |
| Membership type | **Assigned** |

2. Dodaj użytkowników z dostępem tylko do odczytu

#### 7.3 Skopiuj Object ID grup

Po utworzeniu grup, skopiuj ich **Object ID**:

1. Kliknij na utworzoną grupę
2. W zakładce **Overview** znajdź **Object ID** (GUID)
3. Skopiuj wartość

**Zanotuj identyfikatory:**

| Grupa | Object ID |
|-------|-----------|
| `DVLP-KSeF-Administrators` | `________________________________` |
| `DVLP-KSeF-Users` | `________________________________` |

### Krok 8: Włącz groups claim w tokenie

Aby aplikacja webowa mogła odczytać przynależność użytkownika do grup, musisz włączyć groups claim.

#### 8.1 Przejdź do Token configuration

1. W [Azure Portal](https://portal.azure.com) przejdź do **App registrations**
2. Wybierz aplikację dla Web App (np. `YOUR_WEB_APP` lub użyj tej samej `YOUR_APP_REGISTRATION`)
3. Przejdź do **Token configuration**

#### 8.2 Dodaj groups claim

1. Kliknij **"+ Add groups claim"**
2. W oknie dialogowym wybierz:

| Opcja | Wartość |
|-------|---------|
| Security groups | ✅ Zaznacz |
| Directory roles | ❌ Odznacz |
| Groups assigned to the application | ❌ Odznacz (opcjonalnie) |

3. W sekcji **Customize token properties by type**:

**Dla ID tokens:**
- ✅ **Group ID** (rekomendowane - zwraca Object ID grupy)

4. Kliknij **"Add"**

#### 8.3 Weryfikacja konfiguracji

Po zapisaniu, w sekcji **Token configuration** powinieneś zobaczyć:

```
Groups claim
├── ID token: groups (Group ID)
└── Access token: groups (Group ID)
```

> ⚠️ **Uwaga:** Jeśli użytkownik należy do >200 grup, Azure nie zwróci ich w tokenie.
> W takim przypadku token zawiera `_claim_sources` i wymaga dodatkowego wywołania Graph API.

### Krok 9: Zapisz Object ID grup w zmiennych środowiskowych

Dodaj Object ID grup do plików konfiguracyjnych:

#### 9.1 Plik `.env.local` (root projektu)

```bash
# Security Groups (Entra ID) - Authorization
NEXT_PUBLIC_ADMIN_GROUP=<object-id-grupy-DVLP-KSeF-Administrators>
NEXT_PUBLIC_USER_GROUP=<object-id-grupy-DVLP-KSeF-Users>
```

#### 9.2 Plik `web/.env.local`

```bash
# Security Groups (Entra ID) - Authorization
NEXT_PUBLIC_ADMIN_GROUP=<object-id-grupy-DVLP-KSeF-Administrators>
NEXT_PUBLIC_USER_GROUP=<object-id-grupy-DVLP-KSeF-Users>
```

#### 9.3 Weryfikacja

Po uzupełnieniu zmiennych, zrestartuj aplikację i sprawdź czy grupy są odczytywane z tokenu.

### Hierarchia ról

| Rola | Grupa | Uprawnienia |
|------|-------|-------------|
| **Admin** | `DVLP-KSeF-Administrators` | Pełny dostęp: synchronizacja, ustawienia, usuwanie |
| **User** | `DVLP-KSeF-Users` | Tylko odczyt: przeglądanie faktur, raporty, eksport |
| **Brak** | - | Odmowa dostępu do aplikacji |

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
