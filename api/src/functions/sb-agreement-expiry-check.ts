/**
 * SB Agreement Expiry Check Timer Trigger
 *
 * Runs daily at 06:00 UTC to find self-billing agreements that have expired
 * (validTo < today) and terminates them automatically.
 *
 * Schedule: "0 0 6 * * *" = every day at 06:00 UTC
 */

import { app, InvocationContext, Timer } from '@azure/functions'
import { sbAgreementService } from '../lib/dataverse/services'
import { settingService } from '../lib/dataverse/services'
import { supplierService } from '../lib/dataverse/services'

async function sbAgreementExpiryCheckHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('SB Agreement expiry check timer triggered', {
    scheduledAt: myTimer.scheduleStatus?.last,
    isPastDue: myTimer.isPastDue,
  })

  try {
    const settings = await settingService.getAll(true)
    let totalExpired = 0
    let totalExpiringSoon = 0
    const suppliersToUpdate = new Set<string>()

    for (const setting of settings) {
      try {
        // 1. Terminate expired agreements
        const expired = await sbAgreementService.findExpired()

        if (expired.length > 0) {
          totalExpired += expired.length
          context.log(
            `[SB-Expiry] Setting ${setting.id}: ${expired.length} expired agreements`,
            {
              agreements: expired.map((a) => ({
                id: a.id,
                supplierId: a.supplierId,
                validTo: a.validTo,
              })),
            }
          )

          for (const agreement of expired) {
            try {
              await sbAgreementService.terminate(agreement.id)
              context.log(`[SB-Expiry] Terminated agreement ${agreement.id} for supplier ${agreement.supplierId}`)
              // Track suppliers whose agreements expired
              if (agreement.supplierId) {
                suppliersToUpdate.add(agreement.supplierId)
              }
            } catch (terminateError) {
              context.error(
                `[SB-Expiry] Failed to terminate agreement ${agreement.id}:`,
                terminateError
              )
            }
          }
        }

        // 2. Warn about agreements expiring within 30 days
        const expiringSoon = await sbAgreementService.findExpiringSoon(30)
        if (expiringSoon.length > 0) {
          totalExpiringSoon += expiringSoon.length
          context.warn(
            `[SB-Expiry] Setting ${setting.id}: ${expiringSoon.length} agreements expiring within 30 days`,
            {
              agreements: expiringSoon.map((a) => ({
                id: a.id,
                supplierId: a.supplierId,
                validTo: a.validTo,
              })),
            }
          )
        }
      } catch (settingError) {
        context.error(`[SB-Expiry] Failed for setting ${setting.id}:`, settingError)
      }
    }

    // 3. Update hasSelfBillingAgreement flag for suppliers whose last agreement expired
    for (const supplierId of suppliersToUpdate) {
      try {
        // Check if the supplier still has any active agreement (across all settings)
        let hasActive = false
        for (const setting of settings) {
          const active = await sbAgreementService.getActiveForSupplier(supplierId, setting.id)
          if (active) {
            hasActive = true
            break
          }
        }
        if (!hasActive) {
          await supplierService.update(supplierId, { hasSelfBillingAgreement: false })
          context.log(`[SB-Expiry] Cleared hasSelfBillingAgreement for supplier ${supplierId}`)
        }
      } catch (supplierError) {
        context.error(`[SB-Expiry] Failed to update supplier ${supplierId}:`, supplierError)
      }
    }

    context.log(
      `SB Agreement expiry check completed: ${totalExpired} terminated, ${totalExpiringSoon} expiring soon, ${suppliersToUpdate.size} suppliers updated`
    )
  } catch (error) {
    context.error('SB Agreement expiry check failed:', error)
  }
}

app.timer('sb-agreement-expiry-check', {
  schedule: '0 0 6 * * *', // Daily at 06:00 UTC
  handler: sbAgreementExpiryCheckHandler,
})
