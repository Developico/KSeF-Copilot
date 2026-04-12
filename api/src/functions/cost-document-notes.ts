/**
 * Cost Document Notes API
 *
 * Routes:
 *   POST   /api/cost-documents/:id/notes  — Create note
 *   GET    /api/cost-documents/:id/notes  — List notes
 *
 * Get/update/delete a single note reuse the shared /api/notes/:id routes.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import {
  createCostDocumentNote,
  listCostDocumentNotes,
} from '../lib/dataverse/cost-document-notes'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

const NoteCreateSchema = z.object({
  subject: z.string().max(500).optional(),
  noteText: z.string().min(1).max(10000),
})

async function createHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(auth.user, 'Admin')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const costDocumentId = request.params.id
    if (!costDocumentId) return { status: 400, jsonBody: { error: 'Cost document ID required' } }

    const body = await request.json()
    const parsed = NoteCreateSchema.safeParse(body)
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parsed.error.flatten() } }
    }

    const { subject, noteText } = parsed.data
    context.log(`Creating note for cost document: ${costDocumentId}`)
    const note = await createCostDocumentNote({ costDocumentId, subject, noteText })
    return { status: 201, jsonBody: note }
  } catch (error) {
    context.error('Failed to create cost document note:', error)
    return { status: 500, jsonBody: { error: 'Failed to create note' } }
  }
}

async function listHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const costDocumentId = request.params.id
    if (!costDocumentId) return { status: 400, jsonBody: { error: 'Cost document ID required' } }

    const notes = await listCostDocumentNotes(costDocumentId)
    return { status: 200, jsonBody: { notes, count: notes.length } }
  } catch (error) {
    context.error('Failed to list cost document notes:', error)
    return { status: 500, jsonBody: { error: 'Failed to list notes' } }
  }
}

app.http('cost-document-notes-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cost-documents/{id}/notes',
  handler: createHandler,
})

app.http('cost-document-notes-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cost-documents/{id}/notes',
  handler: listHandler,
})
