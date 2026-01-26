'use client'

import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useEffect, useState } from 'react'
import { getMsalInstance, loginRequest, isAuthConfigured } from '../../lib/auth-config'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * MSAL Auth Provider wrapper
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isAuthConfigured()) {
      setIsInitialized(true)
      return
    }

    const msalInstance = getMsalInstance()
    msalInstance.initialize().then(() => {
      // Handle redirect promise
      msalInstance.handleRedirectPromise().then(() => {
        setIsInitialized(true)
      })
    })
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Initializing...</div>
      </div>
    )
  }

  if (!isAuthConfigured()) {
    // Auth not configured - allow access without login (development mode)
    return <>{children}</>
  }

  return <MsalProvider instance={getMsalInstance()}>{children}</MsalProvider>
}

/**
 * Hook to get current user info
 */
export function useUser() {
  const { accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const user = accounts[0]
    ? {
        id: accounts[0].localAccountId,
        name: accounts[0].name || accounts[0].username,
        email: accounts[0].username,
        roles: (accounts[0].idTokenClaims?.roles as string[]) || [],
      }
    : null

  return {
    user,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
  }
}

/**
 * Hook to handle login/logout
 */
export function useAuth() {
  const { instance, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const login = async () => {
    if (!isAuthConfigured()) return

    try {
      await instance.loginRedirect(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const logout = async () => {
    if (!isAuthConfigured()) return

    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return {
    login,
    logout,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
    isConfigured: isAuthConfigured(),
  }
}

/**
 * Component that requires authentication
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useUser()
  const { login, isConfigured } = useAuth()

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
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">KSeF Integration</h1>
        <p className="text-muted-foreground">Please sign in to access the dashboard</p>
        <button
          onClick={login}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Sign in with Microsoft
        </button>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Check if user has required role
 */
export function useHasRole(role: 'Admin' | 'Reader') {
  const { user } = useUser()
  const { isConfigured } = useAuth()

  // If auth is not configured, assume admin access
  if (!isConfigured) {
    return true
  }

  if (!user) {
    return false
  }

  // Admin has all permissions
  if (user.roles.includes('Admin')) {
    return true
  }

  return user.roles.includes(role)
}

/**
 * Component that requires a specific role
 */
export function RequireRole({
  role,
  children,
  fallback,
}: {
  role: 'Admin' | 'Reader'
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const hasRole = useHasRole(role)

  if (!hasRole) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
