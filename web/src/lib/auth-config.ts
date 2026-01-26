import { Configuration, PublicClientApplication, LogLevel } from '@azure/msal-browser'

/**
 * MSAL Configuration for Azure Entra ID
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
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

/**
 * Scopes for API access
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}

/**
 * Scopes for accessing the KSeF API (Azure Functions)
 */
export const apiScopes = {
  scopes: [process.env.NEXT_PUBLIC_API_SCOPE || 'api://ksef-api/.default'],
}

/**
 * Create MSAL instance
 */
let msalInstance: PublicClientApplication | null = null

export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig)
  }
  return msalInstance
}

/**
 * Check if authentication is configured
 */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AZURE_CLIENT_ID)
}
