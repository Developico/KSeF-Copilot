/**
 * Supplier Import Endpoints
 *
 * Handles CSV and Excel import for bulk supplier creation with VAT enrichment.
 *
 * Endpoints:
 * - POST   /api/suppliers/import          - Parse & validate CSV/Excel, enrich with VAT
 * - POST   /api/suppliers/import/confirm   - Confirm & create suppliers (+ SB agreements)
 * - GET    /api/suppliers/import/template   - Download CSV/Excel template
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { parseCsv, parseExcel, generateCsvTemplate, generateExcelTemplate } from '../lib/import/supplier-import-parser'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../lib/dataverse/services/sb-agreement-service'
import { lookupByNip } from '../lib/vat/client'
import { z } from 'zod'

// ── Enriched row returned to the client for preview ──

interface SupplierImportEnrichedRow {
  nip: string
  sbAgreement: boolean
  // VAT enrichment
  name: string | null
  regon: string | null
  krs: string | null
  street: string | null
  city: string | null
  postalCode: string | null
  vatStatus: string | null
  bankAccount: string | null
  // Status
  exists: boolean
  existingId: string | null
  valid: boolean
  error?: string
}

/**
 * Parse a Polish address from the VAT API format: "STREET, XX-XXX CITY"
 */
function parseAddress(addr: string | undefined | null): { street?: string; city?: string; postalCode?: string } {
  if (!addr) return {}
  const commaIdx = addr.lastIndexOf(',')
  if (commaIdx > 0) {
    const street = addr.substring(0, commaIdx).trim()
    const cityPart = addr.substring(commaIdx + 1).trim()
    const postalMatch = cityPart.match(/^(\d{2}-\d{3})\s+(.+)$/)
    if (postalMatch) {
      return { street, postalCode: postalMatch[1], city: postalMatch[2] }
    }
    return { street, city: cityPart }
  }
  return { street: addr }
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/suppliers/import — Parse file + enrich with VAT lookups
// ═══════════════════════════════════════════════════════════════════

app.http('supplier-import', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/import',
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

      // Detect format from Content-Type
      const contentType = request.headers.get('content-type') || ''
      let result

      if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream') || contentType.includes('xlsx')) {
        const arrayBuffer = await request.arrayBuffer()
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          return { status: 400, jsonBody: { error: 'Request body must contain an Excel file' } }
        }
        result = await parseExcel(Buffer.from(arrayBuffer))
      } else {
        const csvText = await request.text()
        if (!csvText || csvText.length === 0) {
          return { status: 400, jsonBody: { error: 'Request body must contain CSV text' } }
        }
        result = parseCsv(csvText)
      }

      // If parser returned only errors (e.g. too many rows, missing columns)
      if (result.rows.length === 0 && result.errors.length > 0) {
        return {
          status: 200,
          jsonBody: {
            rows: [],
            parseErrors: result.errors,
            totalRows: result.totalRows,
            validRows: 0,
            invalidRows: result.errors.length,
          },
        }
      }

      // De-duplicate NIPs within the file
      const seen = new Set<string>()
      const uniqueRows = result.rows.filter(r => {
        if (seen.has(r.nip)) return false
        seen.add(r.nip)
        return true
      })

      // Enrich each row: check duplicate + VAT lookup
      const enrichedRows: SupplierImportEnrichedRow[] = []

      for (const row of uniqueRows) {
        // Check if supplier already exists
        const existing = await supplierService.getByNip(row.nip, settingId)
        if (existing) {
          enrichedRows.push({
            nip: row.nip,
            sbAgreement: row.sbAgreement,
            name: existing.name,
            regon: existing.regon ?? null,
            krs: existing.krs ?? null,
            street: existing.street ?? null,
            city: existing.city ?? null,
            postalCode: existing.postalCode ?? null,
            vatStatus: existing.vatStatus ?? null,
            bankAccount: existing.bankAccount ?? null,
            exists: true,
            existingId: existing.id,
            valid: false,
            error: `Supplier with NIP ${row.nip} already exists`,
          })
          continue
        }

        // VAT lookup
        try {
          const subject = await lookupByNip(row.nip)
          if (!subject) {
            enrichedRows.push({
              nip: row.nip,
              sbAgreement: row.sbAgreement,
              name: null, regon: null, krs: null,
              street: null, city: null, postalCode: null,
              vatStatus: null, bankAccount: null,
              exists: false, existingId: null,
              valid: false,
              error: `No entity found in VAT registry for NIP ${row.nip}`,
            })
            continue
          }

          const addr = parseAddress(subject.workingAddress || subject.residenceAddress)

          enrichedRows.push({
            nip: row.nip,
            sbAgreement: row.sbAgreement,
            name: subject.name ?? null,
            regon: subject.regon ?? null,
            krs: subject.krs ?? null,
            street: addr.street ?? null,
            city: addr.city ?? null,
            postalCode: addr.postalCode ?? null,
            vatStatus: subject.statusVat ?? null,
            bankAccount: subject.accountNumbers?.[0] ?? null,
            exists: false,
            existingId: null,
            valid: true,
          })
        } catch (error) {
          context.warn(`VAT lookup failed for NIP ${row.nip}:`, error)
          enrichedRows.push({
            nip: row.nip,
            sbAgreement: row.sbAgreement,
            name: null, regon: null, krs: null,
            street: null, city: null, postalCode: null,
            vatStatus: null, bankAccount: null,
            exists: false, existingId: null,
            valid: false,
            error: `VAT API lookup failed for NIP ${row.nip}`,
          })
        }
      }

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
      context.error('Failed to parse supplier import:', error)
      return { status: 500, jsonBody: { error: 'Failed to parse supplier import file' } }
    }
  },
})

