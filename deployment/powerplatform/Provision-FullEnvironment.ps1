<#
.SYNOPSIS
    Provisions the COMPLETE Dataverse schema for the KSeF integration on a fresh environment.
    Based on: docs/pl/DATAVERSE_SCHEMAT.md + docs/internal/DATAVERSE-MPK-SPEC.md

.DESCRIPTION
    Creates ALL tables, columns, option sets, relationships and alternate keys for
    the KSeF application. Designed to be run once on a brand-new Dataverse environment.

    Creates:
    - 17 Global OptionSets
    - 5 existing tables (dvlp_ksefsetting, dvlp_ksefsession, dvlp_ksefsynclog,
      dvlp_ksefinvoice, dvlp_aifeedback)
    - 4 new MPK tables (dvlp_ksefmpkcenter, dvlp_ksefmpkapprover,
      dvlp_ksefnotification, dvlp_ksefwebhooksub)
    - All columns, Lookup relationships, and Alternate Keys
    - Publishes all customizations

    This script is fully idempotent — safe to re-run.

    Prerequisites:
    - PowerShell 7+
    - Dataverse System Administrator / System Customizer role
    - Auth: EITHER Az module + Connect-AzAccount, OR Service Principal params

.PARAMETER EnvironmentUrl
    Dataverse environment URL, e.g. https://org12345.crm4.dynamics.com

.PARAMETER TenantId
    Azure AD Tenant ID (for Service Principal auth). If omitted, uses Az module.

.PARAMETER ClientId
    App Registration Client ID (for Service Principal auth).

.PARAMETER ClientSecret
    App Registration Client Secret (for Service Principal auth).

.PARAMETER PublisherPrefix
    Publisher prefix (default: dvlp)

.PARAMETER DryRun
    If set, only prints what would be created without making API calls.

.EXAMPLE
    .\Provision-FullEnvironment.ps1 -EnvironmentUrl "https://org12345.api.crm4.dynamics.com"

.EXAMPLE
    .\Provision-FullEnvironment.ps1 -EnvironmentUrl "https://org12345.api.crm4.dynamics.com" -DryRun
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^https://[\w-]+(\.api)?\.crm\d*\.dynamics\.com$')]
    [string]$EnvironmentUrl,

    [string]$TenantId,
    [string]$ClientId,
    [string]$ClientSecret,

    [string]$PublisherPrefix = 'dvlp',

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Auth ────────────────────────────────────────────────────────────────────
$script:cachedToken = $null
$script:tokenExpiry = [datetime]::MinValue

function Get-DataverseToken {
    if ($script:cachedToken -and [datetime]::UtcNow -lt $script:tokenExpiry.AddSeconds(-60)) {
        return $script:cachedToken
    }

    if ($TenantId -and $ClientId -and $ClientSecret) {
        $tokenUrl = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
        $body = @{
            grant_type    = 'client_credentials'
            client_id     = $ClientId
            client_secret = $ClientSecret
            scope         = "$EnvironmentUrl/.default"
        }
        $response = Invoke-RestMethod -Method POST -Uri $tokenUrl -Body $body -ContentType 'application/x-www-form-urlencoded'
        $script:cachedToken = $response.access_token
        $script:tokenExpiry = [datetime]::UtcNow.AddSeconds($response.expires_in)
        return $script:cachedToken
    }
    else {
        $resource = "$EnvironmentUrl/"
        $bstr = $null
        try {
            $token = (Get-AzAccessToken -ResourceUrl $resource -AsSecureString)
            $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token.Token)
            $script:cachedToken = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
            $script:tokenExpiry = $token.ExpiresOn.UtcDateTime
            return $script:cachedToken
        }
        finally {
            if ($bstr) { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
        }
    }
}

function Get-Headers {
    @{
        'Authorization'    = "Bearer $(Get-DataverseToken)"
        'OData-MaxVersion' = '4.0'
        'OData-Version'    = '4.0'
        'Content-Type'     = 'application/json; charset=utf-8'
        'Accept'           = 'application/json'
        'Prefer'           = 'return=representation'
    }
}

$baseUri = "$EnvironmentUrl/api/data/v9.2"
$script:optionSetIds = @{}

# ─── Helpers ─────────────────────────────────────────────────────────────────
function Invoke-DvRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body,
        [string]$Description
    )

    if ($DryRun) {
        Write-Host "[DRY-RUN] $Method $Description" -ForegroundColor Cyan
        return $null
    }

    Write-Host "  $Method $Description..." -ForegroundColor DarkGray -NoNewline
    $params = @{
        Method  = $Method
        Uri     = $Uri
        Headers = (Get-Headers)
    }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    try {
        $response = Invoke-RestMethod @params
        Write-Host " OK" -ForegroundColor Green
        return $response
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        $detail = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        $msg = if ($detail.error.message) { $detail.error.message } else { $_.Exception.Message }

        if ($status -eq 409 -or $msg -match 'already exists|not unique|A managed solution cannot overwrite') {
            Write-Host " SKIPPED (already exists)" -ForegroundColor Yellow
            return $null
        }
        Write-Host " FAILED ($status)" -ForegroundColor Red
        Write-Error "Failed: $msg"
        throw
    }
}

function New-GlobalOptionSet {
    param([string]$Name, [string]$DisplayName, [string]$Description, [array]$Options)

    $body = @{
        '@odata.type'  = '#Microsoft.Dynamics.CRM.OptionSetMetadata'
        Name           = $Name
        DisplayName    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayName; LanguageCode = 1033 }) }
        Description    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }) }
        IsGlobal       = $true
        OptionSetType  = 'Picklist'
        Options        = $Options
    }

    $result = Invoke-DvRequest -Method POST -Uri "$baseUri/GlobalOptionSetDefinitions" -Body $body -Description "GlobalOptionSet: $Name"
    if ($result -and $result.MetadataId) {
        $script:optionSetIds[$Name] = $result.MetadataId
    }
}

function New-OptionItem {
    param([int]$Value, [string]$LabelEN, [string]$LabelPL, [string]$Color)

    $labels = @(
        @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $LabelEN; LanguageCode = 1033 }
    )
    if ($LabelPL) {
        $labels += @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $LabelPL; LanguageCode = 1045 }
    }

    $item = @{
        Value = $Value
        Label = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = $labels }
    }
    if ($Color) { $item.Color = $Color }
    return $item
}

function Resolve-OptionSetId {
    param([string]$Name)

    if ($script:optionSetIds.ContainsKey($Name)) {
        return $script:optionSetIds[$Name]
    }

    if ($DryRun) {
        $dummy = [guid]::Empty.ToString()
        $script:optionSetIds[$Name] = $dummy
        return $dummy
    }

    Write-Host "  Resolving OptionSet GUID for '$Name'..." -ForegroundColor DarkGray -NoNewline
    $result = Invoke-RestMethod `
        -Uri "$baseUri/GlobalOptionSetDefinitions?`$select=Name,MetadataId" `
        -Headers (Get-Headers)

    foreach ($os in $result.value) {
        $script:optionSetIds[$os.Name] = $os.MetadataId
    }

    if (-not $script:optionSetIds.ContainsKey($Name)) {
        throw "GlobalOptionSet '$Name' not found in Dataverse"
    }

    Write-Host " $($script:optionSetIds[$Name])" -ForegroundColor DarkGreen
    return $script:optionSetIds[$Name]
}

function New-EntityDefinition {
    param([string]$SchemaName, [string]$DisplayName, [string]$DisplayNamePL, [string]$PluralName,
          [string]$Description, [string]$PrimaryNameAttr, [int]$PrimaryNameMaxLen = 100,
          [bool]$ChangeTracking = $false, [bool]$Auditing = $true, [bool]$DuplicateDetection = $false,
          [bool]$HasNotes = $false, [bool]$QuickCreate = $false,
          [string]$Color = '#1565C0')

    $body = @{
        '@odata.type'                   = '#Microsoft.Dynamics.CRM.EntityMetadata'
        SchemaName                      = $SchemaName
        DisplayName                     = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayName; LanguageCode = 1033 }
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNamePL; LanguageCode = 1045 }
        )}
        DisplayCollectionName           = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $PluralName; LanguageCode = 1033 }
        )}
        Description                     = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        OwnershipType                   = 'OrganizationOwned'
        IsActivity                      = $false
        HasNotes                        = $HasNotes
        HasActivities                   = $false
        ChangeTrackingEnabled           = $ChangeTracking
        IsAuditEnabled                  = @{ Value = $Auditing; CanBeChanged = $true }
        IsDuplicateDetectionEnabled     = @{ Value = $DuplicateDetection; CanBeChanged = $true }
        IsQuickCreateEnabled            = $QuickCreate
        EntityColor                     = $Color
        PrimaryNameAttribute            = $PrimaryNameAttr
        Attributes                      = @(
            @{
                '@odata.type'     = '#Microsoft.Dynamics.CRM.StringAttributeMetadata'
                SchemaName        = $PrimaryNameAttr
                RequiredLevel     = @{ Value = 'ApplicationRequired' }
                MaxLength         = $PrimaryNameMaxLen
                DisplayName       = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
                    @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Name'; LanguageCode = 1033 }
                )}
                IsPrimaryName     = $true
            }
        )
    }

    Invoke-DvRequest -Method POST -Uri "$baseUri/EntityDefinitions" -Body $body -Description "Entity: $SchemaName"
}

function Add-StringColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [int]$MaxLength = 100, [string]$RequiredLevel = 'None', [bool]$Searchable = $false,
          [bool]$Audit = $false, [string]$Description = '', [string]$Format = 'Text')

    $body = @{
        '@odata.type'       = '#Microsoft.Dynamics.CRM.StringAttributeMetadata'
        SchemaName          = $SchemaName
        DisplayName         = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description         = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel       = @{ Value = $RequiredLevel }
        MaxLength           = $MaxLength
        FormatName          = @{ Value = $Format }
        IsAuditEnabled      = @{ Value = $Audit }
        IsGlobalFilterEnabled = @{ Value = $Searchable }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "String: $EntityLogicalName.$SchemaName"
}

