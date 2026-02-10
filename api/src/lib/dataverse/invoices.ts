import { dataverseRequest, dataverseClient } from './client'
import { InvoiceEntity, PaymentStatusValues, MpkValues, InvoiceSourceValues, getPaymentStatusKey, getMpkKey, getInvoiceSourceKey } from './entities'
import { escapeOData } from './odata-utils'
import { mapDvCurrencyToApp } from './mappers'
import { Invoice, InvoiceCreate, InvoiceUpdate, InvoiceListParams, ManualInvoiceCreate, InvoiceSource } from '../../types/invoice'
import { logDataverseInfo } from './logger'

/**
 * Build OData filter string from params
 */
function buildInvoiceFilter(params: InvoiceListParams): string[] {
  const { 
    tenantNip,
    settingId,
    paymentStatus, 
    mpk,
    mpkList,
    category, 
    fromDate, 
    toDate,
    dueDateFrom,
    dueDateTo,
    minAmount,
    maxAmount,
    supplierNip,
    supplierName,
    source,
    overdue,
    search,
  } = params

  const filters: string[] = []

  // Filter by setting ID (preferred for multi-environment support)
  if (settingId) {
    filters.push(`_dvlp_settingid_value eq ${settingId}`)
  } else if (tenantNip) {
    // Fallback to NIP filter for backward compatibility
    filters.push(`${InvoiceEntity.fields.tenantNip} eq '${escapeOData(tenantNip)}'`)
  }

  if (paymentStatus) {
    const statusValue = PaymentStatusValues[paymentStatus]
    filters.push(`${InvoiceEntity.fields.paymentStatus} eq ${statusValue}`)
  }

  // Single MPK filter
  if (mpk && mpk in MpkValues) {
    const mpkValue = MpkValues[mpk as keyof typeof MpkValues]
    filters.push(`${InvoiceEntity.fields.mpk} eq ${mpkValue}`)
  }

  // Multiple MPK filter (OR condition)
  if (mpkList && mpkList.length > 0) {
    const mpkFilters = mpkList
      .filter(m => m in MpkValues)
      .map(m => `${InvoiceEntity.fields.mpk} eq ${MpkValues[m as keyof typeof MpkValues]}`)
    if (mpkFilters.length > 0) {
      filters.push(`(${mpkFilters.join(' or ')})`)
    }
  }

  if (category) {
    filters.push(`contains(${InvoiceEntity.fields.category}, '${escapeOData(category)}')`)
  }

  // Invoice date range
  if (fromDate) {
    filters.push(`${InvoiceEntity.fields.invoiceDate} ge ${fromDate}`)
  }
  if (toDate) {
    filters.push(`${InvoiceEntity.fields.invoiceDate} le ${toDate}`)
  }

  // Due date range
  if (dueDateFrom) {
    filters.push(`${InvoiceEntity.fields.dueDate} ge ${dueDateFrom}`)
  }
  if (dueDateTo) {
    filters.push(`${InvoiceEntity.fields.dueDate} le ${dueDateTo}`)
  }

  // Amount range (using grossAmount)
  if (minAmount !== undefined && minAmount > 0) {
    filters.push(`${InvoiceEntity.fields.grossAmount} ge ${minAmount}`)
  }
  if (maxAmount !== undefined && maxAmount > 0) {
    filters.push(`${InvoiceEntity.fields.grossAmount} le ${maxAmount}`)
  }

  // Supplier filters
  if (supplierNip) {
    filters.push(`${InvoiceEntity.fields.supplierNip} eq '${escapeOData(supplierNip)}'`)
  }
  if (supplierName) {
    filters.push(`contains(${InvoiceEntity.fields.supplierName}, '${escapeOData(supplierName)}')`)
  }

  // Source filter
  if (source && source in InvoiceSourceValues) {
    filters.push(`${InvoiceEntity.fields.source} eq ${InvoiceSourceValues[source]}`)
  }

  // Overdue filter (pending + past due date)
  if (overdue) {
    const today = new Date().toISOString().split('T')[0]
    filters.push(`${InvoiceEntity.fields.paymentStatus} eq ${PaymentStatusValues.pending}`)
    filters.push(`${InvoiceEntity.fields.dueDate} lt ${today}`)
  }

  // Full-text search (invoice number, supplier name)
  if (search) {
    const safeSearch = escapeOData(search)
    const searchFilters = [
      `contains(${InvoiceEntity.fields.invoiceNumber}, '${safeSearch}')`,
      `contains(${InvoiceEntity.fields.supplierName}, '${safeSearch}')`,
      `contains(${InvoiceEntity.fields.supplierNip}, '${safeSearch}')`,
    ]
    filters.push(`(${searchFilters.join(' or ')})`)
  }

  return filters
}

