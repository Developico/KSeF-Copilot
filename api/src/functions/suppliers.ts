/**
 * Suppliers API Endpoints
 *
 * Manages the Supplier Registry.
 *
 * Endpoints:
 * - GET    /api/suppliers              - List suppliers
 * - POST   /api/suppliers              - Create supplier (Admin)
 * - GET    /api/suppliers/:id          - Get single supplier
 * - PATCH  /api/suppliers/:id          - Update supplier (Admin)
 * - DELETE /api/suppliers/:id          - Deactivate supplier (Admin)
 * - GET    /api/suppliers/:id/stats    - Get supplier statistics
 * - POST   /api/suppliers/:id/stats/refresh - Refresh cached statistics
 * - GET    /api/suppliers/:id/invoices - Get supplier's invoices
 * - POST   /api/suppliers/from-vat     - Create supplier from VAT API
 * - POST   /api/suppliers/:id/refresh-vat - Refresh VAT status
 * - POST   /api/suppliers/extract-from-invoices - Create suppliers from existing invoices (Admin)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { invoiceService } from '../lib/dataverse/services/invoice-service'
import { settingService } from '../lib/dataverse/services/setting-service'
import { dataverseClient } from '../lib/dataverse/client'
import { DV } from '../lib/dataverse/config'
import { SupplierCreateSchema, SupplierUpdateSchema } from '../types/supplier'
import type { SupplierStatus, Supplier } from '../types/supplier'
import { z } from 'zod'

/**
 * GET /api/suppliers - List suppliers for a setting
 */
app.http('suppliers-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers',
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

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId')
      if (!settingId) {
        return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
      }

      const status = url.searchParams.get('status') as SupplierStatus | null
      const search = url.searchParams.get('search') || undefined
      const hasSelfBilling = url.searchParams.get('hasSelfBillingAgreement')
      const top = url.searchParams.get('top')
      const skip = url.searchParams.get('skip')

      const suppliers = await supplierService.getAll({
        settingId,
        status: status || undefined,
        search,
        hasSelfBillingAgreement: hasSelfBilling !== null ? hasSelfBilling === 'true' : undefined,
        top: top ? parseInt(top, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      })

      return {
        status: 200,
        jsonBody: { suppliers, count: suppliers.length },
      }
    } catch (error) {
      context.error('Failed to list suppliers:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list suppliers' },
      }
    }
  },
})

/**
 * POST /api/suppliers - Create new supplier
 */
app.http('suppliers-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers',
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
      const parsed = SupplierCreateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      // Check for duplicate NIP in the same setting
      const existing = await supplierService.getByNip(parsed.data.nip, parsed.data.settingId)
      if (existing) {
        return {
          status: 409,
          jsonBody: { error: `Supplier with NIP ${parsed.data.nip} already exists`, existingId: existing.id },
        }
      }

      const supplier = await supplierService.create(parsed.data)

      return {
        status: 201,
        jsonBody: { supplier },
      }
    } catch (error) {
      context.error('Failed to create supplier:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create supplier' },
      }
    }
  },
})

/**
 * GET /api/suppliers/:id - Get single supplier
 */
app.http('suppliers-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}',
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

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const supplier = await supplierService.getById(id)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      return {
        status: 200,
        jsonBody: { supplier },
      }
    } catch (error) {
      context.error('Failed to get supplier:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get supplier' },
      }
    }
  },
})

/**
 * PATCH /api/suppliers/:id - Update supplier
 */
app.http('suppliers-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}',
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

      const body = await request.json()
      const parsed = SupplierUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const supplier = await supplierService.update(id, parsed.data)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      return {
        status: 200,
        jsonBody: { supplier },
      }
    } catch (error) {
      context.error('Failed to update supplier:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update supplier' },
      }
    }
  },
})

/**
 * DELETE /api/suppliers/:id - Deactivate supplier
 */
app.http('suppliers-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}',
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

      await supplierService.deactivate(id)

      return {
        status: 200,
        jsonBody: { message: 'Supplier deactivated' },
      }
    } catch (error) {
      context.error('Failed to deactivate supplier:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to deactivate supplier' },
      }
    }
  },
})

/**
 * GET /api/suppliers/:id/stats - Get supplier statistics
 */
app.http('suppliers-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/stats',
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

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const supplier = await supplierService.getById(id)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      // Compute statistics using the service method
      const dateFrom = request.query.get('dateFrom') ?? undefined
      const dateTo = request.query.get('dateTo') ?? undefined
      const stats = await supplierService.getStats(id, dateFrom, dateTo)

      return {
        status: 200,
        jsonBody: { stats },
      }
    } catch (error) {
      context.error('Failed to get supplier stats:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get supplier statistics' },
      }
    }
  },
})

/**
 * POST /api/suppliers/:id/stats/refresh - Refresh cached statistics
 */
app.http('suppliers-stats-refresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/stats/refresh',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const supplier = await supplierService.getById(id)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      await supplierService.updateCachedStats(id)

      return {
        status: 200,
        jsonBody: { message: 'Cached statistics refreshed' },
      }
    } catch (error) {
      context.error('Failed to refresh supplier stats:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to refresh supplier statistics' },
      }
    }
  },
})

