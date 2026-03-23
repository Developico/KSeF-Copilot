/**
 * Supplier Service
 * 
 * CRUD operations for the Supplier Registry.
 */

import { dataverseClient } from '../client'
import { DV, SUPPLIER_STATUS, SUPPLIER_SOURCE, PAYMENT_STATUS, SELF_BILLING_STATUS } from '../config'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvSupplier, DvInvoice, DvSbInvoice } from '../../../types/dataverse'
import type {
  Supplier,
  SupplierCreate,
  SupplierUpdate,
  SupplierStatus,
  SupplierSource,
  SupplierListParams,
  SupplierStats,
} from '../../../types/supplier'

// ============================================================
// Supplier OptionSet Mappers
// ============================================================

function mapDvSupplierStatusToApp(value: number): SupplierStatus {
  switch (value) {
    case SUPPLIER_STATUS.INACTIVE: return 'Inactive'
    case SUPPLIER_STATUS.BLOCKED: return 'Blocked'
    case SUPPLIER_STATUS.ACTIVE:
    default: return 'Active'
  }
}

function mapAppSupplierStatusToDv(status: SupplierStatus): number {
  switch (status) {
    case 'Inactive': return SUPPLIER_STATUS.INACTIVE
    case 'Blocked': return SUPPLIER_STATUS.BLOCKED
    case 'Active':
    default: return SUPPLIER_STATUS.ACTIVE
  }
}

function mapDvSupplierSourceToApp(value: number): SupplierSource {
  switch (value) {
    case SUPPLIER_SOURCE.MANUAL: return 'Manual'
    case SUPPLIER_SOURCE.VAT_API: return 'VatApi'
    case SUPPLIER_SOURCE.KSEF:
    default: return 'KSeF'
  }
}

function mapAppSupplierSourceToDv(source: SupplierSource): number {
  switch (source) {
    case 'Manual': return SUPPLIER_SOURCE.MANUAL
    case 'VatApi': return SUPPLIER_SOURCE.VAT_API
    case 'KSeF':
    default: return SUPPLIER_SOURCE.KSEF
  }
}

// ============================================================
// Supplier Mappers
// ============================================================

function mapDvSupplierToApp(raw: DvSupplier): Supplier {
  const s = DV.supplier

  return {
    id: raw[s.id as keyof DvSupplier] as string,
    nip: raw[s.nip as keyof DvSupplier] as string,
    name: raw[s.name as keyof DvSupplier] as string,
    shortName: raw[s.shortName as keyof DvSupplier] as string | undefined,
    regon: raw[s.regon as keyof DvSupplier] as string | undefined,
    krs: raw[s.krs as keyof DvSupplier] as string | undefined,
    street: raw[s.street as keyof DvSupplier] as string | undefined,
    city: raw[s.city as keyof DvSupplier] as string | undefined,
    postalCode: raw[s.postalCode as keyof DvSupplier] as string | undefined,
    country: raw[s.country as keyof DvSupplier] as string | undefined ?? 'PL',
    email: raw[s.email as keyof DvSupplier] as string | undefined,
    phone: raw[s.phone as keyof DvSupplier] as string | undefined,
    bankAccount: raw[s.bankAccount as keyof DvSupplier] as string | undefined,
    vatStatus: raw[s.vatStatus as keyof DvSupplier] as string | undefined,
    vatStatusDate: raw[s.vatStatusDate as keyof DvSupplier] as string | undefined,
    paymentTermsDays: raw[s.paymentTermsDays as keyof DvSupplier] as number | undefined,
    defaultMpkId: raw[s.defaultMpkLookup as keyof DvSupplier] as string | undefined,
    defaultCategory: raw[s.defaultCategory as keyof DvSupplier] as string | undefined,
    notes: raw[s.notes as keyof DvSupplier] as string | undefined,
    tags: raw[s.tags as keyof DvSupplier] as string | undefined,
    hasSelfBillingAgreement: (raw[s.hasSelfBillingAgreement as keyof DvSupplier] as boolean) ?? false,
    selfBillingAgreementDate: raw[s.selfBillingAgreementDate as keyof DvSupplier] as string | undefined,
    selfBillingAgreementExpiry: raw[s.selfBillingAgreementExpiry as keyof DvSupplier] as string | undefined,
    sbContactUserId: raw[s.sbContactUserLookup as keyof DvSupplier] as string | undefined,
    sbInvoiceNumberTemplate: raw[s.sbInvoiceNumberTemplate as keyof DvSupplier] as string | undefined,
    firstInvoiceDate: raw[s.firstInvoiceDate as keyof DvSupplier] as string | undefined,
    lastInvoiceDate: raw[s.lastInvoiceDate as keyof DvSupplier] as string | undefined,
    totalInvoiceCount: (raw[s.totalInvoiceCount as keyof DvSupplier] as number) ?? 0,
    totalGrossAmount: (raw[s.totalGrossAmount as keyof DvSupplier] as number) ?? 0,
    status: mapDvSupplierStatusToApp(raw[s.status as keyof DvSupplier] as number),
    source: mapDvSupplierSourceToApp(raw[s.source as keyof DvSupplier] as number),
    settingId: raw[s.settingLookup as keyof DvSupplier] as string,
    createdOn: raw[s.createdOn as keyof DvSupplier] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvSupplier] as string,
  }
}

