<#
.SYNOPSIS
    Provisions the MPK/Budget/Approval/Notification Dataverse schema.
    Based on: docs/internal/DATAVERSE-MPK-SPEC.md

.DESCRIPTION
    Creates:
    - 3 Global OptionSets (dvlp_approvalstatus, dvlp_budgetperiod, dvlp_notificationtype)
    - 4 new tables (dvlp_ksefmpkcenter, dvlp_ksefmpkapprover, dvlp_ksefnotification, dvlp_ksefwebhooksub)
    - 6 new columns on dvlp_ksefinvoice
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
    .\Provision-MpkSchema.ps1 -EnvironmentUrl "https://org12345.crm4.dynamics.com"

.EXAMPLE
    .\Provision-MpkSchema.ps1 -EnvironmentUrl "https://org12345.crm4.dynamics.com" -DryRun

.EXAMPLE
    .\Provision-MpkSchema.ps1 -EnvironmentUrl "https://org12345.api.crm4.dynamics.com" -TenantId "..." -ClientId "..." -ClientSecret "..."
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
    # Return cached token if still valid (with 60s margin)
    if ($script:cachedToken -and [datetime]::UtcNow -lt $script:tokenExpiry.AddSeconds(-60)) {
        return $script:cachedToken
    }

    if ($TenantId -and $ClientId -and $ClientSecret) {
        # Service Principal — OAuth2 client_credentials flow
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
        # Fallback — Az module
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
$script:optionSetIds = @{}  # name → MetadataId cache

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

    # Return cached GUID
    if ($script:optionSetIds.ContainsKey($Name)) {
        return $script:optionSetIds[$Name]
    }

    # Look up by name (fetch all, filter locally — $filter not supported on this endpoint)
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
          [string]$OwnershipType = 'UserOwned')

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
        HasNotes                        = $false
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
        -Body $body -Description "Picklist: $EntityLogicalName.$SchemaName (→ $GlobalOptionSetName)"
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
        -Body $body -Description "Lookup: $ReferencingEntity.$ReferencingAttribute → $ReferencedEntity"
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
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Dataverse MPK Schema Provisioning" -ForegroundColor White
Write-Host "  Environment: $EnvironmentUrl" -ForegroundColor DarkGray
$authMode = if ($TenantId -and $ClientId -and $ClientSecret) { 'Service Principal' } else { 'Az Module' }
Write-Host "  Auth: $authMode" -ForegroundColor DarkGray
Write-Host "  DryRun: $DryRun" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor White

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
Write-Host "─── Step 1: Global Option Sets ───" -ForegroundColor White

