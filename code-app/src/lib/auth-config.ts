import {
  Configuration,
  PublicClientApplication,
  LogLevel,
} from '@azure/msal-browser'

/**
 * MSAL Configuration for Azure Entra ID.
 *
 * Uses Vite environment variables (import.meta.env.VITE_*).
 * The same Entra ID App Registration as the web project can be reused —
 * just add the code-app's origin as an allowed redirect URI.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    postLogoutRedirectUri:
      typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean
      ) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:
            console.error(message)
            break
          case LogLevel.Warning:
            console.warn(message)
            break
          case LogLevel.Info:
            console.info(message)
            break
          case LogLevel.Verbose:
            console.debug(message)
            break
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
}

/** Scopes for login — basic user profile */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

/** Scopes for accessing the KSeF API (Azure Functions) */
export const apiScopes = {
  scopes: import.meta.env.VITE_API_SCOPE ? [import.meta.env.VITE_API_SCOPE] : [],
}

/** Security groups configuration */
export const groupConfig = {
  admin: import.meta.env.VITE_ADMIN_GROUP || '',
  user: import.meta.env.VITE_USER_GROUP || '',
}

// ── Singleton MSAL instance ─────────────────────────────────────────

let msalInstance: PublicClientApplication | null = null

export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig)
  }
  return msalInstance
}

/** Initialize MSAL — must be called before any auth operations */
export async function initializeMsal(): Promise<PublicClientApplication> {
  const instance = getMsalInstance()
  await instance.initialize()
  // Handle redirect promise (e.g. after login redirect)
  await instance.handleRedirectPromise()
  return instance
}

/** Check if authentication is configured */
export function isAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_AZURE_CLIENT_ID)
}
