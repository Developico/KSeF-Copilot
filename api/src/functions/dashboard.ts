import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { dataverseRequest } from '../lib/dataverse/client'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { InvoiceEntity, PaymentStatusValues, MpkValues } from '../lib/dataverse/entities'
import { getMpkKey, getPaymentStatusKey } from '../lib/dataverse/entities'
import { escapeOData } from '../lib/dataverse/odata-utils'

/**
 * Dashboard statistics types
 */
interface MonthlyStats {
  month: string // YYYY-MM
  netAmount: number
  vatAmount: number
  grossAmount: number
  invoiceCount: number
}

interface MpkStats {
  mpk: string
  netAmount: number
  grossAmount: number
  invoiceCount: number
  percentage: number
}

interface SupplierStats {
  supplierNip: string
  supplierName: string
  grossAmount: number
  invoiceCount: number
}

interface PaymentStats {
  pending: { count: number; grossAmount: number }
  paid: { count: number; grossAmount: number }
  overdue: { count: number; grossAmount: number }
}

interface DashboardStats {
  period: { from: string; to: string }
  totals: {
    invoiceCount: number
    netAmount: number
    vatAmount: number
    grossAmount: number
  }
  monthly: MonthlyStats[]
  byMpk: MpkStats[]
  topSuppliers: SupplierStats[]
  payments: PaymentStats
}

/**
 * GET /api/dashboard/stats - Get dashboard statistics
 * 
 * Query params:
 * - fromDate: YYYY-MM-DD (default: 12 months ago)
 * - toDate: YYYY-MM-DD (default: today)
 * - settingId: filter by KSeF setting ID (preferred for multi-environment)
 * - tenantNip: filter by buyer NIP (fallback)
 */
export async function getDashboardStatsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    // Parse query parameters
    const url = new URL(request.url)
    const settingId = url.searchParams.get('settingId') || undefined
    const tenantNip = url.searchParams.get('tenantNip') || undefined
    
    // Default: last 12 months
    const today = new Date()
    const defaultFrom = new Date(today.getFullYear() - 1, today.getMonth(), 1)
    const fromDate = url.searchParams.get('fromDate') || defaultFrom.toISOString().split('T')[0]
    const toDate = url.searchParams.get('toDate') || today.toISOString().split('T')[0]

    // Fetch all invoices in range (we'll aggregate in memory for flexibility)
    const filters: string[] = [
      `${InvoiceEntity.fields.invoiceDate} ge ${fromDate}`,
      `${InvoiceEntity.fields.invoiceDate} le ${toDate}`,
    ]

    // Filter by setting ID (preferred) or NIP (fallback)
    if (settingId) {
      filters.push(`_dvlp_settingid_value eq ${settingId}`)
    } else if (tenantNip) {
      filters.push(`${InvoiceEntity.fields.tenantNip} eq '${escapeOData(tenantNip)}'`)
    }

    const selectFields = [
      InvoiceEntity.fields.id,
      InvoiceEntity.fields.invoiceDate,
      InvoiceEntity.fields.netAmount,
      InvoiceEntity.fields.vatAmount,
      InvoiceEntity.fields.grossAmount,
      InvoiceEntity.fields.paymentStatus,
      InvoiceEntity.fields.dueDate,
      InvoiceEntity.fields.mpk,
      InvoiceEntity.fields.supplierNip,
      InvoiceEntity.fields.supplierName,
    ].join(',')

    const path = `${InvoiceEntity.entitySet}?$select=${selectFields}&$filter=${filters.join(' and ')}&$orderby=${InvoiceEntity.fields.invoiceDate} desc&$top=1000`

    const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)
    const invoices = response.value

    // Aggregate statistics
    const stats = aggregateStats(invoices, fromDate, toDate)

    return {
      status: 200,
      jsonBody: stats,
    }
  } catch (error) {
    context.error('Failed to get dashboard stats:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to get dashboard statistics' },
    }
  }
}

/**
 * Aggregate invoice data into dashboard statistics
 */