# dvlp_approvalstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_approvalstatus" `
    -DisplayName 'Approval Status' -Description 'Invoice approval workflow state' `
    -Options @(
        (New-OptionItem -Value 0 -LabelEN 'Draft'     -LabelPL 'Wersja robocza' -Color '#9E9E9E')
        (New-OptionItem -Value 1 -LabelEN 'Pending'   -LabelPL 'Oczekuje'       -Color '#FF9800')
        (New-OptionItem -Value 2 -LabelEN 'Approved'  -LabelPL 'Zatwierdzona'   -Color '#4CAF50')
        (New-OptionItem -Value 3 -LabelEN 'Rejected'  -LabelPL 'Odrzucona'      -Color '#F44336')
        (New-OptionItem -Value 4 -LabelEN 'Cancelled' -LabelPL 'Anulowana'      -Color '#607D8B')
    )

# dvlp_budgetperiod
New-GlobalOptionSet -Name "${PublisherPrefix}_budgetperiod" `
    -DisplayName 'Budget Period' -Description 'Budget cycle period for MPK Centers' `
    -Options @(
        (New-OptionItem -Value 0 -LabelEN 'Monthly'     -LabelPL 'Miesięczny')
        (New-OptionItem -Value 1 -LabelEN 'Quarterly'   -LabelPL 'Kwartalny')
        (New-OptionItem -Value 2 -LabelEN 'Half-Yearly' -LabelPL 'Półroczny')
        (New-OptionItem -Value 3 -LabelEN 'Annual'      -LabelPL 'Roczny')
    )

# dvlp_notificationtype
New-GlobalOptionSet -Name "${PublisherPrefix}_notificationtype" `
    -DisplayName 'Notification Type' -Description 'Type of in-app notification' `
    -Options @(
        (New-OptionItem -Value 0 -LabelEN 'Approval Requested' -LabelPL 'Oczekuje akceptacji'       -Color '#FF9800')
        (New-OptionItem -Value 1 -LabelEN 'SLA Exceeded'       -LabelPL 'SLA przekroczony'          -Color '#F44336')
        (New-OptionItem -Value 2 -LabelEN 'Budget Warning 80%' -LabelPL 'Budżet: ostrzeżenie 80%'  -Color '#FF5722')
        (New-OptionItem -Value 3 -LabelEN 'Budget Exceeded'    -LabelPL 'Budżet: przekroczony'      -Color '#D32F2F')
        (New-OptionItem -Value 4 -LabelEN 'Approval Decided'   -LabelPL 'Decyzja podjęta'           -Color '#4CAF50')
    )

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — New Tables (entities, with primary name attribute only)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 2: New Tables ───" -ForegroundColor White

# 2a. dvlp_ksefmpkcenter
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayName 'KSeF MPK Center' -DisplayNamePL 'Centrum MPK KSeF' `
    -PluralName 'KSeF MPK Centers' `
    -Description 'Dynamic cost centers (MPK) with budget and approval configuration' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 100 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -Color '#1565C0'

# 2b. dvlp_ksefmpkapprover
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefmpkapprover" `
    -DisplayName 'KSeF MPK Approver' -DisplayNamePL 'Akceptujący MPK KSeF' `
    -PluralName 'KSeF MPK Approvers' `
    -Description 'Junction table — users assigned as invoice approvers per MPK Center' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 254 `
    -Auditing $true -DuplicateDetection $true `
    -Color '#1565C0'

# 2c. dvlp_ksefnotification
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefnotification" `
    -DisplayName 'KSeF Notification' -DisplayNamePL 'Powiadomienie KSeF' `
    -PluralName 'KSeF Notifications' `
    -Description 'In-app notifications for approval workflow, SLA, and budget alerts' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -Auditing $false `
    -Color '#FF9800'

# 2d. dvlp_ksefwebhooksub
New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefwebhooksub" `
    -DisplayName 'KSeF Webhook Subscription' -DisplayNamePL 'Subskrypcja Webhook KSeF' `
    -PluralName 'KSeF Webhook Subscriptions' `
    -Description 'Webhook subscriptions for push notifications from the KSeF connector' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -Color '#1565C0'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Columns on new tables (non-lookup)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 3: Columns (non-lookup) ───" -ForegroundColor White

# --- dvlp_ksefmpkcenter ---
Add-StringColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_description" -DisplayNameEN 'Description' `
    -MaxLength 500 -Description 'Optional description of the MPK Center'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_isactive" -DisplayNameEN 'Active' `
    -DefaultValue $true -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Soft delete — deactivated MPK Centers are hidden from selection lists'

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
    -Description 'Set to true when user clicks the notification. Used for badge counter.'

Add-BooleanColumn -EntityLogicalName "${PublisherPrefix}_ksefnotification" `
    -SchemaName "${PublisherPrefix}_isdismissed" -DisplayNameEN 'Dismissed' `
    -DefaultValue $false -RequiredLevel 'ApplicationRequired' `
    -Description 'Set to true when user dismisses the notification. Excluded from list.'

# --- dvlp_ksefwebhooksub ---
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
# STEP 4 — Lookup Relationships
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 4: Lookup Relationships ───" -ForegroundColor White

# --- dvlp_ksefmpkcenter → dvlp_ksefsetting ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_mpkcenters" `
    -ReferencingEntity "${PublisherPrefix}_ksefmpkcenter" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# --- dvlp_ksefmpkapprover → dvlp_ksefmpkcenter ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_approvers" `
    -ReferencingEntity "${PublisherPrefix}_ksefmpkapprover" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'MPK Center' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'MPK Center this user is assigned to approve for'

