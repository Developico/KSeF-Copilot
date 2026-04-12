/**
 * Dataverse entity field mappings
 */

/**
 * Invoice entity configuration
 * Field names must match Dataverse schema exactly
 */
export const InvoiceEntity = {
  entitySet: process.env.DV_ENTITY_INVOICE || 'dvlp_ksefinvoices',
  fields: {
    id: 'dvlp_ksefinvoiceid',
    // Tenant = My company = Buyer (nabywca) - we receive/buy goods/services
    tenantNip: 'dvlp_buyernip',
    tenantName: 'dvlp_buyername',
    // Supplier = Vendor = Seller (sprzedawca) - they sell to us
    supplierNip: 'dvlp_sellernip',
    supplierName: 'dvlp_sellername',
    supplierAddress: 'dvlp_selleraddress',
    supplierCity: 'dvlp_sellercity',
    supplierPostalCode: 'dvlp_sellerpostalcode',
    supplierCountry: 'dvlp_sellercountry',
    // Buyer address fields
    buyerAddress: 'dvlp_buyeraddress',
    buyerCity: 'dvlp_buyercity',
    buyerPostalCode: 'dvlp_buyerpostalcode',
    buyerCountry: 'dvlp_buyercountry',
    // Reference number (for KSeF) and invoice number
    referenceNumber: 'dvlp_ksefreferencenumber',
    invoiceNumber: 'dvlp_name', // Primary name field
    invoiceNumberField: 'dvlp_invoicenumber', // Dedicated invoice number field
    invoiceDate: 'dvlp_invoicedate',
    dueDate: 'dvlp_duedate',
    netAmount: 'dvlp_netamount',
    vatAmount: 'dvlp_vatamount',
    grossAmount: 'dvlp_grossamount',
    // Currency fields
    currency: 'dvlp_currency',
    exchangeRate: 'dvlp_exchangerate',
    grossAmountPln: 'dvlp_grossamountpln',
    paymentStatus: 'dvlp_paymentstatus',
    paymentDate: 'dvlp_paidat',
    mpk: 'dvlp_costcenter',
    category: 'dvlp_category',
    project: 'dvlp_project',
    tags: 'dvlp_tags',
    rawXml: 'dvlp_ksefrawxml',
    importedAt: 'dvlp_downloadedat',
    source: 'dvlp_source',
    description: 'dvlp_description',
    // AI fields
    aiMpkSuggestion: 'dvlp_aimpksuggestion',
    aiCategorySuggestion: 'dvlp_aicategorysuggestion',
    aiDescription: 'dvlp_aidescription',
    aiRationale: 'dvlp_airationale',
    aiConfidence: 'dvlp_aiconfidence',
    aiProcessedAt: 'dvlp_aiprocessedat',
    // Document (File column for invoice image/scan)
    document: 'dvlp_doc',
    documentName: 'dvlp_doc_name',
    // Invoice type & correction
    invoiceType: 'dvlp_invoicetype',
    parentInvoiceId: '_dvlp_parentinvoiceid_value',
    parentInvoiceIdBind: 'dvlp_parentinvoiceid@odata.bind',
    correctedInvoiceNumber: 'dvlp_correctedinvoicenumber',
    correctionReason: 'dvlp_correctionreason',
    // MPK Center lookup (new — replaces dvlp_costcenter OptionSet)
    mpkCenterId: '_dvlp_mpkcenterid_value',
    mpkCenterIdBind: 'dvlp_mpkcenterid@odata.bind',
    // Approval workflow fields
    approvalStatus: 'dvlp_approvalstatus',
    approvedBy: 'dvlp_approvedby',
    approvedByOid: 'dvlp_approvedbyoid',
    approvedAt: 'dvlp_approvedat',
    approvalComment: 'dvlp_approvalcomment',
    // Self-billing flag
    isSelfBilling: 'dvlp_isselfbilling',
  },
}

/**
 * Tenant entity configuration (Extended)
 */
export const TenantEntity = {
  entitySet: process.env.DV_ENTITY_SETTING || 'dvlp_ksefsettings',
  fields: {
    id: 'dvlp_ksefsettingid',
    nip: 'dvlp_nip',
    name: 'dvlp_name',
    tokenSecretName: 'dvlp_tokensecretname',
    tokenExpiry: 'dvlp_tokenexpiry',
    isActive: 'dvlp_isactive',
    createdAt: 'dvlp_createdat',
  },
}

/**
 * AI Feedback entity configuration
 * Stores user corrections to AI suggestions for learning
 */