/**
 * Map order by parameter to Dataverse field
 */
function getOrderByField(orderBy: string): string {
  switch (orderBy) {
    case 'grossAmount':
      return InvoiceEntity.fields.grossAmount
    case 'supplierName':
      return InvoiceEntity.fields.supplierName
    case 'dueDate':
      return InvoiceEntity.fields.dueDate
    case 'invoiceDate':
    default:
      return InvoiceEntity.fields.invoiceDate
  }
}

/**
 * List invoices from Dataverse with advanced filtering (single page)
 * Note: This returns only up to 'top' records. For large datasets use listAllInvoices().
 */
export async function listInvoices(params: InvoiceListParams = {}): Promise<Invoice[]> {
  const { 
    top = 100, 
    orderBy = 'invoiceDate',
    orderDirection = 'desc',
  } = params

  const filters = buildInvoiceFilter(params)
  const orderByField = getOrderByField(orderBy)
  const orderClause = `${orderByField} ${orderDirection}`

  // Note: Dataverse doesn't support $skip, only $top for pagination
  // For proper pagination, use @odata.nextLink from response
  let path = `${InvoiceEntity.entitySet}?$top=${top}&$orderby=${orderClause}`

  if (filters.length > 0) {
    path += `&$filter=${filters.join(' and ')}`
  }

  const response = await dataverseRequest<{ value: DataverseInvoice[] }>(path)

  return response.value.map(mapFromDataverse)
}

/**
 * List ALL invoices matching filters, following @odata.nextLink for full pagination.
 * Use this when you need to process all matching records (e.g., bulk operations, cleanup).
 * 
 * WARNING: This may return a large number of records. Use with caution.
 */
export async function listAllInvoices(params: Omit<InvoiceListParams, 'top' | 'skip'> = {}): Promise<Invoice[]> {
  const { 
    orderBy = 'invoiceDate',
    orderDirection = 'desc',
  } = params

  const filters = buildInvoiceFilter(params)
  const orderByField = getOrderByField(orderBy)
  const orderClause = `${orderByField} ${orderDirection}`

  let query = `$orderby=${orderClause}`
  if (filters.length > 0) {
    query += `&$filter=${filters.join(' and ')}`
  }

  // Use dataverseClient.listAll which handles @odata.nextLink pagination
  const records = await dataverseClient.listAll<DataverseInvoice>(InvoiceEntity.entitySet, query)

  return records.map(mapFromDataverse)
}

/**
 * Get count of invoices matching filters
 */
