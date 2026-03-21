/**
 * Microsoft Graph API Client (Client Credentials Flow)
 *
 * Used by the API backend to read Entra ID group members
 * without a user context. Requires app registration with
 * `GroupMember.Read.All` application permission + admin consent.
 */

import { ConfidentialClientApplication } from '@azure/msal-node'

// ─── Configuration ───────────────────────────────────────────────

const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

// ─── MSAL Confidential Client ───────────────────────────────────

let ccaInstance: ConfidentialClientApplication | null = null

function getCca(): ConfidentialClientApplication {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Graph client requires AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET',
    )
  }

  if (!ccaInstance) {
    ccaInstance = new ConfidentialClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        clientSecret: CLIENT_SECRET,
      },
    })
  }

  return ccaInstance
}

async function getGraphToken(): Promise<string> {
  const cca = getCca()
  const result = await cca.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })

  if (!result?.accessToken) {
    throw new Error('Failed to acquire Graph API token via client credentials')
  }

  return result.accessToken
}

// ─── Cache ──────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Clear the group members cache (e.g. for manual refresh) */
export function clearGraphCache(): void {
  cache.clear()
}

// ─── API Functions ──────────────────────────────────────────────

export interface GraphGroupMember {
  id: string
  displayName: string
  mail: string | null
  userPrincipalName: string
}

/**
 * List members of an Entra ID security group.
 *
 * Uses client credentials flow (application permission).
 * Results are cached for 5 minutes.
 */
export async function listGroupMembers(
  groupId: string,
): Promise<GraphGroupMember[]> {
  const cacheKey = `group-members:${groupId}`
  const cached = getCached<GraphGroupMember[]>(cacheKey)
  if (cached) return cached

  const token = await getGraphToken()
  const members: GraphGroupMember[] = []

  // Use OData type cast to request only user-typed members.
  // This ensures displayName, mail, userPrincipalName are returned
  // with just GroupMember.Read.All (no extra User.Read.All needed).
  let url: string | null =
    `${GRAPH_API_BASE}/groups/${encodeURIComponent(groupId)}/members/microsoft.graph.user?$select=id,displayName,mail,userPrincipalName&$top=999`

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Graph API error ${response.status}: ${errorBody}`,
      )
    }

    const body = (await response.json()) as {
      value: Array<{ id: string; displayName?: string; mail?: string; userPrincipalName?: string }>
      '@odata.nextLink'?: string
    }

    for (const m of body.value) {
      members.push({
        id: m.id,
        displayName: m.displayName ?? '',
        mail: m.mail ?? null,
        userPrincipalName: m.userPrincipalName ?? '',
      })
    }

    url = body['@odata.nextLink'] ?? null
  }

  setCache(cacheKey, members)
  return members
}
