/**
 * Document Module
 * 
 * Exports document extraction services for invoice processing.
 */

export { extractDocument, resetExtractorClients } from './extractor'
export { extractTextFromPdf, extractTextFromPdfBase64, isPdfBuffer } from './pdf-parser'
export { extractFromImage, resetVisionClient } from './vision-service'
export {
  type ExtractedInvoiceData,
  type ExtractedItem,
  type ExtractedAddress,
  type ExtractionResult,
  type DocumentExtractRequest,
  ExtractedInvoiceDataSchema,
  ExtractedItemSchema,
  ExtractedAddressSchema,
  ExtractionResultSchema,
  DocumentExtractRequestSchema,
  SUPPORTED_EXTRACTION_TYPES,
  isSupportedForExtraction,
  getExtractionType,
} from './schemas'
