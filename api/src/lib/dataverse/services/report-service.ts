/**
 * Report Service
 *
 * Generates reports for:
 * - Budget utilization per MPK (7.7)
 * - Approval history (7.8)
 * - Approver performance & SLA compliance
 * - Invoice processing pipeline
 */

import { dataverseClient } from '../client'
import { DV, APPROVAL_STATUS, INVOICE_SOURCE } from '../config'
import { logDataverseInfo } from '../logger'
import { escapeOData } from '../odata-utils'
import { mapDvApprovalStatusToApp, mapDvCurrencyToApp } from '../mappers'
import { budgetService } from './budget-service'
import { mpkCenterService } from './mpk-center-service'
import type { DvInvoice } from '../../../types/dataverse'
import type { BudgetStatus } from './budget-service'
import type { AuthUser } from '../../../types/api'

// ============================================================================
// Types
// ============================================================================

export interface BudgetUtilizationReport {
  period: { from: string; to: string }
  mpkCenters: BudgetStatus[]
  totals: {
    totalBudget: number
    totalUtilized: number
    totalRemaining: number
    overallUtilizationPercent: number
  }
}

export interface ApprovalHistoryEntry {
  invoiceId: string
  invoiceNumber: string
  supplierName: string
  grossAmount: number
  currency: string
  mpkCenterId?: string
  mpkCenterName?: string
  approvalStatus: string
  approvedBy?: string
  approvedAt?: string
  approvalComment?: string
}

export interface ApprovalHistoryReport {
  entries: ApprovalHistoryEntry[]
  count: number
  summary: {
    approved: number
    rejected: number
    cancelled: number
    pending: number
  }
}

// ── Approver Performance & SLA ──

export interface ApproverPerformanceEntry {
  approverName: string
  approverOid: string
  totalDecisions: number
  approvedCount: number
  rejectedCount: number
  approvalRate: number            // 0–100 %
  avgResponseHours: number | null // null if no timestamp data
  minResponseHours: number | null
  maxResponseHours: number | null
  withinSlaCount: number
  overSlaCount: number
  slaComplianceRate: number       // 0–100 %
}

export interface ApproverPerformanceReport {
  approvers: ApproverPerformanceEntry[]
  totals: {
    totalDecisions: number
    avgResponseHours: number | null
    overallSlaComplianceRate: number
  }
}

// ── Invoice Processing Pipeline ──

export interface ProcessingPipelineEntry {
  month: string      // YYYY-MM
  totalReceived: number
  fromKsef: number
  fromManual: number
  classified: number   // have MPK assigned
  approved: number
  rejected: number
  pending: number
  avgClassifyDays: number | null  // download→MPK assign
  avgApproveDays: number | null   // MPK assign→approve
  avgTotalDays: number | null     // download→approve
}

export interface ProcessingPipelineReport {
  months: ProcessingPipelineEntry[]
  totals: {
    totalReceived: number
    fromKsef: number
    fromManual: number
    avgClassifyDays: number | null
    avgApproveDays: number | null
    avgTotalDays: number | null
  }
}

// ============================================================================
// Service
// ============================================================================

export class ReportService {
  /**
   * Budget utilization report per MPK (7.7).
   * Delegates to BudgetService.getBudgetSummary for actual calculation.
   */
  async getBudgetUtilization(
    settingId: string,
    mpkCenterId?: string
  ): Promise<BudgetUtilizationReport> {
    logDataverseInfo('ReportService.getBudgetUtilization', 'Generating budget report', {
      settingId,
      mpkCenterId,
    })

    let mpkCenters: BudgetStatus[]

    if (mpkCenterId) {
      const status = await budgetService.getBudgetStatus(mpkCenterId)
      mpkCenters = status ? [status] : []
    } else {
      mpkCenters = await budgetService.getBudgetSummary(settingId)
    }

    const totalBudget = mpkCenters.reduce((sum, m) => sum + m.budgetAmount, 0)
    const totalUtilized = mpkCenters.reduce((sum, m) => sum + m.utilized, 0)
    const totalRemaining = totalBudget - totalUtilized
    const overallUtilizationPercent = totalBudget > 0
      ? Math.round((totalUtilized / totalBudget) * 10000) / 100
      : 0

    // Derive period from first MPK if available
    const period = mpkCenters.length > 0
      ? { from: mpkCenters[0].periodStart, to: mpkCenters[0].periodEnd }
      : { from: '', to: '' }

    return {
      period,
      mpkCenters,
      totals: { totalBudget, totalUtilized, totalRemaining, overallUtilizationPercent },
    }
  }

