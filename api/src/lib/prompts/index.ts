/**
 * Prompt Loader
 * 
 * Loads prompt templates from markdown files for easy editing
 * without modifying TypeScript code.
 * 
 * Usage:
 *   const prompt = await loadPrompt('categorization')
 *   const filled = fillPromptTemplate(prompt, { supplierName: 'Acme' })
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// Prompt file names (without extension)
export type PromptName = 
  | 'categorization'
  | 'vision-extraction'
  | 'pdf-text-extraction'
  | 'cost-document-vision-extraction'
  | 'cost-document-pdf-text-extraction'

// Cache for loaded prompts (loaded once at startup)
const promptCache = new Map<PromptName, string>()

/**
 * Get the directory where prompt files are stored
 */
function getPromptsDir(): string {
  return __dirname
}

/**
 * Load a prompt template from file
 * Templates are cached after first load for performance
 */
export function loadPrompt(name: PromptName): string {
  // Check cache first
  const cached = promptCache.get(name)
  if (cached) {
    return cached
  }

  const filePath = join(getPromptsDir(), `${name}.prompt.md`)
  
  try {
    // Read the file and strip the markdown header line if present
    const content = readFileSync(filePath, 'utf-8')
    
    // Remove first line if it starts with "# Prompt:"
    const lines = content.split('\n')
    const promptContent = lines[0].startsWith('# Prompt:') 
      ? lines.slice(2).join('\n').trim()  // Skip header + empty line
      : content.trim()
    
    promptCache.set(name, promptContent)
    return promptContent
  } catch (error) {
    console.error(`[Prompts] Failed to load prompt "${name}":`, error)
    throw new Error(`Prompt file not found: ${name}.prompt.md`)
  }
}

/**
 * Fill template placeholders with values
 * Placeholders use {{variableName}} syntax
 * 
 * @example
 * fillPromptTemplate('Hello {{name}}!', { name: 'World' })
 * // Returns: 'Hello World!'
 */
export function fillPromptTemplate(
  template: string, 
  variables: Record<string, string | number | undefined>
): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replaceAll(placeholder, value?.toString() ?? '')
  }
  
  return result
}

/**
 * Load and fill a prompt in one step
 */
export function getPrompt(
  name: PromptName,
  variables?: Record<string, string | number | undefined>
): string {
  const template = loadPrompt(name)
  return variables ? fillPromptTemplate(template, variables) : template
}

/**
 * Clear prompt cache (useful for development/hot-reload)
 */
export function clearPromptCache(): void {
  promptCache.clear()
  console.log('[Prompts] Cache cleared')
}

/**
 * Preload all prompts into cache
 * Call this at application startup for best performance
 */
export function preloadPrompts(): void {
  const promptNames: PromptName[] = [
    'categorization',
    'vision-extraction',
    'pdf-text-extraction'
  ]
  
  for (const name of promptNames) {
    try {
      loadPrompt(name)
      console.log(`[Prompts] Loaded: ${name}`)
    } catch (error) {
      console.warn(`[Prompts] Failed to preload: ${name}`)
    }
  }
}
