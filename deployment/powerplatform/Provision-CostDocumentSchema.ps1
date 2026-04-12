<#
.SYNOPSIS
    Provisions the Cost Document Dataverse schema.
    Based on: docs/internal/COST-DOCUMENTS-PLAN.md

.DESCRIPTION
    Creates:
    - 3 Global OptionSets (dvlp_costdocumenttype, dvlp_costdocumentstatus, dvlp_costdocumentsource)
    - 1 new table (dvlp_ksefcostdocument)
    - All columns, Lookup relationships, and Alternate keys

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
    .\Provision-CostDocumentSchema.ps1 -EnvironmentUrl "https://org12345.crm4.dynamics.com"

.EXAMPLE
    .\Provision-CostDocumentSchema.ps1 -EnvironmentUrl "https://org12345.crm4.dynamics.com" -DryRun

.EXAMPLE
    .\Provision-CostDocumentSchema.ps1 -EnvironmentUrl "https://org12345.api.crm4.dynamics.com" -TenantId "..." -ClientId "..." -ClientSecret "..."
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
    param([string]$Method, [string]$Uri, [object]$Body, [string]$Description)

    if ($DryRun) {
        Write-Host "[DRY-RUN] $Method $Description" -ForegroundColor Cyan
        return $null
    }

    Write-Host "  $Method $Description..." -ForegroundColor DarkGray -NoNewline
    $params = @{ Method = $Method; Uri = $Uri; Headers = (Get-Headers) }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }

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
        $placeholder = [guid]::Empty.ToString()
        Write-Host "  Resolving OptionSet GUID for '$Name'... [DRY-RUN] $placeholder" -ForegroundColor Cyan
        $script:optionSetIds[$Name] = $placeholder
        return $placeholder
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
        HasNotes                        = $true
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
                    @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Nazwa'; LanguageCode = 1045 }
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
        [string]$SchemaName, [string]$ReferencingEntity, [string]$ReferencingAttribute,
        [string]$ReferencedEntity, [string]$DisplayNameEN,
        [string]$RequiredLevel = 'None', [string]$CascadeDelete = 'RemoveLink',
        [string]$CascadeAssign = 'NoCascade', [string]$Description = ''
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
Write-Host "`n══════════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Dataverse Cost Document Schema Provisioning" -ForegroundColor White
Write-Host "  Environment: $EnvironmentUrl" -ForegroundColor DarkGray
$authMode = if ($TenantId -and $ClientId -and $ClientSecret) { 'Service Principal' } else { 'Az Module' }
Write-Host "  Auth: $authMode" -ForegroundColor DarkGray
Write-Host "  DryRun: $DryRun" -ForegroundColor DarkGray
Write-Host "══════════════════════════════════════════════════════`n" -ForegroundColor White

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

# dvlp_costdocumenttype
New-GlobalOptionSet -Name "${PublisherPrefix}_costdocumenttype" `
    -DisplayName 'Cost Document Type' -Description 'Type of non-invoice cost document' `
    -Options @(
        (New-OptionItem -Value 100000000 -LabelEN 'Receipt'          -LabelPL 'Paragon'                    -Color '#4CAF50')
        (New-OptionItem -Value 100000001 -LabelEN 'Acknowledgment'   -LabelPL 'Pokwitowanie'               -Color '#2196F3')
        (New-OptionItem -Value 100000002 -LabelEN 'Pro Forma'        -LabelPL 'Pro forma'                  -Color '#FF9800')
        (New-OptionItem -Value 100000003 -LabelEN 'Debit Note'       -LabelPL 'Nota ksiegowa'              -Color '#9C27B0')
        (New-OptionItem -Value 100000004 -LabelEN 'Bill'             -LabelPL 'Rachunek'                   -Color '#00BCD4')
        (New-OptionItem -Value 100000005 -LabelEN 'Contract Invoice' -LabelPL 'Umowa zlecenie / o dzielo'  -Color '#795548')
        (New-OptionItem -Value 100000006 -LabelEN 'Other'            -LabelPL 'Inne'                       -Color '#607D8B')
    )

# dvlp_costdocumentstatus
New-GlobalOptionSet -Name "${PublisherPrefix}_costdocumentstatus" `
    -DisplayName 'Cost Document Status' -Description 'Status of cost document' `
    -Options @(
        (New-OptionItem -Value 100000000 -LabelEN 'Draft'     -LabelPL 'Wersja robocza' -Color '#9E9E9E')
        (New-OptionItem -Value 100000001 -LabelEN 'Active'    -LabelPL 'Aktywny'        -Color '#4CAF50')
        (New-OptionItem -Value 100000002 -LabelEN 'Cancelled' -LabelPL 'Anulowany'      -Color '#F44336')
    )

