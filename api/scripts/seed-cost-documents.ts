/**
 * Seed cost document test data into Dataverse
 *
 * Usage:
 *   pnpm tsx scripts/seed-cost-documents.ts                                # dry-run (preview)
 *   pnpm tsx scripts/seed-cost-documents.ts --execute                      # 20 docs (default)
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --count=50           # 50 documents
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --preset=realistic   # use preset
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --type=Receipt       # only receipts
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --type=Receipt,Bill  # receipts + bills
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --nip=1234567890     # specific NIP
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --env=demo           # specific env
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --paid=60            # 60% paid
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --from=2026-01-01    # start date
 *   pnpm tsx scripts/seed-cost-documents.ts --execute --cleanup            # delete first
 *   pnpm tsx scripts/seed-cost-documents.ts --list-presets                 # list presets
 *
 * Run with: pnpm tsx scripts/seed-cost-documents.ts [options]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'
import {
  generateCostDocuments,
  generateCostDocumentsFromPreset,
  calculateCostDocumentSummary,
  type GenerateCostDocumentsOptions,
  type GeneratedCostDocument,
} from '../src/lib/testdata'
import { PRESETS } from '../src/lib/testdata/cost-document-templates'
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

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''
const ENTITY_SET = 'dvlp_ksefcostdocuments'

let accessToken: string

// ── CLI argument parsing ────────────────────────────────────

interface CliOptions {
  nip: string
  environment?: 'demo' | 'test' | 'production'
  count: number
  preset?: string
  documentTypes?: CostDocumentType[]
  fromDate?: Date
  toDate?: Date
  paidPercentage: number
  approvedPercentage: number
  source?: CostDocumentSource
  amountMultiplier: number
  cleanup: boolean
  execute: boolean
  listPresets: boolean
}

/** Track which CLI args were explicitly set by the user */
const explicitArgs = new Set<string>()

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const result: CliOptions = {
    nip: defaultNip,
    count: 20,
    paidPercentage: 40,
    approvedPercentage: 60,
    amountMultiplier: 1.0,
    cleanup: false,
    execute: false,
    listPresets: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) {
      result.nip = arg.split('=')[1]
      explicitArgs.add('nip')
    } else if (arg.startsWith('--env=')) {
      const env = arg.split('=')[1].toLowerCase()
      if (env === 'demo' || env === 'test' || env === 'production' || env === 'prod') {
        result.environment = env === 'prod' ? 'production' : env as 'demo' | 'test' | 'production'
      }
      explicitArgs.add('environment')
    } else if (arg.startsWith('--count=')) {
      result.count = Math.min(Math.max(parseInt(arg.split('=')[1]) || 20, 1), 1000)
      explicitArgs.add('count')
    } else if (arg.startsWith('--preset=')) {
      result.preset = arg.split('=')[1]
    } else if (arg.startsWith('--type=')) {
      const types = arg.split('=')[1].split(',').map(t => t.trim())
      const validTypes = Object.values(CostDocumentType)
      result.documentTypes = types.filter(t => validTypes.includes(t as CostDocumentType)) as CostDocumentType[]
      if (result.documentTypes.length === 0) {
        console.error(`❌ Invalid type(s). Valid: ${validTypes.join(', ')}`)
        process.exit(1)
      }
      explicitArgs.add('documentTypes')
    } else if (arg.startsWith('--from=')) {
      result.fromDate = new Date(arg.split('=')[1])
      explicitArgs.add('fromDate')
    } else if (arg.startsWith('--to=')) {
      result.toDate = new Date(arg.split('=')[1])
      explicitArgs.add('toDate')
    } else if (arg.startsWith('--paid=')) {
      result.paidPercentage = Math.min(Math.max(parseInt(arg.split('=')[1]) || 40, 0), 100)
      explicitArgs.add('paidPercentage')
    } else if (arg.startsWith('--approved=')) {
      result.approvedPercentage = Math.min(Math.max(parseInt(arg.split('=')[1]) || 60, 0), 100)
      explicitArgs.add('approvedPercentage')
    } else if (arg.startsWith('--source=')) {
      const src = arg.split('=')[1]
      if (src === 'Manual' || src === 'OCR' || src === 'Import') {
        result.source = src as CostDocumentSource
      }
      explicitArgs.add('source')
    } else if (arg.startsWith('--multiplier=')) {
      result.amountMultiplier = parseFloat(arg.split('=')[1]) || 1.0
      explicitArgs.add('amountMultiplier')
    } else if (arg === '--cleanup') {
      result.cleanup = true
    } else if (arg === '--execute') {
      result.execute = true
    } else if (arg === '--list-presets') {
      result.listPresets = true
    }
  }

  return result
}

// ── Authentication ──────────────────────────────────────────

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

// ── Dataverse helpers ───────────────────────────────────────

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

