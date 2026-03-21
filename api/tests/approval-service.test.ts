import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('../src/lib/dataverse/services/budget-service', () => ({
  budgetService: {
    getBudgetStatus: vi.fn().mockResolvedValue(null),
    checkBudgetOnApproval: vi.fn().mockResolvedValue(null),
  },
  BudgetService: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services/notification-service', () => ({
  notificationService: {
    create: vi.fn().mockResolvedValue({}),
    createForRecipients: vi.fn().mockResolvedValue(0),
  },
  NotificationService: vi.fn(),
}))

import { dataverseClient } from '../src/lib/dataverse/client'
import { ApprovalService } from '../src/lib/dataverse/services/approval-service'
import { MpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { notificationService } from '../src/lib/dataverse/services/notification-service'
import { DV, APPROVAL_STATUS, INVOICE_TYPE } from '../src/lib/dataverse/config'
import type { AuthUser } from '../src/types/api'

// ── Helpers ────────────────────────────────────────────────────

function createService() {
  return new ApprovalService()
}

// ── Fixtures ───────────────────────────────────────────────────

const adminUser: AuthUser = {
  id: 'oid-admin',
  email: 'admin@example.com',
  name: 'Admin User',
  roles: ['Admin'],
}

const approverUser: AuthUser = {
  id: 'oid-approver',
  email: 'approver@example.com',
  name: 'Approver User',
  roles: ['Reader'],
}

const readerUser: AuthUser = {
  id: 'oid-reader',
  email: 'reader@example.com',
  name: 'Reader User',
  roles: ['Reader'],
}

function makeDvInvoice(overrides: Record<string, unknown> = {}) {
  return {
    [DV.invoice.id]: 'inv-001',
    [DV.invoice.name]: 'FV/2026/001',
    [DV.invoice.mpkCenterLookup]: 'mpk-001',
    [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
    [DV.invoice.invoiceType]: INVOICE_TYPE.VAT,
    [DV.invoice.invoiceDate]: '2026-01-15',
    [DV.invoice.grossAmount]: 1230,
    [DV.invoice.grossAmountPln]: 1230,
    [DV.invoice.currency]: 100000000, // PLN
    [DV.invoice.modifiedOn]: '2026-01-15T10:00:00Z',
    [DV.invoice.settingLookup]: 'setting-001',
    dvlp_sellername: 'Supplier A',
    ...overrides,
  }
}

const mpkWithApproval = {
  id: 'mpk-001',
  name: 'Marketing',
  description: 'Marketing dept',
  settingId: 'setting-001',
  isActive: true,
  approvalRequired: true,
  approvalSlaHours: 24,
  createdOn: '2026-01-01T00:00:00Z',
  modifiedOn: '2026-01-01T00:00:00Z',
}

const mpkWithoutApproval = {
  id: 'mpk-002',
  name: 'Sales',
  description: null,
  settingId: 'setting-001',
  isActive: true,
  approvalRequired: false,
  createdOn: '2026-01-01T00:00:00Z',
  modifiedOn: '2026-01-01T00:00:00Z',
}

const approverDvUser = {
  systemUserId: 'sysuser-approver',
  fullName: 'Approver User',
  email: 'approver@example.com',
  azureObjectId: 'oid-approver',
  isDisabled: false,
}

const approverRecord = {
  id: 'approver-rec-1',
  mpkCenterId: 'mpk-001',
  systemUserId: 'sysuser-approver',
  name: 'Approver – mpk-001',
  fullName: 'Approver User',
  email: 'approver@test.com',
}

// ── Restore mocks between tests ────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// ApprovalService.autoTrigger
// ============================================================================

describe('ApprovalService.autoTrigger', () => {
  it('should set PENDING when MPK requires approval (D15)', async () => {
    const svc = createService()

    // getById for invoice
    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
      }))

    // Mock MpkCenterService.getById via the mpkCenterService singleton
    const mpkGetById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    // update
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.autoTrigger('inv-001')

    expect(result).toBeTruthy()
    expect(result!.approvalStatus).toBe('Pending')
    expect(dataverseClient.update).toHaveBeenCalledWith(
      DV.invoice.entitySet,
      'inv-001',
      expect.objectContaining({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
      })
    )

    mpkGetById.mockRestore()
  })

  it('should set DRAFT when MPK does NOT require approval (D6)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
        [DV.invoice.mpkCenterLookup]: 'mpk-002',
      }))

    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithoutApproval)

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.autoTrigger('inv-001')
    expect(result!.approvalStatus).toBe('Draft')

    spy.mockRestore()
  })

  it('should auto-approve corrective invoices (D4)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.invoiceType]: INVOICE_TYPE.CORRECTIVE,
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
      }))

    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.autoTrigger('inv-001')

    expect(result!.approvalStatus).toBe('Approved')
    expect(result!.approvedBy).toBe('System (auto-approved KOR)')

    spy.mockRestore()
  })

  it('should skip if invoice already approved (D3)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.APPROVED,
      }))

    const result = await svc.autoTrigger('inv-001')
    expect(result).toBeNull()
    expect(dataverseClient.update).not.toHaveBeenCalled()
  })

  it('should skip if invoice has no MPK', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.mpkCenterLookup]: null,
      }))

    const result = await svc.autoTrigger('inv-001')
    expect(result).toBeNull()
  })

  it('should return null if invoice not found', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.getById).mockResolvedValueOnce(null)

    const result = await svc.autoTrigger('inv-999')
    expect(result).toBeNull()
  })
})