  /**
   * Approval history report (7.8).
   * Returns all invoices that have been through the approval workflow
   * (status != Draft), with optional filters.
   */
  async getApprovalHistory(
    user: AuthUser,
    settingId: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
      mpkCenterId?: string
      status?: string
    }
  ): Promise<ApprovalHistoryReport> {
    logDataverseInfo('ReportService.getApprovalHistory', 'Generating approval history', {
      settingId,
      filters,
    })

    const inv = DV.invoice
    const conditions = [
      `${inv.settingLookup} eq ${escapeOData(settingId)}`,
      `${inv.approvalStatus} ne null`,          // exclude invoices never in workflow
      `${inv.approvalStatus} ne ${APPROVAL_STATUS.DRAFT}`, // exclude drafts
    ]

    if (filters?.dateFrom) {
      conditions.push(`${inv.approvedAt} ge ${filters.dateFrom}`)
    }
    if (filters?.dateTo) {
      conditions.push(`${inv.approvedAt} le ${filters.dateTo}`)
    }
    if (filters?.mpkCenterId) {
      conditions.push(`${inv.mpkCenterLookup} eq ${escapeOData(filters.mpkCenterId)}`)
    }
    if (filters?.status) {
      const statusMap: Record<string, number> = {
        Pending: APPROVAL_STATUS.PENDING,
        Approved: APPROVAL_STATUS.APPROVED,
        Rejected: APPROVAL_STATUS.REJECTED,
        Cancelled: APPROVAL_STATUS.CANCELLED,
      }
      const dvStatus = statusMap[filters.status]
      if (dvStatus !== undefined) {
        conditions.push(`${inv.approvalStatus} eq ${dvStatus}`)
      }
    }

    const select = [
      inv.id, inv.name, 'dvlp_sellername',
      inv.grossAmount, inv.currency,
      inv.mpkCenterLookup,
      inv.approvalStatus, inv.approvedBy, inv.approvedAt, inv.approvalComment,
    ].join(',')

    const query = `$filter=${conditions.join(' and ')}&$select=${select}&$orderby=${inv.approvedAt} desc`
    let records = await dataverseClient.listAll<DvInvoice>(inv.entitySet, query)

    // Filter to only invoices in MPK centers where user is approver (Admin sees all)
    const isAdmin = user.roles.includes('Admin')
    if (!isAdmin) {
      const mpkIds = [...new Set(records.map((r) => (r as unknown as Record<string, unknown>)[inv.mpkCenterLookup] as string).filter(Boolean))]
      const dvUser = await mpkCenterService.resolveSystemUserByOid(user.id)

      if (!dvUser) {
        records = []
      } else {
        const approverMpkIds = new Set<string>()
        for (const id of mpkIds) {
          const approvers = await mpkCenterService.getApprovers(id)
          if (approvers.some((a) => a.systemUserId === dvUser.systemUserId)) {
            approverMpkIds.add(id)
          }
        }
        records = records.filter((r) => {
          const mid = (r as unknown as Record<string, unknown>)[inv.mpkCenterLookup] as string
          return mid && approverMpkIds.has(mid)
        })
      }
    }

    // Resolve MPK names
    const mpkNames = new Map<string, string>()
    for (const record of records) {
      const r = record as unknown as Record<string, unknown>
      const mpkId = r[inv.mpkCenterLookup] as string | undefined
      if (mpkId && !mpkNames.has(mpkId)) {
        const mpk = await mpkCenterService.getById(mpkId)
        if (mpk) mpkNames.set(mpkId, mpk.name)
      }
    }

    const entries: ApprovalHistoryEntry[] = records.map((record) => {
      const r = record as unknown as Record<string, unknown>
      const mpkId = r[inv.mpkCenterLookup] as string | undefined
      return {
        invoiceId: r[inv.id] as string,
        invoiceNumber: (r[inv.name] as string) || '',
        supplierName: (r['dvlp_sellername'] as string) || '',
        grossAmount: (r[inv.grossAmount] as number) || 0,
        currency: mapDvCurrencyToApp(r[inv.currency] as number | undefined),
        mpkCenterId: mpkId,
        mpkCenterName: mpkId ? mpkNames.get(mpkId) : undefined,
        approvalStatus: mapDvApprovalStatusToApp(r[inv.approvalStatus] as number | undefined),
        approvedBy: r[inv.approvedBy] as string | undefined,
        approvedAt: r[inv.approvedAt] as string | undefined,
        approvalComment: r[inv.approvalComment] as string | undefined,
      }
    })

    // Summary counts
    const summary = { approved: 0, rejected: 0, cancelled: 0, pending: 0 }
    for (const e of entries) {
      switch (e.approvalStatus) {
        case 'Approved': summary.approved++; break
        case 'Rejected': summary.rejected++; break
        case 'Cancelled': summary.cancelled++; break
        case 'Pending': summary.pending++; break
      }
    }

    return { entries, count: entries.length, summary }
  }

  // ========== Approver Performance & SLA Compliance ==========

  async getApproverPerformance(
    settingId: string
  ): Promise<ApproverPerformanceReport> {
    logDataverseInfo('ReportService.getApproverPerformance', 'Generating approver performance', { settingId })

    const inv = DV.invoice
    // Fetch all invoices that have a decision (Approved or Rejected)
    const conditions = [
      `${inv.settingLookup} eq ${escapeOData(settingId)}`,
      `${inv.approvedBy} ne null`,
      `(${inv.approvalStatus} eq ${APPROVAL_STATUS.APPROVED} or ${inv.approvalStatus} eq ${APPROVAL_STATUS.REJECTED})`,
    ]

    const select = [
      inv.id, inv.approvalStatus,
      inv.approvedBy, inv.approvedByOid, inv.approvedAt,
      inv.mpkCenterLookup, inv.modifiedOn,
    ].join(',')

    const query = `$filter=${conditions.join(' and ')}&$select=${select}`
    const records = await dataverseClient.listAll<DvInvoice>(inv.entitySet, query)

    // Build per-approver lookup of MPK → SLA hours
    const slaCache = new Map<string, number | undefined>()

    // Aggregate per approver
    const byApprover = new Map<string, {
      name: string
      oid: string
      approved: number
      rejected: number
      responseTimes: number[]
      withinSla: number
      overSla: number
    }>()

    for (const record of records) {
      const r = record as unknown as Record<string, unknown>
      const name = (r[inv.approvedBy] as string) || 'Unknown'
      const oid = (r[inv.approvedByOid] as string) || ''
      const status = r[inv.approvalStatus] as number
      const approvedAt = r[inv.approvedAt] as string | undefined
      const modifiedOn = r[inv.modifiedOn] as string | undefined
      const mpkId = r[inv.mpkCenterLookup] as string | undefined

      if (!byApprover.has(name)) {
        byApprover.set(name, { name, oid, approved: 0, rejected: 0, responseTimes: [], withinSla: 0, overSla: 0 })
      }
      const entry = byApprover.get(name)!

      if (status === APPROVAL_STATUS.APPROVED) entry.approved++
      else entry.rejected++

      // Response time: use modifiedOn as proxy for when invoice entered pending state
      // (more accurate than createdOn since MPK assignment triggers pending)
      if (approvedAt && modifiedOn) {
        const responseMs = new Date(approvedAt).getTime() - new Date(modifiedOn).getTime()
        if (responseMs >= 0) {
          const responseHours = responseMs / (1000 * 60 * 60)
          entry.responseTimes.push(responseHours)

          // SLA check
          if (mpkId) {
            if (!slaCache.has(mpkId)) {
              const mpk = await mpkCenterService.getById(mpkId)
              slaCache.set(mpkId, mpk?.approvalSlaHours ?? undefined)
            }
            const slaHours = slaCache.get(mpkId)
            if (slaHours !== undefined) {
              if (responseHours <= slaHours) entry.withinSla++
              else entry.overSla++
            }
          }
        }
      }
    }

    const approvers: ApproverPerformanceEntry[] = []
    let totalResponseTimes: number[] = []
    let globalWithinSla = 0
    let globalOverSla = 0

    for (const [, data] of byApprover) {
      const total = data.approved + data.rejected
      const avg = data.responseTimes.length > 0
        ? data.responseTimes.reduce((s, v) => s + v, 0) / data.responseTimes.length
        : null
      const min = data.responseTimes.length > 0 ? Math.min(...data.responseTimes) : null
      const max = data.responseTimes.length > 0 ? Math.max(...data.responseTimes) : null
      const slaTotal = data.withinSla + data.overSla

      approvers.push({
        approverName: data.name,
        approverOid: data.oid,
        totalDecisions: total,
        approvedCount: data.approved,
        rejectedCount: data.rejected,
        approvalRate: total > 0 ? Math.round((data.approved / total) * 10000) / 100 : 0,
        avgResponseHours: avg !== null ? Math.round(avg * 100) / 100 : null,
        minResponseHours: min !== null ? Math.round(min * 100) / 100 : null,
        maxResponseHours: max !== null ? Math.round(max * 100) / 100 : null,
        withinSlaCount: data.withinSla,
        overSlaCount: data.overSla,
        slaComplianceRate: slaTotal > 0 ? Math.round((data.withinSla / slaTotal) * 10000) / 100 : 100,
      })
      totalResponseTimes = totalResponseTimes.concat(data.responseTimes)
      globalWithinSla += data.withinSla
      globalOverSla += data.overSla
    }

    // Sort by total decisions desc
    approvers.sort((a, b) => b.totalDecisions - a.totalDecisions)

    const totalDecisions = approvers.reduce((s, a) => s + a.totalDecisions, 0)
    const globalAvg = totalResponseTimes.length > 0
      ? Math.round((totalResponseTimes.reduce((s, v) => s + v, 0) / totalResponseTimes.length) * 100) / 100
      : null
    const globalSlaTotal = globalWithinSla + globalOverSla

    return {
      approvers,
      totals: {
        totalDecisions,
        avgResponseHours: globalAvg,
        overallSlaComplianceRate: globalSlaTotal > 0
          ? Math.round((globalWithinSla / globalSlaTotal) * 10000) / 100
          : 100,
      },
    }
  }

  // ========== Invoice Processing Pipeline ==========

  async getInvoiceProcessing(
    settingId: string
  ): Promise<ProcessingPipelineReport> {
    logDataverseInfo('ReportService.getInvoiceProcessing', 'Generating processing pipeline', { settingId })

    const inv = DV.invoice
    const conditions = [
      `${inv.settingLookup} eq ${escapeOData(settingId)}`,
    ]

    const select = [
      inv.id, inv.source, inv.downloadedAt, inv.createdOn, inv.modifiedOn,
      inv.approvalStatus, inv.approvedAt,
      inv.mpkCenterLookup, inv.invoiceDate,
    ].join(',')

    const query = `$filter=${conditions.join(' and ')}&$select=${select}&$orderby=${inv.invoiceDate} asc`
    const records = await dataverseClient.listAll<DvInvoice>(inv.entitySet, query)

    // Group by month (invoice date)
    const byMonth = new Map<string, {
      total: number
      ksef: number
      manual: number
      classified: number
      approved: number
      rejected: number
      pending: number
      classifyDays: number[]
      approveDays: number[]
      totalDays: number[]
    }>()

    for (const record of records) {
      const r = record as unknown as Record<string, unknown>
      const invoiceDate = (r[inv.invoiceDate] as string) || (r[inv.createdOn] as string) || ''
      if (!invoiceDate) continue

      const monthKey = invoiceDate.substring(0, 7) // YYYY-MM
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, {
          total: 0, ksef: 0, manual: 0, classified: 0,
          approved: 0, rejected: 0, pending: 0,
          classifyDays: [], approveDays: [], totalDays: [],
        })
      }
      const entry = byMonth.get(monthKey)!
      entry.total++

      const source = r[inv.source] as number | undefined
      if (source === INVOICE_SOURCE.KSEF) entry.ksef++
      else if (source === INVOICE_SOURCE.MANUAL) entry.manual++
      else entry.ksef++ // default to ksef if unknown

      const mpkId = r[inv.mpkCenterLookup] as string | undefined
      if (mpkId) entry.classified++

      const status = r[inv.approvalStatus] as number | undefined
      if (status === APPROVAL_STATUS.APPROVED) entry.approved++
      else if (status === APPROVAL_STATUS.REJECTED) entry.rejected++
      else if (status === APPROVAL_STATUS.PENDING) entry.pending++

      // Timing: download/create → classify (modifiedOn as proxy), classify → approve
      const startDate = (r[inv.downloadedAt] as string) || (r[inv.createdOn] as string)
      const modDate = r[inv.modifiedOn] as string | undefined
      const approveDate = r[inv.approvedAt] as string | undefined

      if (startDate && modDate && mpkId) {
        const classifyMs = new Date(modDate).getTime() - new Date(startDate).getTime()
        if (classifyMs >= 0) {
          entry.classifyDays.push(classifyMs / (1000 * 60 * 60 * 24))
        }
      }
      if (modDate && approveDate) {
        const approveMs = new Date(approveDate).getTime() - new Date(modDate).getTime()
        if (approveMs >= 0) {
          entry.approveDays.push(approveMs / (1000 * 60 * 60 * 24))
        }
      }
      if (startDate && approveDate) {
        const totalMs = new Date(approveDate).getTime() - new Date(startDate).getTime()
        if (totalMs >= 0) {
          entry.totalDays.push(totalMs / (1000 * 60 * 60 * 24))
        }
      }
    }

    const avg = (arr: number[]) => arr.length > 0
      ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100
      : null

    const months: ProcessingPipelineEntry[] = []
    let allClassify: number[] = []
    let allApprove: number[] = []
    let allTotal: number[] = []
    let totalReceived = 0
    let totalKsef = 0
    let totalManual = 0

    // Sort by month key
    const sortedKeys = [...byMonth.keys()].sort()
    for (const key of sortedKeys) {
      const d = byMonth.get(key)!
      months.push({
        month: key,
        totalReceived: d.total,
        fromKsef: d.ksef,
        fromManual: d.manual,
        classified: d.classified,
        approved: d.approved,
        rejected: d.rejected,
        pending: d.pending,
        avgClassifyDays: avg(d.classifyDays),
        avgApproveDays: avg(d.approveDays),
        avgTotalDays: avg(d.totalDays),
      })
      totalReceived += d.total
      totalKsef += d.ksef
      totalManual += d.manual
      allClassify = allClassify.concat(d.classifyDays)
      allApprove = allApprove.concat(d.approveDays)
      allTotal = allTotal.concat(d.totalDays)
    }

    return {
      months,
      totals: {
        totalReceived,
        fromKsef: totalKsef,
        fromManual: totalManual,
        avgClassifyDays: avg(allClassify),
        avgApproveDays: avg(allApprove),
        avgTotalDays: avg(allTotal),
      },
    }
  }
}

export const reportService = new ReportService()
