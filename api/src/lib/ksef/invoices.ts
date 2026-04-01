/**
 * KSeF Invoice Operations
 * Send, receive, and manage invoices through KSeF
 */

import { getKsefConfigForNip } from './config'
import { getActiveSession, ensureActiveSession, checkRateLimit, getRateLimitStatus } from './session'
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
 * Send invoice to KSeF - API 2.0
 */
export async function sendInvoice(
  nip: string,
  invoice: KsefInvoice,
  settingId?: string
): Promise<KsefSendInvoiceResponse> {
  const session = await ensureActiveSession(nip, settingId)
  const config = await getKsefConfigForNip(nip, settingId)
  
  // Build FA(3) XML
  const invoiceXml = buildInvoiceXml(invoice)
  
  // Calculate hash
  const hash = await calculateInvoiceHash(invoiceXml)
  
  console.log(`[KSEF] Sending invoice to: ${config.baseUrl}/invoices`)
  
  // Send to KSeF API 2.0
  const response = await fetch(`${config.baseUrl}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: invoiceXml,
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error(`[KSEF] Send invoice failed:`, error.substring(0, 500))
    throw new Error(`Failed to send invoice: ${response.status} - ${error.substring(0, 200)}`)
  }
  
  const result = await response.json() as KsefSendInvoiceResponse
  
  return {
    ...result,
    invoiceHash: hash,
  }
}

/**
 * Send pre-built XML directly to KSeF (for approved self-billing invoices)
 */
export async function sendInvoiceXml(
  nip: string,
  invoiceXml: string,
  settingId?: string
): Promise<KsefSendInvoiceResponse> {
  const session = await ensureActiveSession(nip, settingId)
  const config = await getKsefConfigForNip(nip, settingId)

  const hash = await calculateInvoiceHash(invoiceXml)

  console.log(`[KSEF] Sending pre-built XML to: ${config.baseUrl}/invoices`)

  const response = await fetch(`${config.baseUrl}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: invoiceXml,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`[KSEF] Send invoice XML failed:`, error.substring(0, 500))
    throw new Error(`Failed to send invoice: ${response.status} - ${error.substring(0, 200)}`)
  }

  const result = await response.json() as KsefSendInvoiceResponse

  return {
    ...result,
    invoiceHash: hash,
  }
}

/**
 * Get invoice by KSeF reference number - API 2.0
 * GET /invoices/ksef/{ksefNumber}
 */
export async function getInvoice(
  nip: string,
  ksefReferenceNumber: string
): Promise<KsefGetInvoiceResponse> {
  const session = await ensureActiveSession(nip)
  const config = await getKsefConfigForNip(nip)
  
  console.log(`[KSEF] Getting invoice: ${ksefReferenceNumber}`)
  console.log(`[KSEF] Base URL: ${config.baseUrl}`)
  console.log(`[KSEF] Session NIP: ${session.nip}`)
  console.log(`[KSEF] Session token present: ${!!session.sessionToken}`)
  
  // API 2.0 uses /invoices/ksef/{ksefNumber}
  const url = `${config.baseUrl}/invoices/ksef/${ksefReferenceNumber}`
  console.log(`[KSEF] Full URL: ${url}`)
  
  const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/xml',
        Authorization: `Bearer ${session.sessionToken}`,
      },
    }
  )
  
  console.log(`[KSEF] Response status: ${response.status}`)
  console.log(`[KSEF] Response content-type: ${response.headers.get('content-type')}`)
  console.log(`[KSEF] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())))
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[KSEF] Get invoice failed with status ${response.status}`)
    console.error(`[KSEF] Error response body:`, errorText.substring(0, 2000))
    
    // Try to parse error as JSON
    try {
      const errorJson = JSON.parse(errorText)
      console.error(`[KSEF] Error JSON:`, JSON.stringify(errorJson, null, 2))
      
      // KSeF API 2.0 error format: { code, message, details }
      const errorMessage = errorJson.message || errorJson.error?.message || errorJson.description || errorText
      throw new Error(`Failed to get invoice: ${response.status} - ${errorMessage}`)
    } catch (parseError) {
      // Not JSON, use raw text
      throw new Error(`Failed to get invoice: ${response.status} - ${errorText.substring(0, 500)}`)
    }
  }
  
  const invoiceXml = await response.text()
  console.log(`[KSEF] Received XML length: ${invoiceXml.length}`)
  console.log(`[KSEF] XML preview: ${invoiceXml.substring(0, 200)}`)
  
  const invoice = parseInvoiceFromXml(invoiceXml)
  
  return {
    ksefReferenceNumber,
    invoiceXml,
    invoice,
  }
}

/**
 * Get invoice status - API 2.0
 */
