import { HttpRequest } from '@azure/functions'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { AuthResult, AuthUser, RoleCheckResult } from '../../types/api'
import { checkHttpRateLimit } from './rate-limit'

// =============================================================================
// Security Configuration
// =============================================================================

// CRITICAL: Validate that SKIP_AUTH is never enabled in production
if (process.env.NODE_ENV === 'production' && process.env.SKIP_AUTH === 'true') {
  throw new Error('FATAL: SKIP_AUTH cannot be enabled in production! This is a critical security violation.')
}

// Allow bypassing auth ONLY in non-production with explicit flag
const DEV_MODE = process.env.NODE_ENV !== 'production' && process.env.SKIP_AUTH === 'true'

// Azure Entra ID configuration
const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID

// JWKS URI for token signature verification
const JWKS_URI = TENANT_ID 
  ? `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
  : null

// Cache JWKS for performance
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (!JWKS_URI) {
    throw new Error('AZURE_TENANT_ID is required for JWT verification')
  }
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URI))
  }
  return jwks
}

// =============================================================================
// JWT Verification
// =============================================================================

/**
 * Verify JWT token from Authorization header
 * Uses Azure Entra ID JWKS for cryptographic signature verification
 */
export async function verifyAuth(request: HttpRequest): Promise<AuthResult> {
  // Development mode - bypass auth (ONLY in non-production with explicit flag)
  if (DEV_MODE) {
    console.warn('[AUTH] ⚠️ Running in DEV_MODE - authentication bypassed!')
    return {
      success: true,
      user: {
        id: process.env.DEV_USER_OID || 'dev-user',
        email: process.env.DEV_USER_EMAIL || 'dev@localhost',
        name: process.env.DEV_USER_NAME || 'Dev User',
        roles: ['Admin'],
      },
    }
  }

  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.substring(7)

  try {
    // Verify JWT signature using Azure Entra ID JWKS
    // Accept both "api://<client-id>" and bare "<client-id>" as valid audiences
    const validAudiences = CLIENT_ID ? [CLIENT_ID, `api://${CLIENT_ID}`] : undefined

    // Accept both v1.0 and v2.0 token issuers
    const validIssuers = TENANT_ID 
      ? [
          `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,  // v2.0 endpoint
          `https://sts.windows.net/${TENANT_ID}/`,                 // v1.0 endpoint
        ]
      : undefined

    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: validIssuers,
      audience: validAudiences,
    })

    const user: AuthUser = {
      id: (payload.oid as string) || (payload.sub as string) || '',
      email: (payload.email as string) || (payload.preferred_username as string) || '',
      name: (payload.name as string) || '',
      roles: extractRoles(payload),
    }

    return { success: true, user }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[AUTH] Token verification failed:', errorMessage)
    return { success: false, error: 'Token validation failed' }
  }
}

/**
 * Helper: extract caller IP from Azure Functions request headers
 */
function getCallerIp(request: HttpRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-client-ip') ||
    'unknown'
  )
}

/**
 * Rate-limit aware wrapper around verifyAuth.
 * Checks per-IP limit *before* expensive JWT verification,
 * then refines to per-user limit on success.
 *
 * Returns 429 info inside AuthResult when limit is exceeded.
 */
export async function verifyAuthWithRateLimit(
  request: HttpRequest,
  opts?: { windowMs?: number; maxRequests?: number },
): Promise<AuthResult & { retryAfterMs?: number }> {
  // Pre-auth: per-IP limit (protects JWT verification cost)
  const ip = getCallerIp(request)
  const ipCheck = checkHttpRateLimit(`ip:${ip}`, opts)
  if (!ipCheck.allowed) {
    return { success: false, error: 'Rate limit exceeded', retryAfterMs: ipCheck.retryAfterMs }
  }

  const result = await verifyAuth(request)

  // Post-auth: per-user tighter limit
  if (result.success && result.user) {
    const userCheck = checkHttpRateLimit(`user:${result.user.id}`, opts)
    if (!userCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfterMs: userCheck.retryAfterMs }
    }
  }

  return result
}

// =============================================================================
// Role Management
// =============================================================================

/**
 * Check if user has required role
 */
export function requireRole(
  user: AuthUser | undefined,
  requiredRole: 'Admin' | 'Reader'
): RoleCheckResult {
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Reject users with no roles (not assigned to any AD group)
  if (!user.roles || user.roles.length === 0) {
    return { success: false, error: 'No role assigned — contact your administrator' }
  }

  // Admin has access to everything
  if (user.roles.includes('Admin')) {
    return { success: true }
  }

  // Reader can access if Reader role is required
  if (requiredRole === 'Reader' && user.roles.includes('Reader')) {
    return { success: true }
  }

  return { success: false, error: `Role '${requiredRole}' required` }
}

// =============================================================================
// Role Extraction from JWT
// =============================================================================

// Security group to role mapping (from environment)
const GROUP_ROLE_MAPPING: Record<string, 'Admin' | 'Reader'> = {}

// Initialize group mapping from environment
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID || process.env.NEXT_PUBLIC_ADMIN_GROUP
const USER_GROUP_ID = process.env.USER_GROUP_ID || process.env.NEXT_PUBLIC_USER_GROUP

if (ADMIN_GROUP_ID) {
  GROUP_ROLE_MAPPING[ADMIN_GROUP_ID] = 'Admin'
}
if (USER_GROUP_ID) {
  GROUP_ROLE_MAPPING[USER_GROUP_ID] = 'Reader'
}

/**
 * Extract roles from JWT payload
 * Supports both 'roles' claim (App Roles) and 'groups' claim (Security Groups)
 */
function extractRoles(payload: JWTPayload): string[] {
  const roles: string[] = []

  // Direct roles claim (App Roles from Entra ID)
  const appRoles = payload.roles as string[] | undefined
  if (Array.isArray(appRoles)) {
    roles.push(...appRoles)
  }

  // Groups claim - map security group IDs to application roles
  const groups = payload.groups as string[] | undefined
  if (Array.isArray(groups)) {
    for (const groupId of groups) {
      const role = GROUP_ROLE_MAPPING[groupId]
      if (role && !roles.includes(role)) {
        roles.push(role)
      }
    }
  }

  // No default role fallback — users without AD group assignment get empty roles
  // The API must reject requests from users with no roles (handled by requireRole)

  return roles
}
