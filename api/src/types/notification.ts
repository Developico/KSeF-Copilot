/**
 * Notification types (app-level)
 */

export type NotificationType =
  | 'ApprovalRequested'
  | 'SlaExceeded'
  | 'BudgetWarning80'
  | 'BudgetExceeded'
  | 'ApprovalDecided'
  | 'SbApprovalRequested'
  | 'SbApprovalDecided'
  | 'CostDocApprovalRequested'
  | 'CostDocApprovalDecided'
  | 'CostDocBudgetWarning'

export type NotificationObjectType = 'invoice' | 'cost-document'

export interface Notification {
  id: string
  name: string
  recipientId: string
  settingId: string
  type: NotificationType
  message: string
  isRead: boolean
  isDismissed: boolean
  invoiceId?: string
  costDocumentId?: string
  mpkCenterId?: string
  createdOn: string
  // Deduplication fields
  groupKey?: string
  objectType?: NotificationObjectType
  isActive?: boolean
  occurrenceCount?: number
  firstTriggeredOn?: string
  lastTriggeredOn?: string
  lastHoursOverdue?: number
}

export interface CreateNotificationInput {
  recipientId: string
  settingId: string
  type: NotificationType
  message: string
  invoiceId?: string
  costDocumentId?: string
  mpkCenterId?: string
  // Deduplication fields — present only for recurring timer-generated alerts
  groupKey?: string
  objectType?: NotificationObjectType
  lastHoursOverdue?: number
}
