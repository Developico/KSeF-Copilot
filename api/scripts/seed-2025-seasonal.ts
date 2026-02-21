/**
 * Seed realistic 2025 seasonal test data
 *
 * Generates ~186 invoices across all 12 months of 2025 with:
 *  - Rising cost trend (amountMultiplier grows from 0.65 to 1.05)
 *  - Seasonal patterns (summer dip, Q-end spikes, Dec maximum)
 *  - Mix of KSeF (50%) and Manual (50%) sources
 *  - Realistic payment statuses (H1 = 100% paid, Jul = 90%, then decreasing)
 *
 * Usage:
 *   pnpm tsx scripts/seed-2025-seasonal.ts                         # dry-run (preview only)
 *   pnpm tsx scripts/seed-2025-seasonal.ts --execute               # actually create invoices
 *   pnpm tsx scripts/seed-2025-seasonal.ts --execute --nip=1234567890
 *   pnpm tsx scripts/seed-2025-seasonal.ts --execute --env=demo
 *   pnpm tsx scripts/seed-2025-seasonal.ts --execute --cleanup     # delete existing 2025 data first
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'
import { generateInvoices, calculateSummary, type GenerateInvoicesOptions } from '../src/lib/testdata'
import { InvoiceSource, PaymentStatus } from '../src/types/invoice'

// ------------------------------------------------------------------
// Monthly plan — designed for realistic seasonality & upward trend
// ------------------------------------------------------------------
interface MonthPlan {
  month: number          // 1–12
  label: string
  count: number          // invoices in this month
  paidPercentage: number // % marked as paid
  amountMultiplier: number // scales net amounts (trend simulation)
  ksefPercentage: number // % sourced from KSeF
}

const MONTHLY_PLAN: MonthPlan[] = [
  // H1 2025 — all paid (100%)
  { month: 1,  label: 'Jan 25', count: 12, paidPercentage: 100, amountMultiplier: 0.65, ksefPercentage: 40 },
  { month: 2,  label: 'Feb 25', count: 13, paidPercentage: 100, amountMultiplier: 0.68, ksefPercentage: 45 },
  { month: 3,  label: 'Mar 25', count: 15, paidPercentage: 100, amountMultiplier: 0.73, ksefPercentage: 45 },
  { month: 4,  label: 'Apr 25', count: 14, paidPercentage: 100, amountMultiplier: 0.72, ksefPercentage: 50 },
  { month: 5,  label: 'May 25', count: 15, paidPercentage: 100, amountMultiplier: 0.78, ksefPercentage: 50 },
  { month: 6,  label: 'Jun 25', count: 18, paidPercentage: 100, amountMultiplier: 0.85, ksefPercentage: 55 },

  // H2 2025 — paid % gradually decreases
  { month: 7,  label: 'Jul 25', count: 12, paidPercentage: 90,  amountMultiplier: 0.78, ksefPercentage: 55 },
  { month: 8,  label: 'Aug 25', count: 11, paidPercentage: 85,  amountMultiplier: 0.75, ksefPercentage: 55 },
  { month: 9,  label: 'Sep 25', count: 17, paidPercentage: 80,  amountMultiplier: 0.88, ksefPercentage: 60 },
  { month: 10, label: 'Oct 25', count: 18, paidPercentage: 70,  amountMultiplier: 0.92, ksefPercentage: 60 },
  { month: 11, label: 'Nov 25', count: 19, paidPercentage: 60,  amountMultiplier: 0.98, ksefPercentage: 65 },
  { month: 12, label: 'Dec 25', count: 22, paidPercentage: 50,  amountMultiplier: 1.05, ksefPercentage: 65 },
]

// ------------------------------------------------------------------
// Dataverse helpers (same approach as seed-testdata.ts)
// ------------------------------------------------------------------
const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''
let accessToken: string

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    nip: defaultNip,
    environment: undefined as 'demo' | 'test' | 'production' | undefined,
    execute: false,
    cleanup: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) result.nip = arg.split('=')[1]
    else if (arg.startsWith('--env=')) {
      const env = arg.split('=')[1].toLowerCase()
      if (env === 'demo' || env === 'test' || env === 'production' || env === 'prod') {
        result.environment = env === 'prod' ? 'production' : env as 'demo' | 'test' | 'production'
      }
    }
    else if (arg === '--execute') result.execute = true
    else if (arg === '--cleanup') result.cleanup = true
  }

  return result
}

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

// ------------------------------------------------------------------
// Company setting lookup
// ------------------------------------------------------------------
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
  if (!result.value?.length) throw new Error(`Company with NIP ${nip} not found`)

  let setting = result.value[0]
  if (targetEnv) {
    const envValue = reverseEnvMap[targetEnv]
    const match = result.value.find((s: Record<string, unknown>) => s.dvlp_environment === envValue)
    if (match) setting = match
    else throw new Error(`Setting for environment '${targetEnv}' not found for NIP ${nip}`)
  }

  return {
    id: setting.dvlp_ksefsettingid,
    nip: setting.dvlp_nip,
    companyName: setting.dvlp_companyname || setting.dvlp_name,
    environment: envMap[setting.dvlp_environment as number] || 'unknown',
  }
}

// ------------------------------------------------------------------
// CRUD helpers
// ------------------------------------------------------------------
const MpkValues: Record<string, number> = {
  Consultants: 100000000, BackOffice: 100000001, Management: 100000002,
  Cars: 100000003, Marketing: 100000005, Sales: 100000006,
  Delivery: 100000007, Finance: 100000008, Other: 100000009, Legal: 100000100,
}
const SourceValues = { KSeF: 100000000, Manual: 100000001 }

async function createInvoice(data: Record<string, unknown>) {
  return dvFetch('/dvlp_ksefinvoices', { method: 'POST', body: JSON.stringify(data) })
}

async function markAsPaid(id: string, paymentDate: string) {
  return dvFetch(`/dvlp_ksefinvoices(${id})`, {
    method: 'PATCH',
    body: JSON.stringify({ dvlp_paymentstatus: 100000001, dvlp_paidat: paymentDate }),
  })
}

async function deleteInvoicesInRange(settingId: string, from: string, to: string) {
  console.log(`   Fetching invoices ${from} → ${to}...`)
  const result = await dvFetch(
    `/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${settingId}` +
    ` and dvlp_invoicedate ge ${from} and dvlp_invoicedate le ${to}` +
    `&$select=dvlp_ksefinvoiceid`
  )
  const invoices = result?.value || []
  if (!invoices.length) { console.log('   Nothing to delete'); return 0 }

  console.log(`   Deleting ${invoices.length} invoices...`)
  let deleted = 0
  for (const inv of invoices) {
    try {
      await dvFetch(`/dvlp_ksefinvoices(${inv.dvlp_ksefinvoiceid})`, { method: 'DELETE' })
      deleted++
      if (deleted % 10 === 0) process.stdout.write(`\r   Deleted ${deleted}/${invoices.length}`)
    } catch (err) {
      console.error(`\n   Delete failed: ${inv.dvlp_ksefinvoiceid}`)
    }
  }
  console.log(`\n   ✅ Deleted ${deleted} invoices`)
  return deleted
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  const opts = parseArgs()

  console.log('\n📅 Seed 2025 Seasonal Test Data\n')
  console.log('='.repeat(65))

  if (!opts.nip) {
    console.error('❌ NIP is required. Set KSEF_NIP env var or use --nip=xxx')
    process.exit(1)
  }

  // Print plan summary
  const totalInvoices = MONTHLY_PLAN.reduce((s, m) => s + m.count, 0)
  console.log(`\n📌 NIP:         ${opts.nip}`)
  if (opts.environment) console.log(`📌 Environment: ${opts.environment}`)
  console.log(`📌 Total:       ${totalInvoices} invoices across 12 months`)
  console.log(`📌 Cleanup:     ${opts.cleanup ? 'Yes' : 'No'}`)
  console.log(`📌 Mode:        ${opts.execute ? '🔴 EXECUTE (will write to Dataverse)' : '🟢 DRY-RUN (preview only)'}`)

  // Preview table
  console.log('\n' + '-'.repeat(88))
  console.log(
    'Month'.padEnd(10) +
    'Count'.padStart(7) +
    'Paid %'.padStart(8) +
    'Multiplier'.padStart(12) +
    'KSeF %'.padStart(8) +
    '   Est. Net (PLN)'.padStart(20) +
    '   Comment'
  )
  console.log('-'.repeat(88))

  // Generate all months for preview
  const allInvoices: { month: number; invoices: ReturnType<typeof generateInvoices> }[] = []

  for (const plan of MONTHLY_PLAN) {
    const year = 2025
    const fromDate = new Date(year, plan.month - 1, 1)
    const lastDay = new Date(year, plan.month, 0).getDate()
    const toDate = new Date(year, plan.month - 1, lastDay)

    // Generate KSeF + Manual mix
    const ksefCount = Math.round(plan.count * plan.ksefPercentage / 100)
    const manualCount = plan.count - ksefCount

    const invoices = [
      ...generateInvoices({
        tenantNip: opts.nip,
        tenantName: 'Developico Sp. z o.o.',
        count: ksefCount,
        fromDate, toDate,
        paidPercentage: plan.paidPercentage,
        source: InvoiceSource.KSeF,
        amountMultiplier: plan.amountMultiplier,
      }),
      ...generateInvoices({
        tenantNip: opts.nip,
        tenantName: 'Developico Sp. z o.o.',
        count: manualCount,
        fromDate, toDate,
        paidPercentage: plan.paidPercentage,
        source: InvoiceSource.Manual,
        amountMultiplier: plan.amountMultiplier,
      }),
    ]

    allInvoices.push({ month: plan.month, invoices })

    const monthSummary = calculateSummary(invoices)
    const paidCount = invoices.filter(i => i.shouldBePaid).length
    const comment =
      plan.month <= 6 ? '(H1 — all paid)' :
      plan.month === 7 || plan.month === 8 ? '(summer dip)' :
      plan.month === 12 ? '(year-end peak)' :
      plan.month === 9 ? '(back-to-business)' : ''

    console.log(
      plan.label.padEnd(10) +
      String(invoices.length).padStart(7) +
      `${paidCount}/${invoices.length}`.padStart(8) +
      `×${plan.amountMultiplier.toFixed(2)}`.padStart(12) +
      `${plan.ksefPercentage}%`.padStart(8) +
      `${monthSummary.totalNetAmount.toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł`.padStart(20) +
      `   ${comment}`
    )
  }

  // Grand totals
  const allFlat = allInvoices.flatMap(m => m.invoices)
  const grandSummary = calculateSummary(allFlat)
  const totalPaid = allFlat.filter(i => i.shouldBePaid).length

  console.log('-'.repeat(88))
  console.log(
    'TOTAL'.padEnd(10) +
    String(allFlat.length).padStart(7) +
    `${totalPaid}/${allFlat.length}`.padStart(8) +
    ''.padStart(12) +
    ''.padStart(8) +
    `${grandSummary.totalNetAmount.toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł`.padStart(20)
  )
  console.log(
    ''.padEnd(10) +
    ''.padStart(7) +
    ''.padStart(8) +
    ''.padStart(12) +
    ''.padStart(8) +
    `${grandSummary.totalGrossAmount.toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł (brutto)`.padStart(35)
  )

  console.log('\n📊 By MPK:')
  for (const [mpk, cnt] of Object.entries(grandSummary.byMpk).sort((a, b) => b[1] - a[1])) {
    const pct = ((cnt / allFlat.length) * 100).toFixed(1)
    console.log(`   ${mpk.padEnd(15)} ${String(cnt).padStart(4)} (${pct}%)`)
  }

  console.log('\n📊 By Category:')
  for (const [cat, cnt] of Object.entries(grandSummary.byCategory).sort((a, b) => b[1] - a[1])) {
    const pct = ((cnt / allFlat.length) * 100).toFixed(1)
    console.log(`   ${cat.padEnd(20)} ${String(cnt).padStart(4)} (${pct}%)`)
  }

  if (!opts.execute) {
    console.log('\n💡 This was a DRY-RUN. Add --execute to write to Dataverse.\n')
    return
  }

  // -------- EXECUTE MODE --------
  console.log('\n🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired')

  console.log('\n🏢 Getting company settings...')
  const company = await getCompanySetting(opts.nip, opts.environment)
  console.log(`   ✅ ${company.companyName} (${company.environment})`)
  console.log(`   📌 Setting ID: ${company.id}`)

  if (company.environment === 'production') {
    console.error('\n❌ Cannot seed data in production environment!')
    process.exit(1)
  }

  // Cleanup 2025 data if requested
  if (opts.cleanup) {
    console.log('\n🧹 Cleaning up existing 2025 data...')
    await deleteInvoicesInRange(company.id, '2025-01-01', '2025-12-31')
  }

  // Create invoices month by month
  console.log('\n📤 Creating invoices in Dataverse...\n')

  let totalCreated = 0
  let totalPaidCreated = 0
  let totalFailed = 0

  for (const { month, invoices } of allInvoices) {
    const plan = MONTHLY_PLAN.find(p => p.month === month)!
    process.stdout.write(`   ${plan.label}: `)

    let created = 0
    let paidCreated = 0
    let failed = 0

    for (const invoice of invoices) {
      try {
        const { shouldBePaid, suggestedPaymentDate, ...data } = invoice

        const dvData: Record<string, unknown> = {
          'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${company.id})`,
          dvlp_buyernip: data.tenantNip,
          dvlp_buyername: data.tenantName,
          dvlp_buyeraddress: data.buyerAddress,
          dvlp_buyercountry: data.buyerCountry,
          dvlp_ksefreferencenumber: data.referenceNumber,
          dvlp_name: data.invoiceNumber,
          dvlp_invoicenumber: data.invoiceNumber,
          dvlp_sellernip: data.supplierNip,
          dvlp_sellername: data.supplierName,
          dvlp_selleraddress: data.supplierAddress,
          dvlp_sellercountry: data.supplierCountry,
          dvlp_invoicedate: data.invoiceDate,
          dvlp_duedate: data.dueDate,
          dvlp_netamount: data.netAmount,
          dvlp_vatamount: data.vatAmount,
          dvlp_grossamount: data.grossAmount,
          dvlp_paymentstatus: 100000000, // pending
          dvlp_downloadedat: new Date().toISOString(),
          dvlp_source: SourceValues[data.source || 'Manual'],
          dvlp_description: data.description,
          dvlp_category: data.category,
        }

        if (data.mpk && data.mpk in MpkValues) {
          dvData.dvlp_costcenter = MpkValues[data.mpk]
        }

        const createdInvoice = await createInvoice(dvData)
        created++

        if (shouldBePaid && suggestedPaymentDate) {
          try {
            await markAsPaid(createdInvoice.dvlp_ksefinvoiceid, suggestedPaymentDate)
            paidCreated++
          } catch { /* invoice created, payment update failed — non-critical */ }
        }
      } catch (err) {
        failed++
      }
    }

    totalCreated += created
    totalPaidCreated += paidCreated
    totalFailed += failed

    console.log(`${created} created, ${paidCreated} paid` + (failed ? `, ${failed} failed` : ''))
  }

  console.log('\n' + '='.repeat(65))
  console.log(`✅ Done! Created ${totalCreated} invoices (${totalPaidCreated} paid, ${totalFailed} failed)`)
  console.log()
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
