/**
 * Approver Overview API Endpoint
 *
 * Admin-only endpoint that returns a summary of Approver group members
 * and their MPK / supplier assignments.
 *
 * GET /api/approvers/overview?settingId=xxx
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { listGroupMembers } from '../lib/graph/graph-client'
import { mpkCenterService } from '../lib/dataverse/services/mpk-center-service'
import { supplierService } from '../lib/dataverse/services/supplier-service'

const APPROVER_GROUP_ID = process.env.APPROVER_GROUP_ID || process.env.NEXT_PUBLIC_APPROVER_GROUP

app.http('approver-overview', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'approvers/overview',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      if (!APPROVER_GROUP_ID) {
        return {
          status: 200,
          jsonBody: { members: [], configured: false },
        }
      }

      const url = new URL(request.url)
      const settingId = url.searchParams.get('settingId')

      // Get Entra group members
      const groupMembers = await listGroupMembers(APPROVER_GROUP_ID)

      // Cross-reference with Dataverse system users
      const systemUsers = settingId
        ? await mpkCenterService.listSystemUsers()
        : []

      const members = await Promise.all(
        groupMembers.map(async (member) => {
          const dvUser = systemUsers.find(
            (su) => su.azureObjectId === member.id,
          )

          let mpkCenterNames: string[] = []
          let supplierCount = 0

          if (dvUser && settingId) {
            // Get MPK assignments
            const allMpks = await mpkCenterService.getAll({ settingId, activeOnly: true })
            for (const mpk of allMpks) {
              const approvers = await mpkCenterService.getApprovers(mpk.id)
              if (approvers.some((a) => a.systemUserId === dvUser.systemUserId)) {
                mpkCenterNames.push(mpk.name)
              }
            }

            // Get supplier assignments
            const suppliers = await supplierService.getAll({ settingId })
            supplierCount = suppliers.filter(
              (s) => s.sbContactUserId === dvUser.systemUserId,
            ).length
          }

          // Use Graph data first, fall back to Dataverse user data
          const displayName = member.displayName || dvUser?.fullName || ''
          const email = member.mail || member.userPrincipalName || dvUser?.email || ''

          if (!member.displayName) {
            context.warn(
              `Graph API returned empty displayName for member ${member.id}. ` +
              'Consider granting User.Read.All application permission.',
            )
          }

          return {
            id: member.id,
            displayName,
            email,
            hasDataverseAccount: !!dvUser,
            mpkCenterNames,
            supplierCount,
          }
        }),
      )

      return {
        status: 200,
        jsonBody: { members, configured: true, count: members.length },
      }
    } catch (error) {
      context.error('Failed to get approver overview', error)
      return { status: 500, jsonBody: { error: 'Failed to get approver overview' } }
    }
  },
})