function mapAppSupplierToDv(data: SupplierCreate | SupplierUpdate, isCreate: boolean): Record<string, unknown> {
  const s = DV.supplier
  const payload: Record<string, unknown> = {}

  if (data.name !== undefined) payload[s.name] = data.name
  if ('nip' in data && data.nip !== undefined) payload[s.nip] = data.nip
  if (data.shortName !== undefined) payload[s.shortName] = data.shortName ?? null
  if ('regon' in data && data.regon !== undefined) payload[s.regon] = data.regon ?? null
  if ('krs' in data && data.krs !== undefined) payload[s.krs] = data.krs ?? null
  if (data.street !== undefined) payload[s.street] = data.street ?? null
  if (data.city !== undefined) payload[s.city] = data.city ?? null
  if (data.postalCode !== undefined) payload[s.postalCode] = data.postalCode ?? null
  if (data.country !== undefined) payload[s.country] = data.country
  if (data.email !== undefined) payload[s.email] = data.email ?? null
  if (data.phone !== undefined) payload[s.phone] = data.phone ?? null
  if (data.bankAccount !== undefined) payload[s.bankAccount] = data.bankAccount ?? null
  if (data.vatStatus !== undefined) payload[s.vatStatus] = data.vatStatus ?? null
  if (data.vatStatusDate !== undefined) payload[s.vatStatusDate] = data.vatStatusDate ?? null
  if (data.paymentTermsDays !== undefined) payload[s.paymentTermsDays] = data.paymentTermsDays ?? null
  if (data.defaultCategory !== undefined) payload[s.defaultCategory] = data.defaultCategory ?? null
  if (data.notes !== undefined) payload[s.notes] = data.notes ?? null
  if (data.tags !== undefined) payload[s.tags] = data.tags ?? null
  if (data.hasSelfBillingAgreement !== undefined) payload[s.hasSelfBillingAgreement] = data.hasSelfBillingAgreement
  if ('sbInvoiceNumberTemplate' in data && data.sbInvoiceNumberTemplate !== undefined) payload[s.sbInvoiceNumberTemplate] = data.sbInvoiceNumberTemplate ?? null
  if (data.selfBillingAgreementDate !== undefined) payload[s.selfBillingAgreementDate] = data.selfBillingAgreementDate ?? null
  if (data.selfBillingAgreementExpiry !== undefined) payload[s.selfBillingAgreementExpiry] = data.selfBillingAgreementExpiry ?? null
  if (data.sbContactUserId !== undefined) {
    if (data.sbContactUserId === null) {
      payload[s.sbContactUserBind] = null
    } else {
      payload[s.sbContactUserBind] = `/systemusers(${data.sbContactUserId})`
    }
  }
  if (data.status !== undefined) payload[s.status] = mapAppSupplierStatusToDv(data.status)
  if (data.source !== undefined) payload[s.source] = mapAppSupplierSourceToDv(data.source)

  // Default MPK lookup
  if ('defaultMpkId' in data && data.defaultMpkId !== undefined) {
    if (data.defaultMpkId === null) {
      payload[s.defaultMpkBind] = null
    } else {
      payload[s.defaultMpkBind] = `/dvlp_ksefmpkcenters(${data.defaultMpkId})`
    }
  }

  // Setting lookup (only on create)
  if (isCreate && 'settingId' in data && data.settingId) {
    payload[s.settingBind] = `/dvlp_ksefsettings(${data.settingId})`
  }

  return payload
}

// ============================================================
// Supplier Service Class
// ============================================================

export class SupplierService {
  private entitySet = DV.supplier.entitySet

