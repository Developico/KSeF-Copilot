/**
 * Users API Endpoint
 *
 * Lists Dataverse system users for approver assignment.
 *
 * Endpoints:
 * - GET /api/users - List active system users (Admin)
 * - GET /api/users?role=approver - List users in the Approver Entra group (Admin)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { mpkCenterService } from '../lib/dataverse/services/mpk-center-service'
import { listGroupMembers } from '../lib/graph/graph-client'

const APPROVER_GROUP_ID = process.env.APPROVER_GROUP_ID || process.env.NEXT_PUBLIC_APPROVER_GROUP

/**
 * GET /api/users - List active Dataverse system users
 * Used by the UI to populate approver selection dropdowns.
 *
 * Query params:
 *   ?role=approver — filter to only members of the Approver Entra group
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

      const roleCheck = requireRole(auth.user!, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: roleCheck.error } }
      }

      const url = new URL(request.url)
      const roleFilter = url.searchParams.get('role')

      const users = await mpkCenterService.listSystemUsers()

      // Filter to Approver group members if requested
      if (roleFilter === 'approver') {
        if (!APPROVER_GROUP_ID) {
          return {
            status: 200,
            jsonBody: { users: [], count: 0, warning: 'APPROVER_GROUP_ID not configured' },
          }
        }

        const groupMembers = await listGroupMembers(APPROVER_GROUP_ID)
        const memberOids = new Set(groupMembers.map((m) => m.id))
        const filtered = users.filter((u) => u.azureObjectId && memberOids.has(u.azureObjectId))

        return {
          status: 200,
          jsonBody: { users: filtered, count: filtered.length },
        }
      }

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
