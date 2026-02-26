/**
 * Seed corrective invoice test data into Dataverse
 *
 * Creates 3 corrective invoices (faktury korygujące) linked to existing invoices.
 * Picks random existing invoices, then creates corrections with negative amounts.
 *
 * Usage:
 *   pnpm tsx scripts/seed-corrective-invoices.ts --env=demo              # dry-run
 *   pnpm tsx scripts/seed-corrective-invoices.ts --env=demo --execute    # create in Dataverse
 *   pnpm tsx scripts/seed-corrective-invoices.ts --nip=1234567890 --execute
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------
const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''
let accessToken: string

// Dataverse OptionSet values
const InvoiceTypeValues = {
  VAT: 100000001,
  Corrective: 100000002,
  Advance: 100000003,
} as const

const SourceValues = {
  KSeF: 100000000,
  Manual: 100000001,
}

// ------------------------------------------------------------------
// CLI args
// ------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    nip: defaultNip,
    environment: undefined as 'demo' | 'test' | 'production' | undefined,
    execute: false,
  }
  for (const arg of args) {
    if (arg.startsWith('--nip=')) result.nip = arg.split('=')[1]
    else if (arg.startsWith('--env=')) {
      const env = arg.split('=')[1].toLowerCase()
      if (env === 'demo' || env === 'test' || env === 'production' || env === 'prod') {
        result.environment = env === 'prod' ? 'production' : (env as 'demo' | 'test' | 'production')
      }
    } else if (arg === '--execute') result.execute = true
  }
  return result
}

// ------------------------------------------------------------------
// Dataverse helpers
// ------------------------------------------------------------------
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
    throw new Error(`Dataverse error ${response.status}: ${error}`)
  }
  if (response.status === 204) return null
  return response.json()
}

// Environment value mapping
const envMap: Record<number, string> = {
  100000000: 'production',
  100000001: 'test',
  100000002: 'demo',
}
const reverseEnvMap: Record<string, number> = {
  production: 100000000,
  test: 100000001,
  demo: 100000002,
}

async function getCompanySetting(nip: string, targetEnv?: 'demo' | 'test' | 'production') {
  const result = await dvFetch(`/dvlp_ksefsettings?$filter=dvlp_nip eq '${nip}'`)
  if (!result.value || result.value.length === 0) {
    throw new Error(`Company with NIP ${nip} not found in settings`)
  }

  let setting = result.value[0]
  if (targetEnv) {
    const envValue = reverseEnvMap[targetEnv]
    const envMatching = result.value.find((s: Record<string, unknown>) => s.dvlp_environment === envValue)
    if (envMatching) {
      setting = envMatching
    } else {
      throw new Error(`Setting for environment '${targetEnv}' not found for NIP ${nip}`)
    }
  }

  return {
    id: setting.dvlp_ksefsettingid,
    nip: setting.dvlp_nip,
    companyName: setting.dvlp_companyname || setting.dvlp_name,
    environment: envMap[setting.dvlp_environment as number] || 'unknown',
  }
}

// ------------------------------------------------------------------
// Corrective invoice definitions (reasons & amount adjustments)
// ------------------------------------------------------------------
interface CorrectionDef {
  reason: string
  /** Fraction of the original gross amount to subtract (negative correction) */
  amountFraction: number
}

