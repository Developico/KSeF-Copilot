import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────

const { registeredHandlers } = vi.hoisted(() => {
  const registeredHandlers: Record<string, Function> = {}
  return { registeredHandlers }
})

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn((name: string, options: { handler: Function }) => {
      registeredHandlers[name] = options.handler
    }),
  },
}))

vi.mock('../src/lib/auth/middleware', () => ({
  verifyAuth: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services', () => ({
  reportService: {
    getBudgetUtilization: vi.fn(),
    getApprovalHistory: vi.fn(),
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { reportService } from '../src/lib/dataverse/services'

// Import function module to trigger handler registration
import '../src/functions/reports'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(overrides: {
  url?: string
  query?: Record<string, string>
} = {}) {
  const queryMap = new Map(Object.entries(overrides.query || {}))
  return {
    url: overrides.url || 'http://localhost:7071/api/reports',
    params: {},
    query: { get: (key: string) => queryMap.get(key) || null },
    headers: { get: vi.fn() },
  }
}

function mockContext() {
  return { error: vi.fn(), warn: vi.fn(), log: vi.fn() }
}

const testUser = { id: 'uid-1', email: 'user@test.com', name: 'User', roles: ['Reader'] }

function authSuccess(user = testUser) {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user })
  vi.mocked(requireRole).mockReturnValue({ success: true })
}

function authFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: false, error: 'Unauthorized' })
}

function roleFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: testUser })
  vi.mocked(requireRole).mockReturnValue({ success: false, error: 'Forbidden' })
}

const sampleBudgetReport = {
  period: { from: '2026-03-01', to: '2026-03-31' },
  mpkCenters: [],
  totals: { totalBudget: 10000, totalUtilized: 8000, totalRemaining: 2000, overallUtilizationPercent: 80 },
}

const sampleApprovalReport = {
  entries: [],
  count: 0,
  summary: { approved: 0, rejected: 0, cancelled: 0, pending: 0 },
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// GET /reports/budget-utilization
// ============================================================================

describe('GET /reports/budget-utilization', () => {
  const handler = () => registeredHandlers['reports-budget-utilization']

  it('should return 200 with budget report', async () => {
    authSuccess()
    vi.mocked(reportService.getBudgetUtilization).mockResolvedValue(sampleBudgetReport)

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toEqual(sampleBudgetReport)
  })

  it('should pass mpkCenterId when provided', async () => {
    authSuccess()
    vi.mocked(reportService.getBudgetUtilization).mockResolvedValue(sampleBudgetReport)

    await handler()(
      mockRequest({ query: { settingId: 's1', mpkCenterId: 'mpk-001' } }),
      mockContext()
    )

    expect(reportService.getBudgetUtilization).toHaveBeenCalledWith('s1', 'mpk-001')
  })

  it('should return 400 when settingId is missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 401 when not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when role check fails', async () => {
    roleFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(403)
  })

  it('should return 500 when service throws', async () => {
    authSuccess()
    vi.mocked(reportService.getBudgetUtilization).mockRejectedValue(new Error('fail'))

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(500)
  })
})

// ============================================================================
// GET /reports/approval-history
// ============================================================================

describe('GET /reports/approval-history', () => {
  const handler = () => registeredHandlers['reports-approval-history']

  it('should return 200 with approval history report', async () => {
    authSuccess()
    vi.mocked(reportService.getApprovalHistory).mockResolvedValue(sampleApprovalReport)

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toEqual(sampleApprovalReport)
  })

  it('should pass all filters to service', async () => {
    authSuccess()
    vi.mocked(reportService.getApprovalHistory).mockResolvedValue(sampleApprovalReport)

    await handler()(
      mockRequest({
        query: {
          settingId: 's1',
          dateFrom: '2026-01-01',
          dateTo: '2026-03-31',
          mpkCenterId: 'mpk-001',
          status: 'Approved',
        },
      }),
      mockContext()
    )

    expect(reportService.getApprovalHistory).toHaveBeenCalledWith(
      testUser,
      's1',
      {
        dateFrom: '2026-01-01',
        dateTo: '2026-03-31',
        mpkCenterId: 'mpk-001',
        status: 'Approved',
      }
    )
  })

  it('should return 400 when settingId is missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 401 when not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when role check fails', async () => {
    roleFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(403)
  })

  it('should return 500 when service throws', async () => {
    authSuccess()
    vi.mocked(reportService.getApprovalHistory).mockRejectedValue(new Error('fail'))

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(500)
  })
})
