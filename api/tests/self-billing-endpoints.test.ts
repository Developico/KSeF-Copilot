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
  requireAnyRole: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services/sb-invoice-service', () => ({
  sbInvoiceService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    createWithItems: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    replaceLineItems: vi.fn(),
    getLineItems: vi.fn(),
    findByInvoiceNumber: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/supplier-service', () => ({
  supplierService: {
    getById: vi.fn(),
    getAll: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/sb-agreement-service', () => ({
  sbAgreementService: {
    getById: vi.fn(),
    getActiveForSupplier: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/sb-template-service', () => ({
  sbTemplateService: {
    getForSupplier: vi.fn(),
  },
}))

vi.mock('../src/lib/ksef/invoices', () => ({
  sendInvoice: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services/mpk-center-service', () => ({
  mpkCenterService: {
    resolveSystemUserByOid: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/notification-service', () => ({
  notificationService: {
    create: vi.fn(),
    createForRecipients: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseClient: { update: vi.fn(), delete: vi.fn() },
  dataverseRequest: vi.fn(),
}))

vi.mock('../src/lib/dataverse/config', () => ({
  DV: {
    invoice: {
      entitySet: 'dvlp_ksefinvoices',
      ksefReferenceNumber: 'dvlp_ksefreferencenumber',
    },
    sbInvoice: {
      entitySet: 'dvlp_ksefselfbillinginvoices',
      id: 'dvlp_ksefselfbillinginvoiceid',
      settingBind: 'dvlp_settingid@odata.bind',
      supplierBind: 'dvlp_supplierid@odata.bind',
      agreementBind: 'dvlp_sbagreementid@odata.bind',
      invoiceBind: 'dvlp_kseFinvoiceid@odata.bind',
      mpkCenterBind: 'dvlp_mpkcenterid@odata.bind',
      settingLookup: '_dvlp_settingid_value',
      supplierLookup: '_dvlp_supplierid_value',
      agreementLookup: '_dvlp_sbagreementid_value',
      invoiceLookup: '_dvlp_ksefinvoiceid_value',
      mpkCenterLookup: '_dvlp_mpkcenterid_value',
    },
    sbLineItem: {
      entitySet: 'dvlp_ksefselfbillinglineitems',
      id: 'dvlp_ksefselfbillinglineitemid',
      sbInvoiceLookup: '_dvlp_sbinvoiceid_value',
      sbInvoiceBind: 'dvlp_sbinvoiceid@odata.bind',
      templateLookup: '_dvlp_templateid_value',
      templateBind: 'dvlp_templateid@odata.bind',
    },
  },
  SELF_BILLING_STATUS: {
    DRAFT: 100000001,
    PENDING_SELLER: 100000002,
    SELLER_APPROVED: 100000003,
    SELLER_REJECTED: 100000004,
    SENT_TO_KSEF: 100000005,
  },
}))

vi.mock('../src/lib/dataverse/services/setting-service', () => ({
  settingService: {
    getById: vi.fn().mockResolvedValue({
      id: '7f000000-0000-0000-0000-000000000001',
      nip: '5260250995',
      companyName: 'Test Company',
    }),
  },
}))

import { verifyAuth, requireRole, requireAnyRole } from '../src/lib/auth/middleware'
import { sbInvoiceService } from '../src/lib/dataverse/services/sb-invoice-service'
import { supplierService } from '../src/lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../src/lib/dataverse/services/sb-agreement-service'
import { sendInvoice } from '../src/lib/ksef/invoices'
import { mpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { notificationService } from '../src/lib/dataverse/services/notification-service'

// Import function module to trigger handler registration
import '../src/functions/self-billing-invoices'

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
  return {
    url: overrides.url || 'http://localhost:7071/api/invoices/self-billing',
    params: overrides.params || {},
    query: { get: (key: string) => queryMap.get(key) || null },
    headers: { get: (key: string) => headerMap.get(key) || null },
    json: vi.fn().mockResolvedValue(overrides.body || {}),
    text: vi.fn().mockResolvedValue(''),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  }
}

function mockContext() {
  return { error: vi.fn(), warn: vi.fn(), log: vi.fn() }
}

const testUser = { id: 'uid-1', email: 'user@test.com', name: 'User', roles: ['Admin'] }

function authSuccess(user = testUser) {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user })
  vi.mocked(requireRole).mockReturnValue({ success: true })
  vi.mocked(requireAnyRole).mockReturnValue({ success: true })
}

function authFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: false, error: 'Unauthorized' })
}

function roleFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: testUser })
  vi.mocked(requireRole).mockReturnValue({ success: false, error: 'Forbidden' })
  vi.mocked(requireAnyRole).mockReturnValue({ success: false, error: 'Forbidden' })
}

const SETTING_UUID = '7f000000-0000-0000-0000-000000000001'
const SUPPLIER_UUID = '7f000000-0000-0000-0000-000000000010'

const sampleSupplier = {
  id: SUPPLIER_UUID,
  nip: '5260250995',
  name: 'Acme Sp. z o.o.',
  status: 'Active',
  hasSelfBillingAgreement: true,
  settingId: SETTING_UUID,
  street: 'Testowa 1',
  defaultMpkId: null,
}

const sampleAgreement = {
  id: 'agr-1',
  supplierId: SUPPLIER_UUID,
  settingId: SETTING_UUID,
  status: 'Active',
  validFrom: '2025-01-01',
  validTo: '2025-12-31',
}

const sampleSbInvoice = {
  id: 'inv-1',
  invoiceNumber: 'SF/2025/01/001',
  status: 'Draft',
  settingId: SETTING_UUID,
  supplierId: SUPPLIER_UUID,
  invoiceDate: '2025-01-31',
  netAmount: 5000,
  vatAmount: 1150,
  grossAmount: 6150,
  currency: 'PLN',
  items: [
    {
      id: 'item-1',
      sbInvoiceId: 'inv-1',
      itemDescription: 'Consulting',
      quantity: 1,
      unit: 'szt.',
      unitPrice: 5000,
      vatRate: 23,
      netAmount: 5000,
      vatAmount: 1150,
      grossAmount: 6150,
      sortOrder: 0,
    },
  ],
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// GET /invoices/self-billing (list)
// ============================================================================

describe('GET /invoices/self-billing (self-billing-invoices-list)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-list']

  it('should return 401 when unauthenticated', async () => {
    authFail()
    const res = await handler()(mockRequest(), mockContext())
    expect(res.status).toBe(401)
  })

  it('should return 200 with invoice list', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getAll).mockResolvedValue([sampleSbInvoice])

    const res = await handler()(
      mockRequest({ query: { settingId: SETTING_UUID } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.invoices).toHaveLength(1)
  })
})

// ============================================================================
// POST /invoices/self-billing/:id/submit
// ============================================================================

describe('POST /invoices/self-billing/:id/submit (self-billing-invoices-submit)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-submit']

  it('should return 404 when invoice not found', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({ params: { id: 'nope' } }),
      mockContext()
    )

    expect(res.status).toBe(404)
  })

  it('should return 400 when status is not Draft', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({ ...sampleSbInvoice, status: 'PendingSeller' })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' } }),
      mockContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('Cannot submit')
  })

  it('should return 200 and update status to PendingSeller', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(sampleSbInvoice)
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...sampleSupplier,
      sbContactUserId: 'dv-user-contact-1',
    })
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'dv-user-1',
      fullName: 'User',
      email: 'user@test.com',
    })
    vi.mocked(sbInvoiceService.update).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'PendingSeller',
    })
    vi.mocked(notificationService.create).mockResolvedValue(undefined as any)

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(sbInvoiceService.update).toHaveBeenCalledWith('inv-1', expect.objectContaining({
      status: 'PendingSeller',
      submittedByUserId: 'dv-user-1',
    }))
  })
})

// ============================================================================
// POST /invoices/self-billing/:id/approve
// ============================================================================

