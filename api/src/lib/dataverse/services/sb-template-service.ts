/**
 * Self-Billing Template Service
 * 
 * CRUD operations for Self-Billing Templates (line-item definitions).
 */

import { dataverseClient } from '../client'
import { DV } from '../config'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvSbTemplate } from '../../../types/dataverse'
import type {
  SbTemplate,
  SbTemplateCreate,
  SbTemplateUpdate,
} from '../../../types/self-billing'

// ============================================================
// SbTemplate Mappers
// ============================================================

function mapDvSbTemplateToApp(raw: DvSbTemplate): SbTemplate {
  const s = DV.sbTemplate

  return {
    id: raw[s.id as keyof DvSbTemplate] as string,
    name: raw[s.name as keyof DvSbTemplate] as string,
    supplierId: raw[s.supplierLookup as keyof DvSbTemplate] as string,
    settingId: raw[s.settingLookup as keyof DvSbTemplate] as string,
    description: raw[s.description as keyof DvSbTemplate] as string | undefined,
    itemDescription: raw[s.itemDescription as keyof DvSbTemplate] as string,
    quantity: (raw[s.quantity as keyof DvSbTemplate] as number) ?? 1,
    unit: raw[s.unit as keyof DvSbTemplate] as string,
    unitPrice: raw[s.unitPrice as keyof DvSbTemplate] as number,
    vatRate: raw[s.vatRate as keyof DvSbTemplate] as number,
    currency: (raw[s.currency as keyof DvSbTemplate] as string) ?? 'PLN',
    isActive: (raw[s.isActive as keyof DvSbTemplate] as boolean) ?? true,
    sortOrder: (raw[s.sortOrder as keyof DvSbTemplate] as number) ?? 0,
    paymentTermDays: raw[s.paymentTermDays as keyof DvSbTemplate] as number | null | undefined,
    createdOn: raw[s.createdOn as keyof DvSbTemplate] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvSbTemplate] as string,
  }
}

function mapAppSbTemplateToDv(data: SbTemplateCreate | SbTemplateUpdate, isCreate: boolean): Record<string, unknown> {
  const s = DV.sbTemplate
  const payload: Record<string, unknown> = {}

  if ('name' in data && data.name !== undefined) payload[s.name] = data.name
  if ('description' in data && data.description !== undefined) payload[s.description] = data.description ?? null
  if ('itemDescription' in data && data.itemDescription !== undefined) payload[s.itemDescription] = data.itemDescription
  if ('quantity' in data && data.quantity !== undefined) payload[s.quantity] = data.quantity
  if ('unit' in data && data.unit !== undefined) payload[s.unit] = data.unit
  if ('unitPrice' in data && data.unitPrice !== undefined) payload[s.unitPrice] = data.unitPrice
  if ('vatRate' in data && data.vatRate !== undefined) payload[s.vatRate] = data.vatRate
  if ('currency' in data && data.currency !== undefined) payload[s.currency] = data.currency
  if ('isActive' in data && data.isActive !== undefined) payload[s.isActive] = data.isActive
  if ('sortOrder' in data && data.sortOrder !== undefined) payload[s.sortOrder] = data.sortOrder
  if ('paymentTermDays' in data) payload[s.paymentTermDays] = data.paymentTermDays ?? null

  // Supplier lookup (only on create)
  if (isCreate && 'supplierId' in data && data.supplierId) {
    payload[s.supplierBind] = `/dvlp_ksefsuppliers(${data.supplierId})`
  }

  // Setting lookup (only on create)
  if (isCreate && 'settingId' in data && data.settingId) {
    payload[s.settingBind] = `/dvlp_ksefsettings(${data.settingId})`
  }

  return payload
}

// ============================================================
// SB Template Service Class
// ============================================================

export class SbTemplateService {
  private entitySet = DV.sbTemplate.entitySet

