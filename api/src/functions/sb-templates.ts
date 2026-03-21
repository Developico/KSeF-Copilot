/**
 * Self-Billing Templates API Endpoints
 *
 * Manages Self-Billing Templates (invoice line item definitions).
 *
 * Endpoints:
 * - GET    /api/sb-templates              - List templates
 * - POST   /api/sb-templates              - Create template (Admin)
 * - GET    /api/sb-templates/:id          - Get single template
 * - PATCH  /api/sb-templates/:id          - Update template (Admin)
 * - DELETE /api/sb-templates/:id          - Deactivate template (Admin)
 * - POST   /api/sb-templates/duplicate     - Duplicate templates to another supplier (Admin)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { sbTemplateService } from '../lib/dataverse/services/sb-template-service'
import { SbTemplateCreateSchema, SbTemplateUpdateSchema } from '../types/self-billing'
import { z } from 'zod'

/**
 * GET /api/sb-templates - List templates
 */
app.http('sb-templates-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sb-templates',
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
      if (!settingId) {
        return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
      }

      const supplierId = url.searchParams.get('supplierId') || undefined
      const activeOnly = url.searchParams.get('activeOnly') !== 'false'

      const templates = await sbTemplateService.getAll({ settingId, supplierId, activeOnly })

      return {
        status: 200,
        jsonBody: { templates, count: templates.length },
      }
    } catch (error) {
      context.error('Failed to list SB templates:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list SB templates' },
      }
    }
  },
})

/**
 * POST /api/sb-templates - Create new template
 */
app.http('sb-templates-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sb-templates',
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
      const parsed = SbTemplateCreateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const template = await sbTemplateService.create(parsed.data)

      return {
        status: 201,
        jsonBody: { template },
      }
    } catch (error) {
      context.error('Failed to create SB template:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create SB template' },
      }
    }
  },
})

/**
 * GET /api/sb-templates/:id - Get single template
 */
app.http('sb-templates-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sb-templates/{id}',
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

      const template = await sbTemplateService.getById(id)
      if (!template) {
        return { status: 404, jsonBody: { error: 'SB template not found' } }
      }

      return {
        status: 200,
        jsonBody: { template },
      }
    } catch (error) {
      context.error('Failed to get SB template:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get SB template' },
      }
    }
  },
})

/**
 * PATCH /api/sb-templates/:id - Update template
 */
app.http('sb-templates-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'sb-templates/{id}',
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
      const parsed = SbTemplateUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const template = await sbTemplateService.update(id, parsed.data)
      if (!template) {
        return { status: 404, jsonBody: { error: 'SB template not found' } }
      }

      return {
        status: 200,
        jsonBody: { template },
      }
    } catch (error) {
      context.error('Failed to update SB template:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update SB template' },
      }
    }
  },
})

/**
 * DELETE /api/sb-templates/:id - Deactivate template
 */
app.http('sb-templates-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'sb-templates/{id}',
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

      await sbTemplateService.deactivate(id)

      return {
        status: 200,
        jsonBody: { message: 'SB template deactivated' },
      }
    } catch (error) {
      context.error('Failed to deactivate SB template:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to deactivate SB template' },
      }
    }
  },
})

/**
 * POST /api/sb-templates/duplicate - Duplicate templates to another supplier
 */
app.http('sb-templates-duplicate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sb-templates/duplicate',
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
      const schema = z.object({
        fromSupplierId: z.string().uuid(),
        toSupplierId: z.string().uuid(),
        settingId: z.string().uuid(),
      })
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } }
      }

      const templates = await sbTemplateService.duplicateForSupplier(
        parsed.data.fromSupplierId,
        parsed.data.toSupplierId,
        parsed.data.settingId
      )

      return {
        status: 201,
        jsonBody: { templates, count: templates.length },
      }
    } catch (error) {
      context.error('Failed to duplicate SB templates:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to duplicate SB templates' },
      }
    }
  },
})
