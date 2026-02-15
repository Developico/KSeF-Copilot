import { describe, it, expect } from 'vitest'

describe('code-app setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true)
  })

  it('should be able to import utils', async () => {
    const { cn } = await import('../lib/utils')
    expect(cn('a', 'b')).toBe('a b')
    expect(cn('px-2', 'px-4')).toBe('px-4') // tailwind-merge
  })

  it('should be able to import i18n config', async () => {
    const { locales, defaultLocale } = await import('../i18n/config')
    expect(locales).toContain('pl')
    expect(locales).toContain('en')
    expect(defaultLocale).toBe('pl')
  })
})
