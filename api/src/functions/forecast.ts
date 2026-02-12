/**
 * Forecast API — expense prediction endpoints
 * 
 * Endpoints:
 * - GET /api/forecast/monthly    — monthly expense forecast (overall)
 * - GET /api/forecast/by-mpk     — forecast grouped by cost center
 * - GET /api/forecast/by-category — forecast grouped by category
 * - GET /api/forecast/by-supplier — forecast for top suppliers
 * 
 * Query params (all endpoints):
 * - horizon: 1 | 6 | 12 (forecast months, default: 6)
 * - historyMonths: number (months of history to use, default: 24)
 * - settingId: KSeF setting ID (preferred for multi-environment)
 * - tenantNip: buyer NIP (fallback)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { dataverseRequest } from '../lib/dataverse/client'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { InvoiceEntity } from '../lib/dataverse/entities'
import { getMpkKey } from '../lib/dataverse/entities'
import { escapeOData } from '../lib/dataverse/odata-utils'
import {
  generateForecast,
  parseDateToMonth,
  type MonthlyDataPoint,
  type ForecastParams,
  type ForecastResult,
  type GroupedForecastResult,
} from '../lib/forecast/engine'

// ============================================================================
// Helpers
// ============================================================================

function parseForecastParams(url: URL): {
  horizon: 1 | 6 | 12
  historyMonths: number
  settingId?: string
  tenantNip?: string
} {
  const horizonRaw = parseInt(url.searchParams.get('horizon') || '6', 10)
  const horizon = ([1, 6, 12].includes(horizonRaw) ? horizonRaw : 6) as 1 | 6 | 12
  const historyMonths = Math.min(60, Math.max(3, parseInt(url.searchParams.get('historyMonths') || '24', 10)))
  const settingId = url.searchParams.get('settingId') || undefined
  const tenantNip = url.searchParams.get('tenantNip') || undefined

  return { horizon, historyMonths, settingId, tenantNip }
}

async function fetchInvoicesForForecast(
  historyMonths: number,
  settingId?: string,
  tenantNip?: string
): Promise<Record<string, unknown>[]> {
  const today = new Date()
  const fromDate = new Date(today.getFullYear(), today.getMonth() - historyMonths, 1)
  const fromStr = fromDate.toISOString().split('T')[0]

  const filters: string[] = [
    `${InvoiceEntity.fields.invoiceDate} ge ${fromStr}`,
  ]

  if (settingId) {
    filters.push(`_dvlp_settingid_value eq ${settingId}`)
  } else if (tenantNip) {
    filters.push(`${InvoiceEntity.fields.tenantNip} eq '${escapeOData(tenantNip)}'`)
  }

  const selectFields = [
    InvoiceEntity.fields.id,
    InvoiceEntity.fields.invoiceDate,
    InvoiceEntity.fields.netAmount,
    InvoiceEntity.fields.grossAmount,
    InvoiceEntity.fields.mpk,
    InvoiceEntity.fields.category,
    InvoiceEntity.fields.supplierNip,
    InvoiceEntity.fields.supplierName,
  ].join(',')

  const path = `${InvoiceEntity.entitySet}?$select=${selectFields}&$filter=${filters.join(' and ')}&$orderby=${InvoiceEntity.fields.invoiceDate} asc&$top=5000`

  const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)
  return response.value
}

/**
 * Aggregate raw invoices into monthly data points.
 * Uses robust date parsing and excludes the current incomplete month.
 */
function aggregateMonthly(invoices: Record<string, unknown>[]): MonthlyDataPoint[] {
  const f = InvoiceEntity.fields
  const monthMap = new Map<string, MonthlyDataPoint>()

  // Current incomplete month — exclude to avoid skewing the forecast
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  for (const inv of invoices) {
    const invoiceDate = inv[f.invoiceDate] as string
    if (!invoiceDate) continue

    const month = parseDateToMonth(invoiceDate)
    if (!month) continue
    if (month === currentMonth) continue // skip incomplete month

    const existing = monthMap.get(month) || { month, grossAmount: 0, netAmount: 0, invoiceCount: 0 }
    existing.grossAmount += (inv[f.grossAmount] as number) || 0
    existing.netAmount += (inv[f.netAmount] as number) || 0
    existing.invoiceCount++
    monthMap.set(month, existing)
  }

  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Aggregate invoices by a grouping function, then into monthly data per group.
 * Uses robust date parsing and excludes the current incomplete month.
 */
function aggregateByGroup(
  invoices: Record<string, unknown>[],
  groupFn: (inv: Record<string, unknown>) => string
): Map<string, MonthlyDataPoint[]> {
  const f = InvoiceEntity.fields
  const groups = new Map<string, Map<string, MonthlyDataPoint>>()

  // Current incomplete month — exclude to avoid skewing the forecast
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  for (const inv of invoices) {
    const group = groupFn(inv)
    const invoiceDate = inv[f.invoiceDate] as string
    if (!invoiceDate) continue

    const month = parseDateToMonth(invoiceDate)
    if (!month) continue
    if (month === currentMonth) continue // skip incomplete month

    const monthMap = groups.get(group) || new Map()
    const existing = monthMap.get(month) || { month, grossAmount: 0, netAmount: 0, invoiceCount: 0 }
    existing.grossAmount += (inv[f.grossAmount] as number) || 0
    existing.netAmount += (inv[f.netAmount] as number) || 0
    existing.invoiceCount++
    monthMap.set(month, existing)
    groups.set(group, monthMap)
  }

  const result = new Map<string, MonthlyDataPoint[]>()
  for (const [group, monthMap] of groups) {
    result.set(group, Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)))
  }
  return result
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/forecast/monthly — overall monthly expense forecast
 */
