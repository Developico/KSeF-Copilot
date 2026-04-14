/**
 * Seed realistic 2026 seasonal cost document test data
 *
 * Generates ~150 cost documents across Jan–Dec 2026 with:
 *  - Rising cost trend (amountMultiplier grows from 0.7 to 1.1)
 *  - Seasonal patterns (more receipts in summer, more contracts in Q4)
 *  - Document type distribution varying by month
 *  - Payment status decay (H1 = 100% paid, then decreasing)
 *  - Mix of sources: Manual (60%), OCR (25%), Import (15%)
 *
 * Usage:
 *   pnpm tsx scripts/seed-cost-documents-seasonal.ts                     # dry-run
 *   pnpm tsx scripts/seed-cost-documents-seasonal.ts --execute           # create in Dataverse
 *   pnpm tsx scripts/seed-cost-documents-seasonal.ts --execute --nip=1234567890
 *   pnpm tsx scripts/seed-cost-documents-seasonal.ts --execute --env=demo
 *   pnpm tsx scripts/seed-cost-documents-seasonal.ts --execute --cleanup  # delete existing first
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'
import {
  generateCostDocuments,
  calculateCostDocumentSummary,
  type GenerateCostDocumentsOptions,
} from '../src/lib/testdata'
import {
  CostDocumentType,
  CostDocumentSource,
} from '../src/types/cost-document'
import {
  PAYMENT_STATUS,
  APPROVAL_STATUS,
  COST_DOCUMENT_TYPE,
  COST_DOCUMENT_STATUS,
  COST_DOCUMENT_SOURCE,
  CURRENCY,
} from '../src/lib/dataverse/config'
import { MpkValues } from '../src/lib/dataverse/entities'

// ── Monthly plan ────────────────────────────────────────────

interface MonthPlan {
  month: number
  label: string
  count: number
  paidPercentage: number
  approvedPercentage: number
  amountMultiplier: number
  /** Override document type weights for this month (optional) */
  documentTypes?: CostDocumentType[]
}

const MONTHLY_PLAN: MonthPlan[] = [
  // H1 2026 — all paid (100%)
  { month: 1,  label: 'Jan 26', count: 10, paidPercentage: 100, approvedPercentage: 100, amountMultiplier: 0.70 },
  { month: 2,  label: 'Feb 26', count: 11, paidPercentage: 100, approvedPercentage: 100, amountMultiplier: 0.72 },
  { month: 3,  label: 'Mar 26', count: 13, paidPercentage: 100, approvedPercentage: 95,  amountMultiplier: 0.78 },
  { month: 4,  label: 'Apr 26', count: 12, paidPercentage: 100, approvedPercentage: 95,  amountMultiplier: 0.75 },
  { month: 5,  label: 'May 26', count: 14, paidPercentage: 100, approvedPercentage: 90,  amountMultiplier: 0.80 },
  { month: 6,  label: 'Jun 26', count: 16, paidPercentage: 100, approvedPercentage: 90,  amountMultiplier: 0.88 },

  // H2 2026 — paid % gradually decreases
  { month: 7,  label: 'Jul 26', count: 14, paidPercentage: 90,  approvedPercentage: 85,  amountMultiplier: 0.82 },
  { month: 8,  label: 'Aug 26', count: 11, paidPercentage: 85,  approvedPercentage: 80,  amountMultiplier: 0.78 },
  { month: 9,  label: 'Sep 26', count: 15, paidPercentage: 75,  approvedPercentage: 75,  amountMultiplier: 0.90 },
  { month: 10, label: 'Oct 26', count: 16, paidPercentage: 65,  approvedPercentage: 70,  amountMultiplier: 0.95 },
  { month: 11, label: 'Nov 26', count: 18, paidPercentage: 50,  approvedPercentage: 60,  amountMultiplier: 1.00 },
  { month: 12, label: 'Dec 26', count: 20, paidPercentage: 35,  approvedPercentage: 50,  amountMultiplier: 1.10 },
]

// ── Dataverse helpers ───────────────────────────────────────

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''
const ENTITY_SET = 'dvlp_ksefcostdocuments'

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

const envMap: Record<number, string> = { 100000000: 'production', 100000001: 'test', 100000002: 'demo' }
const reverseEnvMap: Record<string, number> = { production: 100000000, test: 100000001, demo: 100000002 }

