/**
 * Cost Document Notes Service
 *
 * Handles text notes for cost documents using Dataverse annotation entity.
 * Mirrors the supplier notes service but targets dvlp_ksefcostdocument.
 */

import { dataverseRequest } from './client'
import type { Note } from './notes'
import { isValidGuid } from './odata-utils'

const COST_DOC_ENTITY_SET = 'dvlp_ksefcostdocuments'
const COST_DOC_ENTITY_LOGICAL_NAME = 'dvlp_ksefcostdocument'

export async function createCostDocumentNote(data: { costDocumentId: string; subject?: string; noteText: string }): Promise<Note> {
  const { costDocumentId, subject, noteText } = data

  if (!noteText || noteText.trim().length === 0) {
    throw new Error('Note text is required')
  }

  const annotationBody = {
    [`objectid_${COST_DOC_ENTITY_LOGICAL_NAME}@odata.bind`]: `/${COST_DOC_ENTITY_SET}(${costDocumentId})`,
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
    invoiceId: costDocumentId,
    subject: subject || null,
    noteText,
    createdOn: now,
    modifiedOn: now,
  }
}

export async function listCostDocumentNotes(costDocumentId: string): Promise<Note[]> {
  if (!isValidGuid(costDocumentId)) {
    throw new Error('Invalid cost document ID format')
  }
  const path = `annotations?$filter=_objectid_value eq ${costDocumentId} and isdocument eq false&$select=annotationid,subject,notetext,createdon,modifiedon&$orderby=createdon desc`

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
    invoiceId: costDocumentId,
    subject: n.subject,
    noteText: n.notetext,
    createdOn: n.createdon,
    modifiedOn: n.modifiedon,
  }))
}

// getNote, updateNote, deleteNote are entity-agnostic — reuse from notes service
export { getNote, updateNote, deleteNote } from './notes'
