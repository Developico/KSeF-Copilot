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

// Suppress logger noise in tests
vi.mock('../src/lib/dataverse/logger', () => ({
  logDataverseInfo: vi.fn(),
  logDataverseError: vi.fn(),
  logDataverseMapping: vi.fn(),
}))

import { dataverseClient } from '../src/lib/dataverse/client'
import { MpkCenterService } from '../src/lib/dataverse/services/mpk-center-service'
import { DV } from '../src/lib/dataverse/config'

// Fresh instance per test to avoid singleton state leaking
function createService() {
  return new MpkCenterService()
}

// ── Fixtures ──────────────────────────────────────────────────

const dvCenter1 = {
  dvlp_ksefmpkcenterid: 'c1',
  dvlp_name: 'Marketing',
  dvlp_description: 'Marketing dept',
  _dvlp_settingid_value: 's1',
  dvlp_isactive: true,
  dvlp_approvalrequired: true,
  dvlp_approvalslahours: 24,
  dvlp_budgetamount: 50000,
  dvlp_budgetperiod: 1,
  dvlp_budgetstartdate: '2026-01-01',
  createdon: '2026-01-01T00:00:00Z',
  modifiedon: '2026-03-01T00:00:00Z',
}

const dvCenter2 = {
  dvlp_ksefmpkcenterid: 'c2',
  dvlp_name: 'Sales',
  dvlp_description: null,
  _dvlp_settingid_value: 's1',
  dvlp_isactive: true,
  dvlp_approvalrequired: false,
  dvlp_approvalslahours: null,
  dvlp_budgetamount: null,
  dvlp_budgetperiod: null,
  dvlp_budgetstartdate: null,
  createdon: '2026-02-01T00:00:00Z',
  modifiedon: '2026-02-01T00:00:00Z',
}

const dvApprover1 = {
  dvlp_ksefmpkapproverid: 'a1',
  dvlp_name: 'Approver – c1',
  _dvlp_mpkcenterid_value: 'c1',
  _dvlp_systemuserid_value: 'u1',
}

const dvUser1 = {
  systemuserid: 'u1',
  fullname: 'Jan Kowalski',
  internalemailaddress: 'jan@example.com',
  azureactivedirectoryobjectid: 'oid-1',
  isdisabled: false,
}

