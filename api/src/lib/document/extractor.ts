/**
 * Document Extractor - Main Orchestrator
 * 
 * Orchestrates document extraction based on file type:
 * - PDF: Extract text with pdf-parse, then analyze with LLM
 * - Image: Use GPT-4o Vision directly
 */

import OpenAI from 'openai'
import { getSecret } from '../keyvault/secrets'
import { getPrompt, fillPromptTemplate, loadPrompt } from '../prompts'
import { extractTextFromPdfBase64 } from './pdf-parser'
import { extractFromImage } from './vision-service'
import type { 
  ExtractionResult, 
  ExtractedInvoiceData,
  DocumentExtractRequest 
} from './schemas'
import { 
  getExtractionType, 
  isSupportedForExtraction,
  ExtractedInvoiceDataSchema 
} from './schemas'

// Key Vault secret names
const KV_OPENAI_ENDPOINT = 'AZURE-OPENAI-ENDPOINT'
const KV_OPENAI_API_KEY = 'AZURE-OPENAI-API-KEY'

// Text analysis deployment (GPT-4o-mini is sufficient for text)
const TEXT_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'

// Singleton client for text analysis
let textClient: OpenAI | null = null
let clientInitPromise: Promise<OpenAI> | null = null

/**
 * Get or create text analysis client
 */
async function getTextClient(): Promise<OpenAI> {
  if (textClient) return textClient
  if (clientInitPromise) return clientInitPromise

  clientInitPromise = (async () => {
    let endpoint = await getSecret(KV_OPENAI_ENDPOINT).catch(() => undefined)
    let apiKey = await getSecret(KV_OPENAI_API_KEY).catch(() => undefined)

    if (!endpoint) endpoint = process.env.AZURE_OPENAI_ENDPOINT
    if (!apiKey) apiKey = process.env.AZURE_OPENAI_API_KEY

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI credentials not configured')
    }

    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'

    textClient = new OpenAI({
      baseURL: `${endpoint.replace(/\/$/, '')}/openai/deployments/${TEXT_DEPLOYMENT}`,
      apiKey,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    })

    console.log('[Extractor] Text client initialized')
    return textClient
  })()

  return clientInitPromise
}

/**
 * Build prompt for analyzing extracted PDF text
 * Uses external prompt template from prompts/pdf-text-extraction.prompt.md
 */
function buildTextAnalysisPrompt(pdfText: string): string {
  // Truncate text if too long (GPT-4o-mini context)
  const maxChars = 8000
  const truncatedText = pdfText.length > maxChars 
    ? pdfText.slice(0, maxChars) + '\n...[skrócono]' 
    : pdfText

  // Load prompt template from external file
  const promptTemplate = loadPrompt('pdf-text-extraction')
  
  return fillPromptTemplate(promptTemplate, {
    pdfText: truncatedText,
  })
}

/**
 * Parse text analysis response
 */
function parseTextAnalysisResponse(content: string): ExtractedInvoiceData {
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(jsonStr)
  return ExtractedInvoiceDataSchema.partial().parse(parsed) as ExtractedInvoiceData
}

/**
 * Calculate confidence score for extracted data
 */
function calculateConfidence(data: ExtractedInvoiceData): number {
  const keyFields = [
    data.invoiceNumber,
    data.issueDate,
    data.supplierName,
    data.supplierNip,
    data.grossAmount,
    data.netAmount,
  ]

  const filled = keyFields.filter(f => f !== undefined && f !== null && f !== '').length
  let confidence = filled / keyFields.length

  // Bonuses
  if (data.items && data.items.length > 0) confidence += 0.1
  if (data.supplierAddress?.city) confidence += 0.05
  if (data.buyerNip) confidence += 0.05

  return Math.min(1, confidence)
}

/**
 * Minimum number of characters for PDF text extraction to be considered
 * meaningful (scanned PDFs typically yield 0 or a few junk chars).
 */
const MIN_PDF_TEXT_LENGTH = 50

/**
 * Extract data from PDF using text extraction + LLM analysis.
 * Falls back to Vision API for scanned/image-based PDFs where text
 * extraction returns empty or minimal content.
 */
async function extractFromPdf(base64Content: string): Promise<{ data: ExtractedInvoiceData; confidence: number; rawText?: string }> {
  const startTime = Date.now()
  console.log('[Extractor] Starting PDF extraction...')

  // Step 1: Try to extract text from PDF
  const pdfResult = await extractTextFromPdfBase64(base64Content)
  const extractedText = pdfResult.success ? pdfResult.text.trim() : ''

  // Step 2: If text extraction succeeded with meaningful text, use text-based LLM
  if (extractedText.length >= MIN_PDF_TEXT_LENGTH) {
    console.log('[Extractor] PDF text extracted:', {
      pageCount: pdfResult.pageCount,
      textLength: extractedText.length,
    })

    const client = await getTextClient()
    
    const response = await client.chat.completions.create({
      model: TEXT_DEPLOYMENT,
      messages: [
        { role: 'user', content: buildTextAnalysisPrompt(extractedText) }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from LLM')
    }

    const data = parseTextAnalysisResponse(content)
    const confidence = calculateConfidence(data)

    console.log('[Extractor] PDF text analysis complete:', {
      processingTimeMs: Date.now() - startTime,
      invoiceNumber: data.invoiceNumber,
      supplier: data.supplierName,
    })

    return { data, confidence, rawText: extractedText }
  }

  // Step 3: Fallback — scanned PDF with no extractable text → Vision API
  console.log('[Extractor] PDF has no extractable text (length=%d), falling back to Vision API', extractedText.length)
  const visionResult = await extractFromImage(base64Content, 'application/pdf')

  console.log('[Extractor] PDF Vision fallback complete:', {
    processingTimeMs: Date.now() - startTime,
    invoiceNumber: visionResult.data.invoiceNumber,
    supplier: visionResult.data.supplierName,
  })

  return { data: visionResult.data, confidence: visionResult.confidence, rawText: undefined }
}

/**
 * Main extraction function - orchestrates based on file type
 */
export async function extractDocument(request: DocumentExtractRequest): Promise<ExtractionResult> {
  const startTime = Date.now()

  // Validate MIME type
  if (!isSupportedForExtraction(request.mimeType)) {
    return {
      success: false,
      confidence: 0,
      extractedAt: new Date().toISOString(),
      sourceType: 'pdf',
      error: `Nieobsługiwany typ pliku: ${request.mimeType}. Obsługiwane: PDF, JPEG, PNG, WebP, GIF`,
    }
  }

  const sourceType = getExtractionType(request.mimeType)!

  try {
    let data: ExtractedInvoiceData
    let confidence: number
    let rawText: string | undefined

    if (sourceType === 'pdf') {
      const result = await extractFromPdf(request.content)
      data = result.data
      confidence = result.confidence
      rawText = result.rawText
    } else {
      const result = await extractFromImage(request.content, request.mimeType)
      data = result.data
      confidence = result.confidence
    }

    return {
      success: true,
      data,
      confidence,
      extractedAt: new Date().toISOString(),
      sourceType,
      processingTimeMs: Date.now() - startTime,
      rawText,
    }
  } catch (error) {
    console.error('[Extractor] Extraction failed:', error)

    return {
      success: false,
      confidence: 0,
      extractedAt: new Date().toISOString(),
      sourceType,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Extraction failed',
    }
  }
}

/**
 * Reset clients (for testing)
 */
export function resetExtractorClients(): void {
  textClient = null
  clientInitPromise = null
}
