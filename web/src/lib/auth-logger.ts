/**
 * Authentication Logger
 * 
 * Logs authentication events to a dedicated log file.
 * In browser context, logs are sent to an API endpoint.
 * Keeps JWT/cookie size minimal by NOT storing logs in session.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface AuthLogEntry {
  timestamp: string
  level: LogLevel
  event: string
  userId?: string
  email?: string
  data?: Record<string, unknown>
  error?: {
    name?: string
    message?: string
    code?: string
  }
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: AuthLogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    `[AUTH]`,
    entry.event,
  ]
  
  if (entry.email) {
    parts.push(`user=${entry.email}`)
  }
  
  if (entry.error) {
    parts.push(`error=${entry.error.message || entry.error.name}`)
  }
  
  return parts.join(' ')
}

/**
 * Sanitize error for logging (remove stack traces in production)
 */
function sanitizeError(error: unknown): AuthLogEntry['error'] | undefined {
  if (!error) return undefined
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: (error as Error & { code?: string }).code,
    }
  }
  
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>
    return {
      name: String(e.name || 'UnknownError'),
      message: String(e.message || e.errorMessage || 'Unknown error'),
      code: e.code ? String(e.code) : undefined,
    }
  }
  
  return { message: String(error) }
}

/**
 * Store logs in memory for debugging (limited to last 100 entries)
 */
const LOG_BUFFER_SIZE = 100
const logBuffer: AuthLogEntry[] = []

function addToBuffer(entry: AuthLogEntry): void {
  logBuffer.push(entry)
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift()
  }
}

/**
 * Get recent auth logs (for debugging)
 */
export function getAuthLogs(): AuthLogEntry[] {
  return [...logBuffer]
}

/**
 * Clear auth logs
 */
export function clearAuthLogs(): void {
  logBuffer.length = 0
}

/**
 * Log an authentication event
 */
function log(
  level: LogLevel,
  event: string,
  context?: {
    userId?: string
    email?: string
    data?: Record<string, unknown>
    error?: unknown
  }
): void {
  const entry: AuthLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    userId: context?.userId,
    email: context?.email,
    data: context?.data,
    error: sanitizeError(context?.error),
  }
  
  // Add to in-memory buffer
  addToBuffer(entry)
  
  // Console output based on environment
  const isDev = process.env.NODE_ENV !== 'production'
  const formattedLog = formatLogEntry(entry)
  
  if (isDev || level === 'error' || level === 'warn') {
    switch (level) {
      case 'error':
        console.error(formattedLog, context?.data || '')
        break
      case 'warn':
        console.warn(formattedLog, context?.data || '')
        break
      case 'info':
        console.info(formattedLog)
        break
      case 'debug':
        if (isDev) console.debug(formattedLog, context?.data || '')
        break
    }
  }
  
  // In production, could send to API endpoint for persistent logging
  // This is intentionally NOT implemented to keep client-side minimal
  // Server-side logging should be done via API interceptors
}

/**
 * Auth Logger API
 */
export const authLogger = {
  debug: (event: string, context?: Parameters<typeof log>[2]) => log('debug', event, context),
  info: (event: string, context?: Parameters<typeof log>[2]) => log('info', event, context),
  warn: (event: string, context?: Parameters<typeof log>[2]) => log('warn', event, context),
  error: (event: string, context?: Parameters<typeof log>[2]) => log('error', event, context),
  
  // Specific auth events
  loginStart: (email?: string) => log('info', 'LOGIN_START', { email }),
  loginSuccess: (email: string, userId: string) => log('info', 'LOGIN_SUCCESS', { email, userId }),
  loginFailed: (error: unknown, email?: string) => log('error', 'LOGIN_FAILED', { email, error }),
  
  logoutStart: (email?: string) => log('info', 'LOGOUT_START', { email }),
  logoutSuccess: (email?: string) => log('info', 'LOGOUT_SUCCESS', { email }),
  logoutFailed: (error: unknown, email?: string) => log('error', 'LOGOUT_FAILED', { email, error }),
  
  tokenAcquired: (email: string, scopes: string[]) => log('debug', 'TOKEN_ACQUIRED', { email, data: { scopes } }),
  tokenFailed: (error: unknown, email?: string) => log('error', 'TOKEN_FAILED', { email, error }),
  tokenRefreshed: (email: string) => log('debug', 'TOKEN_REFRESHED', { email }),
  
  groupsResolved: (email: string, groups: string[], roles: string[]) => 
    log('info', 'GROUPS_RESOLVED', { email, data: { groupCount: groups.length, roles } }),
  groupsOverage: (email: string) => log('warn', 'GROUPS_OVERAGE', { email, data: { message: 'User has >200 groups, using Graph API fallback' } }),
  groupsFailed: (error: unknown, email?: string) => log('error', 'GROUPS_FAILED', { email, error }),
  
  accessDenied: (email: string, requiredRole: string) => 
    log('warn', 'ACCESS_DENIED', { email, data: { requiredRole } }),
  
  avatarLoaded: (email: string) => log('debug', 'AVATAR_LOADED', { email }),
  avatarFailed: (error: unknown, email?: string) => log('debug', 'AVATAR_FAILED', { email, error }),
}

export type { AuthLogEntry, LogLevel }
