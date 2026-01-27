/**
 * Dataverse Mappers
 * 
 * Convert between Dataverse raw types (Dv*) and application types.
 * Uses DV config for field name resolution.
 */

import { DV, KSEF_STATUS, KSEF_DIRECTION, PAYMENT_STATUS, INVOICE_TYPE, CURRENCY, SESSION_STATUS, SESSION_TYPE, SYNC_STATUS, SYNC_OPERATION_TYPE, KSEF_ENVIRONMENT } from './config'
import { logDataverseMapping } from './logger'
import type { DvInvoice, DvSetting, DvSession, DvSyncLog } from '../../types/dataverse'
import type { Invoice, PaymentStatus as AppPaymentStatus, MPK } from '../../types/invoice'

// ============================================================
// Invoice Mappers
// ============================================================

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
    invoiceDate: raw[s.invoiceDate as keyof DvInvoice] as string,
    dueDate: raw[s.dueDate as keyof DvInvoice] as string | undefined,
    netAmount: raw[s.netAmount as keyof DvInvoice] as number,
    vatAmount: raw[s.vatAmount as keyof DvInvoice] as number,
    grossAmount: raw[s.grossAmount as keyof DvInvoice] as number,
    paymentStatus: mapDvPaymentStatusToApp(raw[s.paymentStatus as keyof DvInvoice] as number),
    paymentDate: raw[s.paidAt as keyof DvInvoice] as string | undefined,
    mpk: raw[s.costCenter as keyof DvInvoice] as MPK | undefined,
    category: raw[s.category as keyof DvInvoice] as string | undefined,
    rawXml: raw[s.ksefRawXml as keyof DvInvoice] as string | undefined,
    importedAt: raw[s.createdOn as keyof DvInvoice] as string,
    // AI fields
    aiDescription: raw[s.aiDescription as keyof DvInvoice] as string | undefined,
    aiCategorySuggestion: raw[s.aiCategory as keyof DvInvoice] as string | undefined,
    aiConfidence: raw[s.aiConfidence as keyof DvInvoice] as number | undefined,
    aiProcessedAt: raw[s.aiProcessedAt as keyof DvInvoice] as string | undefined,
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
  if (app.tenantNip !== undefined) payload[s.buyerNip] = app.tenantNip
  if (app.netAmount !== undefined) payload[s.netAmount] = app.netAmount
  if (app.vatAmount !== undefined) payload[s.vatAmount] = app.vatAmount
  if (app.grossAmount !== undefined) payload[s.grossAmount] = app.grossAmount
  if (app.paymentStatus !== undefined) payload[s.paymentStatus] = mapAppPaymentStatusToDv(app.paymentStatus)
  if (app.paymentDate !== undefined) payload[s.paidAt] = app.paymentDate
  if (app.category !== undefined) payload[s.category] = app.category
  if (app.referenceNumber !== undefined) payload[s.ksefReferenceNumber] = app.referenceNumber
  if (app.rawXml !== undefined) payload[s.ksefRawXml] = app.rawXml
  
  // AI fields
  if (app.aiDescription !== undefined) payload[s.aiDescription] = app.aiDescription
  if (app.aiCategorySuggestion !== undefined) payload[s.aiCategory] = app.aiCategorySuggestion
  if (app.aiConfidence !== undefined) payload[s.aiConfidence] = app.aiConfidence
  if (app.aiProcessedAt !== undefined) payload[s.aiProcessedAt] = app.aiProcessedAt
  
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
    case SYNC_STATUS.SUCCESS: return 'success'
    case SYNC_STATUS.ERROR:
    case SYNC_STATUS.PARTIAL: return 'error'
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
