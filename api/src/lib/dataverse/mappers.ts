/**
 * Dataverse Mappers
 * 
 * Convert between Dataverse raw types (Dv*) and application types.
 * Uses DV config for field name resolution.
 */

import { DV, KSEF_STATUS, KSEF_DIRECTION, PAYMENT_STATUS, INVOICE_TYPE, CURRENCY, SESSION_STATUS, SESSION_TYPE, SYNC_STATUS, SYNC_DIRECTION, SYNC_OPERATION_TYPE, KSEF_ENVIRONMENT, INVOICE_SOURCE, LAST_SYNC_STATUS, APPROVAL_STATUS, BUDGET_PERIOD } from './config'
import { logDataverseMapping } from './logger'
import type { DvInvoice, DvSetting, DvSession, DvSyncLog } from '../../types/dataverse'
import type { Invoice, PaymentStatus as AppPaymentStatus, MPK, InvoiceSource, Currency, InvoiceTypeEnum, ApprovalStatus } from '../../types/invoice'

// ============================================================
// Invoice Mappers
// ============================================================

// MPK (Cost Center) Option Set values - MUST match Dataverse exactly!
// Accepted Values: 100000000,100000001,100000002,100000003,100000005,100000006,100000007,100000008,100000009,100000100
import { MpkValues, InvoiceTypeValues } from './entities'

/**
 * Map Dataverse Cost Center (number) to MPK enum
 */
function mapDvCostCenterToMpk(value: number | undefined): MPK | undefined {
  if (value === undefined) return undefined
  
  // Reverse lookup from MpkValues
  const entry = Object.entries(MpkValues).find(([, v]) => v === value)
  return entry ? (entry[0] as MPK) : 'Other'
}

/**
 * Map MPK enum to Dataverse Cost Center (number)
 */
function mapMpkToDvCostCenter(mpk: string | undefined): number | undefined {
  if (mpk === undefined) return undefined
  return MpkValues[mpk as keyof typeof MpkValues] ?? MpkValues.Other
}

/**
 * Map Dataverse Source to App Source
 */
function mapDvSourceToApp(value: number | undefined): InvoiceSource {
  if (value === INVOICE_SOURCE.MANUAL) return 'Manual'
  return 'KSeF'
}

/**
 * Map App Source to Dataverse Source
 */
function mapAppSourceToDv(source: InvoiceSource | undefined): number {
  if (source === 'Manual') return INVOICE_SOURCE.MANUAL
  return INVOICE_SOURCE.KSEF
}

/**
 * Map Dataverse Currency (number) to App Currency
 */
export function mapDvCurrencyToApp(value: number | undefined): Currency {
  if (value === CURRENCY.EUR) return 'EUR'
  if (value === CURRENCY.USD) return 'USD'
  return 'PLN' // Default
}

/**
 * Map App Currency to Dataverse Currency (number)
 */
export function mapAppCurrencyToDv(currency: Currency | undefined): number {
  if (currency === 'EUR') return CURRENCY.EUR
  if (currency === 'USD') return CURRENCY.USD
  return CURRENCY.PLN // Default
}

/**
 * Map Dataverse Invoice Type to App Invoice Type
 */
function mapDvInvoiceTypeToApp(value: number | undefined): InvoiceTypeEnum {
  if (value === INVOICE_TYPE.CORRECTIVE) return 'Corrective'
  if (value === INVOICE_TYPE.ADVANCE) return 'Advance'
  return 'VAT'
}

/**
 * Map App Invoice Type to Dataverse Invoice Type
 */
function mapAppInvoiceTypeToDv(type: InvoiceTypeEnum | undefined): number {
  if (type === 'Corrective') return INVOICE_TYPE.CORRECTIVE
  if (type === 'Advance') return INVOICE_TYPE.ADVANCE
  return INVOICE_TYPE.VAT
}

/**
 * Map Dataverse Invoice to App Invoice
 */
