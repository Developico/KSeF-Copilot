/**
 * Cost Document Mappers
 *
 * Convert between Dataverse raw types (DvCostDocument) and application types (CostDocument).
 * Follows the same pattern as invoice mappers in mappers.ts.
 */

import { DV, PAYMENT_STATUS, CURRENCY, APPROVAL_STATUS, COST_DOCUMENT_TYPE, COST_DOCUMENT_STATUS, COST_DOCUMENT_SOURCE } from './config'
import { logDataverseMapping } from './logger'
import { MpkValues } from './entities'
import { CostDocumentTypeValues, CostDocumentStatusValues, CostDocumentSourceValues, getCostDocumentTypeKey, getCostDocumentStatusKey, getCostDocumentSourceKey } from './entities'
import type { DvCostDocument } from '../../types/dataverse'
import type { CostDocument, CostDocumentType, CostDocumentStatus, CostDocumentSource } from '../../types/cost-document'
import type { Currency as AppCurrency } from '../../types/invoice'
import { mapDvCurrencyToApp, mapAppCurrencyToDv } from './mappers'

// ============================================================
// Helpers
// ============================================================

function mapDvCostCenterToMpk(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined

    // Some records store legacy option-set numeric values as text, e.g. "100000009".
    if (/^\d+$/.test(trimmed)) {
      const numericValue = Number(trimmed)
      const entry = Object.entries(MpkValues).find(([, v]) => v === numericValue)
      return entry ? entry[0] : trimmed
    }

    return trimmed
  }
  if (typeof value === 'number') {
    const entry = Object.entries(MpkValues).find(([, v]) => v === value)
    return entry ? entry[0] : 'Other'
  }
  return undefined
}

function mapMpkToDvCostCenter(mpk: string | undefined): string | number | undefined {
  if (mpk === undefined) return undefined

  // Current Dataverse schema expects string in dvlp_costcenter/dvlp_aimpksuggestion.
  // Keep backward compatibility with legacy option-set labels when possible.
  const trimmed = mpk.trim()
  if (!trimmed) return undefined
  return trimmed
}

function mapDvPaymentStatusToApp(value: number | undefined): string {
  if (value === PAYMENT_STATUS.PAID) return 'paid'
  return 'pending'
}

function mapAppPaymentStatusToDv(status: string | undefined): number {
  if (status === 'paid') return PAYMENT_STATUS.PAID
  return PAYMENT_STATUS.PENDING
}

function mapDvApprovalStatusToApp(value: number | undefined): string | undefined {
  if (value === undefined || value === null) return undefined
  const map: Record<number, string> = {
    [APPROVAL_STATUS.DRAFT]: 'Draft',
    [APPROVAL_STATUS.PENDING]: 'Pending',
    [APPROVAL_STATUS.APPROVED]: 'Approved',
    [APPROVAL_STATUS.REJECTED]: 'Rejected',
    [APPROVAL_STATUS.CANCELLED]: 'Cancelled',
  }
  return map[value] ?? 'Draft'
}

function mapAppDocumentTypeToDv(type: CostDocumentType | undefined): number {
  if (!type) return COST_DOCUMENT_TYPE.OTHER
  return CostDocumentTypeValues[type as keyof typeof CostDocumentTypeValues] ?? COST_DOCUMENT_TYPE.OTHER
}

function mapAppStatusToDv(status: CostDocumentStatus | undefined): number {
  if (!status) return COST_DOCUMENT_STATUS.DRAFT
  return CostDocumentStatusValues[status as keyof typeof CostDocumentStatusValues] ?? COST_DOCUMENT_STATUS.DRAFT
}

function mapAppSourceToDv(source: CostDocumentSource | undefined): number {
  if (!source) return COST_DOCUMENT_SOURCE.MANUAL
  return CostDocumentSourceValues[source as keyof typeof CostDocumentSourceValues] ?? COST_DOCUMENT_SOURCE.MANUAL
}

// ============================================================
// DvCostDocument → CostDocument
// ============================================================