// ============================================================================
// ApprovalService.approve
// ============================================================================

describe('ApprovalService.approve', () => {
  it('should approve invoice by authorized approver', async () => {
    const svc = createService()

    // getById for approval check
    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    // isAuthorizedApprover: resolveSystemUserByOid + getApprovers
    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(approverDvUser)
    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.approve('inv-001', approverUser, 'Looks good')

    expect(result.approvalStatus).toBe('Approved')
    expect(result.approvedBy).toBe('Approver User')
    expect(result.approvalComment).toBe('Looks good')
    expect(dataverseClient.update).toHaveBeenCalledWith(
      DV.invoice.entitySet,
      'inv-001',
      expect.objectContaining({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.APPROVED,
        [DV.invoice.approvedByOid]: 'oid-approver',
      })
    )

    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })

  it('should approve by Admin even without being an explicit approver (D2)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    // Admin can approve without being in the approvers list
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.approve('inv-001', adminUser)
    expect(result.approvalStatus).toBe('Approved')
    expect(result.approvedBy).toBe('Admin User')
  })

  it('should reject if invoice is not PENDING', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
      }))

    await expect(svc.approve('inv-001', adminUser))
      .rejects.toThrow('not in Pending status')
  })

  it('should reject if user is not authorized', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(null) // user not found in DV
    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    await expect(svc.approve('inv-001', readerUser))
      .rejects.toThrow('not an authorized approver')

    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })

  it('should throw if invoice has no MPK', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.mpkCenterLookup]: null,
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
      }))

    await expect(svc.approve('inv-001', adminUser))
      .rejects.toThrow('no MPK center assigned')
  })
})

// ============================================================================
// ApprovalService.reject
// ============================================================================

describe('ApprovalService.reject', () => {
  it('should reject with comment', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    // Admin as approver
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.reject('inv-001', adminUser, 'Wrong MPK assignment')
    expect(result.approvalStatus).toBe('Rejected')
    expect(result.approvalComment).toBe('Wrong MPK assignment')
  })

  it('should require comment', async () => {
    const svc = createService()

    await expect(svc.reject('inv-001', adminUser, ''))
      .rejects.toThrow('Comment is required')
  })

  it('should not reject non-PENDING invoice', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.APPROVED,
      }))

    await expect(svc.reject('inv-001', adminUser, 'reason'))
      .rejects.toThrow('not in Pending status')
  })
})

// ============================================================================
// ApprovalService.cancel
// ============================================================================

describe('ApprovalService.cancel', () => {
  it('should cancel PENDING invoice as Admin (D16)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.cancel('inv-001', adminUser, 'Duplicate')
    expect(result.approvalStatus).toBe('Cancelled')
    expect(result.approvalComment).toBe('Duplicate')
  })

  it('should reject cancel from non-Admin (D16)', async () => {
    const svc = createService()

    await expect(svc.cancel('inv-001', approverUser))
      .rejects.toThrow('Only Admin can cancel')
  })

  it('should revert APPROVED invoice to PENDING (undo)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.APPROVED,
      }))

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.cancel('inv-001', adminUser)
    expect(result.approvalStatus).toBe('Pending')
  })

  it('should revert REJECTED invoice to PENDING (undo)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.REJECTED,
      }))

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.cancel('inv-001', adminUser)
    expect(result.approvalStatus).toBe('Pending')
  })

  it('should not cancel DRAFT invoice', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
      }))

    await expect(svc.cancel('inv-001', adminUser))
      .rejects.toThrow('Cannot cancel invoice')
  })
})

