/**
 * Anomaly detection engine — rule-based + statistical analysis
 * 
 * Detects unusual patterns in invoice data:
 * - Amount spikes (vs supplier/MPK historical average)
 * - New high-value suppliers
 * - Category spending shifts
 * - Frequency changes
 * - Duplicate suspects
 */

// ============================================================================
// Types
// ============================================================================

export type AnomalyType =
  | 'amount-spike'
  | 'new-supplier'
  | 'category-shift'
  | 'frequency-change'
  | 'duplicate-suspect'

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Anomaly {
  id: string
  invoiceId: string
  invoiceNumber: string
  type: AnomalyType
  severity: AnomalySeverity
  score: number                     // 0-100
  description: string
  expected: number
  actual: number
  deviation: number                 // % deviation
  supplierName: string
  supplierNip: string
  grossAmount: number
  invoiceDate: string
  mpk?: string
  category?: string
}

export interface AnomalySummary {
  total: number
  bySeverity: Record<AnomalySeverity, number>
  totalAmount: number
  topTypes: { type: AnomalyType; count: number }[]
}

export interface AnomalyResult {
  anomalies: Anomaly[]
  summary: AnomalySummary
  analyzedInvoices: number
  period: { from: string; to: string }
}

export interface InvoiceRecord {
  id: string
  invoiceNumber: string
  invoiceDate: string
  grossAmount: number
  netAmount: number
  supplierNip: string
  supplierName: string
  mpk?: string
  category?: string
  dueDate?: string
}

export interface AnomalyParams {
  periodDays?: number               // default: 30
  sensitivityThreshold?: number     // default: 2.0 (standard deviations)
}

// ============================================================================
// Detection Engine
// ============================================================================

/**
 * Run all anomaly detection rules on recent invoices against historical data.
 * 
 * @param recentInvoices - invoices in the analysis period
 * @param historicalInvoices - older invoices used as baseline
 * @param params - detection parameters
 */
export function detectAnomalies(
  recentInvoices: InvoiceRecord[],
  historicalInvoices: InvoiceRecord[],
  params: AnomalyParams = {}
): AnomalyResult {
  const threshold = params.sensitivityThreshold ?? 2.0
  const anomalies: Anomaly[] = []

  // Build historical baselines
  const supplierBaseline = buildSupplierBaseline(historicalInvoices)
  const mpkBaseline = buildMpkMonthlyBaseline(historicalInvoices)
  const categoryBaseline = buildCategoryMonthlyBaseline(historicalInvoices)

  // Run detection rules
  for (const invoice of recentInvoices) {
    // Rule 1: Amount spike vs supplier average
    const amountAnomaly = detectAmountSpike(invoice, supplierBaseline, threshold)
    if (amountAnomaly) anomalies.push(amountAnomaly)

    // Rule 2: New high-value supplier
    const newSupplierAnomaly = detectNewSupplier(invoice, supplierBaseline)
    if (newSupplierAnomaly) anomalies.push(newSupplierAnomaly)

    // Rule 3: Duplicate suspect
    const duplicates = detectDuplicateSuspect(invoice, recentInvoices)
    anomalies.push(...duplicates)
  }

  // Rule 4: Category spending shift (aggregate level)
  const categoryShifts = detectCategoryShifts(recentInvoices, categoryBaseline)
  anomalies.push(...categoryShifts)

  // Rule 5: Supplier frequency change
  const frequencyChanges = detectFrequencyChanges(recentInvoices, supplierBaseline)
  anomalies.push(...frequencyChanges)

  // Deduplicate (same invoice can't have same anomaly type twice)
  const unique = deduplicateAnomalies(anomalies)

  // Sort by severity then score
  const severityOrder: Record<AnomalySeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.score - a.score)

  // Build summary
  const summary = buildSummary(unique)

  const dates = recentInvoices.map((i) => i.invoiceDate).filter(Boolean).sort()

  return {
    anomalies: unique,
    summary,
    analyzedInvoices: recentInvoices.length,
    period: {
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
  }
}

// ============================================================================
// Baselines
// ============================================================================

interface SupplierStats {
  avgAmount: number
  stdDev: number
  count: number
  totalAmount: number
  avgPerMonth: number
  monthsActive: number
}

function buildSupplierBaseline(invoices: InvoiceRecord[]): Map<string, SupplierStats> {
  const map = new Map<string, { amounts: number[]; months: Set<string> }>()

  for (const inv of invoices) {
    if (!inv.supplierNip) continue
    const entry = map.get(inv.supplierNip) || { amounts: [], months: new Set() }
    entry.amounts.push(inv.grossAmount)
    if (inv.invoiceDate) entry.months.add(inv.invoiceDate.substring(0, 7))
    map.set(inv.supplierNip, entry)
  }

  const result = new Map<string, SupplierStats>()
  for (const [nip, data] of map) {
    const avg = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
    const variance = data.amounts.reduce((a, v) => a + (v - avg) ** 2, 0) / Math.max(1, data.amounts.length - 1)
    result.set(nip, {
      avgAmount: avg,
      stdDev: Math.sqrt(variance),
      count: data.amounts.length,
      totalAmount: data.amounts.reduce((a, b) => a + b, 0),
      avgPerMonth: data.amounts.length / Math.max(1, data.months.size),
      monthsActive: data.months.size,
    })
  }
  return result
}

