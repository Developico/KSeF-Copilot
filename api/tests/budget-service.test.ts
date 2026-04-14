import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseClient: {
    listAll: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/logger', () => ({
  logDataverseInfo: vi.fn(),
  logDataverseError: vi.fn(),
  logDataverseMapping: vi.fn(),
}))

import { dataverseClient } from '../src/lib/dataverse/client'
import { BudgetService, getCurrentPeriod } from '../src/lib/dataverse/services/budget-service'
import { MpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { DV, APPROVAL_STATUS } from '../src/lib/dataverse/config'

// Freeze time to 2026-03-09 for deterministic period calculations
const FROZEN_DATE = new Date('2026-03-09T12:00:00Z')

// ── Helpers ────────────────────────────────────────────────────

function createService() {
  return new BudgetService()
}

// ── Fixtures ───────────────────────────────────────────────────

const mpkWithBudget = {
  id: 'mpk-001',
  name: 'Marketing',
  description: 'Marketing dept',
  settingId: 'setting-001',
  isActive: true,
  approvalRequired: true,
  approvalSlaHours: 24,
  budgetAmount: 10000,
  budgetPeriod: 'Monthly' as const,
  budgetStartDate: '2026-01-01',
  createdOn: '2026-01-01T00:00:00Z',
  modifiedOn: '2026-01-01T00:00:00Z',
}

const mpkWithoutBudget = {
  id: 'mpk-002',
  name: 'Sales',
  description: null,
  settingId: 'setting-001',
  isActive: true,
  approvalRequired: false,
  createdOn: '2026-01-01T00:00:00Z',
  modifiedOn: '2026-01-01T00:00:00Z',
}

const mpkWithQuarterlyBudget = {
  ...mpkWithBudget,
  id: 'mpk-003',
  name: 'R&D',
  budgetAmount: 50000,
  budgetPeriod: 'Quarterly' as const,
  budgetStartDate: '2026-01-01',
}

function makeApprovedInvoice(overrides: Record<string, unknown> = {}) {
  return {
    [DV.invoice.id]: 'inv-001',
    [DV.invoice.grossAmount]: 1000,
    [DV.invoice.grossAmountPln]: 1000,
    ...overrides,
  }
}

// ── Restore mocks between tests ────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(FROZEN_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================================================
// getCurrentPeriod (pure function)
// ============================================================================

describe('getCurrentPeriod', () => {
  it('should return monthly period boundaries', () => {
    // Start: 2026-01-01, period: Monthly
    // For March 9 2026, we should be in the March period
    const result = getCurrentPeriod('2026-01-01', 'Monthly')
    // In March 2026, the current period should be March
    expect(result.start).toBe('2026-03-01')
    expect(result.end).toBe('2026-03-31')
  })

  it('should return quarterly period boundaries', () => {
    // Start: 2026-01-01, period: Quarterly
    // March 9 2026 is in Q1 (Jan-Mar)
    const result = getCurrentPeriod('2026-01-01', 'Quarterly')
    expect(result.start).toBe('2026-01-01')
    expect(result.end).toBe('2026-03-31')
  })

  it('should return half-yearly period boundaries', () => {
    const result = getCurrentPeriod('2026-01-01', 'HalfYearly')
    expect(result.start).toBe('2026-01-01')
    expect(result.end).toBe('2026-06-30')
  })

  it('should return annual period boundaries', () => {
    const result = getCurrentPeriod('2026-01-01', 'Annual')
    expect(result.start).toBe('2026-01-01')
    expect(result.end).toBe('2026-12-31')
  })

  it('should handle start date in the future (return first period)', () => {
    const result = getCurrentPeriod('2027-06-01', 'Monthly')
    expect(result.start).toBe('2027-06-01')
    expect(result.end).toBe('2027-06-30')
  })

  it('should handle start date with custom day', () => {
    // Budget starts on 15th — with frozen date of Mar 9, totalMonths = 3,
    // cycleIndex = 3, so periodStart = Mar 15, periodEnd = Apr 14
    // (the function looks at month boundaries, not day boundaries)
    const result = getCurrentPeriod('2025-12-15', 'Monthly')
    expect(result.start).toBe('2026-03-15')
    expect(result.end).toBe('2026-04-14')
  })
})

// ============================================================================
// BudgetService.getBudgetStatus
// ============================================================================

describe('BudgetService.getBudgetStatus', () => {
  it('should return budget status with utilization', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    // Return 2 approved invoices totaling 3000 PLN, then empty cost documents
    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 1500 }),
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 1500 }),
      ])
      .mockResolvedValueOnce([]) // cost documents

    const status = await svc.getBudgetStatus('mpk-001')

    expect(status).not.toBeNull()
    expect(status!.mpkCenterName).toBe('Marketing')
    expect(status!.budgetAmount).toBe(10000)
    expect(status!.utilized).toBe(3000)
    expect(status!.remaining).toBe(7000)
    expect(status!.utilizationPercent).toBe(30)
    expect(status!.isWarning).toBe(false)
    expect(status!.isExceeded).toBe(false)
    expect(status!.invoiceCount).toBe(2)

    getById.mockRestore()
  })

  it('should return null when MPK has no budget', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithoutBudget)

    const status = await svc.getBudgetStatus('mpk-002')
    expect(status).toBeNull()

    getById.mockRestore()
  })

  it('should return null when MPK not found', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(null)

    const status = await svc.getBudgetStatus('mpk-999')
    expect(status).toBeNull()

    getById.mockRestore()
  })

  it('should flag isWarning at 80%', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 8000 }),
      ])
      .mockResolvedValueOnce([]) // cost documents

    const status = await svc.getBudgetStatus('mpk-001')

    expect(status!.utilizationPercent).toBe(80)
    expect(status!.isWarning).toBe(true)
    expect(status!.isExceeded).toBe(false)

    getById.mockRestore()
  })

  it('should flag isExceeded at 100%+', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 12000 }),
      ])
      .mockResolvedValueOnce([]) // cost documents

    const status = await svc.getBudgetStatus('mpk-001')

    expect(status!.utilizationPercent).toBe(120)
    expect(status!.isWarning).toBe(true)
    expect(status!.isExceeded).toBe(true)

    getById.mockRestore()
  })

  it('should apply D19: use grossAmount when grossAmountPln is null', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({
          [DV.invoice.grossAmountPln]: undefined,
          [DV.invoice.grossAmount]: 5000,
        }),
      ])
      .mockResolvedValueOnce([]) // cost documents

    const status = await svc.getBudgetStatus('mpk-001')
    expect(status!.utilized).toBe(5000)

    getById.mockRestore()
  })
})