function Add-MemoColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [int]$MaxLength = 10000, [string]$RequiredLevel = 'None', [bool]$Audit = $false,
          [string]$Description = '')

    $body = @{
        '@odata.type'       = '#Microsoft.Dynamics.CRM.MemoAttributeMetadata'
        SchemaName          = $SchemaName
        DisplayName         = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description         = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel       = @{ Value = $RequiredLevel }
        MaxLength           = $MaxLength
        IsAuditEnabled      = @{ Value = $Audit }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Memo: $EntityLogicalName.$SchemaName"
}

function Add-BooleanColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [bool]$DefaultValue = $false, [string]$RequiredLevel = 'None', [bool]$Audit = $false,
          [string]$Description = '')

    $body = @{
        '@odata.type'     = '#Microsoft.Dynamics.CRM.BooleanAttributeMetadata'
        SchemaName        = $SchemaName
        DisplayName       = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description       = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel     = @{ Value = $RequiredLevel }
        DefaultValue      = $DefaultValue
        IsAuditEnabled    = @{ Value = $Audit }
        OptionSet          = @{
            TrueOption  = @{ Value = 1; Label = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Yes'; LanguageCode = 1033 }) } }
            FalseOption = @{ Value = 0; Label = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'No'; LanguageCode = 1033 }) } }
        }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Boolean: $EntityLogicalName.$SchemaName"
}

function Add-IntegerColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [int]$MinValue = -2147483648, [int]$MaxValue = 2147483647,
          [string]$RequiredLevel = 'None', [bool]$Audit = $false, [string]$Description = '')

    $body = @{
        '@odata.type'  = '#Microsoft.Dynamics.CRM.IntegerAttributeMetadata'
        SchemaName     = $SchemaName
        DisplayName    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel  = @{ Value = $RequiredLevel }
        MinValue       = $MinValue
        MaxValue       = $MaxValue
        IsAuditEnabled = @{ Value = $Audit }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Integer: $EntityLogicalName.$SchemaName"
}

function Add-DecimalColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [int]$Precision = 2, [decimal]$MinValue = 0, [decimal]$MaxValue = 999999999.99,
          [string]$RequiredLevel = 'None', [bool]$Audit = $false, [string]$Description = '')

    $body = @{
        '@odata.type'  = '#Microsoft.Dynamics.CRM.DecimalAttributeMetadata'
        SchemaName     = $SchemaName
        DisplayName    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel  = @{ Value = $RequiredLevel }
        Precision      = $Precision
        MinValue       = $MinValue
        MaxValue       = $MaxValue
        IsAuditEnabled = @{ Value = $Audit }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Decimal: $EntityLogicalName.$SchemaName"
}

function Add-DateTimeColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [string]$Format = 'DateAndTime', [string]$RequiredLevel = 'None', [bool]$Audit = $false,
          [string]$Description = '')

    $body = @{
        '@odata.type'  = '#Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'
        SchemaName     = $SchemaName
        DisplayName    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel  = @{ Value = $RequiredLevel }
        Format         = $Format
        IsAuditEnabled = @{ Value = $Audit }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "DateTime: $EntityLogicalName.$SchemaName"
}

function Add-PicklistColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [string]$GlobalOptionSetName, [int]$DefaultValue = -1,
          [string]$RequiredLevel = 'None', [bool]$Audit = $false, [string]$Description = '')

    $body = @{
        '@odata.type'  = '#Microsoft.Dynamics.CRM.PicklistAttributeMetadata'
        SchemaName     = $SchemaName
        DisplayName    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel  = @{ Value = $RequiredLevel }
        IsAuditEnabled = @{ Value = $Audit }
        'GlobalOptionSet@odata.bind' = "/GlobalOptionSetDefinitions($(Resolve-OptionSetId $GlobalOptionSetName))"
    }

    if ($DefaultValue -ge 0) {
        $body.DefaultFormValue = $DefaultValue
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Picklist: $EntityLogicalName.$SchemaName (-> $GlobalOptionSetName)"
}

function Add-LookupRelationship {
    param(
        [string]$SchemaName,
        [string]$ReferencingEntity,
        [string]$ReferencingAttribute,
        [string]$ReferencedEntity,
        [string]$DisplayNameEN,
        [string]$RequiredLevel = 'None',
        [string]$CascadeDelete = 'RemoveLink',
        [string]$CascadeAssign = 'NoCascade',
        [string]$Description = ''
    )

    $body = @{
        SchemaName               = $SchemaName
        '@odata.type'            = '#Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata'
        ReferencedEntity         = $ReferencedEntity
        ReferencingEntity        = $ReferencingEntity
        CascadeConfiguration     = @{
            Delete   = $CascadeDelete
            Assign   = $CascadeAssign
            Share    = 'NoCascade'
            Unshare  = 'NoCascade'
            Merge    = 'NoCascade'
            Reparent = 'NoCascade'
        }
        Lookup                   = @{
            SchemaName    = $ReferencingAttribute
            DisplayName   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
                @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
            )}
            Description   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
                @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
            )}
            RequiredLevel = @{ Value = $RequiredLevel }
        }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/RelationshipDefinitions" `
        -Body $body -Description "Lookup: $ReferencingEntity.$ReferencingAttribute -> $ReferencedEntity"
}

function Add-AlternateKey {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN, [string[]]$KeyAttributes)

    $body = @{
        SchemaName       = $SchemaName
        DisplayName      = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        KeyAttributes    = $KeyAttributes
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Keys" `
        -Body $body -Description "AlternateKey: $EntityLogicalName.$SchemaName"
}

function Add-FileColumn {
    param([string]$EntityLogicalName, [string]$SchemaName, [string]$DisplayNameEN,
          [int]$MaxSizeInKB = 32768, [string]$Description = '')

    $body = @{
        '@odata.type'  = '#Microsoft.Dynamics.CRM.FileAttributeMetadata'
        SchemaName     = $SchemaName
        DisplayName    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description    = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel  = @{ Value = 'None' }
        MaxSizeInKB    = $MaxSizeInKB
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "File: $EntityLogicalName.$SchemaName"
}

# ─── STEP 0 — Validate connectivity ─────────────────────────────────────────
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Dataverse FULL Environment Provisioning" -ForegroundColor White
Write-Host "  Environment: $EnvironmentUrl" -ForegroundColor DarkGray
$authMode = if ($TenantId -and $ClientId -and $ClientSecret) { 'Service Principal' } else { 'Az Module' }
Write-Host "  Auth: $authMode" -ForegroundColor DarkGray
Write-Host "  DryRun: $DryRun" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor White

if (-not $DryRun) {
    Write-Host "Testing connectivity..." -ForegroundColor DarkGray
    try {
        $whoami = Invoke-RestMethod -Uri "$baseUri/WhoAmI" -Headers (Get-Headers)
        Write-Host "Connected as UserId: $($whoami.UserId)`n" -ForegroundColor Green
    }
    catch {
        Write-Error "Cannot connect to Dataverse. Ensure you ran Connect-AzAccount and have correct permissions."
        return
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Global Option Sets (14 existing + 3 MPK new = 17 total)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "─── Step 1: Global Option Sets (17) ───" -ForegroundColor White

# 1. dvlp_ksefenvironment
New-GlobalOptionSet -Name "${PublisherPrefix}_ksefenvironment" `
    -DisplayName 'KSeF Environment' -Description 'KSeF API environment' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Test'       -LabelPL 'Test')
        (New-OptionItem -Value 100000002 -LabelEN 'Demo'       -LabelPL 'Demo')
        (New-OptionItem -Value 100000003 -LabelEN 'Production' -LabelPL 'Produkcja')
    )

# 2. dvlp_ksefstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_ksefstatus" `
    -DisplayName 'KSeF Status' -Description 'Invoice KSeF synchronization status' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Draft'    -LabelPL 'Szkic'          -Color 'Gray')
        (New-OptionItem -Value 100000002 -LabelEN 'Pending'  -LabelPL 'Oczekuje'       -Color 'Yellow')
        (New-OptionItem -Value 100000003 -LabelEN 'Sent'     -LabelPL 'Wysłano'        -Color 'Blue')
        (New-OptionItem -Value 100000004 -LabelEN 'Accepted' -LabelPL 'Zaakceptowano'  -Color 'Green')
        (New-OptionItem -Value 100000005 -LabelEN 'Rejected' -LabelPL 'Odrzucono'      -Color 'Red')
        (New-OptionItem -Value 100000006 -LabelEN 'Error'    -LabelPL 'Błąd'           -Color 'Red')
    )

# 3. dvlp_ksefdirection
New-GlobalOptionSet -Name "${PublisherPrefix}_ksefdirection" `
    -DisplayName 'Invoice Direction' -Description 'Incoming or outgoing invoice direction' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Incoming' -LabelPL 'Przychodzące')
        (New-OptionItem -Value 100000002 -LabelEN 'Outgoing' -LabelPL 'Wychodzące')
    )

# 4. dvlp_sessionstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_sessionstatus" `
    -DisplayName 'Session Status' -Description 'KSeF session lifecycle status' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Active'     -LabelPL 'Aktywna')
        (New-OptionItem -Value 100000002 -LabelEN 'Expired'    -LabelPL 'Wygasła')
        (New-OptionItem -Value 100000003 -LabelEN 'Terminated' -LabelPL 'Zakończona')
        (New-OptionItem -Value 100000004 -LabelEN 'Error'      -LabelPL 'Błąd')
    )

# 5. dvlp_sessiontype
New-GlobalOptionSet -Name "${PublisherPrefix}_sessiontype" `
    -DisplayName 'Session Type' -Description 'KSeF session type' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Interactive' -LabelPL 'Interaktywna')
        (New-OptionItem -Value 100000002 -LabelEN 'Batch'       -LabelPL 'Wsadowa')
    )

# 6. dvlp_syncoperationtype
New-GlobalOptionSet -Name "${PublisherPrefix}_syncoperationtype" `
    -DisplayName 'Sync Operation Type' -Description 'Type of synchronization operation' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Sync Incoming'  -LabelPL 'Pobierz przychodzące')
        (New-OptionItem -Value 100000002 -LabelEN 'Sync Outgoing'  -LabelPL 'Synchronizuj wychodzące')
        (New-OptionItem -Value 100000003 -LabelEN 'Send Invoice'   -LabelPL 'Wyślij fakturę')
        (New-OptionItem -Value 100000004 -LabelEN 'Check Status'   -LabelPL 'Sprawdź status')
        (New-OptionItem -Value 100000005 -LabelEN 'Download UPO'   -LabelPL 'Pobierz UPO')
    )

