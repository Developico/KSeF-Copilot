/**
 * Approval SLA Check Timer Trigger
 *
 * Runs every hour to find PENDING invoices and cost documents that have exceeded
 * the SLA configured on their MPK center. Generates notification entries.
 *
 * Schedule: "0 0 * * * *" = every hour at minute 0
 */

import { app, InvocationContext, Timer } from '@azure/functions'
import { approvalService } from '../lib/dataverse/services'
import { settingService } from '../lib/dataverse/services'
import { notificationService } from '../lib/dataverse/services'
import { mpkCenterService } from '../lib/dataverse/services'
import { costDocumentService } from '../lib/dataverse/services/cost-document-service'

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

        // Track groupKeys that are still active this run — used for cleanup sweep
        const activeInvoiceGroupKeys: string[] = []

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

          // Upsert one SlaExceeded alert per (invoice × approver) — no duplicates per run
          for (const invoice of overdueInvoices) {
            try {
              const approvers = await mpkCenterService.getApprovers(invoice.mpkCenterId)
              for (const approver of approvers) {
                const groupKey = `sla:invoice:${invoice.invoiceId}:recipient:${approver.systemUserId}`
                activeInvoiceGroupKeys.push(groupKey)
                await notificationService.upsertRecurringNotification({
                  recipientId: approver.systemUserId,
                  settingId: setting.id,
                  type: 'SlaExceeded',
                  objectType: 'invoice',
                  groupKey,
                  message: `SLA exceeded: ${invoice.invoiceNumber} pending ${invoice.hoursOverdue}h (SLA: ${invoice.slaHours}h)`,
                  invoiceId: invoice.invoiceId,
                  mpkCenterId: invoice.mpkCenterId,
                  lastHoursOverdue: invoice.hoursOverdue,
                })
              }
            } catch (notifError) {
              context.warn(`[SLA] Notification failed for invoice ${invoice.invoiceId}:`, notifError)
            }
          }
        }

        // Deactivate alerts for invoices no longer overdue
        await notificationService.deactivateByGroupKeys(setting.id, 'SlaExceeded', activeInvoiceGroupKeys, 'invoice')
      } catch (settingError) {
        context.error(`[SLA] Failed for setting ${setting.id}:`, settingError)
      }
    }

    context.log(`Approval SLA check completed: ${totalOverdue} overdue invoices found`)
  } catch (error) {
    context.error('Approval SLA check failed:', error)
  }

  // ---------- Cost Document SLA Check ----------
  try {
    let totalOverdueCostDocs = 0

    const settings = await settingService.getAll(true)
    for (const setting of settings) {
      try {
        // List cost documents with Pending approval status
        const result = await costDocumentService.list({
          settingId: setting.id,
          approvalStatus: 'Pending',
        })

        // Cache MPK lookups
        const mpkCache = new Map<string, { name: string; slaHours?: number }>()

        // Track groupKeys still active this run
        const activeCostDocGroupKeys: string[] = []

        for (const doc of result.items) {
          if (!doc.mpkCenterId) continue

          if (!mpkCache.has(doc.mpkCenterId)) {
            const mpk = await mpkCenterService.getById(doc.mpkCenterId)
            if (mpk) {
              mpkCache.set(doc.mpkCenterId, { name: mpk.name, slaHours: mpk.approvalSlaHours })
            }
          }

          const mpkInfo = mpkCache.get(doc.mpkCenterId)
          if (!mpkInfo?.slaHours) continue

          const pendingSince = doc.modifiedOn || doc.createdOn
          if (!pendingSince) continue

          const hoursElapsed = (Date.now() - new Date(pendingSince).getTime()) / (1000 * 60 * 60)

          if (hoursElapsed > mpkInfo.slaHours) {
            totalOverdueCostDocs++
            try {
              const approvers = await mpkCenterService.getApprovers(doc.mpkCenterId)
              for (const approver of approvers) {
                const label = doc.documentNumber || doc.name || doc.id
                const hoursOverdue = Math.round((hoursElapsed - mpkInfo.slaHours) * 10) / 10
                const groupKey = `sla:cost-document:${doc.id}:recipient:${approver.systemUserId}`
                activeCostDocGroupKeys.push(groupKey)
                await notificationService.upsertRecurringNotification({
                  recipientId: approver.systemUserId,
                  settingId: setting.id,
                  type: 'SlaExceeded',
                  objectType: 'cost-document',
                  groupKey,
                  message: `SLA exceeded: cost document ${label} pending ${hoursOverdue}h (SLA: ${mpkInfo.slaHours}h)`,
                  costDocumentId: doc.id,
                  mpkCenterId: doc.mpkCenterId,
                  lastHoursOverdue: hoursOverdue,
                })
              }
            } catch (notifError) {
              context.warn(`[SLA] Notification failed for cost document ${doc.id}:`, notifError)
            }
          }
        }

        // Deactivate alerts for cost docs no longer overdue
        await notificationService.deactivateByGroupKeys(setting.id, 'SlaExceeded', activeCostDocGroupKeys, 'cost-document')
      } catch (settingError) {
        context.error(`[SLA] Cost doc check failed for setting ${setting.id}:`, settingError)
      }
    }

    context.log(`Cost document SLA check completed: ${totalOverdueCostDocs} overdue cost documents found`)
  } catch (error) {
    context.error('Cost document SLA check failed:', error)
  }
}

app.timer('approval-sla-check', {
  schedule: '0 0 * * * *', // Every hour
  handler: approvalSlaCheckHandler,
})
