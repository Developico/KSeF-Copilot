/**
 * KSeF API Configuration
 */

export const KSEF_ENDPOINTS = {
  test: 'https://ksef-test.mf.gov.pl/api',
  demo: 'https://ksef-demo.mf.gov.pl/api',
  prod: 'https://ksef.mf.gov.pl/api',
} as const

export type KsefEnvironment = keyof typeof KSEF_ENDPOINTS

/**
 * Get KSeF configuration from environment
 */
export function getKsefConfig(): KsefConfig {
  const environment = (process.env.KSEF_ENVIRONMENT || 'test') as KsefEnvironment
  const nip = process.env.KSEF_NIP || ''
  const tokenSecretName = process.env.KSEF_TOKEN_SECRET_NAME || 'ksef-token-primary'
  const tokenExpiry = process.env.KSEF_TOKEN_EXPIRY

  if (!nip) {
    throw new Error('KSEF_NIP environment variable is required')
  }

  return {
    environment,
    baseUrl: KSEF_ENDPOINTS[environment],
    nip,
    tokenSecretName,
    tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : undefined,
  }
}

export interface KsefConfig {
  environment: KsefEnvironment
  baseUrl: string
  nip: string
  tokenSecretName: string
  tokenExpiry?: Date
}

/**
 * Check if token is expiring soon (within 7 days)
 */
export function isTokenExpiringSoon(config: KsefConfig): boolean {
  if (!config.tokenExpiry) return false

  const now = new Date()
  const daysUntilExpiry = Math.floor(
    (config.tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysUntilExpiry <= 7
}

/**
 * Get days until token expiry
 */
export function getDaysUntilTokenExpiry(config: KsefConfig): number | null {
  if (!config.tokenExpiry) return null

  const now = new Date()
  return Math.floor((config.tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