// ============================================================================
// ApprovalService.bulkApprove
// ============================================================================

describe('ApprovalService.bulkApprove', () => {
  it('should approve multiple invoices (D17)', async () => {
    const svc = createService()

    // Two invoices
    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({ [DV.invoice.id]: 'inv-001' }))
      .mockResolvedValueOnce(makeDvInvoice({ [DV.invoice.id]: 'inv-002' }))

    vi.mocked(dataverseClient.update)
      .mockResolvedValue(undefined)

    const result = await svc.bulkApprove(['inv-001', 'inv-002'], adminUser, 'Bulk OK')

    expect(result.approved).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle partial failures gracefully', async () => {
    const svc = createService()

    // First invoice OK, second fails
    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.id]: 'inv-002',
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT, // not PENDING → will fail
      }))

    vi.mocked(dataverseClient.update).mockResolvedValue(undefined)

    const result = await svc.bulkApprove(['inv-001', 'inv-002'], adminUser)

    expect(result.approved).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors[0].invoiceId).toBe('inv-002')
  })
})

// ============================================================================
// ApprovalService.listPending
// ============================================================================

describe('ApprovalService.listPending', () => {
  it('should return pending invoices for Admin', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([makeDvInvoice()])

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    const result = await svc.listPending(adminUser, 'setting-001')

    expect(result).toHaveLength(1)
    expect(result[0].invoiceNumber).toBe('FV/2026/001')
    expect(result[0].mpkCenterName).toBe('Marketing')
    expect(result[0].approvalSlaHours).toBe(24)

    getById.mockRestore()
  })

  it('should filter by approver MPKs for non-Admin', async () => {
    const svc = createService()

    // Two invoices, different MPKs
    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeDvInvoice({ [DV.invoice.mpkCenterLookup]: 'mpk-001' }),
        makeDvInvoice({
          [DV.invoice.id]: 'inv-002',
          [DV.invoice.mpkCenterLookup]: 'mpk-002',
        }),
      ])

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)    // mpk-001
      .mockResolvedValueOnce(mpkWithoutApproval) // mpk-002

    // Resolve user OID
    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(approverDvUser)

    // User is approver only for mpk-001
    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])  // mpk-001 → user is approver
      .mockResolvedValueOnce([])                // mpk-002 → no approvers match

    const result = await svc.listPending(approverUser, 'setting-001')

    expect(result).toHaveLength(1)
    expect(result[0].mpkCenterId).toBe('mpk-001')

    getById.mockRestore()
    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })

  it('should return empty when user has no DV account', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([makeDvInvoice()])

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(null)

    const result = await svc.listPending(readerUser, 'setting-001')
    expect(result).toHaveLength(0)

    getById.mockRestore()
    resolveOid.mockRestore()
  })
})

// ============================================================================
// ApprovalService.refreshApprovers
// ============================================================================

describe('ApprovalService.refreshApprovers', () => {
  it('should return current approver count (D20)', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    const result = await svc.refreshApprovers('inv-001', adminUser)
    expect(result.mpkCenterId).toBe('mpk-001')
    expect(result.approverCount).toBe(1)

    getApprovers.mockRestore()
  })

  it('should fail if invoice has no MPK', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice({
        [DV.invoice.mpkCenterLookup]: null,
      }))

    await expect(svc.refreshApprovers('inv-001', adminUser))
      .rejects.toThrow('no MPK center assigned')
  })

  it('should fail if user is not authorized', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById)
      .mockResolvedValueOnce(makeDvInvoice())

    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(null) // not found in DV

    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    await expect(svc.refreshApprovers('inv-001', readerUser))
      .rejects.toThrow('not authorized')

    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })
})

// ============================================================================
// ApprovalService.checkSla
// ============================================================================

