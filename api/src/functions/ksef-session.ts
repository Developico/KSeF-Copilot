import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { initSession, terminateSession, getActiveSession, getSessionStatus } from '../lib/ksef/session'
import { validateAuth, requireRole } from '../lib/auth/middleware'

/**
 * Start a new KSeF session
 * POST /api/ksef/session
 */
app.http('ksef-session-start', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/session',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Validate authentication
      const auth = await validateAuth(request)
      if (!auth.isAuthenticated) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }
      
      // Require admin role
      if (!requireRole(auth, 'admin')) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }
      
      const body = await request.json() as { nip: string }
      
      if (!body.nip) {
        return { status: 400, jsonBody: { error: 'NIP is required' } }
      }
      
      context.log(`Starting KSeF session for NIP: ${body.nip}`)
      
      const session = await initSession(body.nip)
      
      return {
        status: 200,
        jsonBody: {
          success: true,
          session: {
            sessionId: session.sessionId,
            referenceNumber: session.referenceNumber,
            nip: session.nip,
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            status: session.status,
          },
        },
      }
    } catch (error) {
      context.error('Failed to start KSeF session:', error)
      return {
        status: 500,
        jsonBody: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  },
})

/**
 * Get current session status
 * GET /api/ksef/session
 */
app.http('ksef-session-status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/session',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await validateAuth(request)
      if (!auth.isAuthenticated) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }
      
      const session = getActiveSession()
      const status = await getSessionStatus()
      
      return {
        status: 200,
        jsonBody: {
          ...status,
          session: session ? {
            sessionId: session.sessionId,
            referenceNumber: session.referenceNumber,
            nip: session.nip,
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            status: session.status,
            invoicesProcessed: session.invoicesProcessed,
          } : null,
        },
      }
    } catch (error) {
      context.error('Failed to get session status:', error)
      return {
        status: 500,
        jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  },
})

/**
 * Terminate current session
 * DELETE /api/ksef/session
 */
app.http('ksef-session-terminate', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'ksef/session',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await validateAuth(request)
      if (!auth.isAuthenticated) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }
      
      if (!requireRole(auth, 'admin')) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }
      
      context.log('Terminating KSeF session')
      
      const result = await terminateSession()
      
      return {
        status: 200,
        jsonBody: {
          success: true,
          referenceNumber: result.referenceNumber,
          timestamp: result.timestamp,
        },
      }
    } catch (error) {
      context.error('Failed to terminate session:', error)
      return {
        status: 500,
        jsonBody: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  },
})
