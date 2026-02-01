/**
 * Settings Token Test API Endpoint
 * 
 * Tests KSeF token connectivity for a specific company setting.
 * 
 * Endpoint:
 * - POST /api/settings/:id/test-token - Test token for specific setting
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth } from '../lib/auth/middleware'
import { settingService } from '../lib/dataverse'
import { getSecret } from '../lib/keyvault/secrets'
import { KSEF_ENDPOINTS } from '../lib/ksef/config'

interface TokenTestResult {
  success: boolean
  secretName: string
  tokenExists: boolean
  tokenLength?: number
  keyVaultConnected: boolean
  ksefApiConnected?: boolean
  ksefEnvironment?: string
  error?: string
  details?: string
}

/**
 * POST /api/settings/:id/test-token - Test token connectivity
 */
app.http('settings-test-token', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'settings/{id}/test-token',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const auth = await verifyAuth(request)
      if (!auth.success || !auth.user) {
        return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
      }

      // Allow any authenticated user to test tokens
      // (Admin role check removed - users can test their own company tokens)

      const id = request.params.id
      if (!id) {
        return { status: 400, jsonBody: { error: 'Setting ID required' } }
      }

      // Get setting
      const setting = await settingService.getById(id)
      if (!setting) {
        return { status: 404, jsonBody: { error: 'Setting not found' } }
      }

      const result: TokenTestResult = {
        success: false,
        secretName: setting.keyVaultSecretName || `ksef-token-${setting.nip}`,
        tokenExists: false,
        keyVaultConnected: false,
      }

      // Test 1: Key Vault connectivity and token existence
      try {
        const token = await getSecret(result.secretName)
        result.keyVaultConnected = true
        
        if (token) {
          result.tokenExists = true
          result.tokenLength = token.length
          
          // Test 2: KSeF API connectivity
          try {
            const envMap: Record<string, 'test' | 'demo' | 'prod'> = {
              'production': 'prod',
              'demo': 'demo',
              'test': 'test'
            }
            const ksefEnv = envMap[setting.environment] || 'test'
            const ksefBaseUrl = KSEF_ENDPOINTS[ksefEnv]
            result.ksefEnvironment = setting.environment
            
            if (!ksefBaseUrl) {
              throw new Error(`No KSeF endpoint configured for environment: ${ksefEnv}`)
            }
            
            // Simple ping to KSeF API status endpoint
            const response = await fetch(`${ksefBaseUrl}/common/Status`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              },
              signal: AbortSignal.timeout(5000) // 5 second timeout
            })
            
            result.ksefApiConnected = response.ok
            result.success = response.ok
            result.details = response.ok 
              ? `Token found and KSeF API (${setting.environment}) is reachable`
              : `Token found but KSeF API returned status ${response.status}`
          } catch (ksefError) {
            result.ksefApiConnected = false
            result.details = `Token found but KSeF API test failed: ${ksefError instanceof Error ? ksefError.message : 'Unknown error'}`
            result.success = false
          }
        } else {
          result.error = `Token '${result.secretName}' not found in Key Vault`
          result.details = 'Create the token in Azure Key Vault with the correct name format: ksef-token-{NIP}'
        }
      } catch (kvError) {
        result.keyVaultConnected = false
        result.error = `Key Vault connection failed: ${kvError instanceof Error ? kvError.message : 'Unknown error'}`
        result.details = 'Check AZURE_KEYVAULT_URL environment variable and access permissions'
      }

      context.log('Token test result:', { settingId: id, result })

      return {
        status: 200,
        jsonBody: result,
      }
    } catch (error) {
      context.error('Token test failed:', error)
      return {
        status: 500,
        jsonBody: { 
          success: false,
          error: 'Token test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
      }
    }
  },
})