describe('ApprovalService.checkSla', () => {
  it('should detect overdue invoices', async () => {
    const svc = createService()

    const twoHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeDvInvoice({
          [DV.invoice.modifiedOn]: twoHoursAgo,
        }),
      ])

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce({ ...mpkWithApproval, approvalSlaHours: 24 })

    const result = await svc.checkSla('setting-001')

    expect(result).toHaveLength(1)
    expect(result[0].invoiceId).toBe('inv-001')
    expect(result[0].hoursOverdue).toBeGreaterThan(0)
    expect(result[0].slaHours).toBe(24)

    getById.mockRestore()
  })

  it('should not flag invoices within SLA', async () => {
    const svc = createService()

    const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([
        makeDvInvoice({ [DV.invoice.modifiedOn]: minuteAgo }),
      ])

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce({ ...mpkWithApproval, approvalSlaHours: 24 })

    const result = await svc.checkSla('setting-001')
    expect(result).toHaveLength(0)

    getById.mockRestore()
  })

  it('should skip invoices with no SLA on MPK', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll)
      .mockResolvedValueOnce([makeDvInvoice()])

    const getById = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce({ ...mpkWithApproval, approvalSlaHours: undefined })

    const result = await svc.checkSla('setting-001')
    expect(result).toHaveLength(0)

    getById.mockRestore()
  })
})

// ============================================================================
// ApprovalService.isAuthorizedApprover
// ============================================================================

describe('ApprovalService.isAuthorizedApprover', () => {
  it('should return true for Admin (D2)', async () => {
    const svc = createService()
    const authorized = await svc.isAuthorizedApprover(adminUser, 'mpk-001')
    expect(authorized).toBe(true)
  })

  it('should return true for assigned approver', async () => {
    const svc = createService()

    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(approverDvUser)
    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    const authorized = await svc.isAuthorizedApprover(approverUser, 'mpk-001')
    expect(authorized).toBe(true)

    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })

  it('should return false for non-approver Reader', async () => {
    const svc = createService()

    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce({
        systemUserId: 'sysuser-other',
        fullName: 'Other User',
        email: 'other@example.com',
        isDisabled: false,
      })
    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    const authorized = await svc.isAuthorizedApprover(readerUser, 'mpk-001')
    expect(authorized).toBe(false)

    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })

  it('should return false when user has no DV account', async () => {
    const svc = createService()

    const resolveOid = vi.spyOn(MpkCenterService.prototype, 'resolveSystemUserByOid')
      .mockResolvedValueOnce(null)
    const getApprovers = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValueOnce([approverRecord])

    const authorized = await svc.isAuthorizedApprover(readerUser, 'mpk-001')
    expect(authorized).toBe(false)

    resolveOid.mockRestore()
    getApprovers.mockRestore()
  })
})

// ============================================================================
// ApprovalService.autoTrigger — D21 (approvalEffectiveFrom)
// ============================================================================

describe('ApprovalService.autoTrigger – D21 effectiveFrom', () => {
  const mpkWithEffectiveFrom = {
    ...mpkWithApproval,
    approvalEffectiveFrom: '2026-06-01',
  }

  it('should set DRAFT when invoice date is before effectiveFrom', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById).mockResolvedValueOnce(
      makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
        [DV.invoice.invoiceDate]: '2026-05-15',
      })
    )

    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithEffectiveFrom)

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.autoTrigger('inv-001')
    expect(result).toBeTruthy()
    expect(result!.approvalStatus).toBe('Draft')

    spy.mockRestore()
  })

  it('should set PENDING when invoice date is on or after effectiveFrom', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById).mockResolvedValueOnce(
      makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
        [DV.invoice.invoiceDate]: '2026-06-01',
      })
    )

    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithEffectiveFrom)

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.autoTrigger('inv-001')
    expect(result).toBeTruthy()
    expect(result!.approvalStatus).toBe('Pending')

    spy.mockRestore()
  })

  it('should proceed normally when effectiveFrom is not set', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.getById).mockResolvedValueOnce(
      makeDvInvoice({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
        [DV.invoice.invoiceDate]: '2025-01-01',
      })
    )

    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    const result = await svc.autoTrigger('inv-001')
    expect(result).toBeTruthy()
    expect(result!.approvalStatus).toBe('Pending')

    spy.mockRestore()
  })
})

// ============================================================================
// ApprovalService.applyApprovalToMpk
// ============================================================================

