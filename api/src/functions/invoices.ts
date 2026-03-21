import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { listAllInvoices, getInvoiceById, updateInvoice, deleteInvoice } from '../lib/dataverse/invoices'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { InvoiceUpdateSchema, InvoiceSource } from '../types/invoice'
import { recordAIFeedback, determineFeedbackType } from '../lib/ai/feedback'
import { approvalService } from '../lib/dataverse/services'
import { budgetService } from '../lib/dataverse/services'

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

    // MPK Center IDs (new lookup-based filter)
    const mpkCenterIdsParam = url.searchParams.get('mpkCenterIds')
    const mpkCenterIds = mpkCenterIdsParam ? mpkCenterIdsParam.split(',').filter(Boolean) : undefined

    const params = {
      tenantNip: url.searchParams.get('tenantNip') || undefined,
      settingId: url.searchParams.get('settingId') || undefined,
      paymentStatus: url.searchParams.get('paymentStatus') as 'pending' | 'paid' | undefined,
      mpk: url.searchParams.get('mpk') || undefined,
      mpkList,
      mpkCenterId: url.searchParams.get('mpkCenterId') || undefined,
      mpkCenterIds,
      approvalStatus: url.searchParams.get('approvalStatus') as 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | undefined,
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
      invoiceType: url.searchParams.get('invoiceType') as 'VAT' | 'Corrective' | 'Advance' | undefined,
      parentInvoiceId: url.searchParams.get('parentInvoiceId') || undefined,
      overdue: url.searchParams.get('overdue') === 'true',
      search: url.searchParams.get('search') || undefined,
      orderBy: url.searchParams.get('orderBy') as 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate' || 'invoiceDate',
      orderDirection: url.searchParams.get('orderDirection') as 'asc' | 'desc' || 'desc',
    }

    // Use listAllInvoices to follow @odata.nextLink and return all matching records
    const invoices = await listAllInvoices(params)

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
    context.log(`[updateInvoice] Raw body keys: ${Object.keys(body as Record<string, unknown>).join(', ')}`)
    context.log(`[updateInvoice] Body: ${JSON.stringify(body)}`)

    const parseResult = InvoiceUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      context.log(`[updateInvoice] Validation failed: ${JSON.stringify(parseResult.error.flatten())}`)
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    context.log(`[updateInvoice] Parsed data keys: ${Object.keys(parseResult.data).join(', ')}`)
    context.log(`[updateInvoice] currency=${parseResult.data.currency}, exchangeRate=${parseResult.data.exchangeRate}, grossAmountPln=${parseResult.data.grossAmountPln}`)
    if (parseResult.data.parentInvoiceId !== undefined) {
      context.log(`[updateInvoice] parentInvoiceId=${parseResult.data.parentInvoiceId}`)
    }

    // D18: Capture old MPK before update for budget recalculation
    let oldMpkCenterId: string | undefined
    if (parseResult.data.mpkCenterId !== undefined) {
      try {
        const original = await getInvoiceById(id)
        if (original?.mpkCenterId) {
          oldMpkCenterId = original.mpkCenterId
        }
      } catch {
        // Non-blocking
      }
    }

    const updated = await updateInvoice(id, parseResult.data)

    // D15: Auto-trigger approval workflow when mpkCenterId is changed
    if (parseResult.data.mpkCenterId !== undefined) {
      try {
        const triggerResult = await approvalService.autoTrigger(id)
        if (triggerResult) {
          context.log(`[updateInvoice] Approval auto-trigger: ${triggerResult.approvalStatus} for invoice ${id}`)
        }
      } catch (triggerError) {
        context.warn(`[updateInvoice] Approval auto-trigger failed for invoice ${id}:`, triggerError)
        // Non-blocking: invoice update succeeded, approval trigger is best-effort
      }

      // D18: Recalculate budgets when MPK changes
      if (oldMpkCenterId && parseResult.data.mpkCenterId && parseResult.data.mpkCenterId !== oldMpkCenterId) {
        try {
          await budgetService.handleMpkChange(oldMpkCenterId, parseResult.data.mpkCenterId)
          context.log(`[updateInvoice] Budget recalculated after MPK change: ${oldMpkCenterId} → ${parseResult.data.mpkCenterId}`)
        } catch (budgetError) {
          context.warn(`[updateInvoice] Budget recalc failed for invoice ${id}:`, budgetError)
        }
      }
    }

    // Record AI feedback if user is setting mpk/category and there was an AI suggestion
    if (parseResult.data.mpk || parseResult.data.category) {
      // Get original invoice to check AI suggestions
      const originalInvoice = await getInvoiceById(id)
      if (originalInvoice) {
        const feedbackType = determineFeedbackType(
          originalInvoice.aiMpkSuggestion,
          originalInvoice.aiCategorySuggestion,
          parseResult.data.mpk || originalInvoice.mpk,
          parseResult.data.category || originalInvoice.category
        )
        
        if (feedbackType) {
          await recordAIFeedback(
            originalInvoice,
            parseResult.data.mpk || originalInvoice.mpk,
            parseResult.data.category || originalInvoice.category,
            feedbackType
          )
          context.log(`AI Feedback recorded: ${feedbackType} for invoice ${id}`)
        }
      }
    }

    // Re-fetch to include any changes from auto-trigger (e.g. approval status)
    const fresh = await getInvoiceById(id)

    if (parseResult.data.parentInvoiceId !== undefined) {
      context.log(`[updateInvoice] After refetch: parentInvoiceId=${fresh?.parentInvoiceId ?? 'null/undefined'}`)
    }

    return {
      status: 200,
      jsonBody: fresh ?? updated,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    context.error('Failed to update invoice:', errorMessage, error)
    return {
      status: 500,
      jsonBody: { error: `Failed to update invoice: ${errorMessage}` },
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
