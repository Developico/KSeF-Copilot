/**
 * Self-Billing Invoice Service
 *
 * CRUD operations for Self-Billing Invoices (dvlp_ksefselfbillinginvoice)
 * and their Line Items (dvlp_ksefselfbillinglineitem) in a dedicated table.
 */

import { dataverseClient } from '../client'
import { DV, SELF_BILLING_STATUS } from '../config'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvSbInvoice, DvSbLineItem } from '../../../types/dataverse'
import type {
  SbInvoice,
  SbLineItem,
  SelfBillingInvoiceStatus,
} from '../../../types/self-billing'
import { supplierService } from './supplier-service'

// ============================================================
// Status Mappers
// ============================================================

function mapDvStatusToApp(value: number): SelfBillingInvoiceStatus {
  switch (value) {
    case SELF_BILLING_STATUS.PENDING_SELLER: return 'PendingSeller'
    case SELF_BILLING_STATUS.SELLER_APPROVED: return 'SellerApproved'
    case SELF_BILLING_STATUS.SELLER_REJECTED: return 'SellerRejected'
    case SELF_BILLING_STATUS.SENT_TO_KSEF: return 'SentToKsef'
    case SELF_BILLING_STATUS.DRAFT:
    default: return 'Draft'
  }
}

function mapAppStatusToDv(status: SelfBillingInvoiceStatus): number {
  switch (status) {
    case 'PendingSeller': return SELF_BILLING_STATUS.PENDING_SELLER
    case 'SellerApproved': return SELF_BILLING_STATUS.SELLER_APPROVED
    case 'SellerRejected': return SELF_BILLING_STATUS.SELLER_REJECTED
    case 'SentToKsef': return SELF_BILLING_STATUS.SENT_TO_KSEF
    case 'Draft':
    default: return SELF_BILLING_STATUS.DRAFT
  }
}

// ============================================================
// Entity Mappers
// ============================================================

function mapDvLineItemToApp(raw: DvSbLineItem): SbLineItem {
  const s = DV.sbLineItem
  return {
    id: raw[s.id as keyof DvSbLineItem] as string,
    itemDescription: raw[s.name as keyof DvSbLineItem] as string,
    quantity: raw[s.quantity as keyof DvSbLineItem] as number,
    unit: raw[s.unit as keyof DvSbLineItem] as string,
    unitPrice: raw[s.unitPrice as keyof DvSbLineItem] as number,
    vatRate: raw[s.vatRate as keyof DvSbLineItem] as number,
    netAmount: raw[s.netAmount as keyof DvSbLineItem] as number,
    vatAmount: raw[s.vatAmount as keyof DvSbLineItem] as number,
    grossAmount: raw[s.grossAmount as keyof DvSbLineItem] as number,
    paymentTermDays: raw[s.paymentTermDays as keyof DvSbLineItem] as number | null | undefined,
    sortOrder: raw[s.sortOrder as keyof DvSbLineItem] as number | undefined,
    sbInvoiceId: raw[s.sbInvoiceLookup as keyof DvSbLineItem] as string,
    templateId: raw[s.templateLookup as keyof DvSbLineItem] as string | undefined,
    createdOn: raw[s.createdOn as keyof DvSbLineItem] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvSbLineItem] as string,
  }
}