export async function getInvoiceStatus(
  nip: string,
  elementReferenceNumber: string
): Promise<KsefInvoiceStatusResponse> {
  const session = await ensureActiveSession(nip)
  const config = await getKsefConfigForNip(nip)
  
  console.log(`[KSEF] Getting invoice status: ${elementReferenceNumber}`)
  
  const response = await fetch(
    `${config.baseUrl}/invoices/${elementReferenceNumber}/status`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.sessionToken}`,
      },
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get invoice status: ${response.status} - ${error}`)
  }
  
  return response.json() as Promise<KsefInvoiceStatusResponse>
}

/**
 * Query invoices from KSeF (incoming or outgoing) - API 2.0
 * Uses POST /invoices/query/metadata
 * 
 * Query parameters: sortOrder, pageOffset, pageSize
 * Body: subjectType, dateRange (with dateType, from, to)
 */
export async function queryInvoices(
  nip: string,
  query: KsefQueryInvoicesRequest
): Promise<KsefQueryInvoicesResponse> {
  // Check rate limit before making API calls
  if (!checkRateLimit('queryInvoices')) {
    const status = getRateLimitStatus('queryInvoices')
    throw new Error(`Rate limit exceeded. Please wait ${status.resetIn} seconds before querying invoices.`)
  }
  
  const session = await ensureActiveSession(nip)
  const config = await getKsefConfigForNip(nip)
  
  // Build query params for pagination (API 2.0)
  const pageOffset = query.pageOffset || 0
  const pageSize = Math.min(query.pageSize || 100, 250) // Max 250 per API spec
  
  // KSeF 2.0 uses POST /invoices/query/metadata with query params
  const endpoint = `/invoices/query/metadata?sortOrder=Desc&pageOffset=${pageOffset}&pageSize=${pageSize}`
  
  // Ensure dates are in full ISO format (YYYY-MM-DDTHH:MM:SSZ)
  const formatDate = (dateStr: string): string => {
    if (dateStr.includes('T')) return dateStr // Already full ISO format
    return `${dateStr}T00:00:00Z` // Add time component
  }
  
  const formatDateEnd = (dateStr: string): string => {
    if (dateStr.includes('T')) return dateStr // Already full ISO format  
    return `${dateStr}T23:59:59Z` // End of day
  }
  
  // Build request body for API 2.0 - only filter criteria, no pagination
  const subjectTypeMap: Record<string, string> = {
    subject1: 'Subject1',
    subject2: 'Subject2',
    subject3: 'Subject3',
  }
  const requestBody = {
    subjectType: subjectTypeMap[query.subjectType || 'subject2'] || 'Subject2',
    dateRange: {
      dateType: 'Invoicing',
      from: formatDate(query.dateFrom || ''),
      to: formatDateEnd(query.dateTo || ''),
    },
  }
  
  console.log(`[KSEF] Querying invoices: POST ${config.baseUrl}${endpoint}`)
  console.log(`[KSEF] Request body:`, JSON.stringify(requestBody))
  console.log(`[KSEF] Session NIP: ${session.nip}, Config NIP: ${config.nip}`)
  console.log(`[KSEF] Session token present: ${!!session.sessionToken}`)
  console.log(`[KSEF] Session created at: ${session.createdAt}, expires at: ${session.expiresAt}`)
  console.log(`[KSEF] Environment: ${config.environment}, Base URL: ${config.baseUrl}`)
  
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${session.sessionToken}`,
  }
  console.log(`[KSEF] Request headers (Authorization redacted):`, { ...headers, Authorization: '[REDACTED]' })
  
  const response = await fetch(
    `${config.baseUrl}${endpoint}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    console.error(`[KSEF] Query invoices failed with status ${response.status}`)
    console.error(`[KSEF] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())))
    console.error(`[KSEF] Response body:`, error.substring(0, 1000))
    throw new Error(`Failed to query invoices: ${response.status} - ${error.substring(0, 200)}`)
  }
  
  const result = await response.json() as KsefQueryInvoicesResponse
  console.log(`[KSEF] Query returned ${result.invoices?.length || 0} invoices, hasMore: ${result.hasMore}`)
  return result
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
  
  // Download each invoice - API 2.0 returns 'invoices' array with 'ksefNumber'
  const invoiceList = result.invoices || []
  for (const ref of invoiceList) {
    try {
      const invoiceData = await getInvoice(nip, ref.ksefNumber)
      invoices.push(invoiceData.invoice)
    } catch (error) {
      console.error(`Failed to download invoice ${ref.ksefNumber}:`, error)
    }
  }
  
  return invoices
}

/**
 * Download UPO (Official Confirmation of Receipt) - API 2.0
 * Note: In API 2.0, UPO is obtained via session status after closing session
 */
export async function downloadUPO(
  nip: string,
  ksefReferenceNumber: string
): Promise<string> {
  const session = await ensureActiveSession(nip)
  const config = await getKsefConfigForNip(nip)
  
  // API 2.0 uses /sessions/{referenceNumber}/upo
  const response = await fetch(
    `${config.baseUrl}/sessions/${ksefReferenceNumber}/upo`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        Authorization: `Bearer ${session.sessionToken}`,
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
