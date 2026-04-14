import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { costDocumentService } from '../lib/dataverse/services/cost-document-service'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { CostDocumentCreateSchema, CostDocumentUpdateSchema } from '../types/cost-document'
import type { CostDocumentListParams, CostDocumentType, CostDocumentSource, CostDocumentStatus } from '../types/cost-document'

/**
 * GET /api/cost-documents - List cost documents with filtering
 */
export async function listCostDocumentsHandler(
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

    const mpkCenterIdsParam = url.searchParams.get('mpkCenterIds')
    const mpkCenterIds = mpkCenterIdsParam ? mpkCenterIdsParam.split(',').filter(Boolean) : undefined

    const params: CostDocumentListParams = {
      settingId: url.searchParams.get('settingId') || undefined,
      documentType: url.searchParams.get('documentType') as CostDocumentType | undefined,
      paymentStatus: url.searchParams.get('paymentStatus') || undefined,
      mpkCenterId: url.searchParams.get('mpkCenterId') || undefined,
      mpkCenterIds,
      approvalStatus: url.searchParams.get('approvalStatus') || undefined,
      category: url.searchParams.get('category') || undefined,
      status: url.searchParams.get('status') as CostDocumentStatus | undefined,
      source: url.searchParams.get('source') as CostDocumentSource | undefined,
      fromDate: url.searchParams.get('fromDate') || undefined,
      toDate: url.searchParams.get('toDate') || undefined,
      dueDateFrom: url.searchParams.get('dueDateFrom') || undefined,
      dueDateTo: url.searchParams.get('dueDateTo') || undefined,
      minAmount: url.searchParams.get('minAmount') ? parseFloat(url.searchParams.get('minAmount')!) : undefined,
      maxAmount: url.searchParams.get('maxAmount') ? parseFloat(url.searchParams.get('maxAmount')!) : undefined,
      issuerName: url.searchParams.get('issuerName') || undefined,
      issuerNip: url.searchParams.get('issuerNip') || undefined,
      search: url.searchParams.get('search') || undefined,
      top: url.searchParams.get('top') ? parseInt(url.searchParams.get('top')!, 10) : undefined,
      skip: url.searchParams.get('skip') ? parseInt(url.searchParams.get('skip')!, 10) : undefined,
      orderBy: url.searchParams.get('orderBy') as CostDocumentListParams['orderBy'] || 'documentDate',
      orderDirection: url.searchParams.get('orderDirection') as 'asc' | 'desc' || 'desc',
    }

    // Use getAll to follow @odata.nextLink and return all matching records
    const items = await costDocumentService.getAll(params)

    return {
      status: 200,
      jsonBody: { items, count: items.length },
    }
  } catch (error) {
    context.error('Failed to list cost documents:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to list cost documents' },
    }
  }
}

/**
 * GET /api/cost-documents/:id - Get single cost document
 */
export async function getCostDocumentHandler(
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
      return { status: 400, jsonBody: { error: 'Cost document ID required' } }
    }

    const doc = await costDocumentService.getById(id)
    if (!doc) {
      return { status: 404, jsonBody: { error: 'Cost document not found' } }
    }

    return {
      status: 200,
      jsonBody: doc,
    }
  } catch (error) {
    context.error('Failed to get cost document:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to get cost document' },
    }
  }
}

/**
 * POST /api/cost-documents - Create new cost document
 */
export async function createCostDocumentHandler(
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

    const body = await request.json()
    const parseResult = CostDocumentCreateSchema.safeParse(body)
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const created = await costDocumentService.create(parseResult.data)

    return {
      status: 201,
      jsonBody: created,
    }
  } catch (error) {
    context.error('Failed to create cost document:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to create cost document' },
    }
  }
}

/**
 * PATCH /api/cost-documents/:id - Update cost document
 */
export async function updateCostDocumentHandler(
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
      return { status: 400, jsonBody: { error: 'Cost document ID required' } }
    }

    const body = await request.json()
    const parseResult = CostDocumentUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const updated = await costDocumentService.update(id, parseResult.data)

    return {
      status: 200,
      jsonBody: updated,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    context.error('Failed to update cost document:', errorMessage, error)
    return {
      status: 500,
      jsonBody: { error: `Failed to update cost document: ${errorMessage}` },
    }
  }
}

/**
 * DELETE /api/cost-documents/:id - Delete cost document
 */
export async function deleteCostDocumentHandler(
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
      return { status: 400, jsonBody: { error: 'Cost document ID required' } }
    }

    await costDocumentService.delete(id)

    return { status: 204 }
  } catch (error) {
    context.error('Failed to delete cost document:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to delete cost document' },
    }
  }
}

/**
 * GET /api/cost-documents/summary - Get cost documents summary for dashboard
 */
export async function costDocumentsSummaryHandler(
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
      return { status: 400, jsonBody: { error: 'settingId parameter required' } }
    }

    const summary = await costDocumentService.getSummary(settingId)

    return {
      status: 200,
      jsonBody: summary,
    }
  } catch (error) {
    context.error('Failed to get cost documents summary:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to get cost documents summary' },
    }
  }
}

// Register routes
app.http('cost-documents-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cost-documents',
  handler: listCostDocumentsHandler,
})

app.http('cost-documents-summary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cost-documents/summary',
  handler: costDocumentsSummaryHandler,
})

app.http('cost-documents-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cost-documents/{id}',
  handler: getCostDocumentHandler,
})

app.http('cost-documents-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents',
  handler: createCostDocumentHandler,
})

app.http('cost-documents-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'cost-documents/{id}',
  handler: updateCostDocumentHandler,
})

app.http('cost-documents-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'cost-documents/{id}',
  handler: deleteCostDocumentHandler,
})