function mapDvInvoiceToApp(raw: DvSbInvoice, items: SbLineItem[] = []): SbInvoice {
  const s = DV.sbInvoice
  return {
    id: raw[s.id as keyof DvSbInvoice] as string,
    invoiceNumber: raw[s.name as keyof DvSbInvoice] as string,
    invoiceDate: raw[s.invoiceDate as keyof DvSbInvoice] as string,
    dueDate: raw[s.dueDate as keyof DvSbInvoice] as string | undefined,
    netAmount: raw[s.netAmount as keyof DvSbInvoice] as number,
    vatAmount: raw[s.vatAmount as keyof DvSbInvoice] as number,
    grossAmount: raw[s.grossAmount as keyof DvSbInvoice] as number,
    currency: (raw[s.currency as keyof DvSbInvoice] as string) || 'PLN',
    status: mapDvStatusToApp(raw[s.status as keyof DvSbInvoice] as number),
    sellerRejectionReason: raw[s.sellerRejectionReason as keyof DvSbInvoice] as string | undefined,
    sentDate: raw[s.sentDate as keyof DvSbInvoice] as string | undefined,
    ksefReferenceNumber: raw[s.ksefReferenceNumber as keyof DvSbInvoice] as string | undefined,
    settingId: raw[s.settingLookup as keyof DvSbInvoice] as string,
    supplierId: raw[s.supplierLookup as keyof DvSbInvoice] as string,
    agreementId: raw[s.sbAgreementLookup as keyof DvSbInvoice] as string | undefined,
    ksefInvoiceId: raw[s.ksefInvoiceLookup as keyof DvSbInvoice] as string | undefined,
    mpkCenterId: raw[s.mpkCenterLookup as keyof DvSbInvoice] as string | undefined,
    submittedByUserId: raw[s.submittedByUserLookup as keyof DvSbInvoice] as string | undefined,
    submittedAt: raw[s.submittedAt as keyof DvSbInvoice] as string | undefined,
    approvedByUserId: raw[s.approvedByUserLookup as keyof DvSbInvoice] as string | undefined,
    approvedAt: raw[s.approvedAt as keyof DvSbInvoice] as string | undefined,
    items,
    createdOn: raw[s.createdOn as keyof DvSbInvoice] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvSbInvoice] as string,
  }
}

// ============================================================
// Filters
// ============================================================

export interface SbInvoiceFilters {
  settingId?: string
  supplierId?: string
  status?: string
  top?: number
  orderBy?: string
}

function buildFilter(filters: SbInvoiceFilters): string {
  const s = DV.sbInvoice
  const conditions: string[] = []

  conditions.push(`${s.stateCode} eq 0`)

  if (filters.settingId) {
    conditions.push(`${s.settingLookup} eq ${escapeOData(filters.settingId)}`)
  }
  if (filters.supplierId) {
    conditions.push(`${s.supplierLookup} eq ${escapeOData(filters.supplierId)}`)
  }
  if (filters.status) {
    const statusVal = mapAppStatusToDv(filters.status as SelfBillingInvoiceStatus)
    conditions.push(`${s.status} eq ${statusVal}`)
  }

  return conditions.join(' and ')
}

function buildQuery(filters: SbInvoiceFilters): string {
  const s = DV.sbInvoice
  const parts: string[] = []

  const filter = buildFilter(filters)
  if (filter) parts.push(`$filter=${filter}`)
  if (filters.top) parts.push(`$top=${filters.top}`)

  const orderBy = filters.orderBy || `${s.invoiceDate} desc`
  parts.push(`$orderby=${orderBy}`)

  return parts.join('&')
}

// ============================================================
// Service
// ============================================================

export class SbInvoiceService {
  private entitySet = DV.sbInvoice.entitySet
  private lineItemEntitySet = DV.sbLineItem.entitySet

  // ── Line Items ───────────────────────────────────────────

  async getLineItems(sbInvoiceId: string): Promise<SbLineItem[]> {
    const s = DV.sbLineItem
    const filter = `${s.sbInvoiceLookup} eq ${sbInvoiceId}`
    const query = `$filter=${filter}&$orderby=${s.sortOrder} asc,${s.createdOn} asc`

    try {
      const records = await dataverseClient.listAll<DvSbLineItem>(this.lineItemEntitySet, query)
      return records.map(mapDvLineItemToApp)
    } catch (error) {
      logDataverseError('SbInvoiceService.getLineItems', error)
      throw error
    }
  }

