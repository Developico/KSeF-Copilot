/**
 * Budget API Endpoints
 *
 * Endpoints:
 * - GET /api/mpk-centers/:id/budget-status  - Budget status for single MPK
 * - GET /api/budget/summary                 - Budget summary for all MPKs
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { budgetService } from '../lib/dataverse/services'

/**
 * GET /api/mpk-centers/:id/budget-status
 */
export async function budgetStatusHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
    }

    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden — requires Reader role' } }
    }

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'MPK center ID required' } }
    }

    const status = await budgetService.getBudgetStatus(id)
    if (!status) {
      return {
        status: 200,
        jsonBody: { data: null, message: 'No budget configured for this MPK center' },
      }
    }

    return { status: 200, jsonBody: { data: status } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to get budget status:', msg)
    return { status: 500, jsonBody: { error: `Failed to get budget status: ${msg}` } }
  }
}

/**
 * GET /api/budget/summary
 */
export async function budgetSummaryHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
    }

    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden — requires Reader role' } }
    }

    const settingId = request.query.get('settingId')
    if (!settingId) {
      return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
    }

    const summary = await budgetService.getBudgetSummary(settingId)

    return {
      status: 200,
      jsonBody: {
        data: summary,
        count: summary.length,
      },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to get budget summary:', msg)
    return { status: 500, jsonBody: { error: `Failed to get budget summary: ${msg}` } }
  }
}

// ── Route registrations ──────────────────────────────────────

app.http('mpk-centers-budget-status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'mpk-centers/{id}/budget-status',
  handler: budgetStatusHandler,
})

app.http('budget-summary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'budget/summary',
  handler: budgetSummaryHandler,
})
