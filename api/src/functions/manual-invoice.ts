import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { createManualInvoice } from '../lib/dataverse/invoices'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { ManualInvoiceCreateSchema } from '../types/invoice'

/**
 * POST /api/invoices/manual - Create manual invoice
 * 
 * Creates a new invoice from manual entry (not from KSeF).
 * Automatically sets source = "Manual" and generates unique reference number.
 */
export async function createManualInvoiceHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin role required for creating invoices
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const body = await request.json()
    const parseResult = ManualInvoiceCreateSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Invalid request body', 
          details: parseResult.error.flatten() 
        },
      }
    }

    context.log(`Creating manual invoice: ${parseResult.data.invoiceNumber}`)

    const invoice = await createManualInvoice(parseResult.data)

    context.log(`Manual invoice created: ${invoice.id}`)

    return {
      status: 201,
      jsonBody: invoice,
    }
  } catch (error) {
    context.error('Failed to create manual invoice:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to create invoice' },
    }
  }
}

// Register route
app.http('manual-invoice-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/manual',
  handler: createManualInvoiceHandler,
})
