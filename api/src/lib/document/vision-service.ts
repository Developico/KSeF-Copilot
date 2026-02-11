/**
 * Vision Service for Document Extraction
 * 
 * Uses Azure OpenAI GPT-4o with vision capabilities to extract
 * structured data from invoice images.
 */

import OpenAI from 'openai'
import { getSecret } from '../keyvault/secrets'
import { loadPrompt } from '../prompts'
import type { ExtractedInvoiceData } from './schemas'
import { ExtractedInvoiceDataSchema } from './schemas'

// Key Vault secret names (same as categorization)
const KV_OPENAI_ENDPOINT = 'AZURE-OPENAI-ENDPOINT'
const KV_OPENAI_API_KEY = 'AZURE-OPENAI-API-KEY'

// Vision model deployment (GPT-4o-mini supports images too)
const VISION_DEPLOYMENT = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'

// Singleton client (shared with categorization service)
let visionClient: OpenAI | null = null
let clientInitPromise: Promise<OpenAI> | null = null

/**
 * OpenAI configuration for vision
 */
interface VisionConfig {
  endpoint: string
  apiKey: string
  deployment: string
  apiVersion: string
}

/**
 * Get OpenAI configuration from Key Vault or environment
 */
async function getVisionConfig(): Promise<VisionConfig> {
  let endpoint: string | undefined
  let apiKey: string | undefined
  
  try {
    endpoint = await getSecret(KV_OPENAI_ENDPOINT)
  } catch (kvError) {
    console.warn('[Vision] Key Vault error for endpoint:', kvError instanceof Error ? kvError.message : kvError)
  }
  
  try {
    apiKey = await getSecret(KV_OPENAI_API_KEY)
  } catch (kvError) {
    console.warn('[Vision] Key Vault error for API key:', kvError instanceof Error ? kvError.message : kvError)
  }

  // Fallback to environment variables
  if (!endpoint) endpoint = process.env.AZURE_OPENAI_ENDPOINT
  if (!apiKey) apiKey = process.env.AZURE_OPENAI_API_KEY

  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure OpenAI credentials not configured for Vision. ' +
      'Set AZURE-OPENAI-ENDPOINT and AZURE-OPENAI-API-KEY in Key Vault.'
    )
  }

  return { endpoint, apiKey, deployment: VISION_DEPLOYMENT, apiVersion }
}

/**
 * Get or create Vision client (singleton)
 */
async function getVisionClient(): Promise<OpenAI> {
  if (visionClient) return visionClient

  if (clientInitPromise) return clientInitPromise

  clientInitPromise = (async () => {
    const config = await getVisionConfig()

    visionClient = new OpenAI({
      baseURL: `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${config.deployment}`,
      apiKey: config.apiKey,
      defaultQuery: { 'api-version': config.apiVersion },
      defaultHeaders: { 'api-key': config.apiKey },
    })

    console.log('[Vision] Client initialized:', {
      endpoint: config.endpoint,
      deployment: config.deployment,
    })

    return visionClient
  })()

  return clientInitPromise
}

/**
 * Build extraction prompt for invoice image
 * Uses external prompt template from prompts/vision-extraction.prompt.md
 */
function buildExtractionPrompt(): string {
  return loadPrompt('vision-extraction')
}

/**
 * Parse extraction response from AI
 */
function parseExtractionResponse(content: string): ExtractedInvoiceData {
  // Remove potential markdown code blocks
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(jsonStr)
  
  // Validate with Zod schema (partial - allows missing fields)
  const result = ExtractedInvoiceDataSchema.partial().parse(parsed)
  
  return result as ExtractedInvoiceData
}

/**
 * Extract invoice data from an image using GPT-4o Vision
 * 
 * @param base64Image - Base64 encoded image content
 * @param mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns Extracted invoice data
 */
export async function extractFromImage(
  base64Image: string,
  mimeType: string
): Promise<{ data: ExtractedInvoiceData; confidence: number }> {
  const client = await getVisionClient()
  const startTime = Date.now()

  console.log('[Vision] Starting image extraction...')

  const response = await client.chat.completions.create({
    model: VISION_DEPLOYMENT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildExtractionPrompt() },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high', // High detail for invoice text
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.1, // Low temperature for consistent extraction
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from Vision model')
  }

  const data = parseExtractionResponse(content)
  const processingTime = Date.now() - startTime

  console.log('[Vision] Extraction complete:', {
    processingTimeMs: processingTime,
    invoiceNumber: data.invoiceNumber,
    supplier: data.supplierName,
    gross: data.grossAmount,
  })

  // Estimate confidence based on how many key fields were extracted
  const confidence = calculateExtractionConfidence(data)

  return { data, confidence }
}

/**
 * Calculate confidence score based on extracted fields
 */
function calculateExtractionConfidence(data: ExtractedInvoiceData): number {
  const keyFields = [
    data.invoiceNumber,
    data.issueDate,
    data.supplierName,
    data.supplierNip,
    data.grossAmount,
    data.netAmount,
    data.vatAmount,
  ]

  const filledCount = keyFields.filter(f => f !== undefined && f !== null && f !== '').length
  const baseConfidence = filledCount / keyFields.length

  // Bonus for having items
  const itemsBonus = data.items && data.items.length > 0 ? 0.1 : 0

  // Bonus for address
  const addressBonus = data.supplierAddress?.city ? 0.05 : 0

  return Math.min(1, baseConfidence + itemsBonus + addressBonus)
}

/**
 * Reset vision client (for testing)
 */
export function resetVisionClient(): void {
  visionClient = null
  clientInitPromise = null
}
