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

vi.mock('../src/lib/dataverse/services/sb-invoice-service', () => ({
  sbInvoiceService: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/supplier-service', () => ({
  supplierService: {
    getById: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/sb-agreement-service', () => ({
  sbAgreementService: {
    getById: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/mpk-center-service', () => ({
  mpkCenterService: {
    resolveSystemUserByOid: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/services/notification-service', () => ({
  notificationService: {
    create: vi.fn(),
  },
}))

vi.mock('../src/lib/dataverse/sb-invoice-notes', () => ({
  createSbInvoiceNote: vi.fn(),
}))

vi.mock('../src/lib/ksef/invoices', () => ({
  sendInvoice: vi.fn(),
}))

vi.mock('../src/lib/dataverse/services/setting-service', () => ({
  settingService: {
    getById: vi.fn().mockResolvedValue({
      id: 'setting-1',
      nip: '5260250995',
      companyName: 'Test Company',
    }),
  },
}))

vi.mock('../src/lib/dataverse/client', () => ({
  dataverseClient: { update: vi.fn(), delete: vi.fn() },
  dataverseRequest: vi.fn(),
}))

vi.mock('../src/lib/dataverse/config', () => ({
  DV: {
    sbInvoice: {
      entitySet: 'dvlp_ksefselfbillinginvoices',
      id: 'dvlp_ksefselfbillinginvoiceid',
    },
    sbLineItem: {
      entitySet: 'dvlp_ksefselfbillinglineitems',
      id: 'dvlp_ksefselfbillinglineitemid',
      sbInvoiceLookup: '_dvlp_sbinvoiceid_value',
      sbInvoiceBind: 'dvlp_sbinvoiceid@odata.bind',
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

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { sbInvoiceService } from '../src/lib/dataverse/services/sb-invoice-service'
import { supplierService } from '../src/lib/dataverse/services/supplier-service'
import { sbAgreementService } from '../src/lib/dataverse/services/sb-agreement-service'
import { mpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { sendInvoice } from '../src/lib/ksef/invoices'

// Import function module to trigger handler registration
import '../src/functions/self-billing-batch'

// ── Helpers ───────────────────────────────────────────────────

function mockRequest(body: unknown) {
  return {
    url: 'http://localhost:7071/api/self-billing/batch/test',
    params: {},
    query: { get: () => null },
    headers: { get: () => null },
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(''),
  }
}

function mockContext() {
  return { error: vi.fn(), warn: vi.fn(), log: vi.fn() }
}

const adminUser = { id: 'uid-1', email: 'admin@test.com', name: 'Admin', roles: ['Admin'] }
const readerUser = { id: 'uid-2', email: 'reader@test.com', name: 'Reader', roles: ['Reader'] }
const dvUser = { systemUserId: 'dv-user-1', fullName: 'Admin User' }

function authAdmin() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: adminUser })
  vi.mocked(requireRole).mockReturnValue({ success: true })
  vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue(dvUser as any)
}

function authReader() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: readerUser })
  vi.mocked(requireRole).mockReturnValue({ success: true })
  vi.mocked(mpkCenterService.resolveSystemUserByOid).mockResolvedValue(dvUser as any)
}

function authFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: false, error: 'Unauthorized' })
}

function roleFail() {
  vi.mocked(verifyAuth).mockResolvedValue({ success: true, user: adminUser })
  vi.mocked(requireRole).mockReturnValue({ success: false, error: 'Forbidden' })
}

const ID1 = '11111111-1111-1111-1111-111111111111'
const ID2 = '22222222-2222-2222-2222-222222222222'
const ID3 = '33333333-3333-3333-3333-333333333333'

const draftInvoice = (id: string) => ({
  id,
  invoiceNumber: `SB-${id.slice(0, 4)}`,
  status: 'Draft',
  settingId: 'setting-1',
  supplierId: 'supplier-1',
  invoiceDate: '2025-06-01',
  currency: 'PLN',
  netAmount: 1000,
  vatAmount: 230,
  grossAmount: 1230,
  items: [],
})

