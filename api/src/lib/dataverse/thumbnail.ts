/**
 * Document Thumbnail Service
 * 
 * Stores and retrieves PDF thumbnails as Dataverse annotations.
 * Thumbnails are small PNG images of the first page, stored with
 * a special subject "dvlp_doc_thumbnail" to distinguish them from
 * regular attachments.
 */

import { dataverseRequest } from './client'
import { InvoiceEntity } from './entities'

/** Subject used to identify thumbnail annotations */
const THUMBNAIL_SUBJECT = 'dvlp_doc_thumbnail'

/** Thumbnail metadata */
export interface DocumentThumbnail {
  content: string  // base64 PNG
  mimeType: string
  width?: number
  height?: number
}

/**
 * Save a document thumbnail for an invoice.
 * Replaces any existing thumbnail.
 */
export async function saveThumbnail(
  invoiceId: string,
  base64Content: string,
  mimeType: string = 'image/png'
): Promise<void> {
  // Delete existing thumbnail first
  await deleteThumbnail(invoiceId)

  // Create annotation with special subject
  const entityLogicalName = InvoiceEntity.entitySet.replace(/s$/, '')
  const annotationBody = {
    [`objectid_${entityLogicalName}@odata.bind`]: `/${InvoiceEntity.entitySet}(${invoiceId})`,
    subject: THUMBNAIL_SUBJECT,
    filename: 'thumbnail.png',
    mimetype: mimeType,
    documentbody: base64Content,
    notetext: 'Auto-generated PDF thumbnail',
    isdocument: true,
  }

  await dataverseRequest('annotations', {
    method: 'POST',
    body: annotationBody,
  })
}

/**
 * Get thumbnail for an invoice document.
 * Returns null if no thumbnail exists.
 */
export async function getThumbnail(invoiceId: string): Promise<DocumentThumbnail | null> {
  const filter = `_objectid_value eq ${invoiceId} and subject eq '${THUMBNAIL_SUBJECT}' and isdocument eq true`
  const path = `annotations?$filter=${filter}&$select=documentbody,mimetype&$top=1`

  const response = await dataverseRequest<{
    value: Array<{
      documentbody: string
      mimetype: string
    }>
  }>(path)

  if (!response.value || response.value.length === 0) {
    return null
  }

  const annotation = response.value[0]
  return {
    content: annotation.documentbody,
    mimeType: annotation.mimetype || 'image/png',
  }
}

/**
 * Delete thumbnail for an invoice document.
 */
export async function deleteThumbnail(invoiceId: string): Promise<void> {
  const filter = `_objectid_value eq ${invoiceId} and subject eq '${THUMBNAIL_SUBJECT}'`
  const path = `annotations?$filter=${filter}&$select=annotationid`

  const response = await dataverseRequest<{
    value: Array<{ annotationid: string }>
  }>(path)

  for (const annotation of response.value) {
    await dataverseRequest(`annotations(${annotation.annotationid})`, {
      method: 'DELETE',
    })
  }
}
