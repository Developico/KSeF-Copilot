import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────

vi.mock('../src/lib/ksef/config', () => ({
  getKsefConfigForNip: vi.fn(),
}))

vi.mock('../src/lib/ksef/session', () => ({
  ensureActiveSession: vi.fn(),
  getActiveSession: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
  getRateLimitStatus: vi.fn().mockReturnValue({ resetIn: 60 }),
}))

vi.mock('../src/lib/ksef/parser', () => ({
  buildInvoiceXml: vi.fn().mockReturnValue('<xml>test</xml>'),
  parseInvoiceFromXml: vi.fn().mockReturnValue({ invoiceNumber: 'FV/001' }),
}))

import { getKsefConfigForNip } from '../src/lib/ksef/config'
import { ensureActiveSession, checkRateLimit, getRateLimitStatus } from '../src/lib/ksef/session'
import { buildInvoiceXml, parseInvoiceFromXml } from '../src/lib/ksef/parser'
import { sendInvoice, getInvoice, queryInvoices, batchSendInvoices, syncIncomingInvoices } from '../src/lib/ksef/invoices'
import type { KsefInvoice, KsefQueryInvoicesRequest } from '../src/lib/ksef/types'

// ── Helpers ───────────────────────────────────────────────────

const TEST_NIP = '5260250995'
const BASE_URL = 'https://api-test.ksef.mf.gov.pl/v2'

const mockSession = {
  nip: TEST_NIP,
  sessionToken: 'test-token-123',
  referenceNumber: 'ref-123',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
}

const mockConfig = {
  nip: TEST_NIP,
  baseUrl: BASE_URL,
  environment: 'test',
}

const sampleInvoice: KsefInvoice = {
  invoiceNumber: 'SF/2025/01/001',
  invoiceDate: '2025-01-31',
  isSelfBilling: true,
  seller: {
    nip: TEST_NIP,
    name: 'Supplier Sp. z o.o.',
    address: { street: 'Testowa 1', buildingNumber: '1', postalCode: '00-001', city: 'Warszawa', country: 'PL' },
  },
  buyer: {
    nip: '9999999999',
    name: 'Buyer S.A.',
    address: { street: 'Kupiecka 2', buildingNumber: '2', postalCode: '00-002', city: 'Kraków', country: 'PL' },
  },
  issuer: {
    nip: '9999999999',
    name: 'Buyer S.A.',
  },
  items: [{
    lineNumber: 1,
    description: 'Consulting services',
    quantity: 1,
    unit: 'szt.',
    unitPrice: 5000,
    netAmount: 5000,
    vatRate: 23,
    vatAmount: 1150,
    grossAmount: 6150,
  }],
  currency: 'PLN',
}

function setupMocks() {
  vi.mocked(ensureActiveSession).mockResolvedValue(mockSession)
  vi.mocked(getKsefConfigForNip).mockResolvedValue(mockConfig)
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
  setupMocks()
  // Reset rate limit mock to allow all requests by default
  vi.mocked(checkRateLimit).mockReturnValue(true)
})

// ============================================================================
// sendInvoice
// ============================================================================

describe('sendInvoice', () => {
  it('should send invoice and return response', async () => {
    const mockResponse = {
      ksefReferenceNumber: 'KSeF-REF-001',
      referenceNumber: 'REF-001',
      elementReferenceNumber: 'ELEM-001',
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as Response)

    const result = await sendInvoice(TEST_NIP, sampleInvoice)

    expect(result.ksefReferenceNumber).toBe('KSeF-REF-001')
    expect(result.invoiceHash).toBeDefined()
    expect(ensureActiveSession).toHaveBeenCalledWith(TEST_NIP, undefined)
    expect(buildInvoiceXml).toHaveBeenCalledWith(sampleInvoice)
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/invoices`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockSession.sessionToken}`,
        }),
      }),
    )
  })

  it('should throw on 403 Forbidden', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      text: vi.fn().mockResolvedValue('Unauthorized access'),
    } as unknown as Response)

    await expect(sendInvoice(TEST_NIP, sampleInvoice)).rejects.toThrow('Failed to send invoice: 403')
  })

  it('should throw on 500 server error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    } as unknown as Response)

    await expect(sendInvoice(TEST_NIP, sampleInvoice)).rejects.toThrow('Failed to send invoice: 500')
  })
})

// ============================================================================
// getInvoice
// ============================================================================

