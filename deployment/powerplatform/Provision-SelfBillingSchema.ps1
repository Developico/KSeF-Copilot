<#
.SYNOPSIS
    Provisions the Self-Billing / Supplier Registry Dataverse schema.
    Based on: docs/internal/SELF-BILLING-PLAN.md

.DESCRIPTION
    Creates:
    - 4 Global OptionSets (dvlp_supplierstatus, dvlp_suppliersource, dvlp_sbagreementstatus, dvlp_selfbillingstatus)
    - 5 new tables (dvlp_ksefsupplier, dvlp_ksefsbagrement, dvlp_ksefselfbillingtemplate,
                     dvlp_ksefselfbillinginvoice, dvlp_ksefselfbillinglineitem)
    - All Lookup relationships with correct cascade behaviour
    - Alternate keys

    Prerequisites:
    - PowerShell 7+
    - Dataverse System Administrator / System Customizer role
    - Auth: EITHER Az module + Connect-AzAccount, OR Service Principal params (-TenantId, -ClientId, -ClientSecret)

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
    .\Provision-SelfBillingSchema.ps1 -EnvironmentUrl "https://org12345.crm4.dynamics.com" -DryRun

.EXAMPLE
    .\Provision-SelfBillingSchema.ps1 -EnvironmentUrl "https://org12345.crm4.dynamics.com"

.EXAMPLE
    .\Provision-SelfBillingSchema.ps1 -EnvironmentUrl "https://org12345.api.crm4.dynamics.com" -TenantId "..." -ClientId "..." -ClientSecret "..."
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
        '@odata.type'              = '#Microsoft.Dynamics.CRM.OptionSetMetadata'
        Name                       = $Name
        DisplayName                = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayName; LanguageCode = 1033 }) }
        Description                = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }) }
        IsGlobal                   = $true
        OptionSetType              = 'Picklist'
        Options                    = $Options
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
          [string]$Color = '#1565C0',
          [ValidateSet('UserOwned','OrganizationOwned')]
          [string]$OwnershipType = 'UserOwned',
          [bool]$HasNotes = $false)

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
        OwnershipType                   = $OwnershipType
        AutoRouteToOwnerQueue           = $false
        IsActivity                      = $false
        HasNotes                        = $HasNotes
        HasActivities                   = $false
        ChangeTrackingEnabled           = $ChangeTracking
        IsAuditEnabled                  = @{ Value = $Auditing; CanBeChanged = $true }
        IsDuplicateDetectionEnabled     = @{ Value = $DuplicateDetection; CanBeChanged = $true }
        IsQuickCreateEnabled            = $false
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

# ─── STEP 0 — Validate connectivity ─────────────────────────────────────────
Write-Host "`n======================================================" -ForegroundColor White
Write-Host "  Dataverse Self-Billing Schema Provisioning" -ForegroundColor White
Write-Host "  Environment: $EnvironmentUrl" -ForegroundColor DarkGray
$authMode = if ($TenantId -and $ClientId -and $ClientSecret) { 'Service Principal' } else { 'Az Module' }
Write-Host "  Auth: $authMode" -ForegroundColor DarkGray
Write-Host "  DryRun: $DryRun" -ForegroundColor DarkGray
Write-Host "======================================================`n" -ForegroundColor White

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
# STEP 1 — Global Option Sets
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "--- Step 1: Global Option Sets ---" -ForegroundColor White

# dvlp_supplierstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_supplierstatus" `
    -DisplayName 'Supplier Status' -Description 'Status of supplier in the registry' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Active'   -LabelPL 'Aktywny'      -Color '#4CAF50')
        (New-OptionItem -Value 100000002 -LabelEN 'Inactive' -LabelPL 'Nieaktywny'   -Color '#9E9E9E')
        (New-OptionItem -Value 100000003 -LabelEN 'Blocked'  -LabelPL 'Zablokowany'  -Color '#F44336')
    )

