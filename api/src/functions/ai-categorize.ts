/**
 * AI Categorization API Endpoints
 * 
 * Handles AI-powered invoice categorization.
 * 
 * Endpoints:
 * - POST /api/ai/categorize - Categorize single invoice
 * - POST /api/ai/batch-categorize - Categorize multiple invoices
 * - GET /api/ai/test - Test AI connection
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { categorizeInvoice, categorizeInvoicesBatch, testConnection } from '../lib/openai'
import { invoiceService } from '../lib/dataverse'
import { z } from 'zod'
import { MPK } from '../types/invoice'

// Validation schemas
const CategorizeRequestSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID required'),
  // Optional: override invoice data
  supplierName: z.string().optional(),
  supplierNip: z.string().optional(),
  items: z.array(z.string()).optional(),
  grossAmount: z.number().optional(),
})

const BatchCategorizeRequestSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(50),
})

/**
 * POST /api/ai/categorize - Categorize single invoice
 */
export async function categorizeHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Auth check
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin required for AI categorization
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden - Admin role required' } }
    }

    // Parse and validate request
    const body = await request.json()
    const parseResult = CategorizeRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request', details: parseResult.error.flatten() },
      }
    }

    const { invoiceId, supplierName, supplierNip, items, grossAmount } = parseResult.data

    // Fetch invoice from Dataverse
    const invoice = await invoiceService.getById(invoiceId)
    if (!invoice) {
      return { status: 404, jsonBody: { error: 'Invoice not found' } }
    }

    // Build categorization request
    const categorizationRequest = {
      invoiceId,
      supplierName: supplierName || invoice.supplierName,
      supplierNip: supplierNip || invoice.supplierNip,
      items: items,
      grossAmount: grossAmount || invoice.grossAmount,
    }

    // Categorize with AI
    const categorization = await categorizeInvoice(categorizationRequest)

    // Save AI results to Dataverse
    await invoiceService.update(invoiceId, {
      aiMpkSuggestion: categorization.mpk as MPK,
      aiCategorySuggestion: categorization.category,
      aiDescription: categorization.description,
      aiConfidence: categorization.confidence,
      aiProcessedAt: new Date().toISOString(),
    })

    context.log(`[AI] Categorized invoice ${invoiceId}: MPK=${categorization.mpk}, confidence=${categorization.confidence}`)

    return {
      status: 200,
      jsonBody: {
        invoiceId,
        categorization,
        message: 'Invoice categorized successfully',
      },
    }
  } catch (error) {
    context.error('[AI] Categorization error:', error)
    return {
      status: 500,
      jsonBody: { error: 'Categorization failed', message: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

/**
 * POST /api/ai/batch-categorize - Categorize multiple invoices
 */
export async function batchCategorizeHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Auth check
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin required
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden - Admin role required' } }
    }

    // Parse and validate request
    const body = await request.json()
    const parseResult = BatchCategorizeRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request', details: parseResult.error.flatten() },
      }
    }

    const { invoiceIds } = parseResult.data

    // Fetch all invoices
    const invoices = await Promise.all(
      invoiceIds.map(id => invoiceService.getById(id))
    )

    // Build categorization requests (skip missing invoices)
    const requests = invoices
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null)
      .map(inv => ({
        invoiceId: inv.id,
        supplierName: inv.supplierName,
        supplierNip: inv.supplierNip,
        grossAmount: inv.grossAmount,
      }))

    if (requests.length === 0) {
      return { status: 404, jsonBody: { error: 'No valid invoices found' } }
    }

    // Categorize all invoices
    const results = await categorizeInvoicesBatch(requests, (completed, total) => {
      context.log(`[AI] Batch progress: ${completed}/${total}`)
    })

    // Update invoices with results
    const updatePromises: Promise<unknown>[] = []
    const summary = { success: 0, failed: 0, errors: [] as string[] }

    for (const [invoiceId, result] of results) {
      if (result instanceof Error) {
        summary.failed++
        summary.errors.push(`${invoiceId}: ${result.message}`)
      } else {
        summary.success++
        // Save AI results to Dataverse
        updatePromises.push(
          invoiceService.update(invoiceId, {
            aiMpkSuggestion: result.mpk as MPK,
            aiCategorySuggestion: result.category,
            aiDescription: result.description,
            aiConfidence: result.confidence,
            aiProcessedAt: new Date().toISOString(),
          }).catch(err => {
            context.warn(`[AI] Failed to update invoice ${invoiceId}:`, err)
          })
        )
      }
    }

    await Promise.all(updatePromises)

    context.log(`[AI] Batch categorization complete: ${summary.success} success, ${summary.failed} failed`)

    return {
      status: 200,
      jsonBody: {
        processed: requests.length,
        success: summary.success,
        failed: summary.failed,
        errors: summary.errors.length > 0 ? summary.errors : undefined,
      },
    }
  } catch (error) {
    context.error('[AI] Batch categorization error:', error)
    return {
      status: 500,
      jsonBody: { error: 'Batch categorization failed', message: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

/**
 * GET /api/ai/test - Test AI connection
 */
export async function testAiHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Auth check (any authenticated user can test)
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const result = await testConnection()

    return {
      status: result.success ? 200 : 503,
      jsonBody: result,
    }
  } catch (error) {
    context.error('[AI] Test error:', error)
    return {
      status: 500,
      jsonBody: { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

// Register Azure Function routes
app.http('ai-categorize', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ai/categorize',
  handler: categorizeHandler,
})

app.http('ai-batch-categorize', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ai/batch-categorize',
  handler: batchCategorizeHandler,
})

app.http('ai-test', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ai/test',
  handler: testAiHandler,
})
