/**
 * Supplier Notes API
 *
 * Routes:
 *   POST   /api/suppliers/:id/notes  — Create note
 *   GET    /api/suppliers/:id/notes  — List notes
 *
 * Get/update/delete a single note reuse the shared /api/notes/:id routes.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import {
  createSupplierNote,
  listSupplierNotes,
} from '../lib/dataverse/supplier-notes'
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

    const supplierId = request.params.id
    if (!supplierId) return { status: 400, jsonBody: { error: 'Supplier ID required' } }

    const body = await request.json()
    const parsed = NoteCreateSchema.safeParse(body)
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parsed.error.flatten() } }
    }

    const { subject, noteText } = parsed.data
    context.log(`Creating note for supplier: ${supplierId}`)
    const note = await createSupplierNote({ supplierId, subject, noteText })
    return { status: 201, jsonBody: note }
  } catch (error) {
    context.error('Failed to create supplier note:', error)
    return { status: 500, jsonBody: { error: 'Failed to create note' } }
  }
}

async function listHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const supplierId = request.params.id
    if (!supplierId) return { status: 400, jsonBody: { error: 'Supplier ID required' } }

    const notes = await listSupplierNotes(supplierId)
    return { status: 200, jsonBody: { notes, count: notes.length } }
  } catch (error) {
    context.error('Failed to list supplier notes:', error)
    return { status: 500, jsonBody: { error: 'Failed to list notes' } }
  }
}

app.http('supplier-notes-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/notes',
  handler: createHandler,
})

app.http('supplier-notes-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suppliers/{id}/notes',
  handler: listHandler,
})
