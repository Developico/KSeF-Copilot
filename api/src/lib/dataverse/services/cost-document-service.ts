/**
 * Cost Document Service
 *
 * CRUD operations for non-invoice cost documents in Dataverse.
 */

import { dataverseClient } from '../client'
import { DV, PAYMENT_STATUS, COST_DOCUMENT_STATUS, COST_DOCUMENT_SOURCE, COST_DOCUMENT_TYPE } from '../config'
import { mapDvCostDocumentToApp, mapAppCostDocumentToDv } from '../cost-document-mapper'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import { CostDocumentTypeValues, CostDocumentStatusValues, CostDocumentSourceValues } from '../entities'
import type { DvCostDocument } from '../../../types/dataverse'
import type { CostDocument, CostDocumentCreate, CostDocumentUpdate, CostDocumentListParams } from '../../../types/cost-document'

/**
 * Build OData filter string from CostDocumentListParams
 */
function buildCostDocumentFilter(filters: CostDocumentListParams): string {
  const s = DV.costDocument
  const conditions: string[] = []

  if (filters.settingId) {
    conditions.push(`${s.settingLookup} eq ${filters.settingId}`)
  }

  if (filters.documentType) {
    const dvValue = CostDocumentTypeValues[filters.documentType as keyof typeof CostDocumentTypeValues]
    if (dvValue !== undefined) {
      conditions.push(`${s.documentType} eq ${dvValue}`)
    }
  }

  if (filters.paymentStatus) {
    const statusMap: Record<string, number> = {
      pending: PAYMENT_STATUS.PENDING,
      paid: PAYMENT_STATUS.PAID,
    }
    const val = statusMap[filters.paymentStatus]
    if (val !== undefined) {
      conditions.push(`${s.paymentStatus} eq ${val}`)
    }
  }

  if (filters.mpkCenterId) {
    conditions.push(`${s.mpkCenterLookup} eq ${filters.mpkCenterId}`)
  }

  if (filters.mpkCenterIds && filters.mpkCenterIds.length > 0) {
    const orParts = filters.mpkCenterIds.map(id => `${s.mpkCenterLookup} eq ${id}`)
    conditions.push(`(${orParts.join(' or ')})`)
  }

  if (filters.approvalStatus) {
    const approvalMap: Record<string, number> = {
      Draft: 0, Pending: 1, Approved: 2, Rejected: 3, Cancelled: 4,
    }
    const val = approvalMap[filters.approvalStatus]
    if (val !== undefined) {
      conditions.push(`${s.approvalStatus} eq ${val}`)
    }
  }

  if (filters.category) {
    conditions.push(`${s.category} eq '${escapeOData(filters.category)}'`)
  }

  if (filters.status) {
    const dvValue = CostDocumentStatusValues[filters.status as keyof typeof CostDocumentStatusValues]
    if (dvValue !== undefined) {
      conditions.push(`${s.status} eq ${dvValue}`)
    }
  }

  if (filters.source) {
    const dvValue = CostDocumentSourceValues[filters.source as keyof typeof CostDocumentSourceValues]
    if (dvValue !== undefined) {
      conditions.push(`${s.source} eq ${dvValue}`)
    }
  }

  if (filters.fromDate) {
    conditions.push(`${s.documentDate} ge ${filters.fromDate}`)
  }

  if (filters.toDate) {
    conditions.push(`${s.documentDate} le ${filters.toDate}`)
  }

  if (filters.dueDateFrom) {
    conditions.push(`${s.dueDate} ge ${filters.dueDateFrom}`)
  }

  if (filters.dueDateTo) {
    conditions.push(`${s.dueDate} le ${filters.dueDateTo}`)
  }

  if (filters.minAmount !== undefined) {
    conditions.push(`${s.grossAmount} ge ${filters.minAmount}`)
  }

  if (filters.maxAmount !== undefined) {
    conditions.push(`${s.grossAmount} le ${filters.maxAmount}`)
  }

  if (filters.issuerName) {
    conditions.push(`contains(${s.issuerName}, '${escapeOData(filters.issuerName)}')`)
  }

  if (filters.issuerNip) {
    conditions.push(`${s.issuerNip} eq '${escapeOData(filters.issuerNip)}'`)
  }

  if (filters.search) {
    const term = escapeOData(filters.search)
    conditions.push(
      `(contains(${s.name}, '${term}') or contains(${s.issuerName}, '${term}') or contains(${s.description}, '${term}'))`
    )
  }

  return conditions.join(' and ')
}