describe('getInvoice', () => {
  it('should get invoice by KSeF reference number', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/xml' }),
      text: vi.fn().mockResolvedValue('<invoice>xml</invoice>'),
    } as unknown as Response)

    const result = await getInvoice(TEST_NIP, 'KSeF-REF-001')

    expect(result.ksefReferenceNumber).toBe('KSeF-REF-001')
    expect(result.invoiceXml).toBe('<invoice>xml</invoice>')
    expect(parseInvoiceFromXml).toHaveBeenCalledWith('<invoice>xml</invoice>')
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/invoices/ksef/KSeF-REF-001`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('should throw on 404 not found', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('{"message":"Invoice not found"}'),
    } as unknown as Response)

    await expect(getInvoice(TEST_NIP, 'INVALID')).rejects.toThrow('Failed to get invoice: 404')
  })
})

// ============================================================================
// queryInvoices — including Subject3 mode
// ============================================================================

describe('queryInvoices', () => {
  const query: KsefQueryInvoicesRequest = {
    subjectType: 'subject2',
    dateFrom: '2025-01-01',
    dateTo: '2025-01-31',
    pageSize: 50,
    pageOffset: 0,
  }

  it('should query invoices with Subject2 (buyer) type', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ invoices: [], hasMore: false }),
    } as unknown as Response)

    const result = await queryInvoices(TEST_NIP, query)

    expect(result.invoices).toEqual([])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/invoices/query/metadata'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"subjectType":"Subject2"'),
      }),
    )
  })

  it('should query invoices with Subject3 (issuer / self-billing) type', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ invoices: [{ ksefNumber: 'KSeF-001' }], hasMore: false }),
    } as unknown as Response)

    const result = await queryInvoices(TEST_NIP, {
      ...query,
      subjectType: 'subject3',
    })

    expect(result.invoices).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/invoices/query/metadata'),
      expect.objectContaining({
        body: expect.stringContaining('"subjectType":"Subject3"'),
      }),
    )
  })

  it('should cap pageSize at 250', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ invoices: [], hasMore: false }),
    } as unknown as Response)

    await queryInvoices(TEST_NIP, { ...query, pageSize: 999 })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('pageSize=250'),
      expect.any(Object),
    )
  })

  it('should throw on API error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('Server error'),
    } as unknown as Response)

    await expect(queryInvoices(TEST_NIP, query)).rejects.toThrow('Failed to query invoices: 500')
  })

  it('should throw on rate limit exceeded', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    vi.mocked(getRateLimitStatus).mockReturnValue({ resetIn: 30 } as never)

    await expect(queryInvoices(TEST_NIP, query)).rejects.toThrow('Rate limit exceeded')
  })
})

// ============================================================================
// batchSendInvoices
// ============================================================================

describe('batchSendInvoices', () => {
  it('should send multiple invoices and collect results', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ksefReferenceNumber: 'KSeF-BATCH',
        referenceNumber: 'REF-B',
      }),
    } as unknown as Response)

    const result = await batchSendInvoices(TEST_NIP, [sampleInvoice, sampleInvoice])

    expect(result.success).toHaveLength(2)
    expect(result.failed).toHaveLength(0)
  })

  it('should collect failed invoices without stopping batch', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ ksefReferenceNumber: 'OK' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Server error'),
      } as unknown as Response)

    const result = await batchSendInvoices(TEST_NIP, [sampleInvoice, sampleInvoice])

    expect(result.success).toHaveLength(1)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].error).toContain('500')
  })
})

// ============================================================================
// syncIncomingInvoices
// ============================================================================

describe('syncIncomingInvoices', () => {
  it('should download invoices from query results', async () => {
    // First call: queryInvoices (POST /invoices/query/metadata)
    // Second call: getInvoice (GET /invoices/ksef/{ref})
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          invoices: [{ ksefNumber: 'KSeF-INC-001' }],
          hasMore: false,
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/xml' }),
        text: vi.fn().mockResolvedValue('<invoice/>'),
      } as unknown as Response)

    const invoices = await syncIncomingInvoices(TEST_NIP)

    expect(invoices).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('should use lastSyncDate when provided', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ invoices: [], hasMore: false }),
    } as unknown as Response)

    const lastSync = new Date('2025-01-15T00:00:00Z')
    await syncIncomingInvoices(TEST_NIP, lastSync)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/invoices/query/metadata'),
      expect.objectContaining({
        body: expect.stringContaining('2025-01-15'),
      }),
    )
  })
})
