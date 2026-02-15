/**
 * Dataverse Integration
 * 
 * Re-exports all Dataverse utilities for convenient imports.
 */

// Configuration
export { DV, ensureDataverseBaseUrl } from './config'
export type { DataverseEntityConfig } from './config'
export {
  KSEF_ENVIRONMENT,
  KSEF_STATUS,
  KSEF_DIRECTION,
  SESSION_STATUS,
  SESSION_TYPE,
  SYNC_OPERATION_TYPE,
  SYNC_STATUS,
  PAYMENT_STATUS,
  INVOICE_TYPE,
  CURRENCY,
  COST_CATEGORY,
} from './config'
export type {
  KsefEnvironment,
  KsefStatus,
  KsefDirection,
  SessionStatus,
  SessionType,
  SyncOperationType,
  SyncStatus,
  PaymentStatus,
  InvoiceType,
  Currency,
  CostCategory,
} from './config'

// Client
export { DataverseClient, dataverseClient, dataverseRequest, getDataverseToken } from './client'
export type { DataverseRequestOptions, ODataResponse } from './client'

// Logger
export {
  DataverseLogger,
  dataverseLogger,
  logDataverseRequest,
  logDataverseResponse,
  logDataverseMapping,
  logDataverseError,
  logDataverseInfo,
  logDataverseWarn,
  logDataverseDebug,
} from './logger'

// Mappers
export {
  mapDvInvoiceToApp,
  mapAppInvoiceToDv,
  mapDvSettingToApp,
  mapAppSettingToDv,
  mapDvSessionToApp,
  mapDvSyncLogToApp,
  mapDvKsefStatusToApp,
  mapAppKsefStatusToDv,
  mapDvKsefDirectionToApp,
  mapAppKsefDirectionToDv,
} from './mappers'
export type { AppSetting, AppSession, AppSyncLog, AppKsefStatus, AppKsefDirection } from './mappers'

// Services
export {
  InvoiceService,
  invoiceService,
  SettingService,
  settingService,
  SessionService,
  sessionService,
  SyncLogService,
  syncLogService,
} from './services'
export type {
  InvoiceFilters,
  SettingCreate,
  SettingUpdate,
  SessionCreate,
  SyncLogCreate,
} from './services'

// Legacy exports (for backward compatibility)
export * from './entities'
export * from './invoices'
export * from './document'
