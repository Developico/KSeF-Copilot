/**
 * Approval Service
 *
 * Handles the invoice approval workflow:
 * - Auto-trigger: set PENDING when MPK with approvalRequired is saved on an invoice
 * - Approve / Reject / Cancel actions
 * - Bulk approve
 * - Pending list for current user
 * - Refresh approvers on an invoice
 * - Auto-approve corrective invoices (KOR)
 *
 * Design decisions implemented:
 *  D1 — any-of approval (one approval sufficient)
 *  D2 — fallback to Admin when no approvers on MPK
 *  D3 — no re-approval on MPK change after approval
 *  D4 — auto-approve corrective invoices (KOR)
 *  D15 — auto-trigger PENDING on MPK save
 *  D16 — Admin can cancel PENDING → CANCELLED
 *  D17 — bulk approve endpoint
 *  D20 — refresh approvers
 */

import { dataverseClient } from '../client'
import { DV, APPROVAL_STATUS, INVOICE_TYPE } from '../config'
import { mapDvApprovalStatusToApp, mapDvCurrencyToApp } from '../mappers'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvInvoice } from '../../../types/dataverse'
import type { ApprovalStatus } from '../../../types/mpk'
import type { AuthUser } from '../../../types/api'
import { mpkCenterService } from './mpk-center-service'
import { budgetService } from './budget-service'
import { notificationService } from './notification-service'
import { createNote } from '../notes'

// ============================================================================
// Types
// ============================================================================

export interface ApprovalActionResult {
  invoiceId: string
  approvalStatus: ApprovalStatus
  approvedBy?: string
  approvedAt?: string
  approvalComment?: string
  budgetWarning?: {
    isWarning: boolean
    isExceeded: boolean
    utilized: number
    budgetAmount: number
    utilizationPercent: number
  }
}

export interface BulkApproveResult {
  approved: number
  failed: number
  errors: Array<{ invoiceId: string; error: string }>
}

export interface PendingInvoice {
  id: string
  invoiceNumber: string
  supplierName: string
  invoiceDate: string
  grossAmount: number
  grossAmountPln?: number
  currency: string
  mpkCenterId?: string
  mpkCenterName?: string
  approvalStatus: ApprovalStatus
  pendingSince: string
  approvalSlaHours?: number
}

// ============================================================================
// Approval Service
// ============================================================================

export class ApprovalService {
  /**
   * Check if a user is an authorized approver for the invoice's MPK.
   * Returns true if:
   *  - user is in the MPK's approvers list (by Entra OID), OR
   *  - user has Admin role (D2 fallback)
   */
  async isAuthorizedApprover(
    user: AuthUser,
    mpkCenterId: string
  ): Promise<boolean> {
    if (user.roles.includes('Admin')) return true

    const approvers = await mpkCenterService.getApprovers(mpkCenterId)
    const dvUser = await mpkCenterService.resolveSystemUserByOid(user.id)
    if (!dvUser) return false

    return approvers.some((a) => a.systemUserId === dvUser.systemUserId)
  }

