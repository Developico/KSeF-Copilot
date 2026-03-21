/**
 * Self-Billing Batch Action Endpoints
 *
 * Bulk operations for Self-Billing Invoices:
 * - POST /api/self-billing/batch/submit   - Batch submit (Draft → PendingSeller/SellerApproved)
 * - POST /api/self-billing/batch/approve   - Batch approve (PendingSeller → SellerApproved)
 * - POST /api/self-billing/batch/reject    - Batch reject (PendingSeller → SellerRejected)
 * - POST /api/self-billing/batch/send-ksef - Batch send to KSeF (SellerApproved → SentToKsef)
 * - POST /api/self-billing/batch/delete    - Batch delete (Draft/SellerRejected)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { sbInvoiceService } from '../lib/dataverse/services/sb-invoice-service'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../lib/dataverse/services/sb-agreement-service'
import { mpkCenterService } from '../lib/dataverse/services/mpk-center-service'
import { notificationService } from '../lib/dataverse/services/notification-service'
import { createSbInvoiceNote } from '../lib/dataverse/sb-invoice-notes'
import { sendInvoice } from '../lib/ksef/invoices'
import type { KsefInvoice } from '../lib/ksef/types'
import { z } from 'zod'

// ── Schemas ──────────────────────────────────────────────────

const BatchIdsSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(200),
})

const BatchRejectSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(200),
  reason: z.string().min(1).max(1000),
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

// ── Batch Submit ─────────────────────────────────────────────

app.http('self-billing-batch-submit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/batch/submit',
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

      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          const invoice = await sbInvoiceService.getById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.status !== 'Draft') {
            results.push({ id, success: false, error: `Cannot submit — status is ${invoice.status}` })
            continue
          }

          const supplier = await supplierService.getById(invoice.supplierId)
          if (!supplier) {
            results.push({ id, success: false, error: 'Supplier not found' })
            continue
          }

          const now = new Date().toISOString()

          // Check auto-approve
          let autoApprove = false
          if (invoice.agreementId) {
            const agreement = await sbAgreementService.getById(invoice.agreementId)
            if (agreement?.autoApprove) autoApprove = true
          }

          if (autoApprove) {
            await sbInvoiceService.update(id, {
              status: 'SellerApproved',
              submittedByUserId: dvUser.systemUserId,
              submittedAt: now,
              approvedAt: now,
            })
            try {
              await createSbInvoiceNote({
                sbInvoiceId: id,
                subject: 'Auto-zatwierdzona / Auto-approved',
                noteText: '⚡ Auto-zatwierdzona — umowa nie wymaga zatwierdzenia sprzedawcy\n⚡ Auto-approved — agreement does not require seller approval',
              })
            } catch { /* non-blocking */ }
          } else {
            if (!supplier.sbContactUserId) {
              results.push({ id, success: false, error: 'Supplier has no SB contact user' })
              continue
            }
            await sbInvoiceService.update(id, {
              status: 'PendingSeller',
              submittedByUserId: dvUser.systemUserId,
              submittedAt: now,
            })
            try {
              await notificationService.create({
                settingId: invoice.settingId,
                recipientId: supplier.sbContactUserId,
                type: 'SbApprovalRequested',
                message: `Self-billing invoice ${invoice.invoiceNumber} submitted for your approval`,
              })
            } catch { /* non-blocking */ }
          }

          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch submit failed:', error)
      return { status: 500, jsonBody: { error: 'Batch submit failed' } }
    }
  },
})

// ── Batch Approve ────────────────────────────────────────────

app.http('self-billing-batch-approve', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/batch/approve',
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

      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }
      const isAdmin = auth.user.roles.includes('Admin')

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          const invoice = await sbInvoiceService.getById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.status !== 'PendingSeller') {
            results.push({ id, success: false, error: `Cannot approve — status is ${invoice.status}` })
            continue
          }

          const supplier = await supplierService.getById(invoice.supplierId)
          const isDesignatedApprover = supplier?.sbContactUserId === dvUser.systemUserId
          if (!isDesignatedApprover && !isAdmin) {
            results.push({ id, success: false, error: 'Not authorized to approve this invoice' })
            continue
          }

          const now = new Date().toISOString()
          await sbInvoiceService.update(id, {
            status: 'SellerApproved',
            approvedByUserId: dvUser.systemUserId,
            approvedAt: now,
          })

          try {
            const approverName = dvUser.fullName || auth.user.name || 'Unknown'
            await createSbInvoiceNote({
              sbInvoiceId: id,
              subject: 'Approved',
              noteText: `✅ Approved by ${approverName} (batch)`,
            })
          } catch { /* non-blocking */ }

          if (invoice.submittedByUserId) {
            try {
              await notificationService.create({
                settingId: invoice.settingId,
                recipientId: invoice.submittedByUserId,
                type: 'SbApprovalDecided',
                message: `Self-billing invoice ${invoice.invoiceNumber} has been approved`,
              })
            } catch { /* non-blocking */ }
          }

          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch approve failed:', error)
      return { status: 500, jsonBody: { error: 'Batch approve failed' } }
    }
  },
})

// ── Batch Reject ─────────────────────────────────────────────

