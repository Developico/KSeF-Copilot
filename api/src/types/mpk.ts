import { z } from 'zod'

/**
 * Approval Status enum
 */
export const ApprovalStatus = {
  Draft: 'Draft',
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
} as const

export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus]

/**
 * Budget Period enum
 */
export const BudgetPeriod = {
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  HalfYearly: 'HalfYearly',
  Annual: 'Annual',
} as const

export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod]

/**
 * Notification Type enum
 */
export const NotificationType = {
  ApprovalRequested: 'ApprovalRequested',
  SlaExceeded: 'SlaExceeded',
  BudgetWarning80: 'BudgetWarning80',
  BudgetExceeded: 'BudgetExceeded',
  ApprovalDecided: 'ApprovalDecided',
} as const

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

/**
 * MPK Center entity (application type)
 */
export interface MpkCenter {
  id: string
  name: string
  description?: string
  settingId: string
  isActive: boolean
  // Approval
  approvalRequired: boolean
  approvalSlaHours?: number
  approvalEffectiveFrom?: string
  // Budget
  budgetAmount?: number
  budgetPeriod?: BudgetPeriod
  budgetStartDate?: string
  // Metadata
  createdOn: string
  modifiedOn: string
}

/**
 * MPK Approver entity (application type)
 */
export interface MpkApprover {
  id: string
  mpkCenterId: string
  systemUserId: string
  name: string
  // Resolved from systemuser (runtime, populated by getApprovers)
  fullName: string
  email: string
  azureObjectId: string
}

/**
 * Dataverse system user (for approver assignment)
 */
export interface DataverseUser {
  systemUserId: string
  fullName: string
  email: string
  azureObjectId?: string
  isDisabled: boolean
}

/**
 * Zod schema for creating an MPK Center
 */
export const MpkCenterCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settingId: z.string().uuid(),
  isActive: z.boolean().default(true),
  approvalRequired: z.boolean().default(false),
  approvalSlaHours: z.number().int().min(1).max(720).optional(),
  approvalEffectiveFrom: z.string().date().optional().nullable(),
  budgetAmount: z.number().min(0).max(999999999.99).optional(),
  budgetPeriod: z.nativeEnum(BudgetPeriod).optional(),
  budgetStartDate: z.string().date().optional(),
}).refine(
  (data) => {
    if (data.budgetAmount && data.budgetAmount > 0) {
      return !!data.budgetPeriod && !!data.budgetStartDate
    }
    return true
  },
  { message: 'budgetPeriod and budgetStartDate are required when budgetAmount > 0' }
)

export type MpkCenterCreate = z.infer<typeof MpkCenterCreateSchema>

/**
 * Zod schema for updating an MPK Center
 */
export const MpkCenterUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
  approvalSlaHours: z.number().int().min(1).max(720).optional().nullable(),
  approvalEffectiveFrom: z.string().date().optional().nullable(),
  budgetAmount: z.number().min(0).max(999999999.99).optional().nullable(),
  budgetPeriod: z.nativeEnum(BudgetPeriod).optional().nullable(),
  budgetStartDate: z.string().date().optional().nullable(),
})

export type MpkCenterUpdate = z.infer<typeof MpkCenterUpdateSchema>

/**
 * Zod schema for setting approvers on an MPK Center
 */
export const SetApproversSchema = z.object({
  systemUserIds: z.array(z.string().uuid()).min(0),
})

export type SetApproversInput = z.infer<typeof SetApproversSchema>