export function mapDvInvoiceToApp(raw: DvInvoice): Invoice {
  const s = DV.invoice
  
  const mapped: Invoice = {
    id: raw[s.id as keyof DvInvoice] as string,
    tenantNip: raw[s.buyerNip as keyof DvInvoice] as string,
    tenantName: '', // Not stored in Dataverse
    referenceNumber: raw[s.ksefReferenceNumber as keyof DvInvoice] as string || '',
    invoiceNumber: raw[s.name as keyof DvInvoice] as string,
    supplierNip: raw[s.sellerNip as keyof DvInvoice] as string,
    supplierName: raw[s.sellerName as keyof DvInvoice] as string,
    supplierAddress: raw[s.sellerAddress as keyof DvInvoice] as string | undefined,
    supplierCountry: raw[s.sellerCountry as keyof DvInvoice] as string | undefined,
    buyerAddress: raw[s.buyerAddress as keyof DvInvoice] as string | undefined,
    buyerCountry: raw[s.buyerCountry as keyof DvInvoice] as string | undefined,
    invoiceDate: raw[s.invoiceDate as keyof DvInvoice] as string,
    dueDate: raw[s.dueDate as keyof DvInvoice] as string | undefined,
    netAmount: raw[s.netAmount as keyof DvInvoice] as number,
    vatAmount: raw[s.vatAmount as keyof DvInvoice] as number,
    grossAmount: raw[s.grossAmount as keyof DvInvoice] as number,
    // Currency fields
    currency: mapDvCurrencyToApp(raw[s.currency as keyof DvInvoice] as number | undefined),
    exchangeRate: raw[s.exchangeRate as keyof DvInvoice] as number | undefined,
    exchangeDate: undefined, // Not stored in Dataverse yet - derived from invoice date
    exchangeSource: undefined, // Not stored in Dataverse yet
    grossAmountPln: raw[s.grossAmountPln as keyof DvInvoice] as number | undefined,
    paymentStatus: mapDvPaymentStatusToApp(raw[s.paymentStatus as keyof DvInvoice] as number),
    paymentDate: raw[s.paidAt as keyof DvInvoice] as string | undefined,
    mpk: mapDvCostCenterToMpk(raw[s.costCenter as keyof DvInvoice] as number | undefined),
    category: raw[s.category as keyof DvInvoice] as string | undefined,
    description: raw[s.description as keyof DvInvoice] as string | undefined,
    rawXml: raw[s.ksefRawXml as keyof DvInvoice] as string | undefined,
    importedAt: raw[s.createdOn as keyof DvInvoice] as string,
    source: mapDvSourceToApp(raw[s.source as keyof DvInvoice] as number | undefined),
    // Invoice type & correction fields
    invoiceType: mapDvInvoiceTypeToApp(raw[s.invoiceType as keyof DvInvoice] as number | undefined),
    parentInvoiceId: raw[s.parentInvoiceLookup as keyof DvInvoice] as string | undefined,
    correctedInvoiceNumber: raw['dvlp_correctedinvoicenumber' as keyof DvInvoice] as string | undefined,
    correctionReason: raw['dvlp_correctionreason' as keyof DvInvoice] as string | undefined,
    // AI Categorization fields
    aiMpkSuggestion: mapDvCostCenterToMpk(raw[s.aiMpkSuggestion as keyof DvInvoice] as number | undefined),
    aiCategorySuggestion: raw[s.aiCategorySuggestion as keyof DvInvoice] as string | undefined,
    aiDescription: raw[s.aiDescription as keyof DvInvoice] as string | undefined,
    aiRationale: raw[s.aiRationale as keyof DvInvoice] as string | undefined,
    aiConfidence: raw[s.aiConfidence as keyof DvInvoice] as number | undefined,
    aiProcessedAt: raw[s.aiProcessedAt as keyof DvInvoice] as string | undefined,
    // Document fields (File column)
    hasDocument: !!(raw[s.documentName as keyof DvInvoice]),
    documentFileName: raw[s.documentName as keyof DvInvoice] as string | undefined,
    // MPK Center lookup (new — replaces legacy costCenter OptionSet)
    mpkCenterId: raw[s.mpkCenterLookup as keyof DvInvoice] as string | undefined,
    // Approval workflow fields  
    approvalStatus: (() => {
      const v = raw[s.approvalStatus as keyof DvInvoice] as number | undefined
      return v !== undefined && v !== null ? mapDvApprovalStatusToApp(v) : undefined
    })(),
    approvedBy: raw[s.approvedBy as keyof DvInvoice] as string | undefined,
    approvedByOid: raw[s.approvedByOid as keyof DvInvoice] as string | undefined,
    approvedAt: raw[s.approvedAt as keyof DvInvoice] as string | undefined,
    approvalComment: raw[s.approvalComment as keyof DvInvoice] as string | undefined,
  }
  
  logDataverseMapping('mapDvInvoiceToApp', raw, mapped)
  return mapped
}

