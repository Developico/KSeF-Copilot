'use client'

import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus, AccountInfo } from '@azure/msal-browser'
import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { getMsalInstance, loginRequest, isAuthConfigured, groupConfig } from '../../lib/auth-config'
import { authLogger } from '../../lib/auth-logger'
import { getUserGroups } from '../../lib/graph-service'
import { SignInScreen } from './signin-screen'

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

/**
 * Map group IDs to application roles
 */
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

/**
 * Get primary role (highest in hierarchy)
 */
function getPrimaryRole(roles: UserRole[]): UserRole {
  const hierarchy: UserRole[] = ['Unauthorized', 'User', 'Admin']
  
  return roles.reduce((highest, role) => {
    const currentIndex = hierarchy.indexOf(role)
    const highestIndex = hierarchy.indexOf(highest)
    return currentIndex > highestIndex ? role : highest
  }, 'Unauthorized' as UserRole)
}

/**
 * Check for groups overage claim (user has >200 groups)
 */
function hasGroupsOverage(account: AccountInfo): boolean {
  const claims = account.idTokenClaims as Record<string, unknown> | undefined
  return claims?.hasOwnProperty('_claim_sources') || false
}

/**
 * Extract groups from ID token claims
 */
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
  children: React.ReactNode
}

/**
 * MSAL Auth Provider wrapper with role-based access control
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthConfigured()) {
      authLogger.info('AUTH_NOT_CONFIGURED', { data: { mode: 'development' } })
      setIsInitialized(true)
      return
    }

    const msalInstance = getMsalInstance()
    
    msalInstance.initialize()
      .then(() => {
        return msalInstance.handleRedirectPromise()
      })
      .then((response) => {
        if (response) {
          authLogger.loginSuccess(
            response.account?.username || 'unknown',
            response.account?.localAccountId || 'unknown'
          )
        }
        setIsInitialized(true)
      })
      .catch((error) => {
        authLogger.error('MSAL_INIT_FAILED', { error })
        setInitError('Authentication initialization failed')
        setIsInitialized(true)
      })
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Initializing...</div>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
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

  if (!isAuthConfigured()) {
    // Auth not configured - provide mock context for development
    return (
      <AuthContext.Provider value={{
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
        login: async () => {},
        logout: async () => {},
      }}>
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

/**
 * Internal provider that uses MSAL hooks
 */
function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isResolvingGroups, setIsResolvingGroups] = useState(false)

  // Resolve user and groups
  useEffect(() => {
    async function resolveUser() {
      if (!accounts[0] || inProgress !== InteractionStatus.None) {
        setUser(null)
        return
      }

      const account = accounts[0]
      let groups: string[] = []

      // Check for groups overage
      if (hasGroupsOverage(account)) {
        setIsResolvingGroups(true)
        try {
          groups = await getUserGroups()
        } catch (error) {
          authLogger.groupsFailed(error, account.username)
        }
        setIsResolvingGroups(false)
      } else {
        groups = getGroupsFromToken(account)
      }

      const roles = mapGroupsToRoles(groups)
      const primaryRole = getPrimaryRole(roles)

      authLogger.groupsResolved(account.username, groups, roles)

      setUser({
        id: account.localAccountId,
        name: account.name || account.username,
        email: account.username,
        groups,
        roles,
        primaryRole,
      })
    }

    resolveUser()
  }, [accounts, inProgress])

  const login = useCallback(async () => {
    try {
      authLogger.loginStart()
      await instance.loginRedirect(loginRequest)
    } catch (error) {
      authLogger.loginFailed(error)
    }
  }, [instance])

  const logout = useCallback(async () => {
    const email = accounts[0]?.username
    try {
      authLogger.logoutStart(email)
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (error) {
      authLogger.logoutFailed(error, email)
    }
  }, [instance, accounts])

  const isLoading = inProgress !== InteractionStatus.None || isResolvingGroups

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      isConfigured: true,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  
  if (!context) {
    // Fallback for components outside provider (shouldn't happen)
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isConfigured: false,
      login: async () => {},
      logout: async () => {},
    }
  }
  
  return context
}

/**
 * Hook to get current user info
 * @deprecated Use useAuth() instead
 */
export function useUser() {
  const { user, isAuthenticated, isLoading } = useAuth()
  return { user, isAuthenticated, isLoading }
}

/**
 * Check if user has required role
 */
export function useHasRole(role: UserRole): boolean {
  const { user, isConfigured } = useAuth()

  // If auth is not configured, assume admin access (development)
  if (!isConfigured) {
    return true
  }

  if (!user) {
    return false
  }

  // Admin has all permissions
  if (user.primaryRole === 'Admin') {
    return true
  }

  // Check specific role
  if (role === 'User') {
    return user.roles.includes('User') || user.roles.includes('Admin')
  }

  return user.roles.includes(role)
}

/**
 * Check if user has any authorized role (not Unauthorized)
 */
export function useIsAuthorized(): boolean {
  const { user, isConfigured } = useAuth()
  
  if (!isConfigured) return true
  if (!user) return false
  
  return user.primaryRole !== 'Unauthorized'
}

// =============================================================================
// Components
// =============================================================================

/**
 * Component that requires authentication
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isConfigured } = useAuth()

  // If auth is not configured, allow access
  if (!isConfigured) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking authentication...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <SignInScreen productName="KSeF Copilot" />
  }

  return <>{children}</>
}

/**
 * Component that requires authorization (membership in any app group)
 */
export function RequireAuthorization({ 
  children,
  fallback,
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  const isAuthorized = useIsAuthorized()
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verifying access...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    if (fallback) return <>{fallback}</>
    
    authLogger.accessDenied(user?.email || 'unknown', 'any')
    
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">
          You are not a member of any authorized group.
        </p>
        <p className="text-sm text-muted-foreground">
          Contact your administrator to request access.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Component that requires a specific role
 */
export function RequireRole({
  role,
  children,
  fallback,
}: {
  role: UserRole
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const hasRole = useHasRole(role)
  const { user } = useAuth()

  if (!hasRole) {
    if (user) {
      authLogger.accessDenied(user.email, role)
    }
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
