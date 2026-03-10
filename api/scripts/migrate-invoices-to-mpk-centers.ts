/**
 * Migrate invoices from legacy dvlp_costcenter OptionSet → dvlp_mpkcenterid lookup.
 *
 * For each active setting:
 *   1. Fetch MPK Centers (dvlp_ksefmpkcenters) to build name→GUID map
 *   2. Fetch invoices that have dvlp_costcenter set but no _dvlp_mpkcenterid_value
 *   3. Match old OptionSet value → legacy name → MPK Center GUID
 *   4. PATCH invoice with dvlp_mpkcenterid@odata.bind
 *
 * Usage:
 *   pnpm tsx scripts/migrate-invoices-to-mpk-centers.ts                  # default NIP
 *   pnpm tsx scripts/migrate-invoices-to-mpk-centers.ts --all            # all active accounts
 *   pnpm tsx scripts/migrate-invoices-to-mpk-centers.ts --nip=1234567890
 *   pnpm tsx scripts/migrate-invoices-to-mpk-centers.ts --dry-run        # preview only
 *   pnpm tsx scripts/migrate-invoices-to-mpk-centers.ts --all --dry-run
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''

let accessToken: string

/**
 * Legacy OptionSet value → name mapping (same as MpkValues in entities.ts)
 */
const LEGACY_MPK_MAP: Record<number, string> = {
  100000000: 'Consultants',
  100000001: 'BackOffice',
  100000002: 'Management',
  100000003: 'Cars',
  100000005: 'Marketing',
  100000006: 'Sales',
  100000007: 'Delivery',
  100000008: 'Finance',
  100000009: 'Other',
  100000100: 'Legal',
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    nip: defaultNip,
    dryRun: false,
    all: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) {
      result.nip = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg === '--all') {
      result.all = true
    }
  }

  return result
}

async function getToken() {
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  }

  const cca = new ConfidentialClientApplication(msalConfig)
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: [`${dataverseUrl}/.default`],
  })

  if (!tokenResponse?.accessToken) {
    throw new Error('Failed to acquire token')
  }

  accessToken = tokenResponse.accessToken
  return accessToken
}