# 7. dvlp_syncstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_syncstatus" `
    -DisplayName 'Sync Status' -Description 'Synchronization operation result status' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'In Progress' -LabelPL 'W trakcie')
        (New-OptionItem -Value 100000002 -LabelEN 'Success'     -LabelPL 'Sukces')
        (New-OptionItem -Value 100000003 -LabelEN 'Partial'     -LabelPL 'Częściowy')
        (New-OptionItem -Value 100000004 -LabelEN 'Error'       -LabelPL 'Błąd')
    )

# 8. dvlp_paymentstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_paymentstatus" `
    -DisplayName 'Payment Status' -Description 'Invoice payment status' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Pending' -LabelPL 'Oczekuje'         -Color 'Yellow')
        (New-OptionItem -Value 100000002 -LabelEN 'Paid'    -LabelPL 'Opłacona'         -Color 'Green')
        (New-OptionItem -Value 100000003 -LabelEN 'Overdue' -LabelPL 'Przeterminowana'  -Color 'Red')
    )

# 9. dvlp_invoicetype
New-GlobalOptionSet -Name "${PublisherPrefix}_invoicetype" `
    -DisplayName 'Invoice Type' -Description 'Type of invoice document' `
    -Options @(
        (New-OptionItem -Value 100000000 -LabelEN 'VAT Invoice' -LabelPL 'Faktura VAT')
        (New-OptionItem -Value 100000001 -LabelEN 'Corrective'  -LabelPL 'Faktura korygująca')
        (New-OptionItem -Value 100000002 -LabelEN 'Advance'     -LabelPL 'Faktura zaliczkowa')
    )

# 10. dvlp_currency
New-GlobalOptionSet -Name "${PublisherPrefix}_currency" `
    -DisplayName 'Currency' -Description 'Invoice currency' `
    -Options @(
        (New-OptionItem -Value 100000000 -LabelEN 'PLN' -LabelPL 'PLN')
        (New-OptionItem -Value 100000001 -LabelEN 'USD' -LabelPL 'USD')
        (New-OptionItem -Value 100000002 -LabelEN 'EUR' -LabelPL 'EUR')
    )

# 11. dvlp_category
New-GlobalOptionSet -Name "${PublisherPrefix}_category" `
    -DisplayName 'Cost Category' -Description 'Invoice cost category' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'IT & Software'         -LabelPL 'IT i oprogramowanie')
        (New-OptionItem -Value 100000002 -LabelEN 'Office'                -LabelPL 'Biuro')
        (New-OptionItem -Value 100000003 -LabelEN 'Marketing'             -LabelPL 'Marketing')
        (New-OptionItem -Value 100000004 -LabelEN 'Travel'                -LabelPL 'Podróże')
        (New-OptionItem -Value 100000005 -LabelEN 'Utilities'             -LabelPL 'Media')
        (New-OptionItem -Value 100000006 -LabelEN 'Professional Services' -LabelPL 'Usługi profesjonalne')
        (New-OptionItem -Value 100000007 -LabelEN 'Equipment'             -LabelPL 'Sprzęt')
        (New-OptionItem -Value 100000008 -LabelEN 'Materials'             -LabelPL 'Materiały')
        (New-OptionItem -Value 100000009 -LabelEN 'Other'                 -LabelPL 'Inne')
    )

# 12. dvlp_costcenter
New-GlobalOptionSet -Name "${PublisherPrefix}_costcenter" `
    -DisplayName 'Cost Center / MPK' -Description 'Miejsce Powstawania Kosztow (legacy OptionSet)' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Consultants' -LabelPL 'Konsultanci')
        (New-OptionItem -Value 100000002 -LabelEN 'BackOffice'  -LabelPL 'Back Office')
        (New-OptionItem -Value 100000003 -LabelEN 'Management'  -LabelPL 'Zarząd')
        (New-OptionItem -Value 100000004 -LabelEN 'Cars'        -LabelPL 'Samochody')
        (New-OptionItem -Value 100000005 -LabelEN 'Legal'       -LabelPL 'Prawne')
        (New-OptionItem -Value 100000006 -LabelEN 'Marketing'   -LabelPL 'Marketing')
        (New-OptionItem -Value 100000007 -LabelEN 'Sales'       -LabelPL 'Sprzedaż')
        (New-OptionItem -Value 100000008 -LabelEN 'Delivery'    -LabelPL 'Realizacja')
        (New-OptionItem -Value 100000009 -LabelEN 'Finance'     -LabelPL 'Finanse')
        (New-OptionItem -Value 100000010 -LabelEN 'Other'       -LabelPL 'Inne')
    )

# 13. dvlp_feedbacktype
New-GlobalOptionSet -Name "${PublisherPrefix}_feedbacktype" `
    -DisplayName 'AI Feedback Type' -Description 'User reaction to AI suggestion' `
    -Options @(
        (New-OptionItem -Value 100000000 -LabelEN 'Applied'  -LabelPL 'Zaakceptowano' -Color 'Green')
        (New-OptionItem -Value 100000001 -LabelEN 'Modified' -LabelPL 'Zmieniono'     -Color 'Orange')
        (New-OptionItem -Value 100000002 -LabelEN 'Rejected' -LabelPL 'Odrzucono'     -Color 'Red')
    )

# 14. dvlp_invoicesource
New-GlobalOptionSet -Name "${PublisherPrefix}_invoicesource" `
    -DisplayName 'Invoice Source' -Description 'How the invoice entered the system' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'KSeF Sync' -LabelPL 'Synchronizacja KSeF')
        (New-OptionItem -Value 100000002 -LabelEN 'Manual'    -LabelPL 'Ręczne')
        (New-OptionItem -Value 100000003 -LabelEN 'Import'    -LabelPL 'Import')
    )

# 15. dvlp_approvalstatus (MPK new)
New-GlobalOptionSet -Name "${PublisherPrefix}_approvalstatus" `
    -DisplayName 'Approval Status' -Description 'Invoice approval workflow state' `
    -Options @(
        (New-OptionItem -Value 0 -LabelEN 'Draft'     -LabelPL 'Wersja robocza' -Color '#9E9E9E')
        (New-OptionItem -Value 1 -LabelEN 'Pending'   -LabelPL 'Oczekuje'       -Color '#FF9800')
        (New-OptionItem -Value 2 -LabelEN 'Approved'  -LabelPL 'Zatwierdzona'   -Color '#4CAF50')
        (New-OptionItem -Value 3 -LabelEN 'Rejected'  -LabelPL 'Odrzucona'      -Color '#F44336')
        (New-OptionItem -Value 4 -LabelEN 'Cancelled' -LabelPL 'Anulowana'      -Color '#607D8B')
    )

# 16. dvlp_budgetperiod (MPK new)
New-GlobalOptionSet -Name "${PublisherPrefix}_budgetperiod" `
    -DisplayName 'Budget Period' -Description 'Budget cycle period for MPK Centers' `
    -Options @(
        (New-OptionItem -Value 0 -LabelEN 'Monthly'     -LabelPL 'Miesięczny')
        (New-OptionItem -Value 1 -LabelEN 'Quarterly'   -LabelPL 'Kwartalny')
        (New-OptionItem -Value 2 -LabelEN 'Half-Yearly' -LabelPL 'Półroczny')
        (New-OptionItem -Value 3 -LabelEN 'Annual'      -LabelPL 'Roczny')
    )

# 17. dvlp_notificationtype (MPK new)
New-GlobalOptionSet -Name "${PublisherPrefix}_notificationtype" `
    -DisplayName 'Notification Type' -Description 'Type of in-app notification' `
    -Options @(
        (New-OptionItem -Value 0 -LabelEN 'Approval Requested' -LabelPL 'Oczekuje akceptacji'       -Color '#FF9800')
        (New-OptionItem -Value 1 -LabelEN 'SLA Exceeded'       -LabelPL 'SLA przekroczony'          -Color '#F44336')
        (New-OptionItem -Value 2 -LabelEN 'Budget Warning 80%' -LabelPL 'Budżet: ostrzeżenie 80%'  -Color '#FF5722')
        (New-OptionItem -Value 3 -LabelEN 'Budget Exceeded'    -LabelPL 'Budżet: przekroczony'      -Color '#D32F2F')
        (New-OptionItem -Value 4 -LabelEN 'Approval Decided'   -LabelPL 'Decyzja podjęta'           -Color '#4CAF50')
    )

# 18. dvlp_supplierstatus (Self-Billing new)
New-GlobalOptionSet -Name "${PublisherPrefix}_supplierstatus" `
    -DisplayName 'Supplier Status' -Description 'Status of the supplier in the registry' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Active'   -LabelPL 'Aktywny'       -Color '#4CAF50')
        (New-OptionItem -Value 100000002 -LabelEN 'Inactive' -LabelPL 'Nieaktywny'    -Color '#9E9E9E')
        (New-OptionItem -Value 100000003 -LabelEN 'Blocked'  -LabelPL 'Zablokowany'   -Color '#F44336')
    )