async function getCompanySetting(nip: string, targetEnv?: 'demo' | 'test' | 'production') {
  const result = await dvFetch(`/dvlp_ksefsettings?$filter=dvlp_nip eq '${encodeURIComponent(nip)}'`)
  if (!result.value || result.value.length === 0) {
    throw new Error(`Company with NIP ${nip} not found in settings`)
  }

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

  let setting = result.value[0]
  if (targetEnv) {
    const envValue = reverseEnvMap[targetEnv]
    const match = result.value.find((s: Record<string, unknown>) => s.dvlp_environment === envValue)
    if (match) {
      setting = match
    } else {
      console.log(`\n⚠️  No setting found for environment '${targetEnv}'. Available:`)
      for (const s of result.value) {
        console.log(`   - "${s.dvlp_companyname || s.dvlp_name}" (${envMap[s.dvlp_environment as number] || 'unknown'})`)
      }
      throw new Error(`Setting for environment '${targetEnv}' not found for NIP ${nip}`)
    }
  }

  return {
    id: setting.dvlp_ksefsettingid,
    nip: setting.dvlp_nip,
    companyName: setting.dvlp_companyname || setting.dvlp_name,
    environment: envMap[setting.dvlp_environment] || 'unknown',
  }
}

async function countCostDocuments(settingId: string) {
  const result = await dvFetch(
    `/${ENTITY_SET}?$filter=_dvlp_settingid_value eq ${settingId}&$select=dvlp_ksefcostdocumentid&$count=true`,
  )
  return result?.value?.length || 0
}

async function deleteAllCostDocuments(settingId: string) {
  console.log('📋 Fetching existing cost documents for this setting...')

  const result = await dvFetch(
    `/${ENTITY_SET}?$filter=_dvlp_settingid_value eq ${settingId}&$select=dvlp_ksefcostdocumentid`,
  )
  const docs = result.value || []

  if (docs.length === 0) {
    console.log('   No cost documents to delete')
    return 0
  }

  console.log(`   Found ${docs.length} cost documents to delete`)

  let deleted = 0
  for (const doc of docs) {
    try {
      await dvFetch(`/${ENTITY_SET}(${doc.dvlp_ksefcostdocumentid})`, { method: 'DELETE' })
      deleted++
      if (deleted % 10 === 0) {
        process.stdout.write(`\r   Deleted ${deleted}/${docs.length}`)
      }
    } catch (err) {
      console.error(`\n   Failed to delete ${doc.dvlp_ksefcostdocumentid}:`, err)
    }
  }

  console.log(`\n   ✅ Deleted ${deleted} cost documents`)
  return deleted
}

// ── Dataverse value mappings ────────────────────────────────

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
  Cancelled: COST_DOCUMENT_STATUS.CANCELLED,
}

const DocSourceMap: Record<string, number> = {
  Manual: COST_DOCUMENT_SOURCE.MANUAL,
  OCR: COST_DOCUMENT_SOURCE.OCR,
  Import: COST_DOCUMENT_SOURCE.IMPORT,
}

const CurrencyMap: Record<string, number> = {
  PLN: CURRENCY.PLN,
  USD: CURRENCY.USD,
  EUR: CURRENCY.EUR,
}

