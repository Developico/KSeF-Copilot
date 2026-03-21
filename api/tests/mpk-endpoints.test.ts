import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * HTTP Endpoint Tests for MPK Centers and Users
 *
 * Strategy: We cannot easily call `app.http()` handlers in isolation because
 * Azure Functions v4 SDK registers them globally. Instead we extract the
 * handler functions by importing the module and intercepting app.http calls.
 */

// ── Mocks ─────────────────────────────────────────────────────

// vi.hoisted runs before vi.mock hoisting — safe to reference in mock factories
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

vi.mock('../src/lib/dataverse/services/mpk-center-service', () => ({
  mpkCenterService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    getApprovers: vi.fn(),
    setApprovers: vi.fn(),
    listSystemUsers: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/approval-service', () => ({
  approvalService: {
    applyApprovalToMpk: vi.fn(),
    revokeApprovalFromMpk: vi.fn(),
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { mpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { approvalService } from '../src/lib/dataverse/services/approval-service'

// Import function modules to trigger handler registration
import '../src/functions/mpk-centers'
import '../src/functions/users'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(overrides: {
  url?: string
  params?: Record<string, string>
  json?: () => Promise<unknown>
} = {}) {
  return {
    url: overrides.url || 'http://localhost:7071/api/mpk-centers',
    params: overrides.params || {},
    json: overrides.json || (async () => ({})),
    headers: { get: vi.fn() },
  }
}

function mockContext() {
  return { error: vi.fn(), warn: vi.fn(), log: vi.fn() }
}

const adminUser = { id: 'uid-1', email: 'admin@test.com', name: 'Admin', roles: ['Admin'] }
const readerUser = { id: 'uid-2', email: 'reader@test.com', name: 'Reader', roles: ['Reader'] }

function authSuccess(user = adminUser) {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user })
  vi.mocked(requireRole).mockReturnValue({ success: true })
}

function authFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: false, error: 'Unauthorized' })
}

function roleFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: readerUser })
  vi.mocked(requireRole).mockReturnValue({ success: false, error: 'Forbidden' })
}

// ── Sample data ──────────────────────────────────────────────

