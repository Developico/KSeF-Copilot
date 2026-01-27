/**
 * Dataverse Configuration
 * 
 * All column names are configurable via environment variables.
 * This allows the schema to be adjusted without code changes.
 * 
 * Naming convention:
 * - DV_ENTITY_* - entity set names
 * - DV_FIELD_* - field/column names
 * 
 * Default values match the DATAVERSE_SCHEMA.md specification (prefix: dvlp_)
 */

export interface DataverseEntityConfig {
  entitySet: string
  id: string
  createdOn?: string
  modifiedOn?: string
  stateCode?: string
}

/**
 * Ensure base URL is properly formatted
 */
export function ensureDataverseBaseUrl(): string {
  const url = process.env.DATAVERSE_URL?.replace(/\/$/, '')
  if (!url) {
    throw new Error('DATAVERSE_URL environment variable is required')
  }
  return url
}

/**
 * Main Dataverse configuration object
 */
export const DV = {
  baseUrl: process.env.DATAVERSE_URL?.replace(/\/$/, ''),

  // ============================================================
  // KSeF Setting (dvlp_ksefsetting) - Company configuration per NIP
  // ============================================================
  setting: {
    entitySet: process.env.DV_ENTITY_SETTING || 'dvlp_ksefsettings',
    id: process.env.DV_FIELD_SETTING_ID || 'dvlp_ksefsettingid',
    nip: process.env.DV_FIELD_SETTING_NIP || 'dvlp_nip',
    companyName: process.env.DV_FIELD_SETTING_COMPANY || 'dvlp_companyname',
    environment: process.env.DV_FIELD_SETTING_ENV || 'dvlp_environment',
    autoSync: process.env.DV_FIELD_SETTING_AUTOSYNC || 'dvlp_autosync',
    syncInterval: process.env.DV_FIELD_SETTING_SYNCINTERVAL || 'dvlp_syncinterval',
    lastSyncAt: process.env.DV_FIELD_SETTING_LASTSYNCAT || 'dvlp_lastsyncat',
    lastSyncStatus: process.env.DV_FIELD_SETTING_LASTSYNCSTATUS || 'dvlp_lastsyncstatus',
    keyVaultSecretName: process.env.DV_FIELD_SETTING_KEYVAULT || 'dvlp_keyvaultsecretname',
    tokenExpiresAt: process.env.DV_FIELD_SETTING_TOKENEXPIRES || 'dvlp_tokenexpiresat',
    isActive: process.env.DV_FIELD_SETTING_ISACTIVE || 'dvlp_isactive',
    invoicePrefix: process.env.DV_FIELD_SETTING_PREFIX || 'dvlp_invoiceprefix',
    defaultCategory: process.env.DV_FIELD_SETTING_DEFAULTCATEGORY || 'dvlp_defaultcategory',
    stateCode: process.env.DV_FIELD_SETTING_STATE || 'statecode',
    createdOn: process.env.DV_FIELD_SETTING_CREATEDON || 'createdon',
    modifiedOn: process.env.DV_FIELD_SETTING_MODIFIEDON || 'modifiedon',
  },

  // ============================================================
  // KSeF Session (dvlp_ksefsession) - API sessions with KSeF
  // ============================================================
  session: {
    entitySet: process.env.DV_ENTITY_SESSION || 'dvlp_ksefsessions',
    id: process.env.DV_FIELD_SESSION_ID || 'dvlp_ksefsessionid',
    sessionReference: process.env.DV_FIELD_SESSION_REF || 'dvlp_sessionreference',
    settingLookup: process.env.DV_FIELD_SESSION_SETTING || '_dvlp_ksefsettingid_value',
    nip: process.env.DV_FIELD_SESSION_NIP || 'dvlp_nip',
    sessionToken: process.env.DV_FIELD_SESSION_TOKEN || 'dvlp_sessiontoken',
    sessionType: process.env.DV_FIELD_SESSION_TYPE || 'dvlp_sessiontype',
    startedAt: process.env.DV_FIELD_SESSION_STARTED || 'dvlp_startedat',
    expiresAt: process.env.DV_FIELD_SESSION_EXPIRES || 'dvlp_expiresat',
    terminatedAt: process.env.DV_FIELD_SESSION_TERMINATED || 'dvlp_terminatedat',
    status: process.env.DV_FIELD_SESSION_STATUS || 'dvlp_status',
    invoicesProcessed: process.env.DV_FIELD_SESSION_INVOICES || 'dvlp_invoicesprocessed',
    errorMessage: process.env.DV_FIELD_SESSION_ERROR || 'dvlp_errormessage',
    stateCode: process.env.DV_FIELD_SESSION_STATE || 'statecode',
    createdOn: process.env.DV_FIELD_SESSION_CREATEDON || 'createdon',
    modifiedOn: process.env.DV_FIELD_SESSION_MODIFIEDON || 'modifiedon',
  },

  // ============================================================
  // KSeF Sync Log (dvlp_ksefsynclog) - Sync operation history
  // ============================================================
  syncLog: {
    entitySet: process.env.DV_ENTITY_SYNCLOG || 'dvlp_ksefsynclog',
    id: process.env.DV_FIELD_SYNCLOG_ID || 'dvlp_ksefsynclogid',
    name: process.env.DV_FIELD_SYNCLOG_NAME || 'dvlp_name',
    settingLookup: process.env.DV_FIELD_SYNCLOG_SETTING || '_dvlp_ksefsettingid_value',
    sessionLookup: process.env.DV_FIELD_SYNCLOG_SESSION || '_dvlp_ksefsessionid_value',
    operationType: process.env.DV_FIELD_SYNCLOG_OPTYPE || 'dvlp_operationtype',
    startedAt: process.env.DV_FIELD_SYNCLOG_STARTED || 'dvlp_startedat',
    completedAt: process.env.DV_FIELD_SYNCLOG_COMPLETED || 'dvlp_completedat',
    status: process.env.DV_FIELD_SYNCLOG_STATUS || 'dvlp_status',
    invoicesProcessed: process.env.DV_FIELD_SYNCLOG_PROCESSED || 'dvlp_invoicesprocessed',
    invoicesFailed: process.env.DV_FIELD_SYNCLOG_FAILED || 'dvlp_invoicesfailed',
    errorMessage: process.env.DV_FIELD_SYNCLOG_ERROR || 'dvlp_errormessage',
    requestPayload: process.env.DV_FIELD_SYNCLOG_REQUEST || 'dvlp_requestpayload',
    responsePayload: process.env.DV_FIELD_SYNCLOG_RESPONSE || 'dvlp_responsepayload',
    stateCode: process.env.DV_FIELD_SYNCLOG_STATE || 'statecode',
    createdOn: process.env.DV_FIELD_SYNCLOG_CREATEDON || 'createdon',
    modifiedOn: process.env.DV_FIELD_SYNCLOG_MODIFIEDON || 'modifiedon',
  },

  // ============================================================
  // KSeF Invoice (dvlp_ksefinvoice) - Main invoice table
  // ============================================================
  invoice: {
    entitySet: process.env.DV_ENTITY_INVOICE || 'dvlp_ksefinvoices',
    id: process.env.DV_FIELD_INVOICE_ID || 'dvlp_ksefinvoiceid',
    
    // Primary name
    name: process.env.DV_FIELD_INVOICE_NAME || 'dvlp_name',
    
    // Basic invoice data
    invoiceDate: process.env.DV_FIELD_INVOICE_DATE || 'dvlp_invoicedate',
    saleDate: process.env.DV_FIELD_INVOICE_SALEDATE || 'dvlp_saledate',
    dueDate: process.env.DV_FIELD_INVOICE_DUEDATE || 'dvlp_duedate',
    invoiceType: process.env.DV_FIELD_INVOICE_TYPE || 'dvlp_invoicetype',
    description: process.env.DV_FIELD_INVOICE_DESC || 'dvlp_description',
    
    // Seller data
    sellerNip: process.env.DV_FIELD_INVOICE_SELLER_NIP || 'dvlp_sellernip',
    sellerName: process.env.DV_FIELD_INVOICE_SELLER_NAME || 'dvlp_sellername',
    
    // Buyer data
    buyerNip: process.env.DV_FIELD_INVOICE_BUYER_NIP || 'dvlp_buyernip',
    
    // Amounts
    netAmount: process.env.DV_FIELD_INVOICE_NET || 'dvlp_netamount',
    vatAmount: process.env.DV_FIELD_INVOICE_VAT || 'dvlp_vatamount',
    grossAmount: process.env.DV_FIELD_INVOICE_GROSS || 'dvlp_grossamount',
    currency: process.env.DV_FIELD_INVOICE_CURRENCY || 'dvlp_currency',
    
    // Payment status
    paymentStatus: process.env.DV_FIELD_INVOICE_PAYSTATUS || 'dvlp_paymentstatus',
    paidAt: process.env.DV_FIELD_INVOICE_PAIDAT || 'dvlp_paidat',
    
    // Categorization
    category: process.env.DV_FIELD_INVOICE_CATEGORY || 'dvlp_category',
    costCenter: process.env.DV_FIELD_INVOICE_COSTCENTER || 'dvlp_costcenter',
    
    // AI Categorization (future)
    aiDescription: process.env.DV_FIELD_INVOICE_AI_DESC || 'dvlp_aidescription',
    aiCategory: process.env.DV_FIELD_INVOICE_AI_CATEGORY || 'dvlp_aicategory',
    aiConfidence: process.env.DV_FIELD_INVOICE_AI_CONFIDENCE || 'dvlp_aiconfidence',
    aiProcessedAt: process.env.DV_FIELD_INVOICE_AI_PROCESSED || 'dvlp_aiprocessedat',
    
    // KSeF metadata
    ksefReferenceNumber: process.env.DV_FIELD_INVOICE_KSEF_REF || 'dvlp_ksefreferencenumber',
    ksefStatus: process.env.DV_FIELD_INVOICE_KSEF_STATUS || 'dvlp_ksefstatus',
    ksefDirection: process.env.DV_FIELD_INVOICE_KSEF_DIR || 'dvlp_ksefdirection',
    ksefDownloadedAt: process.env.DV_FIELD_INVOICE_KSEF_DOWNLOADED || 'dvlp_ksefdownloadedat',
    ksefRawXml: process.env.DV_FIELD_INVOICE_KSEF_XML || 'dvlp_ksefrawxml',
    
    // Relations
    settingLookup: process.env.DV_FIELD_INVOICE_SETTING || '_dvlp_ksefsettingid_value',
    parentInvoiceLookup: process.env.DV_FIELD_INVOICE_PARENT || '_dvlp_parentinvoiceid_value',
    
    // Standard fields
    stateCode: process.env.DV_FIELD_INVOICE_STATE || 'statecode',
    statusCode: process.env.DV_FIELD_INVOICE_STATUSCODE || 'statuscode',
    createdOn: process.env.DV_FIELD_INVOICE_CREATEDON || 'createdon',
    modifiedOn: process.env.DV_FIELD_INVOICE_MODIFIEDON || 'modifiedon',
    createdBy: process.env.DV_FIELD_INVOICE_CREATEDBY || '_createdby_value',
    modifiedBy: process.env.DV_FIELD_INVOICE_MODIFIEDBY || '_modifiedby_value',
  },
} as const