describe('POST /invoices/self-billing/:id/approve (self-billing-invoices-approve)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-approve']

  it('should return 400 when status is not PendingSeller', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({ ...sampleSbInvoice, status: 'Draft' })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' } }),
      mockContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('Cannot approve')
  })

  it('should return 200 and update status to SellerApproved', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'PendingSeller',
    })
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'dv-user-1',
      fullName: 'User',
      email: 'user@test.com',
    })
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...sampleSupplier,
      sbContactUserId: 'dv-user-1',
    })
    vi.mocked(sbInvoiceService.update).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'SellerApproved',
    })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(sbInvoiceService.update).toHaveBeenCalledWith('inv-1', expect.objectContaining({
      status: 'SellerApproved',
      approvedByUserId: 'dv-user-1',
    }))
  })

  it('should update invoice number when provided', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'PendingSeller',
    })
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'dv-user-1',
      fullName: 'User',
      email: 'user@test.com',
    })
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...sampleSupplier,
      sbContactUserId: 'dv-user-1',
    })
    vi.mocked(sbInvoiceService.findByInvoiceNumber).mockResolvedValue(null)
    vi.mocked(sbInvoiceService.update).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'SellerApproved',
      invoiceNumber: 'SUPPLIER/2025/001',
    })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' }, body: { invoiceNumber: 'SUPPLIER/2025/001' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(sbInvoiceService.update).toHaveBeenCalledWith('inv-1', expect.objectContaining({
      status: 'SellerApproved',
      invoiceNumber: 'SUPPLIER/2025/001',
    }))
  })

  it('should return 409 when invoice number already exists', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'PendingSeller',
    })
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'dv-user-1',
      fullName: 'User',
      email: 'user@test.com',
    })
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...sampleSupplier,
      sbContactUserId: 'dv-user-1',
    })
    vi.mocked(sbInvoiceService.findByInvoiceNumber).mockResolvedValue({
      ...sampleSbInvoice,
      id: 'other-inv',
      invoiceNumber: 'DUPLICATE/001',
    })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' }, body: { invoiceNumber: 'DUPLICATE/001' } }),
      mockContext()
    )

    expect(res.status).toBe(409)
    expect(res.jsonBody.error).toContain('already exists')
  })

  it('should not trigger uniqueness check when invoice number is unchanged', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'PendingSeller',
    })
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'dv-user-1',
      fullName: 'User',
      email: 'user@test.com',
    })
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...sampleSupplier,
      sbContactUserId: 'dv-user-1',
    })
    vi.mocked(sbInvoiceService.update).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'SellerApproved',
    })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' }, body: { invoiceNumber: sampleSbInvoice.invoiceNumber } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(sbInvoiceService.findByInvoiceNumber).not.toHaveBeenCalled()
    expect(sbInvoiceService.update).toHaveBeenCalledWith('inv-1', expect.not.objectContaining({
      invoiceNumber: expect.anything(),
    }))
  })
})

// ============================================================================
// POST /invoices/self-billing/:id/reject
// ============================================================================

describe('POST /invoices/self-billing/:id/reject (self-billing-invoices-reject)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-reject']

  it('should return 400 when reason missing', async () => {
    authSuccess()
    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' }, body: {} }),
      mockContext()
    )

    expect(res.status).toBe(400)
  })

  it('should return 400 when status is not PendingSeller', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({ ...sampleSbInvoice, status: 'Draft' })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' }, body: { reason: 'Wrong amount' } }),
      mockContext()
    )

    expect(res.status).toBe(400)
  })

  it('should return 200 and reject with reason', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'PendingSeller',
    })
    vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue({
      systemUserId: 'dv-user-1',
      fullName: 'User',
      email: 'user@test.com',
    })
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...sampleSupplier,
      sbContactUserId: 'dv-user-1',
    })
    vi.mocked(sbInvoiceService.update).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'SellerRejected',
    })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' }, body: { reason: 'Wrong amount' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(sbInvoiceService.update).toHaveBeenCalledWith('inv-1', expect.objectContaining({
      status: 'SellerRejected',
      sellerRejectionReason: 'Wrong amount',
      approvedByUserId: 'dv-user-1',
    }))
  })
})

