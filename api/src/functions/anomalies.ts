/**
 * Anomaly Detection API — identify unusual invoice patterns
 * 
 * Endpoints:
 * - GET /api/anomalies          — list detected anomalies for recent period
 * - GET /api/anomalies/summary  — anomaly summary counts
 * 
 * Query params:
 * - periodDays: number (analysis period, default: 30)
 * - sensitivity: number (std deviation threshold, default: 2.0)
 * - settingId: KSeF setting ID
 * - tenantNip: buyer NIP (fallback)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { dataverseRequest } from '../lib/dataverse/client'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { InvoiceEntity } from '../lib/dataverse/entities'
import { getMpkKey } from '../lib/dataverse/entities'
import { escapeOData } from '../lib/dataverse/odata-utils'
import {
  detectAnomalies,
  getAnomalyRuleDescriptors,
  getAnomalyPresets,
  type InvoiceRecord,
  type AnomalyResult,
  type AnomalyType,
  type AnomalyRuleConfig,
} from '../lib/forecast/anomalies'

// ============================================================================
// Helpers
// ============================================================================

function parseAnomalyParams(url: URL) {
  const periodDays = Math.min(365, Math.max(7, parseInt(url.searchParams.get('periodDays') || '30', 10)))
  const sensitivity = Math.min(5, Math.max(1, parseFloat(url.searchParams.get('sensitivity') || '2.0')))
  const settingId = url.searchParams.get('settingId') || undefined
  const tenantNip = url.searchParams.get('tenantNip') || undefined

  // Enabled rules
  const enabledRulesRaw = url.searchParams.get('enabledRules')
  const allRules: AnomalyType[] = ['amount-spike', 'new-supplier', 'duplicate-suspect', 'category-shift', 'frequency-change']
  let enabledRules: AnomalyType[] | undefined
  if (enabledRulesRaw) {
    const parsed = enabledRulesRaw.split(',').filter((r) => allRules.includes(r as AnomalyType)) as AnomalyType[]
    if (parsed.length > 0) enabledRules = parsed
  }

  // Per-rule config (JSON)
  let ruleConfig: AnomalyRuleConfig | undefined
  const ruleConfigRaw = url.searchParams.get('ruleConfig')
  if (ruleConfigRaw) {
    try {
      ruleConfig = JSON.parse(ruleConfigRaw) as AnomalyRuleConfig
    } catch { /* ignore invalid JSON */ }
  }

  return { periodDays, sensitivity, settingId, tenantNip, enabledRules, ruleConfig }
}

function buildDateFilter(field: string, fromDate: string, toDate?: string): string[] {
  const filters = [`${field} ge ${fromDate}`]
  if (toDate) filters.push(`${field} le ${toDate}`)
  return filters
}

async function fetchInvoices(
  fromDate: string,
  toDate: string | undefined,
  settingId?: string,
  tenantNip?: string
): Promise<Record<string, unknown>[]> {
  const f = InvoiceEntity.fields

  const filters = buildDateFilter(f.invoiceDate, fromDate, toDate)

  if (settingId) {
    filters.push(`_dvlp_settingid_value eq ${settingId}`)
  } else if (tenantNip) {
    filters.push(`${f.tenantNip} eq '${escapeOData(tenantNip)}'`)
  }

  const selectFields = [
    f.id, f.invoiceDate, f.netAmount, f.grossAmount,
    f.supplierNip, f.supplierName, f.mpk, f.category,
    f.dueDate, f.invoiceNumber,
  ].join(',')

  const path = `${InvoiceEntity.entitySet}?$select=${selectFields}&$filter=${filters.join(' and ')}&$orderby=${f.invoiceDate} desc&$top=5000`

  const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)
  return response.value
}