/**
 * Map App Invoice to Dataverse Invoice (for create/update)
 */
export function mapAppInvoiceToDv(app: Partial<Invoice>): Record<string, unknown> {
  const s = DV.invoice
  const payload: Record<string, unknown> = {}
  
  if (app.invoiceNumber !== undefined) payload[s.name] = app.invoiceNumber
  if (app.invoiceDate !== undefined) payload[s.invoiceDate] = app.invoiceDate
  if (app.dueDate !== undefined) payload[s.dueDate] = app.dueDate
  if (app.supplierNip !== undefined) payload[s.sellerNip] = app.supplierNip
  if (app.supplierName !== undefined) payload[s.sellerName] = app.supplierName
  if (app.supplierAddress !== undefined) payload[s.sellerAddress] = app.supplierAddress
  if (app.supplierCountry !== undefined) payload[s.sellerCountry] = app.supplierCountry
  if (app.tenantNip !== undefined) payload[s.buyerNip] = app.tenantNip
  if (app.buyerAddress !== undefined) payload[s.buyerAddress] = app.buyerAddress
  if (app.buyerCountry !== undefined) payload[s.buyerCountry] = app.buyerCountry
  if (app.netAmount !== undefined) payload[s.netAmount] = app.netAmount
  if (app.vatAmount !== undefined) payload[s.vatAmount] = app.vatAmount
  if (app.grossAmount !== undefined) payload[s.grossAmount] = app.grossAmount
  // Currency fields
  if (app.currency !== undefined) payload[s.currency] = mapAppCurrencyToDv(app.currency)
  if (app.exchangeRate !== undefined) payload[s.exchangeRate] = app.exchangeRate
  if (app.grossAmountPln !== undefined) payload[s.grossAmountPln] = app.grossAmountPln
  if (app.paymentStatus !== undefined) payload[s.paymentStatus] = mapAppPaymentStatusToDv(app.paymentStatus)
  if (app.paymentDate !== undefined) payload[s.paidAt] = app.paymentDate
  if (app.category !== undefined) payload[s.category] = app.category
  if (app.description !== undefined) payload[s.description] = app.description
  if (app.referenceNumber !== undefined) payload[s.ksefReferenceNumber] = app.referenceNumber
  if (app.rawXml !== undefined) payload[s.ksefRawXml] = app.rawXml
  if (app.source !== undefined) payload[s.source] = mapAppSourceToDv(app.source)
  // Invoice type & correction fields
  if (app.invoiceType !== undefined) payload[s.invoiceType] = mapAppInvoiceTypeToDv(app.invoiceType)
  if ((app as { correctedInvoiceNumber?: string }).correctedInvoiceNumber !== undefined) {
    payload['dvlp_correctedinvoicenumber'] = (app as { correctedInvoiceNumber?: string }).correctedInvoiceNumber
  }
  if ((app as { correctionReason?: string }).correctionReason !== undefined) {
    payload['dvlp_correctionreason'] = (app as { correctionReason?: string }).correctionReason
  }
  
  // AI Categorization fields
  if (app.aiMpkSuggestion !== undefined) payload[s.aiMpkSuggestion] = mapMpkToDvCostCenter(app.aiMpkSuggestion)
  if (app.aiCategorySuggestion !== undefined) payload[s.aiCategorySuggestion] = app.aiCategorySuggestion
  if (app.aiDescription !== undefined) payload[s.aiDescription] = app.aiDescription
  if (app.aiRationale !== undefined) payload[s.aiRationale] = app.aiRationale
  if (app.aiConfidence !== undefined) payload[s.aiConfidence] = app.aiConfidence
  if (app.aiProcessedAt !== undefined) payload[s.aiProcessedAt] = app.aiProcessedAt
  
  // MPK Center lookup (new — replaces legacy costCenter OptionSet)
  if (app.mpkCenterId !== undefined) {
    if (app.mpkCenterId === null || app.mpkCenterId === '') {
      payload[s.mpkCenterBind] = null
    } else {
      payload[s.mpkCenterBind] = `/dvlp_ksefmpkcenters(${app.mpkCenterId})`
    }
  }
  
  logDataverseMapping('mapAppInvoiceToDv', app, payload)
  return payload
}

