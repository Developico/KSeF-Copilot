/**
 * Cost Document Extractor
 * 
 * Orchestrates cost document extraction based on file type:
 * - PDF: Extract text with pdf-parse, then analyze with LLM
 * - Image: Use GPT-4o Vision directly
 * 
 * Reuses the same OpenAI infrastructure as invoice extraction
 * but with cost-document-specific prompts and schemas.
 */

import OpenAI from 'openai'
import { getSecret } from '../keyvault/secrets'
import { loadPrompt, fillPromptTemplate } from '../prompts'
import { extractTextFromPdfBase64 } from './pdf-parser'
import { getExtractionType, isSupportedForExtraction } from './schemas'
import type { DocumentExtractRequest } from './schemas'
import type { ExtractedCostDocumentData, CostDocumentExtractionResult } from './cost-document-schemas'
import { ExtractedCostDocumentDataSchema } from './cost-document-schemas'

// Key Vault secret names
const KV_OPENAI_ENDPOINT = 'AZURE-OPENAI-ENDPOINT'
const KV_OPENAI_API_KEY = 'AZURE-OPENAI-API-KEY'

const TEXT_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'
const VISION_DEPLOYMENT = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'

// Singleton clients
let textClient: OpenAI | null = null
let textClientPromise: Promise<OpenAI> | null = null
let visionClient: OpenAI | null = null
let visionClientPromise: Promise<OpenAI> | null = null

async function getOpenAIConfig() {
  let endpoint = await getSecret(KV_OPENAI_ENDPOINT).catch(() => undefined)
  let apiKey = await getSecret(KV_OPENAI_API_KEY).catch(() => undefined)
  if (!endpoint) endpoint = process.env.AZURE_OPENAI_ENDPOINT
  if (!apiKey) apiKey = process.env.AZURE_OPENAI_API_KEY
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI credentials not configured')
  }
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'
  return { endpoint, apiKey, apiVersion }
}

async function getTextClient(): Promise<OpenAI> {
  if (textClient) return textClient
  if (textClientPromise) return textClientPromise
  textClientPromise = (async () => {
    const config = await getOpenAIConfig()
    textClient = new OpenAI({
      baseURL: `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${TEXT_DEPLOYMENT}`,
      apiKey: config.apiKey,
      defaultQuery: { 'api-version': config.apiVersion },
      defaultHeaders: { 'api-key': config.apiKey },
    })
    return textClient
  })()
  return textClientPromise
}

async function getVisionClient(): Promise<OpenAI> {
  if (visionClient) return visionClient
  if (visionClientPromise) return visionClientPromise
  visionClientPromise = (async () => {
    const config = await getOpenAIConfig()
    visionClient = new OpenAI({
      baseURL: `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${VISION_DEPLOYMENT}`,
      apiKey: config.apiKey,
      defaultQuery: { 'api-version': config.apiVersion },
      defaultHeaders: { 'api-key': config.apiKey },
    })
    return visionClient
  })()
  return visionClientPromise
}

/**
 * Parse JSON response from AI, stripping markdown fences
 */
function parseResponse(content: string): ExtractedCostDocumentData {
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  const parsed = JSON.parse(jsonStr)
  const sanitized = sanitizeExtractedCostDocumentData(parsed)
  return ExtractedCostDocumentDataSchema.partial().parse(sanitized) as ExtractedCostDocumentData
}

function normalizePostalCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const raw = value.trim()
  if (!raw) return undefined

  // Prefer an explicit postal-code token if OCR mixed whole address into this field.
  const plMatch = raw.match(/\b\d{2}-\d{3}\b/)
  if (plMatch) return plMatch[0]

  const genericMatch = raw.match(/\b[A-Za-z0-9][A-Za-z0-9\- ]{2,19}\b/)
  return (genericMatch?.[0] || raw).slice(0, 20)
}

function sanitizeExtractedCostDocumentData(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed

  const result = parsed as Record<string, unknown>
  const issuerAddress = result.issuerAddress
  if (!issuerAddress || typeof issuerAddress !== 'object') return result

  const issuer = { ...(issuerAddress as Record<string, unknown>) }
  const normalizedPostalCode = normalizePostalCode(issuer.postalCode)

  if (normalizedPostalCode !== undefined) {
    issuer.postalCode = normalizedPostalCode
  }

  result.issuerAddress = issuer
  return result
}

