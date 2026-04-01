/**
 * Supplier Notes Service
 *
 * Handles text notes for suppliers using Dataverse annotation entity.
 * Mirrors the invoice notes service but targets dvlp_ksefsupplier.
 */

import { dataverseRequest } from './client'
import { Note, NoteCreate, NoteUpdate } from './notes'
import { isValidGuid } from './odata-utils'

const SUPPLIER_ENTITY_SET = 'dvlp_ksefsuppliers'
const SUPPLIER_ENTITY_LOGICAL_NAME = 'dvlp_ksefsupplier'

export async function createSupplierNote(data: { supplierId: string; subject?: string; noteText: string }): Promise<Note> {
  const { supplierId, subject, noteText } = data

  if (!noteText || noteText.trim().length === 0) {
    throw new Error('Note text is required')
  }

  const annotationBody = {
    [`objectid_${SUPPLIER_ENTITY_LOGICAL_NAME}@odata.bind`]: `/${SUPPLIER_ENTITY_SET}(${supplierId})`,
    subject: subject || null,
    notetext: noteText,
    isdocument: false,
  }

  const response = await dataverseRequest<{ id?: string; annotationid?: string }>('annotations', {
    method: 'POST',
    body: annotationBody,
  })

  const createdId = response?.id || response?.annotationid
  if (!createdId) {
    throw new Error('Failed to create note: No ID returned')
  }

  const now = new Date().toISOString()
  return {
    id: createdId,
    invoiceId: supplierId,
    subject: subject || null,
    noteText,
    createdOn: now,
    modifiedOn: now,
  }
}

export async function listSupplierNotes(supplierId: string): Promise<Note[]> {
  if (!isValidGuid(supplierId)) {
    throw new Error('Invalid supplier ID format')
  }
  const path = `annotations?$filter=_objectid_value eq ${supplierId} and isdocument eq false&$select=annotationid,subject,notetext,createdon,modifiedon&$orderby=createdon desc`

  const response = await dataverseRequest<{
    value: Array<{
      annotationid: string
      subject: string | null
      notetext: string
      createdon: string
      modifiedon: string
    }>
  }>(path)

  return response.value.map(n => ({
    id: n.annotationid,
    invoiceId: supplierId,
    subject: n.subject,
    noteText: n.notetext,
    createdOn: n.createdon,
    modifiedOn: n.modifiedon,
  }))
}

// getNote, updateNote, deleteNote are entity-agnostic — reuse from notes service
export { getNote, updateNote, deleteNote } from './notes'
