import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { queryInvoices, getInvoice } from '../lib/ksef/invoices'
import { parseInvoiceXml } from '../lib/ksef/parser'
import { createInvoice, invoiceExistsByReference, findParentInvoice } from '../lib/dataverse/invoices'
import { settingService, sessionService, syncLogService, logDataverseInfo, logDataverseError } from '../lib/dataverse'
import { getKsefConfig } from '../lib/ksef/config'
import { InvoiceCreate, InvoiceTypeEnum } from '../types/invoice'
import type { ParsedInvoiceType } from '../lib/ksef/types'

interface SyncResult {
  total: number
  imported: number
  skipped: number
  failed: number
  newInvoiceIds: string[]
  invoices: SyncedInvoice[]
  errors: SyncError[]
}

interface SyncedInvoice {
  ksefReferenceNumber: string
  invoiceNumber: string
  supplierName: string
  grossAmount: number
  status: 'imported' | 'skipped' | 'failed'
}

interface SyncError {
  ksefReferenceNumber: string
  error: string
}

/**
 * Sync incoming invoices from KSeF
 * POST /api/ksef/sync
 * 
 * Body: {
 *   nip?: string,        // NIP to sync (defaults to config)
 *   dateFrom?: string,   // Start date (ISO format)
 *   dateTo?: string,     // End date (ISO format)
 *   importAll?: boolean  // Import all found invoices without confirmation
 * }
 */
