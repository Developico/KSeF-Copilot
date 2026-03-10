import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * HTTP Endpoint Tests for Approval Workflow
 */

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
    timer: vi.fn(),
  },
}))

vi.mock('../src/lib/auth/middleware', () => ({
  verifyAuth: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services', () => ({
  approvalService: {
    approve: vi.fn(),
    reject: vi.fn(),
    cancel: vi.fn(),
    bulkApprove: vi.fn(),
    listPending: vi.fn(),
    refreshApprovers: vi.fn(),
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { approvalService } from '../src/lib/dataverse/services'

// Import the module to trigger handler registration
import '../src/functions/approvals'

// ── Helpers ───────────────────────────────────────────────────

const adminUser = {
  id: 'oid-admin',
  email: 'admin@test.com',
  name: 'Admin',
  roles: ['Admin'],
}

const readerUser = {
  id: 'oid-reader',
  email: 'reader@test.com',
  name: 'Reader',
  roles: ['Reader'],
}

function makeRequest(
  overrides: {
    params?: Record<string, string>
    body?: unknown
    query?: Record<string, string>
    url?: string
  } = {}
): unknown {
  const url = overrides.url || 'https://example.com/api/invoices/inv-001/approve'
  return {
    params: overrides.params || { id: 'inv-001' },
    json: vi.fn().mockResolvedValue(overrides.body || {}),
    url,
    headers: { get: vi.fn().mockReturnValue('Bearer token') },
  }
}

function makeContext(): unknown {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

function setupAuth(user = adminUser) {
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

describe('Approval route registration', () => {
  it('should register all approval routes', () => {
    expect(registeredHandlers['invoices-approve']).toBeDefined()
    expect(registeredHandlers['invoices-reject']).toBeDefined()
    expect(registeredHandlers['invoices-cancel-approval']).toBeDefined()
    expect(registeredHandlers['invoices-refresh-approvers']).toBeDefined()
    expect(registeredHandlers['invoices-bulk-approve']).toBeDefined()
    expect(registeredHandlers['approvals-pending']).toBeDefined()
  })
})

// ============================================================================
// POST /invoices/{id}/approve
// ============================================================================

describe('POST /invoices/{id}/approve', () => {
  it('should approve invoice', async () => {
    setupAuth()
    vi.mocked(approvalService.approve).mockResolvedValue({
      invoiceId: 'inv-001',
      approvalStatus: 'Approved',
      approvedBy: 'Admin',
      approvedAt: '2026-01-15T10:00:00Z',
    })

    const res = await registeredHandlers['invoices-approve'](
      makeRequest({ body: { comment: 'OK' } }),
      makeContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.approvalStatus).toBe('Approved')
  })

  it('should reject unauthenticated', async () => {
    setupUnauthenticated()
    const res = await registeredHandlers['invoices-approve'](makeRequest(), makeContext())
    expect(res.status).toBe(401)
  })

  it('should handle service error', async () => {
    setupAuth()
    vi.mocked(approvalService.approve).mockRejectedValue(new Error('not in Pending status'))

    const res = await registeredHandlers['invoices-approve'](
      makeRequest({ body: {} }),
      makeContext()
    )
    expect(res.status).toBe(400)
  })

  it('should handle 404', async () => {
    setupAuth()
    vi.mocked(approvalService.approve).mockRejectedValue(new Error('Invoice not found'))

    const res = await registeredHandlers['invoices-approve'](
      makeRequest({ body: {} }),
      makeContext()
    )
    expect(res.status).toBe(404)
  })
})

// ============================================================================
// POST /invoices/{id}/reject
// ============================================================================

describe('POST /invoices/{id}/reject', () => {
  it('should reject invoice with comment', async () => {
    setupAuth()
    vi.mocked(approvalService.reject).mockResolvedValue({
      invoiceId: 'inv-001',
      approvalStatus: 'Rejected',
      approvedBy: 'Admin',
      approvedAt: '2026-01-15T10:00:00Z',
      approvalComment: 'Wrong MPK',
    })

    const res = await registeredHandlers['invoices-reject'](
      makeRequest({ body: { comment: 'Wrong MPK' } }),
      makeContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.approvalStatus).toBe('Rejected')
  })

  it('should require comment', async () => {
    setupAuth()

    const res = await registeredHandlers['invoices-reject'](
      makeRequest({ body: { comment: '' } }),
      makeContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('Invalid request body')
  })
})

// ============================================================================
// POST /invoices/{id}/cancel-approval
// ============================================================================

describe('POST /invoices/{id}/cancel-approval', () => {
  it('should cancel approval as Admin', async () => {
    setupAuth(adminUser)
    vi.mocked(requireRole).mockReturnValue({ success: true })
    vi.mocked(approvalService.cancel).mockResolvedValue({
      invoiceId: 'inv-001',
      approvalStatus: 'Cancelled',
      approvedBy: 'Admin',
      approvedAt: '2026-01-15T10:00:00Z',
    })

    const res = await registeredHandlers['invoices-cancel-approval'](
      makeRequest({ body: {} }),
      makeContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.approvalStatus).toBe('Cancelled')
  })

  it('should reject non-Admin', async () => {
    setupForbidden()
    const res = await registeredHandlers['invoices-cancel-approval'](makeRequest(), makeContext())
    expect(res.status).toBe(403)
  })
})

// ============================================================================
// POST /invoices/bulk-approve
// ============================================================================

describe('POST /invoices/bulk-approve', () => {
  it('should bulk approve', async () => {
    setupAuth()
    vi.mocked(approvalService.bulkApprove).mockResolvedValue({
      approved: 2,
      failed: 0,
      errors: [],
    })

    const res = await registeredHandlers['invoices-bulk-approve'](
      makeRequest({
        body: {
          invoiceIds: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
          comment: 'Batch OK',
        },
      }),
      makeContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.approved).toBe(2)
  })

  it('should validate body', async () => {
    setupAuth()

    const res = await registeredHandlers['invoices-bulk-approve'](
      makeRequest({ body: { invoiceIds: [] } }),
      makeContext()
    )

    expect(res.status).toBe(400)
  })

  it('should validate UUID format', async () => {
    setupAuth()

    const res = await registeredHandlers['invoices-bulk-approve'](
      makeRequest({ body: { invoiceIds: ['not-a-uuid'] } }),
      makeContext()
    )

    expect(res.status).toBe(400)
  })
})

// ============================================================================
// POST /invoices/{id}/refresh-approvers
// ============================================================================

describe('POST /invoices/{id}/refresh-approvers', () => {
  it('should refresh approvers', async () => {
    setupAuth()
    vi.mocked(approvalService.refreshApprovers).mockResolvedValue({
      mpkCenterId: 'mpk-001',
      approverCount: 3,
    })

    const res = await registeredHandlers['invoices-refresh-approvers'](
      makeRequest(),
      makeContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.approverCount).toBe(3)
  })
})

// ============================================================================
// GET /approvals/pending
// ============================================================================

describe('GET /approvals/pending', () => {
  it('should list pending invoices', async () => {
    setupAuth()
    vi.mocked(approvalService.listPending).mockResolvedValue([
      {
        id: 'inv-001',
        invoiceNumber: 'FV/2026/001',
        supplierName: 'Supplier A',
        invoiceDate: '2026-01-15',
        grossAmount: 1230,
        currency: 'PLN',
        approvalStatus: 'Pending',
        pendingSince: '2026-01-15T10:00:00Z',
        mpkCenterId: 'mpk-001',
        mpkCenterName: 'Marketing',
        approvalSlaHours: 24,
      },
    ])

    const res = await registeredHandlers['approvals-pending'](
      makeRequest({
        url: 'https://example.com/api/approvals/pending?settingId=setting-001',
      }),
      makeContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.count).toBe(1)
    expect(res.jsonBody.approvals[0].invoiceNumber).toBe('FV/2026/001')
  })

  it('should require settingId', async () => {
    setupAuth()

    const res = await registeredHandlers['approvals-pending'](
      makeRequest({
        url: 'https://example.com/api/approvals/pending',
      }),
      makeContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('settingId')
  })

  it('should reject unauthenticated', async () => {
    setupUnauthenticated()
    const res = await registeredHandlers['approvals-pending'](
      makeRequest({
        url: 'https://example.com/api/approvals/pending?settingId=s1',
      }),
      makeContext()
    )
    expect(res.status).toBe(401)
  })
})