const pendingInvoice = (id: string) => ({
  ...draftInvoice(id),
  status: 'PendingSeller',
  submittedByUserId: 'dv-user-1',
})

const approvedInvoice = (id: string) => ({
  ...draftInvoice(id),
  status: 'SellerApproved',
})

const rejectedInvoice = (id: string) => ({
  ...draftInvoice(id),
  status: 'SellerRejected',
})

const sampleSupplier = {
  id: 'supplier-1',
  nip: '5260250995',
  name: 'Acme Sp. z o.o.',
  street: 'Testowa 1',
  postalCode: '00-001',
  city: 'Warszawa',
  country: 'PL',
  sbContactUserId: 'dv-user-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Batch Submit ─────────────────────────────────────────────

describe('self-billing-batch-submit', () => {
  const handler = () => registeredHandlers['self-billing-batch-submit']

  it('returns 401 if not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())
    expect(res.status).toBe(401)
  })

  it('returns 403 if role not met', async () => {
    roleFail()
    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body', async () => {
    authAdmin()
    const res = await handler()(mockRequest({ invoiceIds: [] }), mockContext())
    expect(res.status).toBe(400)
  })

  it('submits multiple Draft invoices successfully', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById)
      .mockResolvedValueOnce(draftInvoice(ID1) as any)
      .mockResolvedValueOnce(draftInvoice(ID2) as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)
    vi.mocked(sbAgreementService.getById).mockResolvedValue(null as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1, ID2] }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.total).toBe(2)
    expect(res.jsonBody.succeeded).toBe(2)
    expect(res.jsonBody.failed).toBe(0)
    expect(sbInvoiceService.update).toHaveBeenCalledTimes(2)
  })

  it('skips invoices that are not Draft', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById)
      .mockResolvedValueOnce(draftInvoice(ID1) as any)
      .mockResolvedValueOnce(pendingInvoice(ID2) as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)
    vi.mocked(sbAgreementService.getById).mockResolvedValue(null as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1, ID2] }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.succeeded).toBe(1)
    expect(res.jsonBody.failed).toBe(1)
    expect(res.jsonBody.results[1].error).toContain('Cannot submit')
  })

  it('handles auto-approve when agreement has autoApprove', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue({
      ...draftInvoice(ID1),
      agreementId: 'agr-1',
    } as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)
    vi.mocked(sbAgreementService.getById).mockResolvedValue({
      id: 'agr-1',
      autoApprove: true,
    } as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.succeeded).toBe(1)
    const updateCall = vi.mocked(sbInvoiceService.update).mock.calls[0]
    expect(updateCall[1]).toMatchObject({ status: 'SellerApproved' })
  })
})

// ── Batch Approve ────────────────────────────────────────────

describe('self-billing-batch-approve', () => {
  const handler = () => registeredHandlers['self-billing-batch-approve']

  it('returns 401 if not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())
    expect(res.status).toBe(401)
  })

  it('approves PendingSeller invoices', async () => {
    authReader()
    vi.mocked(sbInvoiceService.getById)
      .mockResolvedValueOnce(pendingInvoice(ID1) as any)
      .mockResolvedValueOnce(pendingInvoice(ID2) as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1, ID2] }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.succeeded).toBe(2)
    expect(sbInvoiceService.update).toHaveBeenCalledTimes(2)
    const updateCall = vi.mocked(sbInvoiceService.update).mock.calls[0]
    expect(updateCall[1]).toMatchObject({ status: 'SellerApproved' })
  })

  it('rejects invoices not in PendingSeller status', async () => {
    authReader()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(draftInvoice(ID1) as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())

    expect(res.jsonBody.failed).toBe(1)
    expect(res.jsonBody.results[0].error).toContain('Cannot approve')
  })
})

// ── Batch Reject ─────────────────────────────────────────────

