import { z } from 'zod'

/**
 * Cost Document Type enum
 * 7 non-invoice cost document types
 */
export const CostDocumentType = {
  Receipt: 'Receipt',               // Paragon
  Acknowledgment: 'Acknowledgment', // Pokwitowanie
  ProForma: 'ProForma',             // Pro forma
  DebitNote: 'DebitNote',           // Nota księgowa
  Bill: 'Bill',                     // Rachunek
  ContractInvoice: 'ContractInvoice', // Umowa zlecenie / o dzieło
  Other: 'Other',                   // Inne
} as const

export type CostDocumentType = (typeof CostDocumentType)[keyof typeof CostDocumentType]

/**
 * Cost Document Source enum
 */
export const CostDocumentSource = {
  Manual: 'Manual',
  OCR: 'OCR',
  Import: 'Import',
} as const

export type CostDocumentSource = (typeof CostDocumentSource)[keyof typeof CostDocumentSource]

/**
 * Cost Document Status enum
 */
export const CostDocumentStatus = {
  Draft: 'Draft',
  Active: 'Active',
  Cancelled: 'Cancelled',
} as const

export type CostDocumentStatus = (typeof CostDocumentStatus)[keyof typeof CostDocumentStatus]

/**
 * Cost document entity from Dataverse
 */
export interface CostDocument {
  id: string
  name: string
  documentType: CostDocumentType
  documentNumber: string
  documentDate: string
  dueDate?: string
  description?: string
  // Issuer (counterparty)
  issuerName: string
  issuerNip?: string
  issuerAddress?: string
  issuerCity?: string
  issuerPostalCode?: string
  issuerCountry?: string
  // Amounts
  netAmount?: number
  vatAmount?: number
  grossAmount: number
  currency: string
  exchangeRate?: number
  grossAmountPln?: number
  // Payment
  paymentStatus: string
  paymentDate?: string
  // Classification
  mpk?: string
  mpkCenterId?: string
  category?: string
  project?: string
  tags?: string
  // Document status
  status: CostDocumentStatus
  source: CostDocumentSource
  // Approval fields
  approvalStatus?: string
  approvedBy?: string
  approvedByOid?: string
  approvedAt?: string
  approvalComment?: string
  // AI fields
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
  aiProcessedAt?: string
  // Document (file)
  hasDocument: boolean
  documentFileName?: string
  // Notes (Dataverse annotation)
  notes?: string
  // Tenant link
  settingId?: string
  // Timestamps
  createdOn: string
  modifiedOn?: string
}

/**
 * Zod schema for cost document update
 */
export const CostDocumentUpdateSchema = z.object({
  documentType: z.enum([
    'Receipt', 'Acknowledgment', 'ProForma', 'DebitNote', 'Bill', 'ContractInvoice', 'Other',
  ]).optional(),
  documentNumber: z.string().max(100).optional(),
  documentDate: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().max(500).optional(),
  issuerName: z.string().max(255).optional(),
  issuerNip: z.string().regex(/^\d{10}$/, 'NIP must be 10 digits').optional().or(z.literal('')),
  issuerAddress: z.string().max(255).optional(),
  issuerCity: z.string().max(100).optional(),
  issuerPostalCode: z.string().max(20).optional(),
  issuerCountry: z.string().max(100).optional(),
  netAmount: z.number().optional(),
  vatAmount: z.number().optional(),
  grossAmount: z.number().optional(),
  currency: z.enum(['PLN', 'EUR', 'USD']).optional(),
  exchangeRate: z.number().min(0).optional(),
  grossAmountPln: z.number().optional(),
  paymentStatus: z.enum(['pending', 'paid']).optional(),
  mpk: z.string().max(50).optional(),
  mpkCenterId: z.string().uuid().optional().or(z.literal('')),
  category: z.string().max(50).optional(),
  project: z.string().max(100).optional(),
  tags: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  // AI suggestion fields
  aiMpkSuggestion: z.string().max(50).optional(),
  aiCategorySuggestion: z.string().max(100).optional(),
  aiDescription: z.string().max(500).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
})

export type CostDocumentUpdate = z.infer<typeof CostDocumentUpdateSchema>

/**
 * Zod schema for cost document creation
 */
export const CostDocumentCreateSchema = z.object({
  settingId: z.string().uuid().optional(),
  documentType: z.enum([
    'Receipt', 'Acknowledgment', 'ProForma', 'DebitNote', 'Bill', 'ContractInvoice', 'Other',
  ]),
  documentNumber: z.string().min(1).max(100),
  documentDate: z.string().date(),
  dueDate: z.string().date().optional(),
  description: z.string().max(500).optional(),
  issuerName: z.string().min(1).max(255),
  issuerNip: z.string().regex(/^\d{10}$/, 'NIP must be 10 digits').optional(),
  issuerAddress: z.string().max(255).optional(),
  issuerCity: z.string().max(100).optional(),
  issuerPostalCode: z.string().max(20).optional(),
  issuerCountry: z.string().max(100).optional(),
  netAmount: z.number().optional(),
  vatAmount: z.number().optional(),
  grossAmount: z.number(),
  currency: z.enum(['PLN', 'EUR', 'USD']).optional(),
  exchangeRate: z.number().min(0).optional(),
  grossAmountPln: z.number().optional(),
  mpk: z.string().max(50).optional(),
  mpkCenterId: z.string().uuid().optional(),
  category: z.string().max(50).optional(),
  project: z.string().max(100).optional(),
  tags: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  // AI suggestion fields
  aiMpkSuggestion: z.string().max(50).optional(),
  aiCategorySuggestion: z.string().max(100).optional(),
  aiDescription: z.string().max(500).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
})

export type CostDocumentCreate = z.infer<typeof CostDocumentCreateSchema>

/**
 * Cost document list query parameters
 */
export interface CostDocumentListParams {
  settingId?: string
  documentType?: CostDocumentType
  paymentStatus?: string
  mpkCenterId?: string
  mpkCenterIds?: string[]
  approvalStatus?: string
  category?: string
  status?: CostDocumentStatus
  source?: CostDocumentSource
  fromDate?: string
  toDate?: string
  dueDateFrom?: string
  dueDateTo?: string
  minAmount?: number
  maxAmount?: number
  issuerName?: string
  issuerNip?: string
  search?: string
  top?: number
  skip?: number
  orderBy?: 'documentDate' | 'grossAmount' | 'issuerName' | 'dueDate'
  orderDirection?: 'asc' | 'desc'
}