export function mapDvCostDocumentToApp(raw: DvCostDocument): CostDocument {
  const s = DV.costDocument

  const mapped: CostDocument = {
    id: raw[s.id as keyof DvCostDocument] as string,
    name: raw[s.name as keyof DvCostDocument] as string,
    documentType: getCostDocumentTypeKey(raw[s.documentType as keyof DvCostDocument] as number | undefined) as CostDocumentType,
    documentNumber: raw[s.documentNumber as keyof DvCostDocument] as string,
    documentDate: raw[s.documentDate as keyof DvCostDocument] as string,
    dueDate: raw[s.dueDate as keyof DvCostDocument] as string | undefined,
    description: raw[s.description as keyof DvCostDocument] as string | undefined,
    // Issuer
    issuerName: raw[s.issuerName as keyof DvCostDocument] as string,
    issuerNip: raw[s.issuerNip as keyof DvCostDocument] as string | undefined,
    issuerAddress: raw[s.issuerAddress as keyof DvCostDocument] as string | undefined,
    issuerCity: raw[s.issuerCity as keyof DvCostDocument] as string | undefined,
    issuerPostalCode: raw[s.issuerPostalCode as keyof DvCostDocument] as string | undefined,
    issuerCountry: raw[s.issuerCountry as keyof DvCostDocument] as string | undefined,
    // Amounts
    netAmount: raw[s.netAmount as keyof DvCostDocument] as number | undefined,
    vatAmount: raw[s.vatAmount as keyof DvCostDocument] as number | undefined,
    grossAmount: raw[s.grossAmount as keyof DvCostDocument] as number,
    currency: mapDvCurrencyToApp(raw[s.currency as keyof DvCostDocument] as number | undefined),
    exchangeRate: raw[s.exchangeRate as keyof DvCostDocument] as number | undefined,
    grossAmountPln: raw[s.grossAmountPln as keyof DvCostDocument] as number | undefined,
    // Payment
    paymentStatus: mapDvPaymentStatusToApp(raw[s.paymentStatus as keyof DvCostDocument] as number | undefined),
    paymentDate: raw[s.paidAt as keyof DvCostDocument] as string | undefined,
    // Classification
    mpk: mapDvCostCenterToMpk(raw[s.costCenter as keyof DvCostDocument]),
    mpkCenterId: raw[s.mpkCenterLookup as keyof DvCostDocument] as string | undefined,
    category: raw[s.category as keyof DvCostDocument] as string | undefined,
    project: raw[s.project as keyof DvCostDocument] as string | undefined,
    tags: raw[s.tags as keyof DvCostDocument] as string | undefined,
    // Status & source
    status: getCostDocumentStatusKey(raw[s.status as keyof DvCostDocument] as number | undefined) as CostDocumentStatus,
    source: getCostDocumentSourceKey(raw[s.source as keyof DvCostDocument] as number | undefined) as CostDocumentSource,
    // Approval
    approvalStatus: mapDvApprovalStatusToApp(raw[s.approvalStatus as keyof DvCostDocument] as number | undefined),
    approvedBy: raw[s.approvedBy as keyof DvCostDocument] as string | undefined,
    approvedByOid: raw[s.approvedByOid as keyof DvCostDocument] as string | undefined,
    approvedAt: raw[s.approvedAt as keyof DvCostDocument] as string | undefined,
    approvalComment: raw[s.approvalComment as keyof DvCostDocument] as string | undefined,
    // AI
    aiMpkSuggestion: mapDvCostCenterToMpk(raw[s.aiMpkSuggestion as keyof DvCostDocument]),
    aiCategorySuggestion: raw[s.aiCategorySuggestion as keyof DvCostDocument] as string | undefined,
    aiDescription: raw[s.aiDescription as keyof DvCostDocument] as string | undefined,
    aiConfidence: raw[s.aiConfidence as keyof DvCostDocument] as number | undefined,
    aiProcessedAt: raw[s.aiProcessedAt as keyof DvCostDocument] as string | undefined,
    // Document
    hasDocument: !!(raw[s.documentName as keyof DvCostDocument]),
    documentFileName: raw[s.documentName as keyof DvCostDocument] as string | undefined,
    // Notes
    notes: raw[s.notes as keyof DvCostDocument] as string | undefined,
    // Tenant
    settingId: raw[s.settingLookup as keyof DvCostDocument] as string | undefined,
    // Timestamps
    createdOn: raw[s.createdOn as keyof DvCostDocument] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvCostDocument] as string | undefined,
  }

  logDataverseMapping('mapDvCostDocumentToApp', raw, mapped)
  return mapped
}

