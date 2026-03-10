import { describe, it, expect } from 'vitest'
import {
  ApprovalStatusValues,
  getApprovalStatusKey,
  BudgetPeriodValues,
  getBudgetPeriodKey,
  NotificationTypeValues,
} from '../src/lib/dataverse/entities'
import {
  mapDvMpkCenterToApp,
  mapAppMpkCenterToDv,
  mapDvMpkApproverToApp,
  mapDvSystemUserToApp,
  mapDvApprovalStatusToApp,
  mapAppApprovalStatusToDv,
  mapDvBudgetPeriodToApp,
  mapAppBudgetPeriodToDv,
} from '../src/lib/dataverse/mappers'
import {
  MpkCenterCreateSchema,
  MpkCenterUpdateSchema,
  SetApproversSchema,
  BudgetPeriod,
} from '../src/types/mpk'
import { DV, APPROVAL_STATUS, BUDGET_PERIOD, NOTIFICATION_TYPE } from '../src/lib/dataverse/config'

// ── Config constants ──────────────────────────────────────────

describe('MPK Config Constants', () => {
  describe('APPROVAL_STATUS', () => {
    it('should have correct option values', () => {
      expect(APPROVAL_STATUS.DRAFT).toBe(0)
      expect(APPROVAL_STATUS.PENDING).toBe(1)
      expect(APPROVAL_STATUS.APPROVED).toBe(2)
      expect(APPROVAL_STATUS.REJECTED).toBe(3)
      expect(APPROVAL_STATUS.CANCELLED).toBe(4)
    })
  })

  describe('BUDGET_PERIOD', () => {
    it('should have correct option values', () => {
      expect(BUDGET_PERIOD.MONTHLY).toBe(0)
      expect(BUDGET_PERIOD.QUARTERLY).toBe(1)
      expect(BUDGET_PERIOD.HALF_YEARLY).toBe(2)
      expect(BUDGET_PERIOD.ANNUAL).toBe(3)
    })
  })

  describe('NOTIFICATION_TYPE', () => {
    it('should have correct option values', () => {
      expect(NOTIFICATION_TYPE.APPROVAL_REQUESTED).toBe(0)
      expect(NOTIFICATION_TYPE.SLA_EXCEEDED).toBe(1)
      expect(NOTIFICATION_TYPE.BUDGET_WARNING_80).toBe(2)
      expect(NOTIFICATION_TYPE.BUDGET_EXCEEDED).toBe(3)
      expect(NOTIFICATION_TYPE.APPROVAL_DECIDED).toBe(4)
    })
  })

  describe('DV.mpkCenter', () => {
    it('should have correct entity set name', () => {
      expect(DV.mpkCenter.entitySet).toBe('dvlp_ksefmpkcenters')
    })

    it('should have all required fields', () => {
      const s = DV.mpkCenter
      expect(s.id).toBe('dvlp_ksefmpkcenterid')
      expect(s.name).toBe('dvlp_name')
      expect(s.description).toBe('dvlp_description')
      expect(s.settingLookup).toBe('_dvlp_settingid_value')
      expect(s.isActive).toBe('dvlp_isactive')
      expect(s.approvalRequired).toBe('dvlp_approvalrequired')
      expect(s.approvalSlaHours).toBe('dvlp_approvalslahours')
      expect(s.budgetAmount).toBe('dvlp_budgetamount')
      expect(s.budgetPeriod).toBe('dvlp_budgetperiod')
      expect(s.budgetStartDate).toBe('dvlp_budgetstartdate')
    })
  })

  describe('DV.mpkApprover', () => {
    it('should have correct entity set name', () => {
      expect(DV.mpkApprover.entitySet).toBe('dvlp_ksefmpkapprovers')
    })

    it('should have lookup fields', () => {
      const s = DV.mpkApprover
      expect(s.mpkCenterLookup).toBe('_dvlp_mpkcenterid_value')
      expect(s.systemUserLookup).toBe('_dvlp_systemuserid_value')
    })
  })
})

// ── Entity values ─────────────────────────────────────────────

