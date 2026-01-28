import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { listInvoices, getInvoiceById, updateInvoice, deleteInvoice } from '../lib/dataverse/invoices'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { InvoiceUpdateSchema, InvoiceSource } from '../types/invoice'

/**
 * GET /api/invoices - List all invoices with advanced filtering
 */
export async function listInvoicesHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Reader role is sufficient for listing
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    // Parse query parameters (extended with advanced filters)
    const url = new URL(request.url)
    
    // Parse mpkList as comma-separated values
    const mpkListParam = url.searchParams.get('mpkList')
    const mpkList = mpkListParam ? mpkListParam.split(',').filter(Boolean) : undefined

    const params = {
      tenantNip: url.searchParams.get('tenantNip') || undefined,
      paymentStatus: url.searchParams.get('paymentStatus') as 'pending' | 'paid' | undefined,
      mpk: url.searchParams.get('mpk') || undefined,
      mpkList,
      category: url.searchParams.get('category') || undefined,
      fromDate: url.searchParams.get('fromDate') || undefined,
      toDate: url.searchParams.get('toDate') || undefined,
      dueDateFrom: url.searchParams.get('dueDateFrom') || undefined,
      dueDateTo: url.searchParams.get('dueDateTo') || undefined,
      minAmount: url.searchParams.get('minAmount') ? parseFloat(url.searchParams.get('minAmount')!) : undefined,
      maxAmount: url.searchParams.get('maxAmount') ? parseFloat(url.searchParams.get('maxAmount')!) : undefined,
      supplierNip: url.searchParams.get('supplierNip') || undefined,
      supplierName: url.searchParams.get('supplierName') || undefined,
      source: url.searchParams.get('source') as InvoiceSource | undefined,
      overdue: url.searchParams.get('overdue') === 'true',
      search: url.searchParams.get('search') || undefined,
      top: parseInt(url.searchParams.get('top') || '100'),
      skip: parseInt(url.searchParams.get('skip') || '0'),
      orderBy: url.searchParams.get('orderBy') as 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate' || 'invoiceDate',
      orderDirection: url.searchParams.get('orderDirection') as 'asc' | 'desc' || 'desc',
    }

    const invoices = await listInvoices(params)

    return {
      status: 200,
      jsonBody: { invoices, count: invoices.length },
    }
  } catch (error) {
    context.error('Failed to list invoices:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to list invoices' },
    }
  }
}

/**
 * GET /api/invoices/:id - Get single invoice
 */
export async function getInvoiceHandler(
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

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const invoice = await getInvoiceById(id)
    if (!invoice) {
      return { status: 404, jsonBody: { error: 'Invoice not found' } }
    }

    return {
      status: 200,
      jsonBody: invoice,
    }
  } catch (error) {
    context.error('Failed to get invoice:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to get invoice' },
    }
  }
}

/**
 * PATCH /api/invoices/:id - Update invoice (categorize, payment status)
 */
export async function updateInvoiceHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin required for updates
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const body = await request.json()
    const parseResult = InvoiceUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const updated = await updateInvoice(id, parseResult.data)

    return {
      status: 200,
      jsonBody: updated,
    }
  } catch (error) {
    context.error('Failed to update invoice:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to update invoice' },
    }
  }
}

/**
 * DELETE /api/invoices/:id - Delete invoice
 */
export async function deleteInvoiceHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    await deleteInvoice(id)

    return {
      status: 204,
    }
  } catch (error) {
    context.error('Failed to delete invoice:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to delete invoice' },
    }
  }
}

// Register routes
app.http('invoices-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices',
  handler: listInvoicesHandler,
})

app.http('invoices-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}',
  handler: getInvoiceHandler,
})

app.http('invoices-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'invoices/{id}',
  handler: updateInvoiceHandler,
})

app.http('invoices-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'invoices/{id}',
  handler: deleteInvoiceHandler,
})
