import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getKsefConfig, isTokenExpiringSoon, getDaysUntilTokenExpiry, KSEF_ENDPOINTS } from '../src/lib/ksef/config'

describe('KSeF Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getKsefConfig', () => {
    it('should throw error when KSEF_NIP is missing', () => {
      delete process.env.KSEF_NIP

      expect(() => getKsefConfig()).toThrow('KSEF_NIP environment variable is required')
    })

    it('should return config with default test environment', () => {
      process.env.KSEF_NIP = '1234567890'
      delete process.env.KSEF_ENVIRONMENT

      const config = getKsefConfig()

      expect(config.environment).toBe('test')
      expect(config.baseUrl).toBe(KSEF_ENDPOINTS.test)
      expect(config.nip).toBe('1234567890')
    })

    it('should use specified environment', () => {
      process.env.KSEF_NIP = '1234567890'
      process.env.KSEF_ENVIRONMENT = 'demo'

      const config = getKsefConfig()

      expect(config.environment).toBe('demo')
      expect(config.baseUrl).toBe(KSEF_ENDPOINTS.demo)
    })

    it('should use production environment', () => {
      process.env.KSEF_NIP = '1234567890'
      process.env.KSEF_ENVIRONMENT = 'prod'

      const config = getKsefConfig()

      expect(config.environment).toBe('prod')
      expect(config.baseUrl).toBe(KSEF_ENDPOINTS.prod)
    })

    it('should parse token expiry date', () => {
      process.env.KSEF_NIP = '1234567890'
      process.env.KSEF_TOKEN_EXPIRY = '2024-12-31'

      const config = getKsefConfig()

      expect(config.tokenExpiry).toBeInstanceOf(Date)
      expect(config.tokenExpiry?.getFullYear()).toBe(2024)
    })

    it('should use custom token secret name', () => {
      process.env.KSEF_NIP = '1234567890'
      process.env.KSEF_TOKEN_SECRET_NAME = 'my-custom-secret'

      const config = getKsefConfig()

      expect(config.tokenSecretName).toBe('my-custom-secret')
    })
  })

  describe('isTokenExpiringSoon', () => {
    it('should return false when no expiry date', () => {
      const config = {
        environment: 'test' as const,
        baseUrl: KSEF_ENDPOINTS.test,
        nip: '1234567890',
        tokenSecretName: 'test',
      }

      expect(isTokenExpiringSoon(config)).toBe(false)
    })

    it('should return true when expiring within 7 days', () => {
      const config = {
        environment: 'test' as const,
        baseUrl: KSEF_ENDPOINTS.test,
        nip: '1234567890',
        tokenSecretName: 'test',
        tokenExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      }

      expect(isTokenExpiringSoon(config)).toBe(true)
    })

    it('should return false when expiring in more than 7 days', () => {
      const config = {
        environment: 'test' as const,
        baseUrl: KSEF_ENDPOINTS.test,
        nip: '1234567890',
        tokenSecretName: 'test',
        tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }

      expect(isTokenExpiringSoon(config)).toBe(false)
    })
  })

  describe('getDaysUntilTokenExpiry', () => {
    it('should return null when no expiry date', () => {
      const config = {
        environment: 'test' as const,
        baseUrl: KSEF_ENDPOINTS.test,
        nip: '1234567890',
        tokenSecretName: 'test',
      }

      expect(getDaysUntilTokenExpiry(config)).toBe(null)
    })

    it('should return correct number of days', () => {
      const daysFromNow = 15
      const config = {
        environment: 'test' as const,
        baseUrl: KSEF_ENDPOINTS.test,
        nip: '1234567890',
        tokenSecretName: 'test',
        tokenExpiry: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000),
      }

      expect(getDaysUntilTokenExpiry(config)).toBe(daysFromNow)
    })

    it('should return negative days when expired', () => {
      const config = {
        environment: 'test' as const,
        baseUrl: KSEF_ENDPOINTS.test,
        nip: '1234567890',
        tokenSecretName: 'test',
        tokenExpiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      }

      expect(getDaysUntilTokenExpiry(config)).toBe(-5)
    })
  })

  describe('KSEF_ENDPOINTS', () => {
    it('should have correct endpoint URLs for KSeF 2.0', () => {
      // Correct KSeF 2.0 endpoint format: https://api-{env}.ksef.mf.gov.pl/v2 (or https://api.ksef.mf.gov.pl/v2 for prod)
      // Old format (deprecated, shut down Feb 1, 2026): https://ksef-{env}.mf.gov.pl/api/v2
      expect(KSEF_ENDPOINTS.test).toBe('https://api-test.ksef.mf.gov.pl/v2')
      expect(KSEF_ENDPOINTS.demo).toBe('https://api-demo.ksef.mf.gov.pl/v2')
      expect(KSEF_ENDPOINTS.prod).toBe('https://api.ksef.mf.gov.pl/v2')
    })
  })
})
