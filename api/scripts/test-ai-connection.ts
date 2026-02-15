/**
 * AI Connection Test Script
 * 
 * Tests connectivity to AI models using:
 * 1. GitHub Models (free, recommended for development)
 * 2. Azure OpenAI (requires deployed resource)
 * 
 * Usage:
 *   npx tsx scripts/test-ai-connection.ts [github|azure]
 * 
 * Environment variables:
 *   For GitHub: GITHUB_TOKEN (personal access token with models:read scope)
 *   For Azure:  AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT
 */

import OpenAI from 'openai'

// Test configuration
const TEST_PROMPT = 'Odpowiedz jednym słowem: jaki jest kolor nieba?'
const GITHUB_ENDPOINT = 'https://models.github.ai/inference'
const GITHUB_MODEL = 'openai/gpt-4o-mini'

async function testGitHubModels(): Promise<boolean> {
  console.log('\n🔷 Testing GitHub Models...')
  console.log('   Endpoint:', GITHUB_ENDPOINT)
  console.log('   Model:', GITHUB_MODEL)
  
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('❌ GITHUB_TOKEN not set!')
    console.log('   To get a token:')
    console.log('   1. Go to https://github.com/settings/tokens')
    console.log('   2. Generate new token (classic)')
    console.log('   3. Add "models:read" scope (or use fine-grained with Models permission)')
    console.log('   4. Set: $env:GITHUB_TOKEN="your-token"')
    return false
  }

  try {
    const client = new OpenAI({
      baseURL: GITHUB_ENDPOINT,
      apiKey: token,
    })

    console.log('   Sending test prompt...')
    const startTime = Date.now()
    
    const response = await client.chat.completions.create({
      model: GITHUB_MODEL,
      messages: [
        { role: 'user', content: TEST_PROMPT }
      ],
      max_tokens: 50,
    })

    const elapsed = Date.now() - startTime
    const answer = response.choices[0]?.message?.content?.trim()
    
    console.log('✅ GitHub Models - SUCCESS!')
    console.log('   Response:', answer)
    console.log('   Latency:', elapsed, 'ms')
    console.log('   Usage:', response.usage)
    
    return true
  } catch (error: any) {
    console.error('❌ GitHub Models - FAILED!')
    console.error('   Error:', error.message)
    if (error.status === 401) {
      console.log('   → Token is invalid or expired')
    } else if (error.status === 403) {
      console.log('   → Token lacks required permissions (models:read)')
    }
    return false
  }
}

async function testAzureOpenAI(): Promise<boolean> {
  console.log('\n🔶 Testing Azure OpenAI...')
  
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'
  
  console.log('   Endpoint:', endpoint || '(not set)')
  console.log('   Deployment:', deployment)
  console.log('   API Version:', apiVersion)
  
  if (!endpoint || !apiKey) {
    console.error('❌ Azure OpenAI credentials not configured!')
    console.log('   Required environment variables:')
    console.log('   - AZURE_OPENAI_ENDPOINT')
    console.log('   - AZURE_OPENAI_API_KEY')
    console.log('   - AZURE_OPENAI_DEPLOYMENT (optional, default: gpt-4o-mini)')
    return false
  }

  try {
    const client = new OpenAI({
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      apiKey: apiKey,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    })

    console.log('   Sending test prompt...')
    const startTime = Date.now()
    
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'user', content: TEST_PROMPT }
      ],
      max_tokens: 50,
    })

    const elapsed = Date.now() - startTime
    const answer = response.choices[0]?.message?.content?.trim()
    
    console.log('✅ Azure OpenAI - SUCCESS!')
    console.log('   Response:', answer)
    console.log('   Latency:', elapsed, 'ms')
    console.log('   Usage:', response.usage)
    
    return true
  } catch (error: any) {
    console.error('❌ Azure OpenAI - FAILED!')
    console.error('   Error:', error.message)
    if (error.status === 401) {
      console.log('   → API key is invalid')
    } else if (error.status === 404) {
      console.log('   → Deployment not found - check AZURE_OPENAI_DEPLOYMENT')
    }
    return false
  }
}

async function main() {
  console.log('========================================')
  console.log('  AI Connection Test - dvlp-ksef')
  console.log('========================================')
  
  const mode = process.argv[2] || 'github'
  let success = false
  
  if (mode === 'github' || mode === 'all') {
    success = await testGitHubModels()
  }
  
  if (mode === 'azure' || mode === 'all') {
    const azureSuccess = await testAzureOpenAI()
    success = success || azureSuccess
  }
  
  console.log('\n========================================')
  if (success) {
    console.log('🎉 At least one AI provider is working!')
    console.log('\nNext steps:')
    console.log('  1. Implement api/src/lib/openai-service.ts')
    console.log('  2. Add POST /api/invoices/categorize endpoint')
    console.log('  3. Test invoice categorization')
  } else {
    console.log('⚠️  No AI provider is configured correctly.')
    console.log('\nRecommendation: Use GitHub Models (free)')
    console.log('  1. Get token: https://github.com/settings/tokens')
    console.log('  2. Set: $env:GITHUB_TOKEN="ghp_..."')
    console.log('  3. Run: npx tsx scripts/test-ai-connection.ts github')
  }
  console.log('========================================')
  
  process.exit(success ? 0 : 1)
}

main()
