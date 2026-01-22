/**
 * KSeF Session Management
 * Handles interactive and batch sessions with KSeF API
 */

import { getKsefConfig } from './config'
import { getSecret } from '../keyvault/secrets'
import {
  KsefSession,
  KsefSessionStatus,
  KsefAuthChallengeResponse,
  KsefInitSessionResponse,
  KsefTerminateSessionResponse,
} from './types'
import { SignedXML } from 'xml-crypto'
import * as crypto from 'crypto'

// Active session storage (in-memory for now, should be in Dataverse for production)
let activeSession: KsefSession | null = null

/**
 * Start a new interactive session with KSeF
 */
export async function initSession(nip: string): Promise<KsefSession> {
  const config = getKsefConfig()
  
  // Step 1: Request authorization challenge
  const challenge = await requestAuthChallenge(nip)
  
  // Step 2: Get token from Key Vault
  const token = await getSecret(`ksef-token-${nip}`)
  if (!token) {
    throw new Error(`Token not found for NIP: ${nip}`)
  }
  
  // Step 3: Sign the challenge with the token
  const signedChallenge = await signChallenge(challenge.challenge, token)
  
  // Step 4: Initialize session with signed challenge
  const sessionResponse = await initSessionWithChallenge(
    nip,
    challenge.timestamp,
    signedChallenge
  )
  
  // Step 5: Store session
  activeSession = {
    sessionId: sessionResponse.sessionToken.token,
    referenceNumber: sessionResponse.referenceNumber,
    nip,
    sessionToken: sessionResponse.sessionToken.token,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    status: 'active',
    invoicesProcessed: 0,
  }
  
  return activeSession
}

/**
 * Request authorization challenge from KSeF
 */
async function requestAuthChallenge(nip: string): Promise<KsefAuthChallengeResponse> {
  const config = getKsefConfig()
  
  const response = await fetch(`${config.baseUrl}/online/Session/AuthorisationChallenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      contextIdentifier: {
        type: 'onip',
        identifier: nip,
      },
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get auth challenge: ${response.status} - ${error}`)
  }
  
  return response.json()
}

/**
 * Sign the challenge using the authorization token
 */
async function signChallenge(challenge: string, token: string): Promise<string> {
  // Create signature using the token as key
  // In production, this would use proper XML signature with certificate
  const hmac = crypto.createHmac('sha256', token)
  hmac.update(challenge)
  return hmac.digest('base64')
}

/**
 * Initialize session with signed challenge
 */
async function initSessionWithChallenge(
  nip: string,
  timestamp: string,
  signedChallenge: string
): Promise<KsefInitSessionResponse> {
  const config = getKsefConfig()
  
  // Build InitSession request
  const initRequest = {
    context: {
      contextIdentifier: {
        type: 'onip',
        identifier: nip,
      },
      contextName: {
        type: 'onip',
        tradeName: `KSeF Integration - ${nip}`,
      },
    },
    signedInitSessionRequest: {
      request: {
        challengeTimestamp: timestamp,
      },
      signature: signedChallenge,
    },
  }
  
  const response = await fetch(`${config.baseUrl}/online/Session/InitSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(initRequest),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to init session: ${response.status} - ${error}`)
  }
  
  return response.json()
}

/**
 * Get the current active session
 */
export function getActiveSession(): KsefSession | null {
  if (!activeSession) {
    return null
  }
  
  // Check if session is expired
  if (activeSession.expiresAt < new Date()) {
    activeSession.status = 'expired'
    return null
  }
  
  return activeSession
}

/**
 * Terminate the current session
 */
export async function terminateSession(): Promise<KsefTerminateSessionResponse> {
  if (!activeSession) {
    throw new Error('No active session to terminate')
  }
  
  const config = getKsefConfig()
  
  const response = await fetch(`${config.baseUrl}/online/Session/Terminate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      SessionToken: activeSession.sessionToken,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to terminate session: ${response.status} - ${error}`)
  }
  
  const result: KsefTerminateSessionResponse = await response.json()
  
  // Clear session
  activeSession = {
    ...activeSession,
    status: 'terminated',
    terminatedAt: new Date(),
  }
  
  const terminatedSession = activeSession
  activeSession = null
  
  return result
}

/**
 * Get session status from KSeF
 */
export async function getSessionStatus(): Promise<KsefSessionStatus> {
  if (!activeSession) {
    return {
      isActive: false,
      reason: 'No active session',
    }
  }
  
  const config = getKsefConfig()
  
  try {
    const response = await fetch(`${config.baseUrl}/online/Session/Status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        SessionToken: activeSession.sessionToken,
      },
    })
    
    if (!response.ok) {
      activeSession.status = 'error'
      return {
        isActive: false,
        reason: `Session check failed: ${response.status}`,
      }
    }
    
    const status = await response.json()
    
    return {
      isActive: true,
      sessionId: activeSession.sessionId,
      createdAt: activeSession.createdAt,
      expiresAt: activeSession.expiresAt,
      invoicesProcessed: activeSession.invoicesProcessed,
    }
  } catch (error) {
    return {
      isActive: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Refresh session if needed
 */
export async function ensureActiveSession(nip: string): Promise<KsefSession> {
  const session = getActiveSession()
  
  if (!session) {
    return initSession(nip)
  }
  
  // Check if session is about to expire (less than 10 minutes)
  const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000)
  if (session.expiresAt < tenMinutesFromNow) {
    // Terminate old session and start new one
    await terminateSession()
    return initSession(nip)
  }
  
  return session
}