  /**
   * Get all suppliers for a setting with optional filters
   */
  async getAll(params: SupplierListParams): Promise<Supplier[]> {
    const s = DV.supplier
    const conditions: string[] = []

    conditions.push(`${s.settingLookup} eq ${escapeOData(params.settingId)}`)

    if (params.status) {
      conditions.push(`${s.status} eq ${mapAppSupplierStatusToDv(params.status)}`)
    }

    if (params.hasSelfBillingAgreement !== undefined) {
      conditions.push(`${s.hasSelfBillingAgreement} eq ${params.hasSelfBillingAgreement}`)
    }

    if (params.search) {
      const term = escapeOData(params.search)
      conditions.push(
        `(contains(${s.name},${term}) or contains(${s.nip},${term}) or contains(${s.shortName},${term}))`
      )
    }

    const filter = `$filter=${conditions.join(' and ')}`
    const top = params.top ? `&$top=${params.top}` : ''
    const skip = params.skip ? `&$skip=${params.skip}` : ''
    const query = `${filter}&$orderby=${s.name} asc${top}${skip}`

    logDataverseInfo('SupplierService.getAll', 'Fetching suppliers', { params })

    try {
      const records = await dataverseClient.listAll<DvSupplier>(this.entitySet, query)
      return records.map(mapDvSupplierToApp)
    } catch (error) {
      logDataverseError('SupplierService.getAll', error)
      throw error
    }
  }

  /**
   * Get supplier by ID
   */
  async getById(id: string): Promise<Supplier | null> {
    logDataverseInfo('SupplierService.getById', 'Fetching supplier', { id })

    try {
      const record = await dataverseClient.getById<DvSupplier>(this.entitySet, id)
      return record ? mapDvSupplierToApp(record) : null
    } catch (error) {
      logDataverseError('SupplierService.getById', error)
      throw error
    }
  }

  /**
   * Get supplier by NIP within a setting
   */
  async getByNip(nip: string, settingId: string): Promise<Supplier | null> {
    const s = DV.supplier
    const filter = `$filter=${s.nip} eq '${escapeOData(nip)}' and ${s.settingLookup} eq ${escapeOData(settingId)}`

    logDataverseInfo('SupplierService.getByNip', 'Fetching supplier by NIP', { nip, settingId })

    try {
      const records = await dataverseClient.listAll<DvSupplier>(this.entitySet, `${filter}&$top=1`)
      return records.length > 0 ? mapDvSupplierToApp(records[0]) : null
    } catch (error) {
      logDataverseError('SupplierService.getByNip', error)
      throw error
    }
  }

  /**
   * Create new supplier
   */
  async create(data: SupplierCreate): Promise<Supplier> {
    logDataverseInfo('SupplierService.create', 'Creating supplier', { nip: data.nip, name: data.name })

    try {
      const payload = mapAppSupplierToDv(data, true)
      const result = await dataverseClient.create<DvSupplier>(this.entitySet, payload)

      // Dataverse may return full entity (Prefer: return=representation) or { id } (204)
      const dvIdField = DV.supplier.id
      if (result && dvIdField in (result as unknown as Record<string, unknown>)) {
        return mapDvSupplierToApp(result as unknown as DvSupplier)
      }
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      throw new Error('Failed to fetch created supplier')
    } catch (error) {
      logDataverseError('SupplierService.create', error)
      throw error
    }
  }

  /**
   * Update existing supplier
   */
  async update(id: string, data: SupplierUpdate): Promise<Supplier | null> {
    logDataverseInfo('SupplierService.update', 'Updating supplier', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppSupplierToDv(data, false)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('SupplierService.update', error)
      throw error
    }
  }

  /**
   * Deactivate (soft delete) supplier by setting status to Inactive
   */
  async deactivate(id: string): Promise<void> {
    logDataverseInfo('SupplierService.deactivate', 'Deactivating supplier', { id })

    try {
      await dataverseClient.update(this.entitySet, id, {
        [DV.supplier.status]: SUPPLIER_STATUS.INACTIVE,
      })
    } catch (error) {
      logDataverseError('SupplierService.deactivate', error)
      throw error
    }
  }

  /**
   * Find or create supplier from invoice data (used during sync/import)
   */
  async findOrCreate(nip: string, name: string, settingId: string): Promise<Supplier> {
    const existing = await this.getByNip(nip, settingId)
    if (existing) return existing

    return this.create({
      nip,
      name,
      settingId,
      status: 'Active',
      source: 'KSeF',
      hasSelfBillingAgreement: false,
      country: 'PL',
    })
  }

