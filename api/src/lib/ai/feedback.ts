/**
 * AI Feedback Service
 * Handles recording user corrections and learning from them
 */

import { DataverseClient } from '../dataverse/client'
import { AIFeedbackEntity, FeedbackTypeValues } from '../dataverse/entities'
import { escapeOData } from '../dataverse/odata-utils'
import type { AIFeedback, AILearningContext, FeedbackType } from '../../types/feedback'
import type { Invoice } from '../../types/invoice'

const f = AIFeedbackEntity.fields

/**
 * Record AI feedback when user confirms or modifies AI suggestions
 */
export async function recordAIFeedback(
  invoice: Invoice,
  userMpk: string | undefined,
  userCategory: string | undefined,
  feedbackType: FeedbackType
): Promise<AIFeedback | null> {
  // Only record if there was an AI suggestion
  if (!invoice.aiMpkSuggestion && !invoice.aiCategorySuggestion) {
    return null
  }

  const client = new DataverseClient()
  
  const payload: Record<string, unknown> = {
    // Use @odata.bind for Lookup field
    [f.invoiceIdBind]: `/${AIFeedbackEntity.parentEntitySet}(${invoice.id})`,
    [f.tenantNip]: invoice.tenantNip,
    [f.supplierNip]: invoice.supplierNip,
    [f.supplierName]: invoice.supplierName,
    [f.invoiceDescription]: invoice.rawXml?.slice(0, 500), // First 500 chars for context
    [f.aiMpkSuggestion]: invoice.aiMpkSuggestion,
    [f.aiCategorySuggestion]: invoice.aiCategorySuggestion,
    [f.aiConfidence]: invoice.aiConfidence,
    [f.userMpk]: userMpk,
    [f.userCategory]: userCategory,
    [f.feedbackType]: FeedbackTypeValues[feedbackType],
  }

  try {
    const result = await client.request<{ id: string }>(AIFeedbackEntity.entitySet, {
      method: 'POST',
      body: payload,
    })
    
    console.log(`[AI Feedback] Recorded: ${feedbackType} for invoice ${invoice.id}`)
    
    return {
      id: result?.id || '',
      invoiceId: invoice.id,
      tenantNip: invoice.tenantNip,
      supplierNip: invoice.supplierNip,
      supplierName: invoice.supplierName,
      aiMpkSuggestion: invoice.aiMpkSuggestion,
      aiCategorySuggestion: invoice.aiCategorySuggestion,
      aiConfidence: invoice.aiConfidence,
      userMpk,
      userCategory,
      feedbackType,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`[AI Feedback] Failed to record: ${error}`)
    return null
  }
}

/**
 * Get learning context for a supplier based on historical feedback
 * This aggregates past user choices for the same supplier
 */