/**
 * Calculate confidence score based on extracted fields.
 * Cost documents may not have all invoice-like fields (e.g. receipts lack NIP),
 * so we weight documentType and grossAmount higher.
 */
function calculateConfidence(data: ExtractedCostDocumentData): number {
  const keyFields = [
    data.documentType,
    data.documentNumber,
    data.issueDate,
    data.issuerName,
    data.grossAmount,
  ]

  const filled = keyFields.filter(f => f !== undefined && f !== null && f !== '').length
  let confidence = filled / keyFields.length

  // Bonuses
  if (data.items && data.items.length > 0) confidence += 0.1
  if (data.issuerNip) confidence += 0.05
  if (data.netAmount !== undefined) confidence += 0.05
  if (data.issuerAddress?.city) confidence += 0.05

  return Math.min(1, confidence)
}

const MIN_PDF_TEXT_LENGTH = 50

/**
 * Extract data from PDF using text extraction + LLM analysis.
 * Falls back to Vision API for scanned PDFs.
 */
async function extractFromPdf(base64Content: string): Promise<{
  data: ExtractedCostDocumentData
  confidence: number
  rawText?: string
}> {
  const pdfResult = await extractTextFromPdfBase64(base64Content)
  const extractedText = pdfResult.success ? pdfResult.text.trim() : ''

  if (extractedText.length >= MIN_PDF_TEXT_LENGTH) {
    const maxChars = 8000
    const truncatedText = extractedText.length > maxChars
      ? extractedText.slice(0, maxChars) + '\n...[skrócono]'
      : extractedText

    const promptTemplate = loadPrompt('cost-document-pdf-text-extraction')
    const prompt = fillPromptTemplate(promptTemplate, { pdfText: truncatedText })

    const client = await getTextClient()
    const response = await client.chat.completions.create({
      model: TEXT_DEPLOYMENT,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from LLM')

    const data = parseResponse(content)
    return { data, confidence: calculateConfidence(data), rawText: extractedText }
  }

  // Fallback to Vision for scanned PDFs
  console.log('[CostDocExtractor] PDF has no extractable text, falling back to Vision API')
  return extractFromImage(base64Content, 'application/pdf')
}

/**
 * Extract data from image using GPT-4o Vision
 */
async function extractFromImage(base64Image: string, mimeType: string): Promise<{
  data: ExtractedCostDocumentData
  confidence: number
}> {
  const client = await getVisionClient()
  const prompt = loadPrompt('cost-document-vision-extraction')

  const response = await client.chat.completions.create({
    model: VISION_DEPLOYMENT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from Vision model')

  const data = parseResponse(content)
  return { data, confidence: calculateConfidence(data) }
}

/**
 * Main extraction function - orchestrates based on file type
 */
export async function extractCostDocument(request: DocumentExtractRequest): Promise<CostDocumentExtractionResult> {
  const startTime = Date.now()

  if (!isSupportedForExtraction(request.mimeType)) {
    return {
      success: false,
      confidence: 0,
      extractedAt: new Date().toISOString(),
      sourceType: 'image',
      error: `Unsupported file type: ${request.mimeType}`,
    }
  }

  const extractionType = getExtractionType(request.mimeType)!

  try {
    let data: ExtractedCostDocumentData
    let confidence: number
    let rawText: string | undefined

    if (extractionType === 'pdf') {
      const result = await extractFromPdf(request.content)
      data = result.data
      confidence = result.confidence
      rawText = result.rawText
    } else {
      const result = await extractFromImage(request.content, request.mimeType)
      data = result.data
      confidence = result.confidence
    }

    console.log('[CostDocExtractor] Extraction complete:', {
      processingTimeMs: Date.now() - startTime,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      issuer: data.issuerName,
      gross: data.grossAmount,
      confidence,
    })

    return {
      success: true,
      data,
      confidence,
      extractedAt: new Date().toISOString(),
      sourceType: extractionType,
      processingTimeMs: Date.now() - startTime,
      rawText,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[CostDocExtractor] Extraction failed:', errorMessage)

    return {
      success: false,
      confidence: 0,
      extractedAt: new Date().toISOString(),
      sourceType: extractionType,
      processingTimeMs: Date.now() - startTime,
      error: errorMessage,
    }
  }
}

/**
 * Reset clients (for testing)
 */
export function resetCostDocumentExtractorClients(): void {
  textClient = null
  textClientPromise = null
  visionClient = null
  visionClientPromise = null
}
