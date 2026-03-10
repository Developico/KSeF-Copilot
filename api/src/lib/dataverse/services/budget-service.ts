/**
 * Budget Service
 *
 * Tracks budget utilization per MPK center:
 * - Calculate current period utilization from approved invoices
 * - Check budget thresholds (soft warning at 80%, exceeded at 100%)
 * - Auto-reset: period boundaries derived from budgetStartDate + budgetPeriod
 * - Handle corrective invoice recalculation (D4/4.6)
 * - Handle MPK change on approved invoices (D18/4.7)
 *
 * Design decisions implemented:
 *  D7  — soft limit (warning, no blocking)
 *  D8  — budget always in PLN
 *  D9  — configurable period (monthly/quarterly/half-yearly/annual)
 *  D10 — budget start date for cycle calculation
 *  D11 — auto-reset at period end
 *  D12 — no carry-over of unused budget
 *  D18 — MPK change moves budget load between MPKs
 *  D19 — normalization: grossAmountPln ?? grossAmount
 */

import { dataverseClient } from '../client'
import { DV, APPROVAL_STATUS, BUDGET_PERIOD } from '../config'
import { logDataverseInfo } from '../logger'
import { escapeOData } from '../odata-utils'
import { mapDvBudgetPeriodToApp } from '../mappers'
import type { DvInvoice } from '../../../types/dataverse'
import type { BudgetPeriod } from '../../../types/mpk'
import { mpkCenterService } from './mpk-center-service'

// ============================================================================
// Types
// ============================================================================

export interface BudgetStatus {
  mpkCenterId: string
  mpkCenterName: string
  budgetAmount: number
  budgetPeriod: BudgetPeriod
  budgetStartDate: string
  periodStart: string
  periodEnd: string
  utilized: number
  remaining: number
  utilizationPercent: number
  isWarning: boolean   // >= 80%
  isExceeded: boolean  // >= 100%
  invoiceCount: number
}

export interface BudgetCheckResult {
  wouldExceed: boolean
  isWarning: boolean
  currentUtilized: number
  budgetAmount: number
  afterAmount: number
  utilizationPercentAfter: number
}

// ============================================================================
// Budget Service
// ============================================================================

export class BudgetService {
  /**
   * Get budget status for a single MPK center.
   * Returns null if the MPK has no budget configured.
   */
  async getBudgetStatus(mpkCenterId: string): Promise<BudgetStatus | null> {
    const mpk = await mpkCenterService.getById(mpkCenterId)
    if (!mpk) return null
    if (!mpk.budgetAmount || !mpk.budgetPeriod || !mpk.budgetStartDate) return null

    const { start, end } = getCurrentPeriod(mpk.budgetStartDate, mpk.budgetPeriod)
    const { utilized, invoiceCount } = await this.calculateUtilization(mpkCenterId, start, end)

    const remaining = mpk.budgetAmount - utilized
    const utilizationPercent = mpk.budgetAmount > 0
      ? Math.round((utilized / mpk.budgetAmount) * 10000) / 100
      : 0

    return {
      mpkCenterId,
      mpkCenterName: mpk.name,
      budgetAmount: mpk.budgetAmount,
      budgetPeriod: mpk.budgetPeriod,
      budgetStartDate: mpk.budgetStartDate,
      periodStart: start,
      periodEnd: end,
      utilized,
      remaining,
      utilizationPercent,
      isWarning: utilizationPercent >= 80,
      isExceeded: utilizationPercent >= 100,
      invoiceCount,
    }
  }

  /**
   * Get budget summary for all MPK centers in a setting.
   * Returns only MPKs that have budget configured.
   */
  async getBudgetSummary(settingId: string): Promise<BudgetStatus[]> {
    logDataverseInfo('BudgetService.getBudgetSummary', 'Fetching budget summary', { settingId })

    const mpks = await mpkCenterService.getAll({ settingId, activeOnly: true })
    const results: BudgetStatus[] = []

    for (const mpk of mpks) {
      if (!mpk.budgetAmount || !mpk.budgetPeriod || !mpk.budgetStartDate) continue

      const status = await this.getBudgetStatus(mpk.id)
      if (status) results.push(status)
    }

    return results
  }

  /**
   * Check if approving an invoice would exceed or warn on budget (D7).
   * Used during the approval flow for soft warning.
   */
  async checkBudgetOnApproval(
    invoiceId: string,
    mpkCenterId: string
  ): Promise<BudgetCheckResult | null> {
    const mpk = await mpkCenterService.getById(mpkCenterId)
    if (!mpk) return null
    if (!mpk.budgetAmount || !mpk.budgetPeriod || !mpk.budgetStartDate) return null

    const { start, end } = getCurrentPeriod(mpk.budgetStartDate, mpk.budgetPeriod)
    const { utilized } = await this.calculateUtilization(mpkCenterId, start, end)

    // Get the invoice amount
    const invoiceAmount = await this.getInvoiceAmountPln(invoiceId)
    if (invoiceAmount === null) return null

    const afterAmount = utilized + invoiceAmount
    const utilizationPercentAfter = mpk.budgetAmount > 0
      ? Math.round((afterAmount / mpk.budgetAmount) * 10000) / 100
      : 0

    return {
      wouldExceed: utilizationPercentAfter >= 100,
      isWarning: utilizationPercentAfter >= 80,
      currentUtilized: utilized,
      budgetAmount: mpk.budgetAmount,
      afterAmount,
      utilizationPercentAfter,
    }
  }