/**
 * Build OData query string
 */
function buildCostDocumentQuery(filters: CostDocumentListParams): string {
  const s = DV.costDocument
  const parts: string[] = []

  const filter = buildCostDocumentFilter(filters)
  if (filter) {
    parts.push(`$filter=${filter}`)
  }

  if (filters.top) {
    parts.push(`$top=${filters.top}`)
  }

  if (filters.skip) {
    parts.push(`$skip=${filters.skip}`)
  }

  // Order by
  const orderByFieldMap: Record<string, string> = {
    documentDate: s.documentDate,
    grossAmount: s.grossAmount,
    issuerName: s.issuerName,
    dueDate: s.dueDate,
  }
  const orderField = filters.orderBy ? orderByFieldMap[filters.orderBy] : s.documentDate
  const orderDir = filters.orderDirection || 'desc'
  parts.push(`$orderby=${orderField} ${orderDir}`)

  return parts.join('&')
}

/**
 * Cost Document Service class
 */
export class CostDocumentService {
  private entitySet = DV.costDocument.entitySet

  /**
   * Get paginated cost documents
   */
  async list(filters: CostDocumentListParams = {}): Promise<{ items: CostDocument[]; count?: number }> {
    const query = buildCostDocumentQuery({ ...filters, top: filters.top || 50 })
    logDataverseInfo('CostDocumentService.list', 'Listing cost documents', { filters })

    try {
      const response = await dataverseClient.list<DvCostDocument>(this.entitySet, `${query}&$count=true`)
      return {
        items: response.value.map(mapDvCostDocumentToApp),
        count: response['@odata.count'],
      }
    } catch (error) {
      logDataverseError('CostDocumentService.list', error)
      throw error
    }
  }

  /**
   * Get all cost documents (no pagination)
   */
  async getAll(filters: CostDocumentListParams = {}): Promise<CostDocument[]> {
    const query = buildCostDocumentQuery(filters)
    logDataverseInfo('CostDocumentService.getAll', 'Fetching all cost documents', { filters })

    try {
      const records = await dataverseClient.listAll<DvCostDocument>(this.entitySet, query)
      return records.map(mapDvCostDocumentToApp)
    } catch (error) {
      logDataverseError('CostDocumentService.getAll', error)
      throw error
    }
  }

  /**
   * Get cost document by ID
   */
  async getById(id: string): Promise<CostDocument | null> {
    logDataverseInfo('CostDocumentService.getById', 'Fetching cost document', { id })

    try {
      const record = await dataverseClient.getById<DvCostDocument>(this.entitySet, id)
      return record ? mapDvCostDocumentToApp(record) : null
    } catch (error) {
      logDataverseError('CostDocumentService.getById', error)
      throw error
    }
  }