  async createLineItem(sbInvoiceId: string, item: {
    itemDescription: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    netAmount: number
    vatAmount: number
    grossAmount: number
    paymentTermDays?: number | null
    sortOrder?: number
    templateId?: string
  }): Promise<SbLineItem> {
    const s = DV.sbLineItem
    const payload: Record<string, unknown> = {
      [s.name]: item.itemDescription,
      [s.quantity]: item.quantity,
      [s.unit]: item.unit,
      [s.unitPrice]: item.unitPrice,
      [s.vatRate]: item.vatRate,
      [s.netAmount]: item.netAmount,
      [s.vatAmount]: item.vatAmount,
      [s.grossAmount]: item.grossAmount,
      [s.sbInvoiceBind]: `/dvlp_ksefselfbillinginvoices(${sbInvoiceId})`,
    }

    if (item.paymentTermDays !== undefined && item.paymentTermDays !== null) {
      payload[s.paymentTermDays] = item.paymentTermDays
    }
    if (item.sortOrder !== undefined) {
      payload[s.sortOrder] = item.sortOrder
    }
    if (item.templateId) {
      payload[s.templateBind] = `/dvlp_ksefselfbillingtemplates(${item.templateId})`
    }

    try {
      const result = await dataverseClient.create<DvSbLineItem>(this.lineItemEntitySet, payload)
      const id = (result as { id?: string })?.id ||
        (result as unknown as Record<string, unknown>)?.[DV.sbLineItem.id] as string
      if (id) {
        const record = await dataverseClient.getById<DvSbLineItem>(this.lineItemEntitySet, id)
        if (record) return mapDvLineItemToApp(record)
      }
      return {
        id: id || '',
        itemDescription: item.itemDescription,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        netAmount: item.netAmount,
        vatAmount: item.vatAmount,
        grossAmount: item.grossAmount,
        paymentTermDays: item.paymentTermDays,
        sortOrder: item.sortOrder,
        sbInvoiceId,
        templateId: item.templateId,
        createdOn: new Date().toISOString(),
        modifiedOn: new Date().toISOString(),
      }
    } catch (error) {
      logDataverseError('SbInvoiceService.createLineItem', error)
      throw error
    }
  }

  async deleteLineItemsForInvoice(sbInvoiceId: string): Promise<void> {
    const items = await this.getLineItems(sbInvoiceId)
    for (const item of items) {
      await dataverseClient.delete(this.lineItemEntitySet, item.id)
    }
  }

  // ── Invoice CRUD ─────────────────────────────────────────

  async getAll(filters: SbInvoiceFilters = {}): Promise<SbInvoice[]> {
    const query = buildQuery(filters)
    logDataverseInfo('SbInvoiceService.getAll', 'Fetching SB invoices', { filters })

    try {
      const records = await dataverseClient.listAll<DvSbInvoice>(this.entitySet, query)
      const invoices: SbInvoice[] = []
      const supplierCache = new Map<string, { name: string; nip: string }>()
      for (const raw of records) {
        const id = raw[DV.sbInvoice.id as keyof DvSbInvoice] as string
        const items = await this.getLineItems(id)
        const invoice = mapDvInvoiceToApp(raw, items)
        await this.enrichSupplier(invoice, supplierCache)
        invoices.push(invoice)
      }
      return invoices
    } catch (error) {
      logDataverseError('SbInvoiceService.getAll', error)
      throw error
    }
  }

  async getById(id: string): Promise<SbInvoice | null> {
    logDataverseInfo('SbInvoiceService.getById', 'Fetching SB invoice', { id })

    try {
      const raw = await dataverseClient.getById<DvSbInvoice>(this.entitySet, id)
      if (!raw) return null
      const items = await this.getLineItems(id)
      const invoice = mapDvInvoiceToApp(raw, items)
      await this.enrichSupplier(invoice)
      return invoice
    } catch (error) {
      logDataverseError('SbInvoiceService.getById', error)
      throw error
    }
  }

  private async enrichSupplier(
    invoice: SbInvoice,
    cache?: Map<string, { name: string; nip: string }>,
  ): Promise<void> {
    if (!invoice.supplierId) return
    const cached = cache?.get(invoice.supplierId)
    if (cached) {
      invoice.supplierName = cached.name
      invoice.supplierNip = cached.nip
      return
    }
    try {
      const supplier = await supplierService.getById(invoice.supplierId)
      if (supplier) {
        invoice.supplierName = supplier.name
        invoice.supplierNip = supplier.nip
        cache?.set(invoice.supplierId, { name: supplier.name, nip: supplier.nip })
      }
    } catch {
      // Non-critical — supplier details are optional
    }
  }

