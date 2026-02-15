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
