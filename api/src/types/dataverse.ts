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
  dvlp_operationtype?: number // SyncOperationType (Choice)
  dvlp_direction: number // SyncDirection (Choice)
  dvlp_startedat: string
  dvlp_completedat?: string
  dvlp_synclogstatus: number // SyncStatus (Choice)
  dvlp_invoicesprocessed?: number
  dvlp_invoicescreated?: number
  dvlp_invoicesupdated?: number
  dvlp_invoicesfailed?: number
  dvlp_pagefrom?: number
  dvlp_pageto?: number
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
  dvlp_selleraddress?: string
  dvlp_sellercountry?: string
  
  // Buyer data
  dvlp_buyernip: string
  dvlp_buyername?: string
  dvlp_buyeraddress?: string
  dvlp_buyercountry?: string
  
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
  
  // MPK Center lookup (new — replaces dvlp_costcenter OptionSet)
  _dvlp_mpkcenterid_value?: string
  
  // Approval workflow fields
  dvlp_approvalstatus?: number  // ApprovalStatus Choice
  dvlp_approvedby?: string
  dvlp_approvedbyoid?: string
  dvlp_approvedat?: string
  dvlp_approvalcomment?: string
  
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
// KSeF MPK Center (dvlp_ksefmpkcenter)
// ============================================================

