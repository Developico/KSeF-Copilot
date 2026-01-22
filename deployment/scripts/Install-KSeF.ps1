<#
.SYNOPSIS
    Główny skrypt instalacyjny dla KSeF Integration.

.DESCRIPTION
    Wdraża wszystkie komponenty Azure wymagane przez KSeF Integration:
    - Azure Functions
    - Azure Key Vault
    - Azure Static Web App
    - Konfiguracja App Registration

.PARAMETER Environment
    Środowisko docelowe: dev, test, prod

.PARAMETER ResourceGroupName
    Nazwa grupy zasobów Azure (opcjonalne - domyślnie: rg-ksef-{Environment})

.PARAMETER Location
    Lokalizacja Azure (domyślnie: westeurope)

.PARAMETER DataverseUrl
    URL instancji Dataverse

.PARAMETER UpdateOnly
    Tylko aktualizacja Azure Functions bez tworzenia infrastruktury

.EXAMPLE
    .\Install-KSeF.ps1 -Environment "prod" -DataverseUrl "https://contoso.crm4.dynamics.com"

.EXAMPLE
    .\Install-KSeF.ps1 -Environment "dev" -UpdateOnly
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,

    [Parameter(Mandatory = $false)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $false)]
    [string]$Location = "westeurope",

    [Parameter(Mandatory = $false)]
    [string]$DataverseUrl,

    [Parameter(Mandatory = $false)]
    [switch]$UpdateOnly
)

$ErrorActionPreference = "Stop"

# Import helper functions
. "$PSScriptRoot\helpers\Common.ps1"

# Configuration
$config = @{
    Environment = $Environment
    ResourceGroupName = if ($ResourceGroupName) { $ResourceGroupName } else { "rg-ksef-$Environment" }
    Location = $Location
    FunctionAppName = "ksef-api-$Environment"
    KeyVaultName = "kv-ksef-$Environment"
    StaticWebAppName = "swa-ksef-$Environment"
    DataverseUrl = $DataverseUrl
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KSeF Integration - Instalacja" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Środowisko: $($config.Environment)" -ForegroundColor Yellow
Write-Host "Resource Group: $($config.ResourceGroupName)" -ForegroundColor Yellow
Write-Host "Lokalizacja: $($config.Location)" -ForegroundColor Yellow
Write-Host ""

# Verify Azure CLI login
Write-Host "[1/6] Weryfikacja logowania Azure..." -ForegroundColor Green
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "Nie zalogowano do Azure CLI. Uruchom: az login"
    exit 1
}
Write-Host "  Zalogowano jako: $($account.user.name)" -ForegroundColor Gray
Write-Host "  Subskrypcja: $($account.name)" -ForegroundColor Gray

if (-not $UpdateOnly) {
    # Create Resource Group
    Write-Host "[2/6] Tworzenie grupy zasobów..." -ForegroundColor Green
    az group create `
        --name $config.ResourceGroupName `
        --location $config.Location `
        --output none
    Write-Host "  Grupa zasobów utworzona: $($config.ResourceGroupName)" -ForegroundColor Gray

    # Deploy infrastructure using Bicep
    Write-Host "[3/6] Wdrażanie infrastruktury Azure (Bicep)..." -ForegroundColor Green
    $templatePath = Join-Path $PSScriptRoot "..\templates\main.bicep"
    
    $deploymentParams = @{
        environment = $config.Environment
        location = $config.Location
        dataverseUrl = $config.DataverseUrl
    }
    
    az deployment group create `
        --resource-group $config.ResourceGroupName `
        --template-file $templatePath `
        --parameters ($deploymentParams | ConvertTo-Json -Compress) `
        --output none

    Write-Host "  Infrastruktura wdrożona" -ForegroundColor Gray
} else {
    Write-Host "[2/6] Pominięto (--UpdateOnly)" -ForegroundColor Gray
    Write-Host "[3/6] Pominięto (--UpdateOnly)" -ForegroundColor Gray
}

# Build API
Write-Host "[4/6] Budowanie Azure Functions..." -ForegroundColor Green
$apiPath = Join-Path $PSScriptRoot "..\..\api"
Push-Location $apiPath
try {
    pnpm install --frozen-lockfile
    pnpm run build
} finally {
    Pop-Location
}
Write-Host "  Build zakończony" -ForegroundColor Gray

# Deploy Functions
Write-Host "[5/6] Wdrażanie Azure Functions..." -ForegroundColor Green
Push-Location $apiPath
try {
    func azure functionapp publish $config.FunctionAppName --typescript
} finally {
    Pop-Location
}
Write-Host "  Functions wdrożone" -ForegroundColor Gray

# Build and deploy Static Web App
Write-Host "[6/6] Budowanie i wdrażanie Static Web App..." -ForegroundColor Green
$webPath = Join-Path $PSScriptRoot "..\..\web"
Push-Location $webPath
try {
    pnpm install --frozen-lockfile
    pnpm run build
    
    # Get SWA deployment token
    $swaToken = az staticwebapp secrets list `
        --name $config.StaticWebAppName `
        --resource-group $config.ResourceGroupName `
        --query "properties.apiKey" -o tsv

    # Deploy using SWA CLI
    npx @azure/static-web-apps-cli deploy ./out `
        --deployment-token $swaToken `
        --env Production
} finally {
    Pop-Location
}
Write-Host "  Static Web App wdrożona" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Instalacja zakończona pomyślnie!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Następne kroki:" -ForegroundColor Yellow
Write-Host "1. Skonfiguruj tokeny KSeF w Azure Key Vault" -ForegroundColor White
Write-Host "2. Zaimportuj rozwiązanie Dataverse" -ForegroundColor White
Write-Host "3. Przypisz role użytkownikom w Entra ID" -ForegroundColor White
Write-Host ""
Write-Host "URL aplikacji: https://$($config.StaticWebAppName).azurestaticapps.net" -ForegroundColor Cyan
Write-Host "API URL: https://$($config.FunctionAppName).azurewebsites.net" -ForegroundColor Cyan
