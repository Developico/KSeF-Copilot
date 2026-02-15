import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import {
  sendInvoice,
  getInvoice,
  getInvoiceStatus,
  queryInvoices,
  syncIncomingInvoices,
  downloadUPO,
  batchSendInvoices,
} from '../lib/ksef/invoices'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { KsefInvoice, KsefQueryInvoicesRequest } from '../lib/ksef/types'

/**
 * Send invoice to KSeF
 * POST /api/ksef/invoices/send
 */
app.http('ksef-invoice-send', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/invoices/send',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }
      
      if (!requireRole(auth.user, 'Admin').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }
      
      const body = await request.json() as { nip: string; invoice: KsefInvoice }
      
      if (!body.nip || !body.invoice) {
        return { status: 400, jsonBody: { error: 'NIP and invoice are required' } }
      }
      
      context.log(`Sending invoice ${body.invoice.invoiceNumber} for NIP: ${body.nip}`)
      
      const result = await sendInvoice(body.nip, body.invoice)
      
      return {
        status: 200,
        jsonBody: {
          success: true,
          ...result,
        },
      }
    } catch (error) {
      context.error('Failed to send invoice:', error)
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
 * Batch send multiple invoices
 * POST /api/ksef/invoices/batch
 */
app.http('ksef-invoice-batch', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/invoices/batch',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }
      
      if (!requireRole(auth.user, 'Admin').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }
      
      const body = await request.json() as { nip: string; invoices: KsefInvoice[] }
      
      if (!body.nip || !body.invoices?.length) {
        return { status: 400, jsonBody: { error: 'NIP and invoices array are required' } }
      }
      
      context.log(`Batch sending ${body.invoices.length} invoices for NIP: ${body.nip}`)
      
      const result = await batchSendInvoices(body.nip, body.invoices)
      
      return {
        status: 200,
        jsonBody: {
          success: result.failed.length === 0,
          sent: result.success.length,
          failed: result.failed.length,
          results: result,
        },
      }
    } catch (error) {
      context.error('Failed to batch send invoices:', error)
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
 * Get invoice by KSeF reference number
 * GET /api/ksef/invoices/{ksefReferenceNumber}
 */
app.http('ksef-invoice-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/invoices/{ksefReferenceNumber}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }

      if (!requireRole(auth.user, 'Reader').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Reader role required' } }
      }
      
      const ksefReferenceNumber = request.params.ksefReferenceNumber
      const nip = request.query.get('nip')
      
      if (!ksefReferenceNumber || !nip) {
        return { status: 400, jsonBody: { error: 'KSeF reference number and NIP are required' } }
      }
      
      context.log(`Getting invoice ${ksefReferenceNumber} for NIP: ${nip}`)
      
      const result = await getInvoice(nip, ksefReferenceNumber)
      
      return {
        status: 200,
        jsonBody: result,
      }
    } catch (error) {
      context.error('Failed to get invoice:', error)
      return {
        status: 500,
        jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  },
})

/**
 * Get invoice status
 * GET /api/ksef/invoices/{elementReferenceNumber}/status
 */
app.http('ksef-invoice-status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/invoices/{elementReferenceNumber}/status',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }

      if (!requireRole(auth.user, 'Reader').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Reader role required' } }
      }
      
      const elementReferenceNumber = request.params.elementReferenceNumber
      const nip = request.query.get('nip')
      
      if (!elementReferenceNumber || !nip) {
        return { status: 400, jsonBody: { error: 'Element reference number and NIP are required' } }
      }
      
      const result = await getInvoiceStatus(nip, elementReferenceNumber)
      
      return {
        status: 200,
        jsonBody: result,
      }
    } catch (error) {
      context.error('Failed to get invoice status:', error)
      return {
        status: 500,
        jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  },
})

/**
 * Query invoices
 * POST /api/ksef/invoices/query
 */
app.http('ksef-invoices-query', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/invoices/query',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }

      if (!requireRole(auth.user, 'Reader').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Reader role required' } }
      }
      
      const body = await request.json() as { nip: string; query: KsefQueryInvoicesRequest }
      
      if (!body.nip) {
        return { status: 400, jsonBody: { error: 'NIP is required' } }
      }
      
      context.log(`Querying invoices for NIP: ${body.nip}`)
      
      const result = await queryInvoices(body.nip, body.query || {})
      
      return {
        status: 200,
        jsonBody: result,
      }
    } catch (error) {
      context.error('Failed to query invoices:', error)
      return {
        status: 500,
        jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  },
})

/**
 * Sync incoming invoices
 * POST /api/ksef/sync/incoming
 */
app.http('ksef-sync-incoming', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/sync/incoming',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }
      
      if (!requireRole(auth.user, 'Admin').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }
      
      const body = await request.json() as { nip: string; lastSyncDate?: string }
      
      if (!body.nip) {
        return { status: 400, jsonBody: { error: 'NIP is required' } }
      }
      
      context.log(`Syncing incoming invoices for NIP: ${body.nip}`)
      
      const lastSyncDate = body.lastSyncDate ? new Date(body.lastSyncDate) : undefined
      const invoices = await syncIncomingInvoices(body.nip, lastSyncDate)
      
      return {
        status: 200,
        jsonBody: {
          success: true,
          count: invoices.length,
          invoices,
        },
      }
    } catch (error) {
      context.error('Failed to sync incoming invoices:', error)
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
 * Download UPO (Official Confirmation)
 * GET /api/ksef/invoices/{ksefReferenceNumber}/upo
 */
app.http('ksef-invoice-upo', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/invoices/{ksefReferenceNumber}/upo',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }

      if (!requireRole(auth.user, 'Reader').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Reader role required' } }
      }
      
      const ksefReferenceNumber = request.params.ksefReferenceNumber
      const nip = request.query.get('nip')
      
      if (!ksefReferenceNumber || !nip) {
        return { status: 400, jsonBody: { error: 'KSeF reference number and NIP are required' } }
      }
      
      context.log(`Downloading UPO for ${ksefReferenceNumber}`)
      
      const upoBase64 = await downloadUPO(nip, ksefReferenceNumber)
      
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="UPO_${ksefReferenceNumber}.pdf"`,
        },
        body: Buffer.from(upoBase64, 'base64'),
      }
    } catch (error) {
      context.error('Failed to download UPO:', error)
      return {
        status: 500,
        jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  },
})
