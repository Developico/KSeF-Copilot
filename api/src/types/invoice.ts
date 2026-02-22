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
 * Invoice source enum
 */
export const InvoiceSource = {
  KSeF: 'KSeF',
  Manual: 'Manual',
} as const

export type InvoiceSource = (typeof InvoiceSource)[keyof typeof InvoiceSource]

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
 * Currency enum - supported currencies
 */
export const Currency = {
  PLN: 'PLN',
  EUR: 'EUR',
  USD: 'USD',
} as const

export type Currency = (typeof Currency)[keyof typeof Currency]

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
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  supplierCountry?: string
  buyerAddress?: string
  buyerCity?: string
  buyerPostalCode?: string
  buyerCountry?: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  // Currency fields
  currency: Currency
  exchangeRate?: number           // Exchange rate (4 decimal places)
  exchangeDate?: string           // Date of the exchange rate (ISO 8601)
  exchangeSource?: string         // Source of rate: 'NBP API' | 'Manual'
  grossAmountPln?: number         // Gross amount in PLN (for EUR/USD invoices)
  paymentStatus: PaymentStatus
  paymentDate?: string
  mpk?: MPK
  category?: string
  description?: string
  project?: string
  tags?: string[]
  rawXml?: string
  importedAt: string
  source: InvoiceSource
  // Extended (AI Categorization)
  aiMpkSuggestion?: MPK
  aiCategorySuggestion?: string
  aiDescription?: string
  aiRationale?: string
  aiConfidence?: number
  aiProcessedAt?: string
  // Document (invoice image/scan)
  hasDocument?: boolean
  documentFileName?: string
  // Attachment summary
  hasAttachments?: boolean
  attachmentCount?: number
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
  currency?: Currency
  rawXml: string
}

/**
 * Zod schema for invoice update
 */
export const InvoiceUpdateSchema = z.object({
  mpk: z.nativeEnum(MPK).optional(),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  project: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  paymentStatus: z.enum(['pending', 'paid']).optional(),
  paymentDate: z.string().date().optional(),
  // Invoice data fields (editable for all sources)
  supplierName: z.string().max(200).optional(),
  supplierNip: z.string().max(20).optional(),
  supplierAddress: z.string().max(255).optional(),
  supplierCity: z.string().max(100).optional(),
  supplierPostalCode: z.string().max(20).optional(),
  supplierCountry: z.string().max(100).optional(),
  invoiceNumber: z.string().max(100).optional(),
  invoiceDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  netAmount: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  grossAmount: z.number().min(0).optional(),
  // Currency fields
  currency: z.enum(['PLN', 'EUR', 'USD']).optional(),
  exchangeRate: z.number().min(0).optional(),
  exchangeDate: z.string().optional(),
  exchangeSource: z.string().max(50).optional(),
  grossAmountPln: z.number().min(0).optional(),
  // AI Categorization fields
  aiMpkSuggestion: z.nativeEnum(MPK).optional(),
  aiCategorySuggestion: z.string().max(100).optional(),
  aiDescription: z.string().max(500).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  aiProcessedAt: z.string().optional(),
})

export type InvoiceUpdate = z.infer<typeof InvoiceUpdateSchema>

/**
 * Invoice create (from KSeF import or manual entry)
 */
export interface InvoiceCreate {
  settingId?: string  // Links to KSeF setting for multi-environment support
  tenantNip: string
  tenantName: string
  referenceNumber: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  supplierCountry?: string
  buyerAddress?: string
  buyerCity?: string
  buyerPostalCode?: string
  buyerCountry?: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  // Currency fields
  currency?: Currency
  exchangeRate?: number
  exchangeDate?: string
  exchangeSource?: string
  grossAmountPln?: number
  rawXml?: string
  source?: InvoiceSource
  // Manual entry fields
  description?: string
  mpk?: string
  category?: string
  // AI suggestion fields (from document extraction)
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
}

/**
 * Zod schema for manual invoice creation
 */
export const ManualInvoiceCreateSchema = z.object({
  settingId: z.string().uuid().optional(),
  tenantNip: z.string().regex(/^\d{10}$/, 'NIP musi mieć 10 cyfr'),
  tenantName: z.string().min(1).max(255),
  invoiceNumber: z.string().min(1).max(100),
  supplierNip: z.string().regex(/^\d{10}$/, 'NIP musi mieć 10 cyfr'),
  supplierName: z.string().min(1).max(255),
  supplierAddress: z.string().max(255).optional(),
  supplierCity: z.string().max(100).optional(),
  supplierPostalCode: z.string().max(20).optional(),
  supplierCountry: z.string().max(100).optional(),
  invoiceDate: z.string().date(),
  dueDate: z.string().date().optional(),
  netAmount: z.number().min(0),
  vatAmount: z.number().min(0),
  grossAmount: z.number().min(0),
  description: z.string().max(500).optional(),
  mpk: z.nativeEnum(MPK).optional(),
  category: z.string().max(50).optional(),
  // AI suggestion fields (populated from document extraction)
  aiMpkSuggestion: z.nativeEnum(MPK).optional(),
  aiCategorySuggestion: z.string().max(50).optional(),
  aiDescription: z.string().max(500).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
})

export type ManualInvoiceCreate = z.infer<typeof ManualInvoiceCreateSchema>

/**
 * Invoice list query parameters (extended with advanced filters)
 */
export interface InvoiceListParams {
  tenantNip?: string
  settingId?: string // Filter by KSeF setting ID (for multi-environment support)
  paymentStatus?: PaymentStatus
  mpk?: string
  mpkList?: string[] // Multiple MPKs
  category?: string
  fromDate?: string
  toDate?: string
  dueDateFrom?: string
  dueDateTo?: string
  minAmount?: number
  maxAmount?: number
  supplierNip?: string
  supplierName?: string
  source?: InvoiceSource
  overdue?: boolean
  search?: string // Full-text search
  top?: number
  skip?: number
  orderBy?: 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate'
  orderDirection?: 'asc' | 'desc'
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