  async create(data: {
    settingId: string
    invoiceNumber: string
    invoiceDate: string
    dueDate?: string
    netAmount: number
    vatAmount: number
    grossAmount: number
    currency?: string
    status?: SelfBillingInvoiceStatus
    supplierId: string
    agreementId?: string
    mpkCenterId?: string
  }): Promise<SbInvoice> {
    const s = DV.sbInvoice
    logDataverseInfo('SbInvoiceService.create', 'Creating SB invoice', { invoiceNumber: data.invoiceNumber })

    const payload: Record<string, unknown> = {
      [s.name]: data.invoiceNumber,
      [s.invoiceDate]: data.invoiceDate,
      [s.netAmount]: data.netAmount,
      [s.vatAmount]: data.vatAmount,
      [s.grossAmount]: data.grossAmount,
      [s.status]: mapAppStatusToDv(data.status || 'Draft'),
      [s.settingBind]: `/dvlp_ksefsettings(${data.settingId})`,
      [s.supplierBind]: `/dvlp_ksefsuppliers(${data.supplierId})`,
    }

    if (data.dueDate) payload[s.dueDate] = data.dueDate
    if (data.currency) payload[s.currency] = data.currency
    if (data.agreementId) {
      payload[s.sbAgreementBind] = `/dvlp_ksefsbagrements(${data.agreementId})`
    }
    if (data.mpkCenterId) {
      payload[s.mpkCenterBind] = `/dvlp_ksefmpkcenters(${data.mpkCenterId})`
    }

    try {
      const result = await dataverseClient.create<DvSbInvoice>(this.entitySet, payload)
      const dvIdField = DV.sbInvoice.id
      const id = (result as unknown as Record<string, unknown>)?.[dvIdField] as string ||
        (result as { id?: string })?.id

      if (id) {
        const created = await this.getById(id)
        if (created) return created
      }

      return {
        id: id || '',
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        netAmount: data.netAmount,
        vatAmount: data.vatAmount,
        grossAmount: data.grossAmount,
        currency: data.currency || 'PLN',
        status: data.status || 'Draft',
        settingId: data.settingId,
        supplierId: data.supplierId,
        agreementId: data.agreementId,
        mpkCenterId: data.mpkCenterId,
        items: [],
        createdOn: new Date().toISOString(),
        modifiedOn: new Date().toISOString(),
      }
    } catch (error) {
      logDataverseError('SbInvoiceService.create', error)
      throw error
    }
  }

  async update(id: string, data: Partial<{
    invoiceNumber: string
    invoiceDate: string
    dueDate: string
    netAmount: number
    vatAmount: number
    grossAmount: number
    currency: string
    status: SelfBillingInvoiceStatus
    sellerRejectionReason: string
    sentDate: string
    ksefReferenceNumber: string
    ksefInvoiceId: string | null
    mpkCenterId: string | null
    submittedByUserId: string | null
    submittedAt: string | null
    approvedByUserId: string | null
    approvedAt: string | null
  }>): Promise<SbInvoice | null> {
    const s = DV.sbInvoice
    logDataverseInfo('SbInvoiceService.update', 'Updating SB invoice', { id, fields: Object.keys(data) })

    const payload: Record<string, unknown> = {}

    if (data.invoiceNumber !== undefined) payload[s.name] = data.invoiceNumber
    if (data.invoiceDate !== undefined) payload[s.invoiceDate] = data.invoiceDate
    if (data.dueDate !== undefined) payload[s.dueDate] = data.dueDate
    if (data.netAmount !== undefined) payload[s.netAmount] = data.netAmount
    if (data.vatAmount !== undefined) payload[s.vatAmount] = data.vatAmount
    if (data.grossAmount !== undefined) payload[s.grossAmount] = data.grossAmount
    if (data.currency !== undefined) payload[s.currency] = data.currency
    if (data.status !== undefined) payload[s.status] = mapAppStatusToDv(data.status)
    if (data.sellerRejectionReason !== undefined) payload[s.sellerRejectionReason] = data.sellerRejectionReason
    if (data.sentDate !== undefined) payload[s.sentDate] = data.sentDate
    if (data.ksefReferenceNumber !== undefined) payload[s.ksefReferenceNumber] = data.ksefReferenceNumber
    if (data.ksefInvoiceId !== undefined) {
      payload[s.ksefInvoiceBind] = data.ksefInvoiceId
        ? `/dvlp_ksefinvoices(${data.ksefInvoiceId})`
        : null
    }
    if (data.mpkCenterId !== undefined) {
      payload[s.mpkCenterBind] = data.mpkCenterId
        ? `/dvlp_ksefmpkcenters(${data.mpkCenterId})`
        : null
    }
    if (data.submittedByUserId !== undefined) {
      payload[s.submittedByUserBind] = data.submittedByUserId
        ? `/systemusers(${data.submittedByUserId})`
        : null
    }
    if (data.submittedAt !== undefined) payload[s.submittedAt] = data.submittedAt || null
    if (data.approvedByUserId !== undefined) {
      payload[s.approvedByUserBind] = data.approvedByUserId
        ? `/systemusers(${data.approvedByUserId})`
        : null
    }
    if (data.approvedAt !== undefined) payload[s.approvedAt] = data.approvedAt || null

    try {
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('SbInvoiceService.update', error)
      throw error
    }
  }

