<#
.SYNOPSIS
    Adds deduplication columns to dvlp_ksefnotification.

.DESCRIPTION
    Extends the dvlp_ksefnotification table with fields needed for upsert-based
    deduplication of recurring SLA alerts:

    1. dvlp_groupkey          — String(255)  deterministic dedup key, e.g.
                                              sla:invoice:{id}:recipient:{oid}
    2. dvlp_objecttype        — String(50)   'invoice' or 'cost-document'
    3. dvlp_isactive          — Boolean      true = alert is still active/unresolved
    4. dvlp_occurrencecount   — Integer      how many times the timer has retriggered
    5. dvlp_firsttriggeredon  — DateTime     when the alert was first raised
    6. dvlp_lasttriggeredon   — DateTime     timestamp of the last timer run that matched
    7. dvlp_lasthoursoverdue  — Decimal      hours overdue as of the last timer run

    Also provisions the missing lookup relationship:
    8. dvlp_ksefnotification.dvlp_costdocumentid → dvlp_ksefcostdocument
       (skipped automatically if it already exists)

    All operations are idempotent — already-existing columns/relationships are
    skipped with a YELLOW "already exists" message.

    Prerequisites:
    - PowerShell 7+
    - Dataverse System Administrator / System Customizer role
    - Auth: EITHER Az module + Connect-AzAccount, OR Service Principal params

.PARAMETER EnvironmentUrl
    Dataverse environment URL, e.g. https://org12345.crm4.dynamics.com

.PARAMETER TenantId
    Azure AD Tenant ID (for Service Principal auth). Omit to use Az module.

.PARAMETER ClientId
    App Registration Client ID (for Service Principal auth).

.PARAMETER ClientSecret
    App Registration Client Secret (for Service Principal auth).

.PARAMETER PublisherPrefix
    Publisher prefix (default: dvlp)

.PARAMETER DryRun
    If set, prints what would be created without making any API calls.

.EXAMPLE
    .\Provision-NotificationDeduplicationColumns.ps1 `
        -EnvironmentUrl "https://developico-tt.api.crm4.dynamics.com" -DryRun

.EXAMPLE
    .\Provision-NotificationDeduplicationColumns.ps1 `
        -EnvironmentUrl "https://developico-tt.api.crm4.dynamics.com"

.EXAMPLE
    .\Provision-NotificationDeduplicationColumns.ps1 `
        -EnvironmentUrl "https://org12345.api.crm4.dynamics.com" `
        -TenantId "..." -ClientId "..." -ClientSecret "..."
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

# ─── Column helpers ──────────────────────────────────────────────────────────

function Add-StringColumn {
    param(
        [string]$EntityLogicalName,
        [string]$SchemaName,
        [string]$DisplayNameEN,
        [int]$MaxLength = 100,
        [string]$RequiredLevel = 'None',
        [string]$Description = ''
    )

    $body = @{
        '@odata.type' = '#Microsoft.Dynamics.CRM.StringAttributeMetadata'
        SchemaName    = $SchemaName
        DisplayName   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel = @{ Value = $RequiredLevel }
        MaxLength     = $MaxLength
        FormatName    = @{ Value = 'Text' }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "String: $EntityLogicalName.$SchemaName"
}

function Add-BooleanColumn {
    param(
        [string]$EntityLogicalName,
        [string]$SchemaName,
        [string]$DisplayNameEN,
        [bool]$DefaultValue = $false,
        [string]$RequiredLevel = 'None',
        [string]$Description = ''
    )

    $body = @{
        '@odata.type' = '#Microsoft.Dynamics.CRM.BooleanAttributeMetadata'
        SchemaName    = $SchemaName
        DisplayName   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel = @{ Value = $RequiredLevel }
        DefaultValue  = $DefaultValue
        OptionSet     = @{
            TrueOption  = @{ Value = 1; Label = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
                @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Yes'; LanguageCode = 1033 }
            )}}
            FalseOption = @{ Value = 0; Label = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
                @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'No'; LanguageCode = 1033 }
            )}}
        }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Boolean: $EntityLogicalName.$SchemaName"
}

