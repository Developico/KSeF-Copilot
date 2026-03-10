/**
 * Migration Script: OptionSet MPK → Lookup MPK Center
 *
 * Maps legacy dvlp_costcenter (OptionSet values) to dvlp_mpkcenterid (Lookup)
 * on existing invoices. Reads the MPK Center entities to build a mapping, then
 * patches each invoice that has a costcenter value but no mpkcenterid.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-mpk-optionset-to-lookup.ts --nip=1234567890
 *   pnpm tsx scripts/migrate-mpk-optionset-to-lookup.ts --nip=1234567890 --dry-run
 *   pnpm tsx scripts/migrate-mpk-optionset-to-lookup.ts --nip=1234567890 --env=demo
 *
 * Options:
 *   --nip=<NIP>         Company NIP (required, or set KSEF_NIP in .env.local)
 *   --env=<environment> Target environment: demo|test|production
 *   --dry-run           Show what would be migrated without making changes
 *   --batch-size=<n>    Number of invoices to process in parallel (default: 10)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''

let accessToken: string

// Legacy OptionSet values → MPK Center name mapping
const OPTIONSET_TO_NAME: Record<number, string> = {
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
    environment: undefined as 'demo' | 'test' | 'production' | undefined,
    dryRun: false,
    batchSize: 10,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) {
      result.nip = arg.split('=')[1]
    } else if (arg.startsWith('--env=')) {
      const env = arg.split('=')[1].toLowerCase()
      if (env === 'demo' || env === 'test' || env === 'production' || env === 'prod') {
        result.environment = env === 'prod' ? 'production' : (env as 'demo' | 'test' | 'production')
      }
    } else if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg.startsWith('--batch-size=')) {
      result.batchSize = Math.max(1, Math.min(50, parseInt(arg.split('=')[1], 10) || 10))
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

async function getCompanySetting(
  nip: string,
  targetEnv?: 'demo' | 'test' | 'production',
) {
  const result = await dvFetch(
    `/dvlp_ksefsettings?$filter=dvlp_nip eq '${encodeURIComponent(nip)}'`,
  )
  if (!result?.value?.length) {
    throw new Error(`Company with NIP ${nip} not found in settings`)
  }

  const envMap: Record<number, string> = {
    100000000: 'production',
    100000001: 'test',
    100000002: 'demo',
  }

  let setting = result.value[0]
  if (targetEnv) {
    const reverseEnvMap: Record<string, number> = {
      production: 100000000,
      test: 100000001,
      demo: 100000002,
    }
    const envValue = reverseEnvMap[targetEnv]
    const envMatch = result.value.find(
      (s: Record<string, unknown>) => s.dvlp_environment === envValue,
    )
    if (envMatch) setting = envMatch
    else console.log(`⚠️  No setting for env '${targetEnv}', using first match.`)
  }

  const settingId = setting.dvlp_ksefsettingid
  const companyName = setting.dvlp_companyname || setting.dvlp_name
  const env = envMap[setting.dvlp_environment as number] || 'unknown'
  console.log(`📋 Company: ${companyName} (${env}), settingId: ${settingId}`)
  return { settingId, companyName, env }
}

async function getMpkCenters(settingId: string): Promise<Map<string, string>> {
  // Returns Map<centerName, centerId>
  const map = new Map<string, string>()
  const result = await dvFetch(
    `/dvlp_ksefmpkcenters?$filter=_dvlp_settingid_value eq '${settingId}'&$select=dvlp_ksefmpkcenterid,dvlp_name`,
  )
  if (result?.value) {
    for (const center of result.value) {
      map.set(center.dvlp_name, center.dvlp_ksefmpkcenterid)
    }
  }
  return map
}

interface InvoiceToMigrate {
  id: string
  name: string
  costCenter: number
  mpkCenterId: string | null
}

async function getInvoicesWithCostCenter(settingId: string): Promise<InvoiceToMigrate[]> {
  const invoices: InvoiceToMigrate[] = []
  let nextLink: string | null = `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq '${settingId}' and dvlp_costcenter ne null and _dvlp_mpkcenterid_value eq null&$select=dvlp_ksefinvoiceid,dvlp_name,dvlp_costcenter,_dvlp_mpkcenterid_value&$top=500`

  while (nextLink) {
    const result = await dvFetch(nextLink)
    if (result?.value) {
      for (const inv of result.value) {
        invoices.push({
          id: inv.dvlp_ksefinvoiceid,
          name: inv.dvlp_name,
          costCenter: inv.dvlp_costcenter,
          mpkCenterId: inv._dvlp_mpkcenterid_value || null,
        })
      }
    }
    // Handle @odata.nextLink for pagination
    const rawNextLink = result?.['@odata.nextLink'] as string | undefined
    if (rawNextLink) {
      // nextLink from Dataverse is absolute — strip the base
      const baseIndex = rawNextLink.indexOf('/api/data/v9.2')
      nextLink = baseIndex >= 0 ? rawNextLink.substring(baseIndex + '/api/data/v9.2'.length) : null
    } else {
      nextLink = null
    }
  }

  return invoices
}

async function migrateInvoice(
  invoiceId: string,
  mpkCenterId: string,
): Promise<void> {
  await dvFetch(`/dvlp_ksefinvoices(${invoiceId})`, {
    method: 'PATCH',
    body: JSON.stringify({
      'dvlp_mpkcenterid@odata.bind': `/dvlp_ksefmpkcenters(${mpkCenterId})`,
    }),
  })
}

async function main() {
  const opts = parseArgs()

  if (!opts.nip) {
    console.error('❌ NIP is required. Use --nip=... or set KSEF_NIP in .env.local')
    process.exit(1)
  }

  console.log(opts.dryRun ? '🔍 DRY RUN MODE — no changes will be made\n' : '')
  console.log('🔐 Acquiring Dataverse token…')
  await getToken()

  const { settingId } = await getCompanySetting(opts.nip, opts.environment)

  // Step 1: Get MPK Centers for this setting (name → GUID)
  console.log('\n📋 Loading MPK Centers…')
  const mpkCenters = await getMpkCenters(settingId)
  console.log(`   Found ${mpkCenters.size} MPK center(s):`)
  for (const [name, id] of mpkCenters) {
    console.log(`     - ${name}: ${id}`)
  }

  // Build OptionSet value → MPK Center GUID mapping
  const optionSetToGuid = new Map<number, string>()
  for (const [optValue, centerName] of Object.entries(OPTIONSET_TO_NAME)) {
    const centerId = mpkCenters.get(centerName)
    if (centerId) {
      optionSetToGuid.set(Number(optValue), centerId)
    } else {
      console.log(`   ⚠️  No MPK Center found for "${centerName}" (OptionSet ${optValue})`)
    }
  }

  // Step 2: Find invoices with costCenter but no mpkCenterId
  console.log('\n🔍 Finding invoices to migrate…')
  const invoices = await getInvoicesWithCostCenter(settingId)
  console.log(`   Found ${invoices.length} invoice(s) to migrate`)

  if (invoices.length === 0) {
    console.log('\n✅ Nothing to migrate.')
    return
  }

  // Step 3: Migrate
  let migrated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < invoices.length; i += opts.batchSize) {
    const batch = invoices.slice(i, i + opts.batchSize)

    const promises = batch.map(async (invoice) => {
      const targetId = optionSetToGuid.get(invoice.costCenter)
      const targetName = OPTIONSET_TO_NAME[invoice.costCenter] || `unknown(${invoice.costCenter})`

      if (!targetId) {
        console.log(`   ⏭️  Skip: ${invoice.name} — no MPK Center for OptionSet ${invoice.costCenter} (${targetName})`)
        skipped++
        return
      }

      if (opts.dryRun) {
        console.log(`   🔍 Would migrate: ${invoice.name} → ${targetName} (${targetId})`)
        migrated++
        return
      }

      try {
        await migrateInvoice(invoice.id, targetId)
        console.log(`   ✅ Migrated: ${invoice.name} → ${targetName}`)
        migrated++
      } catch (err) {
        console.error(`   ❌ Failed: ${invoice.name} — ${err instanceof Error ? err.message : err}`)
        failed++
      }
    })

    await Promise.all(promises)

    // Small delay between batches
    if (i + opts.batchSize < invoices.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log(`\n📊 Summary: ${migrated} migrated, ${skipped} skipped, ${failed} failed`)
  if (opts.dryRun) {
    console.log('   (Dry run — no actual changes were made)')
  }
  console.log('\n✅ Done.')
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err)
  process.exit(1)
})