interface MonthlyBaseline {
  avgMonthly: number
  stdDev: number
  months: Map<string, number>
}

function buildMpkMonthlyBaseline(invoices: InvoiceRecord[]): Map<string, MonthlyBaseline> {
  return buildGroupMonthlyBaseline(invoices, (inv) => inv.mpk || 'Other')
}

function buildCategoryMonthlyBaseline(invoices: InvoiceRecord[]): Map<string, MonthlyBaseline> {
  return buildGroupMonthlyBaseline(invoices, (inv) => inv.category || 'Uncategorized')
}

function buildGroupMonthlyBaseline(
  invoices: InvoiceRecord[],
  groupFn: (inv: InvoiceRecord) => string
): Map<string, MonthlyBaseline> {
  const grouped = new Map<string, Map<string, number>>()

  for (const inv of invoices) {
    const group = groupFn(inv)
    const months = grouped.get(group) || new Map<string, number>()
    const month = inv.invoiceDate?.substring(0, 7) || 'unknown'
    months.set(month, (months.get(month) || 0) + inv.grossAmount)
    grouped.set(group, months)
  }

  const result = new Map<string, MonthlyBaseline>()
  for (const [group, months] of grouped) {
    const values = Array.from(months.values())
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, v) => a + (v - avg) ** 2, 0) / Math.max(1, values.length - 1)
    result.set(group, {
      avgMonthly: avg,
      stdDev: Math.sqrt(variance),
      months,
    })
  }
  return result
}

// ============================================================================
// Detection Rules
// ============================================================================

function detectAmountSpike(
  invoice: InvoiceRecord,
  supplierBaseline: Map<string, SupplierStats>,
  threshold: number
): Anomaly | null {
  const stats = supplierBaseline.get(invoice.supplierNip)
  if (!stats || stats.count < 3) return null // Need baseline

  const deviation = stats.stdDev > 0
    ? (invoice.grossAmount - stats.avgAmount) / stats.stdDev
    : 0

  if (deviation < threshold) return null

  const deviationPct = ((invoice.grossAmount - stats.avgAmount) / stats.avgAmount) * 100
  const score = Math.min(100, Math.round(deviation * 25))

  return {
    id: `spike-${invoice.id}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    type: 'amount-spike',
    severity: scoreSeverity(score),
    score,
    description: `Invoice ${Math.round(deviationPct)}% higher than supplier average`,
    expected: Math.round(stats.avgAmount * 100) / 100,
    actual: invoice.grossAmount,
    deviation: Math.round(deviationPct * 10) / 10,
    supplierName: invoice.supplierName,
    supplierNip: invoice.supplierNip,
    grossAmount: invoice.grossAmount,
    invoiceDate: invoice.invoiceDate,
    mpk: invoice.mpk,
    category: invoice.category,
  }
}

function detectNewSupplier(
  invoice: InvoiceRecord,
  supplierBaseline: Map<string, SupplierStats>
): Anomaly | null {
  if (supplierBaseline.has(invoice.supplierNip)) return null

  // Only flag if amount is significant (> 10,000 PLN)
  const HIGH_VALUE_THRESHOLD = 10000
  if (invoice.grossAmount < HIGH_VALUE_THRESHOLD) return null

  const score = Math.min(100, Math.round((invoice.grossAmount / HIGH_VALUE_THRESHOLD) * 20))

  return {
    id: `new-supplier-${invoice.id}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    type: 'new-supplier',
    severity: scoreSeverity(score),
    score,
    description: `First invoice from new supplier (${formatAmount(invoice.grossAmount)})`,
    expected: 0,
    actual: invoice.grossAmount,
    deviation: 100,
    supplierName: invoice.supplierName,
    supplierNip: invoice.supplierNip,
    grossAmount: invoice.grossAmount,
    invoiceDate: invoice.invoiceDate,
    mpk: invoice.mpk,
    category: invoice.category,
  }
}

