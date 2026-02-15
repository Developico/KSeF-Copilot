/**
 * Notes Service
 * 
 * Handles text notes for invoices using Dataverse annotation entity.
 * Notes are annotations with isdocument = false (no file attachment).
 */

import { dataverseRequest } from './client'
import { InvoiceEntity } from './entities'

// ============================================================================
// Types
// ============================================================================

export interface NoteCreate {
  invoiceId: string
  subject?: string
  noteText: string
}

export interface NoteUpdate {
  subject?: string
  noteText?: string
}

export interface Note {
  id: string
  invoiceId: string
  subject: string | null
  noteText: string
  createdOn: string
  modifiedOn: string
}

// ============================================================================
// Note Operations
// ============================================================================

/**
 * Create a note for an invoice
 */
export async function createNote(data: NoteCreate): Promise<Note> {
  const { invoiceId, subject, noteText } = data

  if (!noteText || noteText.trim().length === 0) {
    throw new Error('Note text is required')
  }

  // The entity logical name is derived from entitySet (remove trailing 's')
  const entityLogicalName = InvoiceEntity.entitySet.replace(/s$/, '')
  
  const annotationBody = {
    [`objectid_${entityLogicalName}@odata.bind`]: `/${InvoiceEntity.entitySet}(${invoiceId})`,
    subject: subject || null,
    notetext: noteText,
    isdocument: false,
  }

  // Dataverse POST returns 204 No Content with OData-EntityId header
  // The client extracts just { id: '...' } from it
  const response = await dataverseRequest<{ id?: string; annotationid?: string }>('annotations', {
    method: 'POST',
    body: annotationBody,
  })

  // Get the created annotation ID (either from 'id' or 'annotationid' depending on response type)
  const createdId = response?.id || response?.annotationid
  if (!createdId) {
    throw new Error('Failed to create note: No ID returned')
  }

  // Return the note with current timestamp since Dataverse POST doesn't return full object
  const now = new Date().toISOString()
  return {
    id: createdId,
    invoiceId,
    subject: subject || null,
    noteText,
    createdOn: now,
    modifiedOn: now,
  }
}

/**
 * List notes for an invoice (ordered by creation date, newest first)
 */
export async function listNotes(invoiceId: string): Promise<Note[]> {
  const path = `annotations?$filter=_objectid_value eq ${invoiceId} and isdocument eq false&$select=annotationid,subject,notetext,createdon,modifiedon&$orderby=createdon desc`

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
    invoiceId,
    subject: n.subject,
    noteText: n.notetext,
    createdOn: n.createdon,
    modifiedOn: n.modifiedon,
  }))
}

/**
 * Get a single note by ID
 */
export async function getNote(noteId: string): Promise<Note | null> {
  try {
    const response = await dataverseRequest<{
      annotationid: string
      _objectid_value: string
      subject: string | null
      notetext: string
      createdon: string
      modifiedon: string
    }>(`annotations(${noteId})?$select=annotationid,_objectid_value,subject,notetext,createdon,modifiedon`)

    return {
      id: response.annotationid,
      invoiceId: response._objectid_value,
      subject: response.subject,
      noteText: response.notetext,
      createdOn: response.createdon,
      modifiedOn: response.modifiedon,
    }
  } catch (error) {
    // Return null if not found
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Update a note
 */
export async function updateNote(noteId: string, data: NoteUpdate): Promise<Note> {
  if (data.noteText !== undefined && data.noteText.trim().length === 0) {
    throw new Error('Note text cannot be empty')
  }

  const updateBody: Record<string, unknown> = {}
  
  if (data.subject !== undefined) {
    updateBody.subject = data.subject || null
  }
  
  if (data.noteText !== undefined) {
    updateBody.notetext = data.noteText
  }

  await dataverseRequest(`annotations(${noteId})`, {
    method: 'PATCH',
    body: updateBody,
  })

  // Fetch updated note
  const updated = await getNote(noteId)
  if (!updated) {
    throw new Error('Note not found after update')
  }
  
  return updated
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  await dataverseRequest(`annotations(${noteId})`, {
    method: 'DELETE',
  })
}

/**
 * Count notes for an invoice
 */
export async function countNotes(invoiceId: string): Promise<number> {
  const path = `annotations?$filter=_objectid_value eq ${invoiceId} and isdocument eq false&$count=true&$top=0`

  const response = await dataverseRequest<{
    '@odata.count': number
  }>(path)

  return response['@odata.count'] ?? 0
}
