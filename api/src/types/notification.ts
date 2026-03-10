/**
 * Notification types (app-level)
 */

export type NotificationType =
  | 'ApprovalRequested'
  | 'SlaExceeded'
  | 'BudgetWarning80'
  | 'BudgetExceeded'
  | 'ApprovalDecided'

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
  mpkCenterId?: string
  createdOn: string
}

export interface CreateNotificationInput {
  recipientId: string
  settingId: string
  type: NotificationType
  message: string
  invoiceId?: string
  mpkCenterId?: string
}