# dvlp_suppliersource
New-GlobalOptionSet -Name "${PublisherPrefix}_suppliersource" `
    -DisplayName 'Supplier Source' -Description 'How the supplier was added to the registry' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'KSeF'    -LabelPL 'KSeF'        -Color '#1565C0')
        (New-OptionItem -Value 100000002 -LabelEN 'Manual'  -LabelPL 'Ręcznie'     -Color '#FF9800')
        (New-OptionItem -Value 100000003 -LabelEN 'VAT API' -LabelPL 'API VAT'     -Color '#00695C')
    )

# dvlp_sbagreementstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_sbagreementstatus" `
    -DisplayName 'SB Agreement Status' -Description 'Self-billing agreement lifecycle status' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Active'     -LabelPL 'Aktywna'      -Color '#4CAF50')
        (New-OptionItem -Value 100000002 -LabelEN 'Expired'    -LabelPL 'Wygasła'      -Color '#FF9800')
        (New-OptionItem -Value 100000003 -LabelEN 'Terminated' -LabelPL 'Rozwiązana'   -Color '#F44336')
    )

# dvlp_selfbillingstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_selfbillingstatus" `
    -DisplayName 'Self-Billing Invoice Status' -Description 'Self-billing invoice workflow status' `
    -Options @(
        (New-OptionItem -Value 100000001 -LabelEN 'Draft'            -LabelPL 'Wersja robocza'        -Color '#9E9E9E')
        (New-OptionItem -Value 100000002 -LabelEN 'Pending Seller'   -LabelPL 'Oczekuje na sprzedawcę' -Color '#FF9800')
        (New-OptionItem -Value 100000003 -LabelEN 'Seller Approved'  -LabelPL 'Zatwierdzona'           -Color '#4CAF50')
        (New-OptionItem -Value 100000004 -LabelEN 'Seller Rejected'  -LabelPL 'Odrzucona'              -Color '#F44336')
        (New-OptionItem -Value 100000005 -LabelEN 'Sent to KSeF'     -LabelPL 'Wysłana do KSeF'        -Color '#1565C0')
    )

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — New Tables
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 2: New Tables ---" -ForegroundColor White

# 2a. dvlp_ksefsupplier
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsupplier" `
    -DisplayName 'KSeF Supplier' -DisplayNamePL 'Dostawca KSeF' `
    -PluralName 'KSeF Suppliers' `
    -Description 'Supplier registry — auto-imported from KSeF invoices, manual, or VAT API' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 255 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -HasNotes $true -Color '#FF6F00'

# 2b. dvlp_ksefsbagrement
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefsbagrement" `
    -DisplayName 'KSeF Self-Billing Agreement' -DisplayNamePL 'Umowa samofakturowania KSeF' `
    -PluralName 'KSeF Self-Billing Agreements' `
    -Description 'Self-billing agreements between buyer and supplier' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -Auditing $true -HasNotes $true -Color '#6A1B9A'

# 2c. dvlp_ksefselfbillingtemplate
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -DisplayName 'KSeF Self-Billing Template' -DisplayNamePL 'Szablon samofaktury KSeF' `
    -PluralName 'KSeF Self-Billing Templates' `
    -Description 'Invoice line item templates for self-billing per supplier' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -Auditing $true -Color '#00695C'

# 2d. dvlp_ksefselfbillinginvoice
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -DisplayName 'KSeF Self-Billing Invoice' -DisplayNamePL 'Samofaktura KSeF' `
    -PluralName 'KSeF Self-Billing Invoices' `
    -Description 'Dedicated table for self-billing invoices (buyer-issued)' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -ChangeTracking $true -Auditing $true -Color '#1565C0'