const ApprovalMap: Record<string, number> = {
  Draft: APPROVAL_STATUS.DRAFT,
  Pending: APPROVAL_STATUS.PENDING,
  Approved: APPROVAL_STATUS.APPROVED,
  Rejected: APPROVAL_STATUS.REJECTED,
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()

  // Handle --list-presets
  if (opts.listPresets) {
    console.log('\n📦 Available presets:\n')
    for (const [key, preset] of Object.entries(PRESETS)) {
      console.log(`  ${key.padEnd(18)} ${preset.description}`)
      console.log(`${''.padEnd(20)} count=${preset.count}, paid=${preset.paidPercentage}%, approved=${preset.approvedPercentage}%, months=${preset.monthsBack}`)
      console.log()
    }
    return
  }

  console.log('\n🌱 Seed Cost Document Test Data\n')
  console.log('='.repeat(60))

  if (!opts.nip) {
    console.error('❌ Error: NIP is required. Set KSEF_NIP env var or use --nip=xxx')
    process.exit(1)
  }

  // Display configuration
  console.log(`📌 NIP:            ${opts.nip}`)
  if (opts.environment) console.log(`📌 Environment:    ${opts.environment}`)
  if (opts.preset) console.log(`📌 Preset:         ${opts.preset}`)
  console.log(`📌 Count:          ${opts.preset ? PRESETS[opts.preset]?.count ?? opts.count : opts.count}`)
  if (opts.documentTypes) console.log(`📌 Types:          ${opts.documentTypes.join(', ')}`)
  console.log(`📌 Paid %:         ${opts.paidPercentage}%`)
  console.log(`📌 Approved %:     ${opts.approvedPercentage}%`)
  if (opts.source) console.log(`📌 Source:         ${opts.source}`)
  if (opts.amountMultiplier !== 1.0) console.log(`📌 Amount mult.:   ${opts.amountMultiplier}x`)
  if (opts.fromDate) console.log(`📌 From:           ${opts.fromDate.toISOString().split('T')[0]}`)
  if (opts.toDate) console.log(`📌 To:             ${opts.toDate.toISOString().split('T')[0]}`)
  console.log(`📌 Cleanup:        ${opts.cleanup ? 'Yes' : 'No'}`)
  console.log(`📌 Execute:        ${opts.execute ? 'Yes' : 'No (dry-run)'}`)
  console.log()

  // Generate documents
  console.log('⚙️  Generating cost documents...')

  let docs: GeneratedCostDocument[]

  if (opts.preset) {
    // Only pass CLI args that were explicitly set as overrides
    const overrides: Partial<GenerateCostDocumentsOptions> = {}
    if (explicitArgs.has('count')) overrides.count = opts.count
    if (explicitArgs.has('documentTypes')) overrides.documentTypes = opts.documentTypes
    if (explicitArgs.has('fromDate')) overrides.fromDate = opts.fromDate
    if (explicitArgs.has('toDate')) overrides.toDate = opts.toDate
    if (explicitArgs.has('paidPercentage')) overrides.paidPercentage = opts.paidPercentage
    if (explicitArgs.has('approvedPercentage')) overrides.approvedPercentage = opts.approvedPercentage
    if (explicitArgs.has('source')) overrides.source = opts.source
    if (explicitArgs.has('amountMultiplier')) overrides.amountMultiplier = opts.amountMultiplier
    docs = generateCostDocumentsFromPreset(opts.preset, overrides)
  } else {
    docs = generateCostDocuments({
      count: opts.count,
      documentTypes: opts.documentTypes,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      paidPercentage: opts.paidPercentage,
      approvedPercentage: opts.approvedPercentage,
      source: opts.source,
      amountMultiplier: opts.amountMultiplier,
    })
  }

  const summary = calculateCostDocumentSummary(docs)

  console.log(`   ✅ Generated ${summary.total} cost documents\n`)

  // Display summary
  console.log('📊 Summary:')
  console.log(`   Date range:     ${summary.dateRange.from} → ${summary.dateRange.to}`)
  console.log(`   Total gross PLN: ${summary.totalGrossPln.toLocaleString('pl-PL')} PLN`)
  console.log(`   Paid / Unpaid:  ${summary.paidCount} / ${summary.unpaidCount}`)
  console.log(`   With AI data:   ${summary.withAiCount}`)
  console.log()

  console.log('   By type:')
  for (const [type, count] of Object.entries(summary.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${type.padEnd(20)} ${count}`)
  }

  console.log('\n   By currency:')
  for (const [cur, count] of Object.entries(summary.byCurrency).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${cur.padEnd(8)} ${count}`)
  }

  console.log('\n   By approval status:')
  for (const [status, count] of Object.entries(summary.byApprovalStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${status.padEnd(12)} ${count}`)
  }

  // Preview first 5
  console.log('\n📄 Preview (first 5):')
  for (const doc of docs.slice(0, 5)) {
    console.log(`   ${doc.documentDate}  ${doc.documentType.padEnd(18)} ${doc.grossAmount.toFixed(2).padStart(12)} ${doc.currency ?? 'PLN'}  ${doc.issuerName.substring(0, 35)}`)
  }
  console.log()

  if (!opts.execute) {
    console.log('ℹ️  Dry-run mode. Add --execute to actually create documents in Dataverse.\n')
    return
  }

  // ── Execute: write to Dataverse ───────────────────────────

  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')

  console.log('🏢 Getting company settings...')
  const company = await getCompanySetting(opts.nip, opts.environment)
  console.log(`   ✅ Found: ${company.companyName}`)
  console.log(`   📌 Setting ID: ${company.id}`)
  console.log(`   📌 Environment: ${company.environment}`)

  if (company.environment === 'production') {
    console.error('\n❌ Error: Cannot seed data in production environment!')
    process.exit(1)
  }
  console.log()

  // Cleanup if requested
  if (opts.cleanup) {
    console.log('🧹 Cleanup existing cost documents...')
    await deleteAllCostDocuments(company.id)
    console.log()
  }

  // Count existing
  const existingCount = await countCostDocuments(company.id)
  console.log(`📋 Existing cost documents: ${existingCount}\n`)

  // Create documents
  console.log(`⬆️  Creating ${docs.length} cost documents in Dataverse...`)
  let created = 0
  let errors = 0

  for (const doc of docs) {
    try {
      // Determine status based on approval: Active if Approved, Draft otherwise
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

      // Optional fields
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

      // MPK (legacy enum field)
      if (doc.mpk && MpkValues[doc.mpk as keyof typeof MpkValues] !== undefined) {
        payload.dvlp_costcenter = MpkValues[doc.mpk as keyof typeof MpkValues]
      }

      // AI fields
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
      if (created % 10 === 0 || created === docs.length) {
        process.stdout.write(`\r   Created ${created}/${docs.length}`)
      }
    } catch (err) {
      errors++
      console.error(`\n   ⚠️  Failed: ${doc.documentNumber}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log()
  console.log()
  console.log('='.repeat(60))
  console.log(`✅ Done! Created ${created} cost documents (${errors} errors)`)

  const finalCount = await countCostDocuments(company.id)
  console.log(`📋 Total cost documents for this setting: ${finalCount}`)
  console.log()
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