async function getCompanySetting(nip: string, targetEnv?: 'demo' | 'test' | 'production') {
  const result = await dvFetch(`/dvlp_ksefsettings?$filter=dvlp_nip eq '${encodeURIComponent(nip)}'`)
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

async function deleteAllCostDocuments(settingId: string) {
  console.log('📋 Fetching existing cost documents...')
  const result = await dvFetch(
    `/${ENTITY_SET}?$filter=_dvlp_settingid_value eq ${settingId}&$select=dvlp_ksefcostdocumentid`,
  )
  const docs = result.value || []
  if (docs.length === 0) { console.log('   None found'); return 0 }
  console.log(`   Deleting ${docs.length} documents...`)
  let deleted = 0
  for (const doc of docs) {
    try {
      await dvFetch(`/${ENTITY_SET}(${doc.dvlp_ksefcostdocumentid})`, { method: 'DELETE' })
      deleted++
      if (deleted % 10 === 0) process.stdout.write(`\r   Deleted ${deleted}/${docs.length}`)
    } catch (err) {
      console.error(`\n   ⚠️  ${doc.dvlp_ksefcostdocumentid}:`, err instanceof Error ? err.message : err)
    }
  }
  console.log(`\n   ✅ Deleted ${deleted}`)
  return deleted
}

// ── Dataverse mappings ──────────────────────────────────────

const DocTypeMap: Record<string, number> = {
  Receipt: COST_DOCUMENT_TYPE.RECEIPT,
  Acknowledgment: COST_DOCUMENT_TYPE.ACKNOWLEDGMENT,
  ProForma: COST_DOCUMENT_TYPE.PRO_FORMA,
  DebitNote: COST_DOCUMENT_TYPE.DEBIT_NOTE,
  Bill: COST_DOCUMENT_TYPE.BILL,
  ContractInvoice: COST_DOCUMENT_TYPE.CONTRACT_INVOICE,
  Other: COST_DOCUMENT_TYPE.OTHER,
}
const DocStatusMap: Record<string, number> = {
  Draft: COST_DOCUMENT_STATUS.DRAFT,
  Active: COST_DOCUMENT_STATUS.ACTIVE,
}
const DocSourceMap: Record<string, number> = {
  Manual: COST_DOCUMENT_SOURCE.MANUAL,
  OCR: COST_DOCUMENT_SOURCE.OCR,
  Import: COST_DOCUMENT_SOURCE.IMPORT,
}
const CurrencyMap: Record<string, number> = { PLN: CURRENCY.PLN, USD: CURRENCY.USD, EUR: CURRENCY.EUR }
const ApprovalMap: Record<string, number> = {
  Draft: APPROVAL_STATUS.DRAFT,
  Pending: APPROVAL_STATUS.PENDING,
  Approved: APPROVAL_STATUS.APPROVED,
  Rejected: APPROVAL_STATUS.REJECTED,
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()

  const totalDocs = MONTHLY_PLAN.reduce((s, m) => s + m.count, 0)

  console.log('\n🌱 Seed 2026 Seasonal Cost Documents\n')
  console.log('='.repeat(60))

  if (!opts.nip) {
    console.error('❌ NIP required. Set KSEF_NIP env var or use --nip=xxx')
    process.exit(1)
  }

  console.log(`📌 NIP:          ${opts.nip}`)
  if (opts.environment) console.log(`📌 Environment:  ${opts.environment}`)
  console.log(`📌 Total docs:   ~${totalDocs} (across 12 months)`)
  console.log(`📌 Execute:      ${opts.execute ? 'Yes' : 'No (dry-run)'}`)
  console.log(`📌 Cleanup:      ${opts.cleanup ? 'Yes' : 'No'}`)
  console.log()

  // Generate all months
  console.log('⚙️  Generating monthly batches...\n')
  console.log('   Month     Count  Paid%  Appr%  Multiplier')
  console.log('   ' + '-'.repeat(50))

  interface MonthBatch {
    label: string
    docs: ReturnType<typeof generateCostDocuments>
  }
  const allBatches: MonthBatch[] = []

  for (const plan of MONTHLY_PLAN) {
    const from = new Date(2026, plan.month - 1, 1)
    const to = new Date(2026, plan.month, 0) // last day of month

    // Clamp to today if month is in the future
    const now = new Date()
    const effectiveTo = to > now ? now : to

    const docs = generateCostDocuments({
      count: plan.count,
      fromDate: from,
      toDate: effectiveTo,
      paidPercentage: plan.paidPercentage,
      approvedPercentage: plan.approvedPercentage,
      amountMultiplier: plan.amountMultiplier,
      documentTypes: plan.documentTypes,
      includeAiData: true,
      hasDocumentPercentage: 70,
    })

    allBatches.push({ label: plan.label, docs })
    console.log(
      `   ${plan.label.padEnd(10)} ${String(docs.length).padStart(4)}   ${String(plan.paidPercentage).padStart(3)}%   ${String(plan.approvedPercentage).padStart(3)}%   ${plan.amountMultiplier.toFixed(2)}x`,
    )
  }

  // Flatten and print summary
  const allDocs = allBatches.flatMap(b => b.docs)
  const summary = calculateCostDocumentSummary(allDocs)

  console.log()
  console.log(`   Total: ${summary.total} documents`)
  console.log(`   Gross PLN: ${summary.totalGrossPln.toLocaleString('pl-PL')} PLN`)
  console.log(`   Paid: ${summary.paidCount} / Unpaid: ${summary.unpaidCount}`)
  console.log()

  console.log('   By type:')
  for (const [type, count] of Object.entries(summary.byType).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / summary.total) * 100).toFixed(0)
    console.log(`     ${type.padEnd(20)} ${String(count).padStart(4)}  (${pct}%)`)
  }
  console.log()

  if (!opts.execute) {
    console.log('ℹ️  Dry-run mode. Add --execute to create documents in Dataverse.\n')
    return
  }

  // ── Execute ───────────────────────────────────────────────

  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')

  const company = await getCompanySetting(opts.nip, opts.environment)
  console.log(`🏢 ${company.companyName} (${company.environment})`)
  console.log(`   Setting ID: ${company.id}`)

  if (company.environment === 'production') {
    console.error('\n❌ Cannot seed in production!')
    process.exit(1)
  }
  console.log()

  if (opts.cleanup) {
    console.log('🧹 Cleanup...')
    await deleteAllCostDocuments(company.id)
    console.log()
  }

  let totalCreated = 0
  let totalErrors = 0

  for (const batch of allBatches) {
    process.stdout.write(`⬆️  ${batch.label}: `)
    let created = 0

    for (const doc of batch.docs) {
      try {
        const docStatus = doc.targetApprovalStatus === 'Approved' ? 'Active' : 'Draft'

        const payload: Record<string, unknown> = {
          'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${company.id})`,
          dvlp_name: doc.documentNumber,
          dvlp_documenttype: DocTypeMap[doc.documentType] ?? COST_DOCUMENT_TYPE.OTHER,
          dvlp_documentnumber: doc.documentNumber,
          dvlp_documentdate: doc.documentDate,
          dvlp_description: doc.description,
          dvlp_issuername: doc.issuerName,
          dvlp_netamount: doc.netAmount,
          dvlp_vatamount: doc.vatAmount,
          dvlp_grossamount: doc.grossAmount,
          dvlp_currency: CurrencyMap[doc.currency ?? 'PLN'] ?? CURRENCY.PLN,
          dvlp_paymentstatus: doc.shouldBePaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
          dvlp_status: DocStatusMap[docStatus] ?? COST_DOCUMENT_STATUS.DRAFT,
          dvlp_source: DocSourceMap[doc.source ?? 'Manual'] ?? COST_DOCUMENT_SOURCE.MANUAL,
          dvlp_approvalstatus: ApprovalMap[doc.targetApprovalStatus] ?? APPROVAL_STATUS.DRAFT,
          dvlp_category: doc.category,
          dvlp_tags: doc.tags,
          dvlp_notes: doc.notes,
        }

        if (doc.dueDate) payload.dvlp_duedate = doc.dueDate
        if (doc.issuerNip) payload.dvlp_issuernip = doc.issuerNip
        if (doc.issuerAddress) payload.dvlp_issueraddress = doc.issuerAddress
        if (doc.issuerCity) payload.dvlp_issuercity = doc.issuerCity
        if (doc.issuerPostalCode) payload.dvlp_issuerpostalcode = doc.issuerPostalCode
        if (doc.issuerCountry) payload.dvlp_issuercountry = doc.issuerCountry
        if (doc.exchangeRate) payload.dvlp_exchangerate = doc.exchangeRate
        if (doc.grossAmountPln) payload.dvlp_grossamountpln = doc.grossAmountPln
        if (doc.shouldBePaid && doc.suggestedPaymentDate) {
          payload.dvlp_paidat = doc.suggestedPaymentDate
        }
        if (doc.mpk && MpkValues[doc.mpk as keyof typeof MpkValues] !== undefined) {
          payload.dvlp_costcenter = MpkValues[doc.mpk as keyof typeof MpkValues]
        }
        if (doc.aiDescription) payload.dvlp_aidescription = doc.aiDescription
        if (doc.aiCategorySuggestion) payload.dvlp_aicategorysuggestion = doc.aiCategorySuggestion
        if (doc.aiConfidence !== undefined) payload.dvlp_aiconfidence = doc.aiConfidence
        if (doc.aiMpkSuggestion && MpkValues[doc.aiMpkSuggestion as keyof typeof MpkValues] !== undefined) {
          payload.dvlp_aimpksuggestion = MpkValues[doc.aiMpkSuggestion as keyof typeof MpkValues]
        }

        await dvFetch(`/${ENTITY_SET}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        created++
      } catch (err) {
        totalErrors++
        console.error(`\n   ⚠️  ${doc.documentNumber}:`, err instanceof Error ? err.message : err)
      }
    }

    totalCreated += created
    console.log(`${created}/${batch.docs.length} ✅`)
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`✅ Done! Created ${totalCreated} seasonal cost documents (${totalErrors} errors)`)
  console.log()
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
