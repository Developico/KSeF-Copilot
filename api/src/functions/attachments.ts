import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { 
  uploadAttachment, 
  listAttachments, 
  getAttachmentContent, 
  deleteAttachment,
  validateAttachment,
  ATTACHMENT_CONFIG,
} from '../lib/dataverse/attachments'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

/**
 * Attachment upload schema
 */
const AttachmentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  content: z.string().min(1), // base64 encoded
  description: z.string().max(500).optional(),
})

/**
 * POST /api/invoices/:id/attachments - Upload attachment
 */
export async function uploadAttachmentHandler(
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

    const body = await request.json()
    const parseResult = AttachmentUploadSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const { fileName, mimeType, content, description } = parseResult.data

    // Pre-validate before upload
    const sizeBytes = Buffer.from(content, 'base64').length
    const validation = validateAttachment(fileName, mimeType, sizeBytes)
    if (!validation.valid) {
      return { status: 400, jsonBody: { error: validation.error } }
    }

    context.log(`Uploading attachment: ${fileName} (${(sizeBytes / 1024).toFixed(1)} KB)`)

    const attachment = await uploadAttachment({
      invoiceId,
      fileName,
      mimeType,
      content,
      description,
    })

    context.log(`Attachment uploaded: ${attachment.id}`)

    return {
      status: 201,
      jsonBody: attachment,
    }
  } catch (error) {
    context.error('Failed to upload attachment:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to upload attachment' },
    }
  }
}

/**
 * GET /api/invoices/:id/attachments - List attachments
 */
export async function listAttachmentsHandler(
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

    const attachments = await listAttachments(invoiceId)

    return {
      status: 200,
      jsonBody: { attachments, count: attachments.length },
    }
  } catch (error) {
    context.error('Failed to list attachments:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to list attachments' },
    }
  }
}

/**
 * GET /api/attachments/:id/download - Download attachment content
 */
export async function downloadAttachmentHandler(
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

    const attachmentId = request.params.id
    if (!attachmentId) {
      return { status: 400, jsonBody: { error: 'Attachment ID required' } }
    }

    const content = await getAttachmentContent(attachmentId)

    return {
      status: 200,
      jsonBody: { content },
    }
  } catch (error) {
    context.error('Failed to download attachment:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to download attachment' },
    }
  }
}

/**
 * DELETE /api/attachments/:id - Delete attachment
 */
export async function deleteAttachmentHandler(
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

    const attachmentId = request.params.id
    if (!attachmentId) {
      return { status: 400, jsonBody: { error: 'Attachment ID required' } }
    }

    await deleteAttachment(attachmentId)

    return { status: 204 }
  } catch (error) {
    context.error('Failed to delete attachment:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to delete attachment' },
    }
  }
}

/**
 * GET /api/attachments/config - Get attachment configuration
 */
export async function getAttachmentConfigHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: {
      maxSizeBytes: ATTACHMENT_CONFIG.maxSizeBytes,
      maxSizeMB: ATTACHMENT_CONFIG.maxSizeBytes / 1024 / 1024,
      allowedMimeTypes: ATTACHMENT_CONFIG.allowedMimeTypes,
    },
  }
}

// Register routes
app.http('attachments-upload', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/attachments',
  handler: uploadAttachmentHandler,
})

app.http('attachments-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/attachments',
  handler: listAttachmentsHandler,
})

app.http('attachments-download', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'attachments/{id}/download',
  handler: downloadAttachmentHandler,
})

app.http('attachments-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'attachments/{id}',
  handler: deleteAttachmentHandler,
})

app.http('attachments-config', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'attachments/config',
  handler: getAttachmentConfigHandler,
})