  /**
   * Get computed statistics for a supplier (live query on invoices + SB invoices)
   */
  async getStats(id: string, dateFrom?: string, dateTo?: string): Promise<SupplierStats> {
    logDataverseInfo('SupplierService.getStats', 'Computing supplier stats', { id, dateFrom, dateTo })

    try {
      // First get the supplier to know its NIP for matching regular invoices
      const supplier = await this.getById(id)
      if (!supplier) throw new Error(`Supplier ${id} not found`)

      // Query regular invoices by seller NIP
      const inv = DV.invoice
      const invConditions: string[] = [
        `${inv.sellerNip} eq '${escapeOData(supplier.nip)}'`,
      ]
      if (dateFrom) invConditions.push(`${inv.invoiceDate} ge ${dateFrom}`)
      if (dateTo) invConditions.push(`${inv.invoiceDate} le ${dateTo}`)

      const invFilter = `$filter=${invConditions.join(' and ')}`
      const invSelect = `$select=${inv.id},${inv.grossAmount},${inv.invoiceDate},${inv.paymentStatus}`
      const invQuery = `${invFilter}&${invSelect}`

      const invRecords = await dataverseClient.listAll<DvInvoice>(DV.invoice.entitySet, invQuery)

      let totalGross = 0
      let pendingPayments = 0
      let overduePayments = 0
      let lastInvoiceDate: string | null = null

      for (const r of invRecords) {
        const gross = (r[inv.grossAmount as keyof DvInvoice] as number) ?? 0
        totalGross += gross

        const payStatus = r[inv.paymentStatus as keyof DvInvoice] as number
        if (payStatus === PAYMENT_STATUS.PENDING) pendingPayments++
        if (payStatus === PAYMENT_STATUS.OVERDUE) overduePayments++

        const invDate = r[inv.invoiceDate as keyof DvInvoice] as string | undefined
        if (invDate && (!lastInvoiceDate || invDate > lastInvoiceDate)) lastInvoiceDate = invDate
      }

      // Query SB invoices from dedicated table by supplier lookup
      const sb = DV.sbInvoice
      const sbConditions: string[] = [
        `${sb.supplierLookup} eq ${escapeOData(id)}`,
      ]
      if (dateFrom) sbConditions.push(`${sb.invoiceDate} ge ${dateFrom}`)
      if (dateTo) sbConditions.push(`${sb.invoiceDate} le ${dateTo}`)

      const sbFilter = `$filter=${sbConditions.join(' and ')}`
      const sbSelect = `$select=${sb.id},${sb.status}`
      const sbQuery = `${sbFilter}&${sbSelect}`

      const sbRecords = await dataverseClient.listAll<DvSbInvoice>(DV.sbInvoice.entitySet, sbQuery)

      let selfBillingInvoiceCount = sbRecords.length
      let selfBillingPendingCount = 0
      for (const r of sbRecords) {
        const sbStatus = r[sb.status as keyof DvSbInvoice] as number
        if (sbStatus === SELF_BILLING_STATUS.PENDING_SELLER) selfBillingPendingCount++
      }

      const invoiceCount = invRecords.length
      return {
        invoiceCount,
        totalGross,
        avgInvoiceAmount: invoiceCount > 0 ? totalGross / invoiceCount : 0,
        lastInvoiceDate,
        pendingPayments,
        overduePayments,
        selfBillingInvoiceCount,
        selfBillingPendingCount,
      }
    } catch (error) {
      logDataverseError('SupplierService.getStats', error)
      throw error
    }
  }

  /**
   * Recalculate and persist cached statistics on the supplier record
   */
  async updateCachedStats(id: string): Promise<void> {
    logDataverseInfo('SupplierService.updateCachedStats', 'Updating cached stats', { id })

    try {
      // Get supplier NIP for matching regular invoices
      const supplier = await this.getById(id)
      if (!supplier) throw new Error(`Supplier ${id} not found`)

      const inv = DV.invoice
      const s = DV.supplier
      const filter = `$filter=${inv.sellerNip} eq '${escapeOData(supplier.nip)}'`
      const select = `$select=${inv.id},${inv.grossAmount},${inv.invoiceDate}`
      const query = `${filter}&${select}`

      const records = await dataverseClient.listAll<DvInvoice>(DV.invoice.entitySet, query)

      let totalGross = 0
      let firstDate: string | null = null
      let lastDate: string | null = null

      for (const r of records) {
        totalGross += (r[inv.grossAmount as keyof DvInvoice] as number) ?? 0
        const invDate = r[inv.invoiceDate as keyof DvInvoice] as string | undefined
        if (invDate) {
          if (!firstDate || invDate < firstDate) firstDate = invDate
          if (!lastDate || invDate > lastDate) lastDate = invDate
        }
      }

      await dataverseClient.update(this.entitySet, id, {
        [s.firstInvoiceDate]: firstDate,
        [s.lastInvoiceDate]: lastDate,
        [s.totalInvoiceCount]: records.length,
        [s.totalGrossAmount]: totalGross,
      })

      logDataverseInfo('SupplierService.updateCachedStats', 'Cached stats updated', {
        id,
        totalInvoiceCount: records.length,
        totalGrossAmount: totalGross,
      })
    } catch (error) {
      logDataverseError('SupplierService.updateCachedStats', error)
      throw error
    }
  }
}

export const supplierService = new SupplierService()
