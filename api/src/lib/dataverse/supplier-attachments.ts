/**
 * Supplier Attachments Service
 *
 * Handles file uploads for suppliers using Dataverse annotation entity.
 * Mirrors the invoice attachment service but targets dvlp_ksefsupplier.
 */

import { dataverseRequest } from './client'
import {
  ATTACHMENT_CONFIG,
  validateAttachment,
  optimizeImage,
  Attachment,
} from './attachments'

const SUPPLIER_ENTITY_SET = 'dvlp_ksefsuppliers'
const SUPPLIER_ENTITY_LOGICAL_NAME = 'dvlp_ksefsupplier'

export interface SupplierAttachmentCreate {
  supplierId: string
  fileName: string
  mimeType: string
  content: string // base64 encoded
  description?: string
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export async function uploadSupplierAttachment(data: SupplierAttachmentCreate): Promise<Attachment> {
  const { supplierId, fileName, mimeType, content, description } = data

  const sizeBytes = Buffer.from(content, 'base64').length
  const validation = validateAttachment(fileName, mimeType, sizeBytes)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  let finalContent = content
  let finalMimeType = mimeType

  if (isImage(mimeType)) {
    const optimized = await optimizeImage(content, mimeType, fileName)
    finalContent = optimized.content
    finalMimeType = optimized.mimeType
  }

  const annotationBody = {
    [`objectid_${SUPPLIER_ENTITY_LOGICAL_NAME}@odata.bind`]: `/${SUPPLIER_ENTITY_SET}(${supplierId})`,
    subject: fileName,
    filename: fileName,
    mimetype: finalMimeType,
    documentbody: finalContent,
    notetext: description || 'Supplier attachment',
    isdocument: true,
  }

  const response = await dataverseRequest<{ id?: string; annotationid?: string }>('annotations', {
    method: 'POST',
    body: annotationBody,
  })

  const createdId = response?.id || response?.annotationid
  if (!createdId) {
    throw new Error('Failed to create attachment: No ID returned')
  }

  return {
    id: createdId,
    invoiceId: supplierId,
    fileName,
    mimeType: finalMimeType,
    fileSize: Buffer.from(finalContent, 'base64').length,
    createdOn: new Date().toISOString(),
  }
}

export async function listSupplierAttachments(supplierId: string): Promise<Attachment[]> {
  const path = `annotations?$filter=_objectid_value eq ${supplierId} and isdocument eq true&$select=annotationid,filename,mimetype,filesize,createdon`

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
    invoiceId: supplierId,
    fileName: a.filename,
    mimeType: a.mimetype,
    fileSize: a.filesize,
    createdOn: a.createdon,
  }))
}

// Download and delete reuse the generic annotation endpoints (same as invoices)
export { getAttachmentContent, deleteAttachment } from './attachments'
