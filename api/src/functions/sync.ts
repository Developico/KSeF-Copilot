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
import { findParentInvoice } from '../lib/dataverse/invoices'
import { queryInvoices, getInvoice } from '../lib/ksef/invoices'
import { parseInvoiceXml } from '../lib/ksef/parser'
import { InvoiceTypeEnum } from '../types/invoice'
import type { ParsedInvoiceType } from '../lib/ksef/types'
import { z } from 'zod'

// Flexible datetime: accepts multiple formats and normalizes to ISO 8601 datetime.
// Handles: empty strings, date-only (YYYY-MM-DD), datetime without timezone, full ISO 8601.
const flexibleDatetime = z
  .string()
  .transform((val) => {
    const trimmed = val.trim()
    if (trimmed === '') return undefined
    // Date-only format (YYYY-MM-DD) — append time and timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00Z`
    // Datetime without timezone — append Z
    if (!/Z|[+-]\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}Z`
    return trimmed
  })
  .pipe(
    z.string().datetime({ offset: true }).optional(),
  )

// Validation schemas
const StartSyncSchema = z.object({
  settingId: z.string().uuid('Valid setting ID required'),
  nip: z.string().optional(),
  direction: z.enum(['incoming', 'outgoing', 'both']).default('incoming'),
  dateFrom: flexibleDatetime.optional(),
  dateTo: flexibleDatetime.optional(),
})

interface SyncProgress {
  total: number
  processed: number
  created: number
  updated: number
  failed: number
  newInvoiceIds: string[]
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

      // Resolve active Dataverse session for linking
      let dvSessionId: string | undefined
      try {
        const activeSession = await sessionService.getActiveByNip(setting.nip)
        dvSessionId = activeSession?.id
      } catch {
        logDataverseInfo('sync-start', 'Could not resolve active session for sync log linking')
      }

      // Create sync log entry (may return null if entity schema is incomplete)
      const syncLog = await syncLogService.create({
        settingId,
        direction,
        sessionId: dvSessionId,
      })
      const syncLogId = syncLog?.id

      const progress: SyncProgress = {
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        failed: 0,
        newInvoiceIds: [],
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
            const invoiceCreateData = {
              settingId: settingId,
              tenantNip: setting.nip,
              tenantName: setting.companyName,
              referenceNumber: header.ksefNumber,
              invoiceNumber: parsed.invoiceNumber,
              supplierNip: parsed.supplier.nip,
              supplierName: parsed.supplier.name,
              supplierAddress: parsed.supplier.address,
              invoiceDate: parsed.invoiceDate,
              dueDate: parsed.dueDate,
              netAmount: parsed.netAmount,
              vatAmount: parsed.vatAmount,
              grossAmount: parsed.grossAmount,
              rawXml: invoiceData.invoiceXml,
              // Invoice type & correction fields
              invoiceType: mapParsedTypeToApp(parsed.invoiceType),
              correctedInvoiceNumber: parsed.correctedInvoiceNumber,
              correctionReason: parsed.correctionReason,
              parentInvoiceId: undefined as string | undefined,
            }

            // Link corrective invoice to parent
            if (parsed.invoiceType === 'KOR' || parsed.invoiceType === 'KOR_ZAL') {
              try {
                const parentId = await findParentInvoice(
                  parsed.correctedInvoiceKsefRef,
                  parsed.correctedInvoiceNumber,
                  settingId,
                )
                if (parentId) {
                  invoiceCreateData.parentInvoiceId = parentId
                  context.log(`Linked corrective invoice to parent: ${parentId}`)
                } else {
                  context.warn(`Parent invoice not found for correction ${parsed.invoiceNumber}`)
                }
              } catch (linkError) {
                context.warn(`Failed to link parent invoice for ${parsed.invoiceNumber}:`, linkError)
              }
            }

            const createdInvoice = await invoiceService.create(invoiceCreateData)

            progress.created++
            if (createdInvoice?.id) {
              progress.newInvoiceIds.push(createdInvoice.id)
            }

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      context.error('Failed to start sync:', errorMessage, errorStack)
      return {
        status: 500,
        jsonBody: { 
          error: 'Failed to start sync',
          message: errorMessage,
        },
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
 * POST /api/sync/cleanup - Cleanup orphaned in-progress sync logs
 */
app.http('sync-cleanup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sync/cleanup',
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

      const body = await request.json().catch(() => null) as Record<string, unknown> | null
      const maxAgeMinutes = (body && typeof body.maxAgeMinutes === 'number') ? body.maxAgeMinutes : 60

      const result = await syncLogService.cleanupStale(maxAgeMinutes)

      return {
        status: 200,
        jsonBody: {
          message: `Cleaned up ${result.updated} stale sync logs`,
          ...result,
        },
      }
    } catch (error) {
      context.error('Failed to cleanup sync logs:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to cleanup sync logs' },
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

/**
 * Map parsed XML invoice type to application InvoiceTypeEnum
 */
function mapParsedTypeToApp(parsed: ParsedInvoiceType): InvoiceTypeEnum {
  switch (parsed) {
    case 'KOR':
    case 'KOR_ZAL':
      return 'Corrective'
    case 'ZAL':
      return 'Advance'
    default:
      return 'VAT'
  }
}
