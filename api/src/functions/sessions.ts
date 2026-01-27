/**
 * Sessions API Endpoints
 * 
 * Manages KSeF API sessions.
 * 
 * Endpoints:
 * - GET /api/sessions - List sessions
 * - GET /api/sessions/active/:nip - Get active session for NIP
 * - POST /api/sessions/:id/terminate - Terminate session
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { sessionService, settingService } from '../lib/dataverse'

/**
 * GET /api/sessions - List sessions for a setting
 */
app.http('sessions-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sessions',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId')
      const activeOnly = url.searchParams.get('activeOnly') === 'true'

      if (!settingId) {
        return { status: 400, jsonBody: { error: 'settingId query parameter required' } }
      }

      const sessions = await sessionService.getBySettingId(settingId, activeOnly)

      return {
        status: 200,
        jsonBody: { sessions, count: sessions.length },
      }
    } catch (error) {
      context.error('Failed to list sessions:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list sessions' },
      }
    }
  },
})

/**
 * GET /api/sessions/active/:nip - Get active session for NIP
 */
app.http('sessions-active', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sessions/active/{nip}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const nip = request.params.nip
      if (!nip) {
        return { status: 400, jsonBody: { error: 'NIP required' } }
      }

      const session = await sessionService.getActiveByNip(nip)

      if (!session) {
        return {
          status: 200,
          jsonBody: { active: false, session: null },
        }
      }

      return {
        status: 200,
        jsonBody: { active: true, session },
      }
    } catch (error) {
      context.error('Failed to get active session:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get active session' },
      }
    }
  },
})

/**
 * GET /api/sessions/:id - Get session by ID
 */
app.http('sessions-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sessions/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Reader')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Session ID required' } }
      }

      const session = await sessionService.getById(id)
      if (!session) {
        return { status: 404, jsonBody: { error: 'Session not found' } }
      }

      return {
        status: 200,
        jsonBody: session,
      }
    } catch (error) {
      context.error('Failed to get session:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get session' },
      }
    }
  },
})

/**
 * POST /api/sessions/:id/terminate - Terminate session
 */
app.http('sessions-terminate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sessions/{id}/terminate',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Session ID required' } }
      }

      const session = await sessionService.getById(id)
      if (!session) {
        return { status: 404, jsonBody: { error: 'Session not found' } }
      }

      if (session.status !== 'active') {
        return { status: 400, jsonBody: { error: 'Session is not active' } }
      }

      await sessionService.terminate(id)

      context.log(`Terminated session: ${id}`)

      return {
        status: 200,
        jsonBody: { message: 'Session terminated', id },
      }
    } catch (error) {
      context.error('Failed to terminate session:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to terminate session' },
      }
    }
  },
})

/**
 * POST /api/sessions/cleanup - Cleanup expired sessions
 */
app.http('sessions-cleanup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sessions/cleanup',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const count = await sessionService.cleanupExpiredSessions()

      context.log(`Cleaned up ${count} expired sessions`)

      return {
        status: 200,
        jsonBody: { message: 'Cleanup completed', expiredCount: count },
      }
    } catch (error) {
      context.error('Failed to cleanup sessions:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to cleanup sessions' },
      }
    }
  },
})