// GET /api/suppliers/:id/invoices - Get supplier invoices
app.http('suppliers-invoices', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/invoices',
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

      const id = request.params.id
      if (!id) { return { status: 400, jsonBody: { error: 'Missing id parameter' } } }

      const supplier = await supplierService.getById(id)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      const url = new URL(request.url)
      const top = url.searchParams.get('top')
      const paymentStatus = url.searchParams.get('paymentStatus') as 'pending' | 'paid' | 'overdue' | null
      const dateFrom = url.searchParams.get('fromDate') || undefined
      const dateTo = url.searchParams.get('toDate') || undefined

      const invoices = await invoiceService.getAll({
        supplierNip: supplier.nip,
        paymentStatus: paymentStatus || undefined,
        dateFrom,
        dateTo,
        top: top ? parseInt(top, 10) : undefined,
      })

      return {
        status: 200,
        jsonBody: { invoices, count: invoices.length },
      }
    } catch (error) {
      context.error('Failed to get supplier invoices:', error)
      return { status: 500, jsonBody: { error: 'Failed to get supplier invoices' } }
    }
  },
})

// POST /api/suppliers/from-vat - Create supplier from VAT API (VIES/GUS)
app.http('suppliers-from-vat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/from-vat',
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
        nip: z.string().regex(/^\d{10}$/, 'NIP must be 10 digits'),
        settingId: z.string().uuid(),
      })
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      // Check if supplier already exists
      const existing = await supplierService.getByNip(parsed.data.nip, parsed.data.settingId)
      if (existing) {
        return { status: 409, jsonBody: { error: `Supplier with NIP ${parsed.data.nip} already exists`, existingId: existing.id } }
      }

      // Fetch from Polish MF VIES API (Biała Lista VAT)
      const vatApiUrl = `https://wl-api.mf.gov.pl/api/search/nip/${encodeURIComponent(parsed.data.nip)}?date=${new Date().toISOString().split('T')[0]}`
      const response = await fetch(vatApiUrl)

      if (!response.ok) {
        return { status: 502, jsonBody: { error: 'VAT API request failed', statusCode: response.status } }
      }

      const vatData = await response.json() as {
        result: {
          subject?: {
            name?: string
            nip?: string
            regon?: string
            krs?: string
            residenceAddress?: string
            workingAddress?: string
            accountNumbers?: string[]
            statusVat?: string
          }
        }
      }

      const subject = vatData.result?.subject
      if (!subject) {
        return { status: 404, jsonBody: { error: `No entity found for NIP ${parsed.data.nip}` } }
      }

      // Parse address from workingAddress or residenceAddress (format: "UL. X NR Y, KOD MIASTO")
      let street: string | undefined
      let city: string | undefined
      let postalCode: string | undefined
      const addr = subject.workingAddress || subject.residenceAddress
      if (addr) {
        const commaIdx = addr.lastIndexOf(',')
        if (commaIdx > 0) {
          street = addr.substring(0, commaIdx).trim()
          const cityPart = addr.substring(commaIdx + 1).trim()
          const postalMatch = cityPart.match(/^(\d{2}-\d{3})\s+(.+)$/)
          if (postalMatch) {
            postalCode = postalMatch[1]
            city = postalMatch[2]
          } else {
            city = cityPart
          }
        } else {
          street = addr
        }
      }

      const supplier = await supplierService.create({
        nip: parsed.data.nip,
        name: subject.name || parsed.data.nip,
        regon: subject.regon || undefined,
        krs: subject.krs || undefined,
        street,
        city,
        postalCode,
        country: 'PL',
        bankAccount: subject.accountNumbers?.[0] || undefined,
        vatStatus: subject.statusVat || undefined,
        vatStatusDate: new Date().toISOString(),
        source: 'VatApi',
        status: 'Active',
        hasSelfBillingAgreement: false,
        settingId: parsed.data.settingId,
      })

      return { status: 201, jsonBody: { supplier } }
    } catch (error) {
      context.error('Failed to create supplier from VAT:', error)
      return { status: 500, jsonBody: { error: 'Failed to create supplier from VAT API' } }
    }
  },
})

