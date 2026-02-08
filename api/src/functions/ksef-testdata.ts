import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { getKsefConfigForNip, KSEF_ENDPOINTS, type KsefEnvironment } from '../lib/ksef/config'
import { ensureActiveSession, getActiveSession } from '../lib/ksef/session'

/**
 * Check token permissions for a given NIP
 * GET /api/ksef/testdata/permissions?nip={nip}
 * 
 * Returns list of tokens and their permissions for the authenticated context
 */
app.http('ksef-testdata-check-permissions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/permissions',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require admin role
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const nip = request.query.get('nip')
      if (!nip) {
        return { status: 400, jsonBody: { error: 'NIP parameter is required' } }
      }

      context.log(`Checking token permissions for NIP: ${nip}`)

      // Get config for this NIP
      const config = await getKsefConfigForNip(nip)
      context.log(`Using environment: ${config.environment} (${config.baseUrl})`)

      // Ensure we have an active session
      await ensureActiveSession(nip)
      const session = getActiveSession()
      
      if (!session || !session.sessionToken) {
        return { status: 500, jsonBody: { error: 'Failed to establish KSeF session' } }
      }

      // Call /tokens endpoint to list tokens and their permissions
      const url = `${config.baseUrl}/tokens`
      context.log(`Fetching tokens from: ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'SessionToken': session.sessionToken,
        },
      })

      const responseText = await response.text()
      context.log(`Response status: ${response.status}`)

      if (!response.ok) {
        context.error(`Failed to get tokens: ${responseText.substring(0, 500)}`)
        return {
          status: response.status,
          jsonBody: {
            success: false,
            error: `KSeF API error: ${response.status}`,
            details: responseText.substring(0, 500),
          },
        }
      }

      const tokens = JSON.parse(responseText)

      return {
        status: 200,
        jsonBody: {
          success: true,
          environment: config.environment,
          nip,
          tokens,
        },
      }
    } catch (error) {
      context.error('Failed to check permissions:', error)
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
 * Grant test permissions (TEST and DEMO environments only)
 * POST /api/ksef/testdata/permissions
 * 
 * Body: {
 *   nip: string,                    // NIP of the company
 *   permissions?: string[],         // Optional: specific permissions to grant
 *                                   // Default: ['InvoiceRead', 'InvoiceWrite', 'CredentialsRead']
 *   authorizedNip?: string,         // Optional: NIP to authorize (defaults to same as nip)
 *   environment?: 'test' | 'demo'   // Optional: override environment
 * }
 * 
 * Available permissions:
 * - InvoiceRead - read invoices
 * - InvoiceWrite - send invoices  
 * - CredentialsManage - manage credentials
 * - CredentialsRead - read credentials
 * - Introspection - introspection access
 * - SubunitManage - manage subunits
 * - EnforcementOperations - enforcement operations
 */
app.http('ksef-testdata-grant-permissions', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/permissions',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require admin role
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json() as {
        nip: string
        permissions?: string[]
        authorizedNip?: string
        environment?: 'test' | 'demo'
      }

      if (!body.nip) {
        return { status: 400, jsonBody: { error: 'NIP is required' } }
      }

      context.log(`Granting test permissions for NIP: ${body.nip}`)

      // Get config for this NIP
      const config = await getKsefConfigForNip(body.nip)
      
      // Override environment if specified
      const targetEnv: KsefEnvironment = body.environment || config.environment
      const baseUrl = KSEF_ENDPOINTS[targetEnv]

      // Only allow test and demo environments
      if (targetEnv === 'prod') {
        return {
          status: 400,
          jsonBody: { error: 'Cannot grant test permissions in production environment' },
        }
      }

      context.log(`Using environment: ${targetEnv} (${baseUrl})`)

      // Default permissions if not specified
      const permissionTypes = body.permissions || [
        'InvoiceRead',
        'InvoiceWrite',
        'CredentialsRead',
      ]

      // Build permissions array
      const permissions = permissionTypes.map(permissionType => ({
        permissionType,
        description: `Granted via API for testing - ${new Date().toISOString()}`,
      }))

      // Authorized NIP defaults to the same as context NIP
      const authorizedNip = body.authorizedNip || body.nip

      // Call /testdata/permissions endpoint
      const url = `${baseUrl}/testdata/permissions`
      context.log(`Granting permissions at: ${url}`)
      context.log(`Permissions to grant: ${permissionTypes.join(', ')}`)

      const requestBody = {
        contextIdentifier: {
          value: body.nip,
          type: 'nip',
        },
        authorizedIdentifier: {
          value: authorizedNip,
          type: 'nip',
        },
        permissions,
      }

      context.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      context.log(`Response status: ${response.status}`)
      context.log(`Response body: ${responseText.substring(0, 500)}`)

      if (!response.ok) {
        context.error(`Failed to grant permissions: ${responseText}`)
        return {
          status: response.status,
          jsonBody: {
            success: false,
            error: `KSeF API error: ${response.status}`,
            details: responseText.substring(0, 500),
            environment: targetEnv,
            url,
          },
        }
      }

      let result = {}
      try {
        result = JSON.parse(responseText)
      } catch {
        // Some endpoints return empty body on success
        result = { message: 'Permissions granted successfully' }
      }

      return {
        status: 200,
        jsonBody: {
          success: true,
          environment: targetEnv,
          nip: body.nip,
          authorizedNip,
          grantedPermissions: permissionTypes,
          result,
        },
      }
    } catch (error) {
      context.error('Failed to grant permissions:', error)
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
 * Create test person/JDG (TEST and DEMO environments only)
 * POST /api/ksef/testdata/person
 * 
 * Body: {
 *   nip: string,          // NIP for the test person
 *   pesel?: string,       // PESEL (optional)
 *   firstName?: string,   // First name (optional)
 *   lastName?: string,    // Last name (optional)
 *   environment?: 'test' | 'demo'   // Optional: override environment
 * }
 */
app.http('ksef-testdata-create-person', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/person',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require admin role
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json() as {
        nip: string
        pesel?: string
        firstName?: string
        lastName?: string
        environment?: 'test' | 'demo'
      }

      if (!body.nip) {
        return { status: 400, jsonBody: { error: 'NIP is required' } }
      }

      context.log(`Creating test person for NIP: ${body.nip}`)

      // Get config for this NIP (or use default environment)
      let targetEnv: KsefEnvironment = body.environment || 'test'
      try {
        const config = await getKsefConfigForNip(body.nip)
        targetEnv = body.environment || config.environment
      } catch {
        // NIP not configured yet, use specified or default environment
        context.log(`NIP ${body.nip} not configured, using environment: ${targetEnv}`)
      }
      
      const baseUrl = KSEF_ENDPOINTS[targetEnv]

      // Only allow test and demo environments
      if (targetEnv === 'prod') {
        return {
          status: 400,
          jsonBody: { error: 'Cannot create test persons in production environment' },
        }
      }

      context.log(`Using environment: ${targetEnv} (${baseUrl})`)

      // Call /testdata/person endpoint
      const url = `${baseUrl}/testdata/person`
      context.log(`Creating test person at: ${url}`)

      const requestBody = {
        identifier: {
          value: body.nip,
          type: 'nip',
        },
        ...(body.pesel && { pesel: body.pesel }),
        ...(body.firstName && { firstName: body.firstName }),
        ...(body.lastName && { lastName: body.lastName }),
      }

      context.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      context.log(`Response status: ${response.status}`)
      context.log(`Response body: ${responseText.substring(0, 500)}`)

      if (!response.ok) {
        context.error(`Failed to create test person: ${responseText}`)
        return {
          status: response.status,
          jsonBody: {
            success: false,
            error: `KSeF API error: ${response.status}`,
            details: responseText.substring(0, 500),
            environment: targetEnv,
            url,
          },
        }
      }

      let result = {}
      try {
        result = JSON.parse(responseText)
      } catch {
        result = { message: 'Test person created successfully' }
      }

      return {
        status: 200,
        jsonBody: {
          success: true,
          environment: targetEnv,
          nip: body.nip,
          result,
        },
      }
    } catch (error) {
      context.error('Failed to create test person:', error)
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
 * Get test environment info (TEST and DEMO)
 * GET /api/ksef/testdata/environments
 * 
 * Returns information about available test environments
 */
app.http('ksef-testdata-environments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/environments',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      return {
        status: 200,
        jsonBody: {
          success: true,
          environments: {
            test: {
              name: 'Test',
              baseUrl: KSEF_ENDPOINTS.test,
              description: 'Test environment - data is shared between all integrators, uses self-signed certificates',
              testdataEndpoints: {
                permissions: `${KSEF_ENDPOINTS.test}/testdata/permissions`,
                person: `${KSEF_ENDPOINTS.test}/testdata/person`,
              },
            },
            demo: {
              name: 'Demo',
              baseUrl: KSEF_ENDPOINTS.demo,
              description: 'Demo environment - isolated data per integrator, more stable than test',
              testdataEndpoints: {
                permissions: `${KSEF_ENDPOINTS.demo}/testdata/permissions`,
                person: `${KSEF_ENDPOINTS.demo}/testdata/person`,
              },
            },
            prod: {
              name: 'Production',
              baseUrl: KSEF_ENDPOINTS.prod,
              description: 'Production environment - real invoices, no testdata endpoints',
              testdataEndpoints: null,
            },
          },
          availablePermissions: [
            { type: 'InvoiceRead', description: 'Read invoices from KSeF' },
            { type: 'InvoiceWrite', description: 'Send invoices to KSeF' },
            { type: 'CredentialsManage', description: 'Manage token credentials' },
            { type: 'CredentialsRead', description: 'Read credentials information' },
            { type: 'Introspection', description: 'Introspection access' },
            { type: 'SubunitManage', description: 'Manage organizational subunits' },
            { type: 'EnforcementOperations', description: 'Enforcement/blocking operations' },
          ],
        },
      }
    } catch (error) {
      context.error('Failed to get environment info:', error)
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

// Import for cleanup and generation functionality
import { listAllInvoices, bulkDeleteInvoices, countInvoices, createInvoice, updateInvoice } from '../lib/dataverse/invoices'
import { settingService } from '../lib/dataverse/services/setting-service'
import { generateInvoices, calculateSummary, type GenerateInvoicesOptions, type GeneratedInvoice } from '../lib/testdata'
import { InvoiceSource, PaymentStatus } from '../types/invoice'

/**
 * Cleanup test invoices from Dataverse (TEST and DEMO environments only)
 * DELETE /api/ksef/testdata/cleanup
 * 
 * Query params:
 *   nip: string           - Required: NIP of the company to cleanup
 *   dryRun: boolean       - Optional: If true, only count records without deleting (default: true)
 *   fromDate: string      - Optional: Only delete invoices from this date (YYYY-MM-DD)
 *   toDate: string        - Optional: Only delete invoices up to this date (YYYY-MM-DD)
 *   source: string        - Optional: Only delete invoices from specific source (KSeF, Manual)
 * 
 * Returns:
 *   { total, deleted, failed, dryRun, environment }
 */
app.http('ksef-testdata-cleanup', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/cleanup',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require admin role
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const nip = request.query.get('nip')
      if (!nip) {
        return { status: 400, jsonBody: { error: 'NIP parameter is required' } }
      }

      // Parse options
      const dryRun = request.query.get('dryRun') !== 'false' // Default to true for safety
      const fromDate = request.query.get('fromDate') || undefined
      const toDate = request.query.get('toDate') || undefined
      const source = request.query.get('source') as 'KSeF' | 'Manual' | undefined
      const companyId = request.query.get('companyId') || undefined

      // Get company setting to check environment
      const settings = await settingService.getAll()
      // Use companyId if provided (for multiple companies with same NIP), otherwise use NIP
      const companySetting = companyId 
        ? settings.find(s => s.id === companyId)
        : settings.find(s => s.nip === nip)
      
      if (!companySetting) {
        return { 
          status: 404, 
          jsonBody: { error: `Company with NIP ${nip} not found in settings` } 
        }
      }

      const environment = companySetting.environment
      
      // Only allow cleanup for test and demo environments
      const envLower = environment?.toLowerCase()
      if (envLower !== 'test' && envLower !== 'demo') {
        return {
          status: 400,
          jsonBody: { 
            error: `Cleanup is only allowed for test and demo environments (current: ${environment})`,
            environment,
          },
        }
      }

      context.log(`Cleanup request for NIP: ${nip}, environment: ${environment}, dryRun: ${dryRun}`)

      // Build filter params
      const filterParams = {
        tenantNip: nip,
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
        ...(source && { source }),
      }

      if (dryRun) {
        // Just count matching records
        const invoices = await listAllInvoices(filterParams)
        const total = invoices.length

        return {
          status: 200,
          jsonBody: {
            success: true,
            dryRun: true,
            environment,
            nip,
            total,
            message: `Found ${total} invoices matching criteria. Set dryRun=false to delete them.`,
            filters: filterParams,
          },
        }
      }

      // Actually delete invoices
      const result = await bulkDeleteInvoices(filterParams, {
        batchSize: 50,
        onProgress: (deleted, failed, total) => {
          context.log(`Cleanup progress: ${deleted}/${total} deleted, ${failed} failed`)
        },
      })

      context.log(`Cleanup completed: ${result.deleted} deleted, ${result.failed} failed out of ${result.total}`)

      return {
        status: 200,
        jsonBody: {
          success: true,
          dryRun: false,
          environment,
          nip,
          total: result.total,
          deleted: result.deleted,
          failed: result.failed,
          errors: result.errors.slice(0, 10), // Return first 10 errors
        },
      }
    } catch (error) {
      context.error('Failed to cleanup invoices:', error)
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
 * Get cleanup preview (count of records that would be deleted)
 * GET /api/ksef/testdata/cleanup/preview
 * 
 * Same query params as DELETE but always returns count only
 */
app.http('ksef-testdata-cleanup-preview', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/cleanup/preview',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      const nip = request.query.get('nip')
      if (!nip) {
        return { status: 400, jsonBody: { error: 'NIP parameter is required' } }
      }

      const fromDate = request.query.get('fromDate') || undefined
      const toDate = request.query.get('toDate') || undefined
      const source = request.query.get('source') as 'KSeF' | 'Manual' | undefined
      const companyId = request.query.get('companyId') || undefined

      // Get company setting to check environment
      const settings = await settingService.getAll()
      // Use companyId if provided (for multiple companies with same NIP), otherwise use NIP
      const companySetting = companyId 
        ? settings.find(s => s.id === companyId)
        : settings.find(s => s.nip === nip)
      
      if (!companySetting) {
        return { 
          status: 404, 
          jsonBody: { error: `Company with NIP ${nip} not found in settings` } 
        }
      }

      const environment = companySetting.environment

      // Build filter params
      const filterParams = {
        tenantNip: nip,
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
        ...(source && { source }),
      }

      // Get all invoices to count (uses pagination)
      const invoices = await listAllInvoices(filterParams)

      // Group by source for better visibility
      const bySource = invoices.reduce((acc, inv) => {
        const src = inv.source || 'Unknown'
        acc[src] = (acc[src] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group by month for better visibility
      const byMonth = invoices.reduce((acc, inv) => {
        const month = inv.invoiceDate?.substring(0, 7) || 'Unknown'
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        status: 200,
        jsonBody: {
          success: true,
          environment,
          nip,
          total: invoices.length,
          bySource,
          byMonth: Object.entries(byMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 12)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
          filters: filterParams,
          warning: environment === 'production' 
            ? 'Cleanup is not allowed in production environment' 
            : undefined,
        },
      }
    } catch (error) {
      context.error('Failed to get cleanup preview:', error)
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
 * Generate test invoices in Dataverse (TEST and DEMO environments only)
 * POST /api/ksef/testdata/generate
 * 
 * Body: {
 *   nip: string,              // Required: NIP of the company to generate invoices for
 *   companyId?: string,       // Optional: KsefSetting ID (for multiple companies with same NIP)
 *   count?: number,           // Optional: Number of invoices to generate (default: 10, max: 100)
 *   fromDate?: string,        // Optional: Start date for invoice dates (YYYY-MM-DD, default: 6 months ago)
 *   toDate?: string,          // Optional: End date for invoice dates (YYYY-MM-DD, default: today)
 *   paidPercentage?: number,  // Optional: Percentage of invoices to mark as paid (0-100, default: 30)
 *   ksefPercentage?: number,  // Optional: Percentage of invoices from KSeF vs Manual (0-100, overrides source)
 *   source?: 'KSeF' | 'Manual' // Optional: Invoice source (default: Manual, ignored if ksefPercentage is provided)
 * }
 * 
 * Returns:
 *   { success, environment, nip, summary }
 */
app.http('ksef-testdata-generate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ksef/testdata/generate',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      // Verify authentication
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Require admin role
      const roleCheck = requireRole(auth.user, 'Admin')
      if (!roleCheck.success) {
        return { status: 403, jsonBody: { error: 'Forbidden: Admin role required' } }
      }

      const body = await request.json() as {
        nip: string
        companyId?: string
        count?: number
        fromDate?: string
        toDate?: string
        paidPercentage?: number
        ksefPercentage?: number
        source?: 'KSeF' | 'Manual'
      }

      if (!body.nip) {
        return { status: 400, jsonBody: { error: 'NIP is required' } }
      }

      // Validate count
      const count = Math.min(Math.max(body.count || 10, 1), 100)

      // Get company setting to check environment
      const settings = await settingService.getAll()
      // Use companyId if provided (for multiple companies with same NIP), otherwise use NIP
      const companySetting = body.companyId
        ? settings.find(s => s.id === body.companyId)
        : settings.find(s => s.nip === body.nip)
      
      if (!companySetting) {
        return { 
          status: 404, 
          jsonBody: { error: `Company with NIP ${body.nip} not found in settings` } 
        }
      }

      const environment = companySetting.environment
      
      // Only allow generation for test and demo environments
      const envLower = environment?.toLowerCase()
      if (envLower !== 'test' && envLower !== 'demo') {
        return {
          status: 400,
          jsonBody: { 
            error: `Test data generation is only allowed for test and demo environments (current: ${environment})`,
            environment,
          },
        }
      }

      context.log(`Generating ${count} test invoices for NIP: ${body.nip}, environment: ${environment}`)

      // Parse dates
      const fromDate = body.fromDate ? new Date(body.fromDate) : undefined
      const toDate = body.toDate ? new Date(body.toDate) : undefined

      // Validate dates
      if (fromDate && isNaN(fromDate.getTime())) {
        return { status: 400, jsonBody: { error: 'Invalid fromDate format. Use YYYY-MM-DD' } }
      }
      if (toDate && isNaN(toDate.getTime())) {
        return { status: 400, jsonBody: { error: 'Invalid toDate format. Use YYYY-MM-DD' } }
      }

      // Generate invoices
      let generatedInvoices: GeneratedInvoice[]
      
      if (body.ksefPercentage !== undefined && body.ksefPercentage >= 0 && body.ksefPercentage <= 100) {
        // Generate a mix of KSeF and Manual invoices based on percentage
        const ksefCount = Math.round(count * body.ksefPercentage / 100)
        const manualCount = count - ksefCount
        
        context.log(`Generating ${ksefCount} KSeF and ${manualCount} Manual invoices (${body.ksefPercentage}% KSeF)`)
        
        const invoices: GeneratedInvoice[] = []
        
        // Generate KSeF invoices
        if (ksefCount > 0) {
          const ksefOptions: GenerateInvoicesOptions = {
            tenantNip: body.nip,
            tenantName: companySetting.companyName || `Company ${body.nip}`,
            count: ksefCount,
            fromDate,
            toDate,
            paidPercentage: body.paidPercentage,
            source: InvoiceSource.KSeF,
          }
          invoices.push(...generateInvoices(ksefOptions))
        }
        
        // Generate Manual invoices
        if (manualCount > 0) {
          const manualOptions: GenerateInvoicesOptions = {
            tenantNip: body.nip,
            tenantName: companySetting.companyName || `Company ${body.nip}`,
            count: manualCount,
            fromDate,
            toDate,
            paidPercentage: body.paidPercentage,
            source: InvoiceSource.Manual,
          }
          invoices.push(...generateInvoices(manualOptions))
        }
        
        // Shuffle to mix KSeF and Manual invoices randomly by date
        generatedInvoices = invoices.sort((a, b) => {
          const dateA = new Date(a.invoiceDate).getTime()
          const dateB = new Date(b.invoiceDate).getTime()
          return dateA - dateB
        })
      } else {
        // Generate all invoices with the same source (backward compatibility)
        const generatorOptions: GenerateInvoicesOptions = {
          tenantNip: body.nip,
          tenantName: companySetting.companyName || `Company ${body.nip}`,
          count,
          fromDate,
          toDate,
          paidPercentage: body.paidPercentage,
          source: body.source === 'KSeF' ? InvoiceSource.KSeF : InvoiceSource.Manual,
        }
        generatedInvoices = generateInvoices(generatorOptions)
      }
      
      const summary = calculateSummary(generatedInvoices)

      // Create invoices in Dataverse
      let created = 0
      let paid = 0
      let failed = 0
      const errors: string[] = []

      for (const invoice of generatedInvoices) {
        try {
          // Create invoice with settingId to link to company
          const { shouldBePaid, suggestedPaymentDate, ...invoiceData } = invoice
          const createdInvoice = await createInvoice({
            ...invoiceData,
            settingId: companySetting.id, // Link to KSeF setting for multi-environment support
          })
          created++

          // Mark as paid if applicable
          if (shouldBePaid && suggestedPaymentDate) {
            try {
              await updateInvoice(createdInvoice.id, {
                paymentStatus: PaymentStatus.Paid,
                paymentDate: suggestedPaymentDate,
              })
              paid++
            } catch (payError) {
              context.warn(`Failed to mark invoice ${createdInvoice.id} as paid:`, payError)
              // Don't count as failed - invoice was created successfully
            }
          }
        } catch (error) {
          failed++
          errors.push(error instanceof Error ? error.message : 'Unknown error')
          context.error('Failed to create invoice:', error)
        }
      }

      context.log(`Generation completed: ${created} created, ${paid} marked as paid, ${failed} failed`)

      return {
        status: 200,
        jsonBody: {
          success: true,
          environment,
          nip: body.nip,
          summary: {
            ...summary,
            created,
            paid,
            failed,
            errors: errors.slice(0, 10), // Return first 10 errors
          },
        },
      }
    } catch (error) {
      context.error('Failed to generate test invoices:', error)
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
