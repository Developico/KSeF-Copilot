<#
.SYNOPSIS
    Provisions additional Dataverse columns for the SB approval workflow.

.DESCRIPTION
    Adds:
    1. dvlp_ksefsupplier.dvlp_sbcontactuserid  — Lookup → systemuser (SB contact/approver)
    2. dvlp_ksefselfbillinginvoice.dvlp_submittedbyuserid — Lookup → systemuser
    3. dvlp_ksefselfbillinginvoice.dvlp_submittedat       — DateTime
    4. dvlp_ksefselfbillinginvoice.dvlp_approvedbyuserid  — Lookup → systemuser
    5. dvlp_ksefselfbillinginvoice.dvlp_approvedat        — DateTime
    6. dvlp_ksefsbagrement.dvlp_autoapprove               — Boolean (default: false)
    7. dvlp_ksefselfbillinginvoice.dvlp_xmlcontent        — Memo (max 1048576, XML content)
    8. dvlp_ksefselfbillinginvoice.dvlp_xmlhash           — String (max 100, SHA256 hash)

    Prerequisites: Same as Provision-SelfBillingSchema.ps1

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
    .\Provision-SbApprovalColumns.ps1 -EnvironmentUrl "https://developico-tt.api.crm4.dynamics.com" -DryRun

.EXAMPLE
    .\Provision-SbApprovalColumns.ps1 -EnvironmentUrl "https://developico-tt.api.crm4.dynamics.com"
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

# ─── Auth (same as Provision-SelfBillingSchema.ps1) ──────────────────────────
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

function Add-DateTimeColumn {
    param(
        [string]$EntityLogicalName,
        [string]$SchemaName,
        [string]$DisplayNameEN,
        [string]$Description = '',
        [string]$RequiredLevel = 'None'
    )

    $body = @{
        '@odata.type'      = '#Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'
        SchemaName         = $SchemaName
        DisplayName        = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description        = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel      = @{ Value = $RequiredLevel }
        Format             = 'DateAndTime'
        DateTimeBehavior    = @{ Value = 'UserLocal' }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "DateTime: $EntityLogicalName.$SchemaName"
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

# ─── STEP 0 — Validate connectivity ─────────────────────────────────────────
Write-Host "`n======================================================" -ForegroundColor White
Write-Host "  SB Approval Columns Provisioning" -ForegroundColor White
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
# STEP 1 — Lookup: dvlp_ksefsupplier.dvlp_sbcontactuserid → systemuser
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 1: Supplier SB Contact User Lookup ---" -ForegroundColor White

Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_supplier_sbcontact" `
    -ReferencingEntity "${PublisherPrefix}_ksefsupplier" `
    -ReferencingAttribute "${PublisherPrefix}_sbcontactuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'SB Contact User' `
    -RequiredLevel 'None' `
    -CascadeDelete 'RemoveLink' `
    -Description 'System user responsible for approving self-billing invoices for this supplier'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — SB Invoice audit columns: submitted
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 2: SB Invoice Submitted By/At ---" -ForegroundColor White

Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_sbinvoice_submittedby" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_submittedbyuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Submitted By' `
    -RequiredLevel 'None' `
    -CascadeDelete 'RemoveLink' `
    -Description 'System user who submitted this invoice for seller review'

Add-DateTimeColumn `
    -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_submittedat" `
    -DisplayNameEN 'Submitted At' `
    -Description 'Timestamp when the invoice was submitted for seller review'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — SB Invoice audit columns: approved/rejected
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 3: SB Invoice Approved By/At ---" -ForegroundColor White

Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_systemuser_sbinvoice_approvedby" `
    -ReferencingEntity "${PublisherPrefix}_ksefselfbillinginvoice" `
    -ReferencingAttribute "${PublisherPrefix}_approvedbyuserid" `
    -ReferencedEntity 'systemuser' `
    -DisplayNameEN 'Approved/Rejected By' `
    -RequiredLevel 'None' `
    -CascadeDelete 'RemoveLink' `
    -Description 'System user who approved or rejected this invoice'

Add-DateTimeColumn `
    -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_approvedat" `
    -DisplayNameEN 'Approved/Rejected At' `
    -Description 'Timestamp when the invoice was approved or rejected'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — SB Agreement auto-approve flag
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 4: SB Agreement Auto-Approve ---" -ForegroundColor White

Add-BooleanColumn `
    -EntityLogicalName "${PublisherPrefix}_ksefsbagrement" `
    -SchemaName "${PublisherPrefix}_autoapprove" `
    -DisplayNameEN 'Auto-Approve Invoices' `
    -DefaultValue $false -Audit $true `
    -Description 'When true, self-billing invoices skip seller approval and are automatically approved on submit'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — SB Invoice XML content & hash (approval compliance)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 5: SB Invoice XML Content & Hash ---" -ForegroundColor White

Add-MemoColumn `
    -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_xmlcontent" `
    -DisplayNameEN 'XML Content' `
    -MaxLength 1048576 -Audit $true `
    -Description 'Generated KSeF XML content of the invoice (stored at submit time for approval compliance)'

Add-StringColumn `
    -EntityLogicalName "${PublisherPrefix}_ksefselfbillinginvoice" `
    -SchemaName "${PublisherPrefix}_xmlhash" `
    -DisplayNameEN 'XML Hash' `
    -MaxLength 100 -Audit $true `
    -Description 'SHA256 hash of the XML content (integrity verification for approval workflow)'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Publish customizations
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 6: Publishing customizations ---" -ForegroundColor White

if (-not $DryRun) {
    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/PublishAllXml" `
        -Body @{} `
        -Description "PublishAllXml"
}

Write-Host "`n=== SB Approval Columns provisioning complete ===" -ForegroundColor Green