// ============================================================
// CostDocument → DvCostDocument (for create/update)
// ============================================================

export function mapAppCostDocumentToDv(app: Partial<CostDocument>): Record<string, unknown> {
  const s = DV.costDocument
  const payload: Record<string, unknown> = {}

  if (app.documentNumber !== undefined) payload[s.name] = app.documentNumber
  if (app.documentType !== undefined) payload[s.documentType] = mapAppDocumentTypeToDv(app.documentType)
  if (app.documentNumber !== undefined) payload[s.documentNumber] = app.documentNumber
  if (app.documentDate !== undefined) payload[s.documentDate] = app.documentDate
  if (app.dueDate !== undefined) payload[s.dueDate] = app.dueDate
  if (app.description !== undefined) payload[s.description] = app.description
  // Issuer
  if (app.issuerName !== undefined) payload[s.issuerName] = app.issuerName
  if (app.issuerNip !== undefined) payload[s.issuerNip] = app.issuerNip
  if (app.issuerAddress !== undefined) payload[s.issuerAddress] = app.issuerAddress
  if (app.issuerCity !== undefined) payload[s.issuerCity] = app.issuerCity
  if (app.issuerPostalCode !== undefined) payload[s.issuerPostalCode] = app.issuerPostalCode
  if (app.issuerCountry !== undefined) payload[s.issuerCountry] = app.issuerCountry
  // Amounts
  if (app.netAmount !== undefined) payload[s.netAmount] = app.netAmount
  if (app.vatAmount !== undefined) payload[s.vatAmount] = app.vatAmount
  if (app.grossAmount !== undefined) payload[s.grossAmount] = app.grossAmount
  if (app.currency !== undefined) payload[s.currency] = mapAppCurrencyToDv(app.currency as AppCurrency)
  if (app.exchangeRate !== undefined) payload[s.exchangeRate] = app.exchangeRate
  if (app.grossAmountPln !== undefined) payload[s.grossAmountPln] = app.grossAmountPln
  // Payment
  if (app.paymentStatus !== undefined) payload[s.paymentStatus] = mapAppPaymentStatusToDv(app.paymentStatus)
  if (app.paymentDate !== undefined) payload[s.paidAt] = app.paymentDate
  // Classification
  if (app.category !== undefined) payload[s.category] = app.category
  if (app.project !== undefined) payload[s.project] = app.project
  if (app.tags !== undefined) payload[s.tags] = app.tags
  if (app.notes !== undefined) payload[s.notes] = app.notes
  // Status & source
  if (app.status !== undefined) payload[s.status] = mapAppStatusToDv(app.status)
  if (app.source !== undefined) payload[s.source] = mapAppSourceToDv(app.source)
  // AI fields
  if (app.aiMpkSuggestion !== undefined) payload[s.aiMpkSuggestion] = mapMpkToDvCostCenter(app.aiMpkSuggestion)
  if (app.aiCategorySuggestion !== undefined) payload[s.aiCategorySuggestion] = app.aiCategorySuggestion
  if (app.aiDescription !== undefined) payload[s.aiDescription] = app.aiDescription
  if (app.aiConfidence !== undefined) payload[s.aiConfidence] = app.aiConfidence
  if (app.aiProcessedAt !== undefined) payload[s.aiProcessedAt] = app.aiProcessedAt
  // MPK Center lookup
  if (app.mpkCenterId !== undefined) {
    if (app.mpkCenterId === null || app.mpkCenterId === '') {
      payload[s.mpkCenterBind] = null
    } else {
      payload[s.mpkCenterBind] = `/dvlp_ksefmpkcenters(${app.mpkCenterId})`
    }
  }
  // Setting lookup
  if (app.settingId !== undefined) {
    if (app.settingId === null || app.settingId === '') {
      payload[s.settingBind] = null
    } else {
      payload[s.settingBind] = `/dvlp_ksefsettings(${app.settingId})`
    }
  }

  logDataverseMapping('mapAppCostDocumentToDv', app, payload)
  return payload
}
