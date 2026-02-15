/**
 * KSeF API Configuration
 * Updated for KSeF 2.0 (effective from February 1, 2026)
 * API 2.0 uses new api-*.ksef.mf.gov.pl subdomains with /v2 prefix
 * Old endpoints (ksef-*.mf.gov.pl/api/v2) were deprecated and shut down on Feb 1, 2026
 */

export const KSEF_ENDPOINTS = {
  test: 'https://api-test.ksef.mf.gov.pl/v2',
  demo: 'https://api-demo.ksef.mf.gov.pl/v2',
  prod: 'https://api.ksef.mf.gov.pl/v2',
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
 * Get KSeF configuration for a specific NIP from Dataverse
 */
export async function getKsefConfigForNip(nip: string): Promise<KsefConfig> {
  // Import settingService dynamically to avoid circular dependency
  const { settingService } = await import('../dataverse')
  
  const settings = await settingService.getAll(true)
  const setting = settings.find(s => s.nip === nip)
  
  if (!setting) {
    throw new Error(`No active company found for NIP: ${nip}`)
  }
  
  // Map environment to KSEF endpoint key
  const envMap: Record<string, KsefEnvironment> = {
    'production': 'prod',
    'demo': 'demo',
    'test': 'test'
  }
  const ksefEnv = envMap[setting.environment] || 'test'
  
  return {
    environment: ksefEnv,
    baseUrl: KSEF_ENDPOINTS[ksefEnv],
    nip: setting.nip,
    tokenSecretName: setting.keyVaultSecretName || `ksef-token-${nip}`,
    tokenExpiry: setting.tokenExpiresAt ? new Date(setting.tokenExpiresAt) : undefined,
  }
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