function Add-IntegerColumn {
    param(
        [string]$EntityLogicalName,
        [string]$SchemaName,
        [string]$DisplayNameEN,
        [int]$MinValue = 0,
        [int]$MaxValue = 2147483647,
        [string]$RequiredLevel = 'None',
        [string]$Description = ''
    )

    $body = @{
        '@odata.type' = '#Microsoft.Dynamics.CRM.IntegerAttributeMetadata'
        SchemaName    = $SchemaName
        DisplayName   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel = @{ Value = $RequiredLevel }
        MinValue      = $MinValue
        MaxValue      = $MaxValue
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Integer: $EntityLogicalName.$SchemaName"
}

function Add-DecimalColumn {
    param(
        [string]$EntityLogicalName,
        [string]$SchemaName,
        [string]$DisplayNameEN,
        [int]$Precision = 1,
        [decimal]$MinValue = 0,
        [decimal]$MaxValue = 99999,
        [string]$RequiredLevel = 'None',
        [string]$Description = ''
    )

    $body = @{
        '@odata.type' = '#Microsoft.Dynamics.CRM.DecimalAttributeMetadata'
        SchemaName    = $SchemaName
        DisplayName   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description   = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel = @{ Value = $RequiredLevel }
        Precision     = $Precision
        MinValue      = $MinValue
        MaxValue      = $MaxValue
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "Decimal: $EntityLogicalName.$SchemaName"
}

function Add-DateTimeColumn {
    param(
        [string]$EntityLogicalName,
        [string]$SchemaName,
        [string]$DisplayNameEN,
        [string]$RequiredLevel = 'None',
        [string]$Description = ''
    )

    $body = @{
        '@odata.type'    = '#Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'
        SchemaName       = $SchemaName
        DisplayName      = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $DisplayNameEN; LanguageCode = 1033 }
        )}
        Description      = @{ '@odata.type' = '#Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(
            @{ '@odata.type' = '#Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Description; LanguageCode = 1033 }
        )}
        RequiredLevel    = @{ Value = $RequiredLevel }
        Format           = 'DateAndTime'
        DateTimeBehavior = @{ Value = 'UserLocal' }
    }

    Invoke-DvRequest -Method POST `
        -Uri "$baseUri/EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes" `
        -Body $body -Description "DateTime: $EntityLogicalName.$SchemaName"
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
        [string]$Description = ''
    )

    $body = @{
        SchemaName           = $SchemaName
        '@odata.type'        = '#Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata'
        ReferencedEntity     = $ReferencedEntity
        ReferencingEntity    = $ReferencingEntity
        CascadeConfiguration = @{
            Delete   = $CascadeDelete
            Assign   = 'NoCascade'
            Share    = 'NoCascade'
            Unshare  = 'NoCascade'
            Merge    = 'NoCascade'
            Reparent = 'NoCascade'
        }
        Lookup               = @{
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

# ─── Header ──────────────────────────────────────────────────────────────────
Write-Host "`n======================================================" -ForegroundColor White
Write-Host "  Notification Deduplication Columns" -ForegroundColor White
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
        Write-Error "Cannot connect to Dataverse. Check Connect-AzAccount / Service Principal params."
        return
    }
}

$entity = "${PublisherPrefix}_ksefnotification"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — dvlp_groupkey
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 1: dvlp_groupkey ---" -ForegroundColor White

Add-StringColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_groupkey" `
    -DisplayNameEN 'Group Key' `
    -MaxLength 255 `
    -Description 'Deterministic dedup key: sla:invoice:{id}:recipient:{oid}. Identifies the single active alert per object+recipient pair.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — dvlp_objecttype
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 2: dvlp_objecttype ---" -ForegroundColor White

Add-StringColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_objecttype" `
    -DisplayNameEN 'Object Type' `
    -MaxLength 50 `
    -Description 'Source object type: invoice or cost-document. Used together with groupKey for deduplication routing.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — dvlp_isactive
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 3: dvlp_isactive ---" -ForegroundColor White

Add-BooleanColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_isactive" `
    -DisplayNameEN 'Active' `
    -DefaultValue $true `
    -Description 'Set to false when the underlying condition is resolved (invoice approved, SLA no longer exceeded). Inactive alerts are hidden from the notification bell.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — dvlp_occurrencecount
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 4: dvlp_occurrencecount ---" -ForegroundColor White

Add-IntegerColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_occurrencecount" `
    -DisplayNameEN 'Occurrence Count' `
    -MinValue 1 `
    -MaxValue 100000 `
    -Description 'Number of times the hourly SLA timer has matched this alert. Incremented on each upsert. Displayed in the notification bell as a retrigger counter.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — dvlp_firsttriggeredon
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 5: dvlp_firsttriggeredon ---" -ForegroundColor White

Add-DateTimeColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_firsttriggeredon" `
    -DisplayNameEN 'First Triggered On' `
    -Description 'Timestamp of the very first timer run that raised this alert. Set once on creation, never updated.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — dvlp_lasttriggeredon
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 6: dvlp_lasttriggeredon ---" -ForegroundColor White

Add-DateTimeColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_lasttriggeredon" `
    -DisplayNameEN 'Last Triggered On' `
    -Description 'Timestamp of the most recent timer run that matched this alert. Updated on every upsert.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — dvlp_lasthoursoverdue
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 7: dvlp_lasthoursoverdue ---" -ForegroundColor White

Add-DecimalColumn `
    -EntityLogicalName $entity `
    -SchemaName "${PublisherPrefix}_lasthoursoverdue" `
    -DisplayNameEN 'Last Hours Overdue' `
    -Precision 1 `
    -MinValue 0 `
    -MaxValue 99999 `
    -Description 'Hours the invoice/cost-document was overdue as of the last timer run. Updated on every upsert.'

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Lookup: dvlp_ksefnotification.dvlp_costdocumentid → dvlp_ksefcostdocument
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n--- Step 8: CostDocument lookup (if missing) ---" -ForegroundColor White

Add-LookupRelationship `
    -SchemaName "${PublisherPrefix}_ksefcostdocument_notifications" `
    -ReferencingEntity $entity `
    -ReferencingAttribute "${PublisherPrefix}_costdocumentid" `
    -ReferencedEntity "${PublisherPrefix}_ksefcostdocument" `
    -DisplayNameEN 'Related Cost Document' `
    -CascadeDelete 'RemoveLink' `
    -Description 'Optional link to the related cost document for navigation and SLA dedup.'

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host "`n======================================================" -ForegroundColor White
if ($DryRun) {
    Write-Host "  DRY-RUN complete — no changes were made." -ForegroundColor Cyan
} else {
    Write-Host "  Provisioning complete." -ForegroundColor Green
}
Write-Host "======================================================`n" -ForegroundColor White
