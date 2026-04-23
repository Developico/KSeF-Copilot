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

import { dataverseClient } from '../src/lib/dataverse/client'
import { NotificationService } from '../src/lib/dataverse/services/notification-service'
import { DV, NOTIFICATION_TYPE } from '../src/lib/dataverse/config'

// ── Helpers ────────────────────────────────────────────────────

function createService() {
  return new NotificationService()
}

const n = DV.notification

function makeDvNotification(overrides: Record<string, unknown> = {}) {
  return {
    [n.id]: 'notif-001',
    [n.name]: 'ApprovalRequested: test',
    [n.recipientLookup]: 'user-001',
    [n.settingLookup]: 'setting-001',
    [n.type]: NOTIFICATION_TYPE.APPROVAL_REQUESTED,
    [n.message]: 'Invoice requires approval',
    [n.isRead]: false,
    [n.isDismissed]: false,
    [n.invoiceLookup]: 'inv-001',
    [n.mpkCenterLookup]: 'mpk-001',
    [n.createdOn]: '2026-03-09T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// NotificationService.list
// ============================================================================

describe('NotificationService.list', () => {
  it('should return mapped notifications for recipient', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification(),
      makeDvNotification({
        [n.id]: 'notif-002',
        [n.type]: NOTIFICATION_TYPE.SLA_EXCEEDED,
        [n.message]: 'SLA exceeded',
        [n.isRead]: true,
      }),
    ])

    const result = await svc.list('user-001', 'setting-001')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('notif-001')
    expect(result.items[0].type).toBe('ApprovalRequested')
    expect(result.items[0].isRead).toBe(false)
    expect(result.items[1].type).toBe('SlaExceeded')
    expect(result.items[1].isRead).toBe(true)
  })

  it('should support unreadOnly filter', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification(),
    ])

    await svc.list('user-001', 'setting-001', { unreadOnly: true })

    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain('dvlp_isread eq false')
  })

  it('should return empty for no notifications', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([])

    const result = await svc.list('user-001', 'setting-001')
    expect(result.items).toHaveLength(0)
    expect(result.count).toBe(0)
  })
})

// ============================================================================
// NotificationService.markRead
// ============================================================================

describe('NotificationService.markRead', () => {
  it('should update isRead to true', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    await svc.markRead('notif-001')

    expect(dataverseClient.update).toHaveBeenCalledWith(
      n.entitySet,
      'notif-001',
      { [n.isRead]: true }
    )
  })
})

// ============================================================================
// NotificationService.dismiss
// ============================================================================

describe('NotificationService.dismiss', () => {
  it('should update isDismissed to true', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    await svc.dismiss('notif-001')

    expect(dataverseClient.update).toHaveBeenCalledWith(
      n.entitySet,
      'notif-001',
      { [n.isDismissed]: true }
    )
  })
})

// ============================================================================
// NotificationService.create
// ============================================================================

describe('NotificationService.create', () => {
  it('should create a notification record in Dataverse', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.create).mockResolvedValueOnce(makeDvNotification())

    const result = await svc.create({
      recipientId: 'user-001',
      settingId: 'setting-001',
      type: 'ApprovalRequested',
      message: 'Invoice requires approval',
      invoiceId: 'inv-001',
      mpkCenterId: 'mpk-001',
    })

    expect(result.id).toBe('notif-001')
    expect(result.type).toBe('ApprovalRequested')
    expect(dataverseClient.create).toHaveBeenCalledWith(
      n.entitySet,
      expect.objectContaining({
        [n.type]: NOTIFICATION_TYPE.APPROVAL_REQUESTED,
        [n.message]: 'Invoice requires approval',
        [n.isRead]: false,
        [n.isDismissed]: false,
      })
    )
  })

  it('should create without optional fields', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.create).mockResolvedValueOnce(
      makeDvNotification({
        [n.type]: NOTIFICATION_TYPE.BUDGET_WARNING_80,
        [n.invoiceLookup]: undefined,
        [n.mpkCenterLookup]: undefined,
      })
    )

    const result = await svc.create({
      recipientId: 'user-001',
      settingId: 'setting-001',
      type: 'BudgetWarning80',
      message: 'Budget warning',
    })

    expect(result.type).toBe('BudgetWarning80')
    // Should NOT contain invoice/mpk binds
    const payload = vi.mocked(dataverseClient.create).mock.calls[0][1] as Record<string, unknown>
    expect(payload[n.invoiceBind]).toBeUndefined()
    expect(payload[n.mpkCenterBind]).toBeUndefined()
  })
})

