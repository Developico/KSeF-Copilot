/**
 * KSeF Session Management
 * Handles authentication with KSeF API 2.0
 * Updated for KSeF 2.0 (effective from February 1, 2026)
 */

import { getKsefConfigForNip, type KsefConfig } from './config'
import { getSecret } from '../keyvault/secrets'
import {
  KsefSession,
  KsefSessionStatus,
  KsefAuthChallengeResponse,
  KsefInitSessionResponse,
  KsefTerminateSessionResponse,
} from './types'
import * as crypto from 'crypto'
import { sessionService, settingService } from '../dataverse/services'
import { dataverseClient } from '../dataverse/client'
import { DV, SESSION_STATUS, KSEF_ENVIRONMENT } from '../dataverse/config'
import { escapeOData } from '../dataverse/odata-utils'
import type { DvSession } from '../../types/dataverse'

// Active session storage (in-memory for now, should be in Dataverse for production)
// Key: "NIP:environment" to ensure sessions are not reused across environments
interface SessionCache {
  session: KsefSession
  environment: string // 'test' | 'demo' | 'prod'
}
let activeSessionCache: SessionCache | null = null

// Cache for MF public key - per environment (different certs per environment)
const mfPublicKeyCache: Map<string, string> = new Map()

// ============================================================================
// Rate Limiting for KSeF API calls
// ============================================================================
interface RateLimitEntry {
  count: number
  resetAt: number
}
const rateLimitCache: Map<string, RateLimitEntry> = new Map()

const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 requests per minute per operation type

/**
 * Check and update rate limit for an operation
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(operation: string): boolean {
  const now = Date.now()
  const entry = rateLimitCache.get(operation)
  
  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitCache.set(operation, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const waitSeconds = Math.ceil((entry.resetAt - now) / 1000)
    console.warn(`[KSEF] Rate limit reached for ${operation}. Wait ${waitSeconds}s before next request.`)
    return false
  }
  
  entry.count++
  return true
}

/**
 * Get rate limit status for an operation
 */
export function getRateLimitStatus(operation: string): { remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitCache.get(operation)
  
  if (!entry || now > entry.resetAt) {
    return { remaining: RATE_LIMIT_MAX_REQUESTS, resetIn: 0 }
  }
  
  return {
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  }
}

/**
 * Decode JWT token and extract payload (without verification)
 * Useful for debugging token permissions
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('[KSEF] Invalid JWT format - expected 3 parts')
      return null
    }
    
    // Decode base64url payload (second part)
    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as Record<string, unknown>
  } catch (error) {
    console.error('[KSEF] Failed to decode JWT:', error)
    return null
  }
}

/**
 * Get MF public key for token encryption
 */
