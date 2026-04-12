/**
 * Report API Endpoints
 *
 * Endpoints:
 * - GET /api/reports/budget-utilization  — Budget utilization per MPK (7.7)
 * - GET /api/reports/approval-history    — Approval history (7.8)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { reportService } from '../lib/dataverse/services'

/**
 * GET /api/reports/budget-utilization
 */
async function budgetUtilizationHandler(
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

    const mpkCenterId = request.query.get('mpkCenterId') || undefined

    const report = await reportService.getBudgetUtilization(settingId, mpkCenterId)

    return { status: 200, jsonBody: { data: report } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to generate budget utilization report:', msg)
    return { status: 500, jsonBody: { error: `Failed to generate report: ${msg}` } }
  }
}

/**
 * GET /api/reports/approval-history
 */
async function approvalHistoryHandler(
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

    const filters = {
      dateFrom: request.query.get('dateFrom') || undefined,
      dateTo: request.query.get('dateTo') || undefined,
      mpkCenterId: request.query.get('mpkCenterId') || undefined,
      status: request.query.get('status') || undefined,
    }

    const report = await reportService.getApprovalHistory(auth.user, settingId, filters)

    return { status: 200, jsonBody: { data: report } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to generate approval history report:', msg)
    return { status: 500, jsonBody: { error: `Failed to generate report: ${msg}` } }
  }
}

/**
 * GET /api/reports/approver-performance
 */
async function approverPerformanceHandler(
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

    const report = await reportService.getApproverPerformance(settingId)

    return { status: 200, jsonBody: { data: report } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to generate approver performance report:', msg)
    return { status: 500, jsonBody: { error: `Failed to generate report: ${msg}` } }
  }
}

/**
 * GET /api/reports/invoice-processing
 */
async function invoiceProcessingHandler(
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

    const report = await reportService.getInvoiceProcessing(settingId)

    return { status: 200, jsonBody: { data: report } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to generate invoice processing report:', msg)
    return { status: 500, jsonBody: { error: `Failed to generate report: ${msg}` } }
  }
}

/**
 * GET /api/reports/cost-distribution
 */
async function costDistributionHandler(
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

    const report = await reportService.getCostDistribution(settingId)

    return { status: 200, jsonBody: { data: report } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to generate cost distribution report:', msg)
    return { status: 500, jsonBody: { error: `Failed to generate report: ${msg}` } }
  }
}

// ── Route registrations ──────────────────────────────────────

app.http('reports-budget-utilization', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/budget-utilization',
  handler: budgetUtilizationHandler,
})

app.http('reports-approval-history', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/approval-history',
  handler: approvalHistoryHandler,
})

app.http('reports-approver-performance', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/approver-performance',
  handler: approverPerformanceHandler,
})

app.http('reports-invoice-processing', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/invoice-processing',
  handler: invoiceProcessingHandler,
})

app.http('reports-cost-distribution', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/cost-distribution',
  handler: costDistributionHandler,
})
