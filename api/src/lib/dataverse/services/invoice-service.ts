/**
 * Invoice Service
 * 
 * CRUD operations for KSeF invoices in Dataverse.
 */

import { dataverseClient } from '../client'
import { DV, KSEF_DIRECTION, PAYMENT_STATUS } from '../config'
import { mapDvInvoiceToApp, mapAppInvoiceToDv } from '../mappers'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvInvoice } from '../../../types/dataverse'
import type { Invoice, InvoiceCreate, InvoiceUpdate } from '../../../types/invoice'

/**
 * Filter options for listing invoices
 */
export interface InvoiceFilters {
  /** Filter by buyer NIP (tenant) */
  tenantNip?: string
  /** Filter by seller NIP (supplier) */
  supplierNip?: string
  /** Filter by payment status */
  paymentStatus?: 'pending' | 'paid' | 'overdue'
  /** Filter by KSeF direction */
  direction?: 'incoming' | 'outgoing'
  /** Filter by date range (invoiceDate) */
  dateFrom?: string
  dateTo?: string
  /** Filter by KSeF reference number */
  ksefReference?: string
  /** Search in invoice number or supplier name */
  search?: string
  /** Include only active records */
  activeOnly?: boolean
  /** Max results */
  top?: number
  /** Order by field */
  orderBy?: string
}

/**
 * Build OData filter string from InvoiceFilters
 */
function buildInvoiceFilter(filters: InvoiceFilters): string {
  const s = DV.invoice
  const conditions: string[] = []

  if (filters.activeOnly !== false) {
    conditions.push(`${s.stateCode} eq 0`)
  }

  if (filters.tenantNip) {
    conditions.push(`${s.buyerNip} eq '${escapeOData(filters.tenantNip)}'`)
  }

  if (filters.supplierNip) {
    conditions.push(`${s.sellerNip} eq '${escapeOData(filters.supplierNip)}'`)
  }

  if (filters.paymentStatus) {
    const statusMap: Record<string, number> = {
      pending: PAYMENT_STATUS.PENDING,
      paid: PAYMENT_STATUS.PAID,
      overdue: PAYMENT_STATUS.OVERDUE,
    }
    conditions.push(`${s.paymentStatus} eq ${statusMap[filters.paymentStatus]}`)
  }

  if (filters.direction) {
    const dirMap: Record<string, number> = {
      incoming: KSEF_DIRECTION.INCOMING,
      outgoing: KSEF_DIRECTION.OUTGOING,
    }
    conditions.push(`${s.direction} eq ${dirMap[filters.direction]}`)
  }

  if (filters.dateFrom) {
    conditions.push(`${s.invoiceDate} ge ${filters.dateFrom}`)
  }

  if (filters.dateTo) {
    conditions.push(`${s.invoiceDate} le ${filters.dateTo}`)
  }

  if (filters.ksefReference) {
    conditions.push(`${s.ksefReferenceNumber} eq '${escapeOData(filters.ksefReference)}'`)
  }

  if (filters.search) {
    const searchTerm = escapeOData(filters.search)
    conditions.push(
      `(contains(${s.name}, '${searchTerm}') or contains(${s.sellerName}, '${searchTerm}'))`
    )
  }

  return conditions.join(' and ')
}

/**
 * Build OData query string
 */
function buildInvoiceQuery(filters: InvoiceFilters): string {
  const s = DV.invoice
  const parts: string[] = []

  const filter = buildInvoiceFilter(filters)
  if (filter) {
    parts.push(`$filter=${filter}`)
  }

  if (filters.top) {
    parts.push(`$top=${filters.top}`)
  }

  const orderBy = filters.orderBy || `${s.invoiceDate} desc`
  parts.push(`$orderby=${orderBy}`)

  return parts.join('&')
}

/**
 * Invoice Service class
 */
export class InvoiceService {
  private entitySet = DV.invoice.entitySet

  /**
   * Get all invoices with optional filters
   */
  async getAll(filters: InvoiceFilters = {}): Promise<Invoice[]> {
    const query = buildInvoiceQuery(filters)
    logDataverseInfo('InvoiceService.getAll', 'Fetching invoices', { filters })

    try {
      const records = await dataverseClient.listAll<DvInvoice>(this.entitySet, query)
      return records.map(mapDvInvoiceToApp)
    } catch (error) {
      logDataverseError('InvoiceService.getAll', error)
      throw error
    }
  }

  /**
   * Get paginated invoices (first page only)
   */
  async list(filters: InvoiceFilters = {}): Promise<{ items: Invoice[]; count?: number }> {
    const query = buildInvoiceQuery({ ...filters, top: filters.top || 50 })
    logDataverseInfo('InvoiceService.list', 'Listing invoices', { filters })

    try {
      const response = await dataverseClient.list<DvInvoice>(this.entitySet, `${query}&$count=true`)
      return {
        items: response.value.map(mapDvInvoiceToApp),
        count: response['@odata.count'],
      }
    } catch (error) {
      logDataverseError('InvoiceService.list', error)
      throw error
    }
  }

  /**
   * Get invoice by ID
   */
  async getById(id: string): Promise<Invoice | null> {
    logDataverseInfo('InvoiceService.getById', 'Fetching invoice', { id })

    try {
      const record = await dataverseClient.getById<DvInvoice>(this.entitySet, id)
      return record ? mapDvInvoiceToApp(record) : null
    } catch (error) {
      logDataverseError('InvoiceService.getById', error)
      throw error
    }
  }