// ============================================================
// Option Set Values (matching DATAVERSE_SCHEMA.md)
// ============================================================

export const KSEF_ENVIRONMENT = {
  TEST: 100000001,
  DEMO: 100000002,
  PRODUCTION: 100000003,
} as const

export const KSEF_STATUS = {
  DRAFT: 100000001,
  PENDING: 100000002,
  SENT: 100000003,
  ACCEPTED: 100000004,
  REJECTED: 100000005,
  ERROR: 100000006,
} as const

export const KSEF_DIRECTION = {
  INCOMING: 100000001,
  OUTGOING: 100000002,
} as const

export const SESSION_STATUS = {
  ACTIVE: 100000001,
  EXPIRED: 100000002,
  TERMINATED: 100000003,
  ERROR: 100000004,
} as const

export const SESSION_TYPE = {
  INTERACTIVE: 100000001,
  BATCH: 100000002,
} as const

export const SYNC_OPERATION_TYPE = {
  SYNC_INCOMING: 100000001,
  SYNC_OUTGOING: 100000002,
  SEND_INVOICE: 100000003,
  CHECK_STATUS: 100000004,
  DOWNLOAD_UPO: 100000005,
} as const

export const SYNC_STATUS = {
  IN_PROGRESS: 100000001,
  SUCCESS: 100000002,
  PARTIAL: 100000003,
  ERROR: 100000004,
} as const

