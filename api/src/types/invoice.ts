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
  // Extended (AI Categorization)
  aiMpkSuggestion?: MPK
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
  aiProcessedAt?: string
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

/**
 * AI Categorization response from OpenAI
 */
export interface AICategorization {
  mpk: MPK
  category: string
  description: string
  confidence: number
}

/**
 * Zod schema for AI categorization response
 */
export const AiCategorizationSchema = z.object({
  mpk: z.nativeEnum(MPK),
  category: z.string().max(100),
  description: z.string().max(500),
  confidence: z.number().min(0).max(1),
})

/**
 * AI Categorization request
 */
export interface AiCategorizationRequest {
  invoiceId: string
  supplierName: string
  supplierNip: string
  items?: string[]
  grossAmount?: number
}

/**
 * Supplier category cache entry
 */
export interface SupplierCategoryCache {
  supplierNip: string
  supplierName: string
  defaultMpk: MPK
  defaultCategory: string
  usageCount: number
  lastUsed: string
}
