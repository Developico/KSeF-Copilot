/**
 * Self-Billing Agreements API Endpoints
 *
 * Manages Self-Billing Agreements.
 *
 * Endpoints:
 * - GET    /api/sb-agreements              - List agreements
 * - POST   /api/sb-agreements              - Create agreement (Admin)
 * - GET    /api/sb-agreements/:id          - Get single agreement
 * - PATCH  /api/sb-agreements/:id          - Update agreement (Admin)
 * - POST   /api/sb-agreements/:id/terminate - Terminate agreement (Admin)
 * - POST   /api/sb-agreements/:id/attachments - Upload attachment (Admin)
 * - GET    /api/sb-agreements/:id/attachments - List attachments
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { sbAgreementService } from '../lib/dataverse/services/sb-agreement-service'
import { supplierService } from '../lib/dataverse/services/supplier-service'
import { dataverseRequest } from '../lib/dataverse/client'
import { DV } from '../lib/dataverse/config'
import { validateAttachment } from '../lib/dataverse/attachments'
import { isValidGuid } from '../lib/dataverse/odata-utils'
import { SbAgreementCreateSchema, SbAgreementUpdateSchema } from '../types/self-billing'
import type { SbAgreementStatus } from '../types/self-billing'
import { z } from 'zod'

/**
 * GET /api/sb-agreements - List agreements
 */
app.http('sb-agreements-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sb-agreements',
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
      const status = url.searchParams.get('status') as SbAgreementStatus | null

      const agreements = await sbAgreementService.getAll({
        settingId,
        supplierId,
        status: status || undefined,
      })

      return {
        status: 200,
        jsonBody: { agreements, count: agreements.length },
      }
    } catch (error) {
      context.error('Failed to list SB agreements:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list SB agreements' },
      }
    }
  },
})

/**
 * POST /api/sb-agreements - Create new agreement
 */
app.http('sb-agreements-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sb-agreements',
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
      const parsed = SbAgreementCreateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      // Verify supplier exists and is Active
      const supplier = await supplierService.getById(parsed.data.supplierId)
      if (!supplier) {
        return { status: 404, jsonBody: { error: 'Supplier not found' } }
      }
      if (supplier.status !== 'Active') {
        return { status: 400, jsonBody: { error: 'Supplier must be Active to create an agreement' } }
      }

      const agreement = await sbAgreementService.create(parsed.data)

      // Update supplier's self-billing flags
      await supplierService.update(supplier.id, {
        hasSelfBillingAgreement: true,
        selfBillingAgreementDate: parsed.data.agreementDate,
        selfBillingAgreementExpiry: parsed.data.validTo || undefined,
      })

      return {
        status: 201,
        jsonBody: { agreement },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      context.error('Failed to create SB agreement:', msg, error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to create SB agreement', details: msg },
      }
    }
  },
})

/**
 * GET /api/sb-agreements/:id - Get single agreement
 */
app.http('sb-agreements-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sb-agreements/{id}',
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

      const agreement = await sbAgreementService.getById(id)
      if (!agreement) {
        return { status: 404, jsonBody: { error: 'SB agreement not found' } }
      }

      return {
        status: 200,
        jsonBody: { agreement },
      }
    } catch (error) {
      context.error('Failed to get SB agreement:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to get SB agreement' },
      }
    }
  },
})

/**
 * PATCH /api/sb-agreements/:id - Update agreement
 */
app.http('sb-agreements-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'sb-agreements/{id}',
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
      const parsed = SbAgreementUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const agreement = await sbAgreementService.update(id, parsed.data)
      if (!agreement) {
        return { status: 404, jsonBody: { error: 'SB agreement not found' } }
      }

      return {
        status: 200,
        jsonBody: { agreement },
      }
    } catch (error) {
      context.error('Failed to update SB agreement:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to update SB agreement' },
      }
    }
  },
})

/**
 * POST /api/sb-agreements/:id/terminate - Terminate agreement
 */