async function dvFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${dataverseUrl}/api/data/v9.2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Dataverse error ${response.status}: ${error}`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function getAllActiveSettings(): Promise<
  Array<{ settingId: string; companyName: string; nip: string; env: string }>
> {
  const envMap: Record<number, string> = {
    100000000: 'production',
    100000001: 'test',
    100000002: 'demo',
  }

  const result = await dvFetch(
    `/dvlp_ksefsettings?$filter=dvlp_isactive eq true and statecode eq 0&$orderby=dvlp_companyname asc`,
  )

  if (!result?.value?.length) {
    throw new Error('No active settings found in Dataverse')
  }

  return result.value.map((s: Record<string, unknown>) => ({
    settingId: s.dvlp_ksefsettingid as string,
    companyName: (s.dvlp_companyname || s.dvlp_nip) as string,
    nip: s.dvlp_nip as string,
    env: envMap[s.dvlp_environment as number] || 'unknown',
  }))
}

async function getCompanySetting(nip: string) {
  const envMap: Record<number, string> = {
    100000000: 'production',
    100000001: 'test',
    100000002: 'demo',
  }

  const result = await dvFetch(
    `/dvlp_ksefsettings?$filter=dvlp_nip eq '${encodeURIComponent(nip)}'`,
  )
  if (!result?.value?.length) {
    throw new Error(`Company with NIP ${nip} not found in settings`)
  }

  return result.value.map((s: Record<string, unknown>) => ({
    settingId: s.dvlp_ksefsettingid as string,
    companyName: (s.dvlp_companyname || s.dvlp_nip) as string,
    nip: s.dvlp_nip as string,
    env: envMap[s.dvlp_environment as number] || 'unknown',
  }))
}

/**
 * Fetch MPK Centers for a setting and build name→GUID map
 */
async function getMpkCenterMap(settingId: string): Promise<Map<string, string>> {
  const result = await dvFetch(
    `/dvlp_ksefmpkcenters?$filter=_dvlp_settingid_value eq '${settingId}' and dvlp_isactive eq true&$select=dvlp_ksefmpkcenterid,dvlp_name`,
  )

  const map = new Map<string, string>()
  if (result?.value) {
    for (const c of result.value) {
      map.set(c.dvlp_name as string, c.dvlp_ksefmpkcenterid as string)
    }
  }
  return map
}

/**
 * Fetch invoices that have old dvlp_costcenter set but NO _dvlp_mpkcenterid_value.
 * Uses OData pagination (follows @odata.nextLink).
 */
async function getInvoicesToMigrate(
  settingId: string,
): Promise<Array<{ id: string; invoiceNumber: string; legacyMpkValue: number }>> {
  const invoices: Array<{ id: string; invoiceNumber: string; legacyMpkValue: number }> = []

  let url =
    `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${settingId} and dvlp_costcenter ne null and _dvlp_mpkcenterid_value eq null` +
    `&$select=dvlp_ksefinvoiceid,dvlp_name,dvlp_costcenter` +
    `&$top=500`

  while (url) {
    const result = await dvFetch(url)
    if (result?.value) {
      for (const inv of result.value) {
        invoices.push({
          id: inv.dvlp_ksefinvoiceid as string,
          invoiceNumber: inv.dvlp_name as string,
          legacyMpkValue: inv.dvlp_costcenter as number,
        })
      }
    }

    // Follow pagination link (strip base URL if present)
    const nextLink = result?.['@odata.nextLink'] as string | undefined
    if (nextLink) {
      url = nextLink.replace(`${dataverseUrl}/api/data/v9.2`, '')
    } else {
      url = ''
    }
  }

  return invoices
}

async function migrateForSetting(
  settingId: string,
  companyName: string,
  dryRun: boolean,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  const centerMap = await getMpkCenterMap(settingId)
  if (centerMap.size === 0) {
    console.log(`   ⚠️  No MPK Centers found. Run seed-mpk-centers.ts first.`)
    return { migrated: 0, skipped: 0, errors: 0 }
  }
  console.log(`   📋 MPK Centers loaded: ${centerMap.size} (${Array.from(centerMap.keys()).join(', ')})`)

  const invoices = await getInvoicesToMigrate(settingId)
  console.log(`   📄 Invoices to migrate: ${invoices.length}`)

  if (invoices.length === 0) {
    return { migrated: 0, skipped: 0, errors: 0 }
  }

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const inv of invoices) {
    const legacyName = LEGACY_MPK_MAP[inv.legacyMpkValue]
    if (!legacyName) {
      console.log(`   ⚠️  Unknown legacy value ${inv.legacyMpkValue} on ${inv.invoiceNumber} — skipping`)
      skipped++
      continue
    }

    const centerId = centerMap.get(legacyName)
    if (!centerId) {
      console.log(`   ⚠️  No MPK Center for "${legacyName}" on ${inv.invoiceNumber} — skipping`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] ${inv.invoiceNumber}: ${legacyName} → ${centerId}`)
      migrated++
      continue
    }

    try {
      await dvFetch(`/dvlp_ksefinvoices(${inv.id})`, {
        method: 'PATCH',
        body: JSON.stringify({
          'dvlp_mpkcenterid@odata.bind': `/dvlp_ksefmpkcenters(${centerId})`,
        }),
      })
      console.log(`   ✅ ${inv.invoiceNumber}: ${legacyName} → ${centerId}`)
      migrated++
    } catch (err) {
      console.log(`   ❌ ${inv.invoiceNumber}: ${(err as Error).message}`)
      errors++
    }

    // Small delay to avoid rate limiting (every 50 records)
    if (migrated % 50 === 0 && migrated > 0) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return { migrated, skipped, errors }
}

async function main() {
  const opts = parseArgs()

  if (opts.dryRun) {
    console.log('🔍 DRY RUN MODE — no changes will be made\n')
  }

  console.log('🔐 Acquiring Dataverse token…')
  await getToken()

  let settings: Array<{ settingId: string; companyName: string; nip: string; env: string }>

  if (opts.all) {
    settings = await getAllActiveSettings()
  } else {
    if (!opts.nip) {
      console.error('❌ NIP is required. Use --nip=... or set KSEF_NIP in .env.local (or use --all)')
      process.exit(1)
    }
    settings = await getCompanySetting(opts.nip)
  }

  console.log(`\n📋 Found ${settings.length} setting(s):\n`)
  for (const s of settings) {
    console.log(`   • ${s.companyName} (NIP: ${s.nip}, ${s.env})`)
  }

  let totalMigrated = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const s of settings) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`🏢 ${s.companyName} (NIP: ${s.nip}, ${s.env})`)
    console.log('═'.repeat(60))

    const result = await migrateForSetting(s.settingId, s.companyName, opts.dryRun)
    totalMigrated += result.migrated
    totalSkipped += result.skipped
    totalErrors += result.errors
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📊 Total: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`)
  if (opts.dryRun) {
    console.log('🔍 This was a DRY RUN — run without --dry-run to apply changes.')
  }
  console.log('✅ Done.')
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err)
  process.exit(1)
})