export async function getLearningContextForSupplier(
  tenantNip: string,
  supplierNip: string
): Promise<AILearningContext | null> {
  const client = new DataverseClient()
  
  const filter = `${f.tenantNip} eq '${escapeOData(tenantNip)}' and ${f.supplierNip} eq '${escapeOData(supplierNip)}'`
  const select = `${f.userMpk},${f.userCategory},${f.supplierName}`
  const orderby = `${f.createdOn} desc`
  
  try {
    const result = await client.request<{ value: Record<string, unknown>[] }>(
      `${AIFeedbackEntity.entitySet}?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=${orderby}&$top=50`
    )

    if (!result?.value || result.value.length === 0) {
      return null
    }

    // Aggregate user choices
    const mpkCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    
    for (const record of result.value) {
      const userMpk = record[f.userMpk] as string
      const userCategory = record[f.userCategory] as string
      
      if (userMpk) {
        mpkCounts[userMpk] = (mpkCounts[userMpk] || 0) + 1
      }
      if (userCategory) {
        categoryCounts[userCategory] = (categoryCounts[userCategory] || 0) + 1
      }
    }

    // Find most common choices
    const preferredMpk = Object.entries(mpkCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    const preferredCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

    // Calculate confidence based on consistency
    const totalRecords = result.value.length
    const mpkConsistency = preferredMpk ? (mpkCounts[preferredMpk] / totalRecords) : 0
    const categoryConsistency = preferredCategory ? (categoryCounts[preferredCategory] / totalRecords) : 0
    const confidence = (mpkConsistency + categoryConsistency) / 2

    return {
      supplierNip,
      supplierName: result.value[0][f.supplierName] as string,
      preferredMpk,
      preferredCategory,
      confidence,
      sampleCount: totalRecords,
    }
  } catch (error) {
    console.error(`[AI Feedback] Failed to get learning context: ${error}`)
    return null
  }
}

/**
 * Get all learning contexts for a tenant (for prompt enhancement)
 */
export async function getAllLearningContexts(
  tenantNip: string,
  limit = 100
): Promise<AILearningContext[]> {
  const client = new DataverseClient()
  
  // Get unique suppliers with feedback
  const filter = `${f.tenantNip} eq '${escapeOData(tenantNip)}'`
  const select = `${f.supplierNip},${f.supplierName},${f.userMpk},${f.userCategory}`
  const orderby = `${f.createdOn} desc`
  
  try {
    const result = await client.request<{ value: Record<string, unknown>[] }>(
      `${AIFeedbackEntity.entitySet}?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=${orderby}&$top=500`
    )

    if (!result?.value || result.value.length === 0) {
      return []
    }

    // Group by supplier
    const supplierFeedback: Record<string, Record<string, unknown>[]> = {}
    
    for (const record of result.value) {
      const supplierNip = record[f.supplierNip] as string
      if (!supplierFeedback[supplierNip]) {
        supplierFeedback[supplierNip] = []
      }
      supplierFeedback[supplierNip].push(record)
    }

    // Aggregate per supplier
    const contexts: AILearningContext[] = []
    
    for (const [supplierNip, records] of Object.entries(supplierFeedback)) {
      if (contexts.length >= limit) break
      
      const mpkCounts: Record<string, number> = {}
      const categoryCounts: Record<string, number> = {}
      
      for (const record of records) {
        const userMpk = record[f.userMpk] as string
        const userCategory = record[f.userCategory] as string
        
        if (userMpk) mpkCounts[userMpk] = (mpkCounts[userMpk] || 0) + 1
        if (userCategory) categoryCounts[userCategory] = (categoryCounts[userCategory] || 0) + 1
      }

      const preferredMpk = Object.entries(mpkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      const preferredCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      
      const mpkConsistency = preferredMpk ? (mpkCounts[preferredMpk] / records.length) : 0
      const categoryConsistency = preferredCategory ? (categoryCounts[preferredCategory] / records.length) : 0

      contexts.push({
        supplierNip,
        supplierName: records[0][f.supplierName] as string,
        preferredMpk,
        preferredCategory,
        confidence: (mpkConsistency + categoryConsistency) / 2,
        sampleCount: records.length,
      })
    }

    return contexts.sort((a, b) => b.confidence - a.confidence)
  } catch (error) {
    console.error(`[AI Feedback] Failed to get all learning contexts: ${error}`)
    return []
  }
}

/**
 * Determine feedback type based on AI suggestions and user choices
 */
export function determineFeedbackType(
  aiMpkSuggestion: string | undefined,
  aiCategorySuggestion: string | undefined,
  userMpk: string | undefined,
  userCategory: string | undefined
): FeedbackType | null {
  // No AI suggestion - no feedback needed
  if (!aiMpkSuggestion && !aiCategorySuggestion) {
    return null
  }

  const mpkMatches = !aiMpkSuggestion || userMpk === aiMpkSuggestion
  const categoryMatches = !aiCategorySuggestion || userCategory === aiCategorySuggestion

  if (mpkMatches && categoryMatches) {
    return 'applied'
  }
  
  return 'modified'
}