async function forecastMonthlyHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const url = new URL(request.url)
    const { horizon, historyMonths, settingId, tenantNip } = parseForecastParams(url)

    const invoices = await fetchInvoicesForForecast(historyMonths, settingId, tenantNip)
    const monthly = aggregateMonthly(invoices)
    const result = generateForecast(monthly, { horizon })

    return { status: 200, jsonBody: result }
  } catch (error) {
    context.error('Forecast monthly failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to generate forecast' } }
  }
}

/**
 * GET /api/forecast/by-mpk — forecast per cost center
 */
async function forecastByMpkHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const url = new URL(request.url)
    const { horizon, historyMonths, settingId, tenantNip } = parseForecastParams(url)

    const invoices = await fetchInvoicesForForecast(historyMonths, settingId, tenantNip)
    const f = InvoiceEntity.fields
    const grouped = aggregateByGroup(invoices, (inv) => getMpkKey(inv[f.mpk] as number) || 'Other')

    const results: GroupedForecastResult[] = []
    for (const [group, monthly] of grouped) {
      results.push({ group, forecast: generateForecast(monthly, { horizon }) })
    }

    // Sort by total forecast amount desc
    results.sort((a, b) => b.forecast.summary.totalForecast - a.forecast.summary.totalForecast)

    return { status: 200, jsonBody: { groups: results } }
  } catch (error) {
    context.error('Forecast by MPK failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to generate forecast by MPK' } }
  }
}

/**
 * GET /api/forecast/by-category — forecast per expense category
 */
async function forecastByCategoryHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const url = new URL(request.url)
    const { horizon, historyMonths, settingId, tenantNip } = parseForecastParams(url)

    const invoices = await fetchInvoicesForForecast(historyMonths, settingId, tenantNip)
    const f = InvoiceEntity.fields
    const grouped = aggregateByGroup(invoices, (inv) => (inv[f.category] as string) || 'Uncategorized')

    const results: GroupedForecastResult[] = []
    for (const [group, monthly] of grouped) {
      results.push({ group, forecast: generateForecast(monthly, { horizon }) })
    }

    results.sort((a, b) => b.forecast.summary.totalForecast - a.forecast.summary.totalForecast)

    return { status: 200, jsonBody: { groups: results } }
  } catch (error) {
    context.error('Forecast by category failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to generate forecast by category' } }
  }
}

/**
 * GET /api/forecast/by-supplier — forecast for top suppliers
 */
async function forecastBySupplierHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const url = new URL(request.url)
    const { horizon, historyMonths, settingId, tenantNip } = parseForecastParams(url)
    const topN = Math.min(20, parseInt(url.searchParams.get('top') || '10', 10))

    const invoices = await fetchInvoicesForForecast(historyMonths, settingId, tenantNip)
    const f = InvoiceEntity.fields

    // Find top N suppliers by total amount first
    const supplierTotals = new Map<string, { name: string; total: number }>()
    for (const inv of invoices) {
      const nip = inv[f.supplierNip] as string
      if (!nip) continue
      const entry = supplierTotals.get(nip) || { name: (inv[f.supplierName] as string) || nip, total: 0 }
      entry.total += (inv[f.grossAmount] as number) || 0
      supplierTotals.set(nip, entry)
    }

    const topSuppliers = Array.from(supplierTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, topN)
      .map(([nip]) => nip)

    // Generate forecasts for top suppliers only
    const grouped = aggregateByGroup(invoices, (inv) => {
      const nip = inv[f.supplierNip] as string
      return topSuppliers.includes(nip) ? `${supplierTotals.get(nip)?.name || nip}` : '__other__'
    })

    const results: GroupedForecastResult[] = []
    for (const [group, monthly] of grouped) {
      if (group === '__other__') continue
      results.push({ group, forecast: generateForecast(monthly, { horizon }) })
    }

    results.sort((a, b) => b.forecast.summary.totalForecast - a.forecast.summary.totalForecast)

    return { status: 200, jsonBody: { groups: results } }
  } catch (error) {
    context.error('Forecast by supplier failed:', error)
    return { status: 500, jsonBody: { error: 'Failed to generate forecast by supplier' } }
  }
}

// ============================================================================
// Route Registration
// ============================================================================

app.http('forecast-monthly', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'forecast/monthly',
  handler: forecastMonthlyHandler,
})

app.http('forecast-by-mpk', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'forecast/by-mpk',
  handler: forecastByMpkHandler,
})

app.http('forecast-by-category', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'forecast/by-category',
  handler: forecastByCategoryHandler,
})

app.http('forecast-by-supplier', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'forecast/by-supplier',
  handler: forecastBySupplierHandler,
})
