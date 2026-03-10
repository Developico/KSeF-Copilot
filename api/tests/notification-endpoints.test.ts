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
  notificationService: {
    list: vi.fn(),
    markRead: vi.fn(),
    dismiss: vi.fn(),
    getUnreadCount: vi.fn(),
  },
  mpkCenterService: {
    resolveSystemUserByOid: vi.fn(),
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { notificationService, mpkCenterService } from '../src/lib/dataverse/services'

// Import function module to trigger handler registration
import '../src/functions/notifications'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(overrides: {
  url?: string
  params?: Record<string, string>
  query?: Record<string, string>
} = {}) {
  const queryMap = new Map(Object.entries(overrides.query || {}))
  return {
    url: overrides.url || 'http://localhost:7071/api/notifications',
    params: overrides.params || {},
    query: { get: (key: string) => queryMap.get(key) || null },
    headers: { get: vi.fn() },
  }
}

function mockContext() {
  return { error: vi.fn(), warn: vi.fn(), log: vi.fn() }
}

const testUser = { id: 'oid-001', email: 'user@test.com', name: 'User', roles: ['Reader'] }

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

const sampleNotification = {
  id: 'notif-001',
  name: 'ApprovalRequested: test',
  recipientId: 'user-001',
  settingId: 'setting-001',
  type: 'ApprovalRequested',
  message: 'Invoice requires approval',
  isRead: false,
  isDismissed: false,
  invoiceId: 'inv-001',
  mpkCenterId: 'mpk-001',
  createdOn: '2026-03-09T10:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// GET /notifications
// ============================================================================

describe('GET /notifications (list)', () => {
  const handler = () => registeredHandlers['notifications-list']

  it('should return 200 with notifications', async () => {
    authSuccess()
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'user-001',
      fullName: 'User',
      email: 'user@test.com',
    } as any)
    vi.mocked(notificationService.list).mockResolvedValue({
      items: [sampleNotification as any],
      count: 1,
    })

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toHaveLength(1)
    expect(res.jsonBody.count).toBe(1)
  })

  it('should return 400 when settingId is missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 200 with empty list when DV user not found', async () => {
    authSuccess()
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.data).toEqual([])
    expect(res.jsonBody.count).toBe(0)
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
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'user-001',
    } as any)
    vi.mocked(notificationService.list).mockRejectedValue(new Error('DV error'))

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(500)
  })

  it('should pass unreadOnly and top from query', async () => {
    authSuccess()
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'user-001',
    } as any)
    vi.mocked(notificationService.list).mockResolvedValue({ items: [], count: 0 })

    await handler()(
      mockRequest({ query: { settingId: 's1', unreadOnly: 'true', top: '10' } }),
      mockContext()
    )

    expect(notificationService.list).toHaveBeenCalledWith(
      'user-001', 's1', { unreadOnly: true, top: 10 }
    )
  })
})

// ============================================================================
// PATCH /notifications/:id/read
// ============================================================================

describe('PATCH /notifications/:id/read', () => {
  const handler = () => registeredHandlers['notifications-read']

  it('should return 200 on successful markRead', async () => {
    authSuccess()
    vi.mocked(notificationService.markRead).mockResolvedValue(undefined)

    const res = await handler()(
      mockRequest({ params: { id: 'notif-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.success).toBe(true)
    expect(notificationService.markRead).toHaveBeenCalledWith('notif-001')
  })

  it('should return 400 when id is missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 401 when not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ params: { id: 'x' } }), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 500 when service throws', async () => {
    authSuccess()
    vi.mocked(notificationService.markRead).mockRejectedValue(new Error('fail'))

    const res = await handler()(
      mockRequest({ params: { id: 'notif-001' } }),
      mockContext()
    )

    expect(res.status).toBe(500)
  })
})

// ============================================================================
// POST /notifications/:id/dismiss
// ============================================================================

describe('POST /notifications/:id/dismiss', () => {
  const handler = () => registeredHandlers['notifications-dismiss']

  it('should return 200 on successful dismiss', async () => {
    authSuccess()
    vi.mocked(notificationService.dismiss).mockResolvedValue(undefined)

    const res = await handler()(
      mockRequest({ params: { id: 'notif-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.success).toBe(true)
    expect(notificationService.dismiss).toHaveBeenCalledWith('notif-001')
  })

  it('should return 400 when id is missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 401 when not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ params: { id: 'x' } }), mockContext())
    expect(res.status).toBe(401)
  })
})

// ============================================================================
// GET /notifications/unread-count
// ============================================================================

describe('GET /notifications/unread-count', () => {
  const handler = () => registeredHandlers['notifications-unread-count']

  it('should return 200 with unread count', async () => {
    authSuccess()
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'user-001',
    } as any)
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5)

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.count).toBe(5)
  })

  it('should return 400 when settingId is missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 0 when DV user not found', async () => {
    authSuccess()
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.count).toBe(0)
  })

  it('should return 401 when not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 500 when service throws', async () => {
    authSuccess()
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'user-001',
    } as any)
    vi.mocked(notificationService.getUnreadCount).mockRejectedValue(new Error('fail'))

    const res = await handler()(
      mockRequest({ query: { settingId: 'setting-001' } }),
      mockContext()
    )

    expect(res.status).toBe(500)
  })
})