// ============================================================================
// BudgetService.getBudgetSummary
// ============================================================================

describe('BudgetService.getBudgetSummary', () => {
  it('should return budgets for all MPKs with budget configured', async () => {
    const svc = createService()

    const getAll = vi.spyOn(MpkCenterService.prototype, 'getAll')
      .mockResolvedValueOnce([mpkWithBudget, mpkWithoutBudget, mpkWithQuarterlyBudget])

    // getBudgetStatus calls getById + listAll for each MPK with budget
    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)
      .mockResolvedValueOnce(mpkWithQuarterlyBudget)

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 2000 })])
      .mockResolvedValueOnce([]) // cost documents for mpk-001
      .mockResolvedValueOnce([makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 10000 })])
      .mockResolvedValueOnce([]) // cost documents for mpk-003

    const summary = await svc.getBudgetSummary('setting-001')

    expect(summary).toHaveLength(2)
    expect(summary[0].mpkCenterName).toBe('Marketing')
    expect(summary[0].utilized).toBe(2000)
    expect(summary[1].mpkCenterName).toBe('R&D')
    expect(summary[1].utilized).toBe(10000)

    getAll.mockRestore()
    getById.mockRestore()
  })

  it('should return empty array when no MPKs have budgets', async () => {
    const svc = createService()

    const getAll = vi.spyOn(MpkCenterService.prototype, 'getAll')
      .mockResolvedValueOnce([mpkWithoutBudget])

    const summary = await svc.getBudgetSummary('setting-001')
    expect(summary).toHaveLength(0)

    getAll.mockRestore()
  })
})

