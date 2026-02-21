<#
.SYNOPSIS
    Konfiguruje App Registration w Microsoft Entra ID dla integracji KSeF z Dataverse.

.DESCRIPTION
    Skrypt automatyzuje proces tworzenia App Registration, generowania client secret
    oraz konfiguracji uprawnień do Dataverse API.

.PARAMETER AppName
    Nazwa App Registration. Domyślnie: your-app-registration

.PARAMETER DataverseUrl
    URL środowiska Dataverse (wymagany). Np: https://org123.crm4.dynamics.com

.PARAMETER SecretValidityMonths
    Ważność client secret w miesiącach. Domyślnie: 24

.PARAMETER OutputEnvFile
    Jeśli podane, zapisuje zmienne do pliku .env w katalogu api/

.PARAMETER AssignDataverseRole
    Jeśli podane, próbuje utworzyć Application User w Dataverse (wymaga dodatkowych uprawnień)

.EXAMPLE
    .\Setup-EntraId.ps1 -DataverseUrl "https://org123.crm4.dynamics.com"

.EXAMPLE
    .\Setup-EntraId.ps1 -DataverseUrl "https://org123.crm4.dynamics.com" -OutputEnvFile

.NOTES
    Autor: Developico
    Wymaga: Azure CLI (az) zainstalowanego i zalogowanego
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$AppName = "your-app-registration",

    [Parameter(Mandatory = $true)]
    [string]$DataverseUrl,

    [Parameter(Mandatory = $false)]
    [int]$SecretValidityMonths = 24,

    [Parameter(Mandatory = $false)]
    [switch]$OutputEnvFile,

    [Parameter(Mandatory = $false)]
    [switch]$AssignDataverseRole
)

# Kolory dla output
function Write-Step { param($msg) Write-Host "`n➡️  $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Gray }

# Banner
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║         KSeF - Entra ID App Registration Setup                ║
║                                                               ║
║  Ten skrypt utworzy App Registration w Microsoft Entra ID    ║
║  i skonfiguruje uprawnienia do Dataverse API.                ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# =============================================================================
# Walidacja wymagań
# =============================================================================

Write-Step "Sprawdzanie wymagań..."

# Sprawdź Azure CLI
$azVersion = az version 2>$null | ConvertFrom-Json
if (-not $azVersion) {
    Write-Error "Azure CLI nie jest zainstalowane. Zainstaluj z: https://aka.ms/installazurecliwindows"
    exit 1
}
Write-Success "Azure CLI zainstalowane (wersja: $($azVersion.'azure-cli'))"

# Sprawdź logowanie
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Warning "Nie jesteś zalogowany do Azure CLI"
    Write-Info "Uruchamiam: az login..."
    az login
    $account = az account show | ConvertFrom-Json
}
Write-Success "Zalogowany jako: $($account.user.name)"
Write-Info "Tenant: $($account.tenantId)"
Write-Info "Subskrypcja: $($account.name)"

# Walidacja DataverseUrl
if (-not $DataverseUrl.StartsWith("https://")) {
    Write-Error "DataverseUrl musi zaczynać się od https://"
    exit 1
}
$DataverseUrl = $DataverseUrl.TrimEnd('/')
Write-Info "Dataverse URL: $DataverseUrl"

# =============================================================================
# Utworzenie App Registration
# =============================================================================

Write-Step "Tworzenie App Registration: $AppName..."