# 2e. dvlp_ksefselfbillinglineitem
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefselfbillinglineitem" `
    -DisplayName 'KSeF Self-Billing Line Item' -DisplayNamePL 'Pozycja samofaktury KSeF' `
    -PluralName 'KSeF Self-Billing Line Items' `
    -Description 'Line items for self-billing invoices' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 500 `
    -Auditing $true -Color '#1565C0'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Columns on new tables (non-lookup)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 3: Columns (non-lookup) ---" -ForegroundColor White

# --- dvlp_ksefsupplier ---

# Identification
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_nip" -DisplayNameEN 'NIP' `
    -MaxLength 10 -RequiredLevel 'ApplicationRequired' -Searchable $true -Audit $true `
    -Description 'Tax identification number (NIP) — unique per tenant'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_shortname" -DisplayNameEN 'Short Name' `
    -MaxLength 100 -Description 'Short name or alias'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_regon" -DisplayNameEN 'REGON' `
    -MaxLength 14 -Description 'National business registry number'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_krs" -DisplayNameEN 'KRS' `
    -MaxLength 10 -Description 'National court register number'

# Address
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_street" -DisplayNameEN 'Street' `
    -MaxLength 255 -Description 'Street address'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_city" -DisplayNameEN 'City' `
    -MaxLength 100 -Description 'City'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_postalcode" -DisplayNameEN 'Postal Code' `
    -MaxLength 20 -Description 'Postal code'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_country" -DisplayNameEN 'Country' `
    -MaxLength 5 -Description 'Country code (ISO 3166-1 alpha-2, default PL)'

# Contact
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_email" -DisplayNameEN 'Email' `
    -MaxLength 255 -Format 'Email' -Description 'Contact email'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_phone" -DisplayNameEN 'Phone' `
    -MaxLength 50 -Format 'Phone' -Description 'Contact phone'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_bankaccount" -DisplayNameEN 'Bank Account' `
    -MaxLength 34 -Description 'Default bank account number (IBAN)'

# VAT API
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_vatstatus" -DisplayNameEN 'VAT Status' `
    -MaxLength 50 -Description 'VAT registration status from White List API'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_vatstatusdate" -DisplayNameEN 'VAT Status Date' `
    -Description 'Date of last VAT status verification'

# Business
Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_paymenttermsdays" -DisplayNameEN 'Payment Terms (days)' `
    -MinValue 0 -MaxValue 365 -Description 'Default payment terms in days'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_defaultcategory" -DisplayNameEN 'Default Category' `
    -MaxLength 100 -Description 'Default expense category for invoices from this supplier'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_notes" -DisplayNameEN 'Notes' `
    -MaxLength 10000 -Description 'Internal notes about this supplier'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_tags" -DisplayNameEN 'Tags' `
    -MaxLength 500 -Description 'Comma-separated tags for filtering'

# Self-billing flags
Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_hasselfbillingagreement" -DisplayNameEN 'Has Self-Billing Agreement' `
    -DefaultValue $false -Description 'Whether an active self-billing agreement exists'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_selfbillingagreementdate" -DisplayNameEN 'SB Agreement Date' `
    -Format 'DateOnly' -Description 'Date of the self-billing agreement'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_selfbillingagreementexpiry" -DisplayNameEN 'SB Agreement Expiry' `
    -Format 'DateOnly' -Description 'Expiry date of the self-billing agreement'

# Cached statistics
Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_firstinvoicedate" -DisplayNameEN 'First Invoice Date' `
    -Format 'DateOnly' -Description 'Date of first received invoice (cached)'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_lastinvoicedate" -DisplayNameEN 'Last Invoice Date' `
    -Format 'DateOnly' -Description 'Date of last received invoice (cached)'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_totalinvoicecount" -DisplayNameEN 'Total Invoice Count' `
    -MinValue 0 -MaxValue 999999 -Description 'Total number of invoices from this supplier (cached)'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_totalgrossamount" -DisplayNameEN 'Total Gross Amount' `
    -Precision 2 -MinValue 0 -MaxValue 999999999.99 -Description 'Total gross amount of all invoices (cached)'

