import { dataverseRequest } from './client'
import { InvoiceEntity, PaymentStatusValues, MpkValues, getPaymentStatusKey, getMpkKey } from './entities'
import { Invoice, InvoiceCreate, InvoiceUpdate, InvoiceListParams } from '../../types/invoice'

/**
 * List invoices from Dataverse
 */
export async function listInvoices(params: InvoiceListParams = {}): Promise<Invoice[]> {
  const { tenantNip, paymentStatus, mpk, category, fromDate, toDate, top = 100, skip = 0 } = params

  // Build OData filter
  const filters: string[] = []

  if (tenantNip) {
    filters.push(`${InvoiceEntity.fields.tenantNip} eq '${tenantNip}'`)
  }

  if (paymentStatus) {
    const statusValue = PaymentStatusValues[paymentStatus]
    filters.push(`${InvoiceEntity.fields.paymentStatus} eq ${statusValue}`)
  }

  if (mpk && mpk in MpkValues) {
    const mpkValue = MpkValues[mpk as keyof typeof MpkValues]
    filters.push(`${InvoiceEntity.fields.mpk} eq ${mpkValue}`)
  }

  if (category) {
    filters.push(`contains(${InvoiceEntity.fields.category}, '${category}')`)
  }

  if (fromDate) {
    filters.push(`${InvoiceEntity.fields.invoiceDate} ge ${fromDate}`)
  }

  if (toDate) {
    filters.push(`${InvoiceEntity.fields.invoiceDate} le ${toDate}`)
  }

  let path = `${InvoiceEntity.entitySet}?$top=${top}&$skip=${skip}&$orderby=${InvoiceEntity.fields.invoiceDate} desc`

  if (filters.length > 0) {
    path += `&$filter=${filters.join(' and ')}`
  }

  const response = await dataverseRequest<{ value: DataverseInvoice[] }>(path)

  return response.value.map(mapFromDataverse)
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
  const path = `${InvoiceEntity.entitySet}?$filter=${InvoiceEntity.fields.referenceNumber} eq '${referenceNumber}'&$select=${InvoiceEntity.fields.id}&$top=1`

  const response = await dataverseRequest<{ value: unknown[] }>(path)
  return response.value.length > 0
}

/**
 * Create invoice
 */
export async function createInvoice(data: InvoiceCreate): Promise<Invoice> {
  const body = mapToDataverse(data)

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
    body[InvoiceEntity.fields.paymentDate] = data.paymentDate
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
    aiMpkSuggestion: record[f.aiMpkSuggestion]
      ? getMpkKey(record[f.aiMpkSuggestion] as number) as Invoice['mpk']
      : undefined,
    aiCategorySuggestion: record[f.aiCategorySuggestion] as string | undefined,
    aiConfidence: record[f.aiConfidence] as number | undefined,
  }
}

function mapToDataverse(data: InvoiceCreate): Record<string, unknown> {
  const f = InvoiceEntity.fields

  return {
    [f.tenantNip]: data.tenantNip,
    [f.tenantName]: data.tenantName,
    [f.referenceNumber]: data.referenceNumber,
    [f.invoiceNumber]: data.invoiceNumber,
    [f.supplierNip]: data.supplierNip,
    [f.supplierName]: data.supplierName,
    [f.invoiceDate]: data.invoiceDate,
    [f.dueDate]: data.dueDate,
    [f.netAmount]: data.netAmount,
    [f.vatAmount]: data.vatAmount,
    [f.grossAmount]: data.grossAmount,
    [f.paymentStatus]: PaymentStatusValues.pending,
    [f.rawXml]: data.rawXml,
    [f.importedAt]: new Date().toISOString(),
  }
}
