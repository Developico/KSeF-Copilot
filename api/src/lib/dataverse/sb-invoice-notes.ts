/**
 * Self-Billing Invoice Notes Service
 *
 * Handles text notes for self-billing invoices using Dataverse annotation entity.
 * Mirrors the supplier-notes service but targets dvlp_ksefselfbillinginvoice.
 */

import { dataverseRequest } from './client'
import { Note } from './notes'

const SB_INVOICE_ENTITY_SET = 'dvlp_ksefselfbillinginvoices'
const SB_INVOICE_ENTITY_LOGICAL_NAME = 'dvlp_ksefselfbillinginvoice'

export async function createSbInvoiceNote(data: { sbInvoiceId: string; subject?: string; noteText: string }): Promise<Note> {
  const { sbInvoiceId, subject, noteText } = data

  if (!noteText || noteText.trim().length === 0) {
    throw new Error('Note text is required')
  }

  const annotationBody = {
    [`objectid_${SB_INVOICE_ENTITY_LOGICAL_NAME}@odata.bind`]: `/${SB_INVOICE_ENTITY_SET}(${sbInvoiceId})`,
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
    invoiceId: sbInvoiceId,
    subject: subject || null,
    noteText,
    createdOn: now,
    modifiedOn: now,
  }
}

export async function listSbInvoiceNotes(sbInvoiceId: string): Promise<Note[]> {
  const path = `annotations?$filter=_objectid_value eq ${sbInvoiceId} and isdocument eq false&$select=annotationid,subject,notetext,createdon,modifiedon&$orderby=createdon desc`

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
    invoiceId: sbInvoiceId,
    subject: n.subject,
    noteText: n.notetext,
    createdOn: n.createdon,
    modifiedOn: n.modifiedon,
  }))
}

// getNote, updateNote, deleteNote are entity-agnostic — reuse from notes service
export { getNote, updateNote, deleteNote } from './notes'