  /**
   * Get invoice by KSeF reference number
   */
  async getByKsefReference(ksefReference: string): Promise<Invoice | null> {
    const s = DV.invoice
    const filter = `${s.ksefReferenceNumber} eq '${ksefReference}'`
    logDataverseInfo('InvoiceService.getByKsefReference', 'Fetching invoice by KSeF ref', { ksefReference })

    try {
      const response = await dataverseClient.list<DvInvoice>(this.entitySet, `$filter=${filter}&$top=1`)
      if (response.value.length === 0) return null
      return mapDvInvoiceToApp(response.value[0])
    } catch (error) {
      logDataverseError('InvoiceService.getByKsefReference', error)
      throw error
    }
  }

  /**
   * Create new invoice
   */
  async create(data: InvoiceCreate): Promise<Invoice> {
    logDataverseInfo('InvoiceService.create', 'Creating invoice', { invoiceNumber: data.invoiceNumber })

    try {
      const payload = mapAppInvoiceToDv(data as Partial<Invoice>)
      
      // Set direction for new invoices (default: incoming)
      const s = DV.invoice
      if (!(s.direction in payload)) {
        payload[s.direction] = KSEF_DIRECTION.INCOMING
      }
      
      // Set default payment status
      if (!(s.paymentStatus in payload)) {
        payload[s.paymentStatus] = PAYMENT_STATUS.PENDING
      }

      const result = await dataverseClient.create<DvInvoice>(this.entitySet, payload)
      
      // Dataverse may return full entity (Prefer: return=representation) or { id } (204)
      const dvIdField = DV.invoice.id
      if (result && dvIdField in (result as unknown as Record<string, unknown>)) {
        return mapDvInvoiceToApp(result as unknown as DvInvoice)
      }
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }
      
      // If we can't fetch, return a partial invoice
      return {
        ...data,
        id: (result as { id?: string })?.id || '',
        paymentStatus: 'pending',
        importedAt: new Date().toISOString(),
      } as Invoice
    } catch (error) {
      logDataverseError('InvoiceService.create', error)
      throw error
    }
  }

  /**
   * Update existing invoice
   */
  async update(id: string, data: InvoiceUpdate): Promise<Invoice | null> {
    logDataverseInfo('InvoiceService.update', 'Updating invoice', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppInvoiceToDv(data as Partial<Invoice>)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('InvoiceService.update', error)
      throw error
    }
  }

  /**
   * Upsert invoice by KSeF reference number
   * Creates if not exists, updates if exists
   */
  async upsertByKsefReference(data: InvoiceCreate): Promise<Invoice> {
    logDataverseInfo('InvoiceService.upsertByKsefReference', 'Upserting invoice', { 
      ksefReference: data.referenceNumber,
      invoiceNumber: data.invoiceNumber,
    })

    try {
      // Check if invoice exists
      const existing = await this.getByKsefReference(data.referenceNumber)
      
      if (existing) {
        // Update existing
        const updated = await this.update(existing.id, data as InvoiceUpdate)
        return updated || existing
      } else {
        // Create new
        return this.create(data)
      }
    } catch (error) {
      logDataverseError('InvoiceService.upsertByKsefReference', error)
      throw error
    }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string, paidAt?: string): Promise<Invoice | null> {
    const s = DV.invoice
    const payload: Record<string, unknown> = {
      [s.paymentStatus]: PAYMENT_STATUS.PAID,
      [s.paidAt]: paidAt || new Date().toISOString(),
    }

    logDataverseInfo('InvoiceService.markAsPaid', 'Marking invoice as paid', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('InvoiceService.markAsPaid', error)
      throw error
    }
  }

  /**
   * Update AI categorization fields
   * NOTE: AI fields are not yet in Dataverse schema. This method is a placeholder.
   */
  async updateAiCategorization(
    id: string, 
    data: { 
      aiDescription?: string
      aiCategory?: string
      aiConfidence?: number
    }
  ): Promise<Invoice | null> {
    // TODO: Implement when AI columns are added to Dataverse schema
    // For now, just log the intent and return the invoice
    logDataverseInfo('InvoiceService.updateAiCategorization', 
      'AI categorization not yet implemented - AI fields pending in Dataverse', 
      { id, ...data }
    )

    // Return the invoice without modifications
    return this.getById(id)
  }

  /**
   * Delete invoice (soft delete - sets statecode to inactive)
   */
  async delete(id: string): Promise<void> {
    logDataverseInfo('InvoiceService.delete', 'Deleting invoice', { id })

    try {
      await dataverseClient.delete(this.entitySet, id)
    } catch (error) {
      logDataverseError('InvoiceService.delete', error)
      throw error
    }
  }

  /**
   * Get invoice statistics
   */
  async getStats(tenantNip: string): Promise<{
    total: number
    pending: number
    paid: number
    overdue: number
    totalGross: number
  }> {
    logDataverseInfo('InvoiceService.getStats', 'Getting invoice stats', { tenantNip })

    try {
      const [pending, paid, overdue] = await Promise.all([
        this.list({ tenantNip, paymentStatus: 'pending', top: 1 }),
        this.list({ tenantNip, paymentStatus: 'paid', top: 1 }),
        this.list({ tenantNip, paymentStatus: 'overdue', top: 1 }),
      ])

      // For total gross, we'd need aggregation which OData doesn't support well
      // For now, return counts
      return {
        total: (pending.count || 0) + (paid.count || 0) + (overdue.count || 0),
        pending: pending.count || 0,
        paid: paid.count || 0,
        overdue: overdue.count || 0,
        totalGross: 0, // Would need FetchXML aggregation
      }
    } catch (error) {
      logDataverseError('InvoiceService.getStats', error)
      throw error
    }
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService()
