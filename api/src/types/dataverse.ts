/**
 * Dataverse Raw Types
 * 
 * These interfaces represent the raw data structure from Dataverse API.
 * Field names match the Dataverse logical names (dvlp_* prefix).
 * 
 * Use mappers to convert to/from application types.
 */

// ============================================================
// KSeF Setting (dvlp_ksefsetting)
// ============================================================

export interface DvSetting {
  dvlp_ksefsettingid: string
  dvlp_nip: string
  dvlp_companyname: string
  dvlp_environment: number // KsefEnvironment
  dvlp_autosync?: boolean
  dvlp_syncinterval?: number
  dvlp_lastsyncat?: string
  dvlp_lastsyncstatus?: number // SyncStatus
  dvlp_keyvaultsecretname?: string
  dvlp_tokenexpiresat?: string
  dvlp_isactive?: boolean
  dvlp_invoiceprefix?: string
  _dvlp_defaultcategory_value?: string
  statecode: number
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF Session (dvlp_ksefsession)
// ============================================================

export interface DvSession {
  dvlp_ksefsessionid: string
  dvlp_sessionreference: string
  _dvlp_ksefsettingid_value: string
  dvlp_nip: string
  dvlp_sessiontoken?: string
  dvlp_sessiontype: number // SessionType
  dvlp_startedat: string
  dvlp_expiresat?: string
  dvlp_terminatedat?: string
  dvlp_status: number // SessionStatus
  dvlp_invoicesprocessed?: number
  dvlp_errormessage?: string
  statecode: number
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF Sync Log (dvlp_ksefsynclog)
// ============================================================

export interface DvSyncLog {
  dvlp_ksefsynclogid: string
  dvlp_name: string
  _dvlp_ksefsettingid_value: string
  _dvlp_ksefsessionid_value?: string
  dvlp_operationtype: number // SyncOperationType
  dvlp_startedat: string
  dvlp_completedat?: string
  dvlp_status: number // SyncStatus
  dvlp_invoicesprocessed?: number
  dvlp_invoicesfailed?: number
  dvlp_errormessage?: string
  dvlp_requestpayload?: string
  dvlp_responsepayload?: string
  statecode: number
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF Invoice (dvlp_ksefinvoice)
// ============================================================

export interface DvInvoice {
  dvlp_ksefinvoiceid: string
  dvlp_name: string // Invoice number
  
  // Basic invoice data
  dvlp_invoicedate: string
  dvlp_saledate?: string
  dvlp_duedate?: string
  dvlp_invoicetype: number // InvoiceType
  dvlp_description?: string
  
  // Seller data
  dvlp_sellernip: string
  dvlp_sellername: string
  
  // Buyer data
  dvlp_buyernip: string
  
  // Amounts
  dvlp_netamount: number
  dvlp_vatamount: number
  dvlp_grossamount: number
  dvlp_currency: number // Currency
  
  // Payment status
  dvlp_paymentstatus: number // PaymentStatus
  dvlp_paidat?: string
  
  // Categorization
  dvlp_category?: string
  dvlp_costcenter?: number // CostCenter
  
  // AI Categorization
  dvlp_aidescription?: string
  dvlp_aicategory?: string
  dvlp_aiconfidence?: number
  dvlp_aiprocessedat?: string
  
  // KSeF metadata
  dvlp_ksefreferencenumber?: string
  dvlp_ksefstatus?: number // KsefStatus
  dvlp_ksefdirection: number // KsefDirection
  dvlp_ksefdownloadedat?: string
  dvlp_ksefrawxml?: string
  
  // Relations
  _dvlp_ksefsettingid_value: string
  _dvlp_parentinvoiceid_value?: string
  
  // Document file column
  dvlp_doc?: string // File column - contains file name when document exists
  dvlp_doc_name?: string // File name metadata
  
  // Standard fields
  statecode: number
  statuscode: number
  createdon: string
  modifiedon: string
  _createdby_value?: string
  _modifiedby_value?: string
  
  // Formatted values (from OData annotations)
  'dvlp_invoicetype@OData.Community.Display.V1.FormattedValue'?: string
  'dvlp_paymentstatus@OData.Community.Display.V1.FormattedValue'?: string
  'dvlp_currency@OData.Community.Display.V1.FormattedValue'?: string
  'dvlp_ksefstatus@OData.Community.Display.V1.FormattedValue'?: string
  'dvlp_ksefdirection@OData.Community.Display.V1.FormattedValue'?: string
}

// ============================================================
// Create/Update DTOs (without system fields)
// ============================================================

export type DvSettingCreate = Omit<DvSetting, 
  'dvlp_ksefsettingid' | 'statecode' | 'createdon' | 'modifiedon'
>

export type DvSettingUpdate = Partial<Omit<DvSetting, 
  'dvlp_ksefsettingid' | 'dvlp_nip' | 'statecode' | 'createdon' | 'modifiedon'
>>

export type DvSessionCreate = Omit<DvSession, 
  'dvlp_ksefsessionid' | 'statecode' | 'createdon' | 'modifiedon'
>

export type DvSyncLogCreate = Omit<DvSyncLog, 
  'dvlp_ksefsynclogid' | 'statecode' | 'createdon' | 'modifiedon'
>

export type DvInvoiceCreate = Omit<DvInvoice, 
  'dvlp_ksefinvoiceid' | 'statecode' | 'statuscode' | 'createdon' | 'modifiedon' | '_createdby_value' | '_modifiedby_value'
>

export type DvInvoiceUpdate = Partial<Omit<DvInvoice, 
  'dvlp_ksefinvoiceid' | 'statecode' | 'statuscode' | 'createdon' | 'modifiedon' | '_createdby_value' | '_modifiedby_value'
>>