// ═══════════════════════════════════════════════════════════════════
// POST /api/suppliers/import/confirm — Create suppliers + SB agreements
// ═══════════════════════════════════════════════════════════════════

app.http('supplier-import-confirm', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/import/confirm',
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
          nip: z.string().regex(/^\d{10}$/),
          sbAgreement: z.boolean(),
          name: z.string().nullable(),
          regon: z.string().nullable().optional(),
          krs: z.string().nullable().optional(),
          street: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
          postalCode: z.string().nullable().optional(),
          vatStatus: z.string().nullable().optional(),
          bankAccount: z.string().nullable().optional(),
        })),
      })

      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const today = new Date().toISOString().split('T')[0]
      const validToDate = new Date()
      validToDate.setFullYear(validToDate.getFullYear() + 1)
      const validTo = validToDate.toISOString().split('T')[0]

      const results: Array<{ nip: string; supplierId?: string; agreementId?: string; error?: string }> = []

      for (const row of parsed.data.rows) {
        try {
          // Double-check supplier doesn't already exist
          const existing = await supplierService.getByNip(row.nip, parsed.data.settingId)
          if (existing) {
            results.push({ nip: row.nip, error: `Supplier with NIP ${row.nip} already exists` })
            continue
          }

          const supplier = await supplierService.create({
            nip: row.nip,
            name: row.name || row.nip,
            regon: row.regon || undefined,
            krs: row.krs || undefined,
            street: row.street || undefined,
            city: row.city || undefined,
            postalCode: row.postalCode || undefined,
            country: 'PL',
            bankAccount: row.bankAccount || undefined,
            vatStatus: row.vatStatus || undefined,
            vatStatusDate: new Date().toISOString(),
            source: 'VatApi',
            status: 'Active',
            hasSelfBillingAgreement: row.sbAgreement,
            selfBillingAgreementDate: row.sbAgreement ? today : undefined,
            selfBillingAgreementExpiry: row.sbAgreement ? validTo : undefined,
            settingId: parsed.data.settingId,
          })

          let agreementId: string | undefined

          if (row.sbAgreement) {
            try {
              const agreement = await sbAgreementService.create({
                supplierId: supplier.id,
                name: `SB-${(row.name || row.nip).substring(0, 200)}`,
                agreementDate: today,
                validFrom: today,
                validTo,
                settingId: parsed.data.settingId,
              })
              agreementId = agreement.id
            } catch (err) {
              context.warn(`Failed to create SB agreement for supplier ${supplier.id}:`, err)
            }
          }

          results.push({ nip: row.nip, supplierId: supplier.id, agreementId })
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ nip: row.nip, error: errMsg })
        }
      }

      return {
        status: 200,
        jsonBody: {
          created: results.filter(r => r.supplierId).length,
          failed: results.filter(r => r.error).length,
          results,
        },
      }
    } catch (error) {
      context.error('Failed to confirm supplier import:', error)
      return { status: 500, jsonBody: { error: 'Failed to confirm supplier import' } }
    }
  },
})

// ═══════════════════════════════════════════════════════════════════
// GET /api/suppliers/import/template — Download CSV or Excel template
// ═══════════════════════════════════════════════════════════════════

app.http('supplier-import-template', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers/import/template',
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
            'Content-Disposition': 'attachment; filename="supplier-import-template.xlsx"',
          },
          body: buffer,
        }
      }

      const csv = generateCsvTemplate()
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="supplier-import-template.csv"',
        },
        body: csv,
      }
    } catch (error) {
      context.error('Failed to generate supplier import template:', error)
      return { status: 500, jsonBody: { error: 'Failed to generate template' } }
    }
  },
})