# Sprawdź czy już istnieje
$existingApp = az ad app list --display-name $AppName 2>$null | ConvertFrom-Json
if ($existingApp -and $existingApp.Count -gt 0) {
    Write-Warning "App Registration '$AppName' już istnieje!"
    $response = Read-Host "Czy chcesz użyć istniejącej? (T/n)"
    if ($response -eq 'n' -or $response -eq 'N') {
        Write-Info "Anulowano."
        exit 0
    }
    $appId = $existingApp[0].appId
    $objectId = $existingApp[0].id
    Write-Info "Używam istniejącej aplikacji: $appId"
} else {
    # Utwórz nową App Registration
    $appJson = az ad app create `
        --display-name $AppName `
        --sign-in-audience "AzureADMyOrg" `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Błąd tworzenia App Registration: $appJson"
        exit 1
    }

    $app = $appJson | ConvertFrom-Json
    $appId = $app.appId
    $objectId = $app.id
    Write-Success "App Registration utworzona!"
}

Write-Info "Application (client) ID: $appId"
Write-Info "Object ID: $objectId"

# =============================================================================
# Utworzenie Service Principal
# =============================================================================

Write-Step "Tworzenie Service Principal..."

$existingSp = az ad sp show --id $appId 2>$null | ConvertFrom-Json
if (-not $existingSp) {
    $sp = az ad sp create --id $appId 2>&1 | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Błąd tworzenia Service Principal"
        exit 1
    }
    Write-Success "Service Principal utworzony"
} else {
    Write-Info "Service Principal już istnieje"
}

# =============================================================================
# Utworzenie Client Secret
# =============================================================================

Write-Step "Generowanie Client Secret..."

$endDate = (Get-Date).AddMonths($SecretValidityMonths).ToString("yyyy-MM-ddTHH:mm:ssZ")

$secretJson = az ad app credential reset `
    --id $appId `
    --append `
    --display-name "ksef-api-secret" `
    --end-date $endDate `
    --query "{clientId:appId, clientSecret:password, tenantId:tenant}" `
    2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Błąd generowania secret: $secretJson"
    exit 1
}

$credentials = $secretJson | ConvertFrom-Json
$clientSecret = $credentials.clientSecret
$tenantId = $credentials.tenantId

Write-Success "Client Secret utworzony (ważny do: $endDate)"
Write-Warning "ZAPISZ TEN SECRET - nie będzie widoczny później!"

# =============================================================================
# Dodanie uprawnień Dataverse
# =============================================================================

Write-Step "Konfiguracja uprawnień Dataverse API..."

# Dataverse API ID (Common Data Service)
$dataverseApiId = "00000007-0000-0000-c000-000000000000"

# Dodaj uprawnienie user_impersonation
$permissionJson = az ad app permission add `
    --id $appId `
    --api $dataverseApiId `
    --api-permissions "78ce3f0f-a1ce-49c2-8cde-64b5c0896db4=Scope" `
    2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Uprawnienia Dataverse dodane"
} else {
    Write-Warning "Uprawnienia mogą już istnieć lub wymagają ręcznego dodania"
}

# =============================================================================
# Admin Consent
# =============================================================================

Write-Step "Nadawanie Admin Consent..."

$consentResult = az ad app permission admin-consent --id $appId 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Admin Consent nadany"
} else {
    Write-Warning "Admin Consent wymaga ręcznego nadania w Azure Portal"
    Write-Info "Przejdź do: Azure Portal → App registrations → $AppName → API permissions → Grant admin consent"
}

# =============================================================================
# Podsumowanie
# =============================================================================

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "                    KONFIGURACJA ZAKOŃCZONA                      " -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green

Write-Host "`n📋 Zapisz te wartości:" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────"
Write-Host "AZURE_TENANT_ID=$tenantId" -ForegroundColor White
Write-Host "AZURE_CLIENT_ID=$appId" -ForegroundColor White
Write-Host "AZURE_CLIENT_SECRET=$clientSecret" -ForegroundColor White
Write-Host "DATAVERSE_URL=$DataverseUrl" -ForegroundColor White
Write-Host "───────────────────────────────────────────────────────────────"

# =============================================================================
# Zapis do pliku .env
# =============================================================================

if ($OutputEnvFile) {
    Write-Step "Zapisywanie do pliku .env..."
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
    $envPath = Join-Path $projectRoot "api" "local.settings.json"
    
    $settings = @{
        IsEncrypted = $false
        Values = @{
            AzureWebJobsStorage = "UseDevelopmentStorage=true"
            FUNCTIONS_WORKER_RUNTIME = "node"
            AZURE_TENANT_ID = $tenantId
            AZURE_CLIENT_ID = $appId
            AZURE_CLIENT_SECRET = $clientSecret
            DATAVERSE_URL = $DataverseUrl
            DATAVERSE_ENTITY_INVOICES = "dvlp_ksefinvoices"
            DATAVERSE_ENTITY_SETTINGS = "dvlp_ksefsettings"
        }
    }
    
    $settings | ConvertTo-Json -Depth 10 | Set-Content $envPath -Encoding UTF8
    Write-Success "Zapisano do: $envPath"
}

# =============================================================================
# Następne kroki
# =============================================================================

Write-Host "`n📌 NASTĘPNE KROKI:" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────"
Write-Host "1. Utwórz Application User w Dataverse:" -ForegroundColor Cyan
Write-Host "   → Power Platform Admin Center → Environment → Settings"
Write-Host "   → Users + permissions → Application users → + New app user"
Write-Host "   → Wybierz: $AppName"
Write-Host "   → Przypisz rolę: KSeF Operator (lub System Administrator do testów)"
Write-Host ""
Write-Host "2. Jeśli Admin Consent nie został nadany automatycznie:" -ForegroundColor Cyan
Write-Host "   → Azure Portal → App registrations → $AppName"
Write-Host "   → API permissions → Grant admin consent"
Write-Host ""
Write-Host "3. Przetestuj połączenie:" -ForegroundColor Cyan
Write-Host "   → cd api && npm run build && npm run start"
Write-Host "   → curl http://localhost:7071/api/health"
Write-Host "───────────────────────────────────────────────────────────────"

# =============================================================================
# Test połączenia (opcjonalny)
# =============================================================================

$testConnection = Read-Host "`nCzy chcesz przetestować połączenie z Dataverse? (t/N)"
if ($testConnection -eq 't' -or $testConnection -eq 'T') {
    Write-Step "Testowanie połączenia z Dataverse..."
    
    $tokenBody = @{
        grant_type    = "client_credentials"
        client_id     = $appId
        client_secret = $clientSecret
        scope         = "$DataverseUrl/.default"
    }
    
    try {
        $tokenResponse = Invoke-RestMethod `
            -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" `
            -Method POST `
            -Body $tokenBody `
            -ContentType "application/x-www-form-urlencoded"
        
        Write-Success "Token OAuth2 otrzymany!"
        
        $headers = @{
            Authorization = "Bearer $($tokenResponse.access_token)"
            "OData-MaxVersion" = "4.0"
            "OData-Version" = "4.0"
            Accept = "application/json"
        }
        
        $whoAmI = Invoke-RestMethod `
            -Uri "$DataverseUrl/api/data/v9.2/WhoAmI" `
            -Headers $headers `
            -Method GET
        
        Write-Success "Połączenie z Dataverse OK!"
        Write-Info "User ID: $($whoAmI.UserId)"
        Write-Info "Organization ID: $($whoAmI.OrganizationId)"
        
    } catch {
        Write-Error "Błąd połączenia: $($_.Exception.Message)"
        Write-Warning "Upewnij się, że:"
        Write-Warning "  1. Admin Consent został nadany"
        Write-Warning "  2. Application User istnieje w Dataverse"
        Write-Warning "  3. Rola bezpieczeństwa jest przypisana"
    }
}

Write-Host "`n✨ Gotowe!" -ForegroundColor Green