function aggregateStats(
  invoices: Record<string, unknown>[],
  fromDate: string,
  toDate: string
): DashboardStats {
  const f = InvoiceEntity.fields
  const today = new Date().toISOString().split('T')[0]

  // Initialize accumulators
  let totalNet = 0
  let totalVat = 0
  let totalGross = 0

  const monthlyMap = new Map<string, MonthlyStats>()
  const mpkMap = new Map<string, { net: number; gross: number; count: number }>()
  const supplierMap = new Map<string, { name: string; gross: number; count: number }>()

  const payments: PaymentStats = {
    pending: { count: 0, grossAmount: 0 },
    paid: { count: 0, grossAmount: 0 },
    overdue: { count: 0, grossAmount: 0 },
  }

  // Process each invoice
  for (const inv of invoices) {
    const net = (inv[f.netAmount] as number) || 0
    const vat = (inv[f.vatAmount] as number) || 0
    const gross = (inv[f.grossAmount] as number) || 0
    const invoiceDate = inv[f.invoiceDate] as string
    const dueDate = inv[f.dueDate] as string | undefined
    const paymentStatusValue = inv[f.paymentStatus] as number
    const mpkValue = inv[f.mpk] as number
    const supplierNip = inv[f.supplierNip] as string
    const supplierName = inv[f.supplierName] as string

    // Totals
    totalNet += net
    totalVat += vat
    totalGross += gross

    // Monthly aggregation
    if (invoiceDate) {
      const month = invoiceDate.substring(0, 7) // YYYY-MM
      const existing = monthlyMap.get(month)
      if (existing) {
        existing.netAmount += net
        existing.vatAmount += vat
        existing.grossAmount += gross
        existing.invoiceCount++
      } else {
        monthlyMap.set(month, {
          month,
          netAmount: net,
          vatAmount: vat,
          grossAmount: gross,
          invoiceCount: 1,
        })
      }
    }

    // MPK aggregation
    const mpkKey = getMpkKey(mpkValue) || 'Other'
    const mpkExisting = mpkMap.get(mpkKey)
    if (mpkExisting) {
      mpkExisting.net += net
      mpkExisting.gross += gross
      mpkExisting.count++
    } else {
      mpkMap.set(mpkKey, { net, gross, count: 1 })
    }

    // Supplier aggregation
    if (supplierNip) {
      const supplierExisting = supplierMap.get(supplierNip)
      if (supplierExisting) {
        supplierExisting.gross += gross
        supplierExisting.count++
      } else {
        supplierMap.set(supplierNip, { name: supplierName || supplierNip, gross, count: 1 })
      }
    }

    // Payment status aggregation
    const paymentStatus = getPaymentStatusKey(paymentStatusValue)
    if (paymentStatus === 'paid') {
      payments.paid.count++
      payments.paid.grossAmount += gross
    } else {
      // Check if overdue
      if (dueDate && dueDate < today) {
        payments.overdue.count++
        payments.overdue.grossAmount += gross
      } else {
        payments.pending.count++
        payments.pending.grossAmount += gross
      }
    }
  }

  // Convert maps to sorted arrays
  const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  const byMpk = Array.from(mpkMap.entries())
    .map(([mpk, data]) => ({
      mpk,
      netAmount: data.net,
      grossAmount: data.gross,
      invoiceCount: data.count,
      percentage: totalGross > 0 ? (data.gross / totalGross) * 100 : 0,
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount)

  const topSuppliers = Array.from(supplierMap.entries())
    .map(([nip, data]) => ({
      supplierNip: nip,
      supplierName: data.name,
      grossAmount: data.gross,
      invoiceCount: data.count,
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount)
    .slice(0, 10) // Top 10

  return {
    period: { from: fromDate, to: toDate },
    totals: {
      invoiceCount: invoices.length,
      netAmount: totalNet,
      vatAmount: totalVat,
      grossAmount: totalGross,
    },
    monthly,
    byMpk,
    topSuppliers,
    payments,
  }
}

// Register route
app.http('dashboard-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/stats',
  handler: getDashboardStatsHandler,
})
