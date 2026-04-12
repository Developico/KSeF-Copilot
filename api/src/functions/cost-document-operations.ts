/**
 * Cost Document AI Categorization + Batch Operations
 *
 * Endpoints:
 * - POST /api/cost-documents/ai-categorize — AI categorize single cost document
 * - POST /api/cost-documents/batch/approve — Batch approve
 * - POST /api/cost-documents/batch/reject — Batch reject
 * - POST /api/cost-documents/batch/mark-paid — Batch mark as paid
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, verifyAuthWithRateLimit, requireRole } from '../lib/auth/middleware'
import { categorizeInvoice } from '../lib/openai'
import { costDocumentService } from '../lib/dataverse/services/cost-document-service'
import { notificationService } from '../lib/dataverse/services/notification-service'
import { mpkCenterService } from '../lib/dataverse'
import { logDataverseError } from '../lib/dataverse/logger'
import { z } from 'zod'

// -------------------------------------------------------------------
// AI Categorization
// -------------------------------------------------------------------

const AICategorizeSchema = z.object({
  costDocumentId: z.string().uuid(),
  // Optional overrides
  issuerName: z.string().optional(),
  issuerNip: z.string().optional(),
  description: z.string().optional(),
  grossAmount: z.number().optional(),
})

/**
 * POST /api/cost-documents/ai-categorize
 */
app.http('cost-documents-ai-categorize', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/ai-categorize',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const authResult = await verifyAuthWithRateLimit(request, { windowMs: 60_000, maxRequests: 30 })
      if (!authResult.success) {
        if (authResult.retryAfterMs) {
          return { status: 429, jsonBody: { error: 'Rate limit exceeded' }, headers: { 'Retry-After': String(Math.ceil(authResult.retryAfterMs / 1000)) } }
        }
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }

      const roleCheck = requireRole(authResult.user, 'Admin')
      if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

      const body = await request.json()
      const parsed = AICategorizeSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Invalid request', details: parsed.error.flatten() } }
      }

      const { costDocumentId } = parsed.data
      const doc = await costDocumentService.getById(costDocumentId)
      if (!doc) return { status: 404, jsonBody: { error: 'Cost document not found' } }

      // Fetch dynamic MPK centers
      let mpkNames: string[] | undefined
      const mpkNameToId = new Map<string, string>()
      try {
        const centers = await mpkCenterService.getAll({ activeOnly: true })
        if (centers.length > 0) {
          mpkNames = centers.map(c => c.name)
          for (const c of centers) mpkNameToId.set(c.name, c.id)
        }
      } catch { /* fallback */ }

      // Reuse invoice categorization (it works on supplier name + items + amount)
      const categorization = await categorizeInvoice(
        {
          invoiceId: costDocumentId,
          supplierName: parsed.data.issuerName || doc.issuerName || '',
          supplierNip: parsed.data.issuerNip || doc.issuerNip || '',
          items: parsed.data.description ? [parsed.data.description] : doc.description ? [doc.description] : undefined,
          grossAmount: parsed.data.grossAmount || doc.grossAmount,
        },
        undefined,
        mpkNames,
      )

      const resolvedMpkCenterId = categorization.mpk
        ? mpkNameToId.get(categorization.mpk) ?? undefined
        : undefined

      // Save to cost document
      await costDocumentService.update(costDocumentId, {
        aiMpkSuggestion: categorization.mpk,
        aiCategorySuggestion: categorization.category,
        aiDescription: categorization.description,
        aiConfidence: categorization.confidence,
        ...(resolvedMpkCenterId ? { mpkCenterId: resolvedMpkCenterId } : {}),
        ...(categorization.category ? { category: categorization.category } : {}),
      })

      context.log(`[AI] Categorized cost document ${costDocumentId}: MPK=${categorization.mpk}, confidence=${categorization.confidence}`)

      return {
        status: 200,
        jsonBody: {
          message: 'Cost document categorized successfully',
          categorization: {
            mpk: categorization.mpk,
            mpkCenterId: resolvedMpkCenterId,
            category: categorization.category,
            description: categorization.description,
            confidence: categorization.confidence,
          },
        },
      }
    } catch (error) {
      context.error('Failed to categorize cost document:', error)
      return { status: 500, jsonBody: { error: 'AI categorization failed' } }
    }
  },
})

// -------------------------------------------------------------------
// Batch Operations
// -------------------------------------------------------------------

const BatchIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

/**
 * POST /api/cost-documents/batch/approve
 */
app.http('cost-documents-batch-approve', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/batch/approve',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) return { status: 400, jsonBody: { error: 'Invalid request', details: parsed.error.flatten() } }

      const results = await processBatch(parsed.data.ids, { approvalStatus: 'approved' })
      context.log(`[Batch] Approved ${results.success} / ${results.total} cost documents`)

      // Fire notifications for approved cost documents (fire-and-forget)
      void fireCostDocApprovalNotifications(parsed.data.ids, 'approved', auth.user?.name || 'Unknown')

      return { status: 200, jsonBody: results }
    } catch (error) {
      context.error('Batch approve failed:', error)
      return { status: 500, jsonBody: { error: 'Batch approve failed' } }
    }
  },
})

/**
 * POST /api/cost-documents/batch/reject
 */
app.http('cost-documents-batch-reject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/batch/reject',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) return { status: 400, jsonBody: { error: 'Invalid request', details: parsed.error.flatten() } }

      const results = await processBatch(parsed.data.ids, { approvalStatus: 'rejected' })
      context.log(`[Batch] Rejected ${results.success} / ${results.total} cost documents`)

      // Fire notifications for rejected cost documents (fire-and-forget)
      void fireCostDocApprovalNotifications(parsed.data.ids, 'rejected', auth.user?.name || 'Unknown')
      return { status: 200, jsonBody: results }
    } catch (error) {
      context.error('Batch reject failed:', error)
      return { status: 500, jsonBody: { error: 'Batch reject failed' } }
    }
  },
})

/**
 * POST /api/cost-documents/batch/mark-paid
 */
app.http('cost-documents-batch-mark-paid', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/batch/mark-paid',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

      const body = await request.json()
      const parsed = BatchIdsSchema.safeParse(body)
      if (!parsed.success) return { status: 400, jsonBody: { error: 'Invalid request', details: parsed.error.flatten() } }

      const results = await processBatch(parsed.data.ids, { paymentStatus: 'paid' })
      context.log(`[Batch] Marked paid ${results.success} / ${results.total} cost documents`)
      return { status: 200, jsonBody: results }
    } catch (error) {
      context.error('Batch mark-paid failed:', error)
      return { status: 500, jsonBody: { error: 'Batch mark-paid failed' } }
    }
  },
})

// -------------------------------------------------------------------
// Shared batch processor
// -------------------------------------------------------------------

async function processBatch(
  ids: string[],
  update: Record<string, string>,
): Promise<{ total: number; success: number; failed: number; errors: Array<{ id: string; error: string }> }> {
  const errors: Array<{ id: string; error: string }> = []
  let success = 0

  for (const id of ids) {
    try {
      await costDocumentService.update(id, update)
      success++
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ id, error: msg })
    }
  }

  return { total: ids.length, success, failed: errors.length, errors }
}

// -------------------------------------------------------------------
// Notification helpers (fire-and-forget)
// -------------------------------------------------------------------

/**
 * Notify cost document creators when their documents are approved/rejected.
 * Best-effort — failures are logged but don't affect the batch result.
 */
async function fireCostDocApprovalNotifications(
  costDocIds: string[],
  decision: 'approved' | 'rejected',
  decidedBy: string,
): Promise<void> {
  for (const id of costDocIds) {
    try {
      const doc = await costDocumentService.getById(id)
      if (!doc) continue

      // If doc has a setting + MPK center, notify the MPK approvers about the decision
      const settingId = doc.settingId
      if (!settingId) continue

      const mpkCenterId = doc.mpkCenterId
      if (!mpkCenterId) continue

      const approvers = await mpkCenterService.getApprovers(mpkCenterId)
      const recipientIds = approvers.map((a) => a.systemUserId)
      if (recipientIds.length === 0) continue

      const label = doc.documentNumber || doc.name || id
      const statusLabel = decision === 'approved' ? 'Approved' : 'Rejected'

      await notificationService.createForRecipients(recipientIds, {
        settingId,
        type: 'CostDocApprovalDecided',
        message: `Cost document ${label} ${statusLabel.toLowerCase()} by ${decidedBy}`,
        costDocumentId: id,
        mpkCenterId,
      })
    } catch (error) {
      logDataverseError('fireCostDocApprovalNotifications', error)
    }
  }
}
