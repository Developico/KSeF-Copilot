<#
.SYNOPSIS
    Grants CRUD privileges on Self-Billing tables to the DVLP-KSeF Application security role.
#>
[CmdletBinding()]
param(
    [string]$EnvironmentUrl = 'https://developico-tt.api.crm4.dynamics.com',
    [string]$RoleId = 'ca5178fb-82fb-f011-8406-7ced8d765deb'
)

$ErrorActionPreference = 'Stop'

# Auth
$resource = "$EnvironmentUrl/"
$tokenObj = Get-AzAccessToken -ResourceUrl $resource -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenObj.Token)
try { $token = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

$headers = @{
    'Authorization' = "Bearer $token"
    'Accept'        = 'application/json'
    'Content-Type'  = 'application/json; charset=utf-8'
}
$baseUri = "$EnvironmentUrl/api/data/v9.2"

# Test connectivity
$whoami = Invoke-RestMethod -Uri "$baseUri/WhoAmI" -Headers $headers
Write-Host "Connected as UserId: $($whoami.UserId)" -ForegroundColor Green

# Collect privileges for the 3 new entities
$entities = @('dvlp_ksefsupplier', 'dvlp_ksefsbagrement', 'dvlp_ksefselfbillingtemplate')
$allPrivileges = [System.Collections.ArrayList]::new()

foreach ($entity in $entities) {
    $filter = "`$filter=contains(name,'$entity')&`$select=name,privilegeid,accessright"
    $uri = "$baseUri/privileges?$filter"
    $result = Invoke-RestMethod -Uri $uri -Headers $headers
    Write-Host "`n$entity — $($result.value.Count) privileges:" -ForegroundColor Cyan
    foreach ($p in $result.value) {
        Write-Host "  $($p.name) (access=$($p.accessright)) -> $($p.privilegeid)"
        # Depth = "Global" (Organization-level access)
        [void]$allPrivileges.Add(@{ PrivilegeId = $p.privilegeid; Depth = "Global" })
    }
}

Write-Host "`nTotal privileges to grant: $($allPrivileges.Count)" -ForegroundColor Yellow

# Grant using AddPrivilegesRole
$body = @{ Privileges = [array]$allPrivileges } | ConvertTo-Json -Depth 5
$uri = "$baseUri/roles($RoleId)/Microsoft.Dynamics.CRM.AddPrivilegesRole"

Write-Host "Calling AddPrivilegesRole on role $RoleId..." -ForegroundColor DarkGray
try {
    Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
    Write-Host "`nSUCCESS — All $($allPrivileges.Count) privileges granted!" -ForegroundColor Green
}
catch {
    $detail = $_.ErrorDetails.Message
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($detail) { Write-Host "Detail: $detail" -ForegroundColor Yellow }
    throw
}

# Verify
Write-Host "`nVerifying..." -ForegroundColor DarkGray
foreach ($entity in $entities) {
    $filter = "`$filter=contains(name,'$entity')&`$select=name"
    $uri = "$baseUri/roles($RoleId)/roleprivileges_association?$filter"
    $result = Invoke-RestMethod -Uri $uri -Headers $headers
    Write-Host "  $entity — $($result.value.Count) privileges in role" -ForegroundColor $(if ($result.value.Count -gt 0) { 'Green' } else { 'Red' })
}