# --- dvlp_ksefmpkapprover → systemuser ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_mpkapprovers" `
    -ReferencingEntity "${PublisherPrefix}_ksefmpkapprover" `
    -ReferencingAttribute "${PublisherPrefix}_systemuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Approver' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Dataverse system user assigned as approver'

# --- dvlp_ksefnotification → systemuser ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_recipientid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Recipient' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Notification recipient — Dataverse systemuser'

# --- dvlp_ksefnotification → dvlp_ksefsetting ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Tenant isolation via Lookup to setting'

# --- dvlp_ksefnotification → dvlp_ksefinvoice ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefinvoice_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_invoiceid" `
    -ReferencedEntity "${PublisherPrefix}_ksefinvoice" `
    -DisplayNameEN 'Related Invoice' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Optional link to the related invoice for navigation'

# --- dvlp_ksefnotification → dvlp_ksefmpkcenter ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_notifications" `
    -ReferencingEntity "${PublisherPrefix}_ksefnotification" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'Related MPK' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Optional link to the related MPK Center for budget alerts'

# --- dvlp_ksefwebhooksub → systemuser ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_webhooksubs" `
    -ReferencingEntity "${PublisherPrefix}_ksefwebhooksub" `
    -ReferencingAttribute "${PublisherPrefix}_systemuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Subscriber' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Cascade' `
    -Description 'Webhook subscription owner'

# --- dvlp_ksefwebhooksub → dvlp_ksefsetting ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_webhooksubs" `
    -ReferencingEntity "${PublisherPrefix}_ksefwebhooksub" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup (Restrict — cannot delete setting with active webhooks)'

# --- dvlp_ksefinvoice → dvlp_ksefmpkcenter (NEW column on existing table) ---
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_invoices" `
    -ReferencingEntity "${PublisherPrefix}_ksefinvoice" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'MPK Center' `
    -CascadeDelete 'Restrict' `
    -Description 'Dynamic MPK Center assignment. Replaces legacy dvlp_costcenter OptionSet.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — New columns on existing dvlp_ksefinvoice
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 5: Columns on dvlp_ksefinvoice ───" -ForegroundColor White

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

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Alternate Keys
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 6: Alternate Keys ───" -ForegroundColor White

Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefmpkcenter" `
    -SchemaName "${PublisherPrefix}_name_settingid" `
    -DisplayNameEN 'Unique MPK name per tenant' `
    -KeyAttributes @("${PublisherPrefix}_name", "${PublisherPrefix}_settingid")

Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefmpkapprover" `
    -SchemaName "${PublisherPrefix}_mpkcenterid_systemuserid" `
    -DisplayNameEN 'One approver per MPK Center' `
    -KeyAttributes @("${PublisherPrefix}_mpkcenterid", "${PublisherPrefix}_systemuserid")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Publish customizations
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n─── Step 7: Publish ───" -ForegroundColor White

if (-not $DryRun) {
    Write-Host "  Publishing all customizations..." -ForegroundColor DarkGray -NoNewline
    $publishBody = @{
        ParameterXml = '<importexportxml><entities><entity>dvlp_ksefmpkcenter</entity><entity>dvlp_ksefmpkapprover</entity><entity>dvlp_ksefnotification</entity><entity>dvlp_ksefwebhooksub</entity><entity>dvlp_ksefinvoice</entity></entities></importexportxml>'
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
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Provisioning complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor White
Write-Host @"

Next steps (manual):
  1. Verify tables in Power Apps Maker Portal
  2. Configure views and forms (layout)
  3. Add Business Rules (budget period required, approval readonly)
  4. Set up Security Roles (see DATAVERSE-MPK-SPEC.md §8)
  5. Run seed data script (see §11)
"@
