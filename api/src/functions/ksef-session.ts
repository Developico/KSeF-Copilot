import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { initSession, terminateSession, getActiveSession, getActiveSessionAsync, getSessionStatus } from '../lib/ksef/session'
import { verifyAuth, verifyAuthWithRateLimit, requireRole } from '../lib/auth/middleware'

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
      const auth = await verifyAuthWithRateLimit(request, { windowMs: 60_000, maxRequests: 10 })
      if (!auth.success || !auth.user) {
        if (auth.retryAfterMs) {
          return { status: 429, jsonBody: { error: 'Rate limit exceeded' }, headers: { 'Retry-After': String(Math.ceil(auth.retryAfterMs / 1000)) } }
        }
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      
      // Require admin role
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
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
            expiresAt: session.expiresAt?.toISOString(),
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
      const auth = await verifyAuthWithRateLimit(request, { windowMs: 60_000, maxRequests: 10 })
      if (!auth.success || !auth.user) {
        if (auth.retryAfterMs) {
          return { status: 429, jsonBody: { error: 'Rate limit exceeded' }, headers: { 'Retry-After': String(Math.ceil(auth.retryAfterMs / 1000)) } }
        }
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      if (!requireRole(auth.user, 'Reader').success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Reader role required' } }
      }
      
      // Use async version that falls back to Dataverse
      const session = await getActiveSessionAsync()
      const status = await getSessionStatus()
      
      return {
        status: 200,
        jsonBody: {
          ...status,
          // Override isActive based on Dataverse session if memory cache is empty
          isActive: Boolean(session),
          session: session ? {
            sessionId: session.sessionId,
            referenceNumber: session.referenceNumber,
            nip: session.nip,
            createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
            expiresAt: session.expiresAt instanceof Date ? session.expiresAt?.toISOString() : session.expiresAt,
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
      const auth = await verifyAuthWithRateLimit(request, { windowMs: 60_000, maxRequests: 10 })
      if (!auth.success || !auth.user) {
        if (auth.retryAfterMs) {
          return { status: 429, jsonBody: { error: 'Rate limit exceeded' }, headers: { 'Retry-After': String(Math.ceil(auth.retryAfterMs / 1000)) } }
        }
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }
      
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
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
