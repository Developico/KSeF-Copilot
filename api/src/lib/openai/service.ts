/**
 * OpenAI Service for Invoice Categorization
 * 
 * Uses Azure OpenAI to categorize invoices based on supplier and items.
 * Fetches credentials from Key Vault (production) or environment (dev).
 * 
 * Features:
 * - Single invoice categorization
 * - Batch categorization
 * - Supplier cache for faster repeated categorization
 */

import OpenAI from 'openai'
import { getSecret } from '../keyvault/secrets'
import { getLearningContextForSupplier, getAllLearningContexts } from '../ai/feedback'
import { getPrompt, fillPromptTemplate, loadPrompt } from '../prompts'
import { 
  type AICategorization, 
  type AiCategorizationRequest,
  AiCategorizationSchema,
  MPK 
} from '../../types/invoice'

// Key Vault secret names
const KV_OPENAI_ENDPOINT = 'AZURE-OPENAI-ENDPOINT'
const KV_OPENAI_API_KEY = 'AZURE-OPENAI-API-KEY'

// Singleton client
let openaiClient: OpenAI | null = null
let clientInitPromise: Promise<OpenAI> | null = null

/**
 * OpenAI configuration
 */
interface OpenAIConfig {
  endpoint: string
  apiKey: string
  deployment: string
  apiVersion: string
}

/**
 * Get OpenAI configuration from Key Vault or environment
 */
async function getOpenAIConfig(): Promise<OpenAIConfig> {
  // Try Key Vault first (production)
  let endpoint: string | undefined
  let apiKey: string | undefined
  
  try {
    endpoint = await getSecret(KV_OPENAI_ENDPOINT)
    console.log('[OpenAI] Got endpoint from Key Vault:', endpoint ? 'OK' : 'not found')
  } catch (kvError) {
    console.warn('[OpenAI] Key Vault error for endpoint:', kvError instanceof Error ? kvError.message : kvError)
  }
  
  try {
    apiKey = await getSecret(KV_OPENAI_API_KEY)
    console.log('[OpenAI] Got API key from Key Vault:', apiKey ? 'OK' : 'not found')
  } catch (kvError) {
    console.warn('[OpenAI] Key Vault error for API key:', kvError instanceof Error ? kvError.message : kvError)
  }

  // Fallback to environment variables (development)
  if (!endpoint) {
    endpoint = process.env.AZURE_OPENAI_ENDPOINT
    if (endpoint) console.log('[OpenAI] Using endpoint from environment')
  }
  if (!apiKey) {
    apiKey = process.env.AZURE_OPENAI_API_KEY
    if (apiKey) console.log('[OpenAI] Using API key from environment')
  }

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure OpenAI credentials not configured. ' +
      'Set AZURE-OPENAI-ENDPOINT and AZURE-OPENAI-API-KEY in Key Vault, ' +
      'or AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in environment.'
    )
  }

  return { endpoint, apiKey, deployment, apiVersion }
}

/**
 * Get or create OpenAI client (singleton with lazy initialization)
 */
async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) {
    return openaiClient
  }

  // Prevent multiple simultaneous initializations
  if (clientInitPromise) {
    return clientInitPromise
  }

  clientInitPromise = (async () => {
    const config = await getOpenAIConfig()

    openaiClient = new OpenAI({
      baseURL: `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${config.deployment}`,
      apiKey: config.apiKey,
      defaultQuery: { 'api-version': config.apiVersion },
      defaultHeaders: { 'api-key': config.apiKey },
    })

    console.log('[OpenAI] Client initialized:', {
      endpoint: config.endpoint,
      deployment: config.deployment,
    })

    return openaiClient
  })()

  return clientInitPromise
}

/**
 * Build categorization prompt for invoice with optional learning context
 * Uses external prompt template from prompts/categorization.prompt.md
 */
