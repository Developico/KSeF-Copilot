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
