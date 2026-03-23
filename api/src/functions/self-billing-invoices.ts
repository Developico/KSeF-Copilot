/**
 * Self-Billing Invoices API Endpoints
 *
 * Manages Self-Billing Invoice generation and status management.
 *
 * Endpoints:
 * - POST   /api/self-billing/invoices              - Create self-billing invoice
 * - POST   /api/self-billing/invoices/generate      - Generate invoices for period
 * - POST   /api/self-billing/invoices/generate/confirm - Confirm generated invoices
 * - POST   /api/self-billing/invoices/preview        - Preview generation
 * - GET    /api/self-billing/invoices                - List self-billing invoices
 * - PATCH  /api/self-billing/invoices/:id/status    - Update SB invoice status
 * - POST   /api/self-billing/invoices/:id/submit    - Submit for seller review
 * - POST   /api/self-billing/invoices/:id/approve   - Seller approves
 * - POST   /api/self-billing/invoices/:id/reject    - Seller rejects
 * - POST   /api/self-billing/invoices/:id/send-ksef - Send to KSeF
 * - PATCH  /api/self-billing/invoices/:id           - Update draft SB invoice
 * - DELETE /api/self-billing/invoices/:id           - Delete draft SB invoice
 * - POST   /api/self-billing/invoices/batch         - Batch create invoices (max 100)
 * - GET    /api/self-billing/approvals/pending       - List pending SB approvals for current user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole, requireAnyRole } from '../lib/auth/middleware'
import { sbInvoiceService } from '../lib/dataverse/services/sb-invoice-service'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../lib/dataverse/services/sb-agreement-service'
import { sbTemplateService } from '../lib/dataverse/services/sb-template-service'
import { sendInvoice } from '../lib/ksef/invoices'
import { mpkCenterService } from '../lib/dataverse/services/mpk-center-service'
import { notificationService } from '../lib/dataverse/services/notification-service'
import { createSbInvoiceNote } from '../lib/dataverse/sb-invoice-notes'
import {
  SelfBillingInvoiceCreateSchema,
  SelfBillingGenerateRequestSchema,
  SelfBillingInvoiceStatus,
  SelfBillingInvoiceUpdateSchema,
} from '../types/self-billing'
import type { SelfBillingGeneratePreview } from '../types/self-billing'
import type { KsefInvoice } from '../lib/ksef/types'
import { z } from 'zod'

/**
 * POST /api/invoices/self-billing - Create single self-billing invoice
 */
app.http('self-billing-invoices-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices',
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
      const parsed = SelfBillingInvoiceCreateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const data = parsed.data

      // Resolve agreement
      let agreementId = data.agreementId
      let supplierId = data.supplierId

      if (!agreementId && supplierId) {
        const agreement = await sbAgreementService.getActiveForSupplier(supplierId, data.settingId)
        if (!agreement) {
          return { status: 400, jsonBody: { error: 'No active SB agreement found for this supplier' } }
        }
        agreementId = agreement.id
      } else if (agreementId) {
        const agreement = await sbAgreementService.getById(agreementId)
        if (!agreement) {
          return { status: 404, jsonBody: { error: 'SB agreement not found' } }
        }
        if (agreement.status !== 'Active') {
          return { status: 400, jsonBody: { error: 'SB agreement must be Active' } }
        }
        supplierId = agreement.supplierId
      }

      if (!supplierId) {
        return { status: 400, jsonBody: { error: 'Could not resolve supplier' } }
      }

      const supplier = await supplierService.getById(supplierId)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      // Calculate line items
      const lineItems = data.items.map((item, idx) => {
        const net = item.quantity * item.unitPrice
        const vatAmount = item.vatRate >= 0 ? net * item.vatRate / 100 : 0
        return {
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          netAmount: net,
          vatAmount,
          grossAmount: net + vatAmount,
          paymentTermDays: item.paymentTermDays ?? undefined,
          sortOrder: idx,
          templateId: item.templateId,
        }
      })

      const totals = lineItems.reduce(
        (acc, item) => ({
          netAmount: acc.netAmount + item.netAmount,
          vatAmount: acc.vatAmount + item.vatAmount,
          grossAmount: acc.grossAmount + item.grossAmount,
        }),
        { netAmount: 0, vatAmount: 0, grossAmount: 0 }
      )

      // Generate invoice number using supplier template
      const now = new Date()
      const invoiceNumber = await sbInvoiceService.getNextInvoiceNumber(
        data.settingId,
        now.getFullYear(),
        now.getMonth() + 1,
        supplier.sbInvoiceNumberTemplate,
        supplier.shortName || supplier.name,
        supplier.nip,
      )

      // Create invoice with line items via dedicated SB invoice service
      const invoice = await sbInvoiceService.createWithItems(
        {
          settingId: data.settingId,
          invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          netAmount: totals.netAmount,
          vatAmount: totals.vatAmount,
          grossAmount: totals.grossAmount,
          supplierId,
          agreementId,
          mpkCenterId: data.mpkId || supplier.defaultMpkId || undefined,
        },
        lineItems,
      )

      return {
        status: 201,
        jsonBody: { invoice: { ...invoice, supplierName: supplier.name, supplierNip: supplier.nip } },
      }
    } catch (error) {
      context.error('Failed to create self-billing invoice:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create self-billing invoice' },
      }
    }
  },
})

