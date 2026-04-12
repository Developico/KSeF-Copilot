/**
 * Cost Document Import Endpoints
 *
 * Handles CSV and Excel import for bulk cost document creation.
 *
 * Endpoints:
 * - POST   /api/cost-documents/import           - Parse & validate CSV/Excel
 * - POST   /api/cost-documents/import/confirm    - Confirm & create cost documents
 * - GET    /api/cost-documents/import/template    - Download CSV/Excel template
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import {
  parseCsv,
  parseExcel,
  generateCsvTemplate,
  generateExcelTemplate,
} from '../lib/import/cost-document-import-parser'
import type { CostDocumentImportRow } from '../lib/import/cost-document-import-parser'
import { costDocumentService } from '../lib/dataverse/services/cost-document-service'
import type { CostDocumentCreate } from '../types/cost-document'
import { z } from 'zod'

/**
 * POST /api/cost-documents/import - Parse and validate CSV/Excel
 */
app.http('cost-documents-import', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/import',
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

      // Validate rows with basic enrichment
      const enrichedRows = result.rows.map((row) => ({
        ...row,
        valid: true,
        error: undefined as string | undefined,
      }))

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
      context.error('Failed to parse cost document import:', error)
      return { status: 500, jsonBody: { error: 'Failed to parse import file' } }
    }
  },
})

/**
 * POST /api/cost-documents/import/confirm - Create cost documents from validated import
 */
app.http('cost-documents-import-confirm', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/import/confirm',
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
          documentType: z.string(),
          documentNumber: z.string(),
          issueDate: z.string(),
          dueDate: z.string().optional(),
          issuerName: z.string(),
          issuerNip: z.string().optional(),
          grossAmount: z.number(),
          netAmount: z.number().optional(),
          vatAmount: z.number().optional(),
          currency: z.string().default('PLN'),
          category: z.string().optional(),
          description: z.string().optional(),
          mpk: z.string().optional(),
          paymentMethod: z.string().optional(),
        })),
      })

      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const results: Array<{ documentNumber: string; id?: string; error?: string }> = []

      for (const row of parsed.data.rows) {
        try {
          const created = await costDocumentService.create({
            documentType: row.documentType as CostDocumentCreate['documentType'],
            documentNumber: row.documentNumber,
            documentDate: row.issueDate,
            dueDate: row.dueDate,
            issuerName: row.issuerName,
            issuerNip: row.issuerNip,
            grossAmount: row.grossAmount,
            netAmount: row.netAmount,
            vatAmount: row.vatAmount,
            currency: (row.currency || 'PLN') as CostDocumentCreate['currency'],
            category: row.category,
            description: row.description,
            mpk: row.mpk,
            settingId: parsed.data.settingId,
          })

          results.push({ documentNumber: row.documentNumber, id: created.id })
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ documentNumber: row.documentNumber, error: msg })
        }
      }

      return {
        status: 200,
        jsonBody: {
          created: results.filter(r => r.id).length,
          failed: results.filter(r => r.error).length,
          results,
        },
      }
    } catch (error) {
      context.error('Failed to confirm cost document import:', error)
      return { status: 500, jsonBody: { error: 'Failed to create cost documents' } }
    }
  },
})

/**
 * GET /api/cost-documents/import/template - Download import template
 */
app.http('cost-documents-import-template', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cost-documents/import/template',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: roleCheck.error } }
      }

      const url = new URL(request.url)
      const format = url.searchParams.get('format') || 'csv'

      if (format === 'xlsx') {
        const buffer = await generateExcelTemplate()
        return {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="cost-documents-template.xlsx"',
          },
          body: buffer,
        }
      }

      // Default CSV
      const csv = generateCsvTemplate()
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="cost-documents-template.csv"',
        },
        body: csv,
      }
    } catch (error) {
      context.error('Failed to generate template:', error)
      return { status: 500, jsonBody: { error: 'Failed to generate template' } }
    }
  },
})