function detectDuplicateSuspect(
  invoice: InvoiceRecord,
  allRecent: InvoiceRecord[]
): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (const other of allRecent) {
    if (other.id === invoice.id) continue
    if (other.id > invoice.id) continue // avoid duplicate pairs

    // Same supplier + similar amount (±5%) + close dates (±3 days)
    if (other.supplierNip !== invoice.supplierNip) continue

    const amountDiff = Math.abs(other.grossAmount - invoice.grossAmount)
    const amountPct = (amountDiff / Math.max(invoice.grossAmount, 1)) * 100
    if (amountPct > 5) continue

    const daysDiff = Math.abs(dateDiffDays(invoice.invoiceDate, other.invoiceDate))
    if (daysDiff > 3) continue

    anomalies.push({
      id: `dup-${invoice.id}-${other.id}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: 'duplicate-suspect',
      severity: 'high',
      score: 80,
      description: `Possible duplicate: similar amount to ${other.invoiceNumber} (${daysDiff}d apart)`,
      expected: 1,
      actual: 2,
      deviation: 100,
      supplierName: invoice.supplierName,
      supplierNip: invoice.supplierNip,
      grossAmount: invoice.grossAmount,
      invoiceDate: invoice.invoiceDate,
      mpk: invoice.mpk,
      category: invoice.category,
    })
  }

  return anomalies
}

function detectCategoryShifts(
  recentInvoices: InvoiceRecord[],
  categoryBaseline: Map<string, MonthlyBaseline>
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Aggregate recent by category
  const recentByCategory = new Map<string, number>()
  for (const inv of recentInvoices) {
    const cat = inv.category || 'Uncategorized'
    recentByCategory.set(cat, (recentByCategory.get(cat) || 0) + inv.grossAmount)
  }

  for (const [category, recentTotal] of recentByCategory) {
    const baseline = categoryBaseline.get(category)
    if (!baseline || baseline.avgMonthly === 0) continue

    const deviationPct = ((recentTotal - baseline.avgMonthly) / baseline.avgMonthly) * 100
    if (deviationPct < 50) continue // Only flag 50%+ increases

    const score = Math.min(100, Math.round(deviationPct / 3))
    // Use the highest-value invoice from this category as representative
    const representative = recentInvoices
      .filter((i) => (i.category || 'Uncategorized') === category)
      .sort((a, b) => b.grossAmount - a.grossAmount)[0]

    if (!representative) continue

    anomalies.push({
      id: `cat-shift-${category}`,
      invoiceId: representative.id,
      invoiceNumber: representative.invoiceNumber,
      type: 'category-shift',
      severity: scoreSeverity(score),
      score,
      description: `"${category}" spending ${Math.round(deviationPct)}% above monthly average`,
      expected: Math.round(baseline.avgMonthly * 100) / 100,
      actual: Math.round(recentTotal * 100) / 100,
      deviation: Math.round(deviationPct * 10) / 10,
      supplierName: representative.supplierName,
      supplierNip: representative.supplierNip,
      grossAmount: recentTotal,
      invoiceDate: representative.invoiceDate,
      category,
    })
  }

  return anomalies
}

function detectFrequencyChanges(
  recentInvoices: InvoiceRecord[],
  supplierBaseline: Map<string, SupplierStats>
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Count recent invoices per supplier
  const recentCounts = new Map<string, InvoiceRecord[]>()
  for (const inv of recentInvoices) {
    const list = recentCounts.get(inv.supplierNip) || []
    list.push(inv)
    recentCounts.set(inv.supplierNip, list)
  }

  for (const [nip, invoices] of recentCounts) {
    const stats = supplierBaseline.get(nip)
    if (!stats || stats.monthsActive < 3) continue

    const recentCount = invoices.length
    const expectedPerMonth = stats.avgPerMonth

    // Flag if 2x+ the expected frequency
    if (recentCount < expectedPerMonth * 2) continue

    const deviationPct = ((recentCount - expectedPerMonth) / expectedPerMonth) * 100
    const score = Math.min(100, Math.round(deviationPct / 3))
    const representative = invoices.sort((a, b) => b.grossAmount - a.grossAmount)[0]

    anomalies.push({
      id: `freq-${nip}`,
      invoiceId: representative.id,
      invoiceNumber: representative.invoiceNumber,
      type: 'frequency-change',
      severity: scoreSeverity(score),
      score,
      description: `${recentCount} invoices this period (avg: ${Math.round(expectedPerMonth * 10) / 10}/month)`,
      expected: Math.round(expectedPerMonth * 10) / 10,
      actual: recentCount,
      deviation: Math.round(deviationPct * 10) / 10,
      supplierName: representative.supplierName,
      supplierNip: representative.supplierNip,
      grossAmount: invoices.reduce((s, i) => s + i.grossAmount, 0),
      invoiceDate: representative.invoiceDate,
    })
  }

  return anomalies
}

// ============================================================================
// Helpers
// ============================================================================

function scoreSeverity(score: number): AnomalySeverity {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function dateDiffDays(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24))
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount)
}

function deduplicateAnomalies(anomalies: Anomaly[]): Anomaly[] {
  const seen = new Set<string>()
  return anomalies.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}

function buildSummary(anomalies: Anomaly[]): AnomalySummary {
  const bySeverity: Record<AnomalySeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  const byType = new Map<AnomalyType, number>()
  let totalAmount = 0

  for (const a of anomalies) {
    bySeverity[a.severity]++
    byType.set(a.type, (byType.get(a.type) || 0) + 1)
    totalAmount += a.grossAmount
  }

  const topTypes = Array.from(byType.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total: anomalies.length,
    bySeverity,
    totalAmount,
    topTypes,
  }
}
