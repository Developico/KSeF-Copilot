/**
 * Settings API Endpoints
 * 
 * Manages KSeF settings (company configurations per NIP).
 * 
 * Endpoints:
 * - GET /api/settings - List all settings
 * - GET /api/settings/:id - Get single setting
 * - POST /api/settings - Create new setting
 * - PATCH /api/settings/:id - Update setting
 * - DELETE /api/settings/:id - Deactivate setting
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { settingService, KSEF_ENVIRONMENT } from '../lib/dataverse'
import type { SettingCreate, SettingUpdate } from '../lib/dataverse'
import { z } from 'zod'

// Validation schemas
const CreateSettingSchema = z.object({
  nip: z.string().length(10, 'NIP must be 10 digits'),
  companyName: z.string().min(1, 'Company name is required'),
  environment: z.enum(['test', 'demo', 'production']).default('test'),
  autoSync: z.boolean().default(false),
  syncIntervalMinutes: z.number().min(5).max(1440).optional(),
  keyVaultSecretName: z.string().optional(),
  invoicePrefix: z.string().max(10).optional(),
})

const UpdateSettingSchema = z.object({
  companyName: z.string().min(1).optional(),
  environment: z.enum(['test', 'demo', 'production']).optional(),
  autoSync: z.boolean().optional(),
  syncIntervalMinutes: z.number().min(5).max(1440).optional(),
  keyVaultSecretName: z.string().optional(),
  invoicePrefix: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/settings - List all settings
 */
app.http('settings-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'settings',
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
      const activeOnly = url.searchParams.get('activeOnly') === 'true'

      const settings = await settingService.getAll(activeOnly)

      return {
        status: 200,
        jsonBody: { settings, count: settings.length },
      }
    } catch (error) {
      context.error('Failed to list settings:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list settings' },
      }
    }
  },
})

/**
 * GET /api/settings/costcenters - List all cost centers (MPK)
 * 
 * Returns the static list of available cost centers.
 * Note: This route MUST be registered BEFORE settings/{id} to avoid being matched as an ID.
 */
app.http('settings-costcenters-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'settings/costcenters',
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

      // Return static cost centers list - values match Dataverse option set
      const costCenters = [
        { id: '1', code: 'Consultants', isActive: true },
        { id: '2', code: 'BackOffice', isActive: true },
        { id: '3', code: 'Management', isActive: true },
        { id: '4', code: 'Cars', isActive: true },
        { id: '5', code: 'Legal', isActive: true },
        { id: '6', code: 'Marketing', isActive: true },
        { id: '7', code: 'Sales', isActive: true },
        { id: '8', code: 'Delivery', isActive: true },
        { id: '9', code: 'Finance', isActive: true },
        { id: '10', code: 'Other', isActive: true },
      ]

      return {
        status: 200,
        jsonBody: { costCenters },
      }
    } catch (error) {
      context.error('Failed to list cost centers:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list cost centers' },
      }
    }
  },
})

/**
 * PATCH /api/settings/costcenters/:id - Update cost center (currently read-only)
 * 
 * Note: Cost centers are tied to Dataverse option set and cannot be edited from the app.
 * This endpoint returns an informational error.
 */
app.http('settings-costcenters-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'settings/costcenters/{id}',
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

      // Cost centers are tied to Dataverse option set - read-only from app
      return {
        status: 400,
        jsonBody: { 
          error: 'Centra kosztów (MPK) są powiązane z opcjami w Dataverse i nie mogą być edytowane z poziomu aplikacji. Skontaktuj się z administratorem systemu.' 
        },
      }
    } catch (error) {
      context.error('Failed to update cost center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update cost center' },
      }
    }
  },
})

/**
 * POST /api/settings/costcenters - Create cost center (currently read-only)
 */
app.http('settings-costcenters-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'settings/costcenters',
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

      // Cost centers are tied to Dataverse option set - read-only from app
      return {
        status: 400,
        jsonBody: { 
          error: 'Centra kosztów (MPK) są powiązane z opcjami w Dataverse i nie mogą być dodawane z poziomu aplikacji. Skontaktuj się z administratorem systemu.' 
        },
      }
    } catch (error) {
      context.error('Failed to create cost center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create cost center' },
      }
    }
  },
})

/**
 * DELETE /api/settings/costcenters/:id - Delete cost center (currently read-only)
 */