// ============================================================
// Setting Mappers
// ============================================================

export interface AppSetting {
  id: string
  nip: string
  companyName: string
  environment: 'test' | 'demo' | 'production'
  autoSync: boolean
  syncIntervalMinutes?: number
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  tokenStatus?: 'valid' | 'expiring' | 'expired' | 'missing'
  isActive: boolean
  invoicePrefix?: string
  createdAt: string
  updatedAt: string
}

export function mapDvSettingToApp(raw: DvSetting): AppSetting {
  const s = DV.setting
  
  const mapped: AppSetting = {
    id: raw[s.id as keyof DvSetting] as string,
    nip: raw[s.nip as keyof DvSetting] as string,
    companyName: raw[s.companyName as keyof DvSetting] as string,
    environment: mapDvEnvironmentToApp(raw[s.environment as keyof DvSetting] as number),
    autoSync: (raw[s.autoSync as keyof DvSetting] as boolean) || false,
    syncIntervalMinutes: raw[s.syncInterval as keyof DvSetting] as number | undefined,
    lastSyncAt: raw[s.lastSyncAt as keyof DvSetting] as string | undefined,
    lastSyncStatus: mapDvSyncStatusToApp(raw[s.lastSyncStatus as keyof DvSetting] as number | undefined),
    keyVaultSecretName: raw[s.keyVaultSecretName as keyof DvSetting] as string | undefined,
    tokenExpiresAt: raw[s.tokenExpiresAt as keyof DvSetting] as string | undefined,
    isActive: (raw[s.isActive as keyof DvSetting] as boolean) ?? true,
    invoicePrefix: raw[s.invoicePrefix as keyof DvSetting] as string | undefined,
    createdAt: raw[s.createdOn as keyof DvSetting] as string,
    updatedAt: raw[s.modifiedOn as keyof DvSetting] as string,
  }
  
  logDataverseMapping('mapDvSettingToApp', raw, mapped)
  return mapped
}

export function mapAppSettingToDv(app: Partial<AppSetting>): Record<string, unknown> {
  const s = DV.setting
  const payload: Record<string, unknown> = {}
  
  if (app.nip !== undefined) payload[s.nip] = app.nip
  if (app.companyName !== undefined) payload[s.companyName] = app.companyName
  if (app.environment !== undefined) payload[s.environment] = mapAppEnvironmentToDv(app.environment)
  if (app.autoSync !== undefined) payload[s.autoSync] = app.autoSync
  if (app.syncIntervalMinutes !== undefined) payload[s.syncInterval] = app.syncIntervalMinutes
  if (app.keyVaultSecretName !== undefined) payload[s.keyVaultSecretName] = app.keyVaultSecretName
  if (app.tokenExpiresAt !== undefined) payload[s.tokenExpiresAt] = app.tokenExpiresAt
  if (app.isActive !== undefined) payload[s.isActive] = app.isActive
  if (app.invoicePrefix !== undefined) payload[s.invoicePrefix] = app.invoicePrefix
  
  return payload
}

// ============================================================
// Session Mappers
// ============================================================

export interface AppSession {
  id: string
  sessionReference: string
  settingId: string
  nip: string
  sessionType: 'interactive' | 'batch'
  startedAt: string
  expiresAt?: string
  terminatedAt?: string
  status: 'active' | 'expired' | 'terminated' | 'error'
  invoicesProcessed: number
  errorMessage?: string
  createdAt: string
}

export function mapDvSessionToApp(raw: DvSession): AppSession {
  const s = DV.session
  
  return {
    id: raw[s.id as keyof DvSession] as string,
    sessionReference: raw[s.sessionReference as keyof DvSession] as string,
    settingId: raw[s.settingLookup as keyof DvSession] as string,
    nip: raw[s.nip as keyof DvSession] as string,
    sessionType: mapDvSessionTypeToApp(raw[s.sessionType as keyof DvSession] as number),
    startedAt: raw[s.startedAt as keyof DvSession] as string,
    expiresAt: raw[s.expiresAt as keyof DvSession] as string | undefined,
    terminatedAt: raw[s.terminatedAt as keyof DvSession] as string | undefined,
    status: mapDvSessionStatusToApp(raw[s.status as keyof DvSession] as number),
    invoicesProcessed: (raw[s.invoicesProcessed as keyof DvSession] as number) || 0,
    errorMessage: raw[s.errorMessage as keyof DvSession] as string | undefined,
    createdAt: raw[s.createdOn as keyof DvSession] as string,
  }
}

