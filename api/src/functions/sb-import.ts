/**
 * Self-Billing Import Endpoints
 *
 * Handles CSV and Excel import for bulk self-billing invoice creation.
 *
 * Endpoints:
 * - POST   /api/invoices/self-billing/import          - Parse & validate CSV/Excel
 * - POST   /api/invoices/self-billing/import/confirm   - Confirm & create invoices
 * - GET    /api/invoices/self-billing/import/template   - Download CSV/Excel template
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { parseCsv, parseExcelImport, generateCsvTemplate, generateExcelTemplate } from '../lib/import/sb-import-parser'
import type { SbImportRow } from '../lib/import/sb-import-parser'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../lib/dataverse/services/sb-agreement-service'
import { sbInvoiceService } from '../lib/dataverse/services/sb-invoice-service'
import { z } from 'zod'

/**
 * POST /api/invoices/self-billing/import - Parse and validate CSV
 */
app.http('self-billing-import', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/import',
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

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId')
      if (!settingId) {
        return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
      }

      // Detect format: CSV (text) or Excel (binary)
      const contentType = request.headers.get('content-type') || ''
      let result

      if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream') || contentType.includes('xlsx')) {
        // Excel format
        const arrayBuffer = await request.arrayBuffer()
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          return { status: 400, jsonBody: { error: 'Request body must contain an Excel file' } }
        }
        result = await parseExcelImport(Buffer.from(arrayBuffer))
      } else {
        // Default to CSV
        const csvText = await request.text()
        if (!csvText || csvText.length === 0) {
          return { status: 400, jsonBody: { error: 'Request body must contain CSV text' } }
        }
        result = parseCsv(csvText)
      }

      // Enrich with supplier validation
      const supplierNips = [...new Set(result.rows.map(r => r.supplierNip))]
      const supplierMap = new Map<string, { id: string; name: string; hasAgreement: boolean }>()

      for (const nip of supplierNips) {
        const supplier = await supplierService.getByNip(nip, settingId)
        if (supplier) {
          const agreement = await sbAgreementService.getActiveForSupplier(supplier.id, settingId)
          supplierMap.set(nip, {
            id: supplier.id,
            name: supplier.name,
            hasAgreement: !!agreement,
          })
        }
      }

      // Add supplier validation errors
      const enrichedRows = result.rows.map((row, idx) => {
        const supplier = supplierMap.get(row.supplierNip)
        const net = row.quantity * row.unitPrice
        const vatAmount = row.vatRate >= 0 ? net * row.vatRate / 100 : 0
        return {
          ...row,
          supplierName: supplier?.name || null,
          supplierId: supplier?.id || null,
          hasAgreement: supplier?.hasAgreement || false,
          netAmount: net,
          vatAmount,
          grossAmount: net + vatAmount,
          valid: !!supplier && supplier.hasAgreement,
          error: !supplier
            ? `Supplier with NIP ${row.supplierNip} not found`
            : !supplier.hasAgreement
              ? `Supplier ${supplier.name} has no active SB agreement`
              : undefined,
        }
      })

      return {
        status: 200,
        jsonBody: {
          rows: enrichedRows,
          parseErrors: result.errors,
          totalRows: result.totalRows,
          validRows: enrichedRows.filter(r => r.valid).length,
          invalidRows: enrichedRows.filter(r => !r.valid).length + result.errors.length,
        },
      }
    } catch (error) {
      context.error('Failed to parse import CSV:', error)
      return { status: 500, jsonBody: { error: 'Failed to parse import file' } }
    }
  },
})

/**
 * POST /api/invoices/self-billing/import/confirm - Create invoices from validated import
 */
app.http('self-billing-import-confirm', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/import/confirm',
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
        settingId: z.string().uuid(),
        rows: z.array(z.object({
          supplierNip: z.string(),
          supplierId: z.string().uuid(),
          itemDescription: z.string(),
          quantity: z.number(),
          unit: z.string(),
          unitPrice: z.number(),
          vatRate: z.number(),
          invoiceDate: z.string(),
          dueDate: z.string().optional(),
          netAmount: z.number(),
          vatAmount: z.number(),
          grossAmount: z.number(),
        })),
      })

      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ supplierNip: string; invoiceId?: string; error?: string }> = []

      for (const row of parsed.data.rows) {
        try {
          const supplier = await supplierService.getById(row.supplierId)
          if (!supplier) {
            results.push({ supplierNip: row.supplierNip, error: 'Supplier not found' })
            continue
          }

          const agreement = await sbAgreementService.getActiveForSupplier(row.supplierId, parsed.data.settingId)

          const now = new Date()
          const invoiceNumber = `SF/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(results.length + 1).padStart(3, '0')}`

          const sbInvoice = await sbInvoiceService.createWithItems(
            {
              settingId: parsed.data.settingId,
              supplierId: row.supplierId,
              agreementId: agreement?.id,
              invoiceNumber: invoiceNumber,
              invoiceDate: row.invoiceDate,
              dueDate: row.dueDate,
              netAmount: row.netAmount,
              vatAmount: row.vatAmount,
              grossAmount: row.grossAmount,
              currency: 'PLN',
            },
            [
              {
                itemDescription: row.itemDescription,
                quantity: row.quantity,
                unit: row.unit,
                unitPrice: row.unitPrice,
                vatRate: row.vatRate,
                netAmount: row.netAmount,
                vatAmount: row.vatAmount,
                grossAmount: row.grossAmount,
                sortOrder: 0,
              },
            ],
          )

          results.push({ supplierNip: row.supplierNip, invoiceId: sbInvoice.id })
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ supplierNip: row.supplierNip, error: errMsg })
        }
      }

      return {
        status: 200,
        jsonBody: {
          created: results.filter(r => r.invoiceId).length,
          failed: results.filter(r => r.error).length,
          results,
        },
      }
    } catch (error) {
      context.error('Failed to confirm import:', error)
      return { status: 500, jsonBody: { error: 'Failed to confirm import' } }
    }
  },
})

/**
 * GET /api/invoices/self-billing/import/template - Download CSV or Excel template
 */
app.http('self-billing-import-template', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/import/template',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const url = new URL(request.url)
      const format = url.searchParams.get('format') || 'csv'

      if (format === 'xlsx') {
        const buffer = await generateExcelTemplate()
        return {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="self-billing-import-template.xlsx"',
          },
          body: buffer,
        }
      }

      const csv = generateCsvTemplate()
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="self-billing-import-template.csv"',
        },
        body: csv,
      }
    } catch (error) {
      context.error('Failed to generate import template:', error)
      return { status: 500, jsonBody: { error: 'Failed to generate template' } }
    }
  },
})