const sampleCenter = {
  id: 'c1',
  name: 'Marketing',
  description: 'Dept',
  settingId: 's1',
  isActive: true,
  approvalRequired: false,
  budgetAmount: 10000,
  budgetPeriod: 'Monthly',
  budgetStartDate: '2026-01-01',
  createdOn: '2026-01-01T00:00:00Z',
  modifiedOn: '2026-03-01T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MPK Centers Endpoints', () => {
  // ────── GET /mpk-centers ──────

  describe('GET /mpk-centers (list)', () => {
    const handler = () => registeredHandlers['mpk-centers-list']

    it('should return 200 with centers list', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getAll).mockResolvedValue([sampleCenter as any])

      const res = await handler()(
        mockRequest({ url: 'http://localhost:7071/api/mpk-centers?settingId=s1' }),
        mockContext(),
      )

      expect(res.status).toBe(200)
      expect(res.jsonBody.mpkCenters).toHaveLength(1)
      expect(res.jsonBody.count).toBe(1)
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
      vi.mocked(mpkCenterService.getAll).mockRejectedValue(new Error('DV error'))

      const res = await handler()(mockRequest(), mockContext())
      expect(res.status).toBe(500)
      expect(res.jsonBody.error).toBe('Failed to list MPK centers')
    })
  })

  // ────── POST /mpk-centers ──────

  describe('POST /mpk-centers (create)', () => {
    const handler = () => registeredHandlers['mpk-centers-create']

    const validBody = {
      name: 'Marketing',
      settingId: '12345678-1234-1234-1234-123456789abc',
    }

    it('should return 201 with created center', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.create).mockResolvedValue(sampleCenter as any)

      const res = await handler()(
        mockRequest({ json: async () => validBody }),
        mockContext(),
      )

      expect(res.status).toBe(201)
      expect(res.jsonBody.mpkCenter.id).toBe('c1')
    })

    it('should return 400 for invalid payload', async () => {
      authSuccess()

      const res = await handler()(
        mockRequest({ json: async () => ({ name: '' }) }), // missing settingId, empty name
        mockContext(),
      )

      expect(res.status).toBe(400)
      expect(res.jsonBody.error).toBe('Validation failed')
    })

    it('should return 403 for non-Admin', async () => {
      roleFail()
      const res = await handler()(mockRequest({ json: async () => validBody }), mockContext())
      expect(res.status).toBe(403)
    })
  })

  // ────── GET /mpk-centers/:id ──────

  describe('GET /mpk-centers/:id (get)', () => {
    const handler = () => registeredHandlers['mpk-centers-get']

    it('should return 200 with center', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getById).mockResolvedValue(sampleCenter as any)

      const res = await handler()(
        mockRequest({ params: { id: 'c1' } }),
        mockContext(),
      )

      expect(res.status).toBe(200)
      expect(res.jsonBody.mpkCenter.id).toBe('c1')
    })

    it('should return 404 when not found', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getById).mockResolvedValue(null)

      const res = await handler()(
        mockRequest({ params: { id: 'nonexistent' } }),
        mockContext(),
      )

      expect(res.status).toBe(404)
    })
  })

  // ────── PATCH /mpk-centers/:id ──────

  describe('PATCH /mpk-centers/:id (update)', () => {
    const handler = () => registeredHandlers['mpk-centers-update']

    it('should return 200 with updated center', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.update).mockResolvedValue({ ...sampleCenter, name: 'Updated' } as any)

      const res = await handler()(
        mockRequest({
          params: { id: 'c1' },
          json: async () => ({ name: 'Updated' }),
        }),
        mockContext(),
      )

      expect(res.status).toBe(200)
      expect(res.jsonBody.mpkCenter.name).toBe('Updated')
    })

    it('should return 404 when update returns null', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.update).mockResolvedValue(null)

      const res = await handler()(
        mockRequest({
          params: { id: 'nonexistent' },
          json: async () => ({ name: 'X' }),
        }),
        mockContext(),
      )

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid update data', async () => {
      authSuccess()

      const res = await handler()(
        mockRequest({
          params: { id: 'c1' },
          json: async () => ({ approvalSlaHours: 0 }), // min is 1
        }),
        mockContext(),
      )

      expect(res.status).toBe(400)
    })
  })

  // ────── DELETE /mpk-centers/:id ──────

  describe('DELETE /mpk-centers/:id (deactivate)', () => {
    const handler = () => registeredHandlers['mpk-centers-delete']

    it('should return 200 on successful deactivation', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getById).mockResolvedValue(sampleCenter as any)
      vi.mocked(mpkCenterService.deactivate).mockResolvedValue(undefined)

      const res = await handler()(
        mockRequest({ params: { id: 'c1' } }),
        mockContext(),
      )

      expect(res.status).toBe(200)
      expect(res.jsonBody.message).toContain('deactivated')
    })

    it('should return 404 when center does not exist', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getById).mockResolvedValue(null)

      const res = await handler()(
        mockRequest({ params: { id: 'ghost' } }),
        mockContext(),
      )

      expect(res.status).toBe(404)
    })
  })

  // ────── GET /mpk-centers/:id/approvers ──────

  describe('GET /mpk-centers/:id/approvers (list)', () => {
    const handler = () => registeredHandlers['mpk-centers-approvers-list']

    it('should return 200 with approvers list', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getApprovers).mockResolvedValue([
        { id: 'a1', mpkCenterId: 'c1', systemUserId: 'u1', name: 'Jan', fullName: 'Jan Kowalski', email: 'jan@test.com' },
      ])

      const res = await handler()(
        mockRequest({ params: { id: 'c1' } }),
        mockContext(),
      )

      expect(res.status).toBe(200)
      expect(res.jsonBody.approvers).toHaveLength(1)
      expect(res.jsonBody.count).toBe(1)
    })
  })

  // ────── PUT /mpk-centers/:id/approvers ──────

  describe('PUT /mpk-centers/:id/approvers (set)', () => {
    const handler = () => registeredHandlers['mpk-centers-approvers-set']

    it('should return 200 with new approvers', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getById).mockResolvedValue(sampleCenter as any)
      vi.mocked(mpkCenterService.setApprovers).mockResolvedValue([
        { id: 'a2', mpkCenterId: 'c1', systemUserId: 'u2', name: 'Anna', fullName: 'Anna Nowak', email: 'anna@test.com' },
      ])

      const res = await handler()(
        mockRequest({
          params: { id: 'c1' },
          json: async () => ({
            systemUserIds: ['12345678-1234-1234-1234-123456789abc'],
          }),
        }),
        mockContext(),
      )

      expect(res.status).toBe(200)
      expect(res.jsonBody.approvers).toHaveLength(1)
    })

    it('should return 400 for non-UUID systemUserIds', async () => {
      authSuccess()

      const res = await handler()(
        mockRequest({
          params: { id: 'c1' },
          json: async () => ({ systemUserIds: ['not-uuid'] }),
        }),
        mockContext(),
      )

      expect(res.status).toBe(400)
    })

    it('should return 404 when center does not exist', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.getById).mockResolvedValue(null)

      const res = await handler()(
        mockRequest({
          params: { id: 'ghost' },
          json: async () => ({ systemUserIds: [] }),
        }),
        mockContext(),
      )

      expect(res.status).toBe(404)
    })
  })
})

