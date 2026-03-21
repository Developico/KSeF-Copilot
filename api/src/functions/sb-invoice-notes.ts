/**
 * Self-Billing Invoice Notes API
 *
 * Routes:
 *   POST   /api/self-billing/invoices/:id/notes  — Create note
 *   GET    /api/self-billing/invoices/:id/notes  — List notes
 *
 * Get/update/delete a single note reuse the shared /api/notes/:id routes.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import {
  createSbInvoiceNote,
  listSbInvoiceNotes,
} from '../lib/dataverse/sb-invoice-notes'
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
    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const sbInvoiceId = request.params.id
    if (!sbInvoiceId) return { status: 400, jsonBody: { error: 'Self-billing invoice ID required' } }

    const body = await request.json()
    const parsed = NoteCreateSchema.safeParse(body)
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: 'Invalid request body', details: parsed.error.flatten() } }
    }

    const { subject, noteText } = parsed.data
    context.log(`Creating note for self-billing invoice: ${sbInvoiceId}`)
    const note = await createSbInvoiceNote({ sbInvoiceId, subject, noteText })
    return { status: 201, jsonBody: note }
  } catch (error) {
    context.error('Failed to create self-billing invoice note:', error)
    return { status: 500, jsonBody: { error: 'Failed to create note' } }
  }
}

async function listHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return { status: 401, jsonBody: { error: 'Unauthorized' } }
    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const sbInvoiceId = request.params.id
    if (!sbInvoiceId) return { status: 400, jsonBody: { error: 'Self-billing invoice ID required' } }

    const notes = await listSbInvoiceNotes(sbInvoiceId)
    return { status: 200, jsonBody: { notes, count: notes.length } }
  } catch (error) {
    context.error('Failed to list self-billing invoice notes:', error)
    return { status: 500, jsonBody: { error: 'Failed to list notes' } }
  }
}

app.http('sb-invoice-notes-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/notes',
  handler: createHandler,
})

app.http('sb-invoice-notes-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'self-billing/invoices/{id}/notes',
  handler: listHandler,
})
