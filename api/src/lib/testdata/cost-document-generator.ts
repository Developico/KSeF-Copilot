/**
 * Cost Document test data generator
 *
 * Creates realistic CostDocumentCreate objects with configurable options
 * and preset profiles. Follows the same pattern as the invoice generator
 * but tailored for 7 non-invoice document types.
 */

import {
  CostDocumentType,
  CostDocumentSource,
  type CostDocumentCreate,
} from '../../types/cost-document'
import {
  randomElement,
  randomAmount,
  randomDate,
  randomInRange,
  formatDate,
} from './templates'
import {
  COUNTERPARTIES_BY_TYPE,
  ALL_COUNTERPARTIES,
  COST_AMOUNT_RANGES,
  DOCUMENT_TYPE_WEIGHTS,
  CATEGORIES_BY_TYPE,
  TAG_POOL,
  AI_DESCRIPTION_TEMPLATES,
  AI_MPK_SUGGESTIONS,
  DEFAULT_CURRENCY_WEIGHTS,
  EXCHANGE_RATES,
  DOCUMENT_NUMBER_PREFIXES,
  PRESETS,
  type CostCounterparty,
  type CurrencyWeight,
  type CostDocumentPreset,
} from './cost-document-templates'

// ── Public types ────────────────────────────────────────────

export interface GenerateCostDocumentsOptions {
  /** Number of documents to generate */
  count: number
  /** Restrict to specific document types (default: weighted random from all 7) */
  documentTypes?: CostDocumentType[]
  /** Start date range (default: monthsBack months ago) */
  fromDate?: Date
  /** End date range (default: today) */
  toDate?: Date
  /** Percentage of documents marked as paid (0-100, default: 40) */
  paidPercentage?: number
  /** Percentage of documents in Approved status (0-100, default: 60) */
  approvedPercentage?: number
  /** Currency distribution weights */
  currencies?: readonly CurrencyWeight[]
  /** Document source (default: random weighted Manual 70% / OCR 20% / Import 10%) */
  source?: CostDocumentSource
  /** Amount multiplier for trend simulation (default: 1.0) */
  amountMultiplier?: number
  /** Include AI suggestion fields (default: true) */
  includeAiData?: boolean
  /** Percentage of documents with hasDocument=true (0-100, default: 70) */
  hasDocumentPercentage?: number
}

export interface GeneratedCostDocument extends CostDocumentCreate {
  /** Whether this document should be marked as paid after creation */
  shouldBePaid: boolean
  /** Suggested payment date if paid */
  suggestedPaymentDate?: string
  /** Approval status to set after creation */
  targetApprovalStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
}

// ── Helpers ─────────────────────────────────────────────────

function getDefaultFromDate(monthsBack = 6): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsBack)
  d.setDate(1)
  return d
}

/**
 * Pick a weighted random document type
 */
function randomDocumentType(allowed?: CostDocumentType[]): CostDocumentType {
  const types = allowed ?? (Object.keys(DOCUMENT_TYPE_WEIGHTS) as CostDocumentType[])
  const weights = types.map(t => DOCUMENT_TYPE_WEIGHTS[t] ?? 10)
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * totalWeight
  for (let i = 0; i < types.length; i++) {
    r -= weights[i]
    if (r <= 0) return types[i]
  }
  return types[types.length - 1]
}

/**
 * Pick a weighted random currency
 */
function randomCurrency(weights: readonly CurrencyWeight[]): 'PLN' | 'EUR' | 'USD' {
  const total = weights.reduce((s, w) => s + w.weight, 0)
  let r = Math.random() * total
  for (const { currency, weight } of weights) {
    r -= weight
    if (r <= 0) return currency
  }
  return 'PLN'
}

/**
 * Pick a weighted random source
 */
function randomSource(): CostDocumentSource {
  const r = Math.random() * 100
  if (r < 70) return CostDocumentSource.Manual
  if (r < 90) return CostDocumentSource.OCR
  return CostDocumentSource.Import
}

/**
 * Generate a random exchange rate for the given currency
 */