// ============================================================
// SyncLog Mappers
// ============================================================

export interface AppSyncLog {
  id: string
  settingId: string
  sessionId?: string
  direction: 'incoming' | 'outgoing' | 'both'
  startedAt: string
  completedAt?: string
  status: 'in-progress' | 'completed' | 'failed' | 'partial'
  invoicesCreated: number
  invoicesUpdated: number
  invoicesFailed: number
  pageFrom?: number
  pageTo?: number
  errorMessage?: string
  createdAt: string
}

export function mapDvSyncLogToApp(raw: DvSyncLog): AppSyncLog {
  const s = DV.syncLog
  
  return {
    id: raw[s.id as keyof DvSyncLog] as string,
    settingId: raw[s.settingLookup as keyof DvSyncLog] as string,
    sessionId: raw[s.sessionLookup as keyof DvSyncLog] as string | undefined,
    direction: mapDvSyncDirectionToApp(raw[s.direction as keyof DvSyncLog] as number),
    startedAt: raw[s.startedAt as keyof DvSyncLog] as string,
    completedAt: raw[s.completedAt as keyof DvSyncLog] as string | undefined,
    status: mapDvSyncLogStatusToApp(raw[s.status as keyof DvSyncLog] as number),
    invoicesCreated: (raw[s.invoicesCreated as keyof DvSyncLog] as number) || 0,
    invoicesUpdated: (raw[s.invoicesUpdated as keyof DvSyncLog] as number) || 0,
    invoicesFailed: (raw[s.invoicesFailed as keyof DvSyncLog] as number) || 0,
    pageFrom: raw[s.pageFrom as keyof DvSyncLog] as number | undefined,
    pageTo: raw[s.pageTo as keyof DvSyncLog] as number | undefined,
    errorMessage: raw[s.errorMessage as keyof DvSyncLog] as string | undefined,
    createdAt: raw[s.createdOn as keyof DvSyncLog] as string,
  }
}

function mapDvSyncDirectionToApp(direction: number): 'incoming' | 'outgoing' | 'both' {
  switch (direction) {
    case SYNC_DIRECTION.INCOMING: return 'incoming'
    case SYNC_DIRECTION.OUTGOING: return 'outgoing'
    default: return 'incoming'
  }
}

function mapDvSyncLogStatusToApp(status: number): 'in-progress' | 'completed' | 'failed' | 'partial' {
  switch (status) {
    case SYNC_STATUS.IN_PROGRESS: return 'in-progress'
    case SYNC_STATUS.COMPLETED: return 'completed'
    case SYNC_STATUS.FAILED: return 'failed'
    case SYNC_STATUS.PARTIAL:
    default: return 'partial'
  }
}

// ============================================================
// Helper Mappers (OptionSet values)
// ============================================================

function mapDvPaymentStatusToApp(status: number | undefined): AppPaymentStatus {
  switch (status) {
    case PAYMENT_STATUS.PAID: return 'paid'
    case PAYMENT_STATUS.OVERDUE: return 'pending' // Map overdue to pending for app
    case PAYMENT_STATUS.PENDING:
    default: return 'pending'
  }
}

function mapAppPaymentStatusToDv(status: AppPaymentStatus): number {
  switch (status) {
    case 'paid': return PAYMENT_STATUS.PAID
    case 'pending':
    default: return PAYMENT_STATUS.PENDING
  }
}

function mapDvEnvironmentToApp(env: number): 'test' | 'demo' | 'production' {
  switch (env) {
    case KSEF_ENVIRONMENT.PRODUCTION: return 'production'
    case KSEF_ENVIRONMENT.DEMO: return 'demo'
    case KSEF_ENVIRONMENT.TEST:
    default: return 'test'
  }
}