describe('ApprovalService.applyApprovalToMpk', () => {
  it('should throw if MPK center not found', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(null)

    await expect(svc.applyApprovalToMpk('nonexistent', 'unprocessed')).rejects.toThrow('MPK center not found')
    spy.mockRestore()
  })

  it('should throw if MPK does not require approval', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithoutApproval)

    await expect(svc.applyApprovalToMpk('mpk-002', 'unprocessed')).rejects.toThrow('does not require approval')
    spy.mockRestore()
  })

  it('should return counts when processing invoices with dryRun', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
        makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT }),
        makeDvInvoice({
          [DV.invoice.id]: 'inv-002',
          [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
          [DV.invoice.invoiceType]: INVOICE_TYPE.CORRECTIVE,
        }),
      ])

    const result = await svc.applyApprovalToMpk('mpk-001', 'unprocessed', true)

    expect(result.total).toBe(2)
    expect(result.updated).toBe(1)
    expect(result.autoApproved).toBe(1)
    expect(result.skipped).toBe(0)
    expect(dataverseClient.update).not.toHaveBeenCalled()

    spy.mockRestore()
  })

  it('should actually update invoices when not dryRun', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
        makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT }),
      ])
    vi.mocked(dataverseClient.update).mockResolvedValue(undefined)

    const result = await svc.applyApprovalToMpk('mpk-001', 'unprocessed', false)

    expect(result.total).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.autoApproved).toBe(0)
    expect(dataverseClient.update).toHaveBeenCalledTimes(1)
    expect(dataverseClient.update).toHaveBeenCalledWith(
      DV.invoice.entitySet,
      'inv-001',
      expect.objectContaining({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
      })
    )

    spy.mockRestore()
  })

  it('should fire ApprovalRequested notifications for each invoice set to Pending', async () => {
    const svc = createService()
    const mpkSpy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)
    const approversSpy = vi.spyOn(MpkCenterService.prototype, 'getApprovers')
      .mockResolvedValue([{ systemUserId: 'user-a', fullName: 'User A' } as never])

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT }),
      makeDvInvoice({
        [DV.invoice.id]: 'inv-002',
        [DV.invoice.name]: 'FV/2026/002',
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
      }),
    ])
    vi.mocked(dataverseClient.update).mockResolvedValue(undefined)

    await svc.applyApprovalToMpk('mpk-001', 'unprocessed', false)

    // Wait for fire-and-forget promises
    await vi.waitFor(() => {
      expect(vi.mocked(notificationService.createForRecipients)).toHaveBeenCalledTimes(2)
    })

    expect(vi.mocked(notificationService.createForRecipients)).toHaveBeenCalledWith(
      ['user-a'],
      expect.objectContaining({
        settingId: 'setting-001',
        type: 'ApprovalRequested',
        invoiceId: 'inv-001',
        mpkCenterId: 'mpk-001',
      })
    )

    mpkSpy.mockRestore()
    approversSpy.mockRestore()
  })

  it('should NOT fire notifications in dryRun mode', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT }),
    ])

    await svc.applyApprovalToMpk('mpk-001', 'unprocessed', true)

    expect(vi.mocked(notificationService.createForRecipients)).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})

// ============================================================================
// ApprovalService.revokeApprovalFromMpk
// ============================================================================

describe('ApprovalService.revokeApprovalFromMpk', () => {
  it('should throw if MPK center not found', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(null)

    await expect(svc.revokeApprovalFromMpk('nonexistent', 'pending')).rejects.toThrow('MPK center not found')
    spy.mockRestore()
  })

  it('should dryRun count pending invoices without updating', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING }),
      makeDvInvoice({
        [DV.invoice.id]: 'inv-002',
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
      }),
    ])

    const result = await svc.revokeApprovalFromMpk('mpk-001', 'pending', true)

    expect(result.total).toBe(2)
    expect(result.updated).toBe(2)
    expect(result.skipped).toBe(0)
    expect(dataverseClient.update).not.toHaveBeenCalled()

    spy.mockRestore()
  })

  it('should update invoices back to Draft when not dryRun', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.APPROVED }),
    ])
    vi.mocked(dataverseClient.update).mockResolvedValue(undefined)

    const result = await svc.revokeApprovalFromMpk('mpk-001', 'decided', false)

    expect(result.total).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(0)
    expect(dataverseClient.update).toHaveBeenCalledTimes(1)
    expect(dataverseClient.update).toHaveBeenCalledWith(
      DV.invoice.entitySet,
      'inv-001',
      expect.objectContaining({
        [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
      })
    )

    spy.mockRestore()
  })

  it('should skip already-Draft invoices', async () => {
    const svc = createService()
    const spy = vi.spyOn(MpkCenterService.prototype, 'getById')
      .mockResolvedValueOnce(mpkWithApproval)

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvInvoice({ [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT }),
    ])

    const result = await svc.revokeApprovalFromMpk('mpk-001', 'all', false)

    expect(result.total).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(1)
    expect(dataverseClient.update).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})
