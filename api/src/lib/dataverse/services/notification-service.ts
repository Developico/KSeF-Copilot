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
  NotificationObjectType,
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
    case NOTIFICATION_TYPE.COST_DOC_APPROVAL_REQUESTED: return 'CostDocApprovalRequested'
    case NOTIFICATION_TYPE.COST_DOC_APPROVAL_DECIDED: return 'CostDocApprovalDecided'
    case NOTIFICATION_TYPE.COST_DOC_BUDGET_WARNING: return 'CostDocBudgetWarning'
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
    case 'CostDocApprovalRequested': return NOTIFICATION_TYPE.COST_DOC_APPROVAL_REQUESTED
    case 'CostDocApprovalDecided': return NOTIFICATION_TYPE.COST_DOC_APPROVAL_DECIDED
    case 'CostDocBudgetWarning': return NOTIFICATION_TYPE.COST_DOC_BUDGET_WARNING
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
    costDocumentId: r[n.costDocumentLookup] as string | undefined,
    mpkCenterId: r[n.mpkCenterLookup] as string | undefined,
    createdOn: (r[n.createdOn] as string) || '',
    groupKey: r[n.groupKey] as string | undefined,
    objectType: r[n.objectType] as NotificationObjectType | undefined,
    isActive: r[n.isActive] as boolean | undefined,
    occurrenceCount: r[n.occurrenceCount] as number | undefined,
    firstTriggeredOn: r[n.firstTriggeredOn] as string | undefined,
    lastTriggeredOn: r[n.lastTriggeredOn] as string | undefined,
    lastHoursOverdue: r[n.lastHoursOverdue] as number | undefined,
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
    if (input.costDocumentId) {
      body[n.costDocumentBind] = `/dvlp_ksefcostdocuments(${input.costDocumentId})`
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
   * Find the single active recurring notification by groupKey.
   * Returns null when no matching active record exists.
   */
  async findActiveByGroupKey(
    recipientId: string,
    settingId: string,
    groupKey: string,
  ): Promise<Notification | null> {
    const n = DV.notification
    const conditions = [
      `${n.recipientLookup} eq ${escapeOData(recipientId)}`,
      `${n.settingLookup} eq ${escapeOData(settingId)}`,
      `${n.groupKey} eq ${escapeOData(groupKey)}`,
      `${n.isActive} eq true`,
    ]
    const query = `$filter=${conditions.join(' and ')}&$top=1`
    const records = await dataverseClient.listAll<DvNotification>(n.entitySet, query)
    return records.length > 0 ? mapDvToApp(records[0]) : null
  }

  /**
   * Create-or-update a recurring alert.
   * - If an active record with the same groupKey exists: increments occurrenceCount,
   *   updates lastTriggeredOn, lastHoursOverdue, and message.
   * - Otherwise: creates a new record with isActive=true, occurrenceCount=1.
   * The isRead flag is never reset so the user keeps control over read state.
   */
  async upsertRecurringNotification(
    input: CreateNotificationInput & { groupKey: string },
  ): Promise<Notification> {
    const n = DV.notification
    const now = new Date().toISOString()

    const existing = await this.findActiveByGroupKey(
      input.recipientId,
      input.settingId,
      input.groupKey,
    )

    if (existing) {
      const patch: Record<string, unknown> = {
        [n.occurrenceCount]: (existing.occurrenceCount ?? 0) + 1,
        [n.lastTriggeredOn]: now,
        [n.message]: input.message,
      }
      if (input.lastHoursOverdue !== undefined) {
        patch[n.lastHoursOverdue] = input.lastHoursOverdue
      }
      await dataverseClient.update(n.entitySet, existing.id, patch)

      logDataverseInfo('NotificationService.upsertRecurringNotification', 'Updated existing alert', {
        id: existing.id,
        groupKey: input.groupKey,
        occurrenceCount: patch[n.occurrenceCount],
      })

      return { ...existing, ...patch, lastTriggeredOn: now }
    }

    // New alert — create with full dedup metadata
    const typeDv = mapNotificationTypeToDv(input.type)
    const name = `${input.type}: ${input.message.substring(0, 80)}`

    const body: Record<string, unknown> = {
      [n.name]: name,
      [n.type]: typeDv,
      [n.message]: input.message,
      [n.isRead]: false,
      [n.isDismissed]: false,
      [n.groupKey]: input.groupKey,
      [n.isActive]: true,
      [n.occurrenceCount]: 1,
      [n.firstTriggeredOn]: now,
      [n.lastTriggeredOn]: now,
      [n.recipientBind]: `/systemusers(${input.recipientId})`,
      [n.settingBind]: `/dvlp_ksefsettings(${input.settingId})`,
    }
    if (input.objectType) {
      body[n.objectType] = input.objectType
    }
    if (input.lastHoursOverdue !== undefined) {
      body[n.lastHoursOverdue] = input.lastHoursOverdue
    }
    if (input.invoiceId) {
      body[n.invoiceBind] = `/dvlp_ksefinvoices(${input.invoiceId})`
    }
    if (input.costDocumentId) {
      body[n.costDocumentBind] = `/dvlp_ksefcostdocuments(${input.costDocumentId})`
    }
    if (input.mpkCenterId) {
      body[n.mpkCenterBind] = `/dvlp_ksefmpkcenters(${input.mpkCenterId})`
    }

    const record = await dataverseClient.create<DvNotification>(n.entitySet, body)

    logDataverseInfo('NotificationService.upsertRecurringNotification', 'Created new alert', {
      groupKey: input.groupKey,
      type: input.type,
      recipientId: input.recipientId,
    })

    return mapDvToApp(record)
  }

  /**
   * Deactivate recurring alerts for a setting+type whose groupKeys are no
   * longer in the provided active set. Called at the end of each timer run
   * to close alerts for objects that are no longer overdue.
   * Pass objectType to scope deactivation to only invoice or cost-document records.
   */
  async deactivateByGroupKeys(
    settingId: string,
    type: NotificationType,
    activeGroupKeys: string[],
    objectType?: NotificationObjectType,
  ): Promise<number> {
    const n = DV.notification
    const typeDv = mapNotificationTypeToDv(type)
    const activeSet = new Set(activeGroupKeys)

    // Fetch all active records of this type (and optionally objectType) for the setting
    const conditions = [
      `${n.settingLookup} eq ${escapeOData(settingId)}`,
      `${n.type} eq ${typeDv}`,
      `${n.isActive} eq true`,
      `${n.isDismissed} eq false`,
    ]
    if (objectType) {
      conditions.push(`${n.objectType} eq ${escapeOData(objectType)}`)
    }
    const query = `$filter=${conditions.join(' and ')}&$select=${n.id},${n.groupKey}`
    const records = await dataverseClient.listAll<DvNotification>(n.entitySet, query)

    const toDeactivate = records.filter(r => {
      const raw = r as unknown as Record<string, unknown>
      const key = raw[n.groupKey] as string | undefined
      return key && !activeSet.has(key)
    })

    let deactivated = 0
    for (const record of toDeactivate) {
      try {
        const raw = record as unknown as Record<string, unknown>
        const id = raw[n.id] as string
        await dataverseClient.update(n.entitySet, id, { [n.isActive]: false })
        deactivated++
      } catch (error) {
        logDataverseError('NotificationService.deactivateByGroupKeys', error)
      }
    }

    if (deactivated > 0) {
      logDataverseInfo('NotificationService.deactivateByGroupKeys', `Deactivated ${deactivated} resolved alerts`, {
        settingId,
        type,
      })
    }

    return deactivated
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
