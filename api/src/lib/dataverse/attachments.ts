/**
 * Attachment Service
 * 
 * Handles file uploads to Dataverse with image optimization.
 * Uses Dataverse annotation API for attachments.
 */

import { dataverseRequest } from './client'
import { InvoiceEntity } from './entities'

/**
 * Attachment configuration
 */
export const ATTACHMENT_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  maxImageSizeBytes: 2 * 1024 * 1024, // 2 MB after optimization
  imageQuality: 80, // JPEG quality for optimization
  maxImageDimension: 2048, // Max width/height for images
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
}

/**
 * Attachment metadata
 */
export interface AttachmentCreate {
  invoiceId: string
  fileName: string
  mimeType: string
  content: string // base64 encoded
  description?: string
}

export interface Attachment {
  id: string
  invoiceId: string
  fileName: string
  mimeType: string
  fileSize: number
  createdOn: string
}

/**
 * Check if file is an image
 */
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Validate attachment before upload
 */
export function validateAttachment(fileName: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  // Check mime type
  if (!ATTACHMENT_CONFIG.allowedMimeTypes.includes(mimeType)) {
    return { valid: false, error: `Niedozwolony typ pliku: ${mimeType}. Dozwolone: PDF, JPEG, PNG, GIF, WebP` }
  }

  // Check size
  if (sizeBytes > ATTACHMENT_CONFIG.maxSizeBytes) {
    const maxMB = ATTACHMENT_CONFIG.maxSizeBytes / 1024 / 1024
    return { valid: false, error: `Plik zbyt duży. Maksymalny rozmiar: ${maxMB} MB` }
  }

  return { valid: true }
}

/**
 * Optimize image using Canvas API (works in Node.js with canvas package or browser)
 * 
 * For now, we'll do a simple base64 passthrough with size check.
 * Full optimization would require sharp package which has native dependencies.
 */
export async function optimizeImage(
  base64Content: string,
  mimeType: string,
  _fileName: string
): Promise<{ content: string; mimeType: string; optimized: boolean }> {
  // Decode base64 to check size
  const buffer = Buffer.from(base64Content, 'base64')
  const originalSize = buffer.length

  // If image is already small enough, return as-is
  if (originalSize <= ATTACHMENT_CONFIG.maxImageSizeBytes) {
    return { content: base64Content, mimeType, optimized: false }
  }

  // For now, we'll just return the original with a warning
  // Full implementation would use sharp:
  // const sharp = require('sharp')
  // const optimized = await sharp(buffer)
  //   .resize(ATTACHMENT_CONFIG.maxImageDimension, ATTACHMENT_CONFIG.maxImageDimension, { fit: 'inside' })
  //   .jpeg({ quality: ATTACHMENT_CONFIG.imageQuality })
  //   .toBuffer()
  
  console.warn(`Image ${_fileName} is ${(originalSize / 1024 / 1024).toFixed(2)} MB. Consider adding sharp for optimization.`)
  
  return { content: base64Content, mimeType, optimized: false }
}

/**
 * Upload attachment to Dataverse using annotation entity
 * 
 * Dataverse stores attachments in the annotation (note) entity
 * linked to the parent record via objectid.
 */
export async function uploadAttachment(data: AttachmentCreate): Promise<Attachment> {
  const { invoiceId, fileName, mimeType, content, description } = data

  // Validate
  const sizeBytes = Buffer.from(content, 'base64').length
  const validation = validateAttachment(fileName, mimeType, sizeBytes)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Optimize if image
  let finalContent = content
  let finalMimeType = mimeType
  
  if (isImage(mimeType)) {
    const optimized = await optimizeImage(content, mimeType, fileName)
    finalContent = optimized.content
    finalMimeType = optimized.mimeType
  }

  // Create annotation (note) in Dataverse
  // Use the correct entity set name from our schema
  const entitySetName = InvoiceEntity.entitySet.replace('_', '')
  const annotationBody = {
    'objectid_ksef_invoice@odata.bind': `/${InvoiceEntity.entitySet}(${invoiceId})`,
    subject: fileName,
    filename: fileName,
    mimetype: finalMimeType,
    documentbody: finalContent,
    notetext: description || `Załącznik do faktury`,
    isdocument: true,
  }

  const response = await dataverseRequest<{
    annotationid: string
    createdon: string
    filesize: number
  }>('annotations', {
    method: 'POST',
    body: annotationBody,
  })

  return {
    id: response.annotationid,
    invoiceId,
    fileName,
    mimeType: finalMimeType,
    fileSize: Buffer.from(finalContent, 'base64').length,
    createdOn: response.createdon,
  }
}

/**
 * List attachments for an invoice
 */
export async function listAttachments(invoiceId: string): Promise<Attachment[]> {
  const path = `annotations?$filter=_objectid_value eq ${invoiceId} and isdocument eq true&$select=annotationid,filename,mimetype,filesize,createdon`

  const response = await dataverseRequest<{
    value: Array<{
      annotationid: string
      filename: string
      mimetype: string
      filesize: number
      createdon: string
    }>
  }>(path)

  return response.value.map(a => ({
    id: a.annotationid,
    invoiceId,
    fileName: a.filename,
    mimeType: a.mimetype,
    fileSize: a.filesize,
    createdOn: a.createdon,
  }))
}

/**
 * Get attachment content (base64)
 */
export async function getAttachmentContent(attachmentId: string): Promise<string> {
  const response = await dataverseRequest<{ documentbody: string }>(
    `annotations(${attachmentId})?$select=documentbody`
  )
  return response.documentbody
}

/**
 * Delete attachment
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  await dataverseRequest(`annotations(${attachmentId})`, {
    method: 'DELETE',
  })
}