# dvlp_costdocumentsource
New-GlobalOptionSet -Name "${PublisherPrefix}_costdocumentsource" `
    -DisplayName 'Cost Document Source' -Description 'How the cost document was created' `
    -Options @(
        (New-OptionItem -Value 100000000 -LabelEN 'Manual'  -LabelPL 'Reczne'  -Color '#2196F3')
        (New-OptionItem -Value 100000001 -LabelEN 'OCR'     -LabelPL 'OCR'     -Color '#FF9800')
        (New-OptionItem -Value 100000002 -LabelEN 'Import'  -LabelPL 'Import'  -Color '#4CAF50')
    )

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — New Table
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 2: New Table ---" -ForegroundColor White

New-EntityDefinition `
    -SchemaName "${PublisherPrefix}_ksefcostdocument" `
    -DisplayName 'KSeF Cost Document' -DisplayNamePL 'Dokument kosztowy KSeF' `
    -PluralName 'KSeF Cost Documents' `
    -Description 'Non-invoice cost documents: receipts, acknowledgments, pro forma, debit notes, bills, contracts, other' `
    -PrimaryNameAttr "${PublisherPrefix}_name" -PrimaryNameMaxLen 200 `
    -ChangeTracking $true -Auditing $true -DuplicateDetection $true `
    -Color '#E65100'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Columns (non-lookup)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 3: Columns ---" -ForegroundColor White

$entity = "${PublisherPrefix}_ksefcostdocument"

# --- Document type & number ---
Add-PicklistColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_documenttype" -DisplayNameEN 'Document Type' `
    -GlobalOptionSetName "${PublisherPrefix}_costdocumenttype" `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Type of cost document'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_documentnumber" -DisplayNameEN 'Document Number' `
    -MaxLength 100 -RequiredLevel 'ApplicationRequired' -Searchable $true -Audit $true `
    -Description 'Document number from the original document'

# --- Dates ---
Add-DateTimeColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_documentdate" -DisplayNameEN 'Document Date' `
    -Format 'DateOnly' -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Date of the cost document'

Add-DateTimeColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_duedate" -DisplayNameEN 'Due Date' `
    -Format 'DateOnly' -Audit $true `
    -Description 'Payment due date'

# --- Description ---
Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_description" -DisplayNameEN 'Description' `
    -MaxLength 500 -Description 'Document description or notes'

# --- Issuer (counterparty) ---
Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_issuername" -DisplayNameEN 'Issuer Name' `
    -MaxLength 255 -RequiredLevel 'ApplicationRequired' -Searchable $true -Audit $true `
    -Description 'Name of the entity that issued the document'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_issuernip" -DisplayNameEN 'Issuer NIP' `
    -MaxLength 20 -Searchable $true -Audit $true `
    -Description 'Tax ID (NIP) of the issuer'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_issueraddress" -DisplayNameEN 'Issuer Address' `
    -MaxLength 255 -Description 'Street address of the issuer'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_issuercity" -DisplayNameEN 'Issuer City' `
    -MaxLength 100 -Description 'City of the issuer'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_issuerpostalcode" -DisplayNameEN 'Issuer Postal Code' `
    -MaxLength 20 -Description 'Postal code of the issuer'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_issuercountry" -DisplayNameEN 'Issuer Country' `
    -MaxLength 100 -Description 'Country of the issuer'

# --- Amounts ---
Add-DecimalColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_netamount" -DisplayNameEN 'Net Amount' `
    -Precision 2 -MinValue -999999999.99 -MaxValue 999999999.99 -Audit $true `
    -Description 'Net amount (before VAT)'

Add-DecimalColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_vatamount" -DisplayNameEN 'VAT Amount' `
    -Precision 2 -MinValue -999999999.99 -MaxValue 999999999.99 -Audit $true `
    -Description 'VAT amount'

Add-DecimalColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_grossamount" -DisplayNameEN 'Gross Amount' `
    -Precision 2 -MinValue -999999999.99 -MaxValue 999999999.99 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Gross amount (total including VAT)'

Add-PicklistColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_currency" -DisplayNameEN 'Currency' `
    -GlobalOptionSetName "${PublisherPrefix}_currencyksef" -DefaultValue 100000000 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Currency (reuses existing dvlp_currencyksef OptionSet)'

Add-DecimalColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_exchangerate" -DisplayNameEN 'Exchange Rate' `
    -Precision 4 -MinValue 0 -MaxValue 999999.9999 `
    -Description 'Exchange rate to PLN'

Add-DecimalColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_grossamountpln" -DisplayNameEN 'Gross Amount (PLN)' `
    -Precision 2 -MinValue -999999999.99 -MaxValue 999999999.99 `
    -Description 'Gross amount converted to PLN'

# --- Payment ---
Add-PicklistColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_paymentstatus" -DisplayNameEN 'Payment Status' `
    -GlobalOptionSetName "${PublisherPrefix}_paymentstatusksef" -DefaultValue 100000001 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Payment status (reuses existing dvlp_paymentstatusksef OptionSet)'

Add-DateTimeColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_paidat" -DisplayNameEN 'Paid At' `
    -Audit $true -Description 'Date when the document was paid'