  async updateStatus(
    id: string,
    status: SelfBillingInvoiceStatus,
    rejectionReason?: string,
  ): Promise<SbInvoice | null> {
    const updateData: Partial<{
      status: SelfBillingInvoiceStatus
      sellerRejectionReason: string
      sentDate: string
    }> = { status }

    if (status === 'SellerRejected' && rejectionReason) {
      updateData.sellerRejectionReason = rejectionReason
    }
    if (status === 'SentToKsef') {
      updateData.sentDate = new Date().toISOString()
    }

    return this.update(id, updateData)
  }

  async delete(id: string): Promise<void> {
    logDataverseInfo('SbInvoiceService.delete', 'Deleting SB invoice', { id })

    try {
      // Line items cascade-delete in Dataverse, but let's be safe
      await this.deleteLineItemsForInvoice(id)
      await dataverseClient.delete(this.entitySet, id)
    } catch (error) {
      logDataverseError('SbInvoiceService.delete', error)
      throw error
    }
  }

  /**
   * Create invoice with line items in one logical operation.
   * Creates the invoice header first, then creates line items.
   */
  async createWithItems(
    invoiceData: {
      settingId: string
      invoiceNumber: string
      invoiceDate: string
      dueDate?: string
      netAmount: number
      vatAmount: number
      grossAmount: number
      currency?: string
      supplierId: string
      agreementId?: string
      mpkCenterId?: string
    },
    itemsData: Array<{
      itemDescription: string
      quantity: number
      unit: string
      unitPrice: number
      vatRate: number
      netAmount: number
      vatAmount: number
      grossAmount: number
      paymentTermDays?: number | null
      sortOrder?: number
      templateId?: string
    }>,
  ): Promise<SbInvoice> {
    const invoice = await this.create(invoiceData)

    const items: SbLineItem[] = []
    for (const itemData of itemsData) {
      const item = await this.createLineItem(invoice.id, itemData)
      items.push(item)
    }

    return { ...invoice, items }
  }

  /**
   * Replace all line items for an invoice (delete old, create new).
   * Also recalculates and updates invoice totals.
   */
  async replaceLineItems(
    sbInvoiceId: string,
    itemsData: Array<{
      itemDescription: string
      quantity: number
      unit: string
      unitPrice: number
      vatRate: number
      netAmount: number
      vatAmount: number
      grossAmount: number
      paymentTermDays?: number | null
      sortOrder?: number
      templateId?: string
    }>,
  ): Promise<SbLineItem[]> {
    await this.deleteLineItemsForInvoice(sbInvoiceId)

    const items: SbLineItem[] = []
    for (const itemData of itemsData) {
      const item = await this.createLineItem(sbInvoiceId, itemData)
      items.push(item)
    }

    // Update invoice totals
    const totals = items.reduce(
      (acc, item) => ({
        netAmount: acc.netAmount + item.netAmount,
        vatAmount: acc.vatAmount + item.vatAmount,
        grossAmount: acc.grossAmount + item.grossAmount,
      }),
      { netAmount: 0, vatAmount: 0, grossAmount: 0 },
    )

    await this.update(sbInvoiceId, totals)

    return items
  }

