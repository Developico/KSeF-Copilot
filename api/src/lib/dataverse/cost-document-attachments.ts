/**
 * Cost Document Attachments Service
 *
 * Handles file uploads for cost documents using Dataverse annotation entity.
 * Mirrors the supplier attachments service but targets dvlp_ksefcostdocument.
 */

import { dataverseRequest } from './client'
import {
  validateAttachment,
  optimizeImage,
  type Attachment,
} from './attachments'
import { isValidGuid } from './odata-utils'

const COST_DOC_ENTITY_SET = 'dvlp_ksefcostdocuments'
const COST_DOC_ENTITY_LOGICAL_NAME = 'dvlp_ksefcostdocument'

export interface CostDocumentAttachmentCreate {
  costDocumentId: string
  fileName: string
  mimeType: string
  content: string // base64 encoded
  description?: string
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export async function uploadCostDocumentAttachment(data: CostDocumentAttachmentCreate): Promise<Attachment> {
  const { costDocumentId, fileName, mimeType, content, description } = data

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
    [`objectid_${COST_DOC_ENTITY_LOGICAL_NAME}@odata.bind`]: `/${COST_DOC_ENTITY_SET}(${costDocumentId})`,
    subject: fileName,
    filename: fileName,
    mimetype: finalMimeType,
    documentbody: finalContent,
    notetext: description || 'Cost document attachment',
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

  // Some Dataverse schemas do not expose additional metadata columns
  // (for example dvlp_hasdocument / dvlp_documentfilename). The annotation
  // itself is the source of truth, so we intentionally skip extra PATCH here.

  return {
    id: createdId,
    invoiceId: costDocumentId,
    fileName,
    mimeType: finalMimeType,
    fileSize: Buffer.from(finalContent, 'base64').length,
    createdOn: new Date().toISOString(),
  }
}

export async function listCostDocumentAttachments(costDocumentId: string): Promise<Attachment[]> {
  if (!isValidGuid(costDocumentId)) {
    throw new Error('Invalid cost document ID format')
  }
  const path = `annotations?$filter=_objectid_value eq ${costDocumentId} and isdocument eq true&$select=annotationid,filename,mimetype,filesize,createdon`

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
    invoiceId: costDocumentId,
    fileName: a.filename,
    mimeType: a.mimetype,
    fileSize: a.filesize,
    createdOn: a.createdon,
  }))
}

// Download and delete reuse the generic annotation endpoints
export { getAttachmentContent, deleteAttachment } from './attachments'