// POST /api/suppliers/:id/refresh-vat - Refresh VAT status
app.http('suppliers-refresh-vat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/refresh-vat',
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

      const supplier = await supplierService.getById(id)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }

      const vatApiUrl = `https://wl-api.mf.gov.pl/api/search/nip/${encodeURIComponent(supplier.nip)}?date=${new Date().toISOString().split('T')[0]}`
      const response = await fetch(vatApiUrl)

      if (!response.ok) {
        return { status: 502, jsonBody: { error: 'VAT API request failed', statusCode: response.status } }
      }

      const vatData = await response.json() as {
        result: {
          subject?: {
            name?: string
            regon?: string
            krs?: string
            residenceAddress?: string
            workingAddress?: string
            statusVat?: string
            accountNumbers?: string[]
          }
        }
      }

      const subject = vatData.result?.subject
      if (!subject) {
        return { status: 404, jsonBody: { error: `No entity found for NIP ${supplier.nip}` } }
      }

      // Parse address from workingAddress or residenceAddress (format: "UL. X NR Y, KOD MIASTO")
      let street: string | undefined
      let city: string | undefined
      let postalCode: string | undefined
      const addr = subject.workingAddress || subject.residenceAddress
      if (addr) {
        const commaIdx = addr.lastIndexOf(',')
        if (commaIdx > 0) {
          street = addr.substring(0, commaIdx).trim()
          const cityPart = addr.substring(commaIdx + 1).trim()
          const postalMatch = cityPart.match(/^(\d{2}-\d{3})\s+(.+)$/)
          if (postalMatch) {
            postalCode = postalMatch[1]
            city = postalMatch[2]
          } else {
            city = cityPart
          }
        } else {
          street = addr
        }
      }

      const updated = await supplierService.update(id, {
        name: subject.name || supplier.name,
        regon: subject.regon || supplier.regon || undefined,
        krs: subject.krs || supplier.krs || undefined,
        street: street || supplier.street || undefined,
        city: city || supplier.city || undefined,
        postalCode: postalCode || supplier.postalCode || undefined,
        country: supplier.country || 'PL',
        vatStatus: subject.statusVat || undefined,
        vatStatusDate: new Date().toISOString(),
        bankAccount: subject.accountNumbers?.[0] || supplier.bankAccount || undefined,
      })

      return { status: 200, jsonBody: { supplier: updated, vatStatus: subject.statusVat } }
    } catch (error) {
      context.error('Failed to refresh VAT status:', error)
      return { status: 500, jsonBody: { error: 'Failed to refresh VAT status' } }
    }
  },
})

/**
 * POST /api/suppliers/extract-from-invoices - Create suppliers from existing invoices (Admin)
 *
 * Scans all invoices for the given setting, extracts unique supplier NIPs,
 * and creates Supplier records for any that don't already exist.
 */
app.http('suppliers-extract-from-invoices', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/extract-from-invoices',
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

      const body = await request.json() as { settingId?: string }
      const settingId = body?.settingId
      if (!settingId) {
        return { status: 400, jsonBody: { error: 'settingId is required in request body' } }
      }

      // Validate settingId exists
      const setting = await settingService.getById(settingId)
      if (!setting) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      // Fetch all invoices for this setting (by settingId, not NIP — settings may share a NIP)
      type RawInvoice = Record<string, string | number | null>
      const invoiceEntity = DV.invoice.entitySet
      const filter = `_dvlp_settingid_value eq ${settingId} and statecode eq 0`
      const select = [
        DV.invoice.sellerNip,
        DV.invoice.sellerName,
        DV.invoice.sellerAddress,
        DV.invoice.sellerCountry,
        DV.invoice.invoiceDate,
      ].join(',')
      const query = `$filter=${filter}&$select=${select}&$orderby=${DV.invoice.invoiceDate} desc`
      const invoices = await dataverseClient.listAll<RawInvoice>(invoiceEntity, query)

      if (invoices.length === 0) {
        return { status: 200, jsonBody: { created: 0, skipped: 0, errors: 0, suppliers: [], message: 'No invoices found for this setting' } }
      }

      // Group invoices by supplier NIP — pick the first (most recent due to orderby desc)
      const nipMap = new Map<string, RawInvoice>()
      for (const inv of invoices) {
        const nip = inv[DV.invoice.sellerNip] as string | null
        if (!nip) continue
        if (!nipMap.has(nip)) {
          nipMap.set(nip, inv)
        }
      }

      let created = 0
      let skipped = 0
      let errors = 0
      const results: Supplier[] = []
      const errorDetails: Array<{ nip: string; error: string }> = []

      for (const [nip, inv] of nipMap) {
        try {
          // Check if supplier already exists
          const existingSupplier = await supplierService.getByNip(nip, settingId)
          if (existingSupplier) {
            skipped++
            results.push(existingSupplier)
            continue
          }

          const name = (inv[DV.invoice.sellerName] as string) || nip
          const address = inv[DV.invoice.sellerAddress] as string | undefined
          const country = (inv[DV.invoice.sellerCountry] as string) || 'PL'

          // Create new supplier with data extracted from the invoice
          const supplier = await supplierService.create({
            nip,
            name,
            settingId,
            street: address || undefined,
            country,
            status: 'Active',
            source: 'KSeF',
            hasSelfBillingAgreement: false,
          })
          created++
          results.push(supplier)
        } catch (err) {
          errors++
          errorDetails.push({ nip, error: err instanceof Error ? err.message : String(err) })
          context.warn(`Failed to create supplier for NIP ${nip}:`, err)
        }
      }

      return {
        status: 200,
        jsonBody: {
          created,
          skipped,
          errors,
          total: nipMap.size,
          suppliers: results,
          ...(errorDetails.length > 0 && { errorDetails }),
        },
      }
    } catch (error) {
      context.error('Failed to extract suppliers from invoices:', error)
      return { status: 500, jsonBody: { error: 'Failed to extract suppliers from invoices' } }
    }
  },
})
