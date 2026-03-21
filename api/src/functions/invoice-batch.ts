/**
 * Invoice Batch Action Endpoints
 *
 * Bulk operations for Invoices:
 * - POST /api/invoice-batch/mark-paid   - Batch mark as paid
 * - POST /api/invoice-batch/mark-unpaid - Batch mark as unpaid
 * - POST /api/invoice-batch/approve     - Batch approve
 * - POST /api/invoice-batch/reject      - Batch reject (with comment)
 * - POST /api/invoice-batch/delete      - Batch delete
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { getInvoiceById, updateInvoice, deleteInvoice } from '../lib/dataverse/invoices'
import { approvalService } from '../lib/dataverse/services'
import { z } from 'zod'

// ── Schemas ──────────────────────────────────────────────────

const BatchIdsSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(200),
})

const BatchRejectSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(200),
  comment: z.string().min(1, 'Comment is required when rejecting').max(1000),
})

// ── Response type ────────────────────────────────────────────

interface BatchResult {
  total: number
  succeeded: number
  failed: number
  results: Array<{ id: string; success: boolean; error?: string }>
}

function batchResponse(results: Array<{ id: string; success: boolean; error?: string }>): BatchResult {
  return {
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  }
}

// ── Batch Mark Paid ──────────────────────────────────────────

app.http('invoice-batch-mark-paid', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoice-batch/mark-paid',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          const invoice = await getInvoiceById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.paymentStatus === 'paid') {
            results.push({ id, success: true }) // already paid — count as success
            continue
          }

          await updateInvoice(id, { paymentStatus: 'paid', paymentDate: new Date().toISOString() })
          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch mark-paid failed:', error)
      return { status: 500, jsonBody: { error: 'Batch mark-paid failed' } }
    }
  },
})

// ── Batch Mark Unpaid ────────────────────────────────────────

app.http('invoice-batch-mark-unpaid', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoice-batch/mark-unpaid',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          const invoice = await getInvoiceById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.paymentStatus === 'pending') {
            results.push({ id, success: true }) // already unpaid
            continue
          }

          await updateInvoice(id, { paymentStatus: 'pending', paymentDate: undefined })
          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch mark-unpaid failed:', error)
      return { status: 500, jsonBody: { error: 'Batch mark-unpaid failed' } }
    }
  },
})

// ── Batch Approve ────────────────────────────────────────────

app.http('invoice-batch-approve', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoice-batch/approve',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      // Delegate to the existing approvalService.bulkApprove which handles
      // per-invoice validation, authorization checks, and notification
      const result = await approvalService.bulkApprove(
        parsed.data.invoiceIds,
        auth.user,
      )

      return { status: 200, jsonBody: result }
    } catch (error) {
      context.error('Batch approve failed:', error)
      return { status: 500, jsonBody: { error: 'Batch approve failed' } }
    }
  },
})

// ── Batch Reject ─────────────────────────────────────────────

app.http('invoice-batch-reject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoice-batch/reject',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const body = await request.json()
      const parsed = BatchRejectSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          await approvalService.reject(id, auth.user, parsed.data.comment)
          results.push({ id, success: true })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          results.push({ id, success: false, error: msg })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch reject failed:', error)
      return { status: 500, jsonBody: { error: 'Batch reject failed' } }
    }
  },
})

// ── Batch Delete ─────────────────────────────────────────────

app.http('invoice-batch-delete', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoice-batch/delete',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          const invoice = await getInvoiceById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }

          await deleteInvoice(id)
          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch delete failed:', error)
      return { status: 500, jsonBody: { error: 'Batch delete failed' } }
    }
  },
})