function buildCategorizationPrompt(
  request: AiCategorizationRequest,
  learningContext?: { supplierHint?: string; examples?: string }
): string {
  const itemsList = request.items?.length 
    ? `\n- Pozycje: ${request.items.join(', ')}`
    : ''
  
  const amountInfo = request.grossAmount 
    ? `\n- Kwota brutto: ${request.grossAmount.toFixed(2)} PLN`
    : ''

  // Add learning hints if available
  const learningHint = learningContext?.supplierHint
    ? `\n\nWAŻNE - Historia kategoryzacji dla tego dostawcy:\n${learningContext.supplierHint}`
    : ''
  
  const examplesSection = learningContext?.examples
    ? `\n\nPrzykłady kategoryzacji z historii firmy:\n${learningContext.examples}`
    : ''

  // Load prompt template from external file
  const promptTemplate = loadPrompt('categorization')
  
  return fillPromptTemplate(promptTemplate, {
    mpkValues: Object.values(MPK).join(', '),
    supplierName: request.supplierName,
    supplierNip: request.supplierNip,
    itemsList,
    amountInfo,
    learningHint,
    examplesSection,
  })
}

/**
 * Parse AI response to categorization result
 */
function parseCategorizationResponse(content: string): AICategorization {
  // Remove potential markdown code blocks
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(jsonStr)
  
  // Validate with Zod schema
  const result = AiCategorizationSchema.parse(parsed)
  
  return result
}

/**
 * Categorize single invoice using AI with learning from feedback
 */
export async function categorizeInvoice(
  request: AiCategorizationRequest,
  tenantNip?: string
): Promise<AICategorization> {
  const client = await getOpenAIClient()
  
  // Build learning context from feedback history
  let learningContext: { supplierHint?: string; examples?: string } | undefined
  
  if (tenantNip) {
    try {
      // Get specific supplier context
      const supplierContext = await getLearningContextForSupplier(tenantNip, request.supplierNip)
      if (supplierContext && supplierContext.sampleCount >= 2) {
        learningContext = {
          supplierHint: `Dla "${supplierContext.supplierName}" użytkownicy zazwyczaj wybierają: MPK="${supplierContext.preferredMpk}", Kategoria="${supplierContext.preferredCategory}" (pewność: ${Math.round(supplierContext.confidence * 100)}%, na podstawie ${supplierContext.sampleCount} faktur)`
        }
      }
      
      // Get general examples from other suppliers
      const allContexts = await getAllLearningContexts(tenantNip, 5)
      const otherExamples = allContexts
        .filter(c => c.supplierNip !== request.supplierNip && c.sampleCount >= 2)
        .slice(0, 3)
        .map(c => `- "${c.supplierName}" → MPK: ${c.preferredMpk}, Kategoria: ${c.preferredCategory}`)
        .join('\n')
      
      if (otherExamples) {
        learningContext = learningContext || {}
        learningContext.examples = otherExamples
      }
    } catch (error) {
      console.warn('[OpenAI] Failed to get learning context:', error)
    }
  }

  const prompt = buildCategorizationPrompt(request, learningContext)

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.3, // Lower temperature for more consistent categorization
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from AI model')
  }

  const categorization = parseCategorizationResponse(content)

  console.log('[OpenAI] Categorized invoice:', {
    invoiceId: request.invoiceId,
    supplier: request.supplierName,
    result: {
      mpk: categorization.mpk,
      category: categorization.category,
      description: categorization.description,
      confidence: categorization.confidence,
    },
    tokens: response.usage,
  })

  return categorization
}

/**
 * Categorize multiple invoices in batch
 * Processes sequentially to avoid rate limits
 */
export async function categorizeInvoicesBatch(
  requests: AiCategorizationRequest[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, AICategorization | Error>> {
  const results = new Map<string, AICategorization | Error>()

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i]
    
    try {
      const categorization = await categorizeInvoice(request)
      results.set(request.invoiceId, categorization)
    } catch (error) {
      results.set(request.invoiceId, error instanceof Error ? error : new Error(String(error)))
    }

    onProgress?.(i + 1, requests.length)

    // Small delay between requests to avoid rate limits
    if (i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Test AI connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  try {
    const client = await getOpenAIClient()
    const startTime = Date.now()

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Odpowiedz: OK' }],
      max_tokens: 10,
    })

    const latencyMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content

    return {
      success: true,
      message: `AI responded: ${content}`,
      latencyMs,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reset client (for testing or credential rotation)
 */
export function resetClient(): void {
  openaiClient = null
  clientInitPromise = null
}
