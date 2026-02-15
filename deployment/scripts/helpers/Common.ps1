# Common helper functions for KSeF deployment scripts

function Write-StepHeader {
    param (
        [string]$Step,
        [string]$Message
    )
    Write-Host "[$Step] $Message" -ForegroundColor Green
}

function Write-StepDetail {
    param (
        [string]$Message
    )
    Write-Host "  $Message" -ForegroundColor Gray
}

function Test-AzureLogin {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) {
        return $null
    }
    return $account
}

function Get-RandomSuffix {
    param (
        [int]$Length = 6
    )
    $chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    $suffix = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $suffix += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $suffix
}

function Wait-ForResource {
    param (
        [scriptblock]$Check,
        [int]$TimeoutSeconds = 300,
        [int]$IntervalSeconds = 10,
        [string]$ResourceName = "resource"
    )
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (& $Check) {
            return $true
        }
        Write-Host "  Czekam na $ResourceName... ($elapsed s)" -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
        $elapsed += $IntervalSeconds
    }
    
    throw "Timeout waiting for $ResourceName after $TimeoutSeconds seconds"
}

function ConvertTo-SecureJson {
    param (
        [hashtable]$Data
    )
    return ($Data | ConvertTo-Json -Compress -Depth 10)
}