// ============================================================================
// POST /invoices/self-billing/:id/send-ksef
// ============================================================================

describe('POST /invoices/self-billing/:id/send-ksef (self-billing-invoices-send-ksef)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-send-ksef']

  it('should return 400 when status is not SellerApproved', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({ ...sampleSbInvoice, status: 'Draft' })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' } }),
      mockContext()
    )

    expect(res.status).toBe(400)
    expect(res.jsonBody.error).toContain('SellerApproved')
  })

  it('should return 200 and send to KSeF', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...sampleSbInvoice,
      status: 'SellerApproved',
    })
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)
    vi.mocked(sendInvoice).mockResolvedValue({
      ksefReferenceNumber: 'KSEF-REF-001',
      elementReferenceNumber: 'ELEM-001',
      referenceNumber: 'REF-001',
    })

    const res = await handler()(
      mockRequest({ params: { id: 'inv-1' } }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.ksefReferenceNumber).toBe('KSEF-REF-001')
    expect(sendInvoice).toHaveBeenCalled()
  })
})

// ============================================================================
// POST /invoices/self-billing/batch
// ============================================================================

describe('POST /invoices/self-billing/batch (self-billing-invoices-batch)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-batch']

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
      mockRequest({ body: { invoices: [] } }),
      mockContext()
    )
    expect(res.status).toBe(400)
  })

  it('should create invoices in batch and return results', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(sampleSupplier)
    vi.mocked(sbAgreementService.getActiveForSupplier).mockResolvedValue(sampleAgreement)
    vi.mocked(sbInvoiceService.createWithItems).mockResolvedValue(sampleSbInvoice)

    const res = await handler()(
      mockRequest({
        body: {
          settingId: SETTING_UUID,
          invoices: [{
            supplierId: SUPPLIER_UUID,
            settingId: SETTING_UUID,
            invoiceDate: '2025-01-31',
            items: [{ itemDescription: 'Consulting', quantity: 1, unit: 'szt.', unitPrice: 5000, vatRate: 23 }],
          }],
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.total).toBe(1)
    expect(res.jsonBody.created).toBe(1)
  })

  it('should report errors for missing suppliers', async () => {
    authSuccess()
    vi.mocked(supplierService.getById).mockResolvedValue(null)

    const res = await handler()(
      mockRequest({
        body: {
          settingId: SETTING_UUID,
          invoices: [{
            supplierId: SUPPLIER_UUID,
            settingId: SETTING_UUID,
            invoiceDate: '2025-01-31',
            items: [{ itemDescription: 'Consulting', quantity: 1, unit: 'szt.', unitPrice: 5000, vatRate: 23 }],
          }],
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.failed).toBe(1)
    expect(res.jsonBody.results[0].error).toContain('not found')
  })
})

// ============================================================================
// POST /invoices/self-billing/generate/confirm
// ============================================================================

describe('POST /invoices/self-billing/generate/confirm (self-billing-invoices-generate-confirm)', () => {
  const handler = () => registeredHandlers['self-billing-invoices-generate-confirm']

  it('should return 400 for empty invoiceIds', async () => {
    authSuccess()
    const res = await handler()(
      mockRequest({ body: { invoiceIds: [] } }),
      mockContext()
    )
    expect(res.status).toBe(400)
  })

  it('should confirm invoices and return results', async () => {
    authSuccess()
    vi.mocked(sbInvoiceService.updateStatus).mockResolvedValue({ ...sampleSbInvoice, status: 'PendingSeller' })

    const res = await handler()(
      mockRequest({
        body: {
          invoiceIds: ['7f000000-0000-0000-0000-000000000001'],
        },
      }),
      mockContext()
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.confirmed).toBe(1)
  })
})
