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
import { SbTemplateService } from '../src/lib/dataverse/services/sb-template-service'
import { DV } from '../src/lib/dataverse/config'

function createService() {
  return new SbTemplateService()
}

// ── Fixtures ──────────────────────────────────────────────────

const t = DV.sbTemplate

const dvTemplate1: Record<string, unknown> = {
  [t.id]: 'tpl-1',
  [t.name]: 'Monthly Consulting',
  [t.supplierLookup]: 'sup-1',
  [t.settingLookup]: 'setting-1',
  [t.description]: 'Monthly consulting services',
  [t.itemDescription]: 'Consulting services',
  [t.quantity]: 1,
  [t.unit]: 'szt.',
  [t.unitPrice]: 5000,
  [t.vatRate]: 23,
  [t.currency]: 'PLN',
  [t.isActive]: true,
  [t.sortOrder]: 1,
  [t.createdOn]: '2025-01-01T00:00:00Z',
  [t.modifiedOn]: '2025-01-15T00:00:00Z',
}

const dvTemplate2: Record<string, unknown> = {
  [t.id]: 'tpl-2',
  [t.name]: 'Hourly Support',
  [t.supplierLookup]: 'sup-1',
  [t.settingLookup]: 'setting-1',
  [t.description]: null,
  [t.itemDescription]: 'Technical support',
  [t.quantity]: 160,
  [t.unit]: 'godz.',
  [t.unitPrice]: 200,
  [t.vatRate]: 23,
  [t.currency]: 'PLN',
  [t.isActive]: true,
  [t.sortOrder]: 2,
  [t.createdOn]: '2025-01-01T00:00:00Z',
  [t.modifiedOn]: '2025-02-01T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SbTemplateService', () => {
  describe('getAll', () => {
    it('should return mapped templates', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvTemplate1, dvTemplate2])

      const svc = createService()
      const result = await svc.getAll({ settingId: 'setting-1' })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('tpl-1')
      expect(result[0].name).toBe('Monthly Consulting')
      expect(result[0].itemDescription).toBe('Consulting services')
      expect(result[0].unitPrice).toBe(5000)
      expect(result[0].vatRate).toBe(23)
    })

    it('should filter by supplierId', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvTemplate1])

      const svc = createService()
      await svc.getAll({ settingId: 'setting-1', supplierId: 'sup-1' })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1]
      expect(query).toContain('sup-1')
    })

    it('should include inactive templates when activeOnly is false', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvTemplate1])

      const svc = createService()
      await svc.getAll({ settingId: 'setting-1', activeOnly: false })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1]
      expect(query).not.toContain('isActive')
    })
  })

  describe('getById', () => {
    it('should return a mapped template when found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(dvTemplate1)

      const svc = createService()
      const result = await svc.getById('tpl-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('tpl-1')
      expect(result!.name).toBe('Monthly Consulting')
    })

    it('should return null when template not found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(null)

      const svc = createService()
      const result = await svc.getById('nope')

      expect(result).toBeNull()
    })
  })

  describe('getForSupplier', () => {
    it('should return active templates for supplier', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvTemplate1])

      const svc = createService()
      const result = await svc.getForSupplier('sup-1', 'setting-1')

      expect(result).toHaveLength(1)
      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1]
      expect(query).toContain('sup-1')
    })
  })

  describe('create', () => {
    it('should create a template and return it', async () => {
      vi.mocked(dataverseClient.create).mockResolvedValue({ id: 'tpl-new' })
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvTemplate1,
        [t.id]: 'tpl-new',
      })

      const svc = createService()
      const result = await svc.create({
        name: 'Monthly Consulting',
        supplierId: 'sup-1',
        settingId: 'setting-1',
        itemDescription: 'Consulting services',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 5000,
        vatRate: 23,
        currency: 'PLN',
        isActive: true,
        sortOrder: 1,
      })

      expect(result.id).toBe('tpl-new')
      const payload = vi.mocked(dataverseClient.create).mock.calls[0][1]
      expect(payload).toHaveProperty(t.name, 'Monthly Consulting')
    })
  })

  describe('update', () => {
    it('should update template and return updated version', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvTemplate1,
        [t.unitPrice]: 6000,
      })

      const svc = createService()
      const result = await svc.update('tpl-1', { unitPrice: 6000 })

      expect(result).not.toBeNull()
      expect(dataverseClient.update).toHaveBeenCalled()
    })
  })

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const svc = createService()
      await svc.deactivate('tpl-1')

      expect(dataverseClient.update).toHaveBeenCalledWith(
        expect.any(String),
        'tpl-1',
        expect.objectContaining({ [t.isActive]: false })
      )
    })
  })

  describe('delete', () => {
    it('should hard-delete the template', async () => {
      const svc = createService()
      await svc.delete('tpl-1')

      expect(dataverseClient.delete).toHaveBeenCalledWith(expect.any(String), 'tpl-1')
    })
  })

  describe('duplicateForSupplier', () => {
    it('should duplicate all active templates from one supplier to another', async () => {
      // First call: getForSupplier (getAll inside)
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvTemplate1, dvTemplate2])
      // Create calls: return new IDs
      vi.mocked(dataverseClient.create)
        .mockResolvedValueOnce({ id: 'tpl-new-1' })
        .mockResolvedValueOnce({ id: 'tpl-new-2' })
      // getById calls after create
      vi.mocked(dataverseClient.getById)
        .mockResolvedValueOnce({ ...dvTemplate1, [t.id]: 'tpl-new-1', [t.supplierLookup]: 'sup-2' })
        .mockResolvedValueOnce({ ...dvTemplate2, [t.id]: 'tpl-new-2', [t.supplierLookup]: 'sup-2' })

      const svc = createService()
      const result = await svc.duplicateForSupplier('sup-1', 'sup-2', 'setting-1')

      expect(result).toHaveLength(2)
      expect(dataverseClient.create).toHaveBeenCalledTimes(2)
    })
  })
})
