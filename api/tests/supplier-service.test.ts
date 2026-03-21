import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dataverseClient before importing the service
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
import { SupplierService } from '../src/lib/dataverse/services/supplier-service'
import { DV, SUPPLIER_STATUS, SUPPLIER_SOURCE } from '../src/lib/dataverse/config'

function createService() {
  return new SupplierService()
}

// ── Fixtures ──────────────────────────────────────────────────

const s = DV.supplier

const dvSupplier1: Record<string, unknown> = {
  [s.id]: 'sup-1',
  [s.nip]: '1234567890',
  [s.name]: 'Acme Sp. z o.o.',
  [s.shortName]: 'Acme',
  [s.regon]: null,
  [s.krs]: null,
  [s.street]: 'Testowa 1',
  [s.city]: 'Warszawa',
  [s.postalCode]: '00-001',
  [s.country]: 'PL',
  [s.email]: 'acme@example.com',
  [s.phone]: null,
  [s.bankAccount]: '12345678901234567890123456',
  [s.vatStatus]: 'Czynny',
  [s.vatStatusDate]: '2025-01-15',
  [s.paymentTermsDays]: 30,
  [s.defaultMpkLookup]: null,
  [s.defaultCategory]: null,
  [s.notes]: null,
  [s.tags]: null,
  [s.hasSelfBillingAgreement]: true,
  [s.selfBillingAgreementDate]: '2025-01-01',
  [s.selfBillingAgreementExpiry]: '2025-12-31',
  [s.firstInvoiceDate]: '2024-06-01',
  [s.lastInvoiceDate]: '2025-01-15',
  [s.totalInvoiceCount]: 12,
  [s.totalGrossAmount]: 123000,
  [s.status]: SUPPLIER_STATUS.ACTIVE,
  [s.source]: SUPPLIER_SOURCE.KSEF,
  [s.settingLookup]: 'setting-1',
  [s.createdOn]: '2024-06-01T00:00:00Z',
  [s.modifiedOn]: '2025-01-15T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SupplierService', () => {
  describe('getAll', () => {
    it('should return mapped suppliers', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvSupplier1])

      const svc = createService()
      const result = await svc.getAll({ settingId: 'setting-1' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('sup-1')
      expect(result[0].nip).toBe('1234567890')
      expect(result[0].name).toBe('Acme Sp. z o.o.')
      expect(result[0].hasSelfBillingAgreement).toBe(true)
      expect(result[0].status).toBe('Active')
      expect(result[0].source).toBe('KSeF')
    })

    it('should pass filter conditions to listAll', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      await svc.getAll({ settingId: 'setting-1', status: 'Active', hasSelfBillingAgreement: true })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain('$filter=')
      expect(query).toContain(`${s.settingLookup}`)
      expect(query).toContain(`${s.status} eq ${SUPPLIER_STATUS.ACTIVE}`)
      expect(query).toContain(`${s.hasSelfBillingAgreement} eq true`)
    })

    it('should support search filter', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      await svc.getAll({ settingId: 'setting-1', search: 'Acme' })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain('contains(')
    })
  })

  describe('getById', () => {
    it('should return mapped supplier when found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(dvSupplier1)

      const svc = createService()
      const result = await svc.getById('sup-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('sup-1')
      expect(result!.nip).toBe('1234567890')
    })

    it('should return null when not found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(null)

      const svc = createService()
      const result = await svc.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getByNip', () => {
    it('should find supplier by NIP within setting', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvSupplier1])

      const svc = createService()
      const result = await svc.getByNip('1234567890', 'setting-1')

      expect(result).not.toBeNull()
      expect(result!.nip).toBe('1234567890')
      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain("'1234567890'")
    })

    it('should return null when NIP not found', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      const result = await svc.getByNip('9999999999', 'setting-1')

      expect(result).toBeNull()
    })
  })

  describe('findOrCreate', () => {
    it('should return existing supplier when found', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvSupplier1])

      const svc = createService()
      const result = await svc.findOrCreate('1234567890', 'Acme Sp. z o.o.', 'setting-1')

      expect(result.id).toBe('sup-1')
      // Should not call create
      expect(dataverseClient.create).not.toHaveBeenCalled()
    })

    it('should create new supplier when not found', async () => {
      // First call: getByNip returns empty
      vi.mocked(dataverseClient.listAll).mockResolvedValueOnce([])
      // Create returns an id
      vi.mocked(dataverseClient.create).mockResolvedValueOnce({ id: 'new-sup' } as any)
      // getById for the created supplier
      vi.mocked(dataverseClient.getById).mockResolvedValueOnce({
        ...dvSupplier1,
        [s.id]: 'new-sup',
        [s.nip]: '9999999999',
        [s.name]: 'New Supplier',
      })

      const svc = createService()
      const result = await svc.findOrCreate('9999999999', 'New Supplier', 'setting-1')

      expect(dataverseClient.create).toHaveBeenCalled()
      expect(result.nip).toBe('9999999999')
    })
  })

  describe('update', () => {
    it('should call update and return refreshed supplier', async () => {
      vi.mocked(dataverseClient.update).mockResolvedValue(undefined as any)
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvSupplier1,
        [s.hasSelfBillingAgreement]: false,
      })

      const svc = createService()
      const result = await svc.update('sup-1', { hasSelfBillingAgreement: false })

      expect(dataverseClient.update).toHaveBeenCalledWith(
        s.entitySet,
        'sup-1',
        expect.objectContaining({ [s.hasSelfBillingAgreement]: false })
      )
      expect(result).not.toBeNull()
      expect(result!.hasSelfBillingAgreement).toBe(false)
    })
  })

  describe('deactivate', () => {
    it('should set status to Inactive', async () => {
      vi.mocked(dataverseClient.update).mockResolvedValue(undefined as any)

      const svc = createService()
      await svc.deactivate('sup-1')

      expect(dataverseClient.update).toHaveBeenCalledWith(
        s.entitySet,
        'sup-1',
        { [s.status]: SUPPLIER_STATUS.INACTIVE }
      )
    })
  })
})
