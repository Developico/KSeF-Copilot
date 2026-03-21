/**
 * Supplier Batch Action Endpoints
 *
 * Bulk operations for Suppliers:
 * - POST /api/supplier-batch/deactivate - Batch deactivate (set Inactive)
 * - POST /api/supplier-batch/reactivate - Batch reactivate (set Active)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { z } from 'zod'

// ── Schemas ──────────────────────────────────────────────────

const BatchIdsSchema = z.object({
  supplierIds: z.array(z.string().uuid()).min(1).max(200),
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

// ── Batch Deactivate ─────────────────────────────────────────

app.http('supplier-batch-deactivate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'supplier-batch/deactivate',
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

      for (const id of parsed.data.supplierIds) {
        try {
          const supplier = await supplierService.getById(id)
          if (!supplier) {
            results.push({ id, success: false, error: 'Supplier not found' })
            continue
          }
          if (supplier.status === 'Inactive') {
            results.push({ id, success: true }) // already inactive
            continue
          }

          await supplierService.deactivate(id)
          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch deactivate failed:', error)
      return { status: 500, jsonBody: { error: 'Batch deactivate failed' } }
    }
  },
})

// ── Batch Reactivate ─────────────────────────────────────────

app.http('supplier-batch-reactivate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'supplier-batch/reactivate',
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

      for (const id of parsed.data.supplierIds) {
        try {
          const supplier = await supplierService.getById(id)
          if (!supplier) {
            results.push({ id, success: false, error: 'Supplier not found' })
            continue
          }
          if (supplier.status === 'Active') {
            results.push({ id, success: true }) // already active
            continue
          }

          await supplierService.update(id, { status: 'Active' as const })
          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch reactivate failed:', error)
      return { status: 500, jsonBody: { error: 'Batch reactivate failed' } }
    }
  },
})