function mapAppEnvironmentToDv(env: 'test' | 'demo' | 'production'): number {
  switch (env) {
    case 'production': return KSEF_ENVIRONMENT.PRODUCTION
    case 'demo': return KSEF_ENVIRONMENT.DEMO
    case 'test':
    default: return KSEF_ENVIRONMENT.TEST
  }
}

function mapDvSyncStatusToApp(status: number | undefined): 'success' | 'error' | undefined {
  if (status === undefined) return undefined
  switch (status) {
    case LAST_SYNC_STATUS.SUCCESS: return 'success'
    case LAST_SYNC_STATUS.ERROR: return 'error'
    default: return undefined
  }
}

function mapDvSessionStatusToApp(status: number): 'active' | 'expired' | 'terminated' | 'error' {
  switch (status) {
    case SESSION_STATUS.ACTIVE: return 'active'
    case SESSION_STATUS.EXPIRED: return 'expired'
    case SESSION_STATUS.TERMINATED: return 'terminated'
    case SESSION_STATUS.ERROR:
    default: return 'error'
  }
}

function mapDvSessionTypeToApp(type: number): 'interactive' | 'batch' {
  switch (type) {
    case SESSION_TYPE.BATCH: return 'batch'
    case SESSION_TYPE.INTERACTIVE:
    default: return 'interactive'
  }
}

// ============================================================
// KSeF Status Mappers
// ============================================================

export type AppKsefStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'error'

export function mapDvKsefStatusToApp(status: number | undefined): AppKsefStatus {
  switch (status) {
    case KSEF_STATUS.DRAFT: return 'draft'
    case KSEF_STATUS.PENDING: return 'pending'
    case KSEF_STATUS.SENT: return 'sent'
    case KSEF_STATUS.ACCEPTED: return 'accepted'
    case KSEF_STATUS.REJECTED: return 'rejected'
    case KSEF_STATUS.ERROR:
    default: return 'error'
  }
}

export function mapAppKsefStatusToDv(status: AppKsefStatus): number {
  switch (status) {
    case 'draft': return KSEF_STATUS.DRAFT
    case 'pending': return KSEF_STATUS.PENDING
    case 'sent': return KSEF_STATUS.SENT
    case 'accepted': return KSEF_STATUS.ACCEPTED
    case 'rejected': return KSEF_STATUS.REJECTED
    case 'error':
    default: return KSEF_STATUS.ERROR
  }
}

export type AppKsefDirection = 'incoming' | 'outgoing'

export function mapDvKsefDirectionToApp(direction: number): AppKsefDirection {
  return direction === KSEF_DIRECTION.OUTGOING ? 'outgoing' : 'incoming'
}

export function mapAppKsefDirectionToDv(direction: AppKsefDirection): number {
  return direction === 'outgoing' ? KSEF_DIRECTION.OUTGOING : KSEF_DIRECTION.INCOMING
}

// ============================================================
// MPK Center Mappers
// ============================================================

import { BudgetPeriodValues } from './entities'
import type { DvMpkCenter, DvMpkApprover, DvSystemUser } from '../../types/dataverse'
import type {
  MpkCenter,
  MpkApprover,
  ApprovalStatus as AppApprovalStatus,
  BudgetPeriod as AppBudgetPeriod,
  DataverseUser,
} from '../../types/mpk'

export function mapDvMpkCenterToApp(raw: DvMpkCenter): MpkCenter {
  const s = DV.mpkCenter

  return {
    id: raw[s.id as keyof DvMpkCenter] as string,
    name: raw[s.name as keyof DvMpkCenter] as string,
    description: raw[s.description as keyof DvMpkCenter] as string | undefined,
    settingId: raw[s.settingLookup as keyof DvMpkCenter] as string,
    isActive: (raw[s.isActive as keyof DvMpkCenter] as boolean) ?? true,
    approvalRequired: (raw[s.approvalRequired as keyof DvMpkCenter] as boolean) ?? false,
    approvalSlaHours: raw[s.approvalSlaHours as keyof DvMpkCenter] as number | undefined,
    budgetAmount: raw[s.budgetAmount as keyof DvMpkCenter] as number | undefined,
    budgetPeriod: mapDvBudgetPeriodToApp(raw[s.budgetPeriod as keyof DvMpkCenter] as number | undefined),
    budgetStartDate: raw[s.budgetStartDate as keyof DvMpkCenter] as string | undefined,
    createdOn: raw[s.createdOn as keyof DvMpkCenter] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvMpkCenter] as string,
  }
}