async function getMfPublicKey(config: KsefConfig): Promise<string> {
  // Check cache for this environment
  const cachedKey = mfPublicKeyCache.get(config.environment)
  if (cachedKey) return cachedKey
  
  const url = `${config.baseUrl}/security/public-key-certificates`
  console.log(`[KSEF] Fetching MF public key from: ${url} (env: ${config.environment})`)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get MF public key: ${response.status}`)
  }
  
  const certificates = await response.json() as Array<{
    certificate: string
    validFrom: string
    validTo: string
    usage: string[]
  }>
  
  // Find certificate for KsefTokenEncryption
  const tokenCert = certificates.find(c => c.usage.includes('KsefTokenEncryption'))
  if (!tokenCert) {
    throw new Error('No certificate found for KsefTokenEncryption')
  }
  
  // Cache per environment
  mfPublicKeyCache.set(config.environment, tokenCert.certificate)
  return tokenCert.certificate
}

/**
 * Encrypt token with MF public key using RSA-OAEP (SHA-256)
 */
async function encryptToken(token: string, timestampMs: number, publicKeyBase64: string): Promise<string> {
  // Format: token|timestamp
  const payload = `${token}|${timestampMs}`
  
  // Decode the DER certificate from base64
  const certDer = Buffer.from(publicKeyBase64, 'base64')
  
  // Convert DER certificate to PEM format
  const certPem = `-----BEGIN CERTIFICATE-----\n${certDer.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`
  
  // Create X509Certificate and extract public key
  const x509 = new crypto.X509Certificate(certPem)
  const publicKey = x509.publicKey
  
  // Encrypt with RSA-OAEP and SHA-256
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(payload, 'utf-8')
  )
  
  return encrypted.toString('base64')
}

/**
 * Start a new session with KSeF API 2.0
 */
export async function initSession(nip: string): Promise<KsefSession> {
  // Check rate limit before making API calls
  if (!checkRateLimit('initSession')) {
    const status = getRateLimitStatus('initSession')
    throw new Error(`Rate limit exceeded. Please wait ${status.resetIn} seconds before starting a new session.`)
  }
  
  // Get config from Dataverse for this NIP
  const config = await getKsefConfigForNip(nip)
  
  // Step 1: Request authorization challenge
  const challenge = await requestAuthChallenge(config)
  
  // Step 2: Get token from Key Vault
  const token = await getSecret(config.tokenSecretName)
  if (!token) {
    throw new Error(`Token not found for NIP: ${nip} (secret: ${config.tokenSecretName})`)
  }
  
  // Step 3: Get MF public key and encrypt token
  const publicKey = await getMfPublicKey(config)
  const encryptedToken = await encryptToken(token, challenge.timestampMs, publicKey)
  
  // Step 4: Authenticate with encrypted token
  const authResponse = await authenticateWithToken(nip, challenge.challenge, encryptedToken, config)
  
  // Step 5: Wait for authentication to complete (poll status)
  await waitForAuthenticationComplete(
    authResponse.referenceNumber,
    authResponse.authenticationToken.token,
    config
  )
  
  // Step 6: Redeem access and refresh tokens
  const tokens = await redeemTokens(authResponse.authenticationToken.token, config)
  
  // Step 7: Store session with environment info
  const session: KsefSession = {
    sessionId: authResponse.referenceNumber,
    referenceNumber: authResponse.referenceNumber,
    nip,
    sessionToken: tokens.accessToken.token,
    refreshToken: tokens.refreshToken.token,
    createdAt: new Date(),
    expiresAt: new Date(tokens.accessToken.validUntil),
    status: 'active',
    invoicesProcessed: 0,
  }
  
  activeSessionCache = {
    session,
    environment: config.environment,
  }
  console.log(`[KSEF] Session created for NIP: ${nip}, environment: ${config.environment}`)
  
  // Step 8: Persist session to Dataverse for durability
  try {
    // Map environment string to Dataverse option set value
    const envMap: Record<string, number> = {
      'test': KSEF_ENVIRONMENT.TEST,
      'demo': KSEF_ENVIRONMENT.DEMO,
      'prod': KSEF_ENVIRONMENT.PRODUCTION,
    }
    const envValue = envMap[config.environment] || KSEF_ENVIRONMENT.TEST
    
    const setting = await settingService.getByNipAndEnvironment(nip, envValue)
    if (setting) {
      await sessionService.create({
        sessionReference: session.referenceNumber,
        settingId: setting.id,
        nip: session.nip,
        sessionType: 'interactive',
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt.toISOString(),
      })
      console.log(`[KSEF] Session persisted to Dataverse: ${session.referenceNumber}`)
    } else {
      console.warn(`[KSEF] Could not find setting for NIP ${nip}, session not persisted to Dataverse`)
    }
  } catch (error) {
    // Log but don't fail - in-memory session is still valid
    console.error(`[KSEF] Failed to persist session to Dataverse:`, error)
  }
  
  return session
}

/**
 * Request authorization challenge from KSeF API 2.0
 * POST /auth/challenge
 */
async function requestAuthChallenge(config: KsefConfig): Promise<KsefAuthChallengeResponse> {
  const url = `${config.baseUrl}/auth/challenge`
  console.log(`[KSEF] Requesting auth challenge from: ${url}`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
  })
  
  const responseText = await response.text()
  console.log(`[KSEF] Auth challenge response status: ${response.status}, content-type: ${response.headers.get('content-type')}`)
  
  if (!response.ok) {
    console.error(`[KSEF] Auth challenge failed:`, responseText.substring(0, 500))
    throw new Error(`Failed to get auth challenge: ${response.status} - ${responseText.substring(0, 200)}`)
  }
  
  // Check if response is JSON
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    console.error(`[KSEF] Unexpected content-type: ${contentType}, body: ${responseText.substring(0, 500)}`)
    
    // Check for common KSeF maintenance messages
    if (responseText.includes('zamknięcie') || responseText.includes('maintenance') || responseText.includes('niedostępn')) {
      throw new Error(`Środowisko KSeF ${config.environment} jest tymczasowo niedostępne. Spróbuj ponownie później.`)
    }
    
    throw new Error(`KSeF API zwróciło nieoczekiwaną odpowiedź (${contentType}). Sprawdź czy środowisko ${config.environment} jest dostępne.`)
  }
  
  try {
    return JSON.parse(responseText) as KsefAuthChallengeResponse
  } catch (e) {
    console.error(`[KSEF] Failed to parse JSON:`, responseText.substring(0, 500))
    throw new Error(`Failed to parse KSeF response as JSON`)
  }
}

/**
 * Authenticate with KSeF token
 * POST /auth/ksef-token
 */
async function authenticateWithToken(
  nip: string,
  challenge: string,
  encryptedToken: string,
  config: KsefConfig
): Promise<{ referenceNumber: string; authenticationToken: { token: string; validUntil: string } }> {
  const url = `${config.baseUrl}/auth/ksef-token`
  console.log(`[KSEF] Authenticating with token at: ${url}`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      challenge,
      contextIdentifier: {
        type: 'Nip',
        value: nip,
      },
      encryptedToken,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error(`[KSEF] Token auth failed:`, error.substring(0, 500))
    throw new Error(`Failed to authenticate with token: ${response.status} - ${error.substring(0, 200)}`)
  }
  
  return response.json() as Promise<{ referenceNumber: string; authenticationToken: { token: string; validUntil: string } }>
}

/**
 * Poll authentication status until ready
 * GET /auth/{referenceNumber}
 * 
 * Status codes:
 * - 100: Processing (authentication in progress)
 * - 200: Success (ready for token redemption)
 * - 4xx/5xx: Error
 */
async function waitForAuthenticationComplete(
  referenceNumber: string,
  authToken: string,
  config: KsefConfig,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<void> {
  const url = `${config.baseUrl}/auth/${referenceNumber}`
  console.log(`[KSEF] Polling authentication status at: ${url}`)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })
    
    const responseText = await response.text()
    console.log(`[KSEF] Auth status check attempt ${attempt}/${maxAttempts}: HTTP ${response.status}`)
    console.log(`[KSEF] Auth status response body: ${responseText.substring(0, 500)}`)
    
    if (response.ok) {
      try {
        const statusData = JSON.parse(responseText) as { 
          processingCode?: number
          processingDescription?: string
          authenticationStatus?: number
          status?: { code?: number; description?: string } | string
          state?: string
          isTokenRedeemed?: boolean
          startDate?: string
          authenticationMethod?: string
        }
        
        // KSeF 2.0 returns status as nested object: { status: { code: 200, description: "..." } }
        // KSeF 1.0 returned processingCode directly
        let statusCode = statusData.processingCode || statusData.authenticationStatus || 0
        let statusDescription = statusData.processingDescription || ''
        
        // Handle KSeF 2.0 nested status object
        if (typeof statusData.status === 'object' && statusData.status !== null) {
          statusCode = statusData.status.code || statusCode
          statusDescription = statusData.status.description || statusDescription
        }
        
        console.log(`[KSEF] Auth status: ${statusCode} - ${statusDescription || statusData.state || 'unknown'}`)
        
        // Status 200 = success, ready to redeem
        if (statusCode === 200) {
          console.log(`[KSEF] Authentication complete, ready for token redemption`)
          return
        }
        
        // If response is OK but no processingCode, check for other success indicators
        if (statusCode === 0 && response.status === 200) {
          // Check if response contains success indicators
          const stateValue = typeof statusData.status === 'string' ? statusData.status : statusData.state
          if (stateValue === 'completed' || stateValue === 'ready' || Object.keys(statusData).length === 0) {
            console.log(`[KSEF] Authentication complete (inferred from response)`)
            return
          }
        }
        
        // Status 100 = still processing
        if (statusCode === 100) {
          console.log(`[KSEF] Authentication still processing, waiting ${delayMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        }
        
        // Other status codes = error
        throw new Error(`Authentication failed with status ${statusCode}: ${statusDescription || JSON.stringify(statusData).substring(0, 200)}`)
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.log(`[KSEF] Non-JSON response, assuming success`)
          return
        }
        throw e
      }
    }
    
    // If we get 400 with status 100, it means auth is still in progress
    if (response.status === 400 || response.status === 202) {
      console.log(`[KSEF] Authentication still in progress (HTTP ${response.status}), waiting ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      continue
    }
    
    // Other errors
    if (!response.ok) {
      throw new Error(`Failed to check auth status: ${response.status} - ${responseText.substring(0, 200)}`)
    }
  }
  
  throw new Error(`Authentication timed out after ${maxAttempts} attempts`)
}

/**
 * Redeem access and refresh tokens
 * POST /auth/token/redeem
 */
async function redeemTokens(
  authToken: string,
  config: KsefConfig
): Promise<{ accessToken: { token: string; validUntil: string }; refreshToken: { token: string; validUntil: string } }> {
  const url = `${config.baseUrl}/auth/token/redeem`
  console.log(`[KSEF] Redeeming tokens at: ${url}`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({}),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error(`[KSEF] Token redeem failed:`, error.substring(0, 500))
    throw new Error(`Failed to redeem tokens: ${response.status} - ${error.substring(0, 200)}`)
  }
  
  return response.json() as Promise<{ accessToken: { token: string; validUntil: string }; refreshToken: { token: string; validUntil: string } }>
}

/**
 * Get the current active session (sync, in-memory only)
 */
export function getActiveSession(): KsefSession | null {
  if (!activeSessionCache) {
    return null
  }
  
  const { session } = activeSessionCache
  
  // Check if session is expired
  if (session.expiresAt && session.expiresAt < new Date()) {
    session.status = 'expired'
    return null
  }
  
  return session
}

/**
 * Get the current active session with Dataverse fallback (async)
 * This should be used when accurate session status is needed
 */
export async function getActiveSessionAsync(nip?: string): Promise<KsefSession | null> {
  // First check in-memory cache
  if (activeSessionCache) {
    const { session } = activeSessionCache
    
    // Check if session is expired
    if (session.expiresAt && session.expiresAt < new Date()) {
      session.status = 'expired'
      return null
    }
    
    // If NIP is provided, check it matches
    if (nip && session.nip !== nip) {
      // Try Dataverse for the specific NIP
    } else {
      return session
    }
  }
  
  // Fallback to Dataverse
  console.log(`[KSEF] Checking Dataverse for active session${nip ? ` for NIP: ${nip}` : ''}...`)
  
  try {
    const s = DV.session
    const filter = nip 
      ? `${s.nip} eq '${escapeOData(nip)}' and ${s.status} eq ${SESSION_STATUS.ACTIVE}`
      : `${s.status} eq ${SESSION_STATUS.ACTIVE}`
    const query = `$filter=${filter}&$orderby=${s.startedAt} desc&$top=1`
    
    const response = await dataverseClient.list<DvSession>(s.entitySet, query)
    
    if (response.value.length === 0) {
      return null
    }
    
    const dvSession = response.value[0]
    
    // Check if session is expired
    if (dvSession.dvlp_expiresat && new Date(dvSession.dvlp_expiresat) < new Date()) {
      return null
    }
    
    // Convert to KsefSession format
    const session: KsefSession = {
      sessionId: dvSession.dvlp_ksefsessionid,
      referenceNumber: dvSession.dvlp_sessionreference,
      nip: dvSession.dvlp_nip,
      sessionToken: dvSession.dvlp_sessiontoken || '',
      createdAt: new Date(dvSession.dvlp_startedat),
      expiresAt: dvSession.dvlp_expiresat ? new Date(dvSession.dvlp_expiresat) : new Date(Date.now() + 3600000), // Default 1 hour if not set
      status: 'active',
      invoicesProcessed: dvSession.dvlp_invoicesprocessed || 0,
    }
    
    console.log(`[KSEF] Found active session in Dataverse: ${session.referenceNumber}`)
    return session
  } catch (error) {
    console.error(`[KSEF] Failed to query Dataverse for session:`, error)
    return null
  }
}

/**
 * Get the current session with environment info
 */
export function getActiveSessionWithEnv(): SessionCache | null {
  if (!activeSessionCache) {
    return null
  }
  
  const { session } = activeSessionCache
  
  // Check if session is expired
  if (session.expiresAt && session.expiresAt < new Date()) {
    session.status = 'expired'
    return null
  }
  
  return activeSessionCache
}

/**
 * Terminate the current session (KSeF API 2.0)
 * DELETE /auth/sessions/current
 * 
 * Falls back to Dataverse if in-memory cache is empty (e.g., after function restart)
 */
export async function terminateSession(nip?: string): Promise<KsefTerminateSessionResponse> {
  let sessionNip: string
  let sessionToken: string | undefined
  let sessionReferenceNumber: string
  let environment: string
  let dvSessionId: string | undefined
  
  if (activeSessionCache) {
    // Use in-memory cache
    const { session, environment: env } = activeSessionCache
    sessionNip = session.nip
    sessionToken = session.refreshToken || session.sessionToken
    sessionReferenceNumber = session.referenceNumber
    environment = env
    console.log(`[KSEF] Terminating session from memory cache for NIP: ${sessionNip}`)
  } else {
    // Fallback: Try to find active session in Dataverse
    console.log(`[KSEF] No in-memory session cache, checking Dataverse for active session...`)
    
    // If NIP is provided, use it; otherwise we need to find any active session
    let dvSession: DvSession | null = null
    
    if (nip) {
      // Query Dataverse for active session by NIP
      const s = DV.session
      const filter = `${s.nip} eq '${escapeOData(nip)}' and ${s.status} eq ${SESSION_STATUS.ACTIVE}`
      const query = `$filter=${filter}&$orderby=${s.startedAt} desc&$top=1`
      
      try {
        const response = await dataverseClient.list<DvSession>(s.entitySet, query)
        if (response.value.length > 0) {
          dvSession = response.value[0]
        }
      } catch (error) {
        console.error(`[KSEF] Failed to query Dataverse for session:`, error)
      }
    } else {
      // No NIP provided and no in-memory cache - find any active session
      const s = DV.session
      const filter = `${s.status} eq ${SESSION_STATUS.ACTIVE}`
      const query = `$filter=${filter}&$orderby=${s.startedAt} desc&$top=1`
      
      try {
        const response = await dataverseClient.list<DvSession>(s.entitySet, query)
        if (response.value.length > 0) {
          dvSession = response.value[0]
        }
      } catch (error) {
        console.error(`[KSEF] Failed to query Dataverse for session:`, error)
      }
    }
    
    if (!dvSession) {
      throw new Error('No active session to terminate')
    }
    
    sessionNip = dvSession.dvlp_nip
    sessionToken = dvSession.dvlp_sessiontoken
    sessionReferenceNumber = dvSession.dvlp_sessionreference
    dvSessionId = dvSession.dvlp_ksefsessionid
    
    // Determine environment from setting
    const config = await getKsefConfigForNip(sessionNip)
    environment = config.environment
    
    console.log(`[KSEF] Found active session in Dataverse: ${sessionReferenceNumber} for NIP: ${sessionNip}`)
    
    if (!sessionToken) {
      console.warn(`[KSEF] Session token not stored in Dataverse, marking session as terminated without calling KSeF API`)
      // Mark session as terminated in Dataverse even if we can't call KSeF API
      if (dvSessionId) {
        await markDvSessionTerminated(dvSessionId)
      }
      return {
        timestamp: new Date().toISOString(),
        referenceNumber: sessionReferenceNumber,
        processingCode: 200,
        processingDescription: 'Session terminated (token not available)',
      }
    }
  }
  
  // Get config from Dataverse based on session NIP
  const config = await getKsefConfigForNip(sessionNip)
  console.log(`[KSEF] Terminating session for NIP: ${sessionNip}, environment: ${environment}`)
  
  // Call KSeF API to terminate session
  const response = await fetch(`${config.baseUrl}/auth/sessions/current`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
  })
  
  if (!response.ok && response.status !== 204) {
    const error = await response.text()
    // If session already terminated on KSeF side (404), still clean up locally
    if (response.status === 404 || response.status === 401) {
      console.warn(`[KSEF] Session may already be terminated on KSeF side (${response.status}), cleaning up locally`)
    } else {
      throw new Error(`Failed to terminate session: ${response.status} - ${error}`)
    }
  }
  
  // Clear in-memory session
  activeSessionCache = null
  
  // Mark session as terminated in Dataverse if we found it there
  if (dvSessionId) {
    await markDvSessionTerminated(dvSessionId)
  }
  
  return {
    timestamp: new Date().toISOString(),
    referenceNumber: sessionReferenceNumber,
    processingCode: 200,
    processingDescription: 'Session terminated',
  }
}

/**
 * Mark a Dataverse session as terminated
 */
async function markDvSessionTerminated(sessionId: string): Promise<void> {
  try {
    const s = DV.session
    const payload: Record<string, unknown> = {
      [s.status]: SESSION_STATUS.TERMINATED,
      [s.terminatedAt]: new Date().toISOString(),
    }
    await dataverseClient.update(s.entitySet, sessionId, payload)
    console.log(`[KSEF] Marked session ${sessionId} as terminated in Dataverse`)
  } catch (error) {
    console.error(`[KSEF] Failed to mark session as terminated in Dataverse:`, error)
    // Don't throw - the KSeF termination was successful
  }
}

/**
 * Get session status (KSeF API 2.0)
 * GET /auth/{referenceNumber}
 */
export async function getSessionStatus(): Promise<KsefSessionStatus> {
  if (!activeSessionCache) {
    return {
      isActive: false,
      reason: 'No active session',
    }
  }
  
  const { session, environment } = activeSessionCache
  
  // Check if session is expired based on local data
  if (session.expiresAt && session.expiresAt < new Date()) {
    session.status = 'expired'
    return {
      isActive: false,
      reason: 'Session expired',
    }
  }
  
  return {
    isActive: true,
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    invoicesProcessed: session.invoicesProcessed,
    environment, // Include environment in status
  } as KsefSessionStatus
}

/**
 * Refresh session if needed
 */
export async function ensureActiveSession(nip: string): Promise<KsefSession> {
  // Get config first to know which environment we need
  const config = await getKsefConfigForNip(nip)
  const cached = getActiveSessionWithEnv()
  
  if (!cached) {
    console.log(`[KSEF] No active session, creating new one for NIP: ${nip}, environment: ${config.environment}`)
    return initSession(nip)
  }
  
  const { session, environment } = cached
  
  // Check if the session belongs to the requested NIP AND environment
  // Each NIP+environment combination requires its own authenticated session
  if (session.nip !== nip) {
    console.log(`[KSEF] Session NIP mismatch: active session is for ${session.nip}, but requested ${nip}. Terminating and creating new session.`)
    await terminateSession()
    return initSession(nip)
  }
  
  // Check if the environment matches - critical for TEST/DEMO/PROD isolation
  if (environment !== config.environment) {
    console.log(`[KSEF] Session environment mismatch: active session is for ${environment}, but requested ${config.environment}. Terminating and creating new session.`)
    await terminateSession()
    return initSession(nip)
  }
  
  // Check if session is about to expire (less than 10 minutes)
  const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000)
  if (session.expiresAt && session.expiresAt < tenMinutesFromNow) {
    console.log(`[KSEF] Session expiring soon, creating new one for NIP: ${nip}, environment: ${config.environment}`)
    await terminateSession()
    return initSession(nip)
  }
  
  console.log(`[KSEF] Reusing active session for NIP: ${nip}, environment: ${environment}`)
  return session
}