app.http('settings-costcenters-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'settings/costcenters/{id}',
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

      // Cost centers are tied to Dataverse option set - read-only from app
      return {
        status: 400,
        jsonBody: { 
          error: 'Centra kosztów (MPK) są powiązane z opcjami w Dataverse i nie mogą być usuwane z poziomu aplikacji. Skontaktuj się z administratorem systemu.' 
        },
      }
    } catch (error) {
      context.error('Failed to delete cost center:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to delete cost center' },
      }
    }
  },
})

/**
 * GET /api/settings/:id - Get single setting
 */
app.http('settings-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'settings/{id}',
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
        return { status: 400, jsonBody: { error: 'Setting ID required' } }
      }

      const setting = await settingService.getById(id)
      if (!setting) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      return {
        status: 200,
        jsonBody: setting,
      }
    } catch (error) {
      context.error('Failed to get setting:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get setting' },
      }
    }
  },
})

/**
 * POST /api/settings - Create new setting
 */
app.http('settings-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'settings',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require Admin role for creating settings
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json().catch(() => null)
      if (!body) {
        return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
      }

      const validation = CreateSettingSchema.safeParse(body)
      if (!validation.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: validation.error.errors },
        }
      }

      // Check if NIP + environment combination already exists
      const environmentValue = KSEF_ENVIRONMENT[validation.data.environment.toUpperCase() as keyof typeof KSEF_ENVIRONMENT]
      const existing = await settingService.getByNipAndEnvironment(validation.data.nip, environmentValue)
      if (existing) {
        return {
          status: 409,
          jsonBody: { error: 'Setting for this NIP in this environment already exists', existingId: existing.id },
        }
      }

      const data: SettingCreate = {
        nip: validation.data.nip,
        companyName: validation.data.companyName,
        environment: validation.data.environment,
        autoSync: validation.data.autoSync,
        syncIntervalMinutes: validation.data.syncIntervalMinutes,
        keyVaultSecretName: validation.data.keyVaultSecretName,
        invoicePrefix: validation.data.invoicePrefix,
      }

      const setting = await settingService.create(data)

      context.log(`Created setting for NIP: ${data.nip}`)

      return {
        status: 201,
        jsonBody: setting,
      }
    } catch (error) {
      context.error('Failed to create setting:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create setting' },
      }
    }
  },
})

/**
 * PATCH /api/settings/:id - Update setting
 */
app.http('settings-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'settings/{id}',
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
        return { status: 400, jsonBody: { error: 'Setting ID required' } }
      }

      const body = await request.json().catch(() => null)
      if (!body) {
        return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
      }

      const validation = UpdateSettingSchema.safeParse(body)
      if (!validation.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: validation.error.errors },
        }
      }

      // Check if setting exists
      const existing = await settingService.getById(id)
      if (!existing) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      const data: SettingUpdate = {
        companyName: validation.data.companyName,
        environment: validation.data.environment,
        autoSync: validation.data.autoSync,
        syncIntervalMinutes: validation.data.syncIntervalMinutes,
        keyVaultSecretName: validation.data.keyVaultSecretName,
        invoicePrefix: validation.data.invoicePrefix,
        isActive: validation.data.isActive,
      }

      // Remove undefined values
      Object.keys(data).forEach(key => {
        if (data[key as keyof SettingUpdate] === undefined) {
          delete data[key as keyof SettingUpdate]
        }
      })

      await settingService.update(id, data)

      const updated = await settingService.getById(id)

      context.log(`Updated setting: ${id}`)

      return {
        status: 200,
        jsonBody: updated,
      }
    } catch (error) {
      context.error('Failed to update setting:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update setting' },
      }
    }
  },
})

/**
 * DELETE /api/settings/:id - Deactivate setting (soft delete)
 */
app.http('settings-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'settings/{id}',
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
        return { status: 400, jsonBody: { error: 'Setting ID required' } }
      }

      const existing = await settingService.getById(id)
      if (!existing) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      await settingService.deactivate(id)

      context.log(`Deactivated setting: ${id}`)

      return {
        status: 200,
        jsonBody: { message: 'Setting deactivated', id },
      }
    } catch (error) {
      context.error('Failed to deactivate setting:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to deactivate setting' },
      }
    }
  },
})