export function mapAppMpkCenterToDv(
  app: Partial<MpkCenter> & { settingId?: string }
): Record<string, unknown> {
  const s = DV.mpkCenter
  const payload: Record<string, unknown> = {}

  if (app.name !== undefined) payload[s.name] = app.name
  if (app.description !== undefined) payload[s.description] = app.description ?? null
  if (app.isActive !== undefined) payload[s.isActive] = app.isActive
  if (app.approvalRequired !== undefined) payload[s.approvalRequired] = app.approvalRequired
  if (app.approvalSlaHours !== undefined) payload[s.approvalSlaHours] = app.approvalSlaHours ?? null
  if (app.budgetAmount !== undefined) payload[s.budgetAmount] = app.budgetAmount ?? null
  if (app.budgetPeriod !== undefined) payload[s.budgetPeriod] = app.budgetPeriod ? mapAppBudgetPeriodToDv(app.budgetPeriod) : null
  if (app.budgetStartDate !== undefined) payload[s.budgetStartDate] = app.budgetStartDate ?? null

  // Setting lookup (only on create)
  if (app.settingId) {
    payload[`${s.settingBind}`] = `/dvlp_ksefsettings(${app.settingId})`
  }

  return payload
}

export function mapDvMpkApproverToApp(raw: DvMpkApprover): MpkApprover {
  const s = DV.mpkApprover

  return {
    id: raw[s.id as keyof DvMpkApprover] as string,
    mpkCenterId: raw[s.mpkCenterLookup as keyof DvMpkApprover] as string,
    systemUserId: raw[s.systemUserLookup as keyof DvMpkApprover] as string,
    name: raw[s.name as keyof DvMpkApprover] as string,
    fullName: '', // Enriched by service layer
    email: '',    // Enriched by service layer
    azureObjectId: '', // Enriched by service layer
  }
}

export function mapDvSystemUserToApp(raw: DvSystemUser): DataverseUser {
  return {
    systemUserId: raw.systemuserid,
    fullName: raw.fullname,
    email: raw.internalemailaddress || '',
    azureObjectId: raw.azureactivedirectoryobjectid,
    isDisabled: raw.isdisabled,
  }
}

// ============================================================
// Approval Status Mappers
// ============================================================

export function mapDvApprovalStatusToApp(value: number | undefined): AppApprovalStatus {
  switch (value) {
    case APPROVAL_STATUS.PENDING: return 'Pending'
    case APPROVAL_STATUS.APPROVED: return 'Approved'
    case APPROVAL_STATUS.REJECTED: return 'Rejected'
    case APPROVAL_STATUS.CANCELLED: return 'Cancelled'
    case APPROVAL_STATUS.DRAFT:
    default: return 'Draft'
  }
}

export function mapAppApprovalStatusToDv(status: AppApprovalStatus): number {
  switch (status) {
    case 'Pending': return APPROVAL_STATUS.PENDING
    case 'Approved': return APPROVAL_STATUS.APPROVED
    case 'Rejected': return APPROVAL_STATUS.REJECTED
    case 'Cancelled': return APPROVAL_STATUS.CANCELLED
    case 'Draft':
    default: return APPROVAL_STATUS.DRAFT
  }
}

// ============================================================
// Budget Period Mappers
// ============================================================

export function mapDvBudgetPeriodToApp(value: number | undefined): AppBudgetPeriod | undefined {
  if (value === undefined || value === null) return undefined
  switch (value) {
    case BUDGET_PERIOD.MONTHLY: return 'Monthly'
    case BUDGET_PERIOD.QUARTERLY: return 'Quarterly'
    case BUDGET_PERIOD.HALF_YEARLY: return 'HalfYearly'
    case BUDGET_PERIOD.ANNUAL: return 'Annual'
    default: return undefined
  }
}

export function mapAppBudgetPeriodToDv(period: AppBudgetPeriod): number {
  return BudgetPeriodValues[period as keyof typeof BudgetPeriodValues] ?? BUDGET_PERIOD.MONTHLY
}