# 19. dvlp_suppliersource (Self-Billing new)
New-GlobalOptionSet -Name "${PublisherPrefix}_suppliersource" `
    -DisplayName 'Supplier Source' -Description 'How the supplier was added to the registry' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'KSeF Sync' -LabelPL 'Synchronizacja KSeF')
        (New-OptionItem -Value 100000002 -LabelEN 'Manual'    -LabelPL 'Ręczne')
        (New-OptionItem -Value 100000003 -LabelEN 'VAT API'   -LabelPL 'API VIES')
    )

# 20. dvlp_sbagreementstatus (Self-Billing new)
New-GlobalOptionSet -Name "${PublisherPrefix}_sbagreementstatus" `
    -DisplayName 'SB Agreement Status' -Description 'Status of the Self-Billing Agreement' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Active'     -LabelPL 'Aktywna'       -Color '#4CAF50')
        (New-OptionItem -Value 100000002 -LabelEN 'Expired'    -LabelPL 'Wygasła'       -Color '#FF9800')
        (New-OptionItem -Value 100000003 -LabelEN 'Terminated' -LabelPL 'Rozwiązana'    -Color '#F44336')
    )

# 21. dvlp_selfbillingstatus (Self-Billing new)
New-GlobalOptionSet -Name "${PublisherPrefix}_selfbillingstatus" `
    -DisplayName 'Self-Billing Status' -Description 'Workflow status of a self-billing invoice' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Draft'           -LabelPL 'Wersja robocza'       -Color '#9E9E9E')
        (New-OptionItem -Value 100000002 -LabelEN 'Pending Seller'  -LabelPL 'Oczekuje sprzedawcy'  -Color '#FF9800')
        (New-OptionItem -Value 100000003 -LabelEN 'Seller Approved' -LabelPL 'Zatwierdzona'         -Color '#4CAF50')
        (New-OptionItem -Value 100000004 -LabelEN 'Seller Rejected' -LabelPL 'Odrzucona'            -Color '#F44336')
        (New-OptionItem -Value 100000005 -LabelEN 'Sent to KSeF'    -LabelPL 'Wysłana do KSeF'      -Color '#1565C0')
    )

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Tables (12 total: 5 existing + 4 MPK + 3 Self-Billing new)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 2: Tables (12) ───" -ForegroundColor White

# --- Existing tables ---

# 2a. dvlp_ksefsetting
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsetting" `
    -DisplayName 'KSeF Setting' -DisplayNamePL 'Ustawienia KSeF' `
    -PluralName 'KSeF Settings' `
    -Description 'Configuration per company (NIP) for KSeF integration' `
    -PrimaryNameAttr "${PublisherPrefix}_nip" -PrimaryNameMaxLen 10 `
    -ChangeTracking $false -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $false `
    -Color '#1565C0'

# 2b. dvlp_ksefsession
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsession" `
    -DisplayName 'KSeF Session' -DisplayNamePL 'Sesja KSeF' `
    -PluralName 'KSeF Sessions' `
    -Description 'KSeF API communication sessions' `
    -PrimaryNameAttr "${PublisherPrefix}_sessionreference" -PrimaryNameMaxLen 100 `
    -ChangeTracking $false -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $false `
    -Color '#1565C0'

# 2c. dvlp_ksefsynclog
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsynclog" `
    -DisplayName 'KSeF Sync Log' -DisplayNamePL 'Log synchronizacji KSeF' `
    -PluralName 'KSeF Sync Logs' `
    -Description 'History of synchronization operations with KSeF' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 100 `
    -ChangeTracking $false -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $false `
    -Color '#1565C0'

# 2d. dvlp_ksefinvoice
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefinvoice" `
    -DisplayName 'KSeF Invoice' -DisplayNamePL 'Faktura KSeF' `
    -PluralName 'KSeF Invoices' `
    -Description 'Cost invoices downloaded from the Krajowy System e-Faktur (KSeF)' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 100 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -HasNotes $true -QuickCreate $true `
    -Color '#2E7D32'

# 2e. dvlp_aifeedback (note: entitySet = dvlp_ksefaifeedbacks but LogicalName is dvlp_aifeedback)
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_aifeedback" `
    -DisplayName 'AI Feedback' -DisplayNamePL 'Feedback AI' `
    -PluralName 'AI Feedbacks' `
    -Description 'User corrections to AI suggestions used for model learning' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 100 `
    -ChangeTracking $false -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $false `
    -Color '#1565C0'

# --- MPK new tables ---

# 2f. dvlp_ksefmpkcenter
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayName 'KSeF MPK Center' -DisplayNamePL 'Centrum MPK KSeF' `
    -PluralName 'KSeF MPK Centers' `
    -Description 'Dynamic cost centers (MPK) with budget and approval configuration' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 100 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -HasNotes $false -QuickCreate $true `
    -Color '#1565C0'

# 2g. dvlp_ksefmpkapprover
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefmpkapprover" `
    -DisplayName 'KSeF MPK Approver' -DisplayNamePL 'Akceptujący MPK KSeF' `
    -PluralName 'KSeF MPK Approvers' `
    -Description 'Junction table - users assigned as invoice approvers per MPK Center' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 254 `
    -Auditing $true -DuplicateDetection $true `
    -Color '#1565C0'

# 2h. dvlp_ksefnotification
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefnotification" `
    -DisplayName 'KSeF Notification' -DisplayNamePL 'Powiadomienie KSeF' `
    -PluralName 'KSeF Notifications' `
    -Description 'In-app notifications for approval workflow, SLA, and budget alerts' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -Auditing $false `
    -Color '#FF9800'

# 2i. dvlp_ksefwebhooksub
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefwebhooksub" `
    -DisplayName 'KSeF Webhook Subscription' -DisplayNamePL 'Subskrypcja Webhook KSeF' `
    -PluralName 'KSeF Webhook Subscriptions' `
    -Description 'Webhook subscriptions for push notifications from the KSeF connector' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -Color '#1565C0'

# --- Self-Billing new tables ---

# 2j. dvlp_ksefsupplier
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsupplier" `
    -DisplayName 'KSeF Supplier' -DisplayNamePL 'Dostawca KSeF' `
    -PluralName 'KSeF Suppliers' `
    -Description 'Supplier registry for self-billing invoice management' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 255 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -HasNotes $true -QuickCreate $true `
    -Color '#00897B'

# 2k. dvlp_ksefsbagrement
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsbagrement" `
    -DisplayName 'KSeF SB Agreement' -DisplayNamePL 'Umowa samofakturowania KSeF' `
    -PluralName 'KSeF SB Agreements' `
    -Description 'Self-billing agreements between buyer and supplier' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 255 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $false `
    -HasNotes $true -QuickCreate $false `
    -Color '#00897B'

# 2l. dvlp_ksefselfbillingtemplate
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -DisplayName 'KSeF SB Template' -DisplayNamePL 'Szablon samofakturowania KSeF' `
    -PluralName 'KSeF SB Templates' `
    -Description 'Templates for automatic self-billing invoice generation' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 255 `
    -ChangeTracking $false -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $true `
    -Color '#00897B'

# 2m. dvlp_ksefselfbillinginvoice
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -DisplayName 'KSeF Self-Billing Invoice' -DisplayNamePL 'Samofaktura KSeF' `
    -PluralName 'KSeF Self-Billing Invoices' `
    -Description 'Dedicated table for self-billing invoices (buyer-issued)' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $false `
    -Color '#1565C0'

# 2n. dvlp_ksefselfbillinglineitem
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -DisplayName 'KSeF Self-Billing Line Item' -DisplayNamePL 'Pozycja samofaktury KSeF' `
    -PluralName 'KSeF Self-Billing Line Items' `
    -Description 'Line items for self-billing invoices' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 500 `
    -ChangeTracking $false -Auditing $true -DuplicateDetection $false `
    -HasNotes $false -QuickCreate $false `
    -Color '#1565C0'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Columns on existing tables (non-lookup, non-primary-name)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 3: Columns on existing tables ───" -ForegroundColor White

# === dvlp_ksefsetting ===
Write-Host "  -- dvlp_ksefsetting --" -ForegroundColor DarkCyan

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_companyname" -DisplayNameEN 'Company Name' `
    -MaxLength 250 -RequiredLevel 'ApplicationRequired' -Searchable $true -Audit $true `
    -Description 'Full company name'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_environment" -DisplayNameEN 'KSeF Environment' `
    -GlobalOptionSetName "${PublisherPrefix}_ksefenvironment" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'KSeF API environment: test/demo/production'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_autosync" -DisplayNameEN 'Auto Sync' `
    -DefaultValue $false -Audit $true `
    -Description 'Enable automatic synchronization'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_syncinterval" -DisplayNameEN 'Sync Interval (min)' `
    -MinValue 5 -MaxValue 1440 `
    -Description 'Synchronization interval in minutes (5-1440)'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_lastsyncat" -DisplayNameEN 'Last Sync At' `
    -Description 'Timestamp of last synchronization'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_lastsyncstatus" -DisplayNameEN 'Last Sync Status' `
    -GlobalOptionSetName "${PublisherPrefix}_syncstatus" `
    -Description 'Status of last synchronization operation'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_keyvaultsecretname" -DisplayNameEN 'Key Vault Secret Name' `
    -MaxLength 100 -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Azure Key Vault secret name for KSeF token, e.g. ksef-token-{NIP}'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_tokenexpiresat" -DisplayNameEN 'Token Expires At' `
    -Description 'KSeF authorization token expiration timestamp'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_isactive" -DisplayNameEN 'Active' `
    -DefaultValue $true -Audit $true `
    -Description 'Whether this setting is active'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_invoiceprefix" -DisplayNameEN 'Invoice Prefix' `
    -MaxLength 10 `
    -Description 'Numbering prefix for invoices'

# === dvlp_ksefsession ===
Write-Host "  -- dvlp_ksefsession --" -ForegroundColor DarkCyan

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_nip" -DisplayNameEN 'NIP' `
    -MaxLength 10 -RequiredLevel 'ApplicationRequired' -Searchable $true `
    -Description 'Company NIP (denormalized)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_sessiontoken" -DisplayNameEN 'Session Token' `
    -MaxLength 500 `
    -Description 'Encrypted session token'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_sessiontype" -DisplayNameEN 'Session Type' `
    -GlobalOptionSetName "${PublisherPrefix}_sessiontype" `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Interactive or batch session type'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_startedat" -DisplayNameEN 'Started At' `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Session start timestamp'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_expiresat" -DisplayNameEN 'Expires At' `
    -Description 'Session expiration timestamp'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_terminatedat" -DisplayNameEN 'Terminated At' `
    -Description 'Session termination timestamp'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_sessionstatus" `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Session lifecycle status'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_invoicesprocessed" -DisplayNameEN 'Invoices Processed' `
    -MinValue 0 -MaxValue 2147483647 `
    -Description 'Number of invoices processed in session'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsession" `
    -SchemaName "${PublisherPrefix}_errormessage" -DisplayNameEN 'Error Message' `
    -MaxLength 2000 `
    -Description 'Error description if session failed'

