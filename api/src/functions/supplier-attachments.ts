/**
 * Supplier Attachments API
 *
 * Routes:
 *   POST   /api/suppliers/:id/attachments  — Upload attachment
 *   GET    /api/suppliers/:id/attachments  — List attachments
 *
 * Download & delete reuse the shared /api/attachments/:id routes.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import {
  uploadSupplierAttachment,
  listSupplierAttachments,
} from '../lib/dataverse/supplier-attachments'
import { validateAttachment } from '../lib/dataverse/attachments'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

const AttachmentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  content: z.string().min(1),
  description: z.string().max(500).optional(),
})

async function uploadHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(auth.user, 'Admin')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const supplierId = request.params.id
    if (!supplierId) return { status: 400, jsonBody: { error: 'Supplier ID required' } }

    const body = await request.json()
    const parsed = AttachmentUploadSchema.safeParse(body)
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parsed.error.flatten() } }
    }

    const { fileName, mimeType, content, description } = parsed.data
    const sizeBytes = Buffer.from(content, 'base64').length
    const validation = validateAttachment(fileName, mimeType, sizeBytes)
    if (!validation.valid) return { status: 400, jsonBody: { error: validation.error } }

    context.log(`Uploading supplier attachment: ${fileName} (${(sizeBytes / 1024).toFixed(1)} KB)`)
    const attachment = await uploadSupplierAttachment({ supplierId, fileName, mimeType, content, description })
    return { status: 201, jsonBody: attachment }
  } catch (error) {
    context.error('Failed to upload supplier attachment:', error)
    return { status: 500, jsonBody: { error: 'Failed to upload attachment' } }
  }
}

async function listHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const supplierId = request.params.id
    if (!supplierId) return { status: 400, jsonBody: { error: 'Supplier ID required' } }

    const attachments = await listSupplierAttachments(supplierId)
    return { status: 200, jsonBody: { attachments, count: attachments.length } }
  } catch (error) {
    context.error('Failed to list supplier attachments:', error)
    return { status: 500, jsonBody: { error: 'Failed to list attachments' } }
  }
}

app.http('supplier-attachments-upload', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/attachments',
  handler: uploadHandler,
})

app.http('supplier-attachments-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/attachments',
  handler: listHandler,
})