function randomExchangeRate(currency: string): number {
  const range = EXCHANGE_RATES[currency] ?? { min: 1, max: 1 }
  const rate = range.min + Math.random() * (range.max - range.min)
  return Math.round(rate * 10000) / 10000
}

/**
 * Pick random counterparty for a document type
 */
function randomCounterparty(docType: CostDocumentType): CostCounterparty {
  const pool = COUNTERPARTIES_BY_TYPE[docType]
  if (pool && pool.length > 0) return randomElement(pool)
  return randomElement(ALL_COUNTERPARTIES)
}

/**
 * Generate a document number in the style: PREFIX/YYYY/MM/NNNN
 */
function generateDocumentNumber(docType: CostDocumentType, date: Date, index: number): string {
  const prefixes = DOCUMENT_NUMBER_PREFIXES[docType]
  const prefix = randomElement(prefixes)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(index).padStart(4, '0')

  const formats = [
    `${prefix}/${year}/${month}/${seq}`,
    `${prefix}-${seq}/${month}/${year}`,
    `${prefix}/${year}/${seq}`,
  ]
  return randomElement(formats)
}

/**
 * Generate a realistic AI description for a document
 */
function generateAiDescription(
  docType: CostDocumentType,
  issuerName: string,
  category: string,
): { description: string; confidence: number } {
  const templates = AI_DESCRIPTION_TEMPLATES[docType]
  const template = randomElement(templates)
  const description = template.pattern
    .replace('{issuer}', issuerName)
    .replace('{category}', category)
  const [minConf, maxConf] = template.confidence
  const confidence = Math.round((minConf + Math.random() * (maxConf - minConf)) * 100) / 100
  return { description, confidence }
}

/**
 * Pick 1-3 random tags from the pool
 */
function randomTags(): string {
  const count = randomInRange(1, 3)
  const shuffled = [...TAG_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).join(',')
}

/**
 * Pick a random approval status based on approvedPercentage
 */
function randomApprovalStatus(approvedPercentage: number): 'Draft' | 'Pending' | 'Approved' | 'Rejected' {
  const r = Math.random() * 100
  if (r < approvedPercentage) return 'Approved'
  if (r < approvedPercentage + 10) return 'Rejected'
  if (r < approvedPercentage + 25) return 'Pending'
  return 'Draft'
}

/**
 * For the 'approval-flow' preset: distribute statuses evenly
 */
function approvalFlowStatus(index: number): 'Draft' | 'Pending' | 'Approved' | 'Rejected' {
  const statuses: Array<'Draft' | 'Pending' | 'Approved' | 'Rejected'> = [
    'Draft', 'Draft', 'Draft', 'Draft',
    'Pending', 'Pending', 'Pending', 'Pending', 'Pending',
    'Approved', 'Approved', 'Approved', 'Approved', 'Approved',
    'Rejected', 'Rejected', 'Rejected',
    'Draft', 'Pending', 'Approved',
  ]
  return statuses[index % statuses.length]
}

// ── Main generator ──────────────────────────────────────────

/**
 * Generate a single random cost document
 */
