/**
 * Notification Service
 *
 * CRUD operations for in-app notifications stored in Dataverse.
 * Notifications are created by trigger points in the approval and budget flows.
 *
 * Notification types (NOTIFICATION_TYPE):
 *  0 — APPROVAL_REQUESTED: invoice set to Pending, sent to approvers
 *  1 — SLA_EXCEEDED: pending invoice past SLA hours
 *  2 — BUDGET_WARNING_80: budget utilization >= 80%
 *  3 — BUDGET_EXCEEDED: budget utilization >= 100%
 *  4 — APPROVAL_DECIDED: invoice approved/rejected/cancelled, sent to invoice creator
 */

import { dataverseClient } from '../client'
import { DV, NOTIFICATION_TYPE } from '../config'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvNotification } from '../../../types/dataverse'
import type {
  Notification,
  NotificationType,
  CreateNotificationInput,
} from '../../../types/notification'

// ============================================================================
// Mappers (local — notification is simple enough)
// ============================================================================

function mapNotificationTypeToApp(value: number | undefined): NotificationType {
  switch (value) {
    case NOTIFICATION_TYPE.APPROVAL_REQUESTED: return 'ApprovalRequested'
    case NOTIFICATION_TYPE.SLA_EXCEEDED: return 'SlaExceeded'
    case NOTIFICATION_TYPE.BUDGET_WARNING_80: return 'BudgetWarning80'
    case NOTIFICATION_TYPE.BUDGET_EXCEEDED: return 'BudgetExceeded'
    case NOTIFICATION_TYPE.APPROVAL_DECIDED: return 'ApprovalDecided'
    case NOTIFICATION_TYPE.SB_APPROVAL_REQUESTED: return 'SbApprovalRequested'
    case NOTIFICATION_TYPE.SB_APPROVAL_DECIDED: return 'SbApprovalDecided'
    default: return 'ApprovalRequested'
  }
}

function mapNotificationTypeToDv(type: NotificationType): number {
  switch (type) {
    case 'ApprovalRequested': return NOTIFICATION_TYPE.APPROVAL_REQUESTED
    case 'SlaExceeded': return NOTIFICATION_TYPE.SLA_EXCEEDED
    case 'BudgetWarning80': return NOTIFICATION_TYPE.BUDGET_WARNING_80
    case 'BudgetExceeded': return NOTIFICATION_TYPE.BUDGET_EXCEEDED
    case 'ApprovalDecided': return NOTIFICATION_TYPE.APPROVAL_DECIDED
    case 'SbApprovalRequested': return NOTIFICATION_TYPE.SB_APPROVAL_REQUESTED
    case 'SbApprovalDecided': return NOTIFICATION_TYPE.SB_APPROVAL_DECIDED
  }
}

function mapDvToApp(record: DvNotification): Notification {
  const n = DV.notification
  const r = record as unknown as Record<string, unknown>
  return {
    id: r[n.id] as string,
    name: (r[n.name] as string) || '',
    recipientId: r[n.recipientLookup] as string,
    settingId: r[n.settingLookup] as string,
    type: mapNotificationTypeToApp(r[n.type] as number | undefined),
    message: (r[n.message] as string) || '',
    isRead: (r[n.isRead] as boolean) || false,
    isDismissed: (r[n.isDismissed] as boolean) || false,
    invoiceId: r[n.invoiceLookup] as string | undefined,
    mpkCenterId: r[n.mpkCenterLookup] as string | undefined,
    createdOn: (r[n.createdOn] as string) || '',
  }
}

// ============================================================================
// Service
// ============================================================================

export class NotificationService {
  /**
   * List notifications for a recipient. Excludes dismissed.
   * Ordered by newest first.
   */
  async list(
    recipientOid: string,
    settingId: string,
    options?: { unreadOnly?: boolean; top?: number }
  ): Promise<{ items: Notification[]; count: number }> {
    const n = DV.notification
    const conditions = [
      `${n.recipientLookup} eq ${escapeOData(recipientOid)}`,
      `${n.settingLookup} eq ${escapeOData(settingId)}`,
      `${n.isDismissed} eq false`,
    ]
    if (options?.unreadOnly) {
      conditions.push(`${n.isRead} eq false`)
    }

    const top = options?.top ?? 50
    const query = `$filter=${conditions.join(' and ')}&$orderby=${n.createdOn} desc&$top=${top}`

    const records = await dataverseClient.listAll<DvNotification>(n.entitySet, query)
    const items = records.map(mapDvToApp)

    return { items, count: items.length }
  }