/**
 * POST /api/invoices/self-billing/preview - Preview generation for period
 */
app.http('self-billing-invoices-preview', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/preview',
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
      const parsed = SelfBillingGenerateRequestSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const { settingId, period, supplierIds, templateIds } = parsed.data
      const diagnostics: BuildDiagnostics = { suppliersFound: 0, suppliersAfterFilter: 0, supplierDetails: [] }
      const previews = await buildGeneratePreviews(settingId, period, supplierIds, diagnostics, templateIds)

      const totals = previews.reduce(
        (acc, p) => ({
          supplierCount: acc.supplierCount + 1,
          invoiceCount: acc.invoiceCount + 1,
          netAmount: acc.netAmount + p.totals.netAmount,
          vatAmount: acc.vatAmount + p.totals.vatAmount,
          grossAmount: acc.grossAmount + p.totals.grossAmount,
        }),
        { supplierCount: 0, invoiceCount: 0, netAmount: 0, vatAmount: 0, grossAmount: 0 },
      )

      return {
        status: 200,
        jsonBody: { previews, totals, diagnostics },
      }
    } catch (error) {
      context.error('Failed to preview self-billing generation:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to preview generation' },
      }
    }
  },
})

/**
 * POST /api/invoices/self-billing/generate - Generate invoices for period
 */
app.http('self-billing-invoices-generate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/generate',
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
      const parsed = SelfBillingGenerateRequestSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const { settingId, period, supplierIds, templateIds, previews: clientPreviews } = parsed.data

      // Use client-provided previews if available, otherwise re-query
      const previews = clientPreviews && clientPreviews.length > 0
        ? clientPreviews
        : await buildGeneratePreviews(settingId, period, supplierIds, undefined, templateIds)

      const results: Array<{ supplierId: string; invoiceId?: string; error?: string }> = []

      // Get starting invoice number for this period (accounts for existing invoices)
      // When generating, we need per-supplier templates so generate numbers inside the loop
      const defaultTemplate = 'SF/{YYYY}/{MM}/{NNN}'

      for (const preview of previews) {
        try {
          const invoiceDate = `${period.year}-${String(period.month).padStart(2, '0')}-${String(new Date(period.year, period.month, 0).getDate()).padStart(2, '0')}`

          // Look up supplier to get template
          const previewSupplier = await supplierService.getById(preview.supplierId)
          const template = previewSupplier?.sbInvoiceNumberTemplate || defaultTemplate
          const invoiceNumber = await sbInvoiceService.getNextInvoiceNumber(
            settingId,
            period.year,
            period.month,
            template,
            previewSupplier?.shortName || previewSupplier?.name,
            previewSupplier?.nip,
          )

          // Compute dueDate from the max paymentTermDays across items
          const maxPaymentTermDays = preview.items.reduce((max, item) => {
            const days = item.paymentTermDays ?? null
            if (days === null) return max
            return max === null ? days : Math.max(max, days)
          }, null as number | null)

          let dueDate: string | undefined
          if (maxPaymentTermDays !== null) {
            const d = new Date(invoiceDate)
            d.setDate(d.getDate() + maxPaymentTermDays)
            dueDate = d.toISOString().substring(0, 10)
          }

          const lineItems = preview.items.map((item, idx) => ({
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            netAmount: item.netAmount,
            vatAmount: item.vatAmount,
            grossAmount: item.grossAmount,
            paymentTermDays: item.paymentTermDays ?? undefined,
            sortOrder: idx,
            templateId: item.templateId,
          }))

          const invoice = await sbInvoiceService.createWithItems(
            {
              settingId,
              invoiceNumber,
              invoiceDate,
              dueDate,
              netAmount: preview.totals.netAmount,
              vatAmount: preview.totals.vatAmount,
              grossAmount: preview.totals.grossAmount,
              supplierId: preview.supplierId,
              agreementId: preview.agreementId,
            },
            lineItems,
          )

          results.push({ supplierId: preview.supplierId, invoiceId: invoice.id })
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ supplierId: preview.supplierId, error: errMsg })
        }
      }

      return {
        status: 200,
        jsonBody: {
          generated: results.filter(r => r.invoiceId).length,
          failed: results.filter(r => r.error).length,
          results,
        },
      }
    } catch (error) {
      context.error('Failed to generate self-billing invoices:', error)
      const detail = error instanceof Error ? error.message : String(error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to generate self-billing invoices', detail },
      }
    }
  },
})