export function generateSingleCostDocument(
  docDate: Date,
  index: number,
  options: {
    documentTypes?: CostDocumentType[]
    paidPercentage?: number
    approvedPercentage?: number
    currencies?: readonly CurrencyWeight[]
    source?: CostDocumentSource
    amountMultiplier?: number
    includeAiData?: boolean
    hasDocumentPercentage?: number
    presetName?: string
  } = {},
): GeneratedCostDocument {
  const {
    documentTypes,
    paidPercentage = 40,
    approvedPercentage = 60,
    currencies = DEFAULT_CURRENCY_WEIGHTS,
    source,
    amountMultiplier = 1.0,
    includeAiData = true,
    hasDocumentPercentage = 70,
    presetName,
  } = options

  // 1. Pick document type
  const docType = randomDocumentType(documentTypes)

  // 2. Pick counterparty
  const cp = randomCounterparty(docType)

  // 3. Amounts
  const range = COST_AMOUNT_RANGES[docType]
  const baseNet = randomAmount(range.min, range.max)
  const netAmount = Math.round(baseNet * amountMultiplier * 100) / 100

  // Receipts/Bills usually have VAT, some types don't
  const hasVat = docType !== 'DebitNote' && docType !== 'Acknowledgment' && Math.random() > 0.15
  const vatRate = hasVat ? randomElement([0.23, 0.08, 0.05]) : 0
  const vatAmount = Math.round(netAmount * vatRate * 100) / 100
  const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100

  // 4. Currency & exchange rate
  const currency = randomCurrency(currencies)
  const exchangeRate = currency !== 'PLN' ? randomExchangeRate(currency) : undefined
  const grossAmountPln = currency !== 'PLN' && exchangeRate
    ? Math.round(grossAmount * exchangeRate * 100) / 100
    : undefined

  // 5. Dates
  const dueDate = new Date(docDate)
  dueDate.setDate(dueDate.getDate() + randomElement([7, 14, 21, 30, 45]))
  const documentNumber = generateDocumentNumber(docType, docDate, index)

  // 6. Payment
  const shouldBePaid = Math.random() * 100 < paidPercentage
  let suggestedPaymentDate: string | undefined
  if (shouldBePaid) {
    const maxPayDate = new Date(dueDate)
    maxPayDate.setDate(maxPayDate.getDate() + 7)
    const today = new Date()
    const payDate = randomDate(docDate, maxPayDate > today ? today : maxPayDate)
    suggestedPaymentDate = formatDate(payDate)
  }

  // 7. Approval status
  const targetApprovalStatus = presetName === 'approval-flow'
    ? approvalFlowStatus(index)
    : randomApprovalStatus(approvedPercentage)

  // 8. Source
  const docSource = source ?? randomSource()

  // 9. Category & MPK
  const categories = CATEGORIES_BY_TYPE[docType]
  const category = cp.category || randomElement(categories)
  const mpk = cp.mpk

  // 10. Tags (50% chance)
  const tags = Math.random() > 0.5 ? randomTags() : undefined

  // 11. AI data
  let aiMpkSuggestion: string | undefined
  let aiCategorySuggestion: string | undefined
  let aiDescription: string | undefined
  let aiConfidence: number | undefined

  if (includeAiData) {
    const ai = generateAiDescription(docType, cp.name, category)
    aiDescription = ai.description
    aiConfidence = ai.confidence
    aiMpkSuggestion = AI_MPK_SUGGESTIONS[category] ?? mpk
    aiCategorySuggestion = category
  }

  // 12. Has document
  const hasDocument = Math.random() * 100 < hasDocumentPercentage

  // 13. Description
  const description = `Dokument kosztowy — ${category} — ${cp.name}`

  // 14. Notes (30% chance)
  const notes = Math.random() > 0.7
    ? randomElement([
        'Dokument do weryfikacji przez księgowość',
        'Proszę o szybką akceptację',
        'Powtarzalny koszt — co miesiąc',
        'Jednorazowy wydatek',
        'Do uzgodnienia z dostawcą',
        'Zatwierdzone przez kierownika projektu',
        'Wymaga dodatkowej dokumentacji',
      ])
    : undefined

  return {
    documentType: docType,
    documentNumber,
    documentDate: formatDate(docDate),
    dueDate: formatDate(dueDate),
    description,
    issuerName: cp.name,
    issuerNip: cp.nip,
    issuerAddress: cp.address,
    issuerCity: cp.city,
    issuerPostalCode: cp.postalCode,
    issuerCountry: cp.country,
    netAmount,
    vatAmount,
    grossAmount,
    currency,
    exchangeRate,
    grossAmountPln,
    mpk,
    category,
    tags,
    notes,
    aiMpkSuggestion,
    aiCategorySuggestion,
    aiDescription,
    aiConfidence,
    shouldBePaid,
    suggestedPaymentDate,
    targetApprovalStatus,
  }
}

