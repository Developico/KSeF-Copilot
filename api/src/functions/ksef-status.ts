import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getKsefStatus } from '../lib/ksef/client'
import { verifyAuth, requireRole } from '../lib/auth/middleware'

export async function ksefStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const status = await getKsefStatus()

    return {
      status: 200,
      jsonBody: status,
    }
  } catch (error) {
    context.error('KSeF status check failed:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to check KSeF status' },
    }
  }
}

app.http('ksef-status', {
  methods: ['GET'],
  authLevel: 'anonymous', // We handle auth ourselves
  route: 'ksef/status',
  handler: ksefStatus,
})
