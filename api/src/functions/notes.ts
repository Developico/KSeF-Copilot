import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { 
  createNote, 
  listNotes, 
  updateNote, 
  deleteNote,
  getNote,
} from '../lib/dataverse/notes'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

/**
 * Note create schema
 */
const NoteCreateSchema = z.object({
  subject: z.string().max(500).optional(),
  noteText: z.string().min(1).max(10000),
})

/**
 * Note update schema
 */
const NoteUpdateSchema = z.object({
  subject: z.string().max(500).optional(),
  noteText: z.string().min(1).max(10000).optional(),
})

/**
 * POST /api/invoices/:id/notes - Create note
 */
export async function createNoteHandler(
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
    const parseResult = NoteCreateSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const { subject, noteText } = parseResult.data

    context.log(`Creating note for invoice: ${invoiceId}`)

    const note = await createNote({
      invoiceId,
      subject,
      noteText,
    })

    context.log(`Note created: ${note.id}`)

    return {
      status: 201,
      jsonBody: note,
    }
  } catch (error) {
    context.error('Failed to create note:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to create note' },
    }
  }
}

/**
 * GET /api/invoices/:id/notes - List notes for invoice
 */
export async function listNotesHandler(
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

    const notes = await listNotes(invoiceId)

    return {
      status: 200,
      jsonBody: { notes, count: notes.length },
    }
  } catch (error) {
    context.error('Failed to list notes:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to list notes' },
    }
  }
}

/**
 * GET /api/notes/:id - Get single note
 */
export async function getNoteHandler(
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

    const noteId = request.params.id
    if (!noteId) {
      return { status: 400, jsonBody: { error: 'Note ID required' } }
    }

    const note = await getNote(noteId)
    
    if (!note) {
      return { status: 404, jsonBody: { error: 'Note not found' } }
    }

    return {
      status: 200,
      jsonBody: note,
    }
  } catch (error) {
    context.error('Failed to get note:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to get note' },
    }
  }
}

/**
 * PATCH /api/notes/:id - Update note
 */
export async function updateNoteHandler(
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

    const noteId = request.params.id
    if (!noteId) {
      return { status: 400, jsonBody: { error: 'Note ID required' } }
    }

    const body = await request.json()
    const parseResult = NoteUpdateSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: parseResult.error.flatten() },
      }
    }

    const { subject, noteText } = parseResult.data

    // At least one field must be provided
    if (subject === undefined && noteText === undefined) {
      return {
        status: 400,
        jsonBody: { error: 'At least subject or noteText must be provided' },
      }
    }

    context.log(`Updating note: ${noteId}`)

    const note = await updateNote(noteId, { subject, noteText })

    context.log(`Note updated: ${note.id}`)

    return {
      status: 200,
      jsonBody: note,
    }
  } catch (error) {
    context.error('Failed to update note:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to update note' },
    }
  }
}

/**
 * DELETE /api/notes/:id - Delete note
 */
export async function deleteNoteHandler(
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

    const noteId = request.params.id
    if (!noteId) {
      return { status: 400, jsonBody: { error: 'Note ID required' } }
    }

    await deleteNote(noteId)

    return { status: 204 }
  } catch (error) {
    context.error('Failed to delete note:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to delete note' },
    }
  }
}

// Register routes
app.http('notes-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/notes',
  handler: createNoteHandler,
})

app.http('notes-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/notes',
  handler: listNotesHandler,
})

app.http('notes-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notes/{id}',
  handler: getNoteHandler,
})

app.http('notes-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'notes/{id}',
  handler: updateNoteHandler,
})

app.http('notes-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'notes/{id}',
  handler: deleteNoteHandler,
})