  /**
   * Auto-trigger approval: called after MPK is saved on an invoice.
   * If MPK requires approval and invoice is not corrective → set PENDING.
   * Corrective invoices (KOR) → auto-APPROVED (D4).
   * If MPK does not require approval → leave as DRAFT (D6).
   * If invoice already APPROVED → no re-approval (D3).
   */
  async autoTrigger(invoiceId: string): Promise<ApprovalActionResult | null> {
    logDataverseInfo('ApprovalService.autoTrigger', 'Checking approval trigger', { invoiceId })

    const inv = DV.invoice

    // Fetch invoice with MPK lookup, invoice type and setting
    const select = [
      inv.id, inv.name,
      inv.mpkCenterLookup, inv.approvalStatus, inv.invoiceType,
      inv.settingLookup,
    ].join(',')

    const record = await dataverseClient.getById<DvInvoice>(
      inv.entitySet,
      invoiceId,
      `$select=${select}`
    )
    if (!record) return null

    const r = record as unknown as Record<string, unknown>
    const mpkCenterId = r[inv.mpkCenterLookup] as string | null
    if (!mpkCenterId) return null // no MPK → no approval workflow

    const currentStatus = r[inv.approvalStatus] as number | undefined

    // D3: already approved → skip
    if (currentStatus === APPROVAL_STATUS.APPROVED) return null

    // Fetch MPK to check approvalRequired flag
    const mpk = await mpkCenterService.getById(mpkCenterId)
    if (!mpk) return null

    // D6: approval not required → set DRAFT
    if (!mpk.approvalRequired) {
      if (currentStatus !== APPROVAL_STATUS.DRAFT) {
        await this.setApprovalStatus(invoiceId, APPROVAL_STATUS.DRAFT)
      }
      return {
        invoiceId,
        approvalStatus: 'Draft',
      }
    }

    // D4: corrective invoice → auto-approve
    const invoiceType = r[inv.invoiceType] as number | undefined
    if (invoiceType === INVOICE_TYPE.CORRECTIVE) {
      await this.setApprovalStatus(invoiceId, APPROVAL_STATUS.APPROVED, {
        approvedBy: 'System (auto-approved KOR)',
        approvedByOid: '',
        approvedAt: new Date().toISOString(),
        approvalComment: 'Auto-approved: corrective invoice',
      })
      return {
        invoiceId,
        approvalStatus: 'Approved',
        approvedBy: 'System (auto-approved KOR)',
        approvedAt: new Date().toISOString(),
        approvalComment: 'Auto-approved: corrective invoice',
      }
    }

    // D15: set PENDING
    await this.setApprovalStatus(invoiceId, APPROVAL_STATUS.PENDING)

    // 7.4: Notify approvers that approval is requested
    this.fireApprovalRequestedNotifications(
      invoiceId,
      mpkCenterId,
      r[inv.settingLookup] as string | undefined,
      r[inv.name] as string | undefined,
    )

    return {
      invoiceId,
      approvalStatus: 'Pending',
    }
  }

  /**
   * Approve an invoice. Checks authorization (D1 any-of, D2 Admin fallback).
   */
  async approve(
    invoiceId: string,
    user: AuthUser,
    comment?: string
  ): Promise<ApprovalActionResult> {
    const invoice = await this.getInvoiceForApproval(invoiceId)

    if (invoice.approvalStatus !== APPROVAL_STATUS.PENDING) {
      throw new Error(`Invoice is not in Pending status (current: ${mapDvApprovalStatusToApp(invoice.approvalStatus)})`)
    }

    const mpkCenterId = invoice.mpkCenterId
    if (!mpkCenterId) {
      throw new Error('Invoice has no MPK center assigned')
    }

    const authorized = await this.isAuthorizedApprover(user, mpkCenterId)
    if (!authorized) {
      throw new Error('User is not an authorized approver for this MPK center')
    }

    const now = new Date().toISOString()
    await this.setApprovalStatus(invoiceId, APPROVAL_STATUS.APPROVED, {
      approvedBy: user.name,
      approvedByOid: user.id,
      approvedAt: now,
      approvalComment: comment || null,
    })

    // D7: Check budget after approval (soft warning)
    let budgetWarning: ApprovalActionResult['budgetWarning']
    try {
      const budgetStatus = await budgetService.getBudgetStatus(mpkCenterId)
      if (budgetStatus && (budgetStatus.isWarning || budgetStatus.isExceeded)) {
        budgetWarning = {
          isWarning: budgetStatus.isWarning,
          isExceeded: budgetStatus.isExceeded,
          utilized: budgetStatus.utilized,
          budgetAmount: budgetStatus.budgetAmount,
          utilizationPercent: budgetStatus.utilizationPercent,
        }
      }
    } catch {
      // Non-blocking: budget check is best-effort
    }

    // 7.4: Notify about budget warnings
    if (budgetWarning) {
      this.fireBudgetNotifications(invoiceId, mpkCenterId, budgetWarning)
    }

    // Add approval note to invoice
    this.fireApprovalNote(invoiceId, 'Approved', user.name, now, comment)

    return {
      invoiceId,
      approvalStatus: 'Approved',
      approvedBy: user.name,
      approvedAt: now,
      approvalComment: comment,
      budgetWarning,
    }
  }

