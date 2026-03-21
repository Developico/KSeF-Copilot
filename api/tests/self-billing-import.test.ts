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

vi.mock('../src/lib/import/sb-import-parser', () => ({
  parseCsv: vi.fn(),
  parseExcelImport: vi.fn(),
  generateCsvTemplate: vi.fn(),
  generateExcelTemplate: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services/sb-invoice-service', () => ({
  sbInvoiceService: {
    createWithItems: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/supplier-service', () => ({
  supplierService: {
    getByNip: vi.fn(),
    getById: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/sb-agreement-service', () => ({
  sbAgreementService: {
    getActiveForSupplier: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseClient: { update: vi.fn() },
}))

vi.mock('../src/lib/dataverse/config', () => ({
  DV: {
    sbInvoice: {
      entitySet: 'dvlp_ksefselfbillinginvoices',
      id: 'dvlp_ksefselfbillinginvoiceid',
      settingBind: 'dvlp_settingid@odata.bind',
      supplierBind: 'dvlp_supplierid@odata.bind',
      agreementBind: 'dvlp_sbagreementid@odata.bind',
    },
    sbLineItem: {
      entitySet: 'dvlp_ksefselfbillinglineitems',
      id: 'dvlp_ksefselfbillinglineitemid',
      sbInvoiceBind: 'dvlp_sbinvoiceid@odata.bind',
    },
  },
  SELF_BILLING_STATUS: {
    DRAFT: 100000001,
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { parseCsv, parseExcelImport, generateCsvTemplate, generateExcelTemplate } from '../src/lib/import/sb-import-parser'
import { supplierService } from '../src/lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../src/lib/dataverse/services/sb-agreement-service'
import { sbInvoiceService } from '../src/lib/dataverse/services/sb-invoice-service'

// Import function module to trigger handler registration
import '../src/functions/sb-import'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(overrides: {
  url?: string
  query?: Record<string, string>
  params?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
  csvText?: string
  arrayBuffer?: ArrayBuffer | null
} = {}) {
  const queryMap = new Map(Object.entries(overrides.query || {}))
  const headerMap = new Map(Object.entries(overrides.headers || {}))
  // Build URL with query params embedded (handlers use new URL(request.url).searchParams)
  let baseUrl = overrides.url || 'http://localhost:7071/api/invoices/self-billing/import'
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
    text: vi.fn().mockResolvedValue(overrides.csvText || ''),
    arrayBuffer: vi.fn().mockResolvedValue(overrides.arrayBuffer || new ArrayBuffer(0)),
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

const sampleParseResult = {
  rows: [
    {
      supplierNip: '1234567890',
      itemDescription: 'Consulting services',
      quantity: 1,
      unit: 'szt.',
      unitPrice: 5000,
      vatRate: 23,
      invoiceDate: '2025-01-31',
      dueDate: '2025-02-28',
    },
  ],
  errors: [],
  totalRows: 1,
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// POST /invoices/self-billing/import
// ============================================================================

describe('POST /invoices/self-billing/import (self-billing-import)', () => {
  const handler = () => registeredHandlers['self-billing-import']

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

  it('should return 400 when settingId missing', async () => {
    authSuccess()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('settingId')
  })

  it('should parse CSV and return enriched rows', async () => {
    authSuccess()
    vi.mocked(parseCsv).mockReturnValue(sampleParseResult)
    vi.mocked(supplierService.getByNip).mockResolvedValue({
      id: 'sup-1',
      name: 'Acme Sp. z o.o.',
    })
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue({
      id: 'agr-1',
      status: 'Active',
    })

    const res = await handler()(
      mockRequest({
        query: { settingId: 'setting-1' },
        csvText: 'supplierNip;itemDescription;quantity;unit;unitPrice;vatRate;invoiceDate\n1234567890;Consulting;1;szt.;5000;23;2025-01-31',
        headers: { 'content-type': 'text/csv' },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.totalRows).toBe(1)
    expect(res.jsonBody.validRows).toBe(1)
  })

  it('should report invalid rows for unknown suppliers', async () => {
    authSuccess()
    vi.mocked(parseCsv).mockReturnValue(sampleParseResult)
    vi.mocked(supplierService.getByNip).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({
        query: { settingId: 'setting-1' },
        csvText: 'header\ndata',
        headers: { 'content-type': 'text/csv' },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.invalidRows).toBeGreaterThan(0)
    expect(res.jsonBody.rows[0].error).toContain('not found')
  })

  it('should report rows without active agreement', async () => {
    authSuccess()
    vi.mocked(parseCsv).mockReturnValue(sampleParseResult)
    vi.mocked(supplierService.getByNip).mockResolvedValue({
      id: 'sup-1',
      name: 'Acme Sp. z o.o.',
    })
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({
        query: { settingId: 'setting-1' },
        csvText: 'header\ndata',
        headers: { 'content-type': 'text/csv' },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.rows[0].hasAgreement).toBe(false)
    expect(res.jsonBody.rows[0].error).toContain('no active SB agreement')
  })

  it('should handle Excel content-type', async () => {
    authSuccess()
    const excelBuffer = new ArrayBuffer(10)
    vi.mocked(parseExcelImport).mockResolvedValue(sampleParseResult)
    vi.mocked(supplierService.getByNip).mockResolvedValue({
      id: 'sup-1',
      name: 'Acme',
    })
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue({
      id: 'agr-1',
      status: 'Active',
    })

    const res = await handler()(
      mockRequest({
        query: { settingId: 'setting-1' },
        headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        arrayBuffer: excelBuffer,
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(parseExcelImport).toHaveBeenCalled()
  })
})

// ============================================================================
// POST /invoices/self-billing/import/confirm
// ============================================================================

describe('POST /invoices/self-billing/import/confirm (self-billing-import-confirm)', () => {
  const handler = () => registeredHandlers['self-billing-import-confirm']

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 400 for invalid body', async () => {
    authSuccess()
    const res = await handler()(
      mockRequest({ body: {} }),
      mockContext()
    )
    expect(res.status).toBe(400)
  })

  it('should create invoices from confirmed rows', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue({
      id: 'sup-1',
      nip: '1234567890',
      name: 'Acme',
    })
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue({
      id: 'agr-1',
    })
    vi.mocked(sbInvoiceService.createWithItems).mockResolvedValue({
      id: 'inv-new',
      invoiceNumber: 'SF/2025/01/001',
      status: 'Draft',
      settingId: '7f000000-0000-0000-0000-000000000001',
      supplierId: '7f000000-0000-0000-0000-000000000002',
      invoiceDate: '2025-01-31',
      netAmount: 5000,
      vatAmount: 1150,
      grossAmount: 6150,
      currency: 'PLN',
      items: [],
    })

    const res = await handler()(
      mockRequest({
        body: {
          settingId: '7f000000-0000-0000-0000-000000000001',
          rows: [{
            supplierNip: '1234567890',
            supplierId: '7f000000-0000-0000-0000-000000000002',
            itemDescription: 'Consulting',
            quantity: 1,
            unit: 'szt.',
            unitPrice: 5000,
            vatRate: 23,
            invoiceDate: '2025-01-31',
            netAmount: 5000,
            vatAmount: 1150,
            grossAmount: 6150,
          }],
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(sbInvoiceService.createWithItems).toHaveBeenCalled()
  })
})

// ============================================================================
// GET /invoices/self-billing/import/template
// ============================================================================

describe('GET /invoices/self-billing/import/template (self-billing-import-template)', () => {
  const handler = () => registeredHandlers['self-billing-import-template']

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return CSV template by default', async () => {
    authSuccess()
    vi.mocked(generateCsvTemplate).mockReturnValue('header1;header2\n')

    const res = await handler()(
      mockRequest({ query: {} }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(generateCsvTemplate).toHaveBeenCalled()
  })
})
