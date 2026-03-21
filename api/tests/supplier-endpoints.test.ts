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

vi.mock('../src/lib/dataverse/services/supplier-service', () => ({
  supplierService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByNip: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    getStats: vi.fn(),
    updateCachedStats: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/invoice-service', () => ({
  invoiceService: {
    getAll: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/setting-service', () => ({
  settingService: {
    getById: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseClient: {
    listAll: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/config', () => ({
  DV: {
    invoice: {
      entitySet: 'dvlp_ksefinvoices',
      sellerNip: 'dvlp_sellernip',
      sellerName: 'dvlp_sellername',
      sellerAddress: 'dvlp_selleraddress',
      sellerCountry: 'dvlp_sellercountry',
      invoiceDate: 'dvlp_invoicedate',
    },
    supplier: {
      entitySet: 'dvlp_ksefsuppliers',
    },
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { supplierService } from '../src/lib/dataverse/services/supplier-service'
import { invoiceService } from '../src/lib/dataverse/services/invoice-service'
import { settingService } from '../src/lib/dataverse/services/setting-service'
import { dataverseClient } from '../src/lib/dataverse/client'

// Import function module to trigger handler registration
import '../src/functions/suppliers'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(overrides: {
  url?: string
  query?: Record<string, string>
  params?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
  method?: string
} = {}) {
  const queryMap = new Map(Object.entries(overrides.query || {}))
  const headerMap = new Map(Object.entries(overrides.headers || {}))
  // Build URL with query params embedded (handlers use new URL(request.url).searchParams)
  let baseUrl = overrides.url || 'http://localhost:7071/api/suppliers'
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
    text: vi.fn().mockResolvedValue(''),
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
const VALID_NIP = '5260250995' // PKO BP — passes NIP checksum

const sampleSupplier = {
  id: 'sup-1',
  nip: VALID_NIP,
  name: 'Acme Sp. z o.o.',
  status: 'Active',
  hasSelfBillingAgreement: true,
  settingId: TEST_UUID,
  defaultMpkId: null,
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// GET /suppliers (list)
// ============================================================================

describe('GET /suppliers (suppliers-list)', () => {
  const handler = () => registeredHandlers['suppliers-list']

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when role insufficient', async () => {
    roleFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(403)
  })

  it('should return 400 when settingId missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('settingId')
  })

  it('should return 200 with suppliers list', async () => {
    authSuccess()
    vi.mocked(supplierService.getAll).mockResolvedValue([sampleSupplier])

    const res = await handler()(
      mockRequest({ query: { settingId: TEST_UUID } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.suppliers).toHaveLength(1)
    expect(res.jsonBody.count).toBe(1)
  })

  it('should pass filter params to service', async () => {
    authSuccess()
    vi.mocked(supplierService.getAll).mockResolvedValue([])

    await handler()(
      mockRequest({
        query: { settingId: TEST_UUID, status: 'Active', search: 'acme', hasSelfBillingAgreement: 'true', top: '10', skip: '5' },
      }),
      mockContext()
    )

    expect(supplierService.getAll).toHaveBeenCalledWith({
      settingId: TEST_UUID,
      status: 'Active',
      search: 'acme',
      hasSelfBillingAgreement: true,
      top: 10,
      skip: 5,
    })
  })
})

// ============================================================================
// POST /suppliers (create)
// ============================================================================

describe('POST /suppliers (suppliers-create)', () => {
  const handler = () => registeredHandlers['suppliers-create']

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when not Admin', async () => {
    roleFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(403)
  })

  it('should return 400 for invalid body', async () => {
    authSuccess()
    const res = await handler()(
      mockRequest({ body: { name: '' } }),
      mockContext()
    )
    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('Validation')
  })

  it('should return 409 when duplicate NIP exists', async () => {
    authSuccess()
    vi.mocked(supplierService.getByNip).mockResolvedValue(sampleSupplier)

    const res = await handler()(
      mockRequest({
        body: {
          nip: VALID_NIP,
          name: 'Acme Sp. z o.o.',
          settingId: TEST_UUID,
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(409)
    expect(res.jsonBody.error).toContain('already exists')
  })

  it('should return 201 on successful creation', async () => {
    authSuccess()
    vi.mocked(supplierService.getByNip).mockResolvedValue(null)
    vi.mocked(supplierService.create).mockResolvedValue(sampleSupplier)

    const res = await handler()(
      mockRequest({
        body: {
          nip: VALID_NIP,
          name: 'Acme Sp. z o.o.',
          settingId: TEST_UUID,
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(201)
    expect(res.jsonBody.supplier).toEqual(sampleSupplier)
  })
})

// ============================================================================
// GET /suppliers/:id
// ============================================================================

describe('GET /suppliers/:id (suppliers-get)', () => {
  const handler = () => registeredHandlers['suppliers-get']

  it('should return 404 when supplier not found', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 with supplier', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)

    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.supplier).toEqual(sampleSupplier)
  })
})

// ============================================================================
// PATCH /suppliers/:id
// ============================================================================

describe('PATCH /suppliers/:id (suppliers-update)', () => {
  const handler = () => registeredHandlers['suppliers-update']

  it('should return 400 for invalid body', async () => {
    authSuccess()
    // SupplierUpdateSchema likely rejects totally invalid bodies
    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' }, body: { status: 'INVALID_STATUS' } }),
      mockContext()
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 when supplier not found', async () => {
    authSuccess()
    vi.mocked(supplierService.update).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' }, body: { name: 'Updated' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 on successful update', async () => {
    authSuccess()
    const updated = { ...sampleSupplier, name: 'Updated' }
    vi.mocked(supplierService.update).mockResolvedValue(updated)

    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' }, body: { name: 'Updated' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.supplier.name).toBe('Updated')
  })
})

// ============================================================================
// DELETE /suppliers/:id
// ============================================================================

describe('DELETE /suppliers/:id (suppliers-delete)', () => {
  const handler = () => registeredHandlers['suppliers-delete']

  it('should return 200 on deactivation', async () => {
    authSuccess()
    vi.mocked(supplierService.deactivate).mockResolvedValue(undefined)

    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.message).toContain('deactivated')
  })
})

// ============================================================================
// GET /suppliers/:id/stats
// ============================================================================

describe('GET /suppliers/:id/stats (suppliers-stats)', () => {
  const handler = () => registeredHandlers['suppliers-stats']

  it('should return 404 when supplier not found', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' }, query: {} }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 with stats', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)
    const mockStats = { totalInvoices: 12, totalGrossAmount: 123000, avgInvoiceAmount: 10250 }
    vi.mocked(supplierService.getStats).mockResolvedValue(mockStats)

    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' }, query: {} }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.stats).toEqual(mockStats)
  })
})

// ============================================================================
// POST /suppliers/:id/stats/refresh
// ============================================================================

describe('POST /suppliers/:id/stats/refresh (suppliers-stats-refresh)', () => {
  const handler = () => registeredHandlers['suppliers-stats-refresh']

  it('should return 404 when supplier not found', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 on successful refresh', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)
    vi.mocked(supplierService.updateCachedStats).mockResolvedValue(undefined)

    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(supplierService.updateCachedStats).toHaveBeenCalledWith('sup-1')
  })
})

// ============================================================================
// GET /suppliers/:id/invoices
// ============================================================================

describe('GET /suppliers/:id/invoices (suppliers-invoices)', () => {
  const handler = () => registeredHandlers['suppliers-invoices']

  it('should return 404 when supplier not found', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 200 with invoices', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)
    const mockInvoices = [{ id: 'inv-1', supplierNip: '1234567890', grossAmount: 1000 }]
    vi.mocked(invoiceService.getAll).mockResolvedValue(mockInvoices)

    const res = await handler()(
      mockRequest({ params: { id: 'sup-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.invoices).toHaveLength(1)
  })
})

// ============================================================================
// POST /suppliers/from-vat
// ============================================================================

describe('POST /suppliers/from-vat (suppliers-from-vat)', () => {
  const handler = () => registeredHandlers['suppliers-from-vat']

  it('should return 400 for invalid NIP format', async () => {
    authSuccess()
    const res = await handler()(
      mockRequest({ body: { nip: 'ABC', settingId: '7f000000-0000-0000-0000-000000000001' } }),
      mockContext()
    )
    expect(res.status).toBe(400)
  })

  it('should return 409 when supplier already exists', async () => {
    authSuccess()
    vi.mocked(supplierService.getByNip).mockResolvedValue(sampleSupplier)

    const res = await handler()(
      mockRequest({ body: { nip: '1234567890', settingId: '7f000000-0000-0000-0000-000000000001' } }),
      mockContext()
    )

    expect(res.status).toBe(409)
  })
})

// ============================================================================
// POST /suppliers/extract-from-invoices
// ============================================================================

describe('POST /suppliers/extract-from-invoices (suppliers-extract-from-invoices)', () => {
  const handler = () => registeredHandlers['suppliers-extract-from-invoices']

  const testSetting = { id: TEST_UUID, nip: '1234567890', companyName: 'Test Corp' }

  // Raw Dataverse invoice records (DV field names)
  const invoiceA = {
    dvlp_sellernip: VALID_NIP,
    dvlp_sellername: 'Acme Sp. z o.o.',
    dvlp_selleraddress: 'ul. Testowa 1',
    dvlp_sellercountry: 'PL',
    dvlp_invoicedate: '2024-01-15',
  }

  const invoiceB = {
    dvlp_sellernip: '7681973627',
    dvlp_sellername: 'Beta Corp',
    dvlp_selleraddress: 'ul. Inna 5',
    dvlp_sellercountry: 'PL',
    dvlp_invoicedate: '2024-03-01',
  }

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 403 when not Admin', async () => {
    roleFail()
    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())
    expect(res.status).toBe(403)
  })

  it('should return 400 when settingId missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest({ body: {} }), mockContext())
    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('settingId')
  })

  it('should return 404 when setting not found', async () => {
    authSuccess()
    vi.mocked(settingService.getById).mockResolvedValue(null)

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())
    expect(res.status).toBe(404)
  })

  it('should return 200 with empty result when no invoices found', async () => {
    authSuccess()
    vi.mocked(settingService.getById).mockResolvedValue(testSetting)
    vi.mocked(dataverseClient.listAll).mockResolvedValue([])

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())
    expect(res.status).toBe(200)
    expect(res.jsonBody.created).toBe(0)
    expect(res.jsonBody.skipped).toBe(0)
  })

  it('should create new suppliers from invoices', async () => {
    authSuccess()
    vi.mocked(settingService.getById).mockResolvedValue(testSetting)
    vi.mocked(dataverseClient.listAll).mockResolvedValue([invoiceA, invoiceB])
    vi.mocked(supplierService.getByNip).mockResolvedValue(null)
    vi.mocked(supplierService.create)
      .mockResolvedValueOnce({ ...sampleSupplier, nip: VALID_NIP, name: 'Acme Sp. z o.o.' })
      .mockResolvedValueOnce({ ...sampleSupplier, id: 'sup-2', nip: '7681973627', name: 'Beta Corp' })

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.created).toBe(2)
    expect(res.jsonBody.skipped).toBe(0)
    expect(res.jsonBody.suppliers).toHaveLength(2)
    expect(supplierService.create).toHaveBeenCalledTimes(2)
    expect(supplierService.create).toHaveBeenCalledWith(
      expect.objectContaining({ nip: VALID_NIP, name: 'Acme Sp. z o.o.', settingId: TEST_UUID })
    )
  })

  it('should skip suppliers that already exist', async () => {
    authSuccess()
    vi.mocked(settingService.getById).mockResolvedValue(testSetting)
    vi.mocked(dataverseClient.listAll).mockResolvedValue([invoiceA])
    vi.mocked(supplierService.getByNip).mockResolvedValue(sampleSupplier)

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.created).toBe(0)
    expect(res.jsonBody.skipped).toBe(1)
    expect(supplierService.create).not.toHaveBeenCalled()
  })

  it('should handle mixed create and skip scenarios', async () => {
    authSuccess()
    vi.mocked(settingService.getById).mockResolvedValue(testSetting)
    vi.mocked(dataverseClient.listAll).mockResolvedValue([invoiceA, invoiceB])
    vi.mocked(supplierService.getByNip)
      .mockResolvedValueOnce(sampleSupplier) // first NIP exists
      .mockResolvedValueOnce(null)           // second NIP is new
    vi.mocked(supplierService.create).mockResolvedValue({ ...sampleSupplier, id: 'sup-2', nip: '7681973627', name: 'Beta Corp' })

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.created).toBe(1)
    expect(res.jsonBody.skipped).toBe(1)
    expect(res.jsonBody.total).toBe(2)
  })

  it('should pick first (most recent) invoice data for each NIP', async () => {
    authSuccess()
    // Results come pre-sorted by invoiceDate desc from OData $orderby
    const newerInvoice = { ...invoiceA, dvlp_invoicedate: '2024-06-01', dvlp_sellername: 'New Name' }
    const olderInvoice = { ...invoiceA, dvlp_invoicedate: '2023-01-01', dvlp_sellername: 'Old Name' }

    vi.mocked(settingService.getById).mockResolvedValue(testSetting)
    vi.mocked(dataverseClient.listAll).mockResolvedValue([newerInvoice, olderInvoice])
    vi.mocked(supplierService.getByNip).mockResolvedValue(null)
    vi.mocked(supplierService.create).mockResolvedValue({ ...sampleSupplier })

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.created).toBe(1)
    expect(supplierService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' })
    )
  })

  it('should report errors without stopping processing', async () => {
    authSuccess()
    vi.mocked(settingService.getById).mockResolvedValue(testSetting)
    vi.mocked(dataverseClient.listAll).mockResolvedValue([invoiceA, invoiceB])
    vi.mocked(supplierService.getByNip).mockResolvedValue(null)
    vi.mocked(supplierService.create)
      .mockRejectedValueOnce(new Error('Dataverse error'))
      .mockResolvedValueOnce({ ...sampleSupplier, id: 'sup-2', nip: '7681973627', name: 'Beta Corp' })

    const res = await handler()(mockRequest({ body: { settingId: TEST_UUID } }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.created).toBe(1)
    expect(res.jsonBody.errors).toBe(1)
    expect(res.jsonBody.errorDetails).toHaveLength(1)
    expect(res.jsonBody.errorDetails[0].error).toContain('Dataverse error')
  })
})