const dvUser2 = {
  systemuserid: 'u2',
  fullname: 'Anna Nowak',
  internalemailaddress: 'anna@example.com',
  azureactivedirectoryobjectid: 'oid-2',
  isdisabled: false,
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MpkCenterService', () => {
  // ────── getAll ──────

  describe('getAll', () => {
    it('should return mapped centers', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvCenter1, dvCenter2])

      const svc = createService()
      const result = await svc.getAll({ settingId: 's1' })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('c1')
      expect(result[0].name).toBe('Marketing')
      expect(result[0].budgetPeriod).toBe('Quarterly')
      expect(result[1].id).toBe('c2')
      expect(result[1].budgetPeriod).toBeUndefined()
    })

    it('should include settingId and activeOnly in filter', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      await svc.getAll({ settingId: 's1', activeOnly: true })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(`${DV.mpkCenter.settingLookup} eq`)
      expect(query).toContain(`${DV.mpkCenter.isActive} eq true`)
    })

    it('should skip activeOnly filter when set to false', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      await svc.getAll({ activeOnly: false })

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).not.toContain('dvlp_isactive')
    })

    it('should default activeOnly to true', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([])

      const svc = createService()
      await svc.getAll()

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(`${DV.mpkCenter.isActive} eq true`)
    })

    it('should propagate Dataverse errors', async () => {
      vi.mocked(dataverseClient.listAll).mockRejectedValue(new Error('DV error'))

      const svc = createService()
      await expect(svc.getAll()).rejects.toThrow('DV error')
    })
  })

  // ────── getById ──────

  describe('getById', () => {
    it('should return mapped center when found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(dvCenter1)

      const svc = createService()
      const result = await svc.getById('c1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('c1')
      expect(result!.approvalRequired).toBe(true)
      expect(result!.approvalSlaHours).toBe(24)
    })

    it('should return null when not found', async () => {
      vi.mocked(dataverseClient.getById).mockResolvedValue(null)

      const svc = createService()
      const result = await svc.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  // ────── create ──────

  describe('create', () => {
    it('should create and return re-fetched center', async () => {
      vi.mocked(dataverseClient.create).mockResolvedValue({ id: 'c-new' } as any)
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvCenter1,
        dvlp_ksefmpkcenterid: 'c-new',
      })

      const svc = createService()
      const result = await svc.create({
        name: 'Marketing',
        settingId: 's1',
      })

      expect(result.id).toBe('c-new')
      expect(vi.mocked(dataverseClient.create)).toHaveBeenCalledWith(
        DV.mpkCenter.entitySet,
        expect.objectContaining({ dvlp_name: 'Marketing' })
      )
    })

    it('should include settingBind in create payload', async () => {
      vi.mocked(dataverseClient.create).mockResolvedValue({ id: 'c-new' } as any)
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvCenter1,
        dvlp_ksefmpkcenterid: 'c-new',
      })

      const svc = createService()
      await svc.create({ name: 'Test', settingId: 'setting-uuid' })

      const payload = vi.mocked(dataverseClient.create).mock.calls[0][1] as Record<string, unknown>
      expect(payload[DV.mpkCenter.settingBind]).toBe('/dvlp_ksefsettings(setting-uuid)')
    })

    it('should throw when re-fetch fails', async () => {
      vi.mocked(dataverseClient.create).mockResolvedValue({} as any) // no id
      vi.mocked(dataverseClient.getById).mockResolvedValue(null)

      const svc = createService()
      await expect(svc.create({ name: 'Fail', settingId: 's1' }))
        .rejects.toThrow()
    })
  })

  // ────── update ──────

  describe('update', () => {
    it('should update and return re-fetched center', async () => {
      vi.mocked(dataverseClient.update).mockResolvedValue(undefined)
      vi.mocked(dataverseClient.getById).mockResolvedValue({
        ...dvCenter1,
        dvlp_name: 'Updated',
      })

      const svc = createService()
      const result = await svc.update('c1', { name: 'Updated' })

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Updated')
      expect(vi.mocked(dataverseClient.update)).toHaveBeenCalledWith(
        DV.mpkCenter.entitySet,
        'c1',
        expect.objectContaining({ dvlp_name: 'Updated' })
      )
    })
  })

  // ────── deactivate ──────

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      vi.mocked(dataverseClient.update).mockResolvedValue(undefined)

      const svc = createService()
      await svc.deactivate('c1')

      expect(vi.mocked(dataverseClient.update)).toHaveBeenCalledWith(
        DV.mpkCenter.entitySet,
        'c1',
        { [DV.mpkCenter.isActive]: false }
      )
    })
  })

  // ────── getApprovers ──────

  describe('getApprovers', () => {
    it('should return mapped approvers for given center', async () => {
      vi.mocked(dataverseClient.listAll)
        .mockResolvedValueOnce([dvApprover1])  // approvers query
        .mockResolvedValueOnce([dvUser1])       // listSystemUsers for enrichment

      const svc = createService()
      const result = await svc.getApprovers('c1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a1')
      expect(result[0].mpkCenterId).toBe('c1')
      expect(result[0].systemUserId).toBe('u1')
      expect(result[0].fullName).toBe('Jan Kowalski')
      expect(result[0].email).toBe('jan@example.com')

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain(DV.mpkApprover.mpkCenterLookup)
    })
  })

  // ────── setApprovers ──────

  describe('setApprovers', () => {
    it('should delete removed and add new approvers', async () => {
      // getApprovers(current): listAll(approvers) + listAll(users)
      // getApprovers(re-fetch): listAll(approvers) + listAll(users)
      vi.mocked(dataverseClient.listAll)
        .mockResolvedValueOnce([dvApprover1])       // current approvers: u1
        .mockResolvedValueOnce([dvUser1, dvUser2])   // users for enrichment
        .mockResolvedValueOnce([                     // after set approvers: u2 only
          { ...dvApprover1, dvlp_ksefmpkapproverid: 'a2', _dvlp_systemuserid_value: 'u2' },
        ])
        .mockResolvedValueOnce([dvUser1, dvUser2])   // users for enrichment

      vi.mocked(dataverseClient.delete).mockResolvedValue(undefined)
      vi.mocked(dataverseClient.create).mockResolvedValue({} as any)

      const svc = createService()
      const result = await svc.setApprovers('c1', ['u2']) // replace u1 with u2

      // Should have deleted u1 (approver a1)
      expect(vi.mocked(dataverseClient.delete)).toHaveBeenCalledWith(
        DV.mpkApprover.entitySet,
        'a1'
      )

      // Should have created u2
      expect(vi.mocked(dataverseClient.create)).toHaveBeenCalledWith(
        DV.mpkApprover.entitySet,
        expect.objectContaining({
          [DV.mpkApprover.mpkCenterBind]: `/dvlp_ksefmpkcenters(c1)`,
          [DV.mpkApprover.systemUserBind]: `/systemusers(u2)`,
        })
      )

      expect(result).toHaveLength(1)
    })

    it('should not delete or create when list is unchanged', async () => {
      // getApprovers(current): listAll(approvers) + listAll(users)
      // getApprovers(re-fetch): listAll(approvers) + listAll(users)
      vi.mocked(dataverseClient.listAll)
        .mockResolvedValueOnce([dvApprover1])       // current: u1
        .mockResolvedValueOnce([dvUser1])            // users for enrichment
        .mockResolvedValueOnce([dvApprover1])       // after: u1
        .mockResolvedValueOnce([dvUser1])            // users for enrichment

      const svc = createService()
      await svc.setApprovers('c1', ['u1'])

      expect(vi.mocked(dataverseClient.delete)).not.toHaveBeenCalled()
      expect(vi.mocked(dataverseClient.create)).not.toHaveBeenCalled()
    })
  })

  // ────── listSystemUsers ──────

  describe('listSystemUsers', () => {
    it('should return mapped users filtered by active non-service', async () => {
      vi.mocked(dataverseClient.listAll).mockResolvedValue([dvUser1, dvUser2])

      const svc = createService()
      const result = await svc.listSystemUsers()

      expect(result).toHaveLength(2)
      expect(result[0].systemUserId).toBe('u1')
      expect(result[0].fullName).toBe('Jan Kowalski')
      expect(result[1].systemUserId).toBe('u2')

      const query = vi.mocked(dataverseClient.listAll).mock.calls[0][1] as string
      expect(query).toContain('isdisabled eq false')
      expect(query).toContain('accessmode ne 4')
    })
  })

  // ────── resolveSystemUserByOid ──────

  describe('resolveSystemUserByOid', () => {
    it('should return user for known OID', async () => {
      vi.mocked(dataverseClient.list).mockResolvedValue({ value: [dvUser1] })

      const svc = createService()
      const result = await svc.resolveSystemUserByOid('oid-1')

      expect(result).not.toBeNull()
      expect(result!.systemUserId).toBe('u1')
    })

    it('should return null for unknown OID', async () => {
      vi.mocked(dataverseClient.list).mockResolvedValue({ value: [] })

      const svc = createService()
      const result = await svc.resolveSystemUserByOid('unknown')
      expect(result).toBeNull()
    })
  })
})
