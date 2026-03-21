import { describe, it, expect, vi, beforeEach } from 'vitest'

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
import { SbAgreementService } from '../src/lib/dataverse/services/sb-agreement-service'
import { DV, SB_AGREEMENT_STATUS } from '../src/lib/dataverse/config'

function createService() {
  return new SbAgreementService()
}

// ── Fixtures ──────────────────────────────────────────────────

const a = DV.sbAgreement

const dvAgreement1: Record<string, unknown> = {
  [a.id]: 'agr-1',
  [a.name]: 'SB Agreement 2025',
  [a.supplierLookup]: 'sup-1',
  [a.agreementDate]: '2025-01-01',
  [a.validFrom]: '2025-01-01',
  [a.validTo]: '2025-12-31',
  [a.renewalDate]: null,
  [a.approvalProcedure]: 'Standard',
  [a.status]: SB_AGREEMENT_STATUS.ACTIVE,
  [a.credentialReference]: 'CR-001',
  [a.notes]: 'Test agreement',
  [a.hasDocument]: false,
  [a.documentFilename]: null,
  [a.settingLookup]: 'setting-1',
  [a.createdOn]: '2025-01-01T00:00:00Z',
  [a.modifiedOn]: '2025-01-15T00:00:00Z',
}

const dvAgreementExpired: Record<string, unknown> = {
  ...dvAgreement1,
  [a.id]: 'agr-2',
  [a.name]: 'Expired Agreement',
  [a.validTo]: '2024-06-30',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SbAgreementService', () => {
  describe('getAll', () => {
    it('should return mapped agreements', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvAgreement1])

      const svc = createService()
      const result = await svc.getAll({ settingId: 'setting-1' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('agr-1')
      expect(result[0].name).toBe('SB Agreement 2025')
      expect(result[0].status).toBe('Active')
      expect(result[0].supplierId).toBe('sup-1')
    })

    it('should filter by supplierId and status', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      await svc.getAll({ settingId: 'setting-1', supplierId: 'sup-1', status: 'Active' })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(`${a.supplierLookup}`)
      expect(query).toContain(`${a.status} eq ${SB_AGREEMENT_STATUS.ACTIVE}`)
    })
  })

  describe('getById', () => {
    it('should return mapped agreement when found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(dvAgreement1)

      const svc = createService()
      const result = await svc.getById('agr-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('agr-1')
      expect(result!.validTo).toBe('2025-12-31')
    })

    it('should return null when not found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(null)

      const svc = createService()
      const result = await svc.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getActiveForSupplier', () => {
    it('should return active agreement for supplier', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvAgreement1])

      const svc = createService()
      const result = await svc.getActiveForSupplier('sup-1', 'setting-1')

      expect(result).not.toBeNull()
      expect(result!.status).toBe('Active')
      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(`${a.status} eq ${SB_AGREEMENT_STATUS.ACTIVE}`)
    })

    it('should return null when no active agreement', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      const result = await svc.getActiveForSupplier('sup-1', 'setting-1')

      expect(result).toBeNull()
    })
  })

  describe('terminate', () => {
    it('should set status to Terminated', async () => {
      vi.mocked(dataverseClient.update).mockResolvedValue(undefined as any)

      const svc = createService()
      await svc.terminate('agr-1')

      expect(dataverseClient.update).toHaveBeenCalledWith(
        a.entitySet,
        'agr-1',
        { [a.status]: SB_AGREEMENT_STATUS.TERMINATED }
      )
    })
  })

  describe('findExpired', () => {
    it('should return agreements past validTo', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvAgreementExpired])

      const svc = createService()
      const result = await svc.findExpired()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('agr-2')
      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(`${a.status} eq ${SB_AGREEMENT_STATUS.ACTIVE}`)
      expect(query).toContain(`${a.validTo} lt`)
    })
  })

  describe('findExpiringSoon', () => {
    it('should return agreements expiring within given days', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvAgreement1])

      const svc = createService()
      const result = await svc.findExpiringSoon(30)

      expect(result).toHaveLength(1)
      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(`${a.status} eq ${SB_AGREEMENT_STATUS.ACTIVE}`)
      expect(query).toContain(`${a.validTo} ge`)
      expect(query).toContain(`${a.validTo} le`)
    })
  })

  describe('create', () => {
    it('should create agreement with default Active status', async () => {
      vi.mocked(dataverseClient.create).mockResolvedValue({ id: 'agr-new' } as any)
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvAgreement1,
        [a.id]: 'agr-new',
      })

      const svc = createService()
      const result = await svc.create({
        name: 'New Agreement',
        supplierId: 'sup-1',
        settingId: 'setting-1',
        agreementDate: '2025-06-01',
        validFrom: '2025-06-01',
        validTo: '2026-05-31',
      })

      expect(result.id).toBe('agr-new')
      const payload = vi.mocked(dataverseClient.create).mock.calls[0][1] as Record<string, unknown>
      expect(payload[a.status]).toBe(SB_AGREEMENT_STATUS.ACTIVE)
      expect(payload[a.supplierBind]).toBe('/dvlp_ksefsuppliers(sup-1)')
      expect(payload[a.settingBind]).toBe('/dvlp_ksefsettings(setting-1)')
    })
  })
})