  /**
   * Mark a notification as read.
   */
  async markRead(notificationId: string): Promise<void> {
    const n = DV.notification
    await dataverseClient.update(n.entitySet, notificationId, {
      [n.isRead]: true,
    })
  }

  /**
   * Dismiss a notification (soft delete).
   */
  async dismiss(notificationId: string): Promise<void> {
    const n = DV.notification
    await dataverseClient.update(n.entitySet, notificationId, {
      [n.isDismissed]: true,
    })
  }

  /**
   * Create a notification in Dataverse.
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    const n = DV.notification
    const typeDv = mapNotificationTypeToDv(input.type)
    const name = `${input.type}: ${input.message.substring(0, 80)}`

    const body: Record<string, unknown> = {
      [n.name]: name,
      [n.type]: typeDv,
      [n.message]: input.message,
      [n.isRead]: false,
      [n.isDismissed]: false,
      [n.recipientBind]: `/systemusers(${input.recipientId})`,
      [n.settingBind]: `/dvlp_ksefsettings(${input.settingId})`,
    }

    if (input.invoiceId) {
      body[n.invoiceBind] = `/dvlp_ksefinvoices(${input.invoiceId})`
    }
    if (input.mpkCenterId) {
      body[n.mpkCenterBind] = `/dvlp_ksefmpkcenters(${input.mpkCenterId})`
    }

    const record = await dataverseClient.create<DvNotification>(n.entitySet, body)

    logDataverseInfo('NotificationService.create', 'Notification created', {
      type: input.type,
      recipientId: input.recipientId,
    })

    return mapDvToApp(record)
  }

  /**
   * Create notifications for multiple recipients (bulk).
   * Used when notifying all approvers of an MPK center.
   */
  async createForRecipients(
    recipientIds: string[],
    input: Omit<CreateNotificationInput, 'recipientId'>
  ): Promise<number> {
    let created = 0
    for (const recipientId of recipientIds) {
      try {
        await this.create({ ...input, recipientId })
        created++
      } catch (error) {
        logDataverseError('NotificationService.createForRecipients', error)
      }
    }
    return created
  }

  /**
   * Get unread count for a recipient.
   */
  async getUnreadCount(recipientOid: string, settingId: string): Promise<number> {
    const n = DV.notification
    const conditions = [
      `${n.recipientLookup} eq ${escapeOData(recipientOid)}`,
      `${n.settingLookup} eq ${escapeOData(settingId)}`,
      `${n.isDismissed} eq false`,
      `${n.isRead} eq false`,
    ]
    const query = `$filter=${conditions.join(' and ')}&$select=${n.id}`

    const records = await dataverseClient.listAll<DvNotification>(n.entitySet, query)
    return records.length
  }

  /**
   * Mark all unread notifications as read for a recipient.
   */
  async markAllRead(recipientOid: string, settingId: string): Promise<number> {
    const n = DV.notification
    const conditions = [
      `${n.recipientLookup} eq ${escapeOData(recipientOid)}`,
      `${n.settingLookup} eq ${escapeOData(settingId)}`,
      `${n.isDismissed} eq false`,
      `${n.isRead} eq false`,
    ]
    const query = `$filter=${conditions.join(' and ')}&$select=${n.id}`
    const records = await dataverseClient.listAll<DvNotification>(n.entitySet, query)

    let marked = 0
    for (const record of records) {
      try {
        const id = (record as unknown as Record<string, unknown>)[n.id] as string
        await dataverseClient.update(n.entitySet, id, { [n.isRead]: true })
        marked++
      } catch (error) {
        logDataverseError('NotificationService.markAllRead', error)
      }
    }

    logDataverseInfo('NotificationService.markAllRead', `Marked ${marked}/${records.length} as read`, {
      recipientOid,
      settingId,
    })

    return marked
  }
}

export const notificationService = new NotificationService()