const CORRECTION_DEFS: CorrectionDef[] = [
  {
    reason: 'Błąd w cenie jednostkowej — zawyżona kwota na pozycji 1',
    amountFraction: -0.15, // -15% of original
  },
  {
    reason: 'Zwrot towaru — 2 szt. zwrócone przez nabywcę',
    amountFraction: -0.30, // -30% of original
  },
  {
    reason: 'Udzielony rabat potransakcyjny 5%',
    amountFraction: -0.05, // -5% of original
  },
]

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  const opts = parseArgs()

  console.log('\n📝 Seed Corrective Invoices (Faktury Korygujące)\n')
  console.log('='.repeat(60))

  if (!opts.nip) {
    console.error('❌ Error: NIP is required. Set KSEF_NIP env var or use --nip=xxx')
    process.exit(1)
  }

  console.log(`📌 NIP: ${opts.nip}`)
  if (opts.environment) console.log(`📌 Environment: ${opts.environment}`)
  console.log(`📌 Mode: ${opts.execute ? '🟢 EXECUTE' : '🔵 DRY-RUN (preview only)'}`)
  console.log()

  // Authenticate
  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')

  // Get company setting
  console.log('🏢 Getting company settings...')
  const company = await getCompanySetting(opts.nip, opts.environment)
  console.log(`   ✅ Found: ${company.companyName} (${company.environment})`)
  console.log(`   📌 Setting ID: ${company.id}`)

  if (company.environment === 'production') {
    console.error('\n❌ Error: Cannot seed data in production environment!')
    process.exit(1)
  }
  console.log()

  // Fetch existing VAT invoices to use as parents
  console.log('🔍 Fetching existing VAT invoices to correct...')
  const existingResult = await dvFetch(
    `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${company.id} and dvlp_invoicetype eq ${InvoiceTypeValues.VAT}` +
      `&$select=dvlp_ksefinvoiceid,dvlp_name,dvlp_invoicenumber,dvlp_sellername,dvlp_sellernip,dvlp_selleraddress,dvlp_sellercountry,dvlp_buyername,dvlp_buyernip,dvlp_netamount,dvlp_vatamount,dvlp_grossamount,dvlp_ksefreferencenumber,dvlp_invoicedate,dvlp_costcenter,dvlp_category,dvlp_source` +
      `&$orderby=dvlp_invoicedate desc&$top=30`,
  )

  const candidates = existingResult?.value || []

  if (candidates.length === 0) {
    // Fallback: try invoices without invoice type (pre-migration data)
    console.log('   No invoices with type=VAT found, trying all invoices...')
    const fallbackResult = await dvFetch(
      `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${company.id}` +
        `&$select=dvlp_ksefinvoiceid,dvlp_name,dvlp_invoicenumber,dvlp_sellername,dvlp_sellernip,dvlp_selleraddress,dvlp_sellercountry,dvlp_buyername,dvlp_buyernip,dvlp_netamount,dvlp_vatamount,dvlp_grossamount,dvlp_ksefreferencenumber,dvlp_invoicedate,dvlp_costcenter,dvlp_category,dvlp_source` +
        `&$orderby=dvlp_invoicedate desc&$top=30`,
    )
    candidates.push(...(fallbackResult?.value || []))
  }

  if (candidates.length < 3) {
    console.error(`\n❌ Error: Need at least 3 existing invoices to create corrections, found ${candidates.length}`)
    console.log('   Run seed-testdata.ts first to generate base invoices.')
    process.exit(1)
  }

  console.log(`   ✅ Found ${candidates.length} candidate invoices\n`)

  // Pick 3 random distinct invoices
  const shuffled = candidates.sort(() => Math.random() - 0.5)
  const parents = shuffled.slice(0, 3)

  // Build corrective invoices
  console.log('⚙️  Preparing corrective invoices:\n')

  const corrections: Array<{
    parentId: string
    parentNumber: string
    parentRef: string
    supplierName: string
    dvData: Record<string, unknown>
    summary: string
  }> = []

  for (let i = 0; i < 3; i++) {
    const parent = parents[i]
    const def = CORRECTION_DEFS[i]
    const parentNumber = parent.dvlp_invoicenumber || parent.dvlp_name || 'N/A'
    const parentRef = parent.dvlp_ksefreferencenumber || ''

    // Calculate correction amounts (negative values)
    const origNet = parent.dvlp_netamount || 0
    const origGross = parent.dvlp_grossamount || 0
    const corrNet = Math.round(origNet * def.amountFraction * 100) / 100
    const corrVat = Math.round((origGross - origNet) * def.amountFraction * 100) / 100
    const corrGross = Math.round(origGross * def.amountFraction * 100) / 100

    // Corrective invoice date = 5–15 days after original
    const origDate = new Date(parent.dvlp_invoicedate || Date.now())
    const corrDate = new Date(origDate)
    corrDate.setDate(corrDate.getDate() + 5 + Math.floor(Math.random() * 11))
    // Don't go into future
    const today = new Date()
    if (corrDate > today) corrDate.setTime(today.getTime() - 86400000)

    const corrDateStr = corrDate.toISOString().split('T')[0]
    const dueDate = new Date(corrDate)
    dueDate.setDate(dueDate.getDate() + 14)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // Generate corrective invoice number
    const corrNumber = `KOR/${corrDateStr.replace(/-/g, '/')}/${i + 1}`
    const corrRef = `KORREF-${Date.now().toString(36).toUpperCase()}-${i}`

    const dvData: Record<string, unknown> = {
      'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${company.id})`,
      dvlp_name: corrNumber,
      dvlp_invoicenumber: corrNumber,
      dvlp_ksefreferencenumber: corrRef,
      // Copy supplier from parent
      dvlp_sellernip: parent.dvlp_sellernip,
      dvlp_sellername: parent.dvlp_sellername,
      dvlp_selleraddress: parent.dvlp_selleraddress || '',
      dvlp_sellercountry: parent.dvlp_sellercountry || 'PL',
      // Buyer = our company
      dvlp_buyernip: opts.nip,
      dvlp_buyername: company.companyName,
      // Dates
      dvlp_invoicedate: corrDateStr,
      dvlp_duedate: dueDateStr,
      // Negative amounts (correction)
      dvlp_netamount: corrNet,
      dvlp_vatamount: corrVat,
      dvlp_grossamount: corrGross,
      // Correction-specific fields
      dvlp_invoicetype: InvoiceTypeValues.Corrective,
      'dvlp_parentinvoiceid@odata.bind': `/dvlp_ksefinvoices(${parent.dvlp_ksefinvoiceid})`,
      // Note: dvlp_correctedinvoicenumber and dvlp_correctionreason columns
      // are not yet provisioned in Dataverse — correction info is stored in description
      // Other
      dvlp_paymentstatus: 100000000, // pending
      dvlp_downloadedat: new Date().toISOString(),
      dvlp_source: parent.dvlp_source ?? SourceValues.Manual,
      dvlp_description: `Korekta do ${parentNumber}: ${def.reason}`,
    }

    // Copy MPK and category from parent if available
    if (parent.dvlp_costcenter) dvData.dvlp_costcenter = parent.dvlp_costcenter
    if (parent.dvlp_category) dvData.dvlp_category = parent.dvlp_category

    const summary =
      `   ${i + 1}. ${corrNumber}\n` +
      `      Korekta do: ${parentNumber} (${parent.dvlp_sellername})\n` +
      `      Powód: ${def.reason}\n` +
      `      Kwota korekty: ${corrGross.toFixed(2)} PLN (netto: ${corrNet.toFixed(2)}, VAT: ${corrVat.toFixed(2)})\n` +
      `      Data: ${corrDateStr}`

    console.log(summary)
    console.log()

    corrections.push({
      parentId: parent.dvlp_ksefinvoiceid,
      parentNumber,
      parentRef,
      supplierName: parent.dvlp_sellername,
      dvData,
      summary,
    })
  }

  // Execute or dry-run
  if (!opts.execute) {
    console.log('='.repeat(60))
    console.log('🔵 DRY-RUN — no data was created.')
    console.log('   Add --execute flag to create these invoices in Dataverse.')
    console.log()
    return
  }

  console.log('📤 Creating corrective invoices in Dataverse...\n')

  let created = 0
  for (const corr of corrections) {
    try {
      const result = await dvFetch('/dvlp_ksefinvoices', {
        method: 'POST',
        body: JSON.stringify(corr.dvData),
      })
      created++
      console.log(`   ✅ Created: ${corr.dvData.dvlp_invoicenumber} → linked to ${corr.parentNumber}`)
      console.log(`      ID: ${result?.dvlp_ksefinvoiceid}`)
    } catch (err) {
      console.error(`   ❌ Failed: ${corr.dvData.dvlp_invoicenumber}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`✅ Created ${created}/3 corrective invoices`)
  console.log()
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