describe('self-billing-batch-reject', () => {
  const handler = () => registeredHandlers['self-billing-batch-reject']

  it('returns 400 without reason', async () => {
    authReader()
    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())
    expect(res.status).toBe(400)
  })

  it('rejects PendingSeller invoices with reason', async () => {
    authReader()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(pendingInvoice(ID1) as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)

    const res = await handler()(
      mockRequest({ invoiceIds: [ID1], reason: 'Incorrect data' }),
      mockContext(),
    )

    expect(res.status).toBe(200)
    expect(res.jsonBody.succeeded).toBe(1)
    const updateCall = vi.mocked(sbInvoiceService.update).mock.calls[0]
    expect(updateCall[1]).toMatchObject({
      status: 'SellerRejected',
      sellerRejectionReason: 'Incorrect data',
    })
  })

  it('returns partial results for mixed statuses', async () => {
    authReader()
    vi.mocked(sbInvoiceService.getById)
      .mockResolvedValueOnce(pendingInvoice(ID1) as any)
      .mockResolvedValueOnce(approvedInvoice(ID2) as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)

    const res = await handler()(
      mockRequest({ invoiceIds: [ID1, ID2], reason: 'Test' }),
      mockContext(),
    )

    expect(res.jsonBody.succeeded).toBe(1)
    expect(res.jsonBody.failed).toBe(1)
  })
})

// ── Batch Send KSeF ──────────────────────────────────────────

describe('self-billing-batch-send-ksef', () => {
  const handler = () => registeredHandlers['self-billing-batch-send-ksef']

  it('returns 401 if not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())
    expect(res.status).toBe(401)
  })

  it('sends SellerApproved invoices to KSeF', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(approvedInvoice(ID1) as any)
    vi.mocked(supplierService.getById).mockResolvedValue({ ...sampleSupplier } as any)
    vi.mocked(sendInvoice).mockResolvedValue({
      ksefReferenceNumber: 'KSEF-123',
      referenceNumber: 'REF-123',
    } as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.succeeded).toBe(1)
    expect(sbInvoiceService.update).toHaveBeenCalledWith(ID1, expect.objectContaining({
      status: 'SentToKsef',
      ksefReferenceNumber: 'KSEF-123',
    }))
  })

  it('skips invoices not in SellerApproved status', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(pendingInvoice(ID1) as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())

    expect(res.jsonBody.failed).toBe(1)
    expect(res.jsonBody.results[0].error).toContain('Cannot send')
  })
})

// ── Batch Delete ─────────────────────────────────────────────

describe('self-billing-batch-delete', () => {
  const handler = () => registeredHandlers['self-billing-batch-delete']

  it('returns 401 if not authenticated', async () => {
    authFail()
    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())
    expect(res.status).toBe(401)
  })

  it('deletes Draft and SellerRejected invoices', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById)
      .mockResolvedValueOnce(draftInvoice(ID1) as any)
      .mockResolvedValueOnce(rejectedInvoice(ID2) as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1, ID2] }), mockContext())

    expect(res.status).toBe(200)
    expect(res.jsonBody.succeeded).toBe(2)
    expect(sbInvoiceService.delete).toHaveBeenCalledTimes(2)
  })

  it('rejects invoices in non-deletable statuses', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById)
      .mockResolvedValueOnce(draftInvoice(ID1) as any)
      .mockResolvedValueOnce(pendingInvoice(ID2) as any)
      .mockResolvedValueOnce(approvedInvoice(ID3) as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1, ID2, ID3] }), mockContext())

    expect(res.jsonBody.succeeded).toBe(1)
    expect(res.jsonBody.failed).toBe(2)
    expect(sbInvoiceService.delete).toHaveBeenCalledTimes(1)
    expect(sbInvoiceService.delete).toHaveBeenCalledWith(ID1)
  })

  it('handles not-found invoices gracefully', async () => {
    authAdmin()
    vi.mocked(sbInvoiceService.getById).mockResolvedValue(null as any)

    const res = await handler()(mockRequest({ invoiceIds: [ID1] }), mockContext())

    expect(res.jsonBody.failed).toBe(1)
    expect(res.jsonBody.results[0].error).toBe('Invoice not found')
  })
})