describe('MPK Entity Values', () => {
  describe('ApprovalStatusValues', () => {
    it('should have correct values', () => {
      expect(ApprovalStatusValues.Draft).toBe(0)
      expect(ApprovalStatusValues.Pending).toBe(1)
      expect(ApprovalStatusValues.Approved).toBe(2)
      expect(ApprovalStatusValues.Rejected).toBe(3)
      expect(ApprovalStatusValues.Cancelled).toBe(4)
    })
  })

  describe('getApprovalStatusKey', () => {
    it('should return correct key for known values', () => {
      expect(getApprovalStatusKey(0)).toBe('Draft')
      expect(getApprovalStatusKey(1)).toBe('Pending')
      expect(getApprovalStatusKey(2)).toBe('Approved')
      expect(getApprovalStatusKey(3)).toBe('Rejected')
      expect(getApprovalStatusKey(4)).toBe('Cancelled')
    })

    it('should return Draft for null/undefined', () => {
      expect(getApprovalStatusKey(null)).toBe('Draft')
      expect(getApprovalStatusKey(undefined)).toBe('Draft')
    })

    it('should return Draft for unknown values', () => {
      expect(getApprovalStatusKey(999)).toBe('Draft')
    })
  })

  describe('BudgetPeriodValues', () => {
    it('should have correct values', () => {
      expect(BudgetPeriodValues.Monthly).toBe(0)
      expect(BudgetPeriodValues.Quarterly).toBe(1)
      expect(BudgetPeriodValues.HalfYearly).toBe(2)
      expect(BudgetPeriodValues.Annual).toBe(3)
    })
  })

  describe('getBudgetPeriodKey', () => {
    it('should return correct key for known values', () => {
      expect(getBudgetPeriodKey(0)).toBe('Monthly')
      expect(getBudgetPeriodKey(1)).toBe('Quarterly')
      expect(getBudgetPeriodKey(2)).toBe('HalfYearly')
      expect(getBudgetPeriodKey(3)).toBe('Annual')
    })

    it('should return undefined for null/undefined', () => {
      expect(getBudgetPeriodKey(null)).toBeUndefined()
      expect(getBudgetPeriodKey(undefined)).toBeUndefined()
    })
  })

  describe('NotificationTypeValues', () => {
    it('should have correct values', () => {
      expect(NotificationTypeValues.ApprovalRequested).toBe(0)
      expect(NotificationTypeValues.SlaExceeded).toBe(1)
      expect(NotificationTypeValues.BudgetWarning80).toBe(2)
      expect(NotificationTypeValues.BudgetExceeded).toBe(3)
      expect(NotificationTypeValues.ApprovalDecided).toBe(4)
    })
  })
})

// ── Mappers ───────────────────────────────────────────────────