export interface DvMpkCenter {
  dvlp_ksefmpkcenterid: string
  dvlp_name: string
  dvlp_description?: string
  '_dvlp_settingid_value': string
  dvlp_isactive: boolean
  // Approval
  dvlp_approvalrequired: boolean
  dvlp_approvalslahours?: number
  dvlp_approvaleffectivefrom?: string
  // Budget
  dvlp_budgetamount?: number
  dvlp_budgetperiod?: number // BudgetPeriod choice
  dvlp_budgetstartdate?: string
  // Standard fields
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF MPK Approver (dvlp_ksefmpkapprover)
// ============================================================

export interface DvMpkApprover {
  dvlp_ksefmpkapproverid: string
  dvlp_name: string
  '_dvlp_mpkcenterid_value': string
  '_dvlp_systemuserid_value': string
}

// ============================================================
// KSeF Notification (dvlp_ksefnotification)
// ============================================================

export interface DvNotification {
  dvlp_ksefnotificationid: string
  dvlp_name: string
  '_dvlp_recipientid_value': string
  '_dvlp_settingid_value': string
  dvlp_type: number // NotificationType choice
  dvlp_message?: string
  dvlp_isread: boolean
  dvlp_isdismissed: boolean
  '_dvlp_invoiceid_value'?: string
  '_dvlp_costdocumentid_value'?: string
  '_dvlp_mpkcenterid_value'?: string
  createdon: string
}

// ============================================================
// Dataverse System User (systemuser) - read-only
// ============================================================

export interface DvSystemUser {
  systemuserid: string
  fullname: string
  internalemailaddress?: string
  azureactivedirectoryobjectid?: string
  isdisabled: boolean
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

// ============================================================
// KSeF Supplier (dvlp_ksefsupplier)
// ============================================================

export interface DvSupplier {
  dvlp_ksefsupplierid: string
  dvlp_name: string
  dvlp_nip: string
  dvlp_shortname?: string
  dvlp_regon?: string
  dvlp_krs?: string
  // Address
  dvlp_street?: string
  dvlp_city?: string
  dvlp_postalcode?: string
  dvlp_country?: string
  // Contact
  dvlp_email?: string
  dvlp_phone?: string
  dvlp_bankaccount?: string
  // VAT API
  dvlp_vatstatus?: string
  dvlp_vatstatusdate?: string
  // Business
  dvlp_paymenttermsdays?: number
  '_dvlp_defaultmpkid_value'?: string
  dvlp_defaultcategory?: string
  dvlp_notes?: string
  dvlp_tags?: string
  // Self-billing flags
  dvlp_hasselfbillingagreement?: boolean
  dvlp_selfbillingagreementdate?: string
  dvlp_selfbillingagreementexpiry?: string
  // SB contact user (approver)
  '_dvlp_sbcontactuserid_value'?: string
  // Cached statistics
  dvlp_firstinvoicedate?: string
  dvlp_lastinvoicedate?: string
  dvlp_totalinvoicecount?: number
  dvlp_totalgrossamount?: number
  // Status & source
  dvlp_status: number   // SupplierStatus
  dvlp_source: number   // SupplierSource
  // Relations
  '_dvlp_settingid_value': string
  // Standard fields
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF Self-Billing Agreement (dvlp_ksefsbagrement)
// ============================================================

export interface DvSbAgreement {
  dvlp_ksefsbagrementid: string
  dvlp_name: string
  '_dvlp_supplierid_value': string
  '_dvlp_settingid_value': string
  dvlp_agreementdate: string
  dvlp_validfrom: string
  dvlp_validto?: string
  dvlp_renewaldate?: string
  dvlp_approvalprocedure?: string
  dvlp_credentialreference?: string
  dvlp_notes?: string
  dvlp_hasdocument?: boolean
  dvlp_documentfilename?: string
  dvlp_autoapprove?: boolean
  dvlp_status: number   // SbAgreementStatus
  // Standard fields
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF Self-Billing Template (dvlp_ksefselfbillingtemplate)
// ============================================================

export interface DvSbTemplate {
  dvlp_ksefselfbillingtemplateid: string
  dvlp_name: string
  '_dvlp_supplierid_value': string
  '_dvlp_settingid_value': string
  dvlp_description?: string
  dvlp_itemdescription: string
  dvlp_quantity?: number
  dvlp_unit: string
  dvlp_unitprice: number
  dvlp_vatrate: number
  dvlp_currency?: string
  dvlp_isactive?: boolean
  dvlp_sortorder?: number
  dvlp_paymenttermsdays?: number | null
  // Standard fields
  createdon: string
  modifiedon: string
}

// ============================================================
// Create/Update DTOs for Supplier, SbAgreement, SbTemplate
// ============================================================

export type DvSupplierCreate = Omit<DvSupplier,
  'dvlp_ksefsupplierid' | 'createdon' | 'modifiedon'
>

export type DvSupplierUpdate = Partial<Omit<DvSupplier,
  'dvlp_ksefsupplierid' | 'createdon' | 'modifiedon'
>>

export type DvSbAgreementCreate = Omit<DvSbAgreement,
  'dvlp_ksefsbagrementid' | 'createdon' | 'modifiedon'
>

export type DvSbAgreementUpdate = Partial<Omit<DvSbAgreement,
  'dvlp_ksefsbagrementid' | 'createdon' | 'modifiedon'
>>

export type DvSbTemplateCreate = Omit<DvSbTemplate,
  'dvlp_ksefselfbillingtemplateid' | 'createdon' | 'modifiedon'
>

export type DvSbTemplateUpdate = Partial<Omit<DvSbTemplate,
  'dvlp_ksefselfbillingtemplateid' | 'createdon' | 'modifiedon'
>>

// ============================================================
// KSeF Self-Billing Invoice (dvlp_ksefselfbillinginvoice)
// ============================================================

export interface DvSbInvoice {
  dvlp_ksefselfbillinginvoiceid: string
  dvlp_name: string // Invoice number
  dvlp_invoicedate: string
  dvlp_duedate?: string
  dvlp_netamount: number
  dvlp_vatamount: number
  dvlp_grossamount: number
  dvlp_currency?: string
  dvlp_status: number // SelfBillingStatus
  dvlp_sellerrejectionreason?: string
  dvlp_sentdate?: string
  dvlp_ksefreferencenumber?: string
  dvlp_xmlcontent?: string
  dvlp_xmlhash?: string
  // Relations
  '_dvlp_settingid_value': string
  '_dvlp_supplierid_value': string
  '_dvlp_sbagreementid_value'?: string
  '_dvlp_kseFinvoiceid_value'?: string
  '_dvlp_mpkcenterid_value'?: string
  // Audit: submit & approve
  '_dvlp_submittedbyuserid_value'?: string
  dvlp_submittedat?: string
  '_dvlp_approvedbyuserid_value'?: string
  dvlp_approvedat?: string
  // Standard fields
  statecode: number
  createdon: string
  modifiedon: string
}

// ============================================================
// KSeF Self-Billing Line Item (dvlp_ksefselfbillinglineitem)
// ============================================================

export interface DvSbLineItem {
  dvlp_ksefselfbillinglineitemid: string
  dvlp_name: string // Item description (primary)
  dvlp_quantity: number
  dvlp_unit: string
  dvlp_unitprice: number
  dvlp_vatrate: number
  dvlp_netamount: number
  dvlp_vatamount: number
  dvlp_grossamount: number
  dvlp_paymenttermsdays?: number | null
  dvlp_sortorder?: number
  // Relations
  '_dvlp_sbinvoiceid_value': string
  '_dvlp_templateid_value'?: string
  // Standard fields
  createdon: string
  modifiedon: string
}

// ============================================================
// Create/Update DTOs for SB Invoice and Line Item
// ============================================================

export type DvSbInvoiceCreate = Omit<DvSbInvoice,
  'dvlp_ksefselfbillinginvoiceid' | 'statecode' | 'createdon' | 'modifiedon'
>

export type DvSbInvoiceUpdate = Partial<Omit<DvSbInvoice,
  'dvlp_ksefselfbillinginvoiceid' | 'statecode' | 'createdon' | 'modifiedon'
>>

export type DvSbLineItemCreate = Omit<DvSbLineItem,
  'dvlp_ksefselfbillinglineitemid' | 'createdon' | 'modifiedon'
>

export type DvSbLineItemUpdate = Partial<Omit<DvSbLineItem,
  'dvlp_ksefselfbillinglineitemid' | 'createdon' | 'modifiedon'
>>

// ============================================================
// KSeF Cost Document (dvlp_ksefcostdocument)
// ============================================================

export interface DvCostDocument {
  dvlp_ksefcostdocumentid: string
  dvlp_name: string // Document number (primary name)
  dvlp_documenttype: number // CostDocumentType OptionSet
  dvlp_documentnumber: string
  dvlp_documentdate: string
  dvlp_duedate?: string
  dvlp_description?: string
  // Issuer (counterparty)
  dvlp_issuername: string
  dvlp_issuernip?: string
  dvlp_issueraddress?: string
  dvlp_issuercity?: string
  dvlp_issuerpostalcode?: string
  dvlp_issuercountry?: string
  // Amounts
  dvlp_netamount?: number
  dvlp_vatamount?: number
  dvlp_grossamount: number
  dvlp_currency: number // Currency OptionSet
  dvlp_exchangerate?: number
  dvlp_grossamountpln?: number
  // Payment
  dvlp_paymentstatus: number // PaymentStatus OptionSet
  dvlp_paidat?: string
  // Classification
  dvlp_costcenter?: number | string // Legacy OptionSet or current text field
  dvlp_category?: string
  dvlp_project?: string
  dvlp_tags?: string
  // Document status
  dvlp_status: number // CostDocumentStatus OptionSet
  dvlp_source: number // CostDocumentSource OptionSet
  // Approval workflow
  dvlp_approvalstatus?: number
  dvlp_approvedby?: string
  dvlp_approvedbyoid?: string
  dvlp_approvedat?: string
  dvlp_approvalcomment?: string
  // AI fields
  dvlp_aimpksuggestion?: number | string
  dvlp_aicategorysuggestion?: string
  dvlp_aidescription?: string
  dvlp_aiconfidence?: number
  dvlp_aiprocessedat?: string
  // Document (File column)
  dvlp_doc?: string
  dvlp_doc_name?: string
  // Notes (stored as annotation, not a direct field)
  dvlp_notes?: string
  // Relations (Lookups)
  '_dvlp_settingid_value'?: string
  '_dvlp_mpkcenterid_value'?: string
  // Standard fields
  createdon: string
  modifiedon: string
}

export type DvCostDocumentCreate = Omit<DvCostDocument,
  'dvlp_ksefcostdocumentid' | 'createdon' | 'modifiedon'
>

export type DvCostDocumentUpdate = Partial<Omit<DvCostDocument,
  'dvlp_ksefcostdocumentid' | 'createdon' | 'modifiedon'
>>
