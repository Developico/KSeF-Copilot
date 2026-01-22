/**
 * KSeF Invoice Operations
 * Send, receive, and manage invoices through KSeF
 */

import { getKsefConfig } from './config'
import { getActiveSession, ensureActiveSession } from './session'
import { parseInvoiceFromXml, buildInvoiceXml } from './parser'
import {
  KsefInvoice,
  KsefSendInvoiceResponse,
  KsefGetInvoiceResponse,
  KsefInvoiceStatusResponse,
  KsefQueryInvoicesRequest,
  KsefQueryInvoicesResponse,
} from './types'

/**
 * Send invoice to KSeF
 */
export async function sendInvoice(
  nip: string,
  invoice: KsefInvoice
): Promise<KsefSendInvoiceResponse> {
  const session = await ensureActiveSession(nip)
  const config = getKsefConfig()
  
  // Build FA(2) XML
  const invoiceXml = buildInvoiceXml(invoice)
  
  // Calculate hash
  const hash = await calculateInvoiceHash(invoiceXml)
  
  // Send to KSeF
  const response = await fetch(`${config.baseUrl}/online/Invoice/Send`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      Accept: 'application/json',
      SessionToken: session.sessionToken,
    },
    body: invoiceXml,
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send invoice: ${response.status} - ${error}`)
  }
  
  const result: KsefSendInvoiceResponse = await response.json()
  
  return {
    ...result,
    invoiceHash: hash,
  }
}

/**
 * Get invoice by KSeF reference number
 */
export async function getInvoice(
  nip: string,
  ksefReferenceNumber: string
): Promise<KsefGetInvoiceResponse> {
  const session = await ensureActiveSession(nip)
  const config = getKsefConfig()
  
  const response = await fetch(
    `${config.baseUrl}/online/Invoice/Get/${ksefReferenceNumber}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream',
        SessionToken: session.sessionToken,
      },
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get invoice: ${response.status} - ${error}`)
  }
  
  const invoiceXml = await response.text()
  const invoice = parseInvoiceFromXml(invoiceXml)
  
  return {
    ksefReferenceNumber,
    invoiceXml,
    invoice,
  }
}

/**
 * Get invoice status
 */
export async function getInvoiceStatus(
  nip: string,
  elementReferenceNumber: string
): Promise<KsefInvoiceStatusResponse> {
  const session = await ensureActiveSession(nip)
  const config = getKsefConfig()
  
  const response = await fetch(
    `${config.baseUrl}/online/Invoice/Status/${elementReferenceNumber}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        SessionToken: session.sessionToken,
      },
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get invoice status: ${response.status} - ${error}`)
  }
  
  return response.json()
}

/**
 * Query invoices from KSeF (incoming or outgoing)
 */
export async function queryInvoices(
  nip: string,
  query: KsefQueryInvoicesRequest
): Promise<KsefQueryInvoicesResponse> {
  const session = await ensureActiveSession(nip)
  const config = getKsefConfig()
  
  // Build query parameters
  const params = new URLSearchParams()
  
  if (query.dateFrom) params.append('dateFrom', query.dateFrom)
  if (query.dateTo) params.append('dateTo', query.dateTo)
  if (query.subjectType) params.append('subjectType', query.subjectType)
  if (query.type) params.append('type', query.type)
  if (query.pageSize) params.append('pageSize', query.pageSize.toString())
  if (query.pageOffset) params.append('pageOffset', query.pageOffset.toString())
  
  const endpoint = query.subjectType === 'subject1' 
    ? '/online/Query/Invoice/Sync' // Outgoing (we are seller)
    : '/online/Query/Invoice/Sync' // Incoming (we are buyer)
  
  const response = await fetch(
    `${config.baseUrl}${endpoint}?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        SessionToken: session.sessionToken,
      },
      body: JSON.stringify({
        queryCriteria: {
          subjectType: query.subjectType || 'subject2', // Default: incoming
          type: query.type || 'incremental',
          acquisitionTimestampThresholdFrom: query.dateFrom,
          acquisitionTimestampThresholdTo: query.dateTo,
        },
      }),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to query invoices: ${response.status} - ${error}`)
  }
  
  return response.json()
}

/**
 * Sync incoming invoices (download new invoices from KSeF)
 */
export async function syncIncomingInvoices(
  nip: string,
  lastSyncDate?: Date
): Promise<KsefInvoice[]> {
  const query: KsefQueryInvoicesRequest = {
    subjectType: 'subject2', // We are the buyer
    type: 'incremental',
    dateFrom: lastSyncDate?.toISOString() || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString(),
    pageSize: 100,
    pageOffset: 0,
  }
  
  const result = await queryInvoices(nip, query)
  const invoices: KsefInvoice[] = []
  
  // Download each invoice
  for (const ref of result.invoiceHeaderList || []) {
    try {
      const invoiceData = await getInvoice(nip, ref.ksefReferenceNumber)
      invoices.push(invoiceData.invoice)
    } catch (error) {
      console.error(`Failed to download invoice ${ref.ksefReferenceNumber}:`, error)
    }
  }
  
  return invoices
}

/**
 * Download UPO (Official Confirmation of Receipt)
 */
export async function downloadUPO(
  nip: string,
  ksefReferenceNumber: string
): Promise<string> {
  const session = await ensureActiveSession(nip)
  const config = getKsefConfig()
  
  const response = await fetch(
    `${config.baseUrl}/online/Invoice/UPO/${ksefReferenceNumber}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        SessionToken: session.sessionToken,
      },
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to download UPO: ${response.status} - ${error}`)
  }
  
  // Return base64 encoded PDF
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

/**
 * Calculate SHA-256 hash of invoice XML
 */
async function calculateInvoiceHash(xml: string): Promise<string> {
  const crypto = await import('crypto')
  return crypto.createHash('sha256').update(xml, 'utf8').digest('hex')
}

/**
 * Batch send multiple invoices
 */
export async function batchSendInvoices(
  nip: string,
  invoices: KsefInvoice[]
): Promise<{ success: KsefSendInvoiceResponse[]; failed: { invoice: KsefInvoice; error: string }[] }> {
  const success: KsefSendInvoiceResponse[] = []
  const failed: { invoice: KsefInvoice; error: string }[] = []
  
  for (const invoice of invoices) {
    try {
      const result = await sendInvoice(nip, invoice)
      success.push(result)
    } catch (error) {
      failed.push({
        invoice,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return { success, failed }
}