# Status and source
Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_supplierstatus" -DefaultValue 100000001 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Supplier status in the registry'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_source" -DisplayNameEN 'Source' `
    -GlobalOptionSetName "${PublisherPrefix}_suppliersource" -DefaultValue 100000001 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'How this supplier was added to the registry'

# --- dvlp_ksefsbagrement ---

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_agreementdate" -DisplayNameEN 'Agreement Date' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Date when the self-billing agreement was signed'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_validfrom" -DisplayNameEN 'Valid From' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Start date of the agreement validity'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_validto" -DisplayNameEN 'Valid To' `
    -Format 'DateOnly' -Audit $true `
    -Description 'End date of the agreement validity (null = indefinite)'

Add-DateTimeColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_renewaldate" -DisplayNameEN 'Renewal Date' `
    -Format 'DateOnly' -Audit $true `
    -Description 'Next renewal date for expiry alerts'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_approvalprocedure" -DisplayNameEN 'Approval Procedure' `
    -MaxLength 5000 `
    -Description 'Description of the approval workflow for self-billing invoices'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_credentialreference" -DisplayNameEN 'Credential Reference' `
    -MaxLength 200 -Description 'Optional reference to KSeF credential / authorization'

Add-MemoColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_notes" -DisplayNameEN 'Notes' `
    -MaxLength 10000 -Description 'Internal notes'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_hasdocument" -DisplayNameEN 'Has Document' `
    -DefaultValue $false -Description 'Whether a scanned agreement document is attached'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_documentfilename" -DisplayNameEN 'Document Filename' `
    -MaxLength 255 -Description 'Filename of the attached scanned agreement'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_autoapprove" -DisplayNameEN 'Auto-Approve Invoices' `
    -DefaultValue $false -Audit $true `
    -Description 'When true, self-billing invoices skip seller approval and are automatically approved on submit'

Add-PicklistColumn -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_sbagreementstatus" -DefaultValue 100000001 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Agreement lifecycle status'

# --- dvlp_ksefselfbillingtemplate ---

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_description" -DisplayNameEN 'Description' `
    -MaxLength 500 -Description 'Template description'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_itemdescription" -DisplayNameEN 'Item Description' `
    -MaxLength 500 -RequiredLevel 'ApplicationRequired' `
    -Description 'Description of the invoice line item'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_quantity" -DisplayNameEN 'Quantity' `
    -Precision 3 -MinValue 0 -MaxValue 999999.999 `
    -Description 'Default quantity'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_unit" -DisplayNameEN 'Unit' `
    -MaxLength 20 -RequiredLevel 'ApplicationRequired' `
    -Description 'Unit of measure (szt, kg, godz, m2, etc.)'

Add-DecimalColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_unitprice" -DisplayNameEN 'Unit Price' `
    -Precision 2 -MinValue 0 -MaxValue 999999.99 -RequiredLevel 'ApplicationRequired' `
    -Description 'Unit price (net)'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_vatrate" -DisplayNameEN 'VAT Rate' `
    -MinValue -1 -MaxValue 100 -RequiredLevel 'ApplicationRequired' `
    -Description 'VAT rate in percent (23, 8, 5, 0, -1=exempt)'

Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_currency" -DisplayNameEN 'Currency' `
    -MaxLength 3 -Description 'Currency code (default PLN)'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_isactive" -DisplayNameEN 'Active' `
    -DefaultValue $true -RequiredLevel 'ApplicationRequired' `
    -Description 'Whether this template line is active'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_sortorder" -DisplayNameEN 'Sort Order' `
    -MinValue 0 -MaxValue 999 `
    -Description 'Display order of the line item in the template'

Add-IntegerColumn -EntityLogicalName "${PublisherPrefix}_ksefselfbillingtemplate" `
    -SchemaName "${PublisherPrefix}_paymenttermsdays" -DisplayNameEN 'Payment Terms (days)' `
    -MinValue 0 -MaxValue 365 `
    -Description 'Default payment terms in days for invoices generated from this template'

