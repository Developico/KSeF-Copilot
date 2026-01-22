import { z } from 'zod'

/**
 * Payment status enum
 */
export const PaymentStatus = {
  Pending: 'pending',
  Paid: 'paid',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

/**
 * MPK (Cost Center) enum
 */
export const MPK = {
  Consultants: 'Consultants',
  BackOffice: 'BackOffice',
  Management: 'Management',
  Cars: 'Cars',
  Legal: 'Legal',
  Marketing: 'Marketing',
  Sales: 'Sales',
  Delivery: 'Delivery',
  Finance: 'Finance',
  Other: 'Other',
} as const

export type MPK = (typeof MPK)[keyof typeof MPK]

/**
 * Invoice entity from Dataverse
 */
export interface Invoice {
  id: string
  tenantNip: string
  tenantName: string
  referenceNumber: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  paymentStatus: PaymentStatus
  paymentDate?: string
  mpk?: MPK
  category?: string
  project?: string
  tags?: string[]
  rawXml?: string
  importedAt: string
  // Extended (AI)
  aiMpkSuggestion?: MPK
  aiCategorySuggestion?: string
  aiConfidence?: number
}

/**
 * Invoice from KSeF (before import)
 */
export interface KsefInvoice {
  referenceNumber: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  rawXml: string
}

/**
 * Zod schema for invoice update
 */
export const InvoiceUpdateSchema = z.object({
  mpk: z.nativeEnum(MPK).optional(),
  category: z.string().max(50).optional(),
  project: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  paymentStatus: z.enum(['pending', 'paid']).optional(),
  paymentDate: z.string().date().optional(),
})

export type InvoiceUpdate = z.infer<typeof InvoiceUpdateSchema>

/**
 * Invoice create (from KSeF import)
 */
export interface InvoiceCreate {
  tenantNip: string
  tenantName: string
  referenceNumber: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  rawXml?: string
}

/**
 * Invoice list query parameters
 */
export interface InvoiceListParams {
  tenantNip?: string
  paymentStatus?: PaymentStatus
  mpk?: string
  category?: string
  fromDate?: string
  toDate?: string
  top?: number
  skip?: number
}
