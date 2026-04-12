/**
 * Cost Document Extraction Schemas
 * 
 * Types and Zod schemas for cost document data extraction (OCR/Vision).
 * Supports: Receipts, Acknowledgments, Pro Forma, Debit Notes, Bills, Contract Invoices, Other.
 */

import { z } from 'zod'
import { ExtractedAddressSchema, ExtractedItemSchema } from './schemas'

/**
 * Detected document type from OCR analysis
 */
export const DetectedDocumentTypeSchema = z.enum([
  'Receipt',
  'Acknowledgment',
  'ProForma',
  'DebitNote',
  'Bill',
  'ContractInvoice',
  'Other',
])

export type DetectedDocumentType = z.infer<typeof DetectedDocumentTypeSchema>

/**
 * Full extracted cost document data
 */
export const ExtractedCostDocumentDataSchema = z.object({
  // Document identification
  documentType: DetectedDocumentTypeSchema.optional(),
  documentNumber: z.string().max(100).optional(),
  issueDate: z.string().optional(), // YYYY-MM-DD or raw
  dueDate: z.string().optional(),

  // Issuer (seller/service provider)
  issuerName: z.string().max(255).optional(),
  issuerNip: z.string().max(15).optional(),
  issuerAddress: ExtractedAddressSchema.optional(),
  issuerBankAccount: z.string().max(50).optional(),

  // Buyer (usually Developico - for validation)
  buyerName: z.string().max(255).optional(),
  buyerNip: z.string().max(15).optional(),

  // Amounts
  netAmount: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  grossAmount: z.number().min(0).optional(),
  currency: z.string().max(3).optional().default('PLN'),

  // Line items (if present - invoices, pro forma, debit notes)
  items: z.array(ExtractedItemSchema).optional(),

  // Payment info
  paymentMethod: z.string().max(50).optional(),
  bankAccountNumber: z.string().max(50).optional(),

  // Contract-specific fields (for ContractInvoice type)
  contractNumber: z.string().max(100).optional(),
  contractDate: z.string().optional(),
  serviceDescription: z.string().max(500).optional(),

  // AI-generated classification
  suggestedMpk: z.string().max(50).optional(),
  suggestedCategory: z.string().max(100).optional(),
  suggestedDescription: z.string().max(500).optional(),
})

export type ExtractedCostDocumentData = z.infer<typeof ExtractedCostDocumentDataSchema>

/**
 * Extraction result with metadata
 */
export const CostDocumentExtractionResultSchema = z.object({
  success: z.boolean(),
  data: ExtractedCostDocumentDataSchema.optional(),
  confidence: z.number().min(0).max(1),
  extractedAt: z.string(),
  sourceType: z.enum(['pdf', 'image']),
  processingTimeMs: z.number().optional(),
  rawText: z.string().optional(),
  error: z.string().optional(),
})

export type CostDocumentExtractionResult = z.infer<typeof CostDocumentExtractionResultSchema>
