/**
 * Authentication gate.
 *
 * Uses @azure/msal-react to enforce login before rendering
 * the app content. Shows a sign-in page when not authenticated.
 * When auth is not configured (env vars missing), renders children directly.
 */

import { ReactNode } from 'react'
import { useIntl } from 'react-intl'
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { loginRequest, isAuthConfigured } from '@/lib/auth-config'
import { Loader2, LogIn, Shield } from 'lucide-react'

interface AuthGateProps {
  children: ReactNode
}

function LoginPage() {
  const intl = useIntl()
  const { instance, inProgress } = useMsal()
  const isLoggingIn = inProgress !== InteractionStatus.None

  function handleLogin() {
    void instance.loginRedirect(loginRequest)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {intl.formatMessage({ id: 'header.title' })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'header.subtitle' })}
            </p>
          </div>
        </div>

        {/* Sign in card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'auth.unauthorizedDesc' })}
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {intl.formatMessage({ id: 'auth.signingIn' })}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {intl.formatMessage({ id: 'auth.signIn' })}
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Microsoft Entra ID
        </p>
      </div>
    </div>
  )
}

function LoadingScreen() {
  const intl = useIntl()
  const { inProgress } = useMsal()
  const isProcessing = inProgress !== InteractionStatus.None

  if (!isProcessing) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {intl.formatMessage({ id: 'auth.signingIn' })}
        </p>
      </div>
    </div>
  )
}

export function AuthGate({ children }: AuthGateProps) {
  // If auth is not configured, render children directly (dev mode without auth)
  if (!isAuthConfigured()) {
    return <>{children}</>
  }

  return (
    <>
      <LoadingScreen />
      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginPage />
      </UnauthenticatedTemplate>
    </>
  )
}
