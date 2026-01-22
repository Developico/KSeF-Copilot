import { ConfidentialClientApplication } from '@azure/msal-node'

let msalClient: ConfidentialClientApplication | null = null

/**
 * Dataverse configuration
 */
export interface DataverseConfig {
  url: string
  entityInvoices: string
  entityTenants: string
}

/**
 * Get Dataverse configuration from environment
 */
export function getDataverseConfig(): DataverseConfig {
  const url = process.env.DATAVERSE_URL

  if (!url) {
    throw new Error('DATAVERSE_URL environment variable is required')
  }

  return {
    url,
    entityInvoices: process.env.DATAVERSE_ENTITY_INVOICES || 'ksef_invoices',
    entityTenants: process.env.DATAVERSE_ENTITY_TENANTS || 'ksef_tenants',
  }
}

/**
 * Get MSAL client for Dataverse authentication
 */
function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    const tenantId = process.env.AZURE_TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Azure credentials not configured (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)')
    }

    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    })
  }

  return msalClient
}

/**
 * Get access token for Dataverse
 */
export async function getDataverseToken(): Promise<string> {
  const config = getDataverseConfig()
  const client = getMsalClient()

  const result = await client.acquireTokenByClientCredential({
    scopes: [`${config.url}/.default`],
  })

  if (!result || !result.accessToken) {
    throw new Error('Failed to acquire Dataverse access token')
  }

  return result.accessToken
}

/**
 * Make authenticated request to Dataverse
 */
export async function dataverseRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const config = getDataverseConfig()
  const token = await getDataverseToken()
  const { method = 'GET', body, headers = {} } = options

  const url = `${config.url}/api/data/v9.2/${path}`

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'return=representation',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dataverse API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json() as Promise<T>
}