// ============================================================================
// NotificationService.createForRecipients
// ============================================================================

describe('NotificationService.createForRecipients', () => {
  it('should create notifications for multiple recipients', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.create)
      .mockResolvedValueOnce(makeDvNotification())
      .mockResolvedValueOnce(makeDvNotification({ [n.id]: 'notif-002' }))

    const count = await svc.createForRecipients(
      ['user-001', 'user-002'],
      {
        settingId: 'setting-001',
        type: 'ApprovalRequested',
        message: 'Test',
      }
    )

    expect(count).toBe(2)
    expect(dataverseClient.create).toHaveBeenCalledTimes(2)
  })

  it('should continue on individual failures', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.create)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeDvNotification())

    const count = await svc.createForRecipients(
      ['user-001', 'user-002'],
      {
        settingId: 'setting-001',
        type: 'SlaExceeded',
        message: 'SLA',
      }
    )

    expect(count).toBe(1) // only second succeeded
  })
})

// ============================================================================
// NotificationService.getUnreadCount
// ============================================================================

describe('NotificationService.getUnreadCount', () => {
  it('should return count of unread notifications', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification(),
      makeDvNotification({ [n.id]: 'notif-002' }),
      makeDvNotification({ [n.id]: 'notif-003' }),
    ])

    const count = await svc.getUnreadCount('user-001', 'setting-001')
    expect(count).toBe(3)
  })
})

// ============================================================================
// Notification type mapping
// ============================================================================

describe('Notification type mapping', () => {
  it('should map all notification types correctly', async () => {
    const svc = createService()

    const types = [
      { dv: NOTIFICATION_TYPE.APPROVAL_REQUESTED, app: 'ApprovalRequested' },
      { dv: NOTIFICATION_TYPE.SLA_EXCEEDED, app: 'SlaExceeded' },
      { dv: NOTIFICATION_TYPE.BUDGET_WARNING_80, app: 'BudgetWarning80' },
      { dv: NOTIFICATION_TYPE.BUDGET_EXCEEDED, app: 'BudgetExceeded' },
      { dv: NOTIFICATION_TYPE.APPROVAL_DECIDED, app: 'ApprovalDecided' },
    ]

    for (const { dv, app } of types) {
      vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
        makeDvNotification({ [n.type]: dv }),
      ])

      const result = await svc.list('user-001', 'setting-001')
      expect(result.items[0].type).toBe(app)
    }
  })
})

// ============================================================================
// NotificationService.findActiveByGroupKey
// ============================================================================

describe('NotificationService.findActiveByGroupKey', () => {
  it('should return null when no active record exists for groupKey', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([])

    const result = await svc.findActiveByGroupKey('user-001', 'setting-001', 'sla:invoice:inv-001:recipient:user-001')

    expect(result).toBeNull()
    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain(`${n.groupKey} eq`)
    expect(query).toContain(`${n.isActive} eq true`)
  })

  it('should return the active notification when found', async () => {
    const svc = createService()
    const groupKey = 'sla:invoice:inv-001:recipient:user-001'
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification({
        [n.groupKey]: groupKey,
        [n.isActive]: true,
        [n.occurrenceCount]: 3,
        [n.type]: NOTIFICATION_TYPE.SLA_EXCEEDED,
      }),
    ])

    const result = await svc.findActiveByGroupKey('user-001', 'setting-001', groupKey)

    expect(result).not.toBeNull()
    expect(result!.groupKey).toBe(groupKey)
    expect(result!.occurrenceCount).toBe(3)
  })
})

// ============================================================================
// NotificationService.upsertRecurringNotification
// ============================================================================

