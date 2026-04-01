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

vi.mock('../src/lib/dataverse/services/sb-agreement-service', () => ({
  sbAgreementService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    terminate: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/supplier-service', () => ({
  supplierService: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseRequest: vi.fn(),
  dataverseClient: { update: vi.fn() },
}))

vi.mock('../src/lib/dataverse/config', () => ({
  DV: {
    sbAgreement: { entitySet: 'dvlp_ksefsbagrements' },
  },
}))

vi.mock('../src/lib/dataverse/attachments', () => ({
  validateAttachment: vi.fn(),
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { sbAgreementService } from '../src/lib/dataverse/services/sb-agreement-service'
import { supplierService } from '../src/lib/dataverse/services/supplier-service'
import { dataverseRequest } from '../src/lib/dataverse/client'
import { validateAttachment } from '../src/lib/dataverse/attachments'

// Import function module to trigger handler registration
import '../src/functions/sb-agreements'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(overrides: {
  url?: string
  query?: Record<string, string>
  params?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
} = {}) {
  const queryMap = new Map(Object.entries(overrides.query || {}))
  const headerMap = new Map(Object.entries(overrides.headers || {}))
  // Build URL with query params embedded (handlers use new URL(request.url).searchParams)
  let baseUrl = overrides.url || 'http://localhost:7071/api/sb-agreements'
  if (overrides.query && Object.keys(overrides.query).length > 0) {
    const qs = new URLSearchParams(overrides.query).toString()
    baseUrl += (baseUrl.includes('?') ? '&' : '?') + qs
  }
  return {
    url: baseUrl,
    params: overrides.params || {},
    query: { get: (key: string) => queryMap.get(key) || null },
    headers: { get: (key: string) => headerMap.get(key) || null },
    json: vi.fn().mockResolvedValue(overrides.body || {}),
  }
}

function mockContext() {
  return { error: vi.fn(), warn: vi.fn(), log: vi.fn() }
}

const testUser = { id: 'uid-1', email: 'user@test.com', name: 'User', roles: ['Admin'] }

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

const TEST_UUID = '7f000000-0000-0000-0000-000000000001'
const SUPPLIER_UUID = '7f000000-0000-0000-0000-000000000010'
const AGREEMENT_UUID = '7f000000-0000-0000-0000-000000000020'

const sampleAgreement = {
  id: AGREEMENT_UUID,
  name: 'Agreement for Acme',
  supplierId: SUPPLIER_UUID,
  settingId: TEST_UUID,
  agreementDate: '2025-01-01',
  validFrom: '2025-01-01',
  validTo: '2025-12-31',
  status: 'Active',
}

const sampleSupplier = {
  id: SUPPLIER_UUID,
  nip: '5260250995',
  name: 'Acme Sp. z o.o.',
  status: 'Active',
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// GET /sb-agreements (list)
// ============================================================================

describe('GET /sb-agreements (sb-agreements-list)', () => {
  const handler = () => registeredHandlers['sb-agreements-list']

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 400 when settingId missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
  })

  it('should return 200 with agreements list', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getAll).mockResolvedValue([sampleAgreement])

    const res = await handler()(
      mockRequest({ query: { settingId: TEST_UUID } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.agreements).toHaveLength(1)
    expect(res.jsonBody.count).toBe(1)
  })

  it('should pass filter params to service', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getAll).mockResolvedValue([])

    await handler()(
      mockRequest({ query: { settingId: TEST_UUID, supplierId: SUPPLIER_UUID, status: 'Active' } }),
      mockContext()
    )

    expect(sbAgreementService.getAll).toHaveBeenCalledWith({
      settingId: TEST_UUID,
      supplierId: SUPPLIER_UUID,
      status: 'Active',
    })
  })
})

// ============================================================================
// POST /sb-agreements (create)
// ============================================================================