# === dvlp_ksefsynclog ===
Write-Host "  -- dvlp_ksefsynclog --" -ForegroundColor DarkCyan

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_operationtype" -DisplayNameEN 'Operation Type' `
    -GlobalOptionSetName "${PublisherPrefix}_syncoperationtype" `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Type of sync operation'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_startedat" -DisplayNameEN 'Started At' `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Operation start timestamp'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_completedat" -DisplayNameEN 'Completed At' `
    -Description 'Operation completion timestamp'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_syncstatus" `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Operation result status'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_invoicesprocessed" -DisplayNameEN 'Processed' `
    -MinValue 0 -MaxValue 2147483647 `
    -Description 'Number of invoices processed'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_invoicesfailed" -DisplayNameEN 'Failed' `
    -MinValue 0 -MaxValue 2147483647 `
    -Description 'Number of invoices that failed'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_errormessage" -DisplayNameEN 'Error Message' `
    -MaxLength 10000 `
    -Description 'Detailed error description'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_requestpayload" -DisplayNameEN 'Request Payload' `
    -MaxLength 100000 `
    -Description 'Request payload for debugging'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsynclog" `
    -SchemaName "${PublisherPrefix}_responsepayload" -DisplayNameEN 'Response Payload' `
    -MaxLength 100000 `
    -Description 'Response payload for debugging'

# === dvlp_ksefinvoice ===
Write-Host "  -- dvlp_ksefinvoice --" -ForegroundColor DarkCyan

# Basic invoice data
Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_invoicedate" -DisplayNameEN 'Invoice Date' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Invoice issue date'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_saledate" -DisplayNameEN 'Sale Date' `
    -Format 'DateOnly' `
    -Description 'Sale/service delivery date'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_duedate" -DisplayNameEN 'Due Date' `
    -Format 'DateOnly' `
    -Description 'Payment due date'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_invoicetype" -DisplayNameEN 'Invoice Type' `
    -GlobalOptionSetName "${PublisherPrefix}_invoicetype" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Document type: VAT, corrective, advance'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_description" -DisplayNameEN 'Description' `
    -MaxLength 500 `
    -Description 'Additional description or comment'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_invoicenumber" -DisplayNameEN 'Invoice Number' `
    -MaxLength 100 -Searchable $true `
    -Description 'Dedicated invoice number field'

# Seller data
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_sellernip" -DisplayNameEN 'Seller NIP' `
    -MaxLength 10 -RequiredLevel 'ApplicationRequired' -Searchable $true -Audit $true `
    -Description 'Supplier NIP number'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_sellername" -DisplayNameEN 'Seller Name' `
    -MaxLength 500 -RequiredLevel 'ApplicationRequired' -Searchable $true `
    -Description 'Full seller/supplier name'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_selleraddress" -DisplayNameEN 'Seller Address' `
    -MaxLength 500 `
    -Description 'Seller street address'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_sellercity" -DisplayNameEN 'Seller City' `
    -MaxLength 100 `
    -Description 'Seller city'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_sellerpostalcode" -DisplayNameEN 'Seller Postal Code' `
    -MaxLength 20 `
    -Description 'Seller postal code'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_sellercountry" -DisplayNameEN 'Seller Country' `
    -MaxLength 100 `
    -Description 'Seller country'

# Buyer data
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_buyernip" -DisplayNameEN 'Buyer NIP' `
    -MaxLength 10 -RequiredLevel 'ApplicationRequired' -Searchable $true `
    -Description 'Our company NIP (buyer/tenant)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_buyername" -DisplayNameEN 'Buyer Name' `
    -MaxLength 500 `
    -Description 'Buyer (our company) name'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_buyeraddress" -DisplayNameEN 'Buyer Address' `
    -MaxLength 500 `
    -Description 'Buyer street address'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_buyercity" -DisplayNameEN 'Buyer City' `
    -MaxLength 100 `
    -Description 'Buyer city'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_buyerpostalcode" -DisplayNameEN 'Buyer Postal Code' `
    -MaxLength 20 `
    -Description 'Buyer postal code'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_buyercountry" -DisplayNameEN 'Buyer Country' `
    -MaxLength 100 `
    -Description 'Buyer country'

# Amounts
Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_netamount" -DisplayNameEN 'Net Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999999.99 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Net total amount'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_vatamount" -DisplayNameEN 'VAT Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999999.99 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'VAT tax total'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_grossamount" -DisplayNameEN 'Gross Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999999.99 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Gross total amount'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_currency" -DisplayNameEN 'Currency' `
    -GlobalOptionSetName "${PublisherPrefix}_currency" `
    -DefaultValue 100000000 -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Invoice currency (default PLN)'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_exchangerate" -DisplayNameEN 'Exchange Rate' `
    -Precision 4 -MinValue 0 -MaxValue 999.9999 `
    -Description 'Exchange rate to PLN (1.0 for PLN invoices)'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_grossamountpln" -DisplayNameEN 'Gross Amount (PLN)' `
    -Precision 2 -MinValue 0 -MaxValue 999999999999.99 `
    -Description 'Gross amount converted to PLN'

# Payment status
Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_paymentstatus" -DisplayNameEN 'Payment Status' `
    -GlobalOptionSetName "${PublisherPrefix}_paymentstatus" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Invoice payment status'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_paidat" -DisplayNameEN 'Paid At' `
    -Description 'Payment date'

# Categorization
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_category" -DisplayNameEN 'Category' `
    -MaxLength 100 `
    -Description 'Cost category (text)'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_costcenter" -DisplayNameEN 'Cost Center (MPK)' `
    -GlobalOptionSetName "${PublisherPrefix}_costcenter" `
    -Description 'Legacy MPK OptionSet (being replaced by dynamic mpkcenter table)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_project" -DisplayNameEN 'Project' `
    -MaxLength 100 `
    -Description 'Project assignment'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_tags" -DisplayNameEN 'Tags' `
    -MaxLength 500 `
    -Description 'Comma-separated tags'

# AI categorization fields
Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_aimpksuggestion" -DisplayNameEN 'AI MPK Suggestion' `
    -GlobalOptionSetName "${PublisherPrefix}_costcenter" -Audit $true `
    -Description 'MPK suggested by AI categorization'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_aicategorysuggestion" -DisplayNameEN 'AI Category Suggestion' `
    -MaxLength 100 -Searchable $true -Audit $true `
    -Description 'Cost category suggested by AI'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_aidescription" -DisplayNameEN 'AI Description' `
    -MaxLength 500 `
    -Description 'Short AI-generated description of the invoice'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_airationale" -DisplayNameEN 'AI Rationale' `
    -MaxLength 500 `
    -Description 'AI reasoning for the categorization decision'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_aiconfidence" -DisplayNameEN 'AI Confidence' `
    -Precision 2 -MinValue 0 -MaxValue 1 `
    -Description 'AI model confidence score (0.00-1.00)'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_aiprocessedat" -DisplayNameEN 'AI Processed At' `
    -Description 'Timestamp when AI categorization was performed'

# KSeF metadata
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_ksefreferencenumber" -DisplayNameEN 'KSeF Reference Number' `
    -MaxLength 50 -Searchable $true `
    -Description 'Unique reference number from KSeF'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_ksefstatus" -DisplayNameEN 'KSeF Status' `
    -GlobalOptionSetName "${PublisherPrefix}_ksefstatus" `
    -Description 'KSeF synchronization status'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_ksefdirection" -DisplayNameEN 'Direction' `
    -GlobalOptionSetName "${PublisherPrefix}_ksefdirection" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Incoming or outgoing invoice'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_ksefdownloadedat" -DisplayNameEN 'Downloaded from KSeF' `
    -Description 'When downloaded from KSeF'