  /**
   * Reject an invoice. Comment is required.
   */
  async reject(
    invoiceId: string,
    user: AuthUser,
    comment: string
  ): Promise<ApprovalActionResult> {
    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment is required when rejecting an invoice')
    }

    const invoice = await this.getInvoiceForApproval(invoiceId)

    if (invoice.approvalStatus !== APPROVAL_STATUS.PENDING) {
      throw new Error(`Invoice is not in Pending status (current: ${mapDvApprovalStatusToApp(invoice.approvalStatus)})`)
    }

    const mpkCenterId = invoice.mpkCenterId
    if (!mpkCenterId) {
      throw new Error('Invoice has no MPK center assigned')
    }

    const authorized = await this.isAuthorizedApprover(user, mpkCenterId)
    if (!authorized) {
      throw new Error('User is not an authorized approver for this MPK center')
    }

    const now = new Date().toISOString()
    await this.setApprovalStatus(invoiceId, APPROVAL_STATUS.REJECTED, {
      approvedBy: user.name,
      approvedByOid: user.id,
      approvedAt: now,
      approvalComment: comment,
    })

    // Add rejection note to invoice
    this.fireApprovalNote(invoiceId, 'Rejected', user.name, now, comment)

    return {
      invoiceId,
      approvalStatus: 'Rejected',
      approvedBy: user.name,
      approvedAt: now,
      approvalComment: comment,
    }
  }

  // ========== Notification fire-and-forget helpers (7.4) ==========

  private fireApprovalRequestedNotifications(
    invoiceId: string,
    mpkCenterId: string,
    settingId: string | undefined,
    invoiceName: string | undefined,
  ): void {
    if (!settingId) return
    // Non-blocking: fire and forget
    void (async () => {
      try {
        const approvers = await mpkCenterService.getApprovers(mpkCenterId)
        const recipientIds = approvers.map((a) => a.systemUserId)
        if (recipientIds.length === 0) return
        const label = invoiceName || invoiceId
        await notificationService.createForRecipients(recipientIds, {
          settingId,
          type: 'ApprovalRequested',
          message: `Faktura ${label} wymaga akceptacji`,
          invoiceId,
          mpkCenterId,
        })
      } catch {
        // best-effort
      }
    })()
  }

  private fireBudgetNotifications(
    invoiceId: string,
    mpkCenterId: string,
    warning: NonNullable<ApprovalActionResult['budgetWarning']>
  ): void {
    // Non-blocking: fire and forget
    void (async () => {
      try {
        const mpk = await mpkCenterService.getById(mpkCenterId)
        if (!mpk) return
        const settingId = mpk.settingId
        if (!settingId) return
        const approvers = await mpkCenterService.getApprovers(mpkCenterId)
        const recipientIds = approvers.map((a) => a.systemUserId)
        if (recipientIds.length === 0) return

        const type = warning.isExceeded ? 'BudgetExceeded' as const : 'BudgetWarning80' as const
        const pct = warning.utilizationPercent
        await notificationService.createForRecipients(recipientIds, {
          settingId,
          type,
          message: `Budget ${warning.isExceeded ? 'exceeded' : 'warning'}: ${pct}% utilized (${warning.utilized}/${warning.budgetAmount} PLN)`,
          invoiceId,
          mpkCenterId,
        })
      } catch {
        // best-effort
      }
    })()
  }

  private fireApprovalNote(
    invoiceId: string,
    status: 'Approved' | 'Rejected',
    userName: string,
    dateIso: string,
    comment?: string
  ): void {
    void (async () => {
      try {
        const label = status === 'Approved' ? 'Zaakceptowano' : 'Odrzucono'
        const date = new Date(dateIso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
        const lines = [`${label} przez ${userName} (${date})`]
        if (comment) lines.push(comment)
        await createNote({
          invoiceId,
          subject: `${label} fakturę`,
          noteText: lines.join('\n'),
        })
      } catch {
        // best-effort
      }
    })()
  }

  /**
   * Cancel approval (Admin only — D16).
   * Allows Pending → Cancelled, or Approved/Rejected → Pending (undo decision).
   */
  async cancel(
    invoiceId: string,
    user: AuthUser,
    comment?: string
  ): Promise<ApprovalActionResult> {
    if (!user.roles.includes('Admin')) {
      throw new Error('Only Admin can cancel approvals')
    }

    const invoice = await this.getInvoiceForApproval(invoiceId)
    const currentStatus = mapDvApprovalStatusToApp(invoice.approvalStatus)

    const allowedStatuses: ApprovalStatus[] = ['Pending', 'Approved', 'Rejected']
    if (!allowedStatuses.includes(currentStatus)) {
      throw new Error(`Cannot cancel invoice with status ${currentStatus}`)
    }

    // Approved/Rejected → revert to Pending (undo decision)
    const isUndo = currentStatus === 'Approved' || currentStatus === 'Rejected'
    const targetStatus = isUndo ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CANCELLED

    const now = new Date().toISOString()
    await this.setApprovalStatus(invoiceId, targetStatus, {
      approvedBy: isUndo ? null : user.name,
      approvedByOid: isUndo ? null : user.id,
      approvedAt: isUndo ? null : now,
      approvalComment: isUndo ? null : (comment || null),
    })

    const resultStatus: ApprovalStatus = isUndo ? 'Pending' : 'Cancelled'

    return {
      invoiceId,
      approvalStatus: resultStatus,
      approvedBy: user.name,
      approvedAt: now,
      approvalComment: comment,
    }
  }

  /**
   * Bulk approve invoices (D17).
   * Processes each invoice independently — partial success is possible.
   */
  async bulkApprove(
    invoiceIds: string[],
    user: AuthUser,
    comment?: string
  ): Promise<BulkApproveResult> {
    logDataverseInfo('ApprovalService.bulkApprove', 'Bulk approving', { count: invoiceIds.length })

    let approved = 0
    let failed = 0
    const errors: Array<{ invoiceId: string; error: string }> = []

    for (const invoiceId of invoiceIds) {
      try {
        await this.approve(invoiceId, user, comment)
        approved++
      } catch (error) {
        failed++
        errors.push({
          invoiceId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { approved, failed, errors }
  }

  /**
   * List pending invoices for the current user.
   * - If Admin: all pending invoices for the setting
   * - If approver: only invoices where user is approver of the MPK
   */
  async listPending(
    user: AuthUser,
    settingId: string
  ): Promise<PendingInvoice[]> {
    logDataverseInfo('ApprovalService.listPending', 'Listing pending invoices', { userId: user.id })

    const inv = DV.invoice

    // Build filter for PENDING invoices in this setting
    const conditions = [
      `${inv.approvalStatus} eq ${APPROVAL_STATUS.PENDING}`,
      `${inv.settingLookup} eq ${escapeOData(settingId)}`,
    ]
    const filter = `$filter=${conditions.join(' and ')}`

    const select = [
      inv.id, inv.name, inv.invoiceDate,
      inv.grossAmount, inv.grossAmountPln, inv.currency,
      inv.mpkCenterLookup, inv.approvalStatus,
      inv.modifiedOn, // pendingSince approximation
      'dvlp_sellername', // seller name
    ].join(',')

    const orderBy = `$orderby=${inv.modifiedOn} asc` // oldest first (FIFO)
    const query = `${filter}&$select=${select}&${orderBy}`

    const records = await dataverseClient.listAll<DvInvoice>(inv.entitySet, query)

    // Resolve MPK names and SLA in bulk
    const mpkIds = [...new Set(records.map((r) => (r as unknown as Record<string, unknown>)[inv.mpkCenterLookup] as string).filter(Boolean))]
    const mpkMap = new Map<string, { name: string; slaHours?: number }>()

    for (const id of mpkIds) {
      const mpk = await mpkCenterService.getById(id)
      if (mpk) {
        mpkMap.set(id, { name: mpk.name, slaHours: mpk.approvalSlaHours })
      }
    }

    // If not Admin, filter to only invoices where user is approver
    let filteredRecords = records
    if (!user.roles.includes('Admin')) {
      const dvUser = await mpkCenterService.resolveSystemUserByOid(user.id)
      if (!dvUser) return []

      // Get all MPKs where user is an approver
      const approverMpkIds = new Set<string>()
      for (const id of mpkIds) {
        const approvers = await mpkCenterService.getApprovers(id)
        if (approvers.some((a) => a.systemUserId === dvUser.systemUserId)) {
          approverMpkIds.add(id)
        }
      }

      filteredRecords = records.filter((r) => {
        const mid = (r as unknown as Record<string, unknown>)[inv.mpkCenterLookup] as string
        return mid && approverMpkIds.has(mid)
      })
    }

    return filteredRecords.map((record) => {
      const r = record as unknown as Record<string, unknown>
      const mpkCenterId = r[inv.mpkCenterLookup] as string | undefined
      const mpkInfo = mpkCenterId ? mpkMap.get(mpkCenterId) : undefined

      return {
        id: r[inv.id] as string,
        invoiceNumber: r[inv.name] as string,
        supplierName: r['dvlp_sellername'] as string || '',
        invoiceDate: r[inv.invoiceDate] as string || '',
        grossAmount: r[inv.grossAmount] as number || 0,
        grossAmountPln: r[inv.grossAmountPln] as number | undefined,
        currency: mapDvCurrencyToApp(r[inv.currency] as number | undefined),
        mpkCenterId: mpkCenterId,
        mpkCenterName: mpkInfo?.name,
        approvalStatus: mapDvApprovalStatusToApp(r[inv.approvalStatus] as number | undefined),
        pendingSince: r[inv.modifiedOn] as string || '',
        approvalSlaHours: mpkInfo?.slaHours,
      }
    })
  }

  /**
   * Refresh approvers for an invoice (D20).
   * Retrieves the current list of approvers for the invoice's MPK center.
   * Used when MPK approvers have been changed after the invoice was assigned.
   */
  async refreshApprovers(
    invoiceId: string,
    user: AuthUser
  ): Promise<{ mpkCenterId: string; approverCount: number }> {
    const invoice = await this.getInvoiceForApproval(invoiceId)

    const mpkCenterId = invoice.mpkCenterId
    if (!mpkCenterId) {
      throw new Error('Invoice has no MPK center assigned')
    }

    // Check authorization
    const authorized = await this.isAuthorizedApprover(user, mpkCenterId)
    if (!authorized) {
      throw new Error('User is not authorized for this MPK center')
    }

    // Return the current approvers count — the actual approver list is on the MPK center
    const approvers = await mpkCenterService.getApprovers(mpkCenterId)

    logDataverseInfo('ApprovalService.refreshApprovers', 'Refreshed approvers', {
      invoiceId,
      mpkCenterId,
      approverCount: approvers.length,
    })

    return {
      mpkCenterId,
      approverCount: approvers.length,
    }
  }

  /**
   * Check SLA for pending invoices.
   * Returns invoices that have exceeded the SLA for their MPK center.
   * Used by the timer trigger.
   */
  async checkSla(settingId: string): Promise<Array<{
    invoiceId: string
    invoiceNumber: string
    mpkCenterId: string
    mpkCenterName: string
    pendingSince: string
    slaHours: number
    hoursOverdue: number
  }>> {
    const inv = DV.invoice

    const filter = `$filter=${inv.approvalStatus} eq ${APPROVAL_STATUS.PENDING} and ${inv.settingLookup} eq ${escapeOData(settingId)}`
    const select = `$select=${inv.id},${inv.name},${inv.mpkCenterLookup},${inv.modifiedOn}`
    const query = `${filter}&${select}`

    const records = await dataverseClient.listAll<DvInvoice>(inv.entitySet, query)

    const overdueInvoices: Array<{
      invoiceId: string
      invoiceNumber: string
      mpkCenterId: string
      mpkCenterName: string
      pendingSince: string
      slaHours: number
      hoursOverdue: number
    }> = []

    // Cache MPK lookups
    const mpkCache = new Map<string, { name: string; slaHours?: number }>()

    for (const record of records) {
      const r = record as unknown as Record<string, unknown>
      const mpkCenterId = r[inv.mpkCenterLookup] as string
      if (!mpkCenterId) continue

      if (!mpkCache.has(mpkCenterId)) {
        const mpk = await mpkCenterService.getById(mpkCenterId)
        if (mpk) {
          mpkCache.set(mpkCenterId, { name: mpk.name, slaHours: mpk.approvalSlaHours })
        }
      }

      const mpkInfo = mpkCache.get(mpkCenterId)
      if (!mpkInfo?.slaHours) continue // no SLA configured

      const pendingSince = r[inv.modifiedOn] as string
      const pendingDate = new Date(pendingSince)
      const now = new Date()
      const hoursElapsed = (now.getTime() - pendingDate.getTime()) / (1000 * 60 * 60)

      if (hoursElapsed > mpkInfo.slaHours) {
        overdueInvoices.push({
          invoiceId: r[inv.id] as string,
          invoiceNumber: r[inv.name] as string || '',
          mpkCenterId,
          mpkCenterName: mpkInfo.name,
          pendingSince,
          slaHours: mpkInfo.slaHours,
          hoursOverdue: Math.round((hoursElapsed - mpkInfo.slaHours) * 10) / 10,
        })
      }
    }

    return overdueInvoices
  }

  // ========== Private helpers ==========

  private async getInvoiceForApproval(invoiceId: string): Promise<{
    approvalStatus: number
    mpkCenterId: string | null
    invoiceType?: number
  }> {
    const inv = DV.invoice
    const select = [
      inv.id, inv.approvalStatus, inv.mpkCenterLookup, inv.invoiceType,
    ].join(',')

    const record = await dataverseClient.getById<DvInvoice>(
      inv.entitySet,
      invoiceId,
      `$select=${select}`
    )

    if (!record) {
      throw new Error('Invoice not found')
    }

    const r = record as unknown as Record<string, unknown>
    return {
      approvalStatus: (r[inv.approvalStatus] as number) ?? APPROVAL_STATUS.DRAFT,
      mpkCenterId: (r[inv.mpkCenterLookup] as string) || null,
      invoiceType: r[inv.invoiceType] as number | undefined,
    }
  }

  private async setApprovalStatus(
    invoiceId: string,
    status: number,
    extra?: {
      approvedBy?: string | null
      approvedByOid?: string | null
      approvedAt?: string | null
      approvalComment?: string | null
    }
  ): Promise<void> {
    const inv = DV.invoice
    const payload: Record<string, unknown> = {
      [inv.approvalStatus]: status,
    }

    if (extra) {
      if (extra.approvedBy !== undefined) payload[inv.approvedBy] = extra.approvedBy
      if (extra.approvedByOid !== undefined) payload[inv.approvedByOid] = extra.approvedByOid
      if (extra.approvedAt !== undefined) payload[inv.approvedAt] = extra.approvedAt
      if (extra.approvalComment !== undefined) payload[inv.approvalComment] = extra.approvalComment
    }

    await dataverseClient.update(inv.entitySet, invoiceId, payload)
  }
}

// Singleton export
export const approvalService = new ApprovalService()