# --- Classification ---
Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_category" -DisplayNameEN 'Category' `
    -MaxLength 100 -Searchable $true `
    -Description 'Cost category'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_project" -DisplayNameEN 'Project' `
    -MaxLength 100 -Searchable $true `
    -Description 'Project reference'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_tags" -DisplayNameEN 'Tags' `
    -MaxLength 500 -Description 'Comma-separated tags'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_notes" -DisplayNameEN 'Notes' `
    -MaxLength 2000 -Description 'Additional notes'

# --- Status & source ---
Add-PicklistColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_status" -DisplayNameEN 'Status' `
    -GlobalOptionSetName "${PublisherPrefix}_costdocumentstatus" -DefaultValue 100000000 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'Document status'

Add-PicklistColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_source" -DisplayNameEN 'Source' `
    -GlobalOptionSetName "${PublisherPrefix}_costdocumentsource" -DefaultValue 100000000 `
    -RequiredLevel 'ApplicationRequired' -Audit $true `
    -Description 'How the document was created'

# --- Approval workflow ---
Add-PicklistColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_approvalstatus" -DisplayNameEN 'Approval Status' `
    -GlobalOptionSetName "${PublisherPrefix}_approvalstatus" -DefaultValue 0 `
    -Audit $true -Description 'Approval workflow state (reuses existing dvlp_approvalstatus OptionSet)'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_approvedby" -DisplayNameEN 'Approved By' `
    -MaxLength 200 -Audit $true -Description 'Full name of the approver'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_approvedbyoid" -DisplayNameEN 'Approved By OID' `
    -MaxLength 50 -Audit $true -Description 'Azure Entra ID OID of the decision maker'

Add-DateTimeColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_approvedat" -DisplayNameEN 'Approved At' `
    -Audit $true -Description 'Timestamp of the approval/rejection decision'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_approvalcomment" -DisplayNameEN 'Approval Comment' `
    -MaxLength 1000 -Audit $true -Description 'Optional comment from the approver'

# --- AI fields ---
Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_aimpksuggestion" -DisplayNameEN 'AI MPK Suggestion' `
    -MaxLength 50 -Description 'AI-suggested MPK center'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_aicategorysuggestion" -DisplayNameEN 'AI Category Suggestion' `
    -MaxLength 100 -Description 'AI-suggested cost category'

Add-StringColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_aidescription" -DisplayNameEN 'AI Description' `
    -MaxLength 500 -Description 'AI-generated description of the cost document'

Add-DecimalColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_aiconfidence" -DisplayNameEN 'AI Confidence' `
    -Precision 2 -MinValue 0 -MaxValue 1 `
    -Description 'AI confidence score (0-1)'

Add-DateTimeColumn -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_aiprocessedat" -DisplayNameEN 'AI Processed At' `
    -Description 'Timestamp when AI processed this document'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Lookup Relationships
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 4: Lookup Relationships ---" -ForegroundColor White

# dvlp_ksefcostdocument → dvlp_ksefsetting
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefsetting_costdocuments" `
    -ReferencingEntity "${PublisherPrefix}_ksefcostdocument" `
    -ReferencingAttribute "${PublisherPrefix}_settingid" `
    -ReferencedEntity "${PublisherPrefix}_ksefsetting" `
    -DisplayNameEN 'Setting' -RequiredLevel 'ApplicationRequired' `
    -CascadeDelete 'Restrict' `
    -Description 'Tenant isolation via Lookup to setting'

# dvlp_ksefcostdocument → dvlp_ksefmpkcenter
Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefmpkcenter_costdocuments" `
    -ReferencingEntity "${PublisherPrefix}_ksefcostdocument" `
    -ReferencingAttribute "${PublisherPrefix}_mpkcenterid" `
    -ReferencedEntity "${PublisherPrefix}_ksefmpkcenter" `
    -DisplayNameEN 'MPK Center' `
    -CascadeDelete 'Restrict' `
    -Description 'Dynamic MPK Center assignment for cost classification and budgeting'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Alternate Keys
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 5: Alternate Keys ---" -ForegroundColor White

Add-AlternateKey `
    -EntityLogicalName "${PublisherPrefix}_ksefcostdocument" `
    -SchemaName "${PublisherPrefix}_docnumber_settingid" `
    -DisplayNameEN 'Unique document number per tenant' `
    -KeyAttributes @("${PublisherPrefix}_documentnumber", "${PublisherPrefix}_settingid")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Publish customizations
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 6: Publish ---" -ForegroundColor White

if (-not $DryRun) {
    Write-Host "  Publishing all customizations..." -ForegroundColor DarkGray -NoNewline
    $publishBody = @{
        ParameterXml = '<importexportxml><entities><entity>dvlp_ksefcostdocument</entity></entities></importexportxml>'
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
Write-Host "`n══════════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Cost Document Schema Provisioning complete!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor White
Write-Host @"

Next steps:
  1. Verify table in Power Apps Maker Portal
  2. Configure views and forms (layout)
  3. Run: .\Provision-MpkSchema.ps1 (if not already done - prerequisite for MPK lookups)
  4. Set up Security Roles for cost document access
"@