/**
 * PATCH /api/invoices/self-billing/:id/status - Update SB invoice status
 */
app.http('self-billing-invoices-status', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/status',
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

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const StatusUpdateSchema = z.object({
        status: z.nativeEnum(SelfBillingInvoiceStatus),
        rejectionReason: z.string().max(1000).optional(),
      })

      const body = await request.json()
      const parsed = StatusUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const updated = await sbInvoiceService.updateStatus(
        id,
        parsed.data.status,
        parsed.data.rejectionReason,
      )

      if (!updated) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }

      return {
        status: 200,
        jsonBody: { message: `Status updated to ${parsed.data.status}`, invoice: updated },
      }
    } catch (error) {
      context.error('Failed to update self-billing status:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update status' },
      }
    }
  },
})

// ============================================================
// Helper: Build generation previews
// ============================================================

interface BuildDiagnostics {
  suppliersFound: number
  suppliersAfterFilter: number
  supplierDetails: Array<{
    id: string
    name: string
    hasAgreement: boolean
    agreementValid: boolean
    templateCount: number
    skipReason?: string
  }>
}

async function buildGeneratePreviews(
  settingId: string,
  period: { month: number; year: number },
  supplierIds?: string[],
  diagnostics?: BuildDiagnostics,
  templateIds?: string[]
): Promise<SelfBillingGeneratePreview[]> {
  const templateIdSet = templateIds && templateIds.length > 0 ? new Set(templateIds) : undefined
  // Get suppliers with active SB agreements
  let suppliers = await supplierService.getAll({
    settingId,
    hasSelfBillingAgreement: true,
    status: 'Active',
  })

  if (diagnostics) diagnostics.suppliersFound = suppliers.length

  if (supplierIds && supplierIds.length > 0) {
    const idSet = new Set(supplierIds)
    suppliers = suppliers.filter(s => idSet.has(s.id))
  }

  if (diagnostics) diagnostics.suppliersAfterFilter = suppliers.length

  const previews: SelfBillingGeneratePreview[] = []

  for (const supplier of suppliers) {
    const detail: BuildDiagnostics['supplierDetails'][0] = {
      id: supplier.id,
      name: supplier.name,
      hasAgreement: false,
      agreementValid: false,
      templateCount: 0,
    }

    // Get active agreement
    const agreement = await sbAgreementService.getActiveForSupplier(supplier.id, settingId)
    if (!agreement) {
      detail.skipReason = 'no_active_agreement'
      if (diagnostics) diagnostics.supplierDetails.push(detail)
      continue
    }
    detail.hasAgreement = true

    // Check date validity — agreement must overlap with the period month.
    // If it's valid for at least one day of the month, allow generation.
    const periodStart = `${period.year}-${String(period.month).padStart(2, '0')}-01`
    const lastDay = new Date(period.year, period.month, 0).getDate()
    const periodEnd = `${period.year}-${String(period.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const validFrom = (agreement.validFrom ?? '').substring(0, 10)
    const validTo = agreement.validTo ? agreement.validTo.substring(0, 10) : null

    if (validFrom > periodEnd) {
      detail.skipReason = `agreement_not_yet_valid (validFrom=${validFrom} > periodEnd=${periodEnd})`
      if (diagnostics) diagnostics.supplierDetails.push(detail)
      continue
    }
    if (validTo && validTo < periodStart) {
      detail.skipReason = `agreement_expired (validTo=${validTo} < periodStart=${periodStart})`
      if (diagnostics) diagnostics.supplierDetails.push(detail)
      continue
    }
    detail.agreementValid = true

    // Get templates
    let templates = await sbTemplateService.getForSupplier(supplier.id, settingId)
    if (templateIdSet) {
      templates = templates.filter(t => templateIdSet.has(t.id))
    }
    detail.templateCount = templates.length
    if (templates.length === 0) {
      detail.skipReason = 'no_templates'
      if (diagnostics) diagnostics.supplierDetails.push(detail)
      continue
    }

    if (diagnostics) diagnostics.supplierDetails.push(detail)

    const items = templates.map(t => {
      const net = t.quantity * t.unitPrice
      const vatAmount = t.vatRate >= 0 ? net * t.vatRate / 100 : 0
      return {
        templateId: t.id,
        templateName: t.name,
        itemDescription: t.itemDescription,
        quantity: t.quantity,
        unit: t.unit,
        unitPrice: t.unitPrice,
        vatRate: t.vatRate,
        netAmount: net,
        vatAmount,
        grossAmount: net + vatAmount,
        paymentTermDays: t.paymentTermDays ?? null,
      }
    })

    const totals = items.reduce(
      (acc, item) => ({
        netAmount: acc.netAmount + item.netAmount,
        vatAmount: acc.vatAmount + item.vatAmount,
        grossAmount: acc.grossAmount + item.grossAmount,
      }),
      { netAmount: 0, vatAmount: 0, grossAmount: 0 }
    )

    previews.push({
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierNip: supplier.nip,
      agreementId: agreement.id,
      items,
      totals,
    })
  }

  return previews
}

/**
 * GET /api/invoices/self-billing - List self-billing invoices
 */
app.http('self-billing-invoices-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireAnyRole(auth.user, ['Reader', 'Approver'])
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId') || undefined
      const supplierId = url.searchParams.get('supplierId') || undefined
      const status = url.searchParams.get('selfBillingStatus') || undefined
      const top = url.searchParams.get('top')

      const invoices = await sbInvoiceService.getAll({
        settingId,
        supplierId,
        status,
        top: top ? parseInt(top, 10) : undefined,
      })

      // Enrich invoices with supplier name/NIP
      const supplierIds = [...new Set(invoices.map(i => i.supplierId).filter(Boolean))]
      const supplierMap = new Map<string, { name: string; nip: string }>()
      for (const sid of supplierIds) {
        const s = await supplierService.getById(sid)
        if (s) supplierMap.set(sid, { name: s.name, nip: s.nip })
      }

      const enriched = invoices.map(inv => {
        const sup = supplierMap.get(inv.supplierId)
        return { ...inv, supplierName: sup?.name, supplierNip: sup?.nip }
      })

      return {
        status: 200,
        jsonBody: { invoices: enriched, count: enriched.length, total: enriched.length },
      }
    } catch (error) {
      context.error('Failed to list self-billing invoices:', error)
      return { status: 500, jsonBody: { error: 'Failed to list self-billing invoices' } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/generate/confirm - Confirm batch generation
 */
app.http('self-billing-invoices-generate-confirm', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/generate/confirm',
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
      const schema = z.object({
        invoiceIds: z.array(z.string().uuid()).min(1),
      })
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ id: string; status: string; error?: string }> = []

      for (const invoiceId of parsed.data.invoiceIds) {
        try {
          await sbInvoiceService.updateStatus(invoiceId, 'PendingSeller')
          results.push({ id: invoiceId, status: 'PendingSeller' })
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ id: invoiceId, status: 'error', error: errMsg })
        }
      }

      return {
        status: 200,
        jsonBody: {
          confirmed: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          results,
        },
      }
    } catch (error) {
      context.error('Failed to confirm self-billing generation:', error)
      return { status: 500, jsonBody: { error: 'Failed to confirm generation' } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/:id/submit - Submit for seller review
 *
 * Sets status to PendingSeller, records submittedByUserId/submittedAt,
 * and sends SbApprovalRequested notification to the supplier's sbContactUser.
 */
app.http('self-billing-invoices-submit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/submit',
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

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status !== 'Draft') {
        return { status: 400, jsonBody: { error: `Cannot submit — current status is ${invoice.status}` } }
      }

      // Resolve supplier and verify sbContactUserId is set
      const supplier = await supplierService.getById(invoice.supplierId)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      // Resolve current user's Dataverse systemuserid
      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }

      const now = new Date().toISOString()

      // Check if agreement has auto-approve enabled
      let autoApprove = false
      if (invoice.agreementId) {
        const agreement = await sbAgreementService.getById(invoice.agreementId)
        if (agreement?.autoApprove) {
          autoApprove = true
        }
      }

      if (autoApprove) {
        // Auto-approve: skip PendingSeller, go directly to SellerApproved
        const updated = await sbInvoiceService.update(id, {
          status: 'SellerApproved',
          submittedByUserId: dvUser.systemUserId,
          submittedAt: now,
          approvedAt: now,
        })

        // Create audit note for auto-approval
        try {
          await createSbInvoiceNote({
            sbInvoiceId: id,
            subject: 'Auto-zatwierdzona / Auto-approved',
            noteText: '⚡ Auto-zatwierdzona — umowa nie wymaga zatwierdzenia sprzedawcy\n⚡ Auto-approved — agreement does not require seller approval',
          })
        } catch (noteErr) {
          context.warn('Failed to create auto-approval note (non-blocking):', noteErr)
        }

        return { status: 200, jsonBody: { invoice: updated } }
      }

      // Standard flow: require seller approval
      if (!supplier.sbContactUserId) {
        return {
          status: 400,
          jsonBody: { error: 'Supplier has no SB contact user assigned — configure it in supplier settings' },
        }
      }

      const updated = await sbInvoiceService.update(id, {
        status: 'PendingSeller',
        submittedByUserId: dvUser.systemUserId,
        submittedAt: now,
      })

      // Send notification to the supplier's SB contact user
      try {
        await notificationService.create({
          settingId: invoice.settingId,
          recipientId: supplier.sbContactUserId,
          type: 'SbApprovalRequested',
          message: `Self-billing invoice ${invoice.invoiceNumber} submitted for your approval`,
        })
      } catch (notifError) {
        context.warn('Failed to send SB approval notification:', notifError)
      }

      return { status: 200, jsonBody: { invoice: updated } }
    } catch (error) {
      context.error('Failed to submit self-billing invoice:', error)
      return { status: 500, jsonBody: { error: 'Failed to submit for review' } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/:id/approve - Seller approves
 *
 * Allowed for: supplier's sbContactUser or Admin.
 * Records approvedByUserId/approvedAt.
 */
app.http('self-billing-invoices-approve', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/approve',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Reader or Approver may approve (sbContactUser may not be Admin)
      const roleCheck = requireAnyRole(auth.user, ['Reader', 'Approver'])
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      // Optional comment and invoiceNumber from request body
      let comment: string | undefined
      let newInvoiceNumber: string | undefined
      try {
        const body = await request.json() as Record<string, unknown>
        if (body && typeof body.comment === 'string' && body.comment.trim().length > 0) {
          comment = body.comment.trim()
        }
        if (body && typeof body.invoiceNumber === 'string' && body.invoiceNumber.trim().length > 0) {
          newInvoiceNumber = body.invoiceNumber.trim()
          if (newInvoiceNumber.length > 256) {
            return { status: 400, jsonBody: { error: 'Invoice number must be at most 256 characters' } }
          }
        }
      } catch {
        // No body or invalid JSON — that's fine, comment is optional
      }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status !== 'PendingSeller') {
        return { status: 400, jsonBody: { error: `Cannot approve — current status is ${invoice.status}` } }
      }

      // Resolve caller's Dataverse identity
      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }

      // Authorization: only the supplier's sbContactUser or Admin can approve
      const supplier = await supplierService.getById(invoice.supplierId)
      const isDesignatedApprover = supplier?.sbContactUserId === dvUser.systemUserId
      const isAdmin = auth.user.roles.includes('Admin')

      if (!isDesignatedApprover && !isAdmin) {
        return { status: 403, jsonBody: { error: 'Only the designated supplier contact or Admin can approve' } }
      }

      const now = new Date().toISOString()

      // If supplier provided a new invoice number, check uniqueness
      const invoiceNumberChanged = newInvoiceNumber != null && newInvoiceNumber !== invoice.invoiceNumber
      if (invoiceNumberChanged) {
        const existing = await sbInvoiceService.findByInvoiceNumber(invoice.settingId, newInvoiceNumber!, id)
        if (existing) {
          return { status: 409, jsonBody: { error: 'Invoice number already exists' } }
        }
      }

      const updateData: Parameters<typeof sbInvoiceService.update>[1] = {
        status: 'SellerApproved',
        approvedByUserId: dvUser.systemUserId,
        approvedAt: now,
      }
      if (invoiceNumberChanged && newInvoiceNumber) {
        updateData.invoiceNumber = newInvoiceNumber
      }

      const updated = await sbInvoiceService.update(id, updateData)

      // Auto-create annotation for approval decision
      try {
        const approverName = dvUser.fullName || auth.user.name || 'Unknown'
        const noteLines = [`✅ Approved by ${approverName}`]
        if (invoiceNumberChanged) {
          noteLines.push(`\nInvoice number changed: ${invoice.invoiceNumber} → ${newInvoiceNumber}`)
        }
        if (comment) noteLines.push(`\nComment: ${comment}`)
        await createSbInvoiceNote({
          sbInvoiceId: id,
          subject: 'Approved',
          noteText: noteLines.join(''),
        })
      } catch (noteErr) {
        context.warn('Failed to create approval note (non-blocking):', noteErr)
      }

      // Notify the submitter that the invoice was approved
      if (invoice.submittedByUserId) {
        try {
          await notificationService.create({
            settingId: invoice.settingId,
            recipientId: invoice.submittedByUserId,
            type: 'SbApprovalDecided',
            message: `Self-billing invoice ${invoice.invoiceNumber} has been approved`,
          })
        } catch (notifErr) {
          context.warn('Failed to send SB approval decided notification:', notifErr)
        }
      }

      return { status: 200, jsonBody: { invoice: updated } }
    } catch (error) {
      context.error('Failed to approve self-billing invoice:', error)
      return { status: 500, jsonBody: { error: 'Failed to approve invoice' } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/:id/reject - Seller rejects
 *
 * Allowed for: supplier's sbContactUser or Admin.
 * Records approvedByUserId/approvedAt (rejection is also a decision).
 */
app.http('self-billing-invoices-reject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/reject',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Reader or Approver may reject (sbContactUser may not be Admin)
      const roleCheck = requireAnyRole(auth.user, ['Reader', 'Approver'])
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const body = await request.json()
      const schema = z.object({
        reason: z.string().min(1).max(1000),
      })
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Rejection reason is required', details: parsed.error.flatten() } }
      }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status !== 'PendingSeller') {
        return { status: 400, jsonBody: { error: `Cannot reject — current status is ${invoice.status}` } }
      }

      // Resolve caller's Dataverse identity
      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }

      // Authorization: only the supplier's sbContactUser or Admin can reject
      const supplier = await supplierService.getById(invoice.supplierId)
      const isDesignatedApprover = supplier?.sbContactUserId === dvUser.systemUserId
      const isAdmin = auth.user.roles.includes('Admin')

      if (!isDesignatedApprover && !isAdmin) {
        return { status: 403, jsonBody: { error: 'Only the designated supplier contact or Admin can reject' } }
      }

      const now = new Date().toISOString()

      const updated = await sbInvoiceService.update(id, {
        status: 'SellerRejected',
        sellerRejectionReason: parsed.data.reason,
        approvedByUserId: dvUser.systemUserId,
        approvedAt: now,
      })

      // Auto-create annotation for rejection decision
      try {
        const rejectorName = dvUser.fullName || auth.user.name || 'Unknown'
        await createSbInvoiceNote({
          sbInvoiceId: id,
          subject: 'Rejected',
          noteText: `❌ Rejected by ${rejectorName}\n\nReason: ${parsed.data.reason}`,
        })
      } catch (noteErr) {
        context.warn('Failed to create rejection note (non-blocking):', noteErr)
      }

      // Notify the submitter that the invoice was rejected
      if (invoice.submittedByUserId) {
        try {
          await notificationService.create({
            settingId: invoice.settingId,
            recipientId: invoice.submittedByUserId,
            type: 'SbApprovalDecided',
            message: `Self-billing invoice ${invoice.invoiceNumber} has been rejected`,
          })
        } catch (notifErr) {
          context.warn('Failed to send SB rejection decided notification:', notifErr)
        }
      }

      return { status: 200, jsonBody: { invoice: updated } }
    } catch (error) {
      context.error('Failed to reject self-billing invoice:', error)
      return { status: 500, jsonBody: { error: 'Failed to reject invoice' } }
    }
  },
})

/**
 * POST /api/self-billing/invoices/:id/revert - Admin reverts invoice to Draft
 *
 * Allowed for: Admin only. Works from any status except SentToKsef.
 * Clears approval/submission fields and creates a note with the reason.
 */
const RevertSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(2000),
})

app.http('self-billing-invoices-revert', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/revert',
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

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const body = await request.json()
      const parsed = RevertSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Invalid request body', details: parsed.error.flatten() } }
      }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status === 'Draft') {
        return { status: 400, jsonBody: { error: 'Invoice is already a draft' } }
      }
      if (invoice.status === 'SentToKsef') {
        return { status: 400, jsonBody: { error: 'Cannot revert — invoice has already been sent to KSeF' } }
      }

      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      const previousStatus = invoice.status

      const updated = await sbInvoiceService.update(id, {
        status: 'Draft',
        submittedByUserId: null,
        submittedAt: null,
        approvedByUserId: null,
        approvedAt: null,
        sellerRejectionReason: '',
      })

      // Create note about revert
      try {
        const adminName = dvUser?.fullName || auth.user.name || 'Admin'
        await createSbInvoiceNote({
          sbInvoiceId: id,
          subject: 'Reverted to Draft',
          noteText: `🔄 Reverted from "${previousStatus}" to Draft by ${adminName}\n\nReason: ${parsed.data.reason}`,
        })
      } catch (noteErr) {
        context.warn('Failed to create revert note:', noteErr)
      }

      return { status: 200, jsonBody: { invoice: updated } }
    } catch (error) {
      context.error('Failed to revert self-billing invoice:', error)
      return { status: 500, jsonBody: { error: 'Failed to revert invoice' } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/:id/send-ksef - Send approved SB invoice to KSeF
 */
app.http('self-billing-invoices-send-ksef', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/send-ksef',
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

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status !== 'SellerApproved') {
        return { status: 400, jsonBody: { error: `Cannot send — invoice must be SellerApproved, current: ${invoice.status}` } }
      }

      // Fetch supplier and setting for KSeF XML generation
      const supplier = await supplierService.getById(invoice.supplierId)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }
      const { settingService } = await import('../lib/dataverse/services/setting-service')
      const setting = await settingService.getById(invoice.settingId)
      if (!setting) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      // Build KSeF invoice object from dedicated SB data
      const ksefInvoice: KsefInvoice = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate || undefined,
        isSelfBilling: true,
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
        items: invoice.items.map((item, idx) => ({
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
        currency: invoice.currency || 'PLN',
      }

      // Send to KSeF
      const result = await sendInvoice(setting.nip, ksefInvoice, invoice.settingId)

      // Update invoice with KSeF reference and status
      await sbInvoiceService.update(id, {
        ksefReferenceNumber: result.ksefReferenceNumber || result.referenceNumber,
        status: 'SentToKsef',
        sentDate: new Date().toISOString(),
      })

      // Note: successful send
      try {
        await createSbInvoiceNote({
          sbInvoiceId: id,
          subject: 'Sent to KSeF',
          noteText: `📤 Invoice sent to KSeF\n\nReference: ${result.ksefReferenceNumber || result.referenceNumber}`,
        })
      } catch { /* non-blocking */ }

      return {
        status: 200,
        jsonBody: {
          message: 'Invoice sent to KSeF',
          ksefReferenceNumber: result.ksefReferenceNumber || result.referenceNumber,
          elementReferenceNumber: result.elementReferenceNumber,
        },
      }
    } catch (error) {
      context.error('Failed to send self-billing invoice to KSeF:', error)

      // Note: failed send
      const id = request.params.id
      if (id) {
        try {
          const errMsg = error instanceof Error ? error.message : String(error)
          await createSbInvoiceNote({
            sbInvoiceId: id,
            subject: 'KSeF Send Failed',
            noteText: `⚠️ Failed to send invoice to KSeF\n\nError: ${errMsg}`,
          })
        } catch { /* non-blocking */ }
      }

      return { status: 500, jsonBody: { error: 'Failed to send invoice to KSeF' } }
    }
  },
})

/**
 * GET /api/self-billing/invoices/:id - Get a single self-billing invoice
 */
app.http('self-billing-invoices-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireAnyRole(auth.user, ['Reader', 'Approver'])
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }

      return { status: 200, jsonBody: invoice }
    } catch (error) {
      context.error('Failed to get self-billing invoice', error)
      return { status: 500, jsonBody: { error: 'Failed to get self-billing invoice' } }
    }
  },
})

/**
 * PATCH /api/self-billing/invoices/:id - Update draft self-billing invoice
 */
app.http('self-billing-invoices-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}',
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

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status !== 'Draft') {
        return { status: 400, jsonBody: { error: `Only draft invoices can be edited, current status: ${invoice.status}` } }
      }

      const body = await request.json()
      const parsed = SelfBillingInvoiceUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      // Update header fields
      const updateData: Partial<{
        invoiceNumber: string
        invoiceDate: string
        dueDate: string
      }> = {}

      if (parsed.data.invoiceNumber) {
        updateData.invoiceNumber = parsed.data.invoiceNumber
      }
      if (parsed.data.invoiceDate) {
        updateData.invoiceDate = parsed.data.invoiceDate
      }
      if (parsed.data.dueDate) {
        updateData.dueDate = parsed.data.dueDate
      }

      if (Object.keys(updateData).length > 0) {
        await sbInvoiceService.update(id, updateData)
      }

      // Replace line items if provided
      if (parsed.data.items && parsed.data.items.length > 0) {
        const lineItems = parsed.data.items.map((item, idx) => {
          const net = item.quantity * item.unitPrice
          const vat = item.vatRate >= 0 ? net * item.vatRate / 100 : 0
          return {
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            netAmount: net,
            vatAmount: vat,
            grossAmount: net + vat,
            paymentTermDays: item.paymentTermDays ?? undefined,
            sortOrder: idx,
            templateId: item.templateId,
          }
        })

        await sbInvoiceService.replaceLineItems(id, lineItems)
      }

      const updated = await sbInvoiceService.getById(id)

      return {
        status: 200,
        jsonBody: updated,
      }
    } catch (error) {
      context.error('Failed to update self-billing invoice:', error)
      const detail = error instanceof Error ? error.message : String(error)
      return { status: 500, jsonBody: { error: 'Failed to update self-billing invoice', detail } }
    }
  },
})

/**
 * DELETE /api/self-billing/invoices/:id - Delete draft self-billing invoice
 */
app.http('self-billing-invoices-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}',
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

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const invoice = await sbInvoiceService.getById(id)
      if (!invoice) {
        return { status: 404, jsonBody: { error: 'Invoice not found' } }
      }
      if (invoice.status !== 'Draft' && invoice.status !== 'SellerRejected') {
        return { status: 400, jsonBody: { error: `Only draft or rejected invoices can be deleted, current status: ${invoice.status}` } }
      }

      await sbInvoiceService.delete(id)

      return { status: 204 }
    } catch (error) {
      context.error('Failed to delete self-billing invoice:', error)
      const detail = error instanceof Error ? error.message : String(error)
      return { status: 500, jsonBody: { error: 'Failed to delete self-billing invoice', detail } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/batch - Batch create self-billing invoices (max 100)
 */
app.http('self-billing-invoices-batch', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/batch',
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
      const batchSchema = z.object({
        settingId: z.string().uuid(),
        invoices: z.array(SelfBillingInvoiceCreateSchema).min(1).max(100),
      })

      const parsed = batchSchema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ index: number; invoiceId?: string; error?: string }> = []

      for (let i = 0; i < parsed.data.invoices.length; i++) {
        const invoiceData = parsed.data.invoices[i]
        try {
          // Resolve supplier
          let supplierId = invoiceData.supplierId
          let agreementId = invoiceData.agreementId

          if (!supplierId && agreementId) {
            const agr = await sbAgreementService.getById(agreementId)
            if (!agr) {
              results.push({ index: i, error: `Agreement ${agreementId} not found` })
              continue
            }
            supplierId = agr.supplierId
          }

          if (!supplierId) {
            results.push({ index: i, error: 'Could not resolve supplier' })
            continue
          }

          const supplier = await supplierService.getById(supplierId)
          if (!supplier) {
            results.push({ index: i, error: `Supplier ${supplierId} not found` })
            continue
          }

          // Verify active agreement
          if (!agreementId) {
            const agreement = await sbAgreementService.getActiveForSupplier(supplier.id, parsed.data.settingId)
            if (!agreement) {
              results.push({ index: i, error: `No active SB agreement for supplier ${supplier.name}` })
              continue
            }
            agreementId = agreement.id
          }

          // Calculate totals from line items
          const lineItems = invoiceData.items.map((item, idx) => {
            const net = item.quantity * item.unitPrice
            const vat = item.vatRate >= 0 ? net * item.vatRate / 100 : 0
            return {
              itemDescription: item.itemDescription,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              netAmount: net,
              vatAmount: vat,
              grossAmount: net + vat,
              paymentTermDays: item.paymentTermDays ?? undefined,
              sortOrder: idx,
              templateId: item.templateId,
            }
          })

          const totals = lineItems.reduce(
            (acc, item) => ({
              netAmount: acc.netAmount + item.netAmount,
              vatAmount: acc.vatAmount + item.vatAmount,
              grossAmount: acc.grossAmount + item.grossAmount,
            }),
            { netAmount: 0, vatAmount: 0, grossAmount: 0 }
          )

          // Generate invoice number
          const now = new Date()
          const invoiceNumber = `SF/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(Date.now() % 1000).padStart(3, '0')}-${i}`

          // Create the invoice with line items
          const invoice = await sbInvoiceService.createWithItems(
            {
              settingId: parsed.data.settingId,
              invoiceNumber,
              invoiceDate: invoiceData.invoiceDate,
              dueDate: invoiceData.dueDate,
              netAmount: totals.netAmount,
              vatAmount: totals.vatAmount,
              grossAmount: totals.grossAmount,
              supplierId: supplierId!,
              agreementId,
            },
            lineItems,
          )

          results.push({ index: i, invoiceId: invoice.id })
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ index: i, error: errMsg })
        }
      }

      return {
        status: 200,
        jsonBody: {
          total: parsed.data.invoices.length,
          created: results.filter(r => r.invoiceId).length,
          failed: results.filter(r => r.error).length,
          results,
        },
      }
    } catch (error) {
      context.error('Failed to batch create self-billing invoices:', error)
      return { status: 500, jsonBody: { error: 'Failed to batch create invoices' } }
    }
  },
})

/**
 * GET /api/self-billing/approvals/pending - List pending SB approvals for current user
 *
 * Returns PendingSeller invoices where the supplier's sbContactUserId matches
 * the current user. Admins can see all pending approvals via ?all=true.
 */
app.http('self-billing-approvals-pending', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'self-billing/approvals/pending',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireAnyRole(auth.user, ['Reader', 'Approver'])
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId') || undefined
      const showAll = url.searchParams.get('all') === 'true' && auth.user.roles.includes('Admin')

      // Resolve caller's Dataverse identity
      const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
      if (!dvUser) {
        return { status: 403, jsonBody: { error: 'Could not resolve your Dataverse user account' } }
      }

      // Get all PendingSeller invoices
      const invoices = await sbInvoiceService.getAll({
        settingId,
        status: 'PendingSeller',
      })

      // Enrich with supplier data and filter by sbContactUserId
      const supplierIds = [...new Set(invoices.map(i => i.supplierId).filter(Boolean))]
      const supplierMap = new Map<string, { name: string; nip: string; sbContactUserId?: string | null }>()
      for (const sid of supplierIds) {
        const s = await supplierService.getById(sid)
        if (s) supplierMap.set(sid, { name: s.name, nip: s.nip, sbContactUserId: s.sbContactUserId })
      }

      const enriched = invoices
        .filter(inv => {
          if (showAll) return true
          const sup = supplierMap.get(inv.supplierId)
          return sup?.sbContactUserId === dvUser.systemUserId
        })
        .map(inv => {
          const sup = supplierMap.get(inv.supplierId)
          return { ...inv, supplierName: sup?.name, supplierNip: sup?.nip }
        })

      return {
        status: 200,
        jsonBody: { invoices: enriched, count: enriched.length },
      }
    } catch (error) {
      context.error('Failed to list pending SB approvals:', error)
      return { status: 500, jsonBody: { error: 'Failed to list pending approvals' } }
    }
  },
})