  /**
   * Recalculate budget after a corrective invoice is approved (4.6).
   * Corrective invoices have negative or reduced amounts, so they
   * reduce the budget utilization for their MPK center.
   * This is handled automatically — the utilization query sums
   * all approved invoices including correctives.
   * This method is a convenience to get the updated status.
   */
  async recalculateAfterCorrection(mpkCenterId: string): Promise<BudgetStatus | null> {
    return this.getBudgetStatus(mpkCenterId)
  }

  /**
   * Handle MPK change on an approved invoice (D18/4.7).
   * When MPK changes on an approved invoice:
   *  - Old MPK budget utilization decreases
   *  - New MPK budget utilization increases
   * Returns the updated budget status for both MPKs.
   */
  async handleMpkChange(
    oldMpkCenterId: string,
    newMpkCenterId: string
  ): Promise<{ oldBudget: BudgetStatus | null; newBudget: BudgetStatus | null }> {
    logDataverseInfo('BudgetService.handleMpkChange', 'Recalculating budgets after MPK change', {
      oldMpkCenterId,
      newMpkCenterId,
    })

    // Both are recalculated from the actual approved invoices
    const oldBudget = await this.getBudgetStatus(oldMpkCenterId)
    const newBudget = await this.getBudgetStatus(newMpkCenterId)

    return { oldBudget, newBudget }
  }

  // ========== Private helpers ==========

  /**
   * Calculate total utilization for an MPK center within a date range.
   * Sums grossAmountPln ?? grossAmount (D19) for all APPROVED invoices
   * assigned to this MPK within the period.
   */
  private async calculateUtilization(
    mpkCenterId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ utilized: number; invoiceCount: number }> {
    const inv = DV.invoice

    const conditions = [
      `${inv.mpkCenterLookup} eq ${escapeOData(mpkCenterId)}`,
      `${inv.approvalStatus} eq ${APPROVAL_STATUS.APPROVED}`,
      `${inv.invoiceDate} ge ${periodStart}`,
      `${inv.invoiceDate} le ${periodEnd}`,
    ]

    const select = [inv.id, inv.grossAmount, inv.grossAmountPln].join(',')
    const query = `$filter=${conditions.join(' and ')}&$select=${select}`

    const records = await dataverseClient.listAll<DvInvoice>(inv.entitySet, query)

    let utilized = 0
    for (const record of records) {
      const r = record as unknown as Record<string, unknown>
      const grossPln = r[inv.grossAmountPln] as number | undefined
      const gross = r[inv.grossAmount] as number | undefined
      // D19: grossAmountPln ?? grossAmount
      utilized += grossPln ?? gross ?? 0
    }

    return { utilized: Math.round(utilized * 100) / 100, invoiceCount: records.length }
  }

  /**
   * Get the PLN amount for a specific invoice (D19 normalization).
   */
  private async getInvoiceAmountPln(invoiceId: string): Promise<number | null> {
    const inv = DV.invoice
    const select = [inv.id, inv.grossAmount, inv.grossAmountPln].join(',')

    const record = await dataverseClient.getById<DvInvoice>(
      inv.entitySet,
      invoiceId,
      `$select=${select}`
    )
    if (!record) return null

    const r = record as unknown as Record<string, unknown>
    const grossPln = r[inv.grossAmountPln] as number | undefined
    const gross = r[inv.grossAmount] as number | undefined
    return grossPln ?? gross ?? 0
  }
}

// ============================================================================
// Period Calculation Utilities
// ============================================================================

/**
 * Calculate the current budget period boundaries based on start date and period type.
 * Periods cycle automatically (D11 auto-reset, D12 no carry-over).
 */
export function getCurrentPeriod(
  startDateStr: string,
  period: BudgetPeriod
): { start: string; end: string } {
  const startDate = new Date(startDateStr)
  const now = new Date()

  // Normalize to date-only (no time component)
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth()
  const startDay = startDate.getDate()

  const monthsPerPeriod = getMonthsForPeriod(period)

  // Find which cycle we're in
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth()

  // Total months from start to now
  const totalMonths = (nowYear - startYear) * 12 + (nowMonth - startMonth)

  // If we're before the start date, return the first period
  if (totalMonths < 0) {
    const periodEnd = addMonths(startDate, monthsPerPeriod)
    periodEnd.setDate(periodEnd.getDate() - 1)
    return {
      start: formatDate(startDate),
      end: formatDate(periodEnd),
    }
  }

  // Which period cycle are we in?
  const cycleIndex = Math.floor(totalMonths / monthsPerPeriod)
  const periodStartDate = addMonths(new Date(startYear, startMonth, startDay), cycleIndex * monthsPerPeriod)

  // Check if we need to advance to next cycle
  // (if the day of month matters and we're past the end)
  const periodEndDate = addMonths(new Date(periodStartDate), monthsPerPeriod)
  periodEndDate.setDate(periodEndDate.getDate() - 1)

  // If now is after periodEnd, we're in the next period
  if (now > periodEndDate) {
    const nextStart = addMonths(new Date(periodStartDate), monthsPerPeriod)
    const nextEnd = addMonths(new Date(nextStart), monthsPerPeriod)
    nextEnd.setDate(nextEnd.getDate() - 1)
    return {
      start: formatDate(nextStart),
      end: formatDate(nextEnd),
    }
  }

  return {
    start: formatDate(periodStartDate),
    end: formatDate(periodEndDate),
  }
}

function getMonthsForPeriod(period: BudgetPeriod): number {
  switch (period) {
    case 'Monthly': return 1
    case 'Quarterly': return 3
    case 'HalfYearly': return 6
    case 'Annual': return 12
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Singleton export
export const budgetService = new BudgetService()
