import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import {
  uploadInvoiceDocument,
  downloadInvoiceDocument,
  deleteInvoiceDocument,
  validateDocument,
  DOCUMENT_CONFIG,
} from '../lib/dataverse/document'
import { saveThumbnail, getThumbnail, deleteThumbnail } from '../lib/dataverse/thumbnail'
import { getInvoiceById } from '../lib/dataverse/invoices'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

/**
 * Document upload schema (base64 encoded content)
 */
const DocumentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  content: z.string().min(1), // base64 encoded
  thumbnail: z.string().optional(), // optional base64 PNG thumbnail
})

/**
 * PUT /api/invoices/:id/document - Upload invoice document
 * 
 * Uploads a document (invoice scan/image) to the invoice's dvlp_doc field.
 * Replaces any existing document.
 */
export async function uploadDocumentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin role required for uploading documents
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const invoiceId = request.params.id
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    // Verify invoice exists
    const invoice = await getInvoiceById(invoiceId)
    if (!invoice) {
      return { status: 404, jsonBody: { error: 'Invoice not found' } }
    }

    const body = await request.json()
    const parseResult = DocumentUploadSchema.safeParse(body)

    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const { fileName, mimeType, content, thumbnail } = parseResult.data

    // Decode base64 to buffer
    const buffer = Buffer.from(content, 'base64')
    const sizeBytes = buffer.length

    // Pre-validate before upload
    const validation = validateDocument(fileName, mimeType, sizeBytes)
    if (!validation.valid) {
      return { status: 400, jsonBody: { error: validation.error } }
    }

    context.log(`Uploading document: ${fileName} (${(sizeBytes / 1024).toFixed(1)} KB) for invoice ${invoiceId}`)

    const documentInfo = await uploadInvoiceDocument(invoiceId, fileName, mimeType, buffer)

    // Save thumbnail if provided (typically for PDFs)
    if (thumbnail) {
      try {
        await saveThumbnail(invoiceId, thumbnail)
        context.log(`Thumbnail saved for invoice ${invoiceId}`)
      } catch (thumbError) {
        // Non-fatal: document was uploaded successfully
        context.warn('Failed to save thumbnail:', thumbError)
      }
    }

    context.log(`Document uploaded successfully: ${fileName}`)

    return {
      status: 200,
      jsonBody: {
        success: true,
        document: documentInfo,
      },
    }
  } catch (error) {
    context.error('Failed to upload document:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Failed to upload document' },
    }
  }
}

/**
 * GET /api/invoices/:id/document - Download invoice document
 * 
 * Returns the document as base64 encoded content with metadata.
 */
export async function downloadDocumentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Reader role is sufficient for downloading
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const invoiceId = request.params.id
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const document = await downloadInvoiceDocument(invoiceId)

    if (!document) {
      return { status: 404, jsonBody: { error: 'Document not found' } }
    }

    context.log(`Document downloaded: ${document.fileName} (${(document.fileSize / 1024).toFixed(1)} KB)`)

    return {
      status: 200,
      jsonBody: {
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        content: document.content.toString('base64'),
      },
    }
  } catch (error) {
    context.error('Failed to download document:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Failed to download document' },
    }
  }
}

/**
 * GET /api/invoices/:id/document/stream - Download invoice document as binary stream
 * 
 * Returns the raw binary document with proper Content-Type header.
 * Useful for direct viewing in browser.
 */
export async function streamDocumentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const invoiceId = request.params.id
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const document = await downloadInvoiceDocument(invoiceId)

    if (!document) {
      return { status: 404, jsonBody: { error: 'Document not found' } }
    }

    context.log(`Streaming document: ${document.fileName}`)

    return {
      status: 200,
      headers: {
        'Content-Type': document.mimeType,
        'Content-Length': document.fileSize.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.fileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
      body: document.content,
    }
  } catch (error) {
    context.error('Failed to stream document:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Failed to stream document' },
    }
  }
}

/**
 * DELETE /api/invoices/:id/document - Delete invoice document
 */
export async function deleteDocumentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Admin role required for deleting documents
    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const invoiceId = request.params.id
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    // Verify invoice exists
    const invoice = await getInvoiceById(invoiceId)
    if (!invoice) {
      return { status: 404, jsonBody: { error: 'Invoice not found' } }
    }

    await deleteInvoiceDocument(invoiceId)

    // Also delete associated thumbnail
    try {
      await deleteThumbnail(invoiceId)
    } catch {
      // Non-fatal
    }

    context.log(`Document deleted for invoice ${invoiceId}`)

    return {
      status: 200,
      jsonBody: { success: true },
    }
  } catch (error) {
    context.error('Failed to delete document:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Failed to delete document' },
    }
  }
}

/**
 * GET /api/documents/config - Get document upload configuration
 * 
 * Returns allowed file types and size limits for client-side validation.
 */
export async function getDocumentConfigHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: {
      maxSizeBytes: DOCUMENT_CONFIG.maxSizeBytes,
      maxSizeMB: DOCUMENT_CONFIG.maxSizeBytes / 1024 / 1024,
      allowedMimeTypes: DOCUMENT_CONFIG.allowedMimeTypes,
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
  }
}

/**
 * GET /api/invoices/:id/document/thumbnail - Get document thumbnail
 * 
 * Returns a lightweight PNG thumbnail of the document's first page.
 * Useful for previews without downloading the full (potentially large) document.
 */
export async function getThumbnailHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const invoiceId = request.params.id
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const thumbnail = await getThumbnail(invoiceId)

    if (!thumbnail) {
      return { status: 404, jsonBody: { error: 'Thumbnail not found' } }
    }

    return {
      status: 200,
      jsonBody: {
        content: thumbnail.content,
        mimeType: thumbnail.mimeType,
      },
    }
  } catch (error) {
    context.error('Failed to get thumbnail:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Failed to get thumbnail' },
    }
  }
}

/**
 * PUT /api/invoices/:id/document/thumbnail - Upload document thumbnail separately
 * 
 * Allows uploading a thumbnail independently (e.g. generated client-side after initial upload).
 */
export async function uploadThumbnailHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const invoiceId = request.params.id
    if (!invoiceId) {
      return { status: 400, jsonBody: { error: 'Invoice ID required' } }
    }

    const body = await request.json() as { content?: string; mimeType?: string }
    if (!body.content) {
      return { status: 400, jsonBody: { error: 'Thumbnail content required' } }
    }

    await saveThumbnail(invoiceId, body.content, body.mimeType || 'image/png')

    context.log(`Thumbnail uploaded for invoice ${invoiceId}`)

    return {
      status: 200,
      jsonBody: { success: true },
    }
  } catch (error) {
    context.error('Failed to upload thumbnail:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Failed to upload thumbnail' },
    }
  }
}

// Register routes
app.http('document-upload', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/document',
  handler: uploadDocumentHandler,
})

app.http('document-download', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/document',
  handler: downloadDocumentHandler,
})

app.http('document-stream', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/document/stream',
  handler: streamDocumentHandler,
})

app.http('document-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/document',
  handler: deleteDocumentHandler,
})

app.http('document-config', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'documents/config',
  handler: getDocumentConfigHandler,
})

app.http('document-thumbnail-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/document/thumbnail',
  handler: getThumbnailHandler,
})

app.http('document-thumbnail-upload', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/document/thumbnail',
  handler: uploadThumbnailHandler,
})