function mapToInvoiceRecord(inv: Record<string, unknown>): InvoiceRecord {
  const f = InvoiceEntity.fields
  return {
    id: inv[f.id] as string,
    invoiceNumber: (inv[f.invoiceNumber] as string) || '',
    invoiceDate: (inv[f.invoiceDate] as string) || '',
    grossAmount: (inv[f.grossAmount] as number) || 0,
    netAmount: (inv[f.netAmount] as number) || 0,
    supplierNip: (inv[f.supplierNip] as string) || '',
    supplierName: (inv[f.supplierName] as string) || '',
    mpk: getMpkKey(inv[f.mpk] as number) || undefined,
    category: (inv[f.category] as string) || undefined,
    dueDate: (inv[f.dueDate] as string) || undefined,
  }
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/anomalies — detect anomalies in recent invoices
 */
async function anomaliesListHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const url = new URL(request.url)
    const { periodDays, sensitivity, settingId, tenantNip, enabledRules, ruleConfig } = parseAnomalyParams(url)

    // Define time windows
    const today = new Date()
    const recentFrom = new Date(today)
    recentFrom.setDate(today.getDate() - periodDays)
    const recentFromStr = recentFrom.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    // Historical baseline: from 12 months ago to start of recent period
    const historyFrom = new Date(today)
    historyFrom.setMonth(today.getMonth() - 12)
    const historyFromStr = historyFrom.toISOString().split('T')[0]

    // Fetch recent and historical invoices
    const [recentRaw, historicalRaw] = await Promise.all([
      fetchInvoices(recentFromStr, todayStr, settingId, tenantNip),
      fetchInvoices(historyFromStr, recentFromStr, settingId, tenantNip),
    ])

    const recentInvoices = recentRaw.map(mapToInvoiceRecord)
    const historicalInvoices = historicalRaw.map(mapToInvoiceRecord)

    const result = detectAnomalies(recentInvoices, historicalInvoices, {
      periodDays,
      sensitivityThreshold: sensitivity,
      enabledRules,
      ruleConfig,
    })

    return { status: 200, jsonBody: result }
  } catch (error) {
    context.error('Anomaly detection failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to detect anomalies' } }
  }
}

/**
 * GET /api/anomalies/summary — quick anomaly summary (counts only)
 */
async function anomaliesSummaryHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const url = new URL(request.url)
    const { periodDays, sensitivity, settingId, tenantNip, enabledRules, ruleConfig } = parseAnomalyParams(url)

    const today = new Date()
    const recentFrom = new Date(today)
    recentFrom.setDate(today.getDate() - periodDays)
    const recentFromStr = recentFrom.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    const historyFrom = new Date(today)
    historyFrom.setMonth(today.getMonth() - 12)
    const historyFromStr = historyFrom.toISOString().split('T')[0]

    const [recentRaw, historicalRaw] = await Promise.all([
      fetchInvoices(recentFromStr, todayStr, settingId, tenantNip),
      fetchInvoices(historyFromStr, recentFromStr, settingId, tenantNip),
    ])

    const recentInvoices = recentRaw.map(mapToInvoiceRecord)
    const historicalInvoices = historicalRaw.map(mapToInvoiceRecord)

    const result = detectAnomalies(recentInvoices, historicalInvoices, {
      periodDays,
      sensitivityThreshold: sensitivity,
      enabledRules,
      ruleConfig,
    })

    return { status: 200, jsonBody: result.summary }
  } catch (error) {
    context.error('Anomaly summary failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to get anomaly summary' } }
  }
}

// ============================================================================
// Route Registration
// ============================================================================

app.http('anomalies-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'anomalies',
  handler: anomaliesListHandler,
})

app.http('anomalies-summary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'anomalies/summary',
  handler: anomaliesSummaryHandler,
})

// ============================================================================
// Metadata Endpoint
// ============================================================================

/**
 * GET /api/anomalies/rules — list available anomaly detection rules with parameter metadata
 */
async function anomalyRulesHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    return {
      status: 200,
      jsonBody: {
        rules: getAnomalyRuleDescriptors(),
        presets: getAnomalyPresets(),
      },
    }
  } catch (error) {
    context.error('Anomaly rules metadata failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to get anomaly rules metadata' } }
  }
}

app.http('anomalies-rules', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'anomalies/rules',
  handler: anomalyRulesHandler,
})