// ── Users endpoint ──────────────────────────────────────────

describe('Users Endpoint', () => {
  describe('GET /users', () => {
    const handler = () => registeredHandlers['users-list']

    it('should return 200 with user list', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.listSystemUsers).mockResolvedValue([
        { systemUserId: 'u1', fullName: 'Jan', email: 'jan@test.com', isDisabled: false },
      ])

      const res = await handler()(mockRequest(), mockContext())

      expect(res.status).toBe(200)
      expect(res.jsonBody.users).toHaveLength(1)
      expect(res.jsonBody.count).toBe(1)
    })

    it('should return 401 when not authenticated', async () => {
      authFail()
      const res = await handler()(mockRequest(), mockContext())
      expect(res.status).toBe(401)
    })

    it('should return 403 when requireRole throws', async () => {
      vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: readerUser })
      vi.mocked(requireRole).mockImplementation(() => {
        throw new Error('Insufficient permissions')
      })

      const res = await handler()(mockRequest(), mockContext())
      expect(res.status).toBe(403)
    })

    it('should return 500 when service throws', async () => {
      authSuccess()
      vi.mocked(mpkCenterService.listSystemUsers).mockRejectedValue(new Error('DB error'))

      const res = await handler()(mockRequest(), mockContext())
      expect(res.status).toBe(500)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // POST /api/mpk-centers/:id/apply-approval
  // ══════════════════════════════════════════════════════════════

  describe('POST /api/mpk-centers/:id/apply-approval', () => {
    const handler = () => registeredHandlers['mpk-centers-apply-approval']

    it('should return 401 for unauthenticated requests', async () => {
      authFail()
      const req = mockRequest({ params: { id: 'c1' } })
      const res = await handler()(req, mockContext())
      expect(res.status).toBe(401)
    })

    it('should return 403 for non-admin', async () => {
      roleFail()
      const req = mockRequest({ params: { id: 'c1' } })
      const res = await handler()(req, mockContext())
      expect(res.status).toBe(403)
    })

    it('should return 400 for invalid scope', async () => {
      authSuccess()
      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({ scope: 'invalid' }),
      })
      const res = await handler()(req, mockContext())
      expect(res.status).toBe(400)
      expect(res.jsonBody.error).toContain('Invalid scope')
    })

    it('should call applyApprovalToMpk with correct params', async () => {
      authSuccess()
      vi.mocked(approvalService.applyApprovalToMpk).mockResolvedValue({
        updated: 5,
        skipped: 2,
        autoApproved: 1,
        total: 8,
      })

      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({ scope: 'unprocessed', dryRun: true }),
      })
      const res = await handler()(req, mockContext())

      expect(res.status).toBe(200)
      expect(approvalService.applyApprovalToMpk).toHaveBeenCalledWith('c1', 'unprocessed', true)
      expect(res.jsonBody.updated).toBe(5)
      expect(res.jsonBody.dryRun).toBe(true)
    })

    it('should default to unprocessed scope', async () => {
      authSuccess()
      vi.mocked(approvalService.applyApprovalToMpk).mockResolvedValue({
        updated: 0,
        skipped: 0,
        autoApproved: 0,
        total: 0,
      })

      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({}),
      })
      const res = await handler()(req, mockContext())

      expect(res.status).toBe(200)
      expect(approvalService.applyApprovalToMpk).toHaveBeenCalledWith('c1', 'unprocessed', false)
    })

    it('should return 500 on service error', async () => {
      authSuccess()
      vi.mocked(approvalService.applyApprovalToMpk).mockRejectedValue(new Error('MPK center not found'))

      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({ scope: 'all' }),
      })
      const res = await handler()(req, mockContext())

      expect(res.status).toBe(500)
      expect(res.jsonBody.error).toBe('MPK center not found')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // POST /api/mpk-centers/:id/revoke-approval
  // ══════════════════════════════════════════════════════════════

  describe('POST /api/mpk-centers/:id/revoke-approval', () => {
    const handler = () => registeredHandlers['mpk-centers-revoke-approval']

    it('should return 401 for unauthenticated requests', async () => {
      authFail()
      const req = mockRequest({ params: { id: 'c1' } })
      const res = await handler()(req, mockContext())
      expect(res.status).toBe(401)
    })

    it('should return 403 for non-admin', async () => {
      roleFail()
      const req = mockRequest({ params: { id: 'c1' } })
      const res = await handler()(req, mockContext())
      expect(res.status).toBe(403)
    })

    it('should return 400 for invalid scope', async () => {
      authSuccess()
      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({ scope: 'invalid' }),
      })
      const res = await handler()(req, mockContext())
      expect(res.status).toBe(400)
      expect(res.jsonBody.error).toContain('Invalid scope')
    })

    it('should call revokeApprovalFromMpk with correct params', async () => {
      authSuccess()
      vi.mocked(approvalService.revokeApprovalFromMpk).mockResolvedValue({
        updated: 3,
        skipped: 1,
        autoApproved: 0,
        total: 4,
      })

      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({ scope: 'pending', dryRun: true }),
      })
      const res = await handler()(req, mockContext())

      expect(res.status).toBe(200)
      expect(approvalService.revokeApprovalFromMpk).toHaveBeenCalledWith('c1', 'pending', true)
      expect(res.jsonBody.updated).toBe(3)
      expect(res.jsonBody.dryRun).toBe(true)
    })

    it('should default to pending scope', async () => {
      authSuccess()
      vi.mocked(approvalService.revokeApprovalFromMpk).mockResolvedValue({
        updated: 0,
        skipped: 0,
        autoApproved: 0,
        total: 0,
      })

      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({}),
      })
      const res = await handler()(req, mockContext())

      expect(res.status).toBe(200)
      expect(approvalService.revokeApprovalFromMpk).toHaveBeenCalledWith('c1', 'pending', false)
    })

    it('should return 500 on service error', async () => {
      authSuccess()
      vi.mocked(approvalService.revokeApprovalFromMpk).mockRejectedValue(new Error('MPK center not found'))

      const req = mockRequest({
        params: { id: 'c1' },
        json: async () => ({ scope: 'all' }),
      })
      const res = await handler()(req, mockContext())

      expect(res.status).toBe(500)
      expect(res.jsonBody.error).toBe('MPK center not found')
    })
  })
})
