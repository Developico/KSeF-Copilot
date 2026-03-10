import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseClient: {
    listAll: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/logger', () => ({
  logDataverseInfo: vi.fn(),
  logDataverseError: vi.fn(),
  logDataverseMapping: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services/budget-service', () => ({
  budgetService: {
    getBudgetStatus: vi.fn(),
    getBudgetSummary: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/mpk-center-service', () => ({
  mpkCenterService: {
    getById: vi.fn(),
    getApprovers: vi.fn().mockResolvedValue([]),
    resolveSystemUserByOid: vi.fn().mockResolvedValue(null),
  },
}))

import { dataverseClient } from '../src/lib/dataverse/client'
import { budgetService } from '../src/lib/dataverse/services/budget-service'
import { mpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { ReportService } from '../src/lib/dataverse/services/report-service'
import { DV, APPROVAL_STATUS } from '../src/lib/dataverse/config'

// ── Helpers ────────────────────────────────────────────────────

function createService() {
  return new ReportService()
}

const adminUser = { id: 'admin-oid', email: 'admin@test.com', name: 'Admin', roles: ['Admin'] }

const sampleBudgetStatus = {
  mpkCenterId: 'mpk-001',
  mpkCenterName: 'Marketing',
  budgetAmount: 10000,
  budgetPeriod: 'Monthly' as const,
  budgetStartDate: '2026-01-01',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  utilized: 8000,
  remaining: 2000,
  utilizationPercent: 80,
  isWarning: true,
  isExceeded: false,
  invoiceCount: 5,
}

const inv = DV.invoice

function makeDvInvoice(overrides: Record<string, unknown> = {}) {
  return {
    [inv.id]: 'inv-001',
    [inv.name]: 'FV/2026/001',
    dvlp_sellername: 'Acme Corp',
    [inv.grossAmount]: 5000,
    [inv.currency]: 0, // PLN
    [inv.mpkCenterLookup]: 'mpk-001',
    [inv.approvalStatus]: APPROVAL_STATUS.APPROVED,
    [inv.approvedBy]: 'admin@test.com',
    [inv.approvedAt]: '2026-03-09T10:00:00Z',
    [inv.approvalComment]: 'OK',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// ReportService.getBudgetUtilization
// ============================================================================

describe('ReportService.getBudgetUtilization', () => {
  it('should return budget status for all MPKs', async () => {
    const svc = createService()
    vi.mocked(budgetService.getBudgetSummary).mockResolvedValue([sampleBudgetStatus])

    const result = await svc.getBudgetUtilization('setting-001')

    expect(result.mpkCenters).toHaveLength(1)
    expect(result.totals.totalBudget).toBe(10000)
    expect(result.totals.totalUtilized).toBe(8000)
    expect(result.totals.totalRemaining).toBe(2000)
    expect(result.totals.overallUtilizationPercent).toBe(80)
    expect(result.period.from).toBe('2026-03-01')
    expect(result.period.to).toBe('2026-03-31')
  })

  it('should return budget status for a single MPK', async () => {
    const svc = createService()
    vi.mocked(budgetService.getBudgetStatus).mockResolvedValue(sampleBudgetStatus)

    const result = await svc.getBudgetUtilization('setting-001', 'mpk-001')

    expect(result.mpkCenters).toHaveLength(1)
    expect(budgetService.getBudgetStatus).toHaveBeenCalledWith('mpk-001')
    expect(budgetService.getBudgetSummary).not.toHaveBeenCalled()
  })

  it('should return empty when MPK has no budget', async () => {
    const svc = createService()
    vi.mocked(budgetService.getBudgetStatus).mockResolvedValue(null)

    const result = await svc.getBudgetUtilization('setting-001', 'mpk-001')

    expect(result.mpkCenters).toHaveLength(0)
    expect(result.totals.totalBudget).toBe(0)
    expect(result.totals.overallUtilizationPercent).toBe(0)
    expect(result.period.from).toBe('')
  })

  it('should aggregate totals across multiple MPKs', async () => {
    const svc = createService()
    vi.mocked(budgetService.getBudgetSummary).mockResolvedValue([
      sampleBudgetStatus,
      {
        ...sampleBudgetStatus,
        mpkCenterId: 'mpk-002',
        mpkCenterName: 'Sales',
        budgetAmount: 20000,
        utilized: 15000,
        remaining: 5000,
      },
    ])

    const result = await svc.getBudgetUtilization('setting-001')

    expect(result.mpkCenters).toHaveLength(2)
    expect(result.totals.totalBudget).toBe(30000)
    expect(result.totals.totalUtilized).toBe(23000)
    expect(result.totals.totalRemaining).toBe(7000)
    expect(result.totals.overallUtilizationPercent).toBe(76.67)
  })
})

// ============================================================================
// ReportService.getApprovalHistory
// ============================================================================

describe('ReportService.getApprovalHistory', () => {
  beforeEach(() => {
    // Default: adminUser is resolved and is approver for all MPK centers
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({ systemUserId: 'sys-admin' } as any)
    vi.mocked(mpkCenterService.getApprovers).mockResolvedValue([{ systemUserId: 'sys-admin' }] as any)
  })

  it('should return mapped approval history entries', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([makeDvInvoice()])
    vi.mocked(mpkCenterService.getById).mockResolvedValue({
      id: 'mpk-001',
      name: 'Marketing',
    } as any)

    const result = await svc.getApprovalHistory(adminUser, 'setting-001')

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].invoiceId).toBe('inv-001')
    expect(result.entries[0].mpkCenterName).toBe('Marketing')
    expect(result.entries[0].approvalStatus).toBe('Approved')
    expect(result.count).toBe(1)
    expect(result.summary.approved).toBe(1)
  })

  it('should apply date filters', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([])

    await svc.getApprovalHistory(adminUser, 'setting-001', {
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
    })

    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain('ge 2026-01-01')
    expect(query).toContain('le 2026-03-31')
  })

  it('should filter by mpkCenterId', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([])

    await svc.getApprovalHistory(adminUser, 'setting-001', { mpkCenterId: 'mpk-001' })

    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain('mpk-001')
  })

  it('should filter by status', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([])

    await svc.getApprovalHistory(adminUser, 'setting-001', { status: 'Pending' })

    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain(`${inv.approvalStatus} eq ${APPROVAL_STATUS.PENDING}`)
  })

  it('should compute summary counts correctly', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([
      makeDvInvoice({ [inv.approvalStatus]: APPROVAL_STATUS.APPROVED }),
      makeDvInvoice({ [inv.id]: 'inv-002', [inv.approvalStatus]: APPROVAL_STATUS.APPROVED }),
      makeDvInvoice({ [inv.id]: 'inv-003', [inv.approvalStatus]: APPROVAL_STATUS.REJECTED }),
      makeDvInvoice({ [inv.id]: 'inv-004', [inv.approvalStatus]: APPROVAL_STATUS.PENDING }),
    ])
    vi.mocked(mpkCenterService.getById).mockResolvedValue({
      id: 'mpk-001',
      name: 'Marketing',
    } as any)

    const result = await svc.getApprovalHistory(adminUser, 'setting-001')

    expect(result.summary.approved).toBe(2)
    expect(result.summary.rejected).toBe(1)
    expect(result.summary.pending).toBe(1)
    expect(result.summary.cancelled).toBe(0)
    expect(result.count).toBe(4)
  })

  it('should resolve MPK names only once per unique MPK', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([
      makeDvInvoice(),
      makeDvInvoice({ [inv.id]: 'inv-002' }), // same mpk-001
    ])
    vi.mocked(mpkCenterService.getById).mockResolvedValue({
      id: 'mpk-001',
      name: 'Marketing',
    } as any)

    await svc.getApprovalHistory(adminUser, 'setting-001')

    // Should call getById only once for mpk-001
    expect(mpkCenterService.getById).toHaveBeenCalledTimes(1)
  })

  it('should exclude Draft invoices', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValue([])

    await svc.getApprovalHistory(adminUser, 'setting-001')

    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain(`${inv.approvalStatus} ne ${APPROVAL_STATUS.DRAFT}`)
  })

  it('should filter by user MPK centers where user is approver', async () => {
    const svc = createService()
    const readerUser = { id: 'reader-oid', email: 'reader@test.com', name: 'Reader', roles: ['Reader'] }
    vi.mocked(dataverseClient.listAll).mockResolvedValue([
      makeDvInvoice({ [inv.mpkCenterLookup]: 'mpk-001' }),
      makeDvInvoice({ [inv.id]: 'inv-002', [inv.mpkCenterLookup]: 'mpk-002' }),
    ])
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({ systemUserId: 'sys-001' } as any)
    vi.mocked(mpkCenterService.getApprovers).mockImplementation(async (id: string) => {
      if (id === 'mpk-001') return [{ systemUserId: 'sys-001' }] as any
      return []
    })
    vi.mocked(mpkCenterService.getById).mockResolvedValue({ id: 'mpk-001', name: 'Marketing' } as any)

    const result = await svc.getApprovalHistory(readerUser, 'setting-001')

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].invoiceId).toBe('inv-001')
    expect(mpkCenterService.resolveSystemUserByOid).toHaveBeenCalledWith('reader-oid')
  })
})