describe('POST /sb-agreements (sb-agreements-create)', () => {
  const handler = () => registeredHandlers['sb-agreements-create']

  it('should return 403 when not Admin', async () => {
    roleFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(403)
  })

  it('should return 400 for invalid body', async () => {
    authSuccess()
    const res = await handler()(
      mockRequest({ body: {} }),
      mockContext()
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 when supplier not found', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({
        body: {
          name: 'Test Agreement',
          supplierId: SUPPLIER_UUID,
          settingId: TEST_UUID,
          agreementDate: '2025-01-01',
          validFrom: '2025-01-01',
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 400 when supplier not Active', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier, status: 'Inactive' })

    const res = await handler()(
      mockRequest({
        body: {
          name: 'Test Agreement',
          supplierId: SUPPLIER_UUID,
          settingId: TEST_UUID,
          agreementDate: '2025-01-01',
          validFrom: '2025-01-01',
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('Active')
  })

  it('should return 201 on successful creation', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)
    vi.mocked(sbAgreementService.create).mockResolvedValue(sampleAgreement)
    vi.mocked(supplierService.update).mockResolvedValue(sampleSupplier)

    const res = await handler()(
      mockRequest({
        body: {
          name: 'Test Agreement',
          supplierId: SUPPLIER_UUID,
          settingId: TEST_UUID,
          agreementDate: '2025-01-01',
          validFrom: '2025-01-01',
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(201)
    expect(sbAgreementService.create).toHaveBeenCalled()
    expect(supplierService.update).toHaveBeenCalledWith(SUPPLIER_UUID, expect.objectContaining({
      hasSelfBillingAgreement: true,
    }))
  })
})

// ============================================================================
// GET /sb-agreements/:id
// ============================================================================

describe('GET /sb-agreements/:id (sb-agreements-get)', () => {
  const handler = () => registeredHandlers['sb-agreements-get']

  it('should return 404 when agreement not found', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 with agreement', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(sampleAgreement)

    const res = await handler()(
      mockRequest({ params: { id: AGREEMENT_UUID } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.agreement).toEqual(sampleAgreement)
  })
})

// ============================================================================
// PATCH /sb-agreements/:id
// ============================================================================

describe('PATCH /sb-agreements/:id (sb-agreements-update)', () => {
  const handler = () => registeredHandlers['sb-agreements-update']

  it('should return 404 when agreement not found', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.update).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' }, body: { notes: 'test' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 on successful update', async () => {
    authSuccess()
    const updated = { ...sampleAgreement, notes: 'updated' }
    vi.mocked(sbAgreementService.update).mockResolvedValue(updated)

    const res = await handler()(
      mockRequest({ params: { id: AGREEMENT_UUID }, body: { notes: 'updated' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.agreement.notes).toBe('updated')
  })
})

// ============================================================================
// POST /sb-agreements/:id/terminate
// ============================================================================

describe('POST /sb-agreements/:id/terminate (sb-agreements-terminate)', () => {
  const handler = () => registeredHandlers['sb-agreements-terminate']

  it('should return 404 when agreement not found', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 on successful termination', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(sampleAgreement)
    vi.mocked(sbAgreementService.terminate).mockResolvedValue(undefined)

    const res = await handler()(
      mockRequest({ params: { id: AGREEMENT_UUID } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.message).toContain('terminated')
  })
})

// ============================================================================
// POST /sb-agreements/:id/attachments (upload)
// ============================================================================

describe('POST /sb-agreements/:id/attachments (sb-agreements-attachment-upload)', () => {
  const handler = () => registeredHandlers['sb-agreements-attachment-upload']

  it('should return 404 when agreement not found', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' }, body: {} }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 400 for invalid attachment data', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(sampleAgreement)

    const res = await handler()(
      mockRequest({ params: { id: AGREEMENT_UUID }, body: { fileName: '' } }),
      mockContext()
    )

    expect(res.status).toBe(400)
  })

  it('should return 400 when file validation fails', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(sampleAgreement)
    vi.mocked(validateAttachment).mockReturnValue({ valid: false, error: 'File too large' })

    const res = await handler()(
      mockRequest({
        params: { id: AGREEMENT_UUID },
        body: {
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          content: Buffer.from('hello').toString('base64'),
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('File too large')
  })

  it('should return 201 on successful upload', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(sampleAgreement)
    vi.mocked(validateAttachment).mockReturnValue({ valid: true })
    vi.mocked(dataverseRequest).mockResolvedValue({ annotationid: 'ann-1' })
    vi.mocked(sbAgreementService.update).mockResolvedValue(sampleAgreement)

    const res = await handler()(
      mockRequest({
        params: { id: AGREEMENT_UUID },
        body: {
          fileName: 'agreement.pdf',
          mimeType: 'application/pdf',
          content: Buffer.from('pdf-content').toString('base64'),
          description: 'Signed agreement',
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(201)
    expect(res.jsonBody.fileName).toBe('agreement.pdf')
    expect(dataverseRequest).toHaveBeenCalled()
  })
})

// ============================================================================
// GET /sb-agreements/:id/attachments (list)
// ============================================================================

describe('GET /sb-agreements/:id/attachments (sb-agreements-attachment-list)', () => {
  const handler = () => registeredHandlers['sb-agreements-attachment-list']

  it('should return 404 when agreement not found', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: '00000000-0000-0000-0000-000000000000' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 with attachments list', async () => {
    authSuccess()
    vi.mocked(sbAgreementService.getById).mockResolvedValue(sampleAgreement)
    vi.mocked(dataverseRequest).mockResolvedValue({
      value: [
        {
          annotationid: 'ann-1',
          filename: 'doc.pdf',
          mimetype: 'application/pdf',
          filesize: 1024,
          createdon: '2025-01-01T00:00:00Z',
        },
      ],
    })

    const res = await handler()(
      mockRequest({ params: { id: AGREEMENT_UUID } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.attachments).toHaveLength(1)
    expect(res.jsonBody.count).toBe(1)
  })
})
