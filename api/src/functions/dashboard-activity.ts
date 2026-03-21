import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { dataverseRequest } from '../lib/dataverse/client'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { DV } from '../lib/dataverse/config'
import { InvoiceEntity } from '../lib/dataverse/entities'
import { escapeOData } from '../lib/dataverse/odata-utils'

/**
 * Unified activity feed item — common shape for all event types
 */
export interface ActivityItem {
  id: string
  type: 'invoice' | 'approval' | 'selfbilling' | 'sync'
  title: string
  description: string
  amount?: number
  currency?: string
  date: string
  link?: string
}

/**
 * GET /api/dashboard/activity - Unified activity feed
 *
 * Merges recent events from invoices, approval decisions,
 * self-billing status changes, and sync logs into a single
 * sorted-by-date feed.
 *
 * Query params:
 * - settingId: filter by KSeF setting (required)
 * - top: max items to return (default 20, max 50)
 * - types: comma-separated filter (invoice,approval,selfbilling,sync)
 */
export async function getDashboardActivityHandler(
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

    const url = new URL(request.url)
    const settingId = url.searchParams.get('settingId')
    if (!settingId) {
      return { status: 400, jsonBody: { error: 'settingId is required' } }
    }

    const topParam = parseInt(url.searchParams.get('top') || '20', 10)
    const top = Math.min(Math.max(topParam, 1), 50)

    const typesParam = url.searchParams.get('types')
    const allowedTypes = new Set<string>(['invoice', 'approval', 'selfbilling', 'sync'])
    const requestedTypes = typesParam
      ? new Set(typesParam.split(',').filter((t) => allowedTypes.has(t)))
      : allowedTypes

    // Fetch all sources in parallel, requesting a few more than top to allow for
    // merging and deduplication across sources
    const perSourceTop = Math.min(top, 15)

    const promises: Promise<ActivityItem[]>[] = []

    if (requestedTypes.has('invoice')) {
      promises.push(fetchRecentInvoices(settingId, perSourceTop, context))
    }
    if (requestedTypes.has('approval')) {
      promises.push(fetchRecentApprovals(settingId, perSourceTop, context))
    }
    if (requestedTypes.has('selfbilling')) {
      promises.push(fetchRecentSelfBilling(settingId, perSourceTop, context))
    }
    if (requestedTypes.has('sync')) {
      promises.push(fetchRecentSyncLogs(settingId, perSourceTop, context))
    }

    const results = await Promise.all(promises)
    const merged = results
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, top)

    return {
      status: 200,
      jsonBody: { items: merged, count: merged.length },
    }
  } catch (error) {
    context.error('Failed to get dashboard activity:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to get dashboard activity' },
    }
  }
}

// ---------------------------------------------------------------------------
// Data source fetchers
// ---------------------------------------------------------------------------

async function fetchRecentInvoices(
  settingId: string,
  top: number,
  context: InvocationContext
): Promise<ActivityItem[]> {
  try {
    const f = DV.invoice
    const select = [f.id, f.name, f.invoiceDate, f.grossAmount, f.currency, 'dvlp_sellername', f.createdOn].join(',')
    const filter = `${f.settingLookup} eq ${settingId}`
    const path = `${f.entitySet}?$select=${select}&$filter=${filter}&$orderby=${f.createdOn} desc&$top=${top}`

    const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)

    return response.value.map((inv) => ({
      id: inv[f.id] as string,
      type: 'invoice' as const,
      title: (inv[f.name] as string) || 'Invoice',
      description: (inv['dvlp_sellername'] as string) || '',
      amount: (inv[f.grossAmount] as number) || undefined,
      currency: (inv[f.currency] as string) || 'PLN',
      date: (inv[f.createdOn] as string) || new Date().toISOString(),
      link: `/invoices/${inv[f.id]}`,
    }))
  } catch (error) {
    context.warn('Failed to fetch recent invoices for activity feed:', error)
    return []
  }
}