export const PAYMENT_STATUS = {
  PENDING: 100000001,
  PAID: 100000002,
  OVERDUE: 100000003,
} as const

export const INVOICE_TYPE = {
  VAT: 100000001,
  CORRECTIVE: 100000002,
  ADVANCE: 100000003,
} as const

export const CURRENCY = {
  PLN: 100000001,
  EUR: 100000002,
  USD: 100000003,
} as const

export const COST_CATEGORY = {
  IT_SOFTWARE: 100000001,
  OFFICE: 100000002,
  MARKETING: 100000003,
  TRAVEL: 100000004,
  UTILITIES: 100000005,
  PROFESSIONAL_SERVICES: 100000006,
  EQUIPMENT: 100000007,
  MATERIALS: 100000008,
  OTHER: 100000009,
} as const

// Type exports for type-safe usage
export type KsefEnvironment = typeof KSEF_ENVIRONMENT[keyof typeof KSEF_ENVIRONMENT]
export type KsefStatus = typeof KSEF_STATUS[keyof typeof KSEF_STATUS]
export type KsefDirection = typeof KSEF_DIRECTION[keyof typeof KSEF_DIRECTION]
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS]
export type SessionType = typeof SESSION_TYPE[keyof typeof SESSION_TYPE]
export type SyncOperationType = typeof SYNC_OPERATION_TYPE[keyof typeof SYNC_OPERATION_TYPE]
export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS]
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]
export type InvoiceType = typeof INVOICE_TYPE[keyof typeof INVOICE_TYPE]
export type Currency = typeof CURRENCY[keyof typeof CURRENCY]
export type CostCategory = typeof COST_CATEGORY[keyof typeof COST_CATEGORY]
