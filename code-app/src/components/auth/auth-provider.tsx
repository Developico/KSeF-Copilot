/**
 * Authentication provider with role-based access control.
 *
 * Wraps MSAL and adds RBAC via Azure AD security group membership.
 * When auth is not configured (env vars missing), provides a mock Admin user
 * for development.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  MsalProvider,
  useMsal,
  useIsAuthenticated,
} from '@azure/msal-react'
import { InteractionStatus, type AccountInfo } from '@azure/msal-browser'
import {
  getMsalInstance,
  loginRequest,
  isAuthConfigured,
  groupConfig,
} from '@/lib/auth-config'

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'Admin' | 'User' | 'Unauthorized'

export interface AuthUser {
  id: string
  name: string
  email: string
  groups: string[]
  roles: UserRole[]
  primaryRole: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isConfigured: boolean
  isAdmin: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null)

// =============================================================================
// Utilities
// =============================================================================

/** Map group IDs to application roles */
function mapGroupsToRoles(groups: string[]): UserRole[] {
  const roles: UserRole[] = []

  if (groupConfig.admin && groups.includes(groupConfig.admin)) {
    roles.push('Admin')
  }

  if (groupConfig.user && groups.includes(groupConfig.user)) {
    roles.push('User')
  }

  if (roles.length === 0) {
    roles.push('Unauthorized')
  }

  return roles
}

/** Get primary role (highest in hierarchy) */
function getPrimaryRole(roles: UserRole[]): UserRole {
  const hierarchy: UserRole[] = ['Unauthorized', 'User', 'Admin']
  return roles.reduce((highest, role) => {
    const currentIndex = hierarchy.indexOf(role)
    const highestIndex = hierarchy.indexOf(highest)
    return currentIndex > highestIndex ? role : highest
  }, 'Unauthorized' as UserRole)
}

/** Extract groups from ID token claims */
function getGroupsFromToken(account: AccountInfo): string[] {
  const claims = account.idTokenClaims as Record<string, unknown> | undefined
  const groups = claims?.groups

  if (Array.isArray(groups)) {
    return groups.filter((g): g is string => typeof g === 'string')
  }

  return []
}

// =============================================================================
// Auth Provider
// =============================================================================

interface AuthProviderProps {
  children: ReactNode
}

/**
 * MSAL Auth Provider wrapper with role-based access control.
 *
 * - When auth is configured, wraps children in MsalProvider + RBAC resolution.
 * - When auth is NOT configured (dev mode), provides a mock Admin context.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthConfigured()) {
      setIsInitialized(true)
      return
    }

    const msalInstance = getMsalInstance()

    msalInstance
      .initialize()
      .then(() => msalInstance.handleRedirectPromise())
      .then(() => setIsInitialized(true))
      .catch((error) => {
        console.error('MSAL init failed:', error)
        setInitError('Authentication initialization failed')
        setIsInitialized(true)
      })
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Initializing...
        </div>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">
          Authentication Error
        </h1>
        <p className="text-muted-foreground">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  // Auth not configured — provide mock Admin context for development
  if (!isAuthConfigured()) {
    return (
      <AuthContext.Provider
        value={{
          user: {
            id: 'dev-user',
            name: 'Development User',
            email: 'dev@localhost',
            groups: [],
            roles: ['Admin'],
            primaryRole: 'Admin',
          },
          isAuthenticated: true,
          isLoading: false,
          isConfigured: false,
          isAdmin: true,
          login: async () => {},
          logout: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <MsalProvider instance={getMsalInstance()}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </MsalProvider>
  )
}

// =============================================================================
// Internal MSAL Context Provider
// =============================================================================

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hasResolvedUser, setHasResolvedUser] = useState(false)

  // Resolve user and groups
  useEffect(() => {
    function resolveUser() {
      if (!accounts[0] || inProgress !== InteractionStatus.None) {
        setUser(null)
        return
      }

      const account = accounts[0]
      const groups = getGroupsFromToken(account)
      const roles = mapGroupsToRoles(groups)
      const primaryRole = getPrimaryRole(roles)

      setUser({
        id: account.localAccountId,
        name: account.name || account.username,
        email: account.username,
        groups,
        roles,
        primaryRole,
      })
      setHasResolvedUser(true)
    }

    resolveUser()
  }, [accounts, inProgress])

  const login = useCallback(async () => {
    try {
      await instance.loginRedirect(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }, [instance])

  const logout = useCallback(async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [instance])

  // Loading while: MSAL interaction in progress OR user is authenticated but
  // user object not yet resolved (prevents Access Denied flash)
  const isLoading =
    inProgress !== InteractionStatus.None ||
    (isAuthenticated && !hasResolvedUser)

  const isAdmin = user?.primaryRole === 'Admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isConfigured: true,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// =============================================================================
// Hooks
// =============================================================================

/** Access the auth context */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    // Fallback for components outside provider (shouldn't happen normally)
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isConfigured: false,
      isAdmin: false,
      login: async () => {},
      logout: async () => {},
    }
  }

  return context
}

/** Check if user has the required role */
export function useHasRole(role: UserRole): boolean {
  const { user, isConfigured } = useAuth()

  // If auth is not configured, assume full access (dev mode)
  if (!isConfigured) return true
  if (!user) return false

  // Admin has all permissions
  if (user.primaryRole === 'Admin') return true

  // Check specific role
  if (role === 'User') {
    return user.roles.includes('User') || user.roles.includes('Admin')
  }

  return user.roles.includes(role)
}

// =============================================================================
// Guard Components
// =============================================================================

/** Only renders children if user has the specified role */
export function RequireRole({
  role,
  children,
  fallback,
}: {
  role: UserRole
  children: ReactNode
  fallback?: ReactNode
}) {
  const hasRole = useHasRole(role)
  if (!hasRole) return fallback ? <>{fallback}</> : null
  return <>{children}</>
}