app.http('self-billing-batch-reject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/batch/reject',
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

      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }
      const isAdmin = auth.user.roles.includes('Admin')

      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (const id of parsed.data.invoiceIds) {
        try {
          const invoice = await sbInvoiceService.getById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.status !== 'PendingSeller') {
            results.push({ id, success: false, error: `Cannot reject — status is ${invoice.status}` })
            continue
          }

          const supplier = await supplierService.getById(invoice.supplierId)
          const isDesignatedApprover = supplier?.sbContactUserId === dvUser.systemUserId
          if (!isDesignatedApprover && !isAdmin) {
            results.push({ id, success: false, error: 'Not authorized to reject this invoice' })
            continue
          }

          const now = new Date().toISOString()
          await sbInvoiceService.update(id, {
            status: 'SellerRejected',
            sellerRejectionReason: parsed.data.reason,
            approvedByUserId: dvUser.systemUserId,
            approvedAt: now,
          })

          try {
            const rejectorName = dvUser.fullName || auth.user.name || 'Unknown'
            await createSbInvoiceNote({
              sbInvoiceId: id,
              subject: 'Rejected',
              noteText: `❌ Rejected by ${rejectorName} (batch)\n\nReason: ${parsed.data.reason}`,
            })
          } catch { /* non-blocking */ }

          if (invoice.submittedByUserId) {
            try {
              await notificationService.create({
                settingId: invoice.settingId,
                recipientId: invoice.submittedByUserId,
                type: 'SbApprovalDecided',
                message: `Self-billing invoice ${invoice.invoiceNumber} has been rejected`,
              })
            } catch { /* non-blocking */ }
          }

          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch reject failed:', error)
      return { status: 500, jsonBody: { error: 'Batch reject failed' } }
    }
  },
})

// ── Batch Send to KSeF ──────────────────────────────────────

app.http('self-billing-batch-send-ksef', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/batch/send-ksef',
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
          const invoice = await sbInvoiceService.getById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.status !== 'SellerApproved') {
            results.push({ id, success: false, error: `Cannot send — status is ${invoice.status}` })
            continue
          }

          const supplier = await supplierService.getById(invoice.supplierId)
          if (!supplier) {
            results.push({ id, success: false, error: 'Supplier not found' })
            continue
          }

          const { settingService } = await import('../lib/dataverse/services/setting-service')
          const setting = await settingService.getById(invoice.settingId)
          if (!setting) {
            results.push({ id, success: false, error: 'Setting not found' })
            continue
          }

          const ksefInvoice: KsefInvoice = {
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate || undefined,
            isSelfBilling: true,
            currency: invoice.currency || 'PLN',
            seller: {
              nip: supplier.nip,
              name: supplier.name,
              address: {
                street: supplier.street || '',
                buildingNumber: '',
                postalCode: supplier.postalCode || '',
                city: supplier.city || '',
                country: supplier.country || 'PL',
              },
            },
            buyer: {
              nip: setting.nip,
              name: setting.companyName || '',
              address: {
                street: '',
                buildingNumber: '',
                postalCode: '',
                city: '',
                country: 'PL',
              },
            },
            issuer: {
              nip: setting.nip,
              name: setting.companyName || '',
            },
            items: (invoice.items ?? []).map((item, idx) => ({
              lineNumber: idx + 1,
              description: item.itemDescription,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              netAmount: item.netAmount,
              vatRate: item.vatRate,
              vatAmount: item.vatAmount,
              grossAmount: item.grossAmount,
            })),
          }

          const ksefResult = await sendInvoice(setting.nip, ksefInvoice, invoice.settingId)

          await sbInvoiceService.update(id, {
            status: 'SentToKsef',
            ksefReferenceNumber: ksefResult.ksefReferenceNumber || ksefResult.referenceNumber,
            sentDate: new Date().toISOString(),
          })

          try {
            await createSbInvoiceNote({
              sbInvoiceId: id,
              subject: 'Sent to KSeF',
              noteText: `📤 Sent to KSeF (batch)\nReference: ${ksefResult.ksefReferenceNumber || ksefResult.referenceNumber}`,
            })
          } catch { /* non-blocking */ }

          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
          try {
            await createSbInvoiceNote({
              sbInvoiceId: id,
              subject: 'KSeF Send Failed',
              noteText: `❌ Batch send to KSeF failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            })
          } catch { /* non-blocking */ }
        }
      }

      return { status: 200, jsonBody: batchResponse(results) }
    } catch (error) {
      context.error('Batch send-ksef failed:', error)
      return { status: 500, jsonBody: { error: 'Batch send to KSeF failed' } }
    }
  },
})

// ── Batch Delete ─────────────────────────────────────────────

app.http('self-billing-batch-delete', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/batch/delete',
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
          const invoice = await sbInvoiceService.getById(id)
          if (!invoice) {
            results.push({ id, success: false, error: 'Invoice not found' })
            continue
          }
          if (invoice.status !== 'Draft' && invoice.status !== 'SellerRejected') {
            results.push({ id, success: false, error: `Cannot delete — status is ${invoice.status}` })
            continue
          }

          await sbInvoiceService.delete(id)
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