app.http('ksef-sync', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/sync',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let syncLogId: string | undefined
    let settingId: string | undefined
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require admin role for sync
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json().catch(() => ({})) as {
        nip?: string
        settingId?: string  // Preferred: pass settingId directly for multi-environment support
        dateFrom?: string
        dateTo?: string
        importAll?: boolean
      }

      // Get setting - prefer settingId if provided, otherwise lookup by NIP
      let setting: Awaited<ReturnType<typeof settingService.getById>> | undefined
      let nip: string

      if (body.settingId) {
        // Preferred: use settingId directly
        setting = await settingService.getById(body.settingId) ?? undefined
        if (!setting) {
          return { status: 404, jsonBody: { error: `Setting not found: ${body.settingId}` } }
        }
        settingId = setting.id
        nip = setting.nip
      } else {
        // Legacy: lookup by NIP (may find wrong setting if same NIP in multiple environments)
        const config = getKsefConfig()
        nip = body.nip || config.nip
        
        const settings = await settingService.getAll(true)
        setting = settings.find(s => s.nip === nip)
        settingId = setting?.id

        if (!settingId) {
          context.warn(`No setting found for NIP ${nip}, invoices will not be linked to a setting`)
        }
      }

      context.log(`Starting KSeF sync for NIP: ${nip}, settingId: ${settingId || 'none'}`)

      // Create sync log entry in Dataverse
      if (settingId) {
        try {
          // Resolve active Dataverse session for this NIP
          let dvSessionId: string | undefined
          try {
            const activeSession = await sessionService.getActiveByNip(nip)
            dvSessionId = activeSession?.id
          } catch {
            context.warn('Could not resolve active session for sync log linking')
          }

          const syncLog = await syncLogService.create({
            settingId,
            direction: 'incoming',
            sessionId: dvSessionId,
          })
          syncLogId = syncLog?.id
          if (syncLogId) {
            logDataverseInfo('ksef-sync', 'Sync log created', { syncLogId, dvSessionId })
          }
        } catch (logError) {
          // Non-blocking: sync log creation failure should not prevent sync
          context.warn('Failed to create sync log entry:', logError)
        }
      }

      // Default date range: last 30 days
      const dateTo = body.dateTo || new Date().toISOString()
      const dateFrom = body.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // Query invoices from KSeF
      const queryResult = await queryInvoices(nip, {
        subjectType: 'subject2', // We are the buyer (incoming invoices)
        type: 'range',
        dateFrom,
        dateTo,
        pageSize: 100,
        pageOffset: 0,
      })

      // API 2.0 uses 'invoices' array
      const invoiceList = queryResult.invoices || []
      context.log(`Found ${invoiceList.length} invoices in KSeF`)

      const result: SyncResult = {
        total: invoiceList.length,
        imported: 0,
        skipped: 0,
        failed: 0,
        newInvoiceIds: [],
        invoices: [],
        errors: [],
      }

      // Process each invoice - API 2.0 format uses nested 'seller', 'buyer' objects
      for (const header of invoiceList) {
        // Extract seller info from nested structure (API 2.0) or flat properties (legacy)
        const sellerName = header.seller?.name || header.sellerName || 'Unknown'
        const sellerNip = header.seller?.nip || header.sellerNip || ''
        // Extract amount from API 2.0 format (grossAmount) or legacy (grossValue)
        const grossAmount = header.grossAmount ?? header.grossValue ?? 0
        
        try {
          // Check if already imported - API 2.0 uses 'ksefNumber'
          const exists = await invoiceExistsByReference(header.ksefNumber)
          
          if (exists) {
            result.skipped++
            result.invoices.push({
              ksefReferenceNumber: header.ksefNumber,
              invoiceNumber: header.invoiceNumber || 'Unknown',
              supplierName: sellerName,
              grossAmount: grossAmount,
              status: 'skipped',
            })
            continue
          }

          // Download full invoice XML
          const invoiceResponse = await getInvoice(nip, header.ksefNumber)
          const parsed = parseInvoiceXml(invoiceResponse.invoiceXml)

          // Create invoice in Dataverse
          const invoiceData: InvoiceCreate = {
            settingId: settingId,
            tenantNip: nip,
            tenantName: parsed.buyer.name,
            referenceNumber: header.ksefNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierNip: parsed.supplier.nip,
            supplierName: parsed.supplier.name,
            supplierAddress: parsed.supplier.address,
            supplierCountry: parsed.supplier.country,
            buyerAddress: parsed.buyer.address,
            buyerCountry: parsed.buyer.country,
            invoiceDate: parsed.invoiceDate,
            dueDate: parsed.dueDate,
            netAmount: parsed.netAmount,
            vatAmount: parsed.vatAmount,
            grossAmount: parsed.grossAmount,
            rawXml: invoiceResponse.invoiceXml,
            // Invoice type & correction fields
            invoiceType: mapParsedTypeToApp(parsed.invoiceType),
            correctedInvoiceNumber: parsed.correctedInvoiceNumber,
            correctionReason: parsed.correctionReason,
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
                invoiceData.parentInvoiceId = parentId
                context.log(`Linked corrective invoice to parent: ${parentId}`)
              } else {
                context.warn(`Parent invoice not found for correction ${parsed.invoiceNumber}`)
              }
            } catch (linkError) {
              context.warn(`Failed to link parent invoice for ${parsed.invoiceNumber}:`, linkError)
            }
          }

          const createdInvoice = await createInvoice(invoiceData)

          result.imported++
          result.newInvoiceIds.push(createdInvoice.id)
          result.invoices.push({
            ksefReferenceNumber: header.ksefNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierName: parsed.supplier.name,
            grossAmount: parsed.grossAmount,
            status: 'imported',
          })

          context.log(`Imported invoice: ${parsed.invoiceNumber}`)

        } catch (error) {
          result.failed++
          result.errors.push({
            ksefReferenceNumber: header.ksefNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          result.invoices.push({
            ksefReferenceNumber: header.ksefNumber,
            invoiceNumber: header.invoiceNumber || 'Unknown',
            supplierName: sellerName,
            grossAmount: grossAmount,
            status: 'failed',
          })

          context.error(`Failed to import invoice ${header.ksefNumber}:`, error)
        }
      }

      context.log(`Sync completed: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`)

      // Complete sync log in Dataverse
      if (syncLogId) {
        try {
          await syncLogService.complete(syncLogId, {
            created: result.imported,
            updated: result.skipped,
            failed: result.failed,
          })
          if (settingId) {
            await settingService.updateLastSync(settingId, result.failed === 0 ? 'success' : 'error')
          }
        } catch (logError) {
          context.warn('Failed to complete sync log:', logError)
        }
      }

      return {
        status: 200,
        jsonBody: {
          success: result.failed === 0,
          syncLogId,
          ...result,
        },
      }
    } catch (error) {
      context.error('KSeF sync failed:', error)

      // Mark sync log as failed
      if (syncLogId) {
        try {
          await syncLogService.fail(
            syncLogId,
            error instanceof Error ? error.message : 'Unknown error',
          )
          if (settingId) {
            await settingService.updateLastSync(settingId, 'error')
          }
        } catch (logError) {
          context.warn('Failed to mark sync log as failed:', logError)
        }
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  },
})