app.http('sb-agreements-terminate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sb-agreements/{id}/terminate',
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

      const agreement = await sbAgreementService.getById(id)
      if (!agreement) {
        return { status: 404, jsonBody: { error: 'SB agreement not found' } }
      }

      await sbAgreementService.terminate(id)

      return {
        status: 200,
        jsonBody: { message: 'Agreement terminated' },
      }
    } catch (error) {
      context.error('Failed to terminate SB agreement:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to terminate SB agreement' },
      }
    }
  },
})

// ============================================================
// Attachment endpoints for SB Agreements
// ============================================================

const SbAttachmentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  content: z.string().min(1), // base64 encoded
  description: z.string().max(500).optional(),
})

/**
 * POST /api/sb-agreements/:id/attachments - Upload attachment
 */
app.http('sb-agreements-attachment-upload', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sb-agreements/{id}/attachments',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Missing id parameter' } }
      }

      const agreement = await sbAgreementService.getById(id)
      if (!agreement) {
        return { status: 404, jsonBody: { error: 'SB agreement not found' } }
      }

      const body = await request.json()
      const parsed = SbAttachmentUploadSchema.safeParse(body)
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
        }
      }

      const { fileName, mimeType, content, description } = parsed.data
      const sizeBytes = Buffer.from(content, 'base64').length
      const validation = validateAttachment(fileName, mimeType, sizeBytes)
      if (!validation.valid) {
        return { status: 400, jsonBody: { error: validation.error } }
      }

      // Create annotation linked to the SB agreement entity
      const entityLogicalName = DV.sbAgreement.entitySet.replace(/s$/, '')
      const annotationBody = {
        [`objectid_${entityLogicalName}@odata.bind`]: `/${DV.sbAgreement.entitySet}(${id})`,
        subject: fileName,
        filename: fileName,
        mimetype: mimeType,
        documentbody: content,
        notetext: description || 'SB Agreement attachment',
        isdocument: true,
      }

      const response = await dataverseRequest<{ id?: string; annotationid?: string }>('annotations', {
        method: 'POST',
        body: annotationBody,
      })

      const createdId = response?.id || response?.annotationid
      if (!createdId) {
        throw new Error('Failed to create attachment: No ID returned')
      }

      // Update agreement document flags
      await sbAgreementService.update(id, {
        hasDocument: true,
        documentFilename: fileName,
      })

      context.log(`SB agreement attachment uploaded: ${createdId} for agreement ${id}`)

      return {
        status: 201,
        jsonBody: {
          id: createdId,
          agreementId: id,
          fileName,
          mimeType,
          fileSize: sizeBytes,
          createdOn: new Date().toISOString(),
        },
      }
    } catch (error) {
      context.error('Failed to upload SB agreement attachment:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to upload attachment' },
      }
    }
  },
})

/**
 * GET /api/sb-agreements/:id/attachments - List attachments
 */
app.http('sb-agreements-attachment-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sb-agreements/{id}/attachments',
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
      if (!id || !isValidGuid(id)) {
        return { status: 400, jsonBody: { error: 'Missing or invalid agreement ID' } }
      }

      const agreement = await sbAgreementService.getById(id)
      if (!agreement) {
        return { status: 404, jsonBody: { error: 'SB agreement not found' } }
      }

      const path = `annotations?$filter=_objectid_value eq ${id} and isdocument eq true&$select=annotationid,filename,mimetype,filesize,createdon`
      const response = await dataverseRequest<{
        value: Array<{
          annotationid: string
          filename: string
          mimetype: string
          filesize: number
          createdon: string
        }>
      }>(path)

      const attachments = response.value.map(a => ({
        id: a.annotationid,
        agreementId: id,
        fileName: a.filename,
        mimeType: a.mimetype,
        fileSize: a.filesize,
        createdOn: a.createdon,
      }))

      return {
        status: 200,
        jsonBody: { attachments, count: attachments.length },
      }
    } catch (error) {
      context.error('Failed to list SB agreement attachments:', error)
      return {
        status: 500,
        jsonBody: { error: 'Failed to list attachments' },
      }
    }
  },
})