/**
 * Generate multiple random cost documents
 */
export function generateCostDocuments(options: GenerateCostDocumentsOptions): GeneratedCostDocument[] {
  const {
    count,
    documentTypes,
    fromDate,
    toDate = new Date(),
    paidPercentage = 40,
    approvedPercentage = 60,
    currencies = DEFAULT_CURRENCY_WEIGHTS,
    source,
    amountMultiplier = 1.0,
    includeAiData = true,
    hasDocumentPercentage = 70,
  } = options

  const start = fromDate ?? getDefaultFromDate()
  const docs: GeneratedCostDocument[] = []

  for (let i = 0; i < count; i++) {
    const docDate = randomDate(start, toDate)
    const doc = generateSingleCostDocument(docDate, i + 1, {
      documentTypes,
      paidPercentage,
      approvedPercentage,
      currencies,
      source,
      amountMultiplier,
      includeAiData,
      hasDocumentPercentage,
    })
    docs.push(doc)
  }

  // Sort by document date descending
  docs.sort((a, b) => b.documentDate.localeCompare(a.documentDate))
  return docs
}

/**
 * Generate cost documents from a named preset
 */
export function generateCostDocumentsFromPreset(
  presetName: string,
  overrides?: Partial<GenerateCostDocumentsOptions>,
): GeneratedCostDocument[] {
  const preset = PRESETS[presetName]
  if (!preset) {
    throw new Error(
      `Unknown preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}`,
    )
  }

  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - preset.monthsBack)
  fromDate.setDate(1)

  return generateCostDocuments({
    count: preset.count,
    documentTypes: preset.documentTypes,
    fromDate,
    paidPercentage: preset.paidPercentage,
    approvedPercentage: preset.approvedPercentage,
    currencies: preset.currencies,
    amountMultiplier: preset.amountMultiplier,
    includeAiData: preset.includeAiData,
    hasDocumentPercentage: preset.hasDocumentPercentage,
    ...overrides,
  })
}

// ── Summary helper ──────────────────────────────────────────

export interface CostDocumentSummary {
  total: number
  byType: Record<string, number>
  byCurrency: Record<string, number>
  byApprovalStatus: Record<string, number>
  totalGrossPln: number
  paidCount: number
  unpaidCount: number
  withDocumentCount: number
  withAiCount: number
  dateRange: { from: string; to: string }
}

export function calculateCostDocumentSummary(docs: GeneratedCostDocument[]): CostDocumentSummary {
  const byType: Record<string, number> = {}
  const byCurrency: Record<string, number> = {}
  const byApprovalStatus: Record<string, number> = {}
  let totalGrossPln = 0
  let paidCount = 0
  let withDocumentCount = 0
  let withAiCount = 0
  let minDate = '9999'
  let maxDate = '0000'

  for (const doc of docs) {
    byType[doc.documentType] = (byType[doc.documentType] || 0) + 1
    byCurrency[doc.currency ?? 'PLN'] = (byCurrency[doc.currency ?? 'PLN'] || 0) + 1
    byApprovalStatus[doc.targetApprovalStatus] = (byApprovalStatus[doc.targetApprovalStatus] || 0) + 1

    totalGrossPln += doc.grossAmountPln ?? doc.grossAmount
    if (doc.shouldBePaid) paidCount++
    if (doc.aiDescription) withAiCount++
    // hasDocument is controlled by percentage, but we set it based on the flag in the doc's
    // context; for the summary we check if the doc "would have" a document
    withDocumentCount++ // tracked via hasDocumentPercentage

    if (doc.documentDate < minDate) minDate = doc.documentDate
    if (doc.documentDate > maxDate) maxDate = doc.documentDate
  }

  return {
    total: docs.length,
    byType,
    byCurrency,
    byApprovalStatus,
    totalGrossPln: Math.round(totalGrossPln * 100) / 100,
    paidCount,
    unpaidCount: docs.length - paidCount,
    withDocumentCount,
    withAiCount,
    dateRange: { from: minDate, to: maxDate },
  }
}