  /**
   * Create new cost document
   */
  async create(data: CostDocumentCreate): Promise<CostDocument> {
    logDataverseInfo('CostDocumentService.create', 'Creating cost document', { documentNumber: data.documentNumber })

    try {
      const partial: Partial<CostDocument> = {
        ...data,
        name: data.documentNumber,
        status: 'Draft' as CostDocument['status'],
        source: 'Manual' as CostDocument['source'],
        paymentStatus: 'pending',
      } as Partial<CostDocument>

      const payload = mapAppCostDocumentToDv(partial)

      // Set defaults
      const s = DV.costDocument
      if (!(s.paymentStatus in payload)) {
        payload[s.paymentStatus] = PAYMENT_STATUS.PENDING
      }
      if (!(s.status in payload)) {
        payload[s.status] = COST_DOCUMENT_STATUS.DRAFT
      }
      if (!(s.source in payload)) {
        payload[s.source] = COST_DOCUMENT_SOURCE.MANUAL
      }

      const result = await dataverseClient.create<DvCostDocument>(this.entitySet, payload)

      const dvIdField = DV.costDocument.id
      if (result && dvIdField in (result as unknown as Record<string, unknown>)) {
        return mapDvCostDocumentToApp(result as unknown as DvCostDocument)
      }
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      return {
        ...data,
        id: (result as { id?: string })?.id || '',
        name: data.documentNumber,
        status: 'Draft',
        source: 'Manual',
        paymentStatus: 'pending',
        hasDocument: false,
        createdOn: new Date().toISOString(),
      } as CostDocument
    } catch (error) {
      logDataverseError('CostDocumentService.create', error)
      throw error
    }
  }

  /**
   * Update existing cost document
   */
  async update(id: string, data: CostDocumentUpdate): Promise<CostDocument | null> {
    logDataverseInfo('CostDocumentService.update', 'Updating cost document', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppCostDocumentToDv(data as Partial<CostDocument>)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('CostDocumentService.update', error)
      throw error
    }
  }

  /**
   * Delete cost document
   */
  async delete(id: string): Promise<void> {
    logDataverseInfo('CostDocumentService.delete', 'Deleting cost document', { id })

    try {
      await dataverseClient.delete(this.entitySet, id)
    } catch (error) {
      logDataverseError('CostDocumentService.delete', error)
      throw error
    }
  }

  /**
   * Get cost documents summary for dashboard
   */
  async getSummary(settingId: string): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    totalAmount: number
  }> {
    logDataverseInfo('CostDocumentService.getSummary', 'Getting summary', { settingId })

    try {
      const documents = await this.getAll({ settingId })
      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalAmount = 0

      for (const doc of documents) {
        byType[doc.documentType] = (byType[doc.documentType] || 0) + 1
        byStatus[doc.status] = (byStatus[doc.status] || 0) + 1
        totalAmount += doc.grossAmountPln ?? doc.grossAmount
      }

      return {
        total: documents.length,
        byType,
        byStatus,
        totalAmount,
      }
    } catch (error) {
      logDataverseError('CostDocumentService.getSummary', error)
      throw error
    }
  }

  /**
   * Bulk delete cost documents matching filters
   */
  async bulkDelete(
    filters: CostDocumentListParams,
    options?: {
      batchSize?: number
      onProgress?: (deleted: number, failed: number, total: number) => void
    },
  ): Promise<{ deleted: number; failed: number; total: number; errors: string[] }> {
    const { batchSize = 50, onProgress } = options || {}

    logDataverseInfo('CostDocumentService.bulkDelete', 'Starting bulk delete', { filters })

    const allDocs = await this.getAll(filters)
    const total = allDocs.length

    let deleted = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < allDocs.length; i += batchSize) {
      const batch = allDocs.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map(doc => this.delete(doc.id)),
      )

      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        if (result.status === 'fulfilled') {
          deleted++
        } else {
          failed++
          errors.push(`Failed to delete ${batch[j].id}: ${result.reason?.message || 'Unknown error'}`)
        }
      }

      if (onProgress) {
        onProgress(deleted, failed, total)
      }

      if (i + batchSize < allDocs.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    logDataverseInfo('CostDocumentService.bulkDelete', `Bulk delete completed: ${deleted}/${total}`, { deleted, failed })
    return { deleted, failed, total, errors }
  }
}

export const costDocumentService = new CostDocumentService()