describe('NotificationService.upsertRecurringNotification', () => {
  const groupKey = 'sla:invoice:inv-001:recipient:user-001'
  const baseInput = {
    recipientId: 'user-001',
    settingId: 'setting-001',
    type: 'SlaExceeded' as const,
    objectType: 'invoice' as const,
    groupKey,
    message: 'SLA exceeded: FV/001 pending 2h (SLA: 24h)',
    invoiceId: 'inv-001',
    lastHoursOverdue: 2,
  }

  it('should create a new record when no active alert exists', async () => {
    const svc = createService()
    // findActiveByGroupKey returns empty
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([])
    vi.mocked(dataverseClient.create).mockResolvedValueOnce(
      makeDvNotification({
        [n.type]: NOTIFICATION_TYPE.SLA_EXCEEDED,
        [n.groupKey]: groupKey,
        [n.isActive]: true,
        [n.occurrenceCount]: 1,
      })
    )

    await svc.upsertRecurringNotification(baseInput)

    expect(dataverseClient.create).toHaveBeenCalledOnce()
    const payload = vi.mocked(dataverseClient.create).mock.calls[0][1] as Record<string, unknown>
    expect(payload[n.groupKey]).toBe(groupKey)
    expect(payload[n.isActive]).toBe(true)
    expect(payload[n.occurrenceCount]).toBe(1)
    expect(payload[n.objectType]).toBe('invoice')
  })

  it('should update existing record and increment occurrenceCount', async () => {
    const svc = createService()
    // findActiveByGroupKey returns an existing record with occurrenceCount=3
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification({
        [n.type]: NOTIFICATION_TYPE.SLA_EXCEEDED,
        [n.groupKey]: groupKey,
        [n.isActive]: true,
        [n.occurrenceCount]: 3,
      }),
    ])
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    await svc.upsertRecurringNotification(baseInput)

    expect(dataverseClient.create).not.toHaveBeenCalled()
    expect(dataverseClient.update).toHaveBeenCalledWith(
      n.entitySet,
      'notif-001',
      expect.objectContaining({
        [n.occurrenceCount]: 4,
        [n.lastHoursOverdue]: 2,
      })
    )
  })

  it('should NOT reset isRead when updating existing record', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification({
        [n.type]: NOTIFICATION_TYPE.SLA_EXCEEDED,
        [n.groupKey]: groupKey,
        [n.isActive]: true,
        [n.isRead]: true, // user has already read this
        [n.occurrenceCount]: 1,
      }),
    ])
    vi.mocked(dataverseClient.update).mockResolvedValueOnce(undefined)

    await svc.upsertRecurringNotification(baseInput)

    const patch = vi.mocked(dataverseClient.update).mock.calls[0][2] as Record<string, unknown>
    // isRead must NOT be touched in the PATCH
    expect(patch[n.isRead]).toBeUndefined()
  })
})

// ============================================================================
// NotificationService.deactivateByGroupKeys
// ============================================================================

describe('NotificationService.deactivateByGroupKeys', () => {
  it('should deactivate records whose groupKeys are not in the active set', async () => {
    const svc = createService()

    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification({ [n.id]: 'notif-stale', [n.groupKey]: 'sla:invoice:inv-OLD:recipient:user-001', [n.isActive]: true }),
      makeDvNotification({ [n.id]: 'notif-active', [n.groupKey]: 'sla:invoice:inv-001:recipient:user-001', [n.isActive]: true }),
    ])
    vi.mocked(dataverseClient.update).mockResolvedValue(undefined)

    const deactivated = await svc.deactivateByGroupKeys(
      'setting-001',
      'SlaExceeded',
      ['sla:invoice:inv-001:recipient:user-001'], // only inv-001 is still active
    )

    expect(deactivated).toBe(1)
    expect(dataverseClient.update).toHaveBeenCalledWith(
      n.entitySet,
      'notif-stale',
      { [n.isActive]: false }
    )
    // notif-active must NOT be deactivated
    expect(dataverseClient.update).not.toHaveBeenCalledWith(
      n.entitySet,
      'notif-active',
      expect.anything()
    )
  })

  it('should filter by objectType when provided', async () => {
    const svc = createService()
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([])

    await svc.deactivateByGroupKeys('setting-001', 'SlaExceeded', [], 'cost-document')

    const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
    expect(query).toContain(`${n.objectType} eq`)
  })

  it('should return 0 when all alerts are still active', async () => {
    const svc = createService()
    const activeKey = 'sla:invoice:inv-001:recipient:user-001'
    vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([
      makeDvNotification({ [n.groupKey]: activeKey, [n.isActive]: true }),
    ])

    const deactivated = await svc.deactivateByGroupKeys('setting-001', 'SlaExceeded', [activeKey])

    expect(deactivated).toBe(0)
    expect(dataverseClient.update).not.toHaveBeenCalled()
  })
})
