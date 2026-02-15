/**
 * Microsoft Graph API Service
 * 
 * Provides access to user profiles, avatars, and group memberships.
 * Uses MSAL for token acquisition.
 */

import { getMsalInstance, graphScopes, groupsScopes } from './auth-config'
import { authLogger } from './auth-logger'

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

/**
 * Cache for user avatars (blob URLs)
 * Key: userId, Value: { url: string, timestamp: number }
 */
const avatarCache = new Map<string, { url: string; timestamp: number }>()
const AVATAR_CACHE_TTL = 1000 * 60 * 30 // 30 minutes

/**
 * Get access token for Graph API
 */
async function getGraphToken(): Promise<string | null> {
  try {
    const msalInstance = getMsalInstance()
    const accounts = msalInstance.getAllAccounts()
    
    if (accounts.length === 0) {
      return null
    }
    
    const response = await msalInstance.acquireTokenSilent({
      ...graphScopes,
      account: accounts[0],
    })
    
    return response.accessToken
  } catch (error) {
    authLogger.tokenFailed(error, 'Graph API token acquisition failed')
    return null
  }
}

/**
 * Fetch current user's profile photo as blob URL
 * Returns null if photo not available
 */
export async function getUserPhoto(userId?: string): Promise<string | null> {
  const cacheKey = userId || 'me'
  
  // Check cache
  const cached = avatarCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < AVATAR_CACHE_TTL) {
    return cached.url
  }
  
  try {
    const token = await getGraphToken()
    if (!token) return null
    
    const endpoint = userId 
      ? `${GRAPH_API_BASE}/users/${userId}/photo/$value`
      : `${GRAPH_API_BASE}/me/photo/$value`
    
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      // 404 = no photo, not an error
      if (response.status === 404) {
        return null
      }
      throw new Error(`Graph API error: ${response.status}`)
    }
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    // Cache the blob URL
    avatarCache.set(cacheKey, { url, timestamp: Date.now() })
    
    const msalInstance = getMsalInstance()
    const account = msalInstance.getAllAccounts()[0]
    authLogger.avatarLoaded(account?.username || 'unknown')
    
    return url
  } catch (error) {
    authLogger.avatarFailed(error)
    return null
  }
}

/**
 * Fetch user's group memberships from Graph API
 * Used as fallback when groups claim has overage (>200 groups)
 */
export async function getUserGroups(): Promise<string[]> {
  try {
    const token = await getGraphToken()
    if (!token) return []
    
    const msalInstance = getMsalInstance()
    const account = msalInstance.getAllAccounts()[0]
    
    authLogger.groupsOverage(account?.username || 'unknown')
    
    // Try to get token with GroupMember.Read.All scope
    let groupsToken = token
    try {
      const groupsResponse = await msalInstance.acquireTokenSilent({
        ...groupsScopes,
        account: account,
      })
      groupsToken = groupsResponse.accessToken
    } catch {
      // Fall back to regular token - may have limited access
      authLogger.warn('Could not acquire GroupMember.Read.All scope, using basic token')
    }
    
    const response = await fetch(`${GRAPH_API_BASE}/me/memberOf`, {
      headers: {
        Authorization: `Bearer ${groupsToken}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Filter for security groups only
    const groups = data.value
      .filter((item: { '@odata.type'?: string; securityEnabled?: boolean }) => 
        item['@odata.type'] === '#microsoft.graph.group' && item.securityEnabled === true
      )
      .map((group: { id: string }) => group.id)
    
    return groups
  } catch (error) {
    authLogger.groupsFailed(error)
    return []
  }
}

/**
 * Get basic user profile from Graph API
 */
export async function getUserProfile(): Promise<{
  id: string
  displayName: string
  mail: string
  userPrincipalName: string
} | null> {
  try {
    const token = await getGraphToken()
    if (!token) return null
    
    const response = await fetch(`${GRAPH_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    authLogger.error('PROFILE_FAILED', { error })
    return null
  }
}

/**
 * Cleanup avatar cache (revoke blob URLs)
 */
export function cleanupAvatarCache(): void {
  for (const [, { url }] of avatarCache) {
    URL.revokeObjectURL(url)
  }
  avatarCache.clear()
}

/**
 * Get cached avatar URL without fetching
 */
export function getCachedAvatar(userId?: string): string | null {
  const cacheKey = userId || 'me'
  const cached = avatarCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < AVATAR_CACHE_TTL) {
    return cached.url
  }
  
  return null
}