async function fetchRecentApprovals(
  settingId: string,
  top: number,
  context: InvocationContext
): Promise<ActivityItem[]> {
  try {
    const f = DV.invoice
    const select = [
      f.id, f.name, f.grossAmount, f.currency,
      'dvlp_sellername', 'dvlp_approvalstatus', 'dvlp_approvedby', 'dvlp_approvedat',
    ].join(',')
    const filter = `${f.settingLookup} eq ${settingId} and dvlp_approvalstatus ne null and dvlp_approvedat ne null`
    const path = `${f.entitySet}?$select=${select}&$filter=${filter}&$orderby=dvlp_approvedat desc&$top=${top}`

    const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)

    return response.value.map((inv) => {
      const status = inv['dvlp_approvalstatus'] as number
      const statusLabel = status === 858890002 ? 'approved' : status === 858890003 ? 'rejected' : 'decided'
      const approvedBy = (inv['dvlp_approvedby'] as string) || ''

      return {
        id: `approval-${inv[f.id]}`,
        type: 'approval' as const,
        title: `${(inv[f.name] as string) || 'Invoice'} ${statusLabel}`,
        description: approvedBy ? `by ${approvedBy}` : '',
        amount: (inv[f.grossAmount] as number) || undefined,
        currency: (inv[f.currency] as string) || 'PLN',
        date: (inv['dvlp_approvedat'] as string) || new Date().toISOString(),
        link: `/invoices/${inv[f.id]}`,
      }
    })
  } catch (error) {
    context.warn('Failed to fetch recent approvals for activity feed:', error)
    return []
  }
}

async function fetchRecentSelfBilling(
  settingId: string,
  top: number,
  context: InvocationContext
): Promise<ActivityItem[]> {
  try {
    const f = DV.sbInvoice
    const select = [f.id, f.name, f.grossAmount, f.currency, f.status, f.modifiedOn].join(',')
    const filter = `${f.settingLookup} eq ${settingId}`
    const path = `${f.entitySet}?$select=${select}&$filter=${filter}&$orderby=${f.modifiedOn} desc&$top=${top}`

    const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)

    const statusLabels: Record<number, string> = {
      858890000: 'Draft',
      858890001: 'Pending seller',
      858890002: 'Seller approved',
      858890003: 'Sent to KSeF',
      858890004: 'Seller rejected',
    }

    return response.value.map((sb) => ({
      id: `sb-${sb[f.id]}`,
      type: 'selfbilling' as const,
      title: (sb[f.name] as string) || 'SB invoice',
      description: statusLabels[(sb[f.status] as number)] || 'Updated',
      amount: (sb[f.grossAmount] as number) || undefined,
      currency: (sb[f.currency] as string) || 'PLN',
      date: (sb[f.modifiedOn] as string) || new Date().toISOString(),
      link: '/self-billing',
    }))
  } catch (error) {
    context.warn('Failed to fetch recent self-billing for activity feed:', error)
    return []
  }
}

async function fetchRecentSyncLogs(
  settingId: string,
  top: number,
  context: InvocationContext
): Promise<ActivityItem[]> {
  try {
    const f = DV.syncLog
    const select = [f.id, f.name, f.status, f.invoicesCreated, f.invoicesUpdated, f.startedAt, f.completedAt].join(',')
    const filter = `${f.settingLookup} eq ${settingId}`
    const path = `${f.entitySet}?$select=${select}&$filter=${filter}&$orderby=${f.startedAt} desc&$top=${top}`

    const response = await dataverseRequest<{ value: Record<string, unknown>[] }>(path)

    const syncStatusLabels: Record<number, string> = {
      858890000: 'In progress',
      858890001: 'Completed',
      858890002: 'Failed',
      858890003: 'Partial',
    }

    return response.value.map((log) => {
      const created = (log[f.invoicesCreated] as number) || 0
      const updated = (log[f.invoicesUpdated] as number) || 0
      const statusVal = log[f.status] as number
      const statusLabel = syncStatusLabels[statusVal] || 'Unknown'

      return {
        id: `sync-${log[f.id]}`,
        type: 'sync' as const,
        title: `Sync ${statusLabel.toLowerCase()}`,
        description: `${created} new, ${updated} updated`,
        date: (log[f.completedAt] as string) || (log[f.startedAt] as string) || new Date().toISOString(),
        link: '/sync',
      }
    })
  } catch (error) {
    context.warn('Failed to fetch recent sync logs for activity feed:', error)
    return []
  }
}

// Register route
app.http('dashboard-activity', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/activity',
  handler: getDashboardActivityHandler,
})
