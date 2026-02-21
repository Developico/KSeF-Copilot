<#
.SYNOPSIS
    Konfiguruje środowisko Azure dla KSeF Integration.

.DESCRIPTION
    Tworzy i konfiguruje wymagane zasoby Azure:
    - App Registration w Entra ID
    - Uprawnienia API
    - Service Principal

.PARAMETER ResourceGroupName
    Nazwa grupy zasobów Azure

.PARAMETER Location
    Lokalizacja Azure (domyślnie: westeurope)

.PARAMETER AppName
    Nazwa aplikacji (domyślnie: KSeF Integration)

.EXAMPLE
    .\Configure-Azure.ps1 -ResourceGroupName "rg-ksef-prod"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $false)]
    [string]$Location = "westeurope",

    [Parameter(Mandatory = $false)]
    [string]$AppName = "KSeF Integration"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KSeF Integration - Konfiguracja Azure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify Azure CLI login
Write-Host "[1/5] Weryfikacja logowania Azure..." -ForegroundColor Green
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "Nie zalogowano do Azure CLI. Uruchom: az login"
    exit 1
}
Write-Host "  Tenant ID: $($account.tenantId)" -ForegroundColor Gray

# Create App Registration
Write-Host "[2/5] Tworzenie App Registration..." -ForegroundColor Green
$appJson = az ad app create `
    --display-name $AppName `
    --sign-in-audience "AzureADMyOrg" `
    --output json | ConvertFrom-Json

$appId = $appJson.appId
Write-Host "  App ID: $appId" -ForegroundColor Gray

# Create Service Principal
Write-Host "[3/5] Tworzenie Service Principal..." -ForegroundColor Green
az ad sp create --id $appId --output none 2>$null
Write-Host "  Service Principal utworzony" -ForegroundColor Gray

# Create Client Secret
Write-Host "[4/5] Tworzenie Client Secret..." -ForegroundColor Green
$secretJson = az ad app credential reset `
    --id $appId `
    --display-name "ksef-deployment-secret" `
    --years 2 `
    --output json | ConvertFrom-Json

$clientSecret = $secretJson.password
Write-Host "  Secret utworzony (zapisz go bezpiecznie!)" -ForegroundColor Yellow

# Configure API Permissions
Write-Host "[5/5] Konfiguracja uprawnień API..." -ForegroundColor Green

# Dataverse API permission
$dataverseApiId = "00000007-0000-0000-c000-000000000000" # Common Data Service
az ad app permission add `
    --id $appId `
    --api $dataverseApiId `
    --api-permissions "78ce3f0f-a1ce-49c2-8cde-64b5c0896db4=Scope" `
    --output none

# Grant admin consent (requires admin privileges)
Write-Host ""
Write-Host "  UWAGA: Wymagana jest zgoda administratora na uprawnienia API." -ForegroundColor Yellow
Write-Host "  Uruchom poniższe polecenie jako administrator:" -ForegroundColor Yellow
Write-Host "  az ad app permission admin-consent --id $appId" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Konfiguracja zakończona!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Zapisz poniższe wartości (będą potrzebne do wdrożenia):" -ForegroundColor Yellow
Write-Host ""
Write-Host "AZURE_TENANT_ID=$($account.tenantId)" -ForegroundColor White
Write-Host "AZURE_CLIENT_ID=$appId" -ForegroundColor White
Write-Host "AZURE_CLIENT_SECRET=$clientSecret" -ForegroundColor White
Write-Host ""
Write-Host "WAŻNE: Zapisz Client Secret teraz - nie będzie można go ponownie wyświetlić!" -ForegroundColor Red