# --- dvlp_ksefselfbillinginvoice ---

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
# STEP 4 — Lookup Relationships
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 4: Lookup Relationships ---" -ForegroundColor White

# dvlp_ksefsupplier -> dvlp_ksefsetting (Required, Restrict)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_suppliers" `
    -ReferencingEntity "${PublisherPrefix}_ksefsupplier" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefsupplier -> dvlp_ksefmpkcenter (Optional, RemoveLink)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_defaultsupplier" `
    -ReferencingEntity "${PublisherPrefix}_ksefsupplier" `
    -ReferencingAttribute "${PublisherPrefix}_defaultmpkid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'Default MPK Center' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Default MPK Center for invoices from this supplier'

# dvlp_ksefsbagrement -> dvlp_ksefsupplier (Required, Cascade)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsupplier_agreements" `
    -ReferencingEntity "${PublisherPrefix}_ksefsbagrement" `
    -ReferencingAttribute "${PublisherPrefix}_supplierid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsupplier" `
    -DisplayNameEN 'Supplier' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Supplier this self-billing agreement belongs to'

# dvlp_ksefsbagrement -> dvlp_ksefsetting (Required, Restrict)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_sbagreements" `
    -ReferencingEntity "${PublisherPrefix}_ksefsbagrement" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefselfbillingtemplate -> dvlp_ksefsupplier (Required, Cascade)
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsupplier_templates" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillingtemplate" `
    -ReferencingAttribute "${PublisherPrefix}_supplierid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsupplier" `
    -DisplayNameEN 'Supplier' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Supplier this template belongs to'

# dvlp_ksefselfbillingtemplate -> dvlp_ksefsetting (Required, Restrict)
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
# STEP 5 — Alternate Keys
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 5: Alternate Keys ---" -ForegroundColor White

Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefsupplier" `
    -SchemaName "${PublisherPrefix}_nip_settingid" `
    -DisplayNameEN 'Unique NIP per tenant' `
    -KeyAttributes @("${PublisherPrefix}_nip", "${PublisherPrefix}_settingid")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Publish customizations
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 6: Publish ---" -ForegroundColor White

if (-not $DryRun) {
    Write-Host "  Publishing all customizations..." -ForegroundColor DarkGray -NoNewline
    $publishBody = @{
        ParameterXml = '<importexportxml><entities><entity>dvlp_ksefsupplier</entity><entity>dvlp_ksefsbagrement</entity><entity>dvlp_ksefselfbillingtemplate</entity><entity>dvlp_ksefselfbillinginvoice</entity><entity>dvlp_ksefselfbillinglineitem</entity></entities></importexportxml>'
    }
    try {
        Invoke-RestMethod -Method POST `
            -Uri "$baseUri/PublishXml" `
            -Headers (Get-Headers) `
            -Body ($publishBody | ConvertTo-Json -Depth 5 -Compress)
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " WARN — publish manually in maker portal" -ForegroundColor Yellow
    }
}
else {
    Write-Host "[DRY-RUN] Would publish all customizations" -ForegroundColor Cyan
}

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n======================================================" -ForegroundColor White
Write-Host "  Self-Billing Schema Provisioning complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor White
Write-Host @"

Created:
  - 4 Global OptionSets (supplierstatus, suppliersource, sbagreementstatus, selfbillingstatus)
  - 5 Tables (dvlp_ksefsupplier, dvlp_ksefsbagrement, dvlp_ksefselfbillingtemplate,
              dvlp_ksefselfbillinginvoice, dvlp_ksefselfbillinglineitem)
  - Lookup relationships for all tables
  - 1 Alternate key (NIP + settingId)

Next steps:
  1. Verify tables in Power Apps Maker Portal
  2. Update Provision-FullEnvironment.ps1 with these definitions
  3. Deploy API code (TypeScript services + endpoints)
"@