describe('MPK Mappers', () => {
  describe('mapDvMpkCenterToApp', () => {
    it('should map a full DvMpkCenter to MpkCenter', () => {
      const raw = {
        dvlp_ksefmpkcenterid: 'center-1',
        dvlp_name: 'Test Center',
        dvlp_description: 'A test center',
        _dvlp_settingid_value: 'setting-1',
        dvlp_isactive: true,
        dvlp_approvalrequired: true,
        dvlp_approvalslahours: 48,
        dvlp_budgetamount: 50000,
        dvlp_budgetperiod: 1,
        dvlp_budgetstartdate: '2026-01-01',
        createdon: '2026-03-01T10:00:00Z',
        modifiedon: '2026-03-09T15:00:00Z',
      }

      const result = mapDvMpkCenterToApp(raw as any)

      expect(result.id).toBe('center-1')
      expect(result.name).toBe('Test Center')
      expect(result.description).toBe('A test center')
      expect(result.settingId).toBe('setting-1')
      expect(result.isActive).toBe(true)
      expect(result.approvalRequired).toBe(true)
      expect(result.approvalSlaHours).toBe(48)
      expect(result.budgetAmount).toBe(50000)
      expect(result.budgetPeriod).toBe('Quarterly')
      expect(result.budgetStartDate).toBe('2026-01-01')
    })

    it('should default isActive to true and approvalRequired to false', () => {
      const raw = {
        dvlp_ksefmpkcenterid: 'center-2',
        dvlp_name: 'Minimal',
        _dvlp_settingid_value: 'setting-1',
        createdon: '2026-03-01T10:00:00Z',
        modifiedon: '2026-03-01T10:00:00Z',
      }

      const result = mapDvMpkCenterToApp(raw as any)

      expect(result.isActive).toBe(true)
      expect(result.approvalRequired).toBe(false)
      expect(result.budgetPeriod).toBeUndefined()
    })
  })

  describe('mapAppMpkCenterToDv', () => {
    it('should map app data to Dataverse payload', () => {
      const app = {
        name: 'New Center',
        description: 'Desc',
        isActive: true,
        approvalRequired: true,
        approvalSlaHours: 24,
        budgetAmount: 10000,
        budgetPeriod: 'Monthly' as const,
        budgetStartDate: '2026-01-01',
        settingId: 'setting-uuid',
      }

      const payload = mapAppMpkCenterToDv(app)

      expect(payload.dvlp_name).toBe('New Center')
      expect(payload.dvlp_description).toBe('Desc')
      expect(payload.dvlp_isactive).toBe(true)
      expect(payload.dvlp_approvalrequired).toBe(true)
      expect(payload.dvlp_approvalslahours).toBe(24)
      expect(payload.dvlp_budgetamount).toBe(10000)
      expect(payload.dvlp_budgetperiod).toBe(0) // Monthly = 0
      expect(payload.dvlp_budgetstartdate).toBe('2026-01-01')
      expect(payload['dvlp_settingid@odata.bind']).toBe('/dvlp_ksefsettings(setting-uuid)')
    })

    it('should only include defined fields', () => {
      const payload = mapAppMpkCenterToDv({ name: 'Partial' })

      expect(payload.dvlp_name).toBe('Partial')
      expect(Object.keys(payload)).toEqual(['dvlp_name'])
    })

    it('should set null for cleared optional fields (via null coercion)', () => {
      // In practice, Zod nullable() emits null; mapAppMpkCenterToDv uses ?? null
      const payload = mapAppMpkCenterToDv({
        budgetAmount: null,
        budgetPeriod: null,
      } as any)

      expect(payload.dvlp_budgetamount).toBeNull()
      expect(payload.dvlp_budgetperiod).toBeNull()
    })
  })

  describe('mapDvMpkApproverToApp', () => {
    it('should map a DvMpkApprover', () => {
      const raw = {
        dvlp_ksefmpkapproverid: 'approver-1',
        _dvlp_mpkcenterid_value: 'center-1',
        _dvlp_systemuserid_value: 'user-1',
        dvlp_name: 'Jan Kowalski',
      }

      const result = mapDvMpkApproverToApp(raw as any)

      expect(result.id).toBe('approver-1')
      expect(result.mpkCenterId).toBe('center-1')
      expect(result.systemUserId).toBe('user-1')
      expect(result.name).toBe('Jan Kowalski')
      expect(result.fullName).toBe('')
      expect(result.email).toBe('')
    })
  })

  describe('mapDvSystemUserToApp', () => {
    it('should map a DvSystemUser', () => {
      const raw = {
        systemuserid: 'user-1',
        fullname: 'Jan Kowalski',
        internalemailaddress: 'jan@example.com',
        azureactivedirectoryobjectid: 'aad-oid-1',
        isdisabled: false,
      }

      const result = mapDvSystemUserToApp(raw)

      expect(result.systemUserId).toBe('user-1')
      expect(result.fullName).toBe('Jan Kowalski')
      expect(result.email).toBe('jan@example.com')
      expect(result.azureObjectId).toBe('aad-oid-1')
      expect(result.isDisabled).toBe(false)
    })

    it('should default email to empty string when null', () => {
      const raw = {
        systemuserid: 'user-2',
        fullname: 'No Email User',
        internalemailaddress: null,
        isdisabled: false,
      }

      const result = mapDvSystemUserToApp(raw as any)

      expect(result.email).toBe('')
    })
  })

  describe('mapDvApprovalStatusToApp / mapAppApprovalStatusToDv', () => {
    it('should round-trip all statuses', () => {
      const statuses = ['Draft', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const
      for (const s of statuses) {
        const dv = mapAppApprovalStatusToDv(s)
        const app = mapDvApprovalStatusToApp(dv)
        expect(app).toBe(s)
      }
    })

    it('should default undefined to Draft', () => {
      expect(mapDvApprovalStatusToApp(undefined)).toBe('Draft')
    })
  })

  describe('mapDvBudgetPeriodToApp / mapAppBudgetPeriodToDv', () => {
    it('should round-trip all periods', () => {
      const periods = ['Monthly', 'Quarterly', 'HalfYearly', 'Annual'] as const
      for (const p of periods) {
        const dv = mapAppBudgetPeriodToDv(p)
        const app = mapDvBudgetPeriodToApp(dv)
        expect(app).toBe(p)
      }
    })

    it('should return undefined for undefined/null', () => {
      expect(mapDvBudgetPeriodToApp(undefined)).toBeUndefined()
    })
  })
})

// ── Zod Schemas ───────────────────────────────────────────────

describe('MPK Zod Schemas', () => {
  describe('MpkCenterCreateSchema', () => {
    it('should accept valid minimal input', () => {
      const result = MpkCenterCreateSchema.safeParse({
        name: 'Test Center',
        settingId: '12345678-1234-1234-1234-123456789abc',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isActive).toBe(true)
        expect(result.data.approvalRequired).toBe(false)
      }
    })

    it('should accept valid full input with budget', () => {
      const result = MpkCenterCreateSchema.safeParse({
        name: 'Budget Center',
        settingId: '12345678-1234-1234-1234-123456789abc',
        budgetAmount: 50000,
        budgetPeriod: 'Quarterly',
        budgetStartDate: '2026-01-01',
      })

      expect(result.success).toBe(true)
    })

    it('should reject budget without period and start date', () => {
      const result = MpkCenterCreateSchema.safeParse({
        name: 'Incomplete Budget',
        settingId: '12345678-1234-1234-1234-123456789abc',
        budgetAmount: 50000,
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const result = MpkCenterCreateSchema.safeParse({
        name: '',
        settingId: '12345678-1234-1234-1234-123456789abc',
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid settingId', () => {
      const result = MpkCenterCreateSchema.safeParse({
        name: 'Valid Name',
        settingId: 'not-a-uuid',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('MpkCenterUpdateSchema', () => {
    it('should accept partial updates', () => {
      const result = MpkCenterUpdateSchema.safeParse({ name: 'Updated' })

      expect(result.success).toBe(true)
    })

    it('should accept nullable optional fields', () => {
      const result = MpkCenterUpdateSchema.safeParse({
        description: null,
        approvalSlaHours: null,
        budgetAmount: null,
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid SLA hours', () => {
      const result = MpkCenterUpdateSchema.safeParse({ approvalSlaHours: 0 })
      expect(result.success).toBe(false)

      const result2 = MpkCenterUpdateSchema.safeParse({ approvalSlaHours: 1000 })
      expect(result2.success).toBe(false)
    })
  })

  describe('SetApproversSchema', () => {
    it('should accept valid UUIDs', () => {
      const result = SetApproversSchema.safeParse({
        systemUserIds: [
          '12345678-1234-1234-1234-123456789abc',
          '87654321-4321-4321-4321-cba987654321',
        ],
      })

      expect(result.success).toBe(true)
    })

    it('should accept empty array', () => {
      const result = SetApproversSchema.safeParse({ systemUserIds: [] })
      expect(result.success).toBe(true)
    })

    it('should reject non-UUID strings', () => {
      const result = SetApproversSchema.safeParse({
        systemUserIds: ['not-uuid'],
      })

      expect(result.success).toBe(false)
    })
  })
})
