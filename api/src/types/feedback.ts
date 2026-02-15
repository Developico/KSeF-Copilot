import { z } from 'zod'

/**
 * AI Feedback - records user corrections to AI suggestions
 * Used for improving AI categorization over time
 */

export const FeedbackType = {
  Applied: 'applied',     // User accepted AI suggestion without changes
  Modified: 'modified',   // User modified AI suggestion
  Rejected: 'rejected',   // User set different value without AI
} as const

export type FeedbackType = (typeof FeedbackType)[keyof typeof FeedbackType]

export interface AIFeedback {
  id: string
  invoiceId: string
  tenantNip: string
  
  // Original invoice context
  supplierNip: string
  supplierName: string
  invoiceDescription?: string
  
  // AI Suggestions
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiConfidence?: number
  
  // User's final choice
  userMpk?: string
  userCategory?: string
  
  // Feedback metadata
  feedbackType: FeedbackType
  createdAt: string
  createdBy?: string
}

/**
 * Schema for creating AI feedback
 */
export const CreateAIFeedbackSchema = z.object({
  invoiceId: z.string().uuid(),
  feedbackType: z.enum(['applied', 'modified', 'rejected']),
})

export type CreateAIFeedbackInput = z.infer<typeof CreateAIFeedbackSchema>

/**
 * AI Learning context - aggregated data for prompts
 */
export interface AILearningContext {
  supplierNip: string
  supplierName: string
  preferredMpk: string
  preferredCategory: string
  confidence: number // Based on how consistent user choices are
  sampleCount: number
}