  /**
   * Find an active invoice with the given number within a setting, optionally excluding one id.
   * Returns the first match or null.
   */
  async findByInvoiceNumber(settingId: string, invoiceNumber: string, excludeId?: string): Promise<SbInvoice | null> {
    const s = DV.sbInvoice
    let filter = `${s.stateCode} eq 0 and ${s.settingLookup} eq ${escapeOData(settingId)} and ${s.name} eq '${escapeOData(invoiceNumber)}'`
    if (excludeId) {
      filter += ` and ${s.id} ne ${escapeOData(excludeId)}`
    }
    const query = `$filter=${filter}&$top=1`
    try {
      const response = await dataverseClient.list<DvSbInvoice>(this.entitySet, query)
      const records = response?.value ?? []
      return records.length > 0 ? mapDvInvoiceToApp(records[0]) : null
    } catch (error) {
      logDataverseError('SbInvoiceService.findByInvoiceNumber', error)
      throw error
    }
  }

  /**
   * Build an invoice number from a template string.
   * Supported variables: {YYYY}, {MM}, {NNN}, {NNNN}, {SUPPLIER}, {NIP}
   * Default template: SF/{YYYY}/{MM}/{NNN}
   */
  buildInvoiceNumber(
    template: string,
    year: number,
    month: number,
    seq: number,
    supplierShortName?: string | null,
    supplierNip?: string | null,
  ): string {
    const supplierTag = (supplierShortName || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20)
    return template
      .replace(/\{YYYY\}/g, String(year))
      .replace(/\{MM\}/g, String(month).padStart(2, '0'))
      .replace(/\{NNN\}/g, String(seq).padStart(3, '0'))
      .replace(/\{NNNN\}/g, String(seq).padStart(4, '0'))
      .replace(/\{SUPPLIER\}/g, supplierTag)
      .replace(/\{NIP\}/g, supplierNip || '')
  }

  /**
   * Extract the static prefix from a template (everything before the first sequence variable).
   * Used for querying existing invoices to determine the next number.
   */
  private getTemplatePrefix(template: string, year: number, month: number, supplierShortName?: string | null, supplierNip?: string | null): string {
    const supplierTag = (supplierShortName || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20)
    // Replace known static variables first
    let prefix = template
      .replace(/\{YYYY\}/g, String(year))
      .replace(/\{MM\}/g, String(month).padStart(2, '0'))
      .replace(/\{SUPPLIER\}/g, supplierTag)
      .replace(/\{NIP\}/g, supplierNip || '')
    // Cut at the sequence variable
    const seqIdx = prefix.search(/\{N{3,4}\}/)
    if (seqIdx >= 0) {
      prefix = prefix.substring(0, seqIdx)
    }
    return prefix
  }

  /**
   * Get the next sequential invoice number for a given setting/period.
   * Optionally accepts a template and supplier info for per-supplier numbering.
   */
  async getNextInvoiceNumber(
    settingId: string,
    year: number,
    month: number,
    template?: string | null,
    supplierShortName?: string | null,
    supplierNip?: string | null,
  ): Promise<string> {
    const s = DV.sbInvoice
    const tpl = template || 'SF/{YYYY}/{MM}/{NNN}'
    const prefix = this.getTemplatePrefix(tpl, year, month, supplierShortName, supplierNip)
    const seqLen = tpl.includes('{NNNN}') ? 4 : 3

    const filter = `${s.stateCode} eq 0 and ${s.settingLookup} eq ${escapeOData(settingId)} and startswith(${s.name},'${prefix}')`
    const query = `$filter=${filter}&$select=${s.name}&$orderby=${s.name} desc&$top=1`

    try {
      const response = await dataverseClient.list<DvSbInvoice>(this.entitySet, query)
      const records = response?.value ?? []
      if (records.length === 0) {
        return this.buildInvoiceNumber(tpl, year, month, 1, supplierShortName, supplierNip)
      }
      const lastName = records[0][s.name as keyof DvSbInvoice] as string
      // Extract the sequence number (last numeric segment after the prefix)
      const seqStr = lastName.substring(prefix.length).replace(/^[^0-9]*/, '').replace(/[^0-9].*$/, '')
      const lastSeq = parseInt(seqStr || '0', 10)
      return this.buildInvoiceNumber(tpl, year, month, lastSeq + 1, supplierShortName, supplierNip)
    } catch (error) {
      logDataverseError('SbInvoiceService.getNextInvoiceNumber', error)
      throw error
    }
  }
}

export const sbInvoiceService = new SbInvoiceService()