export const AIFeedbackEntity = {
  entitySet: process.env.DV_ENTITY_FEEDBACK || 'dvlp_ksefaifeedbacks',
  parentEntitySet: 'dvlp_ksefinvoices', // For Lookup binding
  fields: {
    id: 'dvlp_ksefaifeedbackid',
    invoiceId: '_dvlp_invoiceid_value', // Lookup field (read format)
    invoiceIdBind: 'dvlp_invoiceid@odata.bind', // Lookup field (write format) - lowercase!
    tenantNip: 'dvlp_tenantnip',
    supplierNip: 'dvlp_suppliernip',
    supplierName: 'dvlp_suppliername',
    invoiceDescription: 'dvlp_invoicedescription',
    aiMpkSuggestion: 'dvlp_aimpksuggestion',
    aiCategorySuggestion: 'dvlp_aicategorysuggestion',
    aiConfidence: 'dvlp_aiconfidence',
    userMpk: 'dvlp_usermpk',
    userCategory: 'dvlp_usercategory',
    feedbackType: 'dvlp_feedbacktype',
    createdOn: 'createdon',
    createdBy: '_createdby_value',
  },
}

/**
 * Feedback type choice values
 */
export const FeedbackTypeValues = {
  applied: 100000000,
  modified: 100000001,
  rejected: 100000002,
} as const

/**
 * Payment status choice values
 */
export const PaymentStatusValues = {
  pending: 100000000,
  paid: 100000001,
} as const

/**
 * MPK choice values
 * Note: Values must match Dataverse Choice options exactly
 * Available in Dataverse: 100000000,100000001,100000002,100000003,100000005,100000006,100000007,100000008,100000009,100000100
 */
export const MpkValues = {
  Consultants: 100000000,
  BackOffice: 100000001,
  Management: 100000002,
  Cars: 100000003,
  // Note: 100000004 does not exist in Dataverse!
  Marketing: 100000005,
  Sales: 100000006,
  Delivery: 100000007,
  Finance: 100000008,
  Other: 100000009,
  Legal: 100000100, // Legal is at 100000100, not 100000004
} as const

/**
 * Invoice source choice values
 * Dataverse accepts: 100000000 (KSeF), 100000001 (Manual)
 */
export const InvoiceSourceValues = {
  KSeF: 100000000,
  Manual: 100000001,
} as const

/**
 * Reverse lookup for choice values
 */
export function getPaymentStatusKey(value: number): 'pending' | 'paid' {
  const entries = Object.entries(PaymentStatusValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'pending' | 'paid') || 'pending'
}

export function getMpkKey(value: number | null | undefined): string | undefined {
  // Return undefined for null/undefined values (no MPK assigned)
  if (value === null || value === undefined) {
    return undefined
  }
  const entries = Object.entries(MpkValues)
  const found = entries.find(([, v]) => v === value)
  return found?.[0]
}

export function getInvoiceSourceKey(value: number): 'KSeF' | 'Manual' {
  const entries = Object.entries(InvoiceSourceValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'KSeF' | 'Manual') || 'KSeF'
}

/**
 * Invoice type choice values
 * Must match Dataverse OptionSet values
 * Verified: 100000000=VAT, 100000001=korygująca, 100000002=zaliczkowa
 */
export const InvoiceTypeValues = {
  VAT: 100000000,
  Corrective: 100000001,
  Advance: 100000002,
} as const

export function getInvoiceTypeKey(value: number | null | undefined): 'VAT' | 'Corrective' | 'Advance' {
  if (value === null || value === undefined) return 'VAT'
  const entries = Object.entries(InvoiceTypeValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'VAT' | 'Corrective' | 'Advance') || 'VAT'
}

/**
 * Approval status choice values
 * Must match Dataverse dvlp_approvalstatus OptionSet
 */
export const ApprovalStatusValues = {
  Draft: 0,
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
} as const

export function getApprovalStatusKey(
  value: number | null | undefined
): 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' {
  if (value === null || value === undefined) return 'Draft'
  const entries = Object.entries(ApprovalStatusValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled') || 'Draft'
}

/**
 * Budget period choice values
 * Must match Dataverse dvlp_budgetperiod OptionSet
 */
export const BudgetPeriodValues = {
  Monthly: 0,
  Quarterly: 1,
  HalfYearly: 2,
  Annual: 3,
} as const

export function getBudgetPeriodKey(
  value: number | null | undefined
): 'Monthly' | 'Quarterly' | 'HalfYearly' | 'Annual' | undefined {
  if (value === null || value === undefined) return undefined
  const entries = Object.entries(BudgetPeriodValues)
  const found = entries.find(([, v]) => v === value)
  return found?.[0] as 'Monthly' | 'Quarterly' | 'HalfYearly' | 'Annual' | undefined
}

/**
 * Notification type choice values
 * Must match Dataverse dvlp_notificationtype OptionSet
 */
