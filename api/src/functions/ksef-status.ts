import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { settingService } from '../lib/dataverse'
import { getSecret } from '../lib/keyvault/secrets'
import { KSEF_ENDPOINTS, type KsefEnvironment } from '../lib/ksef/config'

export async function ksefStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Admin')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    // Get company identifier from query params
    const url = new URL(request.url)
    const companyId = url.searchParams.get('companyId')
    const nip = url.searchParams.get('nip')
    const environment = url.searchParams.get('environment')

    if (!companyId && !nip) {
      return { status: 400, jsonBody: { error: 'companyId or nip parameter is required' } }
    }

    // Find company setting - prefer ID, fallback to NIP+environment
    const settings = await settingService.getAll(true)
    let setting = companyId 
      ? settings.find(s => s.id === companyId)
      : (environment 
          ? settings.find(s => s.nip === nip && s.environment === environment)
          : settings.find(s => s.nip === nip))

    if (!setting) {
      return { 
        status: 404, 
        jsonBody: { 
          error: companyId 
            ? `No active company found for ID: ${companyId}` 
            : `No active company found for NIP: ${nip}${environment ? ` (${environment})` : ''}`,
          isConnected: false,
          environment: environment || 'unknown',
          nip: nip || 'unknown',
        } 
      }
    }

    // Map environment to KSEF endpoint key
    const envMap: Record<string, KsefEnvironment> = {
      'production': 'prod',
      'demo': 'demo', 
      'test': 'test'
    }
    const ksefEnv = envMap[setting.environment] || 'test'
    const secretName = setting.keyVaultSecretName || `ksef-token-${nip}`

    try {
      // Try to get token to verify connection
      const token = await getSecret(secretName)
      const hasToken = Boolean(token)

      return {
        status: 200,
        jsonBody: {
          isConnected: hasToken,
          environment: setting.environment,
          nip: setting.nip,
          companyName: setting.companyName,
          tokenExpiry: setting.tokenExpiresAt,
          tokenExpiringSoon: setting.tokenStatus === 'expiring',
          hasActiveSession: false, // TODO: track sessions per company
          secretName,
          ksefEndpoint: KSEF_ENDPOINTS[ksefEnv],
        },
      }
    } catch (error) {
      return {
        status: 200,
        jsonBody: {
          isConnected: false,
          environment: setting.environment,
          nip: setting.nip,
          companyName: setting.companyName,
          tokenExpiringSoon: false,
          hasActiveSession: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  } catch (error) {
    context.error('KSeF status check failed:', error)
    return {
      status: 500,
      jsonBody: { error: 'Failed to check KSeF status' },
    }
  }
}

app.http('ksef-status', {
  methods: ['GET'],
  authLevel: 'anonymous', // We handle auth ourselves
  route: 'ksef/status',
  handler: ksefStatus,
})
