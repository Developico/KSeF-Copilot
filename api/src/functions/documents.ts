/**
 * Document Extraction API Endpoints
 * 
 * Handles document data extraction (OCR/Vision).
 * 
 * Endpoints:
 * - POST /api/documents/extract - Extract data from document (PDF/image)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { extractDocument, DocumentExtractRequestSchema } from '../lib/document'

/**
 * POST /api/documents/extract - Extract invoice data from document
 * 
 * Body: { fileName, mimeType, content (base64) }
 * Returns: ExtractionResult with structured invoice data
 */
export async function extractDocumentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Auth check
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin required for document extraction (uses AI credits)
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden - Admin role required' } }
    }

    // Parse request body
    const body = await request.json()
    const parseResult = DocumentExtractRequestSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Invalid request body', 
          details: parseResult.error.flatten() 
        },
      }
    }

    const { fileName, mimeType, content } = parseResult.data

    // Check content size (max 10 MB base64 = ~7.5 MB file)
    const estimatedSize = (content.length * 3) / 4
    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (estimatedSize > maxSize) {
      return {
        status: 400,
        jsonBody: { error: `Plik zbyt duży. Maksymalny rozmiar: 10 MB` },
      }
    }

    context.log(`[Extract] Starting extraction for: ${fileName} (${mimeType})`)

    // Extract document
    const result = await extractDocument({
      fileName,
      mimeType,
      content,
    })

    if (!result.success) {
      context.warn(`[Extract] Extraction failed for ${fileName}: ${result.error}`)
      return {
        status: 422,
        jsonBody: {
          success: false,
          error: result.error,
          extractedAt: result.extractedAt,
        },
      }
    }

    context.log(`[Extract] Extraction successful for ${fileName}:`, {
      invoiceNumber: result.data?.invoiceNumber,
      supplier: result.data?.supplierName,
      confidence: result.confidence,
      processingTimeMs: result.processingTimeMs,
    })

    return {
      status: 200,
      jsonBody: result,
    }
  } catch (error) {
    context.error('[Extract] Unexpected error:', error)
    return {
      status: 500,
      jsonBody: { 
        error: 'Document extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

// Register Azure Function
app.http('documents-extract', {
  route: 'documents/extract',
  methods: ['POST'],
  authLevel: 'anonymous', // Auth handled in code
  handler: extractDocumentHandler,
})