/**
 * Preview invoices to sync (without importing)
 * GET /api/ksef/sync/preview
 */
app.http('ksef-sync-preview', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/sync/preview',
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

      const url = new URL(request.url)
      const config = getKsefConfig()
      const nip = url.searchParams.get('nip') || config.nip
      const dateFrom = url.searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const dateTo = url.searchParams.get('dateTo') || new Date().toISOString()

      context.log(`Preview KSeF invoices for NIP: ${nip}`)

      // Query invoices from KSeF
      const queryResult = await queryInvoices(nip, {
        subjectType: 'subject2',
        type: 'range',
        dateFrom,
        dateTo,
        pageSize: 100,
        pageOffset: 0,
      })

      // API 2.0 uses 'invoices' array
      const invoiceList = queryResult.invoices || []

      // Check which are already imported - API 2.0 uses nested 'seller', 'buyer' objects
      const previews = await Promise.all(
        invoiceList.map(async (header) => {
          const exists = await invoiceExistsByReference(header.ksefNumber)
          // Extract from nested structure (API 2.0) or flat properties (legacy)
          const sellerNip = header.seller?.nip || header.sellerNip || ''
          const sellerName = header.seller?.name || header.sellerName || 'Unknown'
          const grossAmount = header.grossAmount ?? header.grossValue ?? 0
          return {
            ksefReferenceNumber: header.ksefNumber,
            invoiceNumber: header.invoiceNumber,
            invoiceDate: header.invoicingDate,
            supplierNip: sellerNip,
            supplierName: sellerName,
            grossAmount: grossAmount,
            alreadyImported: exists,
          }
        })
      )

      const newInvoices = previews.filter(p => !p.alreadyImported)
      const existingInvoices = previews.filter(p => p.alreadyImported)

      return {
        status: 200,
        jsonBody: {
          total: invoiceList.length,
          new: newInvoices.length,
          existing: existingInvoices.length,
          invoices: previews,
          dateRange: { from: dateFrom, to: dateTo },
        },
      }
    } catch (error) {
      context.error('KSeF sync preview failed:', error)
      return {
        status: 500,
        jsonBody: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  },
})

/**
 * Import specific invoices by reference numbers
 * POST /api/ksef/sync/import
 */
