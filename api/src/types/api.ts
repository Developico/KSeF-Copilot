/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  count: number
  total?: number
  skip?: number
  top?: number
}

/**
 * Auth result from middleware
 */
export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * Authenticated user
 */
export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

/**
 * Role check result
 */
export interface RoleCheckResult {
  success: boolean
  error?: string
}
