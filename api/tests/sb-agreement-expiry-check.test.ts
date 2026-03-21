import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────

const { registeredTimerHandlers } = vi.hoisted(() => {
  const registeredTimerHandlers: Record<string, Function> = {}
  return { registeredTimerHandlers }
})

vi.mock('@azure/functions', () => ({
  app: {
    timer: vi.fn((name: string, options: { handler: Function }) => {
      registeredTimerHandlers[name] = options.handler
    }),
  },
}))

vi.mock('../src/lib/dataverse/services', () => ({
  sbAgreementService: {
    findExpired: vi.fn(),
    findExpiringSoon: vi.fn(),
    terminate: vi.fn(),
    getActiveForSupplier: vi.fn(),
  },
  settingService: {
    getAll: vi.fn(),
  },
  supplierService: {
    update: vi.fn(),
  },
}))

import { sbAgreementService, settingService, supplierService } from '../src/lib/dataverse/services'

// Import function module to trigger timer registration
import '../src/functions/sb-agreement-expiry-check'

// ── Helpers ───────────────────────────────────────────────────

function mockTimer(opts: { isPastDue?: boolean } = {}) {
  return {
    isPastDue: opts.isPastDue ?? false,
    scheduleStatus: { last: new Date().toISOString(), next: new Date().toISOString() },
  }
}

function mockContext() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

const sampleSettings = [
  { id: 'setting-1', nip: '5260250995', name: 'Setting A' },
]

const expiredAgreement = {
  id: 'agr-expired',
  supplierId: 'sup-1',
  validTo: '2024-12-31',
  status: 'Active',
}

const expiringSoonAgreement = {
  id: 'agr-expiring',
  supplierId: 'sup-2',
  validTo: '2025-02-15',
  status: 'Active',
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sb-agreement-expiry-check timer', () => {
  const handler = () => registeredTimerHandlers['sb-agreement-expiry-check']

  it('should be registered', () => {
    expect(handler()).toBeDefined()
  })

  it('should terminate expired agreements', async () => {
    vi.mocked(settingService.getAll).mockResolvedValue(sampleSettings)
    vi.mocked(sbAgreementService.findExpired).mockResolvedValue([expiredAgreement])
    vi.mocked(sbAgreementService.findExpiringSoon).mockResolvedValue([])
    vi.mocked(sbAgreementService.terminate).mockResolvedValue(undefined)
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue(null)
    vi.mocked(supplierService.update).mockResolvedValue(undefined)

    const ctx = mockContext()
    await handler()(mockTimer(), ctx)

    expect(sbAgreementService.terminate).toHaveBeenCalledWith('agr-expired')
    expect(supplierService.update).toHaveBeenCalledWith('sup-1', { hasSelfBillingAgreement: false })
    expect(ctx.log).toHaveBeenCalledWith(
      expect.stringContaining('1 terminated'),
    )
  })

  it('should not clear supplier flag when other active agreements exist', async () => {
    vi.mocked(settingService.getAll).mockResolvedValue(sampleSettings)
    vi.mocked(sbAgreementService.findExpired).mockResolvedValue([expiredAgreement])
    vi.mocked(sbAgreementService.findExpiringSoon).mockResolvedValue([])
    vi.mocked(sbAgreementService.terminate).mockResolvedValue(undefined)
    // Supplier still has an active agreement
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue({ id: 'agr-other', status: 'Active' })

    const ctx = mockContext()
    await handler()(mockTimer(), ctx)

    expect(sbAgreementService.terminate).toHaveBeenCalledWith('agr-expired')
    expect(supplierService.update).not.toHaveBeenCalled()
  })

  it('should warn about agreements expiring soon', async () => {
    vi.mocked(settingService.getAll).mockResolvedValue(sampleSettings)
    vi.mocked(sbAgreementService.findExpired).mockResolvedValue([])
    vi.mocked(sbAgreementService.findExpiringSoon).mockResolvedValue([expiringSoonAgreement])

    const ctx = mockContext()
    await handler()(mockTimer(), ctx)

    expect(sbAgreementService.findExpiringSoon).toHaveBeenCalledWith(30)
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.stringContaining('1 agreements expiring within 30 days'),
      expect.any(Object),
    )
  })

  it('should handle no settings gracefully', async () => {
    vi.mocked(settingService.getAll).mockResolvedValue([])

    const ctx = mockContext()
    await handler()(mockTimer(), ctx)

    expect(sbAgreementService.findExpired).not.toHaveBeenCalled()
    expect(ctx.log).toHaveBeenCalledWith(
      expect.stringContaining('0 terminated'),
    )
  })

  it('should continue processing when one setting fails', async () => {
    const twoSettings = [
      { id: 'set-1', nip: '5260250995', name: 'A' },
      { id: 'set-2', nip: '1111111111', name: 'B' },
    ]
    vi.mocked(settingService.getAll).mockResolvedValue(twoSettings)
    vi.mocked(sbAgreementService.findExpired)
      .mockRejectedValueOnce(new Error('Dataverse timeout'))
      .mockResolvedValueOnce([])
    vi.mocked(sbAgreementService.findExpiringSoon).mockResolvedValue([])

    const ctx = mockContext()
    await handler()(mockTimer(), ctx)

    expect(ctx.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed for setting set-1'),
      expect.any(Error),
    )
    // Second setting should still be processed
    expect(sbAgreementService.findExpired).toHaveBeenCalledTimes(2)
  })

  it('should handle terminate failure gracefully', async () => {
    vi.mocked(settingService.getAll).mockResolvedValue(sampleSettings)
    vi.mocked(sbAgreementService.findExpired).mockResolvedValue([expiredAgreement])
    vi.mocked(sbAgreementService.findExpiringSoon).mockResolvedValue([])
    vi.mocked(sbAgreementService.terminate).mockRejectedValue(new Error('terminate failed'))

    const ctx = mockContext()
    await handler()(mockTimer(), ctx)

    expect(ctx.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to terminate agreement agr-expired'),
      expect.any(Error),
    )
  })
})
