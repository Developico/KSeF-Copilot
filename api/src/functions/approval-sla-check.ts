/**
 * Approval SLA Check Timer Trigger
 *
 * Runs every hour to find PENDING invoices that have exceeded the SLA
 * configured on their MPK center. Generates notification entries
 * (notification service will be implemented in Phase 5).
 *
 * Schedule: "0 0 * * * *" = every hour at minute 0
 */

import { app, InvocationContext, Timer } from '@azure/functions'
import { approvalService } from '../lib/dataverse/services'
import { settingService } from '../lib/dataverse/services'
import { notificationService } from '../lib/dataverse/services'
import { mpkCenterService } from '../lib/dataverse/services'

async function approvalSlaCheckHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Approval SLA check timer triggered', {
    scheduledAt: myTimer.scheduleStatus?.last,
    isPastDue: myTimer.isPastDue,
  })

  try {
    // Get all active settings (one per company/NIP)
    const settings = await settingService.getAll(true)

    let totalOverdue = 0

    for (const setting of settings) {
      try {
        const overdueInvoices = await approvalService.checkSla(setting.id)

        if (overdueInvoices.length > 0) {
          totalOverdue += overdueInvoices.length
          context.log(`[SLA] Setting ${setting.id}: ${overdueInvoices.length} overdue invoices`, {
            invoices: overdueInvoices.map((i) => ({
              id: i.invoiceId,
              number: i.invoiceNumber,
              mpk: i.mpkCenterName,
              hoursOverdue: i.hoursOverdue,
            })),
          })

          // 7.4: Create SLA_EXCEEDED notifications for approvers
          for (const invoice of overdueInvoices) {
            try {
              const approvers = await mpkCenterService.getApprovers(invoice.mpkCenterId)
              const recipientIds = approvers.map((a) => a.systemUserId)
              if (recipientIds.length > 0) {
                await notificationService.createForRecipients(recipientIds, {
                  settingId: setting.id,
                  type: 'SlaExceeded',
                  message: `SLA exceeded: ${invoice.invoiceNumber} pending ${invoice.hoursOverdue}h (SLA: ${invoice.slaHours}h)`,
                  invoiceId: invoice.invoiceId,
                  mpkCenterId: invoice.mpkCenterId,
                })
              }
            } catch (notifError) {
              context.warn(`[SLA] Notification failed for invoice ${invoice.invoiceId}:`, notifError)
            }
          }
        }
      } catch (settingError) {
        context.error(`[SLA] Failed for setting ${setting.id}:`, settingError)
      }
    }

    context.log(`Approval SLA check completed: ${totalOverdue} overdue invoices found`)
  } catch (error) {
    context.error('Approval SLA check failed:', error)
  }
}

app.timer('approval-sla-check', {
  schedule: '0 0 * * * *', // Every hour
  handler: approvalSlaCheckHandler,
})
