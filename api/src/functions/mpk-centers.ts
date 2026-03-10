/**
 * MPK Centers API Endpoints
 *
 * Manages MPK Centers (cost centers) and their approvers.
 *
 * Endpoints:
 * - GET    /api/mpk-centers              - List MPK centers
 * - POST   /api/mpk-centers              - Create MPK center (Admin)
 * - GET    /api/mpk-centers/:id          - Get single MPK center
 * - PATCH  /api/mpk-centers/:id          - Update MPK center (Admin)
 * - DELETE /api/mpk-centers/:id          - Deactivate MPK center (Admin)
 * - GET    /api/mpk-centers/:id/approvers    - List approvers
 * - PUT    /api/mpk-centers/:id/approvers    - Set approvers (Admin)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { mpkCenterService } from '../lib/dataverse/services/mpk-center-service'
import { MpkCenterCreateSchema, MpkCenterUpdateSchema, SetApproversSchema } from '../types/mpk'

/**
 * GET /api/mpk-centers - List MPK centers for a setting
 */
app.http('mpk-centers-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'mpk-centers',
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
      const settingId = url.searchParams.get('settingId') || undefined
      const activeOnly = url.searchParams.get('activeOnly') !== 'false'

      const mpkCenters = await mpkCenterService.getAll({ settingId, activeOnly })

      return {
        status: 200,
        jsonBody: { mpkCenters, count: mpkCenters.length },
      }
    } catch (error) {
      context.error('Failed to list MPK centers:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list MPK centers' },
      }
    }
  },
})

/**
 * POST /api/mpk-centers - Create new MPK center
 */
app.http('mpk-centers-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'mpk-centers',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const body = await request.json()
      const parsed = MpkCenterCreateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const mpkCenter = await mpkCenterService.create(parsed.data)

      return {
        status: 201,
        jsonBody: { mpkCenter },
      }
    } catch (error) {
      context.error('Failed to create MPK center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create MPK center' },
      }
    }
  },
})

/**
 * GET /api/mpk-centers/:id - Get single MPK center
 */
app.http('mpk-centers-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'mpk-centers/{id}',
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
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const mpkCenter = await mpkCenterService.getById(id)
      if (!mpkCenter) {
        return { status: 404, jsonBody: { error: 'MPK center not found' } }
      }

      return {
        status: 200,
        jsonBody: { mpkCenter },
      }
    } catch (error) {
      context.error('Failed to get MPK center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get MPK center' },
      }
    }
  },
})

/**
 * PATCH /api/mpk-centers/:id - Update MPK center
 */
app.http('mpk-centers-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'mpk-centers/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const body = await request.json()
      const parsed = MpkCenterUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const mpkCenter = await mpkCenterService.update(id, parsed.data)
      if (!mpkCenter) {
        return { status: 404, jsonBody: { error: 'MPK center not found' } }
      }

      return {
        status: 200,
        jsonBody: { mpkCenter },
      }
    } catch (error) {
      context.error('Failed to update MPK center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update MPK center' },
      }
    }
  },
})

/**
 * DELETE /api/mpk-centers/:id - Deactivate (soft delete) MPK center
 */
app.http('mpk-centers-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'mpk-centers/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      // Verify it exists
      const existing = await mpkCenterService.getById(id)
      if (!existing) {
        return { status: 404, jsonBody: { error: 'MPK center not found' } }
      }

      await mpkCenterService.deactivate(id)

      return {
        status: 200,
        jsonBody: { message: 'MPK center deactivated' },
      }
    } catch (error) {
      context.error('Failed to deactivate MPK center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to deactivate MPK center' },
      }
    }
  },
})

/**
 * GET /api/mpk-centers/:id/approvers - List approvers for MPK center
 */
app.http('mpk-centers-approvers-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'mpk-centers/{id}/approvers',
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
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const approvers = await mpkCenterService.getApprovers(id)

      return {
        status: 200,
        jsonBody: { approvers, count: approvers.length },
      }
    } catch (error) {
      context.error('Failed to list approvers:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list approvers' },
      }
    }
  },
})

/**
 * PUT /api/mpk-centers/:id/approvers - Set approvers for MPK center (full replace)
 */
app.http('mpk-centers-approvers-set', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'mpk-centers/{id}/approvers',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden — requires Admin role' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const body = await request.json()
      const parsed = SetApproversSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      // Verify MPK center exists
      const existing = await mpkCenterService.getById(id)
      if (!existing) {
        return { status: 404, jsonBody: { error: 'MPK center not found' } }
      }

      const approvers = await mpkCenterService.setApprovers(id, parsed.data.systemUserIds)

      return {
        status: 200,
        jsonBody: { approvers, count: approvers.length },
      }
    } catch (error) {
      context.error('Failed to set approvers:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to set approvers' },
      }
    }
  },
})