# Note: dvlp_downloadedat also referenced in entities.ts as importedAt
Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_downloadedat" -DisplayNameEN 'Imported At' `
    -Description 'When the invoice was imported into the system'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_ksefrawxml" -DisplayNameEN 'KSeF Raw XML' `
    -MaxLength 1048576 `
    -Description 'Raw XML in FA(2) format from KSeF'

# Source
Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_source" -DisplayNameEN 'Source' `
    -GlobalOptionSetName "${PublisherPrefix}_invoicesource" `
    -Description 'How the invoice entered the system'

# Correction fields
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_correctedinvoicenumber" -DisplayNameEN 'Corrected Invoice Number' `
    -MaxLength 100 `
    -Description 'Original invoice number for corrective invoices'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_correctionreason" -DisplayNameEN 'Correction Reason' `
    -MaxLength 500 `
    -Description 'Reason for the invoice correction'

# Document file column
Add-FileColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_doc" -DisplayNameEN 'Document' `
    -MaxSizeInKB 32768 `
    -Description 'Invoice image or scan (PDF, JPG, PNG)'

# MPK approval fields (from DATAVERSE-MPK-SPEC.md)
Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_approvalstatus" -DisplayNameEN 'Approval Status' `
    -GlobalOptionSetName "${PublisherPrefix}_approvalstatus" -DefaultValue 0 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Approval workflow state machine'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_approvedby" -DisplayNameEN 'Approved By' `
    -MaxLength 200 -Searchable $true -Audit $true `
    -Description 'Full name of the person who made the approval decision'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_approvedbyoid" -DisplayNameEN 'Approved By OID' `
    -MaxLength 50 -Audit $true `
    -Description 'Azure Entra ID OID of the decision maker (audit trail)'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_approvedat" -DisplayNameEN 'Approved At' `
    -Audit $true -Description 'Timestamp of the approval/rejection/cancellation decision'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_approvalcomment" -DisplayNameEN 'Approval Comment' `
    -MaxLength 1000 -Audit $true `
    -Description 'Optional comment from the approver explaining the decision'

# === dvlp_aifeedback ===
Write-Host "  -- dvlp_aifeedback --" -ForegroundColor DarkCyan

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_tenantnip" -DisplayNameEN 'Tenant NIP' `
    -MaxLength 10 -RequiredLevel 'ApplicationRequired' -Searchable $true `
    -Description 'Tenant company NIP'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_suppliernip" -DisplayNameEN 'Supplier NIP' `
    -MaxLength 15 -RequiredLevel 'ApplicationRequired' -Searchable $true `
    -Description 'Supplier NIP'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_suppliername" -DisplayNameEN 'Supplier Name' `
    -MaxLength 250 -RequiredLevel 'ApplicationRequired' `
    -Description 'Supplier name'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_invoicedescription" -DisplayNameEN 'Invoice Context' `
    -MaxLength 500 `
    -Description 'Fragment of invoice description/items for context'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_aimpksuggestion" -DisplayNameEN 'AI MPK Suggestion' `
    -MaxLength 50 `
    -Description 'MPK suggested by AI'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_aicategorysuggestion" -DisplayNameEN 'AI Category Suggestion' `
    -MaxLength 100 `
    -Description 'Category suggested by AI'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_aiconfidence" -DisplayNameEN 'AI Confidence' `
    -Precision 2 -MinValue 0 -MaxValue 1 `
    -Description 'AI model confidence score'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_usermpk" -DisplayNameEN 'User MPK' `
    -MaxLength 50 `
    -Description 'MPK chosen by user'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_usercategory" -DisplayNameEN 'User Category' `
    -MaxLength 100 `
    -Description 'Category chosen by user'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_aifeedback" `
    -SchemaName "${PublisherPrefix}_feedbacktype" -DisplayNameEN 'Feedback Type' `
    -GlobalOptionSetName "${PublisherPrefix}_feedbacktype" `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'User reaction: applied/modified/rejected'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Columns on MPK new tables (non-lookup)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 4: Columns on MPK tables ───" -ForegroundColor White

# --- dvlp_ksefmpkcenter ---
Write-Host "  -- dvlp_ksefmpkcenter --" -ForegroundColor DarkCyan

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_description" -DisplayNameEN 'Description' `
    -MaxLength 500 -Description 'Optional description of the MPK Center'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_isactive" -DisplayNameEN 'Active' `
    -DefaultValue $true -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Soft delete - deactivated MPK Centers are hidden from selection lists'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_approvalrequired" -DisplayNameEN 'Approval Required' `
    -DefaultValue $false -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'When enabled, invoices assigned to this MPK Center enter approval workflow'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_approvalslahours" -DisplayNameEN 'Approval SLA (hours)' `
    -MinValue 1 -MaxValue 720 -Audit $true `
    -Description 'Expected decision time in hours. Leave empty to disable SLA monitoring'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_budgetamount" -DisplayNameEN 'Budget Amount (PLN)' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 -Audit $true `
    -Description 'Budget allocation per period in PLN. Empty or 0 = no budget tracking'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_budgetperiod" -DisplayNameEN 'Budget Period' `
    -GlobalOptionSetName "${PublisherPrefix}_budgetperiod" -Audit $true `
    -Description 'Budget cycle period. Required when budgetAmount > 0'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_budgetstartdate" -DisplayNameEN 'Budget Start Date' `
    -Format 'DateOnly' -Audit $true `
    -Description 'Reference point for budget cycle calculation'

# --- dvlp_ksefnotification ---
Write-Host "  -- dvlp_ksefnotification --" -ForegroundColor DarkCyan

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefnotification" `
    -SchemaName "${PublisherPrefix}_type" -DisplayNameEN 'Type' `
    -GlobalOptionSetName "${PublisherPrefix}_notificationtype" `
    -RequiredLevel 'ApplicationRequired' `
    -Description 'Type of notification'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefnotification" `
    -SchemaName "${PublisherPrefix}_message" -DisplayNameEN 'Message' `
    -MaxLength 1000 -Description 'Notification body text'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefnotification" `
    -SchemaName "${PublisherPrefix}_isread" -DisplayNameEN 'Read' `
    -DefaultValue $false -RequiredLevel 'ApplicationRequired' `
    -Description 'Set to true when user clicks the notification'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefnotification" `
    -SchemaName "${PublisherPrefix}_isdismissed" -DisplayNameEN 'Dismissed' `
    -DefaultValue $false -RequiredLevel 'ApplicationRequired' `
    -Description 'Set to true when user dismisses the notification'

# --- dvlp_ksefwebhooksub ---
Write-Host "  -- dvlp_ksefwebhooksub --" -ForegroundColor DarkCyan

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefwebhooksub" `
    -SchemaName "${PublisherPrefix}_callbackurl" -DisplayNameEN 'Callback URL' `
    -MaxLength 500 -RequiredLevel 'ApplicationRequired' -Audit $true -Format 'Url' `
    -Description 'HTTPS endpoint invoked on matching events'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefwebhooksub" `
    -SchemaName "${PublisherPrefix}_eventtypes" -DisplayNameEN 'Event Types' `
    -MaxLength 500 -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'CSV event types, e.g. InvoiceCreated,InvoiceApproved,BudgetExceeded'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefwebhooksub" `
    -SchemaName "${PublisherPrefix}_isactive" -DisplayNameEN 'Active' `
    -DefaultValue $true -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Auto-deactivated after 5 consecutive failures'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefwebhooksub" `
    -SchemaName "${PublisherPrefix}_expiresat" -DisplayNameEN 'Expires At' `
    -RequiredLevel 'ApplicationRequired' -Audit $false `
    -Description 'Subscription expiration. Max 30 days from creation, renewable.'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefwebhooksub" `
    -SchemaName "${PublisherPrefix}_failcount" -DisplayNameEN 'Fail Count' `
    -MinValue 0 -MaxValue 100 -RequiredLevel 'ApplicationRequired' `
    -Description 'Consecutive failed callbacks. Reset on success. Auto-deactivate at 5.'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefwebhooksub" `
    -SchemaName "${PublisherPrefix}_secret" -DisplayNameEN 'Secret' `
    -MaxLength 100 -Description 'Optional HMAC secret for payload signing'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4b — Columns on Self-Billing new tables (non-lookup)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 4b: Columns on Self-Billing tables ───" -ForegroundColor White

# --- dvlp_ksefsupplier ---
Write-Host "  -- dvlp_ksefsupplier --" -ForegroundColor DarkCyan

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_nip" -DisplayNameEN 'NIP' `
    -MaxLength 10 -RequiredLevel 'ApplicationRequired' -Searchable $true -Audit $true `
    -Description 'Supplier tax identification number (NIP)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_shortname" -DisplayNameEN 'Short Name' `
    -MaxLength 100 -Searchable $true `
    -Description 'Short display name for supplier'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_regon" -DisplayNameEN 'REGON' `
    -MaxLength 14 `
    -Description 'REGON number'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_krs" -DisplayNameEN 'KRS' `
    -MaxLength 10 `
    -Description 'KRS number'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_street" -DisplayNameEN 'Street' `
    -MaxLength 250 `
    -Description 'Street address'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_city" -DisplayNameEN 'City' `
    -MaxLength 100 `
    -Description 'City'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_postalcode" -DisplayNameEN 'Postal Code' `
    -MaxLength 10 `
    -Description 'Postal code'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_country" -DisplayNameEN 'Country' `
    -MaxLength 100 `
    -Description 'Country'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_email" -DisplayNameEN 'Email' `
    -MaxLength 200 -Format 'Email' `
    -Description 'Contact email'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_phone" -DisplayNameEN 'Phone' `
    -MaxLength 20 -Format 'Phone' `
    -Description 'Contact phone'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_bankaccount" -DisplayNameEN 'Bank Account' `
    -MaxLength 50 `
    -Description 'Bank account number (IBAN)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_vatstatus" -DisplayNameEN 'VAT Status' `
    -MaxLength 50 `
    -Description 'VAT payer status from MF API'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_vatstatusdate" -DisplayNameEN 'VAT Status Date' `
    -Format 'DateOnly' `
    -Description 'Date of last VAT status check'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_paymenttermsdays" -DisplayNameEN 'Payment Terms (days)' `
    -MinValue 0 -MaxValue 365 `
    -Description 'Default payment terms in days'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_defaultcategory" -DisplayNameEN 'Default Category' `
    -MaxLength 100 `
    -Description 'Default cost category for this supplier'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_notes" -DisplayNameEN 'Notes' `
    -MaxLength 10000 `
    -Description 'Free-text notes about the supplier'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_tags" -DisplayNameEN 'Tags' `
    -MaxLength 500 `
    -Description 'Comma-separated tags for filtering'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_hasselfbillingagreement" -DisplayNameEN 'Has SB Agreement' `
    -DefaultValue $false -Audit $true `
    -Description 'True when an active self-billing agreement exists'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_selfbillingagreementdate" -DisplayNameEN 'SB Agreement Date' `
    -Format 'DateOnly' `
    -Description 'Date of the self-billing agreement'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_selfbillingagreementexpiry" -DisplayNameEN 'SB Agreement Expiry' `
    -Format 'DateOnly' `
    -Description 'Expiry date of the self-billing agreement'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_firstinvoicedate" -DisplayNameEN 'First Invoice Date' `
    -Format 'DateOnly' `
    -Description 'Date of the earliest invoice from this supplier'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_lastinvoicedate" -DisplayNameEN 'Last Invoice Date' `
    -Format 'DateOnly' `
    -Description 'Date of the most recent invoice from this supplier'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_totalinvoicecount" -DisplayNameEN 'Total Invoice Count' `
    -MinValue 0 -MaxValue 2147483647 `
    -Description 'Cached total number of invoices from this supplier'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_totalgrossamount" -DisplayNameEN 'Total Gross Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999999.99 `
    -Description 'Cached total gross amount of all invoices'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_supplierstatus" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Supplier lifecycle status: Active/Inactive/Blocked'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_source" -DisplayNameEN 'Source' `
    -GlobalOptionSetName "${PublisherPrefix}_suppliersource" `
    -Description 'How the supplier was added: KSeF Sync/Manual/VAT API'

