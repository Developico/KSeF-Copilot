/**
 * Sync API Endpoints
 * 
 * Handles synchronization of invoices with KSeF.
 * Uses new Dataverse services with proper logging.
 * 
 * Endpoints:
 * - POST /api/sync - Start synchronization for a setting
 * - GET /api/sync/logs - Get sync history
 * - GET /api/sync/logs/:id - Get single sync log
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { 
  invoiceService,
  settingService, 
  sessionService, 
  syncLogService,
  logDataverseInfo,
  logDataverseError,
} from '../lib/dataverse'
import { queryInvoices, getInvoice } from '../lib/ksef/invoices'
import { parseInvoiceXml } from '../lib/ksef/parser'
import { z } from 'zod'

// Validation schemas
const StartSyncSchema = z.object({
  settingId: z.string().uuid('Valid setting ID required'),
  direction: z.enum(['incoming', 'outgoing', 'both']).default('incoming'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

interface SyncProgress {
  total: number
  processed: number
  created: number
  updated: number
  failed: number
  errors: Array<{ reference: string; error: string }>
}

/**
 * POST /api/sync - Start synchronization
 */
app.http('sync-start', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sync',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json().catch(() => null)
      if (!body) {
        return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
      }

      const validation = StartSyncSchema.safeParse(body)
      if (!validation.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: validation.error.errors },
        }
      }

      const { settingId, direction, dateFrom, dateTo } = validation.data

      // Get setting
      const setting = await settingService.getById(settingId)
      if (!setting) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      if (!setting.isActive) {
        return { status: 400, jsonBody: { error: 'Setting is not active' } }
      }

      logDataverseInfo('sync-start', `Starting sync for NIP: ${setting.nip}`, { settingId, direction })

      // Create sync log entry (may return null if entity schema is incomplete)
      const syncLog = await syncLogService.create({
        settingId,
        direction,
      })
      const syncLogId = syncLog?.id

      const progress: SyncProgress = {
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [],
      }

      try {
        // Default date range: last 30 days
        const syncDateTo = dateTo || new Date().toISOString()
        const syncDateFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        context.log(`Syncing invoices from ${syncDateFrom} to ${syncDateTo}`)

        // Query invoices from KSeF
        const queryResult = await queryInvoices(setting.nip, {
          subjectType: direction === 'outgoing' ? 'subject1' : 'subject2',
          type: 'range',
          dateFrom: syncDateFrom,
          dateTo: syncDateTo,
          pageSize: 100,
          pageOffset: 0,
        })

        // API 2.0 uses 'invoices' array with 'ksefNumber'
        const invoiceList = queryResult.invoices || []
        progress.total = invoiceList.length
        context.log(`Found ${progress.total} invoices in KSeF`)

        // Process each invoice - API 2.0 format
        for (const header of invoiceList) {
          try {
            progress.processed++

            // Check if already exists - API 2.0 uses 'ksefNumber'
            const existing = await invoiceService.getByKsefReference(header.ksefNumber)
            
            if (existing) {
              // Skip or update
              progress.updated++
              continue
            }

            // Download full invoice
            const invoiceData = await getInvoice(setting.nip, header.ksefNumber)
            const parsed = parseInvoiceXml(invoiceData.invoiceXml)

            // Create invoice in Dataverse
            await invoiceService.create({
              settingId: settingId,
              tenantNip: setting.nip,
              tenantName: setting.companyName,
              referenceNumber: header.ksefNumber,
              invoiceNumber: parsed.invoiceNumber,
              supplierNip: parsed.supplier.nip,
              supplierName: parsed.supplier.name,
              invoiceDate: parsed.invoiceDate,
              dueDate: parsed.dueDate,
              netAmount: parsed.netAmount,
              vatAmount: parsed.vatAmount,
              grossAmount: parsed.grossAmount,
              rawXml: invoiceData.invoiceXml,
            })

            progress.created++

            // Update progress periodically
            if (progress.processed % 10 === 0 && syncLogId) {
              await syncLogService.updateProgress(syncLogId, {
                created: progress.created,
                updated: progress.updated,
                failed: progress.failed,
              })
            }
          } catch (invoiceError) {
            progress.failed++
            progress.errors.push({
              reference: header.ksefNumber,
              error: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
            })
            context.warn(`Failed to process invoice ${header.ksefNumber}:`, invoiceError)
          }
        }

        // Complete sync log
        if (syncLogId) {
          await syncLogService.complete(syncLogId, {
            created: progress.created,
            updated: progress.updated,
            failed: progress.failed,
          })
        }

        // Update setting's last sync
        await settingService.updateLastSync(settingId, progress.failed === 0 ? 'success' : 'error')

        logDataverseInfo('sync-start', 'Sync completed', progress)

        return {
          status: 200,
          jsonBody: {
            syncLogId,
            status: 'completed',
            ...progress,
          },
        }
      } catch (syncError) {
        // Mark sync as failed
        if (syncLogId) {
          await syncLogService.fail(
            syncLogId, 
            syncError instanceof Error ? syncError.message : 'Unknown error',
            { created: progress.created, updated: progress.updated, failed: progress.failed }
          )
        }
        await settingService.updateLastSync(settingId, 'error')

        logDataverseError('sync-start', syncError)
        throw syncError
      }
    } catch (error) {
      context.error('Failed to start sync:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to start sync' },
      }
    }
  },
})

/**
 * GET /api/sync/logs - Get sync history
 */
app.http('sync-logs-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sync/logs',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let logs
      if (settingId) {
        logs = await syncLogService.getBySettingId(settingId, limit)
      } else {
        logs = await syncLogService.getRecent(limit)
      }

      return {
        status: 200,
        jsonBody: { logs, count: logs.length },
      }
    } catch (error) {
      context.error('Failed to list sync logs:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list sync logs' },
      }
    }
  },
})

/**
 * GET /api/sync/logs/:id - Get single sync log
 */
app.http('sync-logs-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sync/logs/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Sync log ID required' } }
      }

      const log = await syncLogService.getById(id)
      if (!log) {
        return { status: 404, jsonBody: { error: 'Sync log not found' } }
      }

      return {
        status: 200,
        jsonBody: log,
      }
    } catch (error) {
      context.error('Failed to get sync log:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get sync log' },
      }
    }
  },
})

/**
 * GET /api/sync/stats/:settingId - Get sync statistics for a setting
 */
app.http('sync-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sync/stats/{settingId}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const settingId = request.params.settingId
      if (!settingId) {
        return { status: 400, jsonBody: { error: 'Setting ID required' } }
      }

      const stats = await syncLogService.getStats(settingId)

      return {
        status: 200,
        jsonBody: stats,
      }
    } catch (error) {
      context.error('Failed to get sync stats:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get sync stats' },
      }
    }
  },
})