  /**
   * Get all templates, optionally filtered by supplier
   */
  async getAll(params: { settingId: string; supplierId?: string; activeOnly?: boolean }): Promise<SbTemplate[]> {
    const s = DV.sbTemplate
    const conditions: string[] = []

    conditions.push(`${s.settingLookup} eq ${escapeOData(params.settingId)}`)

    if (params.supplierId) {
      conditions.push(`${s.supplierLookup} eq ${escapeOData(params.supplierId)}`)
    }

    if (params.activeOnly !== false) {
      conditions.push(`${s.isActive} eq true`)
    }

    const filter = `$filter=${conditions.join(' and ')}`
    const query = `${filter}&$orderby=${s.sortOrder} asc,${s.name} asc`

    logDataverseInfo('SbTemplateService.getAll', 'Fetching SB templates', { params })

    try {
      const records = await dataverseClient.listAll<DvSbTemplate>(this.entitySet, query)
      return records.map(mapDvSbTemplateToApp)
    } catch (error) {
      logDataverseError('SbTemplateService.getAll', error)
      throw error
    }
  }

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<SbTemplate | null> {
    logDataverseInfo('SbTemplateService.getById', 'Fetching SB template', { id })

    try {
      const record = await dataverseClient.getById<DvSbTemplate>(this.entitySet, id)
      return record ? mapDvSbTemplateToApp(record) : null
    } catch (error) {
      logDataverseError('SbTemplateService.getById', error)
      throw error
    }
  }

  /**
   * Get active templates for a supplier
   */
  async getForSupplier(supplierId: string, settingId: string): Promise<SbTemplate[]> {
    return this.getAll({ settingId, supplierId, activeOnly: true })
  }

  /**
   * Create new template
   */
  async create(data: SbTemplateCreate): Promise<SbTemplate> {
    logDataverseInfo('SbTemplateService.create', 'Creating SB template', { name: data.name })

    try {
      const payload = mapAppSbTemplateToDv(data, true)
      const result = await dataverseClient.create<DvSbTemplate>(this.entitySet, payload)

      // Dataverse may return full entity (Prefer: return=representation) or { id } (204)
      const dvIdField = DV.sbTemplate.id
      if (result && dvIdField in (result as unknown as Record<string, unknown>)) {
        return mapDvSbTemplateToApp(result as unknown as DvSbTemplate)
      }
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      throw new Error('Failed to fetch created SB template')
    } catch (error) {
      logDataverseError('SbTemplateService.create', error)
      throw error
    }
  }

  /**
   * Update existing template
   */
  async update(id: string, data: SbTemplateUpdate): Promise<SbTemplate | null> {
    logDataverseInfo('SbTemplateService.update', 'Updating SB template', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppSbTemplateToDv(data, false)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('SbTemplateService.update', error)
      throw error
    }
  }

  /**
   * Deactivate template
   */
  async deactivate(id: string): Promise<void> {
    logDataverseInfo('SbTemplateService.deactivate', 'Deactivating SB template', { id })

    try {
      await dataverseClient.update(this.entitySet, id, {
        [DV.sbTemplate.isActive]: false,
      })
    } catch (error) {
      logDataverseError('SbTemplateService.deactivate', error)
      throw error
    }
  }

  /**
   * Delete template (hard delete)
   */
  async delete(id: string): Promise<void> {
    logDataverseInfo('SbTemplateService.delete', 'Deleting SB template', { id })

    try {
      await dataverseClient.delete(this.entitySet, id)
    } catch (error) {
      logDataverseError('SbTemplateService.delete', error)
      throw error
    }
  }

  /**
   * Duplicate all templates from one supplier to another
   */
  async duplicateForSupplier(fromSupplierId: string, toSupplierId: string, settingId: string): Promise<SbTemplate[]> {
    logDataverseInfo('SbTemplateService.duplicateForSupplier', 'Duplicating templates', { fromSupplierId, toSupplierId })

    try {
      const sourceTemplates = await this.getForSupplier(fromSupplierId, settingId)
      const created: SbTemplate[] = []

      for (const source of sourceTemplates) {
        const newTemplate = await this.create({
          name: source.name,
          supplierId: toSupplierId,
          settingId,
          description: source.description || undefined,
          itemDescription: source.itemDescription,
          quantity: source.quantity,
          unit: source.unit,
          unitPrice: source.unitPrice,
          vatRate: source.vatRate,
          currency: source.currency,
          isActive: source.isActive,
          sortOrder: source.sortOrder,
          paymentTermDays: source.paymentTermDays,
        })
        created.push(newTemplate)
      }

      return created
    } catch (error) {
      logDataverseError('SbTemplateService.duplicateForSupplier', error)
      throw error
    }
  }
}

export const sbTemplateService = new SbTemplateService()
