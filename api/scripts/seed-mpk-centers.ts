/**
 * Seed MPK Centers into Dataverse
 *
 * Populates dvlp_ksefmpkcenters with the 10 standard cost-center names
 * that match the legacy OptionSet values (MpkValues in entities.ts).
 *
 * Usage:
 *   pnpm tsx scripts/seed-mpk-centers.ts                     # Seed for default NIP
 *   pnpm tsx scripts/seed-mpk-centers.ts --nip=1234567890    # Specific NIP
 *   pnpm tsx scripts/seed-mpk-centers.ts --env=demo          # Specific environment
 *   pnpm tsx scripts/seed-mpk-centers.ts --all               # Seed for ALL active accounts
 *   pnpm tsx scripts/seed-mpk-centers.ts --cleanup           # Delete existing before seeding
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''

let accessToken: string

// The 10 standard MPK names matching legacy MpkValues OptionSet
const MPK_CENTERS = [
  { name: 'Consultants', description: 'External consultants and advisory services' },
  { name: 'BackOffice', description: 'Administrative and back-office operations' },
  { name: 'Management', description: 'Management and executive expenses' },
  { name: 'Cars', description: 'Vehicle fleet and transport costs' },
  { name: 'Marketing', description: 'Marketing and promotional activities' },
  { name: 'Sales', description: 'Sales department expenses' },
  { name: 'Delivery', description: 'Delivery and logistics costs' },
  { name: 'Finance', description: 'Finance department expenses' },
  { name: 'Other', description: 'Uncategorised costs' },
  { name: 'Legal', description: 'Legal and compliance services' },
]

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    nip: defaultNip,
    environment: undefined as 'demo' | 'test' | 'production' | undefined,
    cleanup: false,
    all: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) {
      result.nip = arg.split('=')[1]
    } else if (arg.startsWith('--env=')) {
      const env = arg.split('=')[1].toLowerCase()
      if (env === 'demo' || env === 'test' || env === 'production' || env === 'prod') {
        result.environment = env === 'prod' ? 'production' : (env as 'demo' | 'test' | 'production')
      }
    } else if (arg === '--cleanup') {
      result.cleanup = true
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
  const companyName = setting.dvlp_companyname || nip
  const env = envMap[setting.dvlp_environment as number] || 'unknown'
  console.log(`📋 Company: ${companyName} (${env}), settingId: ${settingId}`)
  return { settingId, companyName, env }
}

async function getAllActiveSettings(): Promise<Array<{ settingId: string; companyName: string; nip: string; env: string }>> {
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
    companyName: s.dvlp_companyname as string,
    nip: s.dvlp_nip as string,
    env: envMap[s.dvlp_environment as number] || 'unknown',
  }))
}

async function cleanupExisting(settingId: string) {
  console.log('\n🧹 Cleaning up existing MPK centers…')
  const result = await dvFetch(
    `/dvlp_ksefmpkcenters?$filter=_dvlp_settingid_value eq '${settingId}'&$select=dvlp_ksefmpkcenterid,dvlp_name`,
  )

  if (!result?.value?.length) {
    console.log('   No existing centers found.')
    return
  }

  for (const center of result.value) {
    await dvFetch(`/dvlp_ksefmpkcenters(${center.dvlp_ksefmpkcenterid})`, {
      method: 'DELETE',
    })
    console.log(`   ❌ Deleted: ${center.dvlp_name}`)
  }
  console.log(`   Removed ${result.value.length} center(s).`)
}

async function seedCenters(settingId: string) {
  console.log(`\n🌱 Seeding ${MPK_CENTERS.length} MPK centers…`)
  let created = 0
  let skipped = 0

  // Check existing
  const existing = await dvFetch(
    `/dvlp_ksefmpkcenters?$filter=_dvlp_settingid_value eq '${settingId}'&$select=dvlp_name`,
  )
  const existingNames = new Set(
    (existing?.value || []).map((c: Record<string, string>) => c.dvlp_name),
  )

  for (const mpk of MPK_CENTERS) {
    if (existingNames.has(mpk.name)) {
      console.log(`   ⏭️  Skipped (exists): ${mpk.name}`)
      skipped++
      continue
    }

    await dvFetch('/dvlp_ksefmpkcenters', {
      method: 'POST',
      body: JSON.stringify({
        dvlp_name: mpk.name,
        dvlp_description: mpk.description,
        dvlp_isactive: true,
        dvlp_approvalrequired: false,
        'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${settingId})`,
      }),
    })
    console.log(`   ✅ Created: ${mpk.name}`)
    created++
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`)
}

async function main() {
  const opts = parseArgs()

  console.log('🔐 Acquiring Dataverse token…')
  await getToken()

  if (opts.all) {
    // Seed MPK centers for ALL active accounts
    const settings = await getAllActiveSettings()
    console.log(`\n📋 Found ${settings.length} active account(s):\n`)
    for (const s of settings) {
      console.log(`   • ${s.companyName} (NIP: ${s.nip}, ${s.env})`)
    }

    for (const s of settings) {
      console.log(`\n${'═'.repeat(60)}`)
      console.log(`🏢 ${s.companyName} (NIP: ${s.nip}, ${s.env})`)
      console.log('═'.repeat(60))

      if (opts.cleanup) {
        await cleanupExisting(s.settingId)
      }
      await seedCenters(s.settingId)
    }

    console.log(`\n✅ Done — seeded MPK centers for ${settings.length} account(s).`)
  } else {
    if (!opts.nip) {
      console.error('❌ NIP is required. Use --nip=... or set KSEF_NIP in .env.local (or use --all for all accounts)')
      process.exit(1)
    }

    const { settingId } = await getCompanySetting(opts.nip, opts.environment)

    if (opts.cleanup) {
      await cleanupExisting(settingId)
    }

    await seedCenters(settingId)
    console.log('\n✅ Done.')
  }
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err)
  process.exit(1)
})
