/**
 * Users API Endpoint
 *
 * Lists Dataverse system users for approver assignment.
 *
 * Endpoints:
 * - GET /api/users - List active system users (Admin)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { mpkCenterService } from '../lib/dataverse/services/mpk-center-service'

/**
 * GET /api/users - List active Dataverse system users
 * Used by the UI to populate approver selection dropdowns.
 */
app.http('users-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success) {
        return { status: 401, jsonBody: { error: auth.error } }
      }
      requireRole(auth.user!, 'Admin')

      const users = await mpkCenterService.listSystemUsers()

      return {
        status: 200,
        jsonBody: { users, count: users.length },
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Insufficient permissions')) {
        return { status: 403, jsonBody: { error: error.message } }
      }
      context.error('Error listing users:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list users' },
      }
    }
  },
})