app.http('ksef-sync-import', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/sync/import',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let syncLogId: string | undefined
    let settingId: string | undefined
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json() as {
        nip?: string
        settingId?: string
        referenceNumbers: string[]
      }

      if (!body.referenceNumbers || !Array.isArray(body.referenceNumbers) || body.referenceNumbers.length === 0) {
        return { status: 400, jsonBody: { error: 'referenceNumbers array is required' } }
      }

      // Get setting - prefer settingId if provided, otherwise lookup by NIP
      let nip: string

      if (body.settingId) {
        const setting = await settingService.getById(body.settingId)
        if (!setting) {
          return { status: 404, jsonBody: { error: `Setting not found: ${body.settingId}` } }
        }
        settingId = setting.id
        nip = setting.nip
      } else {
        const config = getKsefConfig()
        nip = body.nip || config.nip
        
        const settings = await settingService.getAll(true)
        const setting = settings.find(s => s.nip === nip)
        settingId = setting?.id
      }

      context.log(`Importing ${body.referenceNumbers.length} specific invoices for NIP: ${nip}, settingId: ${settingId || 'none'}`)

      // Create sync log entry for import operation
      if (settingId) {
        try {
          // Resolve active Dataverse session for this NIP
          let dvSessionId: string | undefined
          try {
            const activeSession = await sessionService.getActiveByNip(nip)
            dvSessionId = activeSession?.id
          } catch {
            context.warn('Could not resolve active session for import sync log linking')
          }

          const syncLog = await syncLogService.create({
            settingId,
            direction: 'incoming',
            sessionId: dvSessionId,
          })
          syncLogId = syncLog?.id
        } catch (logError) {
          context.warn('Failed to create sync log for import:', logError)
        }
      }

      const result: SyncResult = {
        total: body.referenceNumbers.length,
        imported: 0,
        skipped: 0,
        failed: 0,
        newInvoiceIds: [],
        invoices: [],
        errors: [],
      }

      for (const refNumber of body.referenceNumbers) {
        try {
          // Check if already imported
          const exists = await invoiceExistsByReference(refNumber)
          
          if (exists) {
            result.skipped++
            result.invoices.push({
              ksefReferenceNumber: refNumber,
              invoiceNumber: '',
              supplierName: '',
              grossAmount: 0,
              status: 'skipped',
            })
            continue
          }

          // Download full invoice XML
          const invoiceResponse = await getInvoice(nip, refNumber)
          const parsed = parseInvoiceXml(invoiceResponse.invoiceXml)

          // Create invoice in Dataverse
          const invoiceData: InvoiceCreate = {
            settingId: settingId,
            tenantNip: nip,
            tenantName: parsed.buyer.name,
            referenceNumber: refNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierNip: parsed.supplier.nip,
            supplierName: parsed.supplier.name,
            supplierAddress: parsed.supplier.address,
            supplierCountry: parsed.supplier.country,
            buyerAddress: parsed.buyer.address,
            buyerCountry: parsed.buyer.country,
            invoiceDate: parsed.invoiceDate,
            dueDate: parsed.dueDate,
            netAmount: parsed.netAmount,
            vatAmount: parsed.vatAmount,
            grossAmount: parsed.grossAmount,
            rawXml: invoiceResponse.invoiceXml,
            // Invoice type & correction fields
            invoiceType: mapParsedTypeToApp(parsed.invoiceType),
            correctedInvoiceNumber: parsed.correctedInvoiceNumber,
            correctionReason: parsed.correctionReason,
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
                invoiceData.parentInvoiceId = parentId
                context.log(`Linked corrective invoice to parent: ${parentId}`)
              } else {
                context.warn(`Parent invoice not found for correction ${parsed.invoiceNumber}`)
              }
            } catch (linkError) {
              context.warn(`Failed to link parent invoice for ${parsed.invoiceNumber}:`, linkError)
            }
          }

          const createdInvoice = await createInvoice(invoiceData)

          result.imported++
          result.newInvoiceIds.push(createdInvoice.id)
          result.invoices.push({
            ksefReferenceNumber: refNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierName: parsed.supplier.name,
            grossAmount: parsed.grossAmount,
            status: 'imported',
          })

        } catch (error) {
          result.failed++
          result.errors.push({
            ksefReferenceNumber: refNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          result.invoices.push({
            ksefReferenceNumber: refNumber,
            invoiceNumber: '',
            supplierName: '',
            grossAmount: 0,
            status: 'failed',
          })
        }
      }

      // Complete sync log for import
      if (syncLogId) {
        try {
          await syncLogService.complete(syncLogId, {
            created: result.imported,
            updated: result.skipped,
            failed: result.failed,
          })
        } catch (logError) {
          context.warn('Failed to complete sync log for import:', logError)
        }
      }

      return {
        status: 200,
        jsonBody: {
          success: result.failed === 0,
          syncLogId,
          ...result,
        },
      }
    } catch (error) {
      context.error('KSeF import failed:', error)

      // Mark sync log as failed for import
      if (syncLogId) {
        try {
          await syncLogService.fail(
            syncLogId,
            error instanceof Error ? error.message : 'Unknown error',
          )
        } catch (logError) {
          context.warn('Failed to mark sync log as failed for import:', logError)
        }
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
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
