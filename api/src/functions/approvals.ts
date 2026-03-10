/**
 * Approval Endpoints
 *
 * HTTP triggers for the invoice approval workflow:
 * - POST /invoices/{id}/approve
 * - POST /invoices/{id}/reject
 * - POST /invoices/{id}/cancel-approval
 * - POST /invoices/{id}/refresh-approvers
 * - POST /invoices/bulk-approve
 * - GET  /approvals/pending
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { approvalService } from '../lib/dataverse/services'
import { z } from 'zod'

// ============================================================================
// Schemas
// ============================================================================

const ApproveSchema = z.object({
  comment: z.string().max(1000).optional(),
})

const RejectSchema = z.object({
  comment: z.string().min(1, 'Comment is required when rejecting').max(1000),
})

const CancelSchema = z.object({
  comment: z.string().max(1000).optional(),
})

const BulkApproveSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(100),
  comment: z.string().max(1000).optional(),
})

// ============================================================================
// Handlers
// ============================================================================

/**
 * POST /api/invoices/{id}/approve — Approve an invoice
 */
async function approveHandler(
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

    const body = await request.json().catch(() => ({}))
    const parseResult = ApproveSchema.safeParse(body)
    if (!parseResult.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() } }
    }

    const result = await approvalService.approve(id, authResult.user!, parseResult.data.comment)
    return { status: 200, jsonBody: result }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found')) return { status: 404, jsonBody: { error: msg } }
    if (msg.includes('not an authorized') || msg.includes('not in Pending')) {
      return { status: 400, jsonBody: { error: msg } }
    }
    context.error('Failed to approve invoice:', error)
    return { status: 500, jsonBody: { error: 'Failed to approve invoice' } }
  }
}

/**
 * POST /api/invoices/{id}/reject — Reject an invoice
 */
async function rejectHandler(
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

    const body = await request.json().catch(() => ({}))
    const parseResult = RejectSchema.safeParse(body)
    if (!parseResult.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() } }
    }

    const result = await approvalService.reject(id, authResult.user!, parseResult.data.comment)
    return { status: 200, jsonBody: result }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found')) return { status: 404, jsonBody: { error: msg } }
    if (msg.includes('not an authorized') || msg.includes('not in Pending')) {
      return { status: 400, jsonBody: { error: msg } }
    }
    context.error('Failed to reject invoice:', error)
    return { status: 500, jsonBody: { error: 'Failed to reject invoice' } }
  }
}

/**
 * POST /api/invoices/{id}/cancel-approval — Cancel a pending approval (Admin only — D16)
 */
async function cancelApprovalHandler(
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
      return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
    }

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const body = await request.json().catch(() => ({}))
    const parseResult = CancelSchema.safeParse(body)
    if (!parseResult.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() } }
    }

    const result = await approvalService.cancel(id, authResult.user!, parseResult.data.comment)
    return { status: 200, jsonBody: result }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found')) return { status: 404, jsonBody: { error: msg } }
    if (msg.includes('not in Pending') || msg.includes('Only Admin')) {
      return { status: 400, jsonBody: { error: msg } }
    }
    context.error('Failed to cancel approval:', error)
    return { status: 500, jsonBody: { error: 'Failed to cancel approval' } }
  }
}

/**
 * POST /api/invoices/{id}/refresh-approvers — Refresh approvers for an invoice (D20)
 */
async function refreshApproversHandler(
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

    const result = await approvalService.refreshApprovers(id, authResult.user!)
    return { status: 200, jsonBody: result }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found')) return { status: 404, jsonBody: { error: msg } }
    if (msg.includes('not authorized') || msg.includes('no MPK')) {
      return { status: 400, jsonBody: { error: msg } }
    }
    context.error('Failed to refresh approvers:', error)
    return { status: 500, jsonBody: { error: 'Failed to refresh approvers' } }
  }
}

/**
 * POST /api/invoices/bulk-approve — Bulk approve invoices (D17)
 */
async function bulkApproveHandler(
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

    const body = await request.json()
    const parseResult = BulkApproveSchema.safeParse(body)
    if (!parseResult.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() } }
    }

    const result = await approvalService.bulkApprove(
      parseResult.data.invoiceIds,
      authResult.user!,
      parseResult.data.comment
    )

    return {
      status: 200,
      jsonBody: result,
    }
  } catch (error) {
    context.error('Failed to bulk approve invoices:', error)
    return { status: 500, jsonBody: { error: 'Failed to bulk approve invoices' } }
  }
}

/**
 * GET /api/approvals/pending — List pending invoices for current user
 */
async function pendingApprovalsHandler(
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
      return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
    }

    const approvals = await approvalService.listPending(authResult.user!, settingId)

    return {
      status: 200,
      jsonBody: { approvals, count: approvals.length },
    }
  } catch (error) {
    context.error('Failed to list pending approvals:', error)
    return { status: 500, jsonBody: { error: 'Failed to list pending approvals' } }
  }
}

// ============================================================================
// Route Registration
// ============================================================================

// IMPORTANT: Register bulk-approve BEFORE the parameterized routes to avoid
// Azure Functions matching "bulk-approve" as an {id} parameter
app.http('invoices-bulk-approve', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/bulk-approve',
  handler: bulkApproveHandler,
})

app.http('invoices-approve', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/approve',
  handler: approveHandler,
})

app.http('invoices-reject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/reject',
  handler: rejectHandler,
})

app.http('invoices-cancel-approval', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/cancel-approval',
  handler: cancelApprovalHandler,
})

app.http('invoices-refresh-approvers', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/refresh-approvers',
  handler: refreshApproversHandler,
})

app.http('approvals-pending', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'approvals/pending',
  handler: pendingApprovalsHandler,
})
