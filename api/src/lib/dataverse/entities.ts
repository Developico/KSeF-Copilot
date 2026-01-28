/**
 * Dataverse entity field mappings
 */

/**
 * Invoice entity configuration
 */
export const InvoiceEntity = {
  entitySet: 'ksef_invoices',
  fields: {
    id: 'ksef_invoiceid',
    tenantNip: 'ksef_tenantnip',
    tenantName: 'ksef_tenantname',
    referenceNumber: 'ksef_referencenumber',
    invoiceNumber: 'ksef_invoicenumber',
    supplierNip: 'ksef_suppliernip',
    supplierName: 'ksef_suppliername',
    invoiceDate: 'ksef_invoicedate',
    dueDate: 'ksef_duedate',
    netAmount: 'ksef_netamount',
    vatAmount: 'ksef_vatamount',
    grossAmount: 'ksef_grossamount',
    paymentStatus: 'ksef_paymentstatus',
    paymentDate: 'ksef_paymentdate',
    mpk: 'ksef_mpk',
    category: 'ksef_category',
    project: 'ksef_project',
    tags: 'ksef_tags',
    rawXml: 'ksef_rawxml',
    importedAt: 'ksef_importedat',
    source: 'ksef_source',
    description: 'ksef_description',
    // AI fields (Extended)
    aiMpkSuggestion: 'ksef_aimpksuggestion',
    aiCategorySuggestion: 'ksef_aicategorysuggestion',
    aiConfidence: 'ksef_aiconfidence',
  },
} as const

/**
 * Tenant entity configuration (Extended)
 */
export const TenantEntity = {
  entitySet: 'ksef_tenants',
  fields: {
    id: 'ksef_tenantid',
    nip: 'ksef_nip',
    name: 'ksef_name',
    tokenSecretName: 'ksef_tokensecretname',
    tokenExpiry: 'ksef_tokenexpiry',
    isActive: 'ksef_isactive',
    createdAt: 'ksef_createdat',
  },
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
 */
export const MpkValues = {
  Consultants: 100000000,
  BackOffice: 100000001,
  Management: 100000002,
  Cars: 100000003,
  Legal: 100000004,
  Marketing: 100000005,
  Sales: 100000006,
  Delivery: 100000007,
  Finance: 100000008,
  Other: 100000009,
} as const

/**
 * Invoice source choice values
 */
export const InvoiceSourceValues = {
  KSeF: 100000001,
  Manual: 100000002,
} as const

/**
 * Reverse lookup for choice values
 */
export function getPaymentStatusKey(value: number): 'pending' | 'paid' {
  const entries = Object.entries(PaymentStatusValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'pending' | 'paid') || 'pending'
}

export function getMpkKey(value: number): string {
  const entries = Object.entries(MpkValues)
  const found = entries.find(([, v]) => v === value)
  return found?.[0] || 'Other'
}

export function getInvoiceSourceKey(value: number): 'KSeF' | 'Manual' {
  const entries = Object.entries(InvoiceSourceValues)
  const found = entries.find(([, v]) => v === value)
  return (found?.[0] as 'KSeF' | 'Manual') || 'KSeF'
}