// ============================================================================
// BudgetService.checkBudgetOnApproval
// ============================================================================

describe('BudgetService.checkBudgetOnApproval', () => {
  it('should detect budget would be exceeded after approval', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    // Current utilization: 9000
    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 9000 }),
      ])
      .mockResolvedValueOnce([]) // cost documents

    // Invoice being approved: 2000
    vi.mocked(dataverseClient.getById).mockResolvedValueOnce(
      makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 2000 })
    )

    const result = await svc.checkBudgetOnApproval('inv-new', 'mpk-001')

    expect(result).not.toBeNull()
    expect(result!.wouldExceed).toBe(true)
    expect(result!.isWarning).toBe(true)
    expect(result!.currentUtilized).toBe(9000)
    expect(result!.afterAmount).toBe(11000)
    expect(result!.utilizationPercentAfter).toBe(110)

    getById.mockRestore()
  })

  it('should detect warning without exceeding', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    // Current utilization: 7000
    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 7000 }),
      ])
      .mockResolvedValueOnce([]) // cost documents

    // Invoice: 1500 → total 8500 = 85%
    vi.mocked(dataverseClient.getById).mockResolvedValueOnce(
      makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 1500 })
    )

    const result = await svc.checkBudgetOnApproval('inv-new', 'mpk-001')

    expect(result!.wouldExceed).toBe(false)
    expect(result!.isWarning).toBe(true)
    expect(result!.utilizationPercentAfter).toBe(85)

    getById.mockRestore()
  })

  it('should return null when MPK has no budget', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithoutBudget)

    const result = await svc.checkBudgetOnApproval('inv-new', 'mpk-002')
    expect(result).toBeNull()

    getById.mockRestore()
  })
})

// ============================================================================
// BudgetService.handleMpkChange
// ============================================================================

describe('BudgetService.handleMpkChange', () => {
  it('should return budget status for both old and new MPK (D18)', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)          // old MPK
      .mockResolvedValueOnce(mpkWithQuarterlyBudget)  // new MPK

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 3000 })])   // old invoices
      .mockResolvedValueOnce([]) // old cost documents
      .mockResolvedValueOnce([makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 20000 })])  // new invoices
      .mockResolvedValueOnce([]) // new cost documents

    const result = await svc.handleMpkChange('mpk-001', 'mpk-003')

    expect(result.oldBudget).not.toBeNull()
    expect(result.oldBudget!.utilized).toBe(3000)
    expect(result.newBudget).not.toBeNull()
    expect(result.newBudget!.utilized).toBe(20000)

    getById.mockRestore()
  })

  it('should handle old MPK without budget', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithoutBudget)       // old MPK (no budget)
      .mockResolvedValueOnce(mpkWithBudget)           // new MPK

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 1000 })])
      .mockResolvedValueOnce([]) // cost documents

    const result = await svc.handleMpkChange('mpk-002', 'mpk-001')

    expect(result.oldBudget).toBeNull()
    expect(result.newBudget).not.toBeNull()

    getById.mockRestore()
  })
})

// ============================================================================
// BudgetService.recalculateAfterCorrection (4.6)
// ============================================================================

describe('BudgetService.recalculateAfterCorrection', () => {
  it('should return updated budget status (correctives reduce utilization)', async () => {
    const svc = createService()

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithBudget)

    // Two invoices: one regular (5000) and one corrective (-1000)
    // Net utilization: 4000
    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: 5000 }),
        makeApprovedInvoice({ [DV.invoice.grossAmountPln]: -1000 }), // corrective
      ])
      .mockResolvedValueOnce([]) // cost documents

    const status = await svc.recalculateAfterCorrection('mpk-001')

    expect(status).not.toBeNull()
    expect(status!.utilized).toBe(4000)
    expect(status!.remaining).toBe(6000)

    getById.mockRestore()
  })
})
