import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { queryInvoices, getInvoice } from '../lib/ksef/invoices'
import { parseInvoiceXml } from '../lib/ksef/parser'
import { createInvoice, invoiceExistsByReference } from '../lib/dataverse/invoices'
import { getKsefConfig } from '../lib/ksef/config'
import { InvoiceCreate } from '../types/invoice'

interface SyncResult {
  total: number
  imported: number
  skipped: number
  failed: number
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
        dateFrom?: string
        dateTo?: string
        importAll?: boolean
      }

      const config = getKsefConfig()
      const nip = body.nip || config.nip

      context.log(`Starting KSeF sync for NIP: ${nip}`)

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

      context.log(`Found ${queryResult.numberOfElements} invoices in KSeF`)

      const result: SyncResult = {
        total: queryResult.numberOfElements,
        imported: 0,
        skipped: 0,
        failed: 0,
        invoices: [],
        errors: [],
      }

      // Process each invoice
      for (const header of queryResult.invoiceHeaderList || []) {
        try {
          // Check if already imported
          const exists = await invoiceExistsByReference(header.ksefReferenceNumber)
          
          if (exists) {
            result.skipped++
            result.invoices.push({
              ksefReferenceNumber: header.ksefReferenceNumber,
              invoiceNumber: header.invoiceNumber,
              supplierName: header.subjectName,
              grossAmount: header.grossValue,
              status: 'skipped',
            })
            continue
          }

          // Download full invoice XML
          const invoiceResponse = await getInvoice(nip, header.ksefReferenceNumber)
          const parsed = parseInvoiceXml(invoiceResponse.invoiceXml)

          // Create invoice in Dataverse
          const invoiceData: InvoiceCreate = {
            tenantNip: nip,
            tenantName: parsed.buyer.name,
            referenceNumber: header.ksefReferenceNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierNip: parsed.supplier.nip,
            supplierName: parsed.supplier.name,
            invoiceDate: parsed.invoiceDate,
            dueDate: parsed.dueDate,
            netAmount: parsed.netAmount,
            vatAmount: parsed.vatAmount,
            grossAmount: parsed.grossAmount,
            rawXml: invoiceResponse.invoiceXml,
          }

          await createInvoice(invoiceData)

          result.imported++
          result.invoices.push({
            ksefReferenceNumber: header.ksefReferenceNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierName: parsed.supplier.name,
            grossAmount: parsed.grossAmount,
            status: 'imported',
          })

          context.log(`Imported invoice: ${parsed.invoiceNumber}`)

        } catch (error) {
          result.failed++
          result.errors.push({
            ksefReferenceNumber: header.ksefReferenceNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          result.invoices.push({
            ksefReferenceNumber: header.ksefReferenceNumber,
            invoiceNumber: header.invoiceNumber,
            supplierName: header.subjectName,
            grossAmount: header.grossValue,
            status: 'failed',
          })

          context.error(`Failed to import invoice ${header.ksefReferenceNumber}:`, error)
        }
      }

      context.log(`Sync completed: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`)

      return {
        status: 200,
        jsonBody: {
          success: result.failed === 0,
          ...result,
        },
      }
    } catch (error) {
      context.error('KSeF sync failed:', error)
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

      // Check which are already imported
      const previews = await Promise.all(
        (queryResult.invoiceHeaderList || []).map(async (header) => {
          const exists = await invoiceExistsByReference(header.ksefReferenceNumber)
          return {
            ksefReferenceNumber: header.ksefReferenceNumber,
            invoiceNumber: header.invoiceNumber,
            invoiceDate: header.invoiceDate,
            supplierNip: header.subjectNip,
            supplierName: header.subjectName,
            grossAmount: header.grossValue,
            alreadyImported: exists,
          }
        })
      )

      const newInvoices = previews.filter(p => !p.alreadyImported)
      const existingInvoices = previews.filter(p => p.alreadyImported)

      return {
        status: 200,
        jsonBody: {
          total: queryResult.numberOfElements,
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
        referenceNumbers: string[]
      }

      if (!body.referenceNumbers || !Array.isArray(body.referenceNumbers) || body.referenceNumbers.length === 0) {
        return { status: 400, jsonBody: { error: 'referenceNumbers array is required' } }
      }

      const config = getKsefConfig()
      const nip = body.nip || config.nip

      context.log(`Importing ${body.referenceNumbers.length} specific invoices for NIP: ${nip}`)

      const result: SyncResult = {
        total: body.referenceNumbers.length,
        imported: 0,
        skipped: 0,
        failed: 0,
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
            tenantNip: nip,
            tenantName: parsed.buyer.name,
            referenceNumber: refNumber,
            invoiceNumber: parsed.invoiceNumber,
            supplierNip: parsed.supplier.nip,
            supplierName: parsed.supplier.name,
            invoiceDate: parsed.invoiceDate,
            dueDate: parsed.dueDate,
            netAmount: parsed.netAmount,
            vatAmount: parsed.vatAmount,
            grossAmount: parsed.grossAmount,
            rawXml: invoiceResponse.invoiceXml,
          }

          await createInvoice(invoiceData)

          result.imported++
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

      return {
        status: 200,
        jsonBody: {
          success: result.failed === 0,
          ...result,
        },
      }
    } catch (error) {
      context.error('KSeF import failed:', error)
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
