import { getSecret } from '../keyvault/secrets'
import { getKsefConfig, isTokenExpiringSoon, getDaysUntilTokenExpiry } from './config'
import { KsefStatusResponse } from './types'

/**
 * KSeF API Client
 * Handles authentication and API calls to KSeF
 */

let currentSession: { token: string; createdAt: Date } | null = null

/**
 * Get KSeF authorization token from Key Vault
 */
export async function getKsefToken(): Promise<string> {
  const config = getKsefConfig()
  const token = await getSecret(config.tokenSecretName)

  if (!token) {
    throw new Error(`KSeF token not found in Key Vault: ${config.tokenSecretName}`)
  }

  return token
}

/**
 * Get current KSeF status
 */
export async function getKsefStatus(): Promise<KsefStatusResponse> {
  const config = getKsefConfig()

  try {
    // Try to get token to verify connection
    await getKsefToken()

    return {
      isConnected: true,
      environment: config.environment,
      nip: config.nip,
      tokenExpiry: config.tokenExpiry?.toISOString(),
      tokenExpiringSoon: isTokenExpiringSoon(config),
      daysUntilExpiry: getDaysUntilTokenExpiry(config) ?? undefined,
      hasActiveSession: currentSession !== null,
      lastSync: undefined, // TODO: Get from Dataverse
    }
  } catch (error) {
    return {
      isConnected: false,
      environment: config.environment,
      nip: config.nip,
      tokenExpiringSoon: false,
      hasActiveSession: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Make authenticated request to KSeF API
 */
export async function ksefRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    sessionToken?: string
  } = {}
): Promise<T> {
  const config = getKsefConfig()
  const { method = 'GET', body, sessionToken } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Add session token if available
  if (sessionToken) {
    headers['SessionToken'] = sessionToken
  }

  const url = `${config.baseUrl}${path}`

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`KSeF API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json() as Promise<T>
}

/**
 * Get current session (if active)
 */
export function getCurrentSession(): { token: string; createdAt: Date } | null {
  return currentSession
}

/**
 * Set current session
 */
export function setCurrentSession(session: { token: string; createdAt: Date } | null): void {
  currentSession = session
}
