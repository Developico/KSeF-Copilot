import { ConfidentialClientApplication } from '@azure/msal-node'
import { ensureDataverseBaseUrl } from './config'
import { 
  logDataverseRequest, 
  logDataverseResponse, 
  logDataverseError,
  logDataverseInfo,
  logDataverseWarn 
} from './logger'

let msalClient: ConfidentialClientApplication | null = null

// Default headers for OData Web API
const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'OData-Version': '4.0',
  'OData-MaxVersion': '4.0',
  // Include annotations for formatted values and lookup info
  Prefer: 'odata.include-annotations=OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.lookuplogicalname,return=representation',
}

/**
 * Request options for DataverseClient
 */
export interface DataverseRequestOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: TBody
  headers?: Record<string, string>
  retries?: number
}

/**
 * OData response with value array and optional nextLink
 */
export interface ODataResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.count'?: number
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
  const baseUrl = ensureDataverseBaseUrl()
  const client = getMsalClient()

  const result = await client.acquireTokenByClientCredential({
    scopes: [`${baseUrl}/.default`],
  })

  if (!result || !result.accessToken) {
    throw new Error('Failed to acquire Dataverse access token')
  }

  return result.accessToken
}

// Helper: exponential backoff delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function jitter(): number {
  return Math.random() * 200 // 0-200ms random jitter
}

/**
 * DataverseClient class - main interface for Dataverse operations
 */
export class DataverseClient {
  private baseUrl: string
  private maxRetries: number

  constructor(options?: { maxRetries?: number }) {
    this.baseUrl = ensureDataverseBaseUrl()
    this.maxRetries = options?.maxRetries ?? 3
  }

  /**
   * Make authenticated request to Dataverse with retry logic
   */
  async request<TResponse = unknown, TBody = unknown>(
    path: string, 
    options: DataverseRequestOptions<TBody> = {}
  ): Promise<TResponse | undefined> {
    const { method = 'GET', body, headers = {}, retries = this.maxRetries } = options
    const url = `${this.baseUrl}/api/data/v9.2/${path}`
    const operation = `${method} ${path.split('?')[0]}`
    const started = Date.now()

    logDataverseRequest(operation, url, { method, body: body ? '[body]' : undefined })

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const token = await getDataverseToken()

        const response = await fetch(url, {
          method,
          headers: {
            ...DEFAULT_HEADERS,
            Authorization: `Bearer ${token}`,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(30_000),
        })

        // Handle 429 Too Many Requests with retry
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
          logDataverseWarn(operation, `Rate limited (429), retrying after ${retryAfter}s`, { attempt })
          await delay(retryAfter * 1000 + jitter())
          continue
        }

        // Handle 5xx server errors with retry
        if (response.status >= 500 && attempt < retries) {
          const backoff = Math.pow(2, attempt) * 1000 + jitter()
          logDataverseWarn(operation, `Server error ${response.status}, retrying in ${Math.round(backoff)}ms`, { attempt })
          await delay(backoff)
          continue
        }

        // Handle 204 No Content
        if (response.status === 204) {
          // For POST operations, extract the ID from OData-EntityId header
          const entityIdHeader = response.headers.get('OData-EntityId')
          if (entityIdHeader && method === 'POST') {
            const idMatch = entityIdHeader.match(/\(([^)]+)\)$/)
            if (idMatch) {
              logDataverseResponse(operation, { createdId: idMatch[1] }, Date.now() - started)
              return { id: idMatch[1] } as TResponse
            }
          }
          logDataverseResponse(operation, '204 No Content', Date.now() - started)
          return undefined
        }

        // Handle errors
        if (!response.ok) {
          const errorText = await response.text()
          const error = new Error(`Dataverse API error: ${response.status} ${response.statusText} - ${errorText}`)
          logDataverseError(operation, error)
          throw error
        }

        // Parse JSON response
        const jsonResponse = await response.json() as TResponse
        logDataverseResponse(operation, jsonResponse, Date.now() - started)
        return jsonResponse

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on auth errors or client errors (4xx except 429)
        if (lastError.message.includes('401') || lastError.message.includes('403')) {
          logDataverseError(operation, lastError)
          throw lastError
        }

        // Retry on network errors
        if (attempt < retries) {
          const backoff = Math.pow(2, attempt) * 1000 + jitter()
          logDataverseWarn(operation, `Request failed, retrying in ${Math.round(backoff)}ms`, { 
            attempt, 
            error: lastError.message 
          })
          await delay(backoff)
        }
      }
    }

    // All retries exhausted
    logDataverseError(operation, lastError || new Error('All retries exhausted'))
    throw lastError || new Error('All retries exhausted')
  }

  /**
   * List entities with optional OData query
   */
  async list<T>(entitySet: string, query?: string): Promise<ODataResponse<T>> {
    const path = query ? `${entitySet}?${query}` : entitySet
    const response = await this.request<ODataResponse<T>>(path)
    return response || { value: [] }
  }

  /**
   * List all entities following @odata.nextLink for pagination
   */
  async listAll<T>(entitySet: string, query?: string): Promise<T[]> {
    const allRecords: T[] = []
    let path = query ? `${entitySet}?${query}` : entitySet
    let pageCount = 0
    const maxPages = 100 // Safety limit

    while (path && pageCount < maxPages) {
      const response = await this.request<ODataResponse<T>>(path)
      if (response?.value) {
        allRecords.push(...response.value)
      }

      // Follow nextLink if present
      if (response?.['@odata.nextLink']) {
        // nextLink is a full URL, extract the path
        const nextLinkUrl = new URL(response['@odata.nextLink'])
        path = nextLinkUrl.pathname.replace('/api/data/v9.2/', '') + nextLinkUrl.search
        pageCount++
        logDataverseInfo('listAll', `Following nextLink, page ${pageCount}`, { entitySet, recordsSoFar: allRecords.length })
      } else {
        break
      }
    }

    if (pageCount >= maxPages) {
      logDataverseWarn('listAll', `Reached max pages limit (${maxPages})`, { entitySet, totalRecords: allRecords.length })
    }

    return allRecords
  }

  /**
   * Get single entity by ID
   */
  async getById<T>(entitySet: string, id: string, query?: string): Promise<T | null> {
    try {
      const path = query ? `${entitySet}(${id})?${query}` : `${entitySet}(${id})`
      const response = await this.request<T>(path)
      return response || null
    } catch (error) {
      // Return null for 404, rethrow other errors
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Create new entity
   */
  async create<T>(entitySet: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.request<T>(entitySet, { method: 'POST', body })
    return response as T
  }

  /**
   * Update existing entity
   */
  async update<T>(entitySet: string, id: string, body: Record<string, unknown>): Promise<T | undefined> {
    return this.request<T>(`${entitySet}(${id})`, { method: 'PATCH', body })
  }

  /**
   * Delete entity
   */
  async delete(entitySet: string, id: string): Promise<void> {
    await this.request(`${entitySet}(${id})`, { method: 'DELETE' })
  }

  /**
   * Upsert entity (create or update based on alternate key)
   */
  async upsert<T>(entitySet: string, keyQuery: string, body: Record<string, unknown>): Promise<T | undefined> {
    // keyQuery example: "dvlp_ksefreferencenumber='ABC123'"
    return this.request<T>(`${entitySet}(${keyQuery})`, { 
      method: 'PATCH', 
      body,
      headers: { 'If-Match': '*' } // Upsert behavior
    })
  }
}

// Export singleton instance
export const dataverseClient = new DataverseClient()

// Legacy function for backward compatibility
export async function dataverseRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const result = await dataverseClient.request<T>(path, options)
  return result as T
}