export const NotificationTypeValues = {
  ApprovalRequested: 0,
  SlaExceeded: 1,
  BudgetWarning80: 2,
  BudgetExceeded: 3,
  ApprovalDecided: 4,
} as const

// ============================================================
// Cost Document Entity
// ============================================================

export const CostDocumentEntity = {
  entitySet: process.env.DV_ENTITY_COSTDOCUMENT || 'dvlp_ksefcostdocuments',
  fields: {
    id: 'dvlp_ksefcostdocumentid',
    name: 'dvlp_name',
    documentType: 'dvlp_documenttype',
    documentNumber: 'dvlp_documentnumber',
    documentDate: 'dvlp_documentdate',
    dueDate: 'dvlp_duedate',
    description: 'dvlp_description',
    issuerName: 'dvlp_issuername',
    issuerNip: 'dvlp_issuernip',
    issuerAddress: 'dvlp_issueraddress',
    issuerCity: 'dvlp_issuercity',
    issuerPostalCode: 'dvlp_issuerpostalcode',
    issuerCountry: 'dvlp_issuercountry',
    netAmount: 'dvlp_netamount',
    vatAmount: 'dvlp_vatamount',
    grossAmount: 'dvlp_grossamount',
    currency: 'dvlp_currency',
    exchangeRate: 'dvlp_exchangerate',
    grossAmountPln: 'dvlp_grossamountpln',
    paymentStatus: 'dvlp_paymentstatus',
    paidAt: 'dvlp_paidat',
    costCenter: 'dvlp_costcenter',
    category: 'dvlp_category',
    project: 'dvlp_project',
    tags: 'dvlp_tags',
    status: 'dvlp_status',
    source: 'dvlp_source',
    approvalStatus: 'dvlp_approvalstatus',
    approvedBy: 'dvlp_approvedby',
    approvedByOid: 'dvlp_approvedbyoid',
    approvedAt: 'dvlp_approvedat',
    approvalComment: 'dvlp_approvalcomment',
    aiMpkSuggestion: 'dvlp_aimpksuggestion',
    aiCategorySuggestion: 'dvlp_aicategorysuggestion',
    aiDescription: 'dvlp_aidescription',
    aiConfidence: 'dvlp_aiconfidence',
    aiProcessedAt: 'dvlp_aiprocessedat',
    document: 'dvlp_doc',
    documentName: 'dvlp_doc_name',
    notes: 'dvlp_notes',
    mpkCenterId: '_dvlp_mpkcenterid_value',
    mpkCenterIdBind: 'dvlp_mpkcenterid@odata.bind',
    settingId: '_dvlp_settingid_value',
    settingIdBind: 'dvlp_settingid@odata.bind',
  },
}

/**
 * Cost document type choice values
 * Must match Dataverse dvlp_costdocumenttype OptionSet
 */
export const CostDocumentTypeValues = {
  Receipt: 100000000,          // Paragon
  Acknowledgment: 100000001,   // Pokwitowanie
  ProForma: 100000002,         // Pro forma
  DebitNote: 100000003,        // Nota księgowa
  Bill: 100000004,             // Rachunek
  ContractInvoice: 100000005,  // Umowa zlecenie / o dzieło
  Other: 100000006,            // Inne
} as const

export function getCostDocumentTypeKey(
  value: number | null | undefined
): 'Receipt' | 'Acknowledgment' | 'ProForma' | 'DebitNote' | 'Bill' | 'ContractInvoice' | 'Other' {
  if (value === null || value === undefined) return 'Other'
  const entries = Object.entries(CostDocumentTypeValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'Receipt' | 'Acknowledgment' | 'ProForma' | 'DebitNote' | 'Bill' | 'ContractInvoice' | 'Other') || 'Other'
}

/**
 * Cost document status choice values
 */
export const CostDocumentStatusValues = {
  Draft: 100000000,
  Active: 100000001,
  Cancelled: 100000002,
} as const

export function getCostDocumentStatusKey(
  value: number | null | undefined
): 'Draft' | 'Active' | 'Cancelled' {
  if (value === null || value === undefined) return 'Draft'
  const entries = Object.entries(CostDocumentStatusValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'Draft' | 'Active' | 'Cancelled') || 'Draft'
}

/**
 * Cost document source choice values
 */
export const CostDocumentSourceValues = {
  Manual: 100000000,
  OCR: 100000001,
  Import: 100000002,
} as const

export function getCostDocumentSourceKey(
  value: number | null | undefined
): 'Manual' | 'OCR' | 'Import' {
  if (value === null || value === undefined) return 'Manual'
  const entries = Object.entries(CostDocumentSourceValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'Manual' | 'OCR' | 'Import') || 'Manual'
}