export async function countInvoices(params: Omit<InvoiceListParams, 'top' | 'skip' | 'orderBy' | 'orderDirection'> = {}): Promise<number> {
  const filters = buildInvoiceFilter(params)
  
  let path = `${InvoiceEntity.entitySet}/$count`
  if (filters.length > 0) {
    path += `?$filter=${filters.join(' and ')}`
  }

  const response = await dataverseRequest<number>(path)
  return response
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const response = await dataverseRequest<DataverseInvoice>(
      `${InvoiceEntity.entitySet}(${id})`
    )
    return mapFromDataverse(response)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Check if invoice exists by KSeF reference number
 */
export async function invoiceExistsByReference(referenceNumber: string): Promise<boolean> {
  const path = `${InvoiceEntity.entitySet}?$filter=${InvoiceEntity.fields.referenceNumber} eq '${escapeOData(referenceNumber)}'&$select=${InvoiceEntity.fields.id}&$top=1`

  const response = await dataverseRequest<{ value: unknown[] }>(path)
  return response.value.length > 0
}

/**
 * Create invoice
 */
export async function createInvoice(data: InvoiceCreate): Promise<Invoice> {
  const body = mapToDataverse(data)

  // Log the settingId binding for debugging
  if (data.settingId) {
    logDataverseInfo('createInvoice', 'Creating invoice with settingId binding', {
      settingId: data.settingId,
      binding: body['dvlp_settingid@odata.bind'],
    })
  } else {
    logDataverseInfo('createInvoice', 'WARNING: Creating invoice WITHOUT settingId!', {
      referenceNumber: data.referenceNumber,
    })
  }

  const response = await dataverseRequest<DataverseInvoice>(InvoiceEntity.entitySet, {
    method: 'POST',
    body,
  })

  return mapFromDataverse(response)
}

/**
 * Update invoice
 */
export async function updateInvoice(id: string, data: InvoiceUpdate): Promise<Invoice> {
  const body: Record<string, unknown> = {}

  if (data.mpk !== undefined) {
    body[InvoiceEntity.fields.mpk] = data.mpk in MpkValues
      ? MpkValues[data.mpk as keyof typeof MpkValues]
      : null
  }

  if (data.category !== undefined) {
    body[InvoiceEntity.fields.category] = data.category
  }

  if (data.description !== undefined) {
    body[InvoiceEntity.fields.description] = data.description
  }

  if (data.project !== undefined) {
    body[InvoiceEntity.fields.project] = data.project
  }

  if (data.tags !== undefined) {
    body[InvoiceEntity.fields.tags] = JSON.stringify(data.tags)
  }

  if (data.paymentStatus !== undefined) {
    body[InvoiceEntity.fields.paymentStatus] = PaymentStatusValues[data.paymentStatus]
  }

  if (data.paymentDate !== undefined) {
    body[InvoiceEntity.fields.paymentDate] = sanitizeDateForDataverse(data.paymentDate)
  }

  await dataverseRequest(`${InvoiceEntity.entitySet}(${id})`, {
    method: 'PATCH',
    body,
  })

  // Fetch updated record
  const updated = await getInvoiceById(id)
  if (!updated) {
    throw new Error('Invoice not found after update')
  }

  return updated
}

/**
 * Delete invoice
 */
export async function deleteInvoice(id: string): Promise<void> {
  await dataverseRequest(`${InvoiceEntity.entitySet}(${id})`, {
    method: 'DELETE',
  })
}

/**
 * Bulk delete invoices with progress callback.
 * Fetches ALL matching invoices using pagination and deletes them in batches.
 * 
 * @param params - Filter parameters (same as listInvoices but without top/skip)
 * @param options - Options for batch processing
 * @returns Summary of deleted/failed counts
 */
export async function bulkDeleteInvoices(
  params: Omit<InvoiceListParams, 'top' | 'skip'>,
  options?: {
    batchSize?: number
    onProgress?: (deleted: number, failed: number, total: number) => void
    dryRun?: boolean
  }
): Promise<{ deleted: number; failed: number; total: number; errors: string[] }> {
  const { batchSize = 50, onProgress, dryRun = false } = options || {}
  
  // First, get all matching invoices (using pagination)
  const allInvoices = await listAllInvoices(params)
  const total = allInvoices.length
  
  if (dryRun) {
    return { deleted: 0, failed: 0, total, errors: [] }
  }

  let deleted = 0
  let failed = 0
  const errors: string[] = []

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < allInvoices.length; i += batchSize) {
    const batch = allInvoices.slice(i, i + batchSize)
    
    // Delete in parallel within batch, but sequentially between batches
    const results = await Promise.allSettled(
      batch.map(invoice => deleteInvoice(invoice.id))
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

    // Report progress
    if (onProgress) {
      onProgress(deleted, failed, total)
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < allInvoices.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return { deleted, failed, total, errors }
}

// ============================================================================
// Mapping functions
// ============================================================================

interface DataverseInvoice {
  [key: string]: unknown
}

function mapFromDataverse(record: DataverseInvoice): Invoice {
  const f = InvoiceEntity.fields

  return {
    id: record[f.id] as string,
    tenantNip: record[f.tenantNip] as string,
    tenantName: record[f.tenantName] as string,
    referenceNumber: record[f.referenceNumber] as string,
    invoiceNumber: record[f.invoiceNumber] as string,
    supplierNip: record[f.supplierNip] as string,
    supplierName: record[f.supplierName] as string,
    supplierAddress: record[f.supplierAddress] as string | undefined,
    supplierCity: record[f.supplierCity] as string | undefined,
    supplierPostalCode: record[f.supplierPostalCode] as string | undefined,
    supplierCountry: record[f.supplierCountry] as string | undefined,
    buyerAddress: record[f.buyerAddress] as string | undefined,
    buyerCity: record[f.buyerCity] as string | undefined,
    buyerPostalCode: record[f.buyerPostalCode] as string | undefined,
    buyerCountry: record[f.buyerCountry] as string | undefined,
    invoiceDate: record[f.invoiceDate] as string,
    dueDate: record[f.dueDate] as string | undefined,
    netAmount: record[f.netAmount] as number,
    vatAmount: record[f.vatAmount] as number,
    grossAmount: record[f.grossAmount] as number,
    paymentStatus: getPaymentStatusKey(record[f.paymentStatus] as number),
    paymentDate: record[f.paymentDate] as string | undefined,
    mpk: getMpkKey(record[f.mpk] as number) as Invoice['mpk'],
    category: record[f.category] as string | undefined,
    project: record[f.project] as string | undefined,
    tags: record[f.tags] ? JSON.parse(record[f.tags] as string) : undefined,
    rawXml: record[f.rawXml] as string | undefined,
    importedAt: record[f.importedAt] as string,
    source: getInvoiceSourceKey(record[f.source] as number),
    // Description field
    description: record[f.description] as string | undefined,
    // Currency fields
    currency: mapDvCurrencyToApp(record[f.currency] as number | undefined),
    exchangeRate: record[f.exchangeRate] as number | undefined,
    grossAmountPln: record[f.grossAmountPln] as number | undefined,
    // AI categorization fields
    aiMpkSuggestion: record[f.aiMpkSuggestion]
      ? getMpkKey(record[f.aiMpkSuggestion] as number) as Invoice['mpk']
      : undefined,
    aiCategorySuggestion: record[f.aiCategorySuggestion] as string | undefined,
    aiDescription: record[f.aiDescription] as string | undefined,
    aiRationale: record[f.aiRationale] as string | undefined,
    aiConfidence: record[f.aiConfidence] as number | undefined,
    aiProcessedAt: record[f.aiProcessedAt] as string | undefined,
  }
}

/**
 * Sanitize a date value for Dataverse CRM DateTime fields.
 * Dataverse rejects dates before 01/01/1753.
 * Converts empty strings, undefined, and invalid dates to null.
 */
function sanitizeDateForDataverse(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  const date = new Date(value)
  if (isNaN(date.getTime())) return null
  // CRM DateTime minimum: 1753-01-01
  if (date.getFullYear() < 1753) return null
  return value
}

function mapToDataverse(data: InvoiceCreate): Record<string, unknown> {
  const f = InvoiceEntity.fields
  const sourceValue = data.source
    ? InvoiceSourceValues[data.source]
    : InvoiceSourceValues.KSeF

  const result: Record<string, unknown> = {
    [f.tenantNip]: data.tenantNip,
    [f.tenantName]: data.tenantName,
    [f.referenceNumber]: data.referenceNumber,
    [f.invoiceNumber]: data.invoiceNumber,
    [f.invoiceNumberField]: data.invoiceNumber, // Also save to dedicated field
    [f.supplierNip]: data.supplierNip,
    [f.supplierName]: data.supplierName,
    [f.invoiceDate]: sanitizeDateForDataverse(data.invoiceDate),
    [f.dueDate]: sanitizeDateForDataverse(data.dueDate),
    [f.netAmount]: data.netAmount,
    [f.vatAmount]: data.vatAmount,
    [f.grossAmount]: data.grossAmount,
    [f.paymentStatus]: PaymentStatusValues.pending,
    [f.rawXml]: data.rawXml,
    [f.importedAt]: new Date().toISOString(),
    [f.source]: sourceValue,
    [f.description]: data.description,
    [f.mpk]: data.mpk && data.mpk in MpkValues
      ? MpkValues[data.mpk as keyof typeof MpkValues]
      : null,
    [f.category]: data.category,
    // AI suggestion fields
    [f.aiMpkSuggestion]: data.aiMpkSuggestion && data.aiMpkSuggestion in MpkValues
      ? MpkValues[data.aiMpkSuggestion as keyof typeof MpkValues]
      : null,
    [f.aiCategorySuggestion]: data.aiCategorySuggestion,
    [f.aiDescription]: data.aiDescription,
    [f.aiConfidence]: data.aiConfidence,
    [f.aiProcessedAt]: data.aiConfidence ? new Date().toISOString() : null,
  }

  // Add settingId lookup binding if provided
  if (data.settingId) {
    result['dvlp_settingid@odata.bind'] = `/dvlp_ksefsettings(${data.settingId})`
  }

  return result
}

/**
 * Create invoice from manual entry
 */
export async function createManualInvoice(data: ManualInvoiceCreate): Promise<Invoice> {
  // Generate a unique reference number for manual invoices
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const referenceNumber = `MANUAL-${timestamp}-${random}`

  const createData: InvoiceCreate = {
    ...data,
    referenceNumber,
    source: InvoiceSource.Manual,
  }

  return createInvoice(createData)
}
