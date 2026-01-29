import { HttpRequest } from '@azure/functions'
import { AuthResult, AuthUser, RoleCheckResult } from '../../types/api'

// Allow bypassing auth in development
const DEV_MODE = process.env.NODE_ENV !== 'production' && process.env.SKIP_AUTH === 'true'

/**
 * Verify JWT token from Authorization header
 * In production, this should validate against Entra ID
 */
export async function verifyAuth(request: HttpRequest): Promise<AuthResult> {
  // Development mode - bypass auth
  if (DEV_MODE) {
    return {
      success: true,
      user: {
        id: 'dev-user',
        email: 'dev@localhost',
        name: 'Dev User',
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
    // TODO: Implement proper JWT validation with Entra ID
    // For now, decode without verification (development only!)
    const payload = decodeJwtPayload(token)

    if (!payload) {
      return { success: false, error: 'Invalid token' }
    }

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { success: false, error: 'Token expired' }
    }

    const user: AuthUser = {
      id: payload.oid || payload.sub || '',
      email: payload.email || payload.preferred_username || '',
      name: payload.name || '',
      roles: extractRoles(payload),
    }

    return { success: true, user }
  } catch (error) {
    return { success: false, error: 'Token validation failed' }
  }
}

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

/**
 * Decode JWT payload (base64url)
 * WARNING: This does NOT verify the signature!
 * Use only for development or when token is already verified by Azure
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Extract roles from JWT payload
 * Supports both 'roles' claim and 'groups' claim
 */
function extractRoles(payload: JwtPayload): string[] {
  const roles: string[] = []

  // Direct roles claim (App Roles)
  if (Array.isArray(payload.roles)) {
    roles.push(...payload.roles)
  }

  // Groups claim (with mapping)
  // TODO: Configure group-to-role mapping
  if (Array.isArray(payload.groups)) {
    // Example: Map specific group IDs to roles
    // This should come from configuration
  }

  // Default to Reader if no roles found
  if (roles.length === 0) {
    roles.push('Reader')
  }

  return roles
}

/**
 * JWT Payload interface (partial)
 */
interface JwtPayload {
  oid?: string
  sub?: string
  email?: string
  preferred_username?: string
  name?: string
  roles?: string[]
  groups?: string[]
  exp?: number
  iat?: number
  iss?: string
  aud?: string
}
