/**
 * Document Extraction Schemas
 * 
 * Types and Zod schemas for document data extraction (OCR/Vision).
 */

import { z } from 'zod'

/**
 * Extracted invoice item from document
 */
export const ExtractedItemSchema = z.object({
  description: z.string().max(500),
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  netPrice: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  netAmount: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  grossAmount: z.number().min(0).optional(),
})

export type ExtractedItem = z.infer<typeof ExtractedItemSchema>

/**
 * Supplier address extracted from document
 */
export const ExtractedAddressSchema = z.object({
  street: z.string().max(200).optional(),
  buildingNumber: z.string().max(20).optional(),
  apartmentNumber: z.string().max(20).optional(),
  postalCode: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed.length > 20 ? trimmed.slice(0, 20) : trimmed
    },
    z.string().max(20).optional(),
  ),
  city: z.string().max(100).optional(),
  country: z.string().max(50).optional().default('Polska'),
})

export type ExtractedAddress = z.infer<typeof ExtractedAddressSchema>

/**
 * Full extracted invoice data from document
 */
export const ExtractedInvoiceDataSchema = z.object({
  // Invoice identification
  invoiceNumber: z.string().max(100).optional(),
  issueDate: z.string().optional(), // YYYY-MM-DD or raw
  dueDate: z.string().optional(),
  
  // Supplier (seller)
  supplierName: z.string().max(255).optional(),
  supplierNip: z.string().max(15).optional(),
  supplierAddress: ExtractedAddressSchema.optional(),
  supplierBankAccount: z.string().max(50).optional(),
  
  // Buyer (usually Developico - for validation)
  buyerName: z.string().max(255).optional(),
  buyerNip: z.string().max(15).optional(),
  buyerAddress: ExtractedAddressSchema.optional(),
  
  // Amounts
  netAmount: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  grossAmount: z.number().min(0).optional(),
  currency: z.string().max(3).optional().default('PLN'),
  
  // Line items
  items: z.array(ExtractedItemSchema).optional(),
  
  // Payment info
  paymentMethod: z.string().max(50).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  
  // AI-generated classification
  suggestedMpk: z.string().max(50).optional(),
  suggestedCategory: z.string().max(100).optional(),
  suggestedDescription: z.string().max(500).optional(),
})

export type ExtractedInvoiceData = z.infer<typeof ExtractedInvoiceDataSchema>

/**
 * Extraction result with metadata
 */
export const ExtractionResultSchema = z.object({
  success: z.boolean(),
  data: ExtractedInvoiceDataSchema.optional(),
  confidence: z.number().min(0).max(1),
  extractedAt: z.string(),
  sourceType: z.enum(['pdf', 'image']),
  processingTimeMs: z.number().optional(),
  rawText: z.string().optional(), // For debugging
  error: z.string().optional(),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>

/**
 * Document extraction request
 */
export const DocumentExtractRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  content: z.string().min(1), // base64 encoded
})

export type DocumentExtractRequest = z.infer<typeof DocumentExtractRequestSchema>

/**
 * Supported MIME types for extraction
 */
export const SUPPORTED_EXTRACTION_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const

/**
 * All supported MIME types as a flat array
 */
const ALL_SUPPORTED_TYPES: readonly string[] = [
  ...SUPPORTED_EXTRACTION_TYPES.pdf,
  ...SUPPORTED_EXTRACTION_TYPES.image,
]

/**
 * Check if MIME type is supported for extraction
 */
export function isSupportedForExtraction(mimeType: string): boolean {
  return ALL_SUPPORTED_TYPES.includes(mimeType)
}

/**
 * Get extraction type from MIME type
 */
export function getExtractionType(mimeType: string): 'pdf' | 'image' | null {
  if ((SUPPORTED_EXTRACTION_TYPES.pdf as readonly string[]).includes(mimeType)) {
    return 'pdf'
  }
  if ((SUPPORTED_EXTRACTION_TYPES.image as readonly string[]).includes(mimeType)) {
    return 'image'
  }
  return null
}
