/**
 * Fix invoices created with wrong settingId
 * Reassigns invoices from one setting to another (e.g. prod → demo)
 * 
 * Usage:
 *   pnpm tsx scripts/fix-setting-id.ts                    # dry-run: list settings & count
 *   pnpm tsx scripts/fix-setting-id.ts --execute           # actually reassign
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const nip = process.env.KSEF_NIP!
if (!nip) throw new Error('KSEF_NIP env variable is required')
let accessToken: string

const execute = process.argv.includes('--execute')

async function getToken() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  })
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: [`${dataverseUrl}/.default`],
  })
  if (!tokenResponse?.accessToken) throw new Error('Failed to acquire token')
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
    throw new Error(`Dataverse error ${response.status}: ${error.substring(0, 300)}`)
  }
  if (response.status === 204) return null
  return response.json()
}

const envMap: Record<number, string> = {
  100000000: 'production',
  100000001: 'test',
  100000002: 'demo',
}

async function main() {
  console.log('\n🔧 Fix Setting ID — Reassign invoices\n')
  console.log('='.repeat(60))
  console.log(`📌 Mode: ${execute ? '🔴 EXECUTE' : '🟢 DRY-RUN'}`)
  console.log(`📌 NIP:  ${nip}\n`)

  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')

  // Step 1: List all settings for this NIP
  console.log('🏢 Fetching settings for NIP...')
  const settingsResult = await dvFetch(`/dvlp_ksefsettings?$filter=dvlp_nip eq '${nip}'`)
  const settings = settingsResult.value || []

  if (settings.length === 0) {
    console.error('❌ No settings found for this NIP')
    process.exit(1)
  }

  console.log(`   Found ${settings.length} settings:\n`)

  for (const s of settings) {
    const env = envMap[s.dvlp_environment] || `unknown (${s.dvlp_environment})`
    const name = s.dvlp_companyname || s.dvlp_name
    console.log(`   📌 ${name}`)
    console.log(`      ID:          ${s.dvlp_ksefsettingid}`)
    console.log(`      Environment: ${env}`)
    console.log(`      NIP:         ${s.dvlp_nip}`)

    // Count invoices linked to this setting
    const countResult = await dvFetch(
      `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${s.dvlp_ksefsettingid} and dvlp_invoicedate ge 2025-01-01 and dvlp_invoicedate le 2025-12-31&$select=dvlp_ksefinvoiceid&$count=true`,
      { headers: { Prefer: 'odata.include-annotations="*"' } }
    )
    const count2025 = countResult?.value?.length || 0

    const countAllResult = await dvFetch(
      `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${s.dvlp_ksefsettingid}&$select=dvlp_ksefinvoiceid`
    )
    const countAll = countAllResult?.value?.length || 0

    console.log(`      Invoices (2025): ${count2025}`)
    console.log(`      Invoices (all):  ${countAll}`)
    console.log()
  }

  // Identify source (production, non-demo) and target (demo) settings by naming convention
  const sourceSetting = settings.find((s: Record<string, unknown>) => {
    const name = ((s.dvlp_companyname || s.dvlp_name) as string || '').toLowerCase()
    return !name.includes('demo') && !name.includes('test')
  })

  const targetSetting = settings.find((s: Record<string, unknown>) => {
    const name = ((s.dvlp_companyname || s.dvlp_name) as string || '').toLowerCase()
    return name.includes('demo')
  })

  if (!sourceSetting || !targetSetting) {
    console.error('❌ Cannot identify source and target settings.')
    process.exit(1)
  }

  const sourceId = sourceSetting.dvlp_ksefsettingid
  const targetId = targetSetting.dvlp_ksefsettingid
  const sourceName = sourceSetting.dvlp_companyname || sourceSetting.dvlp_name
  const targetName = targetSetting.dvlp_companyname || targetSetting.dvlp_name

  console.log(`🔀 Plan: Move 2025 invoices`)
  console.log(`   Source: "${sourceName}" (${sourceId})`)
  console.log(`   Target: "${targetName}" (${targetId})`)

  // Fetch 2025 invoices linked to prod
  console.log('\n📋 Fetching 2025 invoices on prod setting...')
  const invoicesResult = await dvFetch(
    `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${sourceId} and dvlp_invoicedate ge 2025-01-01 and dvlp_invoicedate le 2025-12-31&$select=dvlp_ksefinvoiceid,dvlp_invoicenumber,dvlp_invoicedate`
  )
  const invoices = invoicesResult?.value || []
  console.log(`   Found ${invoices.length} invoices to reassign`)

  if (invoices.length === 0) {
    console.log('\n✅ Nothing to do — no 2025 invoices on prod setting.')
    return
  }

  if (!execute) {
    console.log('\n💡 DRY-RUN: Add --execute to actually reassign these invoices.\n')
    return
  }

  // Reassign invoices
  console.log('\n📤 Reassigning invoices...')
  let updated = 0
  let failed = 0

  for (const inv of invoices) {
    try {
      await dvFetch(`/dvlp_ksefinvoices(${inv.dvlp_ksefinvoiceid})`, {
        method: 'PATCH',
        body: JSON.stringify({
          'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${targetId})`,
        }),
      })
      updated++
      if (updated % 10 === 0) {
        process.stdout.write(`\r   Progress: ${updated}/${invoices.length}`)
      }
    } catch (err) {
      failed++
      console.error(`\n   ❌ Failed: ${inv.dvlp_ksefinvoiceid} — ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\n\n${'='.repeat(60)}`)
  console.log(`✅ Done! Reassigned ${updated} invoices from prod → demo` + (failed ? ` (${failed} failed)` : ''))
  console.log()
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
