import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { getSecret } from '../lib/keyvault/secrets'
import { dataverseClient } from '../lib/dataverse/client'
import { KSEF_ENDPOINTS } from '../lib/ksef/config'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  responseTime?: number
  details?: Record<string, unknown>
}

interface DetailedHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: ServiceStatus[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

/**
 * Check Key Vault connectivity
 */
async function checkKeyVault(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const vaultUrl = process.env.AZURE_KEYVAULT_URL
    if (!vaultUrl) {
      return {
        name: 'Azure Key Vault',
        status: 'unhealthy',
        message: 'AZURE_KEYVAULT_URL not configured',
        responseTime: Date.now() - start,
      }
    }

    const testNip = process.env.KSEF_NIP
    const testSecretName = process.env.KSEF_TOKEN_SECRET_NAME || 'ksef-token-primary'
    let secretExists = false
    try {
      const secretName = testNip ? `ksef-token-${testNip}` : testSecretName
      const secret = await getSecret(secretName)
      secretExists = secret !== undefined
    } catch {
      // Secret might not exist, but connection works
    }

    return {
      name: 'Azure Key Vault',
      status: 'healthy',
      message: `Connected to ${vaultUrl}`,
      responseTime: Date.now() - start,
      details: { vaultUrl, testSecretExists: secretExists },
    }
  } catch (error) {
    return {
      name: 'Azure Key Vault',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Check Dataverse connectivity
 */
async function checkDataverse(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const dataverseUrl = process.env.DATAVERSE_URL
    if (!dataverseUrl) {
      return {
        name: 'Microsoft Dataverse',
        status: 'unhealthy',
        message: 'DATAVERSE_URL not configured',
        responseTime: Date.now() - start,
      }
    }

    const settingsEntity = process.env.DV_ENTITY_SETTING || 'dvlp_ksefsettings'
    await dataverseClient.list(settingsEntity, '$top=1&$select=dvlp_ksefsettingid')

    return {
      name: 'Microsoft Dataverse',
      status: 'healthy',
      message: `Connected to ${dataverseUrl}`,
      responseTime: Date.now() - start,
      details: { dataverseUrl, authenticated: true },
    }
  } catch (error) {
    return {
      name: 'Microsoft Dataverse',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Check KSeF API connectivity
 */
async function checkKsefApi(targetEnvironment?: string): Promise<ServiceStatus> {
  const start = Date.now()
  const envMap: Record<string, 'test' | 'demo' | 'prod'> = {
    production: 'prod',
    demo: 'demo',
    test: 'test',
    prod: 'prod',
  }
  const requestedEnv = targetEnvironment || process.env.KSEF_ENVIRONMENT || 'test'
  const ksefEnvKey = envMap[requestedEnv.toLowerCase()] || 'test'
  const ksefUrl = KSEF_ENDPOINTS[ksefEnvKey]

  try {
    const response = await fetch(ksefUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    const isHealthy = response.ok && response.status === 200

    return {
      name: 'KSeF API',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy
        ? `Connected to ${requestedEnv} environment`
        : `${requestedEnv} environment returned status ${response.status}`,
      responseTime: Date.now() - start,
      details: { activeEnvironment: requestedEnv, endpoint: ksefUrl, reachable: isHealthy },
    }
  } catch (error) {
    return {
      name: 'KSeF API',
      status: 'unhealthy',
      message: `${requestedEnv} environment unreachable: ${error instanceof Error ? error.message : 'Connection failed'}`,
      responseTime: Date.now() - start,
      details: { activeEnvironment: requestedEnv, endpoint: ksefUrl, reachable: false },
    }
  }
}

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Reader role is sufficient — status badge is shown to all authenticated users
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const environment = request.query.get('environment') || undefined

    // Run all checks in parallel
    const [keyVault, dataverse, ksefApi] = await Promise.all([
      checkKeyVault(),
      checkDataverse(),
      checkKsefApi(environment),
    ])

    const services = [keyVault, dataverse, ksefApi]
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    }

    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      summary.unhealthy > 0 ? 'unhealthy' :
      summary.degraded > 0 ? 'degraded' :
      'healthy'

    const response: DetailedHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      summary,
    }

    context.log('Health check completed:', summary)

    return { status: 200, jsonBody: response }
  } catch (error) {
    context.error('Health check failed:', error)
    return {
      status: 500,
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: [],
        summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
})
