# Konfiguracja Entra ID — Autentykacja i autoryzacja

Kompletna instrukcja konfiguracji Microsoft Entra ID (Azure AD) dla projektu KSeF — obejmuje App Registration, grupy bezpieczeństwa, RBAC i integrację z MSAL.

## Spis treści

1. [Przegląd architektury](#przegląd-architektury)
2. [Wymagania wstępne](#wymagania-wstępne)
3. [App Registration — konfiguracja](#app-registration--konfiguracja)
   - [Krok 1: Utworzenie App Registration](#krok-1-utworzenie-app-registration)
   - [Krok 2: Client Secret](#krok-2-client-secret)
   - [Krok 3: Uprawnienia API](#krok-3-uprawnienia-api)
4. [Grupy bezpieczeństwa](#grupy-bezpieczeństwa)
   - [Krok 4: Tworzenie grup w Entra ID](#krok-4-tworzenie-grup-w-entra-id)
   - [Krok 5: Konfiguracja groups claim w tokenie](#krok-5-konfiguracja-groups-claim-w-tokenie)
5. [Konfiguracja Dataverse](#konfiguracja-dataverse)
   - [Krok 6: Rola zabezpieczeń](#krok-6-rola-zabezpieczeń)
   - [Krok 7: Application User](#krok-7-application-user)
6. [Zmienne środowiskowe](#zmienne-środowiskowe)
7. [Konfiguracja automatyczna (skrypt)](#konfiguracja-automatyczna)
8. [Testowanie](#testowanie)
9. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Przegląd architektury

### MSAL vs NextAuth.js

Projekt KSeF używa **MSAL (Microsoft Authentication Library)** zamiast NextAuth.js:

| Aspekt | MSAL (KSeF) | NextAuth.js |
|--------|-------------|-------------|
| Architektura | Client-side (SPA) | Server-side (SSR) |
| Token storage | sessionStorage/memory | JWT cookie |
| Cookie size | Brak problemu | Wymaga volatile-store |
| Grupy/role | ID token claims | ID token claims + Graph API fallback |
| Refresh token | Automatyczny silent refresh | Ręczna obsługa |

### Flow autentykacji

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Przeglądarka  │     │   Entra ID      │     │   Azure         │
│   (Next.js)     │────▶│   (MSAL)        │────▶│   Functions     │
│                 │     │                 │     │   (API)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  1. Login redirect    │                       │
        │  2. Groups w ID token │                       │
        ▼                       ▼                       ▼
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │ roles[] │           │ Access  │           │ Verify  │
   │ claim   │           │ Token   │           │ JWT     │
   └─────────┘           └─────────┘           └─────────┘
```

**Dwa konteksty autentykacji**:

| Kontekst | Mechanizm | Cel |
|----------|-----------|-----|
| **API → Dataverse** | Client Credentials (client_id + client_secret) | Serwisowy dostęp do danych |
| **Web → API** | Bearer token (MSAL, kontekst użytkownika) | Wywołania API z RBAC |

---

## Wymagania wstępne

### Uprawnienia użytkownika
- **Global Administrator** lub **Application Administrator** w Entra ID
- **System Administrator** w Dataverse (do nadania uprawnień)

### Informacje do zebrania

| Wartość | Opis | Gdzie znaleźć |
|---------|------|---------------|
| Tenant ID | ID organizacji Azure | Azure Portal → Entra ID → Overview |
| Dataverse URL | URL środowiska | Power Platform Admin Center → Environments |

---

## App Registration — konfiguracja

### Krok 1: Utworzenie App Registration

1. Przejdź do [Azure Portal](https://portal.azure.com) → **App registrations**
2. Kliknij **"+ New registration"**
3. Wypełnij:
   - **Name:** `your-webapp-name`
   - **Supported account types:** `Accounts in this organizational directory only`
   - **Redirect URI:** `http://localhost:3000` (Single-page application)
4. Kliknij **"Register"**

**Zapisz**:
- **Application (client) ID** → `AZURE_CLIENT_ID` / `NEXT_PUBLIC_AZURE_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_TENANT_ID` / `NEXT_PUBLIC_AZURE_TENANT_ID`

### Krok 2: Client Secret

1. W App Registration → **Certificates & secrets**
2. **"+ New client secret"**
3. Wypełnij:
   - **Description:** `ksef-api-secret`
   - **Expires:** `24 months`
4. **NATYCHMIAST skopiuj wartość secret** — nie będzie widoczna później!
   - To będzie `AZURE_CLIENT_SECRET`

### Krok 3: Uprawnienia API

#### 3.1 Uprawnienia Dataverse (dla Azure Functions API)

1. **API permissions** → **"+ Add a permission"**
2. **APIs my organization uses** → **"Dataverse"**
3. **Application permissions** → zaznacz `user_impersonation`
4. **"Add permissions"**

#### 3.2 Uprawnienia Microsoft Graph (dla Web App)

1. **"+ Add a permission"** → **Microsoft Graph** → **Delegated permissions**
2. Dodaj:

| Uprawnienie | Wymagane |
|-------------|----------|
| `openid` | ✅ Tak |
| `profile` | ✅ Tak |
| `email` | ✅ Tak |
| `User.Read` | ✅ Tak |
| `GroupMember.Read.All` | ⚡ Opcjonalnie (fallback >200 grup) |

3. **"Grant admin consent for [Organization]"** → potwierdź

#### 3.3 Expose an API (dla Custom Connector / Power Platform)

1. **Expose an API** → Set Application ID URI → `api://{CLIENT_ID}`
2. **"+ Add a scope"**:
   - Scope name: `access_as_user`
   - Admin consent display name: `Access KSeF API`
   - State: Enabled

---

## Grupy bezpieczeństwa

### Krok 4: Tworzenie grup w Entra ID

1. Przejdź do [Entra ID Portal](https://entra.microsoft.com) → **Groups** → **All groups**
2. Kliknij **"+ New group"**

#### Grupa Administratorów

| Pole | Wartość |
|------|---------|
| Group type | **Security** |
| Group name | `your-webapp-name-Administrators` |
| Group description | `Administratorzy integracji KSeF — pełny dostęp` |
| Membership type | **Assigned** |

#### Grupa Użytkowników

| Pole | Wartość |
|------|---------|
| Group type | **Security** |
| Group name | `your-webapp-name-Users` |
| Group description | `Użytkownicy integracji KSeF — dostęp tylko do odczytu` |
| Membership type | **Assigned** |

#### Grupa Akceptantów (Approvers)

| Pole | Wartość |
|------|---------||
| Group type | **Security** |
| Group name | `your-webapp-name-Approvers` |
| Group description | `Akceptanci samofakturowania — mogą zatwierdzać i odrzucać faktury SB` |
| Membership type | **Assigned** |

3. Po utworzeniu, skopiuj **Object ID** grup:

| Grupa | Object ID |
|-------|-----------||
| `your-webapp-name-Administrators` | `________________________________` |
| `your-webapp-name-Users` | `________________________________` |
| `your-webapp-name-Approvers` | `________________________________` |

4. Dodaj członków do grup (**Members** → **"+ Add members"**)

### Krok 5: Konfiguracja groups claim w tokenie

1. W App Registration → **Token configuration**
2. **"+ Add groups claim"**
3. Zaznacz:
   - ✅ **Security groups**
   - ❌ Directory roles
4. W **Customize token properties by type** → **ID tokens**: wybierz **Group ID**
5. **"Add"**

Po zapisaniu powinno być widoczne:
```
Groups claim
├── ID token: groups (Group ID)
└── Access token: groups (Group ID)
```

> ⚠️ **Groups overage**: Jeśli użytkownik ma >200 grup, Azure nie zwraca ich w tokenie.
> Token zawiera `_claim_sources` — wymaga fallbacku do Graph API.

### Hierarchia ról

| Rola | Grupa | Uprawnienia |
|------|-------|-------------|
| **Admin** | `your-webapp-name-Administrators` | Pełny: sync, ustawienia, AI, usuwanie |
| **Approver** | `your-webapp-name-Approvers` | Akceptacja/odrzucanie faktur samofakturowania |
| **User** | `your-webapp-name-Users` | Odczyt: faktury, raporty, eksport |
| **Brak** | — | Odmowa dostępu |

### Mapowanie uprawnień

| Funkcja | Admin | Approver | User |
|---------|-------|----------|------|
| Przeglądanie faktur | ✅ | ✅ | ✅ |
| Eksport CSV | ✅ | ✅ | ✅ |
| Raporty / dashboard | ✅ | ✅ | ✅ |
| Akceptacja faktur SB | ✅ | ✅ | ❌ |
| Odrzucanie faktur SB | ✅ | ✅ | ❌ |
| Synchronizacja KSeF | ✅ | ❌ | ❌ |
| Kategoryzacja AI | ✅ | ❌ | ❌ |
| Ustawienia | ✅ | ❌ | ❌ |
| Usuwanie danych | ✅ | ❌ | ❌ |

---

## Konfiguracja Dataverse

### Krok 6: Rola zabezpieczeń

1. Otwórz [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Wybierz środowisko → **Settings** → **Users + permissions** → **Security roles**
3. **"+ New role"**:
   - **Role Name:** `your-webapp-name Application`
   - **Description:** `Rola dla aplikacji KSeF API — pełny dostęp do tabel dvlp_ksef*`

4. W zakładce **Custom Entities** ustaw uprawnienia:

| Tabela | Create | Read | Write | Delete | Append | Append To |
|--------|--------|------|-------|--------|--------|-----------|
| `dvlp_ksefinvoice` | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| `dvlp_ksefsetting` | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| `dvlp_ksefsession` | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| `dvlp_ksefsynclog` | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |
| `dvlp_aifeedback` | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org | ✅ Org |

5. W **Core Records** → **User** i **Business Unit** → ✅ Read (Organization)
6. **Save and Close**

### Krok 7: Application User

1. Power Platform Admin Center → Environment → **Settings** → **Application users**
2. **"+ New app user"**
3. Wybierz App Registration `your-webapp-name`
4. Wybierz Business Unit (root)
5. Przypisz rolę: **your-webapp-name Application**
6. **"Create"**

---

## Zmienne środowiskowe

### Azure Functions (`api/local.settings.json`)

```json
{
  "Values": {
    "AZURE_TENANT_ID": "<tenant-id>",
    "AZURE_CLIENT_ID": "<client-id>",
    "AZURE_CLIENT_SECRET": "<client-secret>",
    "DATAVERSE_URL": "https://[org].crm4.dynamics.com",
    "ADMIN_GROUP_ID": "<object-id-your-webapp-name-Administrators>",
    "USER_GROUP_ID": "<object-id-your-webapp-name-Users>",
    "APPROVER_GROUP_ID": "<object-id-your-webapp-name-Approvers>"
  }
}
```

### Web App (`web/.env.local`)

```bash
NEXT_PUBLIC_AZURE_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<tenant-id>
NEXT_PUBLIC_API_SCOPE=api://<client-id>/.default
NEXT_PUBLIC_ADMIN_GROUP=<object-id-your-webapp-name-Administrators>
NEXT_PUBLIC_USER_GROUP=<object-id-your-webapp-name-Users>
NEXT_PUBLIC_APPROVER_GROUP=<object-id-your-webapp-name-Approvers>
```

> Pełna lista zmiennych: [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md)

---

## Konfiguracja automatyczna

### Skrypt PowerShell

```powershell
.\deployment\azure\Setup-EntraId.ps1 -DataverseUrl "https://[org].crm4.dynamics.com"
```

| Parametr | Wymagany | Domyślnie | Opis |
|----------|----------|-----------|------|
| `-AppName` | ❌ | `your-app-registration` | Nazwa App Registration |
| `-DataverseUrl` | ✅ | — | URL środowiska Dataverse |
| `-SecretValidityMonths` | ❌ | `24` | Ważność client secret |
| `-OutputEnvFile` | ❌ | `false` | Zapisanie do `.env` |
| `-AssignDataverseRole` | ❌ | `false` | Przypisanie roli w Dataverse |

---

## Testowanie

### Test tokenu (Client Credentials)

```powershell
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
    -Method POST -Body $body

Write-Host "Token: $($response.access_token.Substring(0, 50))..."
```

### Test Dataverse API

```powershell
$headers = @{
    Authorization = "Bearer $($response.access_token)"
    "OData-MaxVersion" = "4.0"
    "OData-Version" = "4.0"
}

$result = Invoke-RestMethod `
    -Uri "$dataverseUrl/api/data/v9.2/dvlp_ksefinvoices?`$top=1" `
    -Headers $headers

Write-Host "OK! Rekordów: $($result.value.Count)"
```

### Checklist weryfikacyjny

- [ ] App Registration utworzona w Entra ID
- [ ] Client Secret utworzony i zapisany
- [ ] Uprawnienia Dataverse dodane + Admin consent
- [ ] Grupy `your-webapp-name-Administrators`, `your-webapp-name-Users` i `your-webapp-name-Approvers` utworzone
- [ ] Object ID grup skopiowane do env vars (ADMIN_GROUP_ID, USER_GROUP_ID, APPROVER_GROUP_ID)
- [ ] Groups claim dodany do Token configuration
- [ ] Rola `your-webapp-name Application` utworzona w Dataverse
- [ ] Application User utworzony w Dataverse z przypisaną rolą
- [ ] Test połączenia przeszedł pomyślnie

---

## Rozwiązywanie problemów

### Błąd: "AADSTS700016: Application not found"
**Przyczyna:** Nieprawidłowy Client ID.  
**Rozwiązanie:** Sprawdź `AZURE_CLIENT_ID` w App Registration.

### Błąd: "AADSTS7000215: Invalid client secret"
**Przyczyna:** Secret wygasł lub jest nieprawidłowy.  
**Rozwiązanie:** Utwórz nowy secret, zaktualizuj `AZURE_CLIENT_SECRET`.

### Błąd: "403 Forbidden" przy Dataverse
**Przyczyna:** Brak uprawnień Application User.  
**Rozwiązanie:** Sprawdź, czy Application User istnieje i ma rolę `your-webapp-name Application`.

### Brak grup w tokenie
**Przyczyna:** Groups claim nie skonfigurowany lub użytkownik nie jest w grupie.  
**Rozwiązanie:** Sprawdź Token configuration, wyloguj i zaloguj ponownie.

### `_claim_sources` zamiast `groups`
**Przyczyna:** Użytkownik ma >200 grup (groups overage).  
**Rozwiązanie:** Zaimplementuj fallback do Graph API lub ogranicz liczbę grup.

### Sesja wygasa zbyt szybko
**Rozwiązanie:** Zmień `cacheLocation` w MSAL config:
```typescript
cache: { cacheLocation: 'localStorage' }  // zamiast 'sessionStorage'
```

---

## Powiązane dokumenty

- [Schemat Dataverse](./DATAVERSE_SCHEMA.md) — model danych, role bezpieczeństwa
- [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) — tworzenie Key Vault, Functions
- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna lista env vars
- [Custom Connector](./POWER_PLATFORM_CUSTOM_CONNECTOR.md) — integracja Power Platform

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 2.0 (scalenie ENTRA_ID_SETUP.md + AUTH_GROUPS_SETUP.md)  
**Opiekun:** dvlp-dev team