# --- dvlp_ksefsbagrement ---
Write-Host "  -- dvlp_ksefsbagrement --" -ForegroundColor DarkCyan

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_agreementdate" -DisplayNameEN 'Agreement Date' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Date the self-billing agreement was signed'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_validfrom" -DisplayNameEN 'Valid From' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' `
    -Description 'Agreement validity start date'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_validto" -DisplayNameEN 'Valid To' `
    -Format 'DateOnly' `
    -Description 'Agreement validity end date (null = indefinite)'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_renewaldate" -DisplayNameEN 'Renewal Date' `
    -Format 'DateOnly' `
    -Description 'Next renewal date'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_approvalprocedure" -DisplayNameEN 'Approval Procedure' `
    -MaxLength 500 `
    -Description 'Description of the approval procedure between buyer and seller'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_sbagreementstatus" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Agreement lifecycle status: Active/Expired/Terminated'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_credentialreference" -DisplayNameEN 'Credential Reference' `
    -MaxLength 200 `
    -Description 'Reference to authorization credential or certificate for this agreement'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_notes" -DisplayNameEN 'Notes' `
    -MaxLength 10000 `
    -Description 'Notes about the agreement'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_hasdocument" -DisplayNameEN 'Has Document' `
    -DefaultValue $false `
    -Description 'True when a signed agreement document has been uploaded'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_documentfilename" -DisplayNameEN 'Document Filename' `
    -MaxLength 255 `
    -Description 'Filename of the uploaded agreement document'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_autoapprove" -DisplayNameEN 'Auto-Approve Invoices' `
    -DefaultValue $false -Audit $true `
    -Description 'When true, self-billing invoices skip seller approval and are automatically approved on submit'

# --- dvlp_ksefselfbillingtemplate ---
Write-Host "  -- dvlp_ksefselfbillingtemplate --" -ForegroundColor DarkCyan

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_description" -DisplayNameEN 'Description' `
    -MaxLength 2000 `
    -Description 'Template description or notes'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_itemdescription" -DisplayNameEN 'Item Description' `
    -MaxLength 500 -RequiredLevel 'ApplicationRequired' `
    -Description 'Default line item description for invoices created from this template'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_quantity" -DisplayNameEN 'Quantity' `
    -Precision 4 -MinValue 0 -MaxValue 999999.9999 `
    -Description 'Default item quantity'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_unit" -DisplayNameEN 'Unit' `
    -MaxLength 20 `
    -Description 'Unit of measure (e.g. szt., godz., usł.)'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_unitprice" -DisplayNameEN 'Unit Price' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Default unit price (net)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_vatrate" -DisplayNameEN 'VAT Rate' `
    -MaxLength 10 `
    -Description 'VAT rate code (e.g. 23, 8, 5, 0, zw, np)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_currency" -DisplayNameEN 'Currency' `
    -MaxLength 3 `
    -Description 'Currency code (ISO 4217, e.g. PLN, EUR)'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_isactive" -DisplayNameEN 'Active' `
    -DefaultValue $true -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Inactive templates are hidden from selection'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_sortorder" -DisplayNameEN 'Sort Order' `
    -MinValue 0 -MaxValue 9999 `
    -Description 'Display order within supplier template list'

# --- dvlp_ksefselfbillinginvoice ---
Write-Host "  -- dvlp_ksefselfbillinginvoice --" -ForegroundColor DarkCyan

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_invoicedate" -DisplayNameEN 'Invoice Date' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Invoice issue date'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_duedate" -DisplayNameEN 'Due Date' `
    -Format 'DateOnly' -Audit $true `
    -Description 'Payment due date'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_netamount" -DisplayNameEN 'Net Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Total net amount'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_vatamount" -DisplayNameEN 'VAT Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Total VAT amount'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_grossamount" -DisplayNameEN 'Gross Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Total gross amount'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_currency" -DisplayNameEN 'Currency' `
    -MaxLength 3 -Description 'Currency code (default PLN)'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_selfbillingstatus" -DefaultValue 100000001 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Self-billing invoice workflow status'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_sellerrejectionreason" -DisplayNameEN 'Seller Rejection Reason' `
    -MaxLength 1000 -Audit $true `
    -Description 'Reason provided by seller when rejecting a self-billing invoice'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_sentdate" -DisplayNameEN 'Sent Date' `
    -Audit $true -Description 'Date when self-billing invoice was sent to KSeF'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_ksefreferencenumber" -DisplayNameEN 'KSeF Reference Number' `
    -MaxLength 100 -Searchable $true `
    -Description 'KSeF reference number assigned after submission'

# --- dvlp_ksefselfbillinglineitem ---
Write-Host "  -- dvlp_ksefselfbillinglineitem --" -ForegroundColor DarkCyan

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_quantity" -DisplayNameEN 'Quantity' `
    -Precision 3 -MinValue 0 -MaxValue 999999.999 -RequiredLevel 'ApplicationRequired' `
    -Description 'Quantity'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_unit" -DisplayNameEN 'Unit' `
    -MaxLength 20 -RequiredLevel 'ApplicationRequired' `
    -Description 'Unit of measure'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_unitprice" -DisplayNameEN 'Unit Price' `
    -Precision 2 -MinValue 0 -MaxValue 999999.99 -RequiredLevel 'ApplicationRequired' `
    -Description 'Unit price (net)'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_vatrate" -DisplayNameEN 'VAT Rate' `
    -MinValue -1 -MaxValue 100 -RequiredLevel 'ApplicationRequired' `
    -Description 'VAT rate in percent (23, 8, 5, 0, -1=exempt)'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_netamount" -DisplayNameEN 'Net Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Line net amount'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_vatamount" -DisplayNameEN 'VAT Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Line VAT amount'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_grossamount" -DisplayNameEN 'Gross Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 `
    -Description 'Line gross amount'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_paymenttermsdays" -DisplayNameEN 'Payment Terms (days)' `
    -MinValue 0 -MaxValue 365 `
    -Description 'Payment terms for this line item'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -SchemaName "${PublisherPrefix}_sortorder" -DisplayNameEN 'Sort Order' `
    -MinValue 0 -MaxValue 999 `
    -Description 'Display order of the line item'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Lookup Relationships (existing tables)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 5: Lookup Relationships (existing tables) ───" -ForegroundColor White

# dvlp_ksefsession -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_sessions" `
    -ReferencingEntity "${PublisherPrefix}_ksefsession" `
    -ReferencingAttribute "${PublisherPrefix}_ksefsettingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'KSeF Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Setting for this session'

# dvlp_ksefsynclog -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_synclogs" `
    -ReferencingEntity "${PublisherPrefix}_ksefsynclog" `
    -ReferencingAttribute "${PublisherPrefix}_ksefsettingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'KSeF Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Setting for this sync log'

# dvlp_ksefsynclog -> dvlp_ksefsession
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsession_synclogs" `
    -ReferencingEntity "${PublisherPrefix}_ksefsynclog" `
    -ReferencingAttribute "${PublisherPrefix}_ksefsessionid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsession" `
    -DisplayNameEN 'KSeF Session' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Optional session reference'

# dvlp_ksefinvoice -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_invoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefinvoice" `
    -ReferencingAttribute "${PublisherPrefix}_ksefsettingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'KSeF Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Company configuration for this invoice'

# dvlp_ksefinvoice -> dvlp_ksefsession (optional)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsession_invoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefinvoice" `
    -ReferencingAttribute "${PublisherPrefix}_ksefsessionid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsession" `
    -DisplayNameEN 'KSeF Session' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Session that fetched this invoice'

# dvlp_ksefinvoice -> dvlp_ksefinvoice (self-ref for corrections)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefinvoice_parent" `
    -ReferencingEntity "${PublisherPrefix}_ksefinvoice" `
    -ReferencingAttribute "${PublisherPrefix}_parentinvoiceid" `
    -ReferencedEntity "${PublisherPrefix}_ksefinvoice" `
    -DisplayNameEN 'Parent Invoice' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Original invoice for corrections'

# dvlp_aifeedback -> dvlp_ksefinvoice
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefinvoice_feedbacks" `
    -ReferencingEntity "${PublisherPrefix}_aifeedback" `
    -ReferencingAttribute "${PublisherPrefix}_invoiceid" `
    -ReferencedEntity "${PublisherPrefix}_ksefinvoice" `
    -DisplayNameEN 'Invoice' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Source invoice for this feedback'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Lookup Relationships (MPK tables)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 6: Lookup Relationships (MPK tables) ───" -ForegroundColor White

# dvlp_ksefmpkcenter -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_mpkcenters" `
    -ReferencingEntity "${PublisherPrefix}_ksefmpkcenter" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefmpkapprover -> dvlp_ksefmpkcenter
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_approvers" `
    -ReferencingEntity "${PublisherPrefix}_ksefmpkapprover" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'MPK Center' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'MPK Center this user is assigned to approve for'

