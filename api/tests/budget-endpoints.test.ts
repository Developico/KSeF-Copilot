import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted handler capture ────────────────────────────────────

const { registeredHandlers } = vi.hoisted(() => {
  const registeredHandlers: Record<string, Function> = {}
  return { registeredHandlers }
})

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn((name: string, options: { handler: Function }) => {
      registeredHandlers[name] = options.handler
    }),
    timer: vi.fn(),
  },
}))

vi.mock('../src/lib/auth/middleware', () => ({
  verifyAuth: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services', () => ({
  budgetService: {
    getBudgetStatus: vi.fn(),
    getBudgetSummary: vi.fn(),
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { budgetService } from '../src/lib/dataverse/services'

// Import the module to trigger handler registration
import '../src/functions/budget'

// ── Helpers ───────────────────────────────────────────────────

const readerUser = {
  id: 'oid-reader',
  email: 'reader@test.com',
  name: 'Reader',
  roles: ['Reader'],
}

function makeRequest(
  overrides: {
    params?: Record<string, string>
    query?: Record<string, string>
  } = {}
): unknown {
  const queryMap = new Map(Object.entries(overrides.query || {}))
  return {
    params: overrides.params || { id: 'mpk-001' },
    query: { get: (key: string) => queryMap.get(key) ?? null },
    headers: { get: vi.fn().mockReturnValue('Bearer token') },
  }
}

function makeContext(): unknown {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function setupAuth(user = readerUser) {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user })
  vi.mocked(requireRole).mockReturnValue({ success: true })
}

function setupUnauthenticated() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: false, error: 'Unauthorized' })
}

function setupForbidden() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: readerUser })
  vi.mocked(requireRole).mockReturnValue({ success: false, error: 'Forbidden' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Route registration
// ============================================================================

describe('Budget route registration', () => {
  it('should register mpk-centers-budget-status handler', () => {
    expect(registeredHandlers['mpk-centers-budget-status']).toBeDefined()
  })

  it('should register budget-summary handler', () => {
    expect(registeredHandlers['budget-summary']).toBeDefined()
  })
})

// ============================================================================
// GET /api/mpk-centers/:id/budget-status
// ============================================================================

describe('budgetStatusHandler', () => {
  const handler = () => registeredHandlers['mpk-centers-budget-status']

  it('should return 401 when not authenticated', async () => {
    setupUnauthenticated()
    const res = await handler()(makeRequest(), makeContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when not authorized', async () => {
    setupForbidden()
    const res = await handler()(makeRequest(), makeContext())
    expect(res.status).toBe(403)
  })

  it('should return 400 when id is missing', async () => {
    setupAuth()
    const res = await handler()(makeRequest({ params: {} }), makeContext())
    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('ID required')
  })

  it('should return budget status for valid MPK', async () => {
    setupAuth()
    const mockStatus = {
      mpkCenterId: 'mpk-001',
      mpkCenterName: 'Marketing',
      budgetAmount: 10000,
      utilized: 3000,
      remaining: 7000,
      utilizationPercent: 30,
      isWarning: false,
      isExceeded: false,
      invoiceCount: 5,
    }
    vi.mocked(budgetService.getBudgetStatus).mockResolvedValue(mockStatus as any)

    const res = await handler()(makeRequest(), makeContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toEqual(mockStatus)
  })

  it('should return 200 with null data when no budget configured', async () => {
    setupAuth()
    vi.mocked(budgetService.getBudgetStatus).mockResolvedValue(null)

    const res = await handler()(makeRequest(), makeContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toBeNull()
    expect(res.jsonBody.message).toContain('No budget configured')
  })

  it('should return 500 on service error', async () => {
    setupAuth()
    vi.mocked(budgetService.getBudgetStatus).mockRejectedValue(new Error('DV down'))

    const res = await handler()(makeRequest(), makeContext())

    expect(res.status).toBe(500)
    expect(res.jsonBody.error).toContain('DV down')
  })
})

// ============================================================================
// GET /api/budget/summary
// ============================================================================

describe('budgetSummaryHandler', () => {
  const handler = () => registeredHandlers['budget-summary']

  it('should return 401 when not authenticated', async () => {
    setupUnauthenticated()
    const res = await handler()(makeRequest({ query: { settingId: 's1' } }), makeContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when not authorized', async () => {
    setupForbidden()
    const res = await handler()(makeRequest({ query: { settingId: 's1' } }), makeContext())
    expect(res.status).toBe(403)
  })

  it('should return 400 when settingId is missing', async () => {
    setupAuth()
    const res = await handler()(makeRequest({ query: {} }), makeContext())
    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('settingId')
  })

  it('should return budget summary', async () => {
    setupAuth()
    const summaryData = [
      { mpkCenterId: 'mpk-001', mpkCenterName: 'Marketing', utilized: 3000 },
      { mpkCenterId: 'mpk-002', mpkCenterName: 'Sales', utilized: 5000 },
    ]
    vi.mocked(budgetService.getBudgetSummary).mockResolvedValue(summaryData as any)

    const res = await handler()(makeRequest({ query: { settingId: 'setting-001' } }), makeContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toEqual(summaryData)
    expect(res.jsonBody.count).toBe(2)
    expect(budgetService.getBudgetSummary).toHaveBeenCalledWith('setting-001')
  })

  it('should return empty array when no budgets', async () => {
    setupAuth()
    vi.mocked(budgetService.getBudgetSummary).mockResolvedValue([])

    const res = await handler()(makeRequest({ query: { settingId: 's1' } }), makeContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toEqual([])
    expect(res.jsonBody.count).toBe(0)
  })

  it('should return 500 on service error', async () => {
    setupAuth()
    vi.mocked(budgetService.getBudgetSummary).mockRejectedValue(new Error('timeout'))

    const res = await handler()(makeRequest({ query: { settingId: 's1' } }), makeContext())

    expect(res.status).toBe(500)
    expect(res.jsonBody.error).toContain('timeout')
  })
})