# dvlp_ksefmpkapprover -> systemuser
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_mpkapprovers" `
    -ReferencingEntity "${PublisherPrefix}_ksefmpkapprover" `
    -ReferencingAttribute "${PublisherPrefix}_systemuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Approver' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Dataverse system user assigned as approver'

# dvlp_ksefnotification -> systemuser
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_recipientid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Recipient' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Notification recipient'

# dvlp_ksefnotification -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefnotification -> dvlp_ksefinvoice
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefinvoice_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_invoiceid" `
    -ReferencedEntity "${PublisherPrefix}_ksefinvoice" `
    -DisplayNameEN 'Related Invoice' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Optional link to the related invoice for navigation'

# dvlp_ksefnotification -> dvlp_ksefmpkcenter
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'Related MPK' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Optional link to the related MPK Center for budget alerts'

# dvlp_ksefwebhooksub -> systemuser
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_webhooksubs" `
    -ReferencingEntity "${PublisherPrefix}_ksefwebhooksub" `
    -ReferencingAttribute "${PublisherPrefix}_systemuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Subscriber' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Webhook subscription owner'

# dvlp_ksefwebhooksub -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_webhooksubs" `
    -ReferencingEntity "${PublisherPrefix}_ksefwebhooksub" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation (Restrict - cannot delete setting with active webhooks)'

# dvlp_ksefinvoice -> dvlp_ksefmpkcenter (NEW column on invoice)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_invoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefinvoice" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'MPK Center' `
    -CascadeDelete 'Restrict' `
    -Description 'Dynamic MPK Center assignment. Replaces legacy dvlp_costcenter OptionSet.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6b — Lookup Relationships (Self-Billing tables)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 6b: Lookup Relationships (Self-Billing tables) ───" -ForegroundColor White

# dvlp_ksefsupplier -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_suppliers" `
    -ReferencingEntity "${PublisherPrefix}_ksefsupplier" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefsupplier -> dvlp_ksefmpkcenter (default MPK)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_suppliers" `
    -ReferencingEntity "${PublisherPrefix}_ksefsupplier" `
    -ReferencingAttribute "${PublisherPrefix}_defaultmpkid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'Default MPK' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Default MPK Center for invoices from this supplier'

# dvlp_ksefsbagrement -> dvlp_ksefsupplier
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsupplier_sbagrements" `
    -ReferencingEntity "${PublisherPrefix}_ksefsbagrement" `
    -ReferencingAttribute "${PublisherPrefix}_supplierid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsupplier" `
    -DisplayNameEN 'Supplier' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Supplier this agreement belongs to'

# dvlp_ksefsbagrement -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_sbagrements" `
    -ReferencingEntity "${PublisherPrefix}_ksefsbagrement" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefselfbillingtemplate -> dvlp_ksefsupplier
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsupplier_sbtemplates" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillingtemplate" `
    -ReferencingAttribute "${PublisherPrefix}_supplierid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsupplier" `
    -DisplayNameEN 'Supplier' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Supplier this template belongs to'

# dvlp_ksefselfbillingtemplate -> dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_sbtemplates" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillingtemplate" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# --- dvlp_ksefselfbillinginvoice lookups ---

# dvlp_ksefselfbillinginvoice -> dvlp_ksefsetting (Required, Restrict)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_sbinvoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefselfbillinginvoice -> dvlp_ksefsupplier (Required, Restrict)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsupplier_sbinvoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_supplierid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsupplier" `
    -DisplayNameEN 'Supplier' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Supplier this self-billing invoice is issued to'

# dvlp_ksefselfbillinginvoice -> dvlp_ksefsbagrement (Optional, RemoveLink)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsbagrement_sbinvoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_sbagreementid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsbagrement" `
    -DisplayNameEN 'Self-Billing Agreement' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Self-billing agreement this invoice was created under'

# dvlp_ksefselfbillinginvoice -> dvlp_ksefinvoice (Optional, RemoveLink)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefinvoice_sbinvoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_kseFinvoiceid" `
    -ReferencedEntity "${PublisherPrefix}_ksefinvoice" `
    -DisplayNameEN 'KSeF Invoice' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Link to the corresponding KSeF invoice record after submission'

# dvlp_ksefselfbillinginvoice -> dvlp_ksefmpkcenter (Optional, RemoveLink)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_sbinvoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'MPK Center' `
    -CascadeDelete 'RemoveLink' `
    -Description 'MPK Center for cost allocation'

# --- dvlp_ksefselfbillinglineitem lookups ---

# dvlp_ksefselfbillinglineitem -> dvlp_ksefselfbillinginvoice (Required, Cascade)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefselfbillinginvoice_lineitems" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinglineitem" `
    -ReferencingAttribute "${PublisherPrefix}_sbinvoiceid" `
    -ReferencedEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -DisplayNameEN 'Self-Billing Invoice' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Parent self-billing invoice'

# dvlp_ksefselfbillinglineitem -> dvlp_ksefselfbillingtemplate (Optional, RemoveLink)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefselfbillingtemplate_lineitems" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinglineitem" `
    -ReferencingAttribute "${PublisherPrefix}_templateid" `
    -ReferencedEntity "${PublisherPrefix}_ksefselfbillingtemplate" `
    -DisplayNameEN 'Template' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Template this line item was created from (for traceability)'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Alternate Keys
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 7: Alternate Keys ───" -ForegroundColor White

# dvlp_ksefsetting — unique by NIP
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefsetting" `
    -SchemaName "${PublisherPrefix}_nip_key" `
    -DisplayNameEN 'Unique NIP' `
    -KeyAttributes @("${PublisherPrefix}_nip")

# dvlp_ksefinvoice — unique KSeF reference number
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_ksefref_key" `
    -DisplayNameEN 'Unique KSeF Reference' `
    -KeyAttributes @("${PublisherPrefix}_ksefreferencenumber")

# dvlp_ksefinvoice — composite: seller+number+date
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefinvoice" `
    -SchemaName "${PublisherPrefix}_invoice_composite_key" `
    -DisplayNameEN 'Unique Invoice (NIP+Number+Date)' `
    -KeyAttributes @("${PublisherPrefix}_sellernip", "${PublisherPrefix}_name", "${PublisherPrefix}_invoicedate")

# dvlp_ksefmpkcenter — unique name per tenant
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_name_settingid" `
    -DisplayNameEN 'Unique MPK name per tenant' `
    -KeyAttributes @("${PublisherPrefix}_name", "${PublisherPrefix}_settingid")

# dvlp_ksefmpkapprover — one approver per MPK Center
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefmpkapprover" `
    -SchemaName "${PublisherPrefix}_mpkcenterid_systemuserid" `
    -DisplayNameEN 'One approver per MPK Center' `
    -KeyAttributes @("${PublisherPrefix}_mpkcenterid", "${PublisherPrefix}_systemuserid")

# dvlp_ksefsupplier — unique NIP per tenant
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_supplier_nip_setting" `
    -DisplayNameEN 'Unique supplier NIP per tenant' `
    -KeyAttributes @("${PublisherPrefix}_nip", "${PublisherPrefix}_settingid")

# dvlp_ksefsbagrement — unique name per supplier
Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_sbagrement_name_supplier" `
    -DisplayNameEN 'Unique SB agreement name per supplier' `
    -KeyAttributes @("${PublisherPrefix}_name", "${PublisherPrefix}_supplierid")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Publish customizations
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 8: Publish ───" -ForegroundColor White

if (-not $DryRun) {
    Write-Host "  Publishing all customizations..." -ForegroundColor DarkGray -NoNewline
    $allEntities = @(
        "${PublisherPrefix}_ksefsetting"
        "${PublisherPrefix}_ksefsession"
        "${PublisherPrefix}_ksefsynclog"
        "${PublisherPrefix}_ksefinvoice"
        "${PublisherPrefix}_aifeedback"
        "${PublisherPrefix}_ksefmpkcenter"
        "${PublisherPrefix}_ksefmpkapprover"
        "${PublisherPrefix}_ksefnotification"
        "${PublisherPrefix}_ksefwebhooksub"
        "${PublisherPrefix}_ksefsupplier"
        "${PublisherPrefix}_ksefsbagrement"
        "${PublisherPrefix}_ksefselfbillingtemplate"
        "${PublisherPrefix}_ksefselfbillinginvoice"
        "${PublisherPrefix}_ksefselfbillinglineitem"
    )
    $entityXml = ($allEntities | ForEach-Object { "<entity>$_</entity>" }) -join ''
    $publishBody = @{
        ParameterXml = "<importexportxml><entities>$entityXml</entities></importexportxml>"
    }
    try {
        Invoke-RestMethod -Method POST `
            -Uri "$baseUri/PublishXml" `
            -Headers (Get-Headers) `
            -Body ($publishBody | ConvertTo-Json -Depth 5 -Compress)
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " WARN - publish manually in maker portal" -ForegroundColor Yellow
    }
}
else {
    Write-Host "[DRY-RUN] Would publish all customizations" -ForegroundColor Cyan
}

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Full environment provisioning complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host @"

Summary:
  - 21 Global OptionSets (17 existing + 4 Self-Billing new)
  - 14 Tables (5 existing + 4 MPK + 5 Self-Billing)
  - All columns (String, Boolean, Integer, Decimal, DateTime, Memo, Picklist, File)
  - All Lookup relationships with cascade configuration
  - 7 Alternate Keys

Next steps (manual):
  1. Verify tables in Power Apps Maker Portal
  2. Configure views and forms layout
  3. Add Business Rules
  4. Set up Security Roles (see DATAVERSE_SCHEMAT.md + DATAVERSE-MPK-SPEC.md)
  5. Run seed data script if needed (see DATAVERSE-MPK-SPEC.md section 11)
"@
