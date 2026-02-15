/**
 * Invoice Document Service
 * 
 * Handles file upload/download for invoice documents using Dataverse File column.
 * Uses Dataverse File Column API for binary data operations.
 * 
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/file-column-data
 */

import { getDataverseToken } from './client'
import { DV } from './config'
import { logDataverseInfo, logDataverseError } from './logger'

/**
 * Document configuration
 */
export const DOCUMENT_CONFIG = {
  maxSizeBytes: 128 * 1024 * 1024, // 128 MB (Dataverse File column max)
  chunkSizeBytes: 4 * 1024 * 1024, // 4 MB chunk for large files
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
} as const

/**
 * Document metadata
 */
export interface DocumentInfo {
  fileName: string
  mimeType: string
  fileSize: number
}

/**
 * Validate document before upload
 */
export function validateDocument(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  // Check mime type
  if (!DOCUMENT_CONFIG.allowedMimeTypes.includes(mimeType as typeof DOCUMENT_CONFIG.allowedMimeTypes[number])) {
    const allowed = DOCUMENT_CONFIG.allowedMimeTypes.join(', ')
    return { valid: false, error: `Niedozwolony typ pliku: ${mimeType}. Dozwolone: ${allowed}` }
  }

  // Check size
  if (sizeBytes > DOCUMENT_CONFIG.maxSizeBytes) {
    const maxMB = DOCUMENT_CONFIG.maxSizeBytes / 1024 / 1024
    return { valid: false, error: `Plik zbyt duży. Maksymalny rozmiar: ${maxMB} MB` }
  }

  // Check file name
  if (!fileName || fileName.length > 255) {
    return { valid: false, error: 'Nieprawidłowa nazwa pliku' }
  }

  return { valid: true }
}

/**
 * Get base URL for Dataverse API
 */
function getBaseUrl(): string {
  const url = process.env.DATAVERSE_URL?.replace(/\/$/, '')
  if (!url) {
    throw new Error('DATAVERSE_URL environment variable is required')
  }
  return `${url}/api/data/v9.2`
}

/**
 * Upload document to invoice (Dataverse File Column)
 * 
 * For files <= 4MB: Simple PUT request
 * For files > 4MB: Chunked upload
 */
export async function uploadInvoiceDocument(
  invoiceId: string,
  fileName: string,
  mimeType: string,
  content: Buffer
): Promise<DocumentInfo> {
  const sizeBytes = content.length

  // Validate
  const validation = validateDocument(fileName, mimeType, sizeBytes)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  logDataverseInfo('uploadInvoiceDocument', `Uploading document: ${fileName}`, {
    invoiceId,
    sizeKB: Math.round(sizeBytes / 1024),
    mimeType,
  })

  const baseUrl = getBaseUrl()
  const entitySet = DV.invoice.entitySet
  const fileColumn = DV.invoice.document
  const token = await getDataverseToken()

  // For files <= chunk size, use simple upload
  if (sizeBytes <= DOCUMENT_CONFIG.chunkSizeBytes) {
    await simpleUpload(baseUrl, entitySet, invoiceId, fileColumn, fileName, content, token)
  } else {
    // For larger files, use chunked upload
    await chunkedUpload(baseUrl, entitySet, invoiceId, fileColumn, fileName, content, token)
  }

  logDataverseInfo('uploadInvoiceDocument', `Document uploaded successfully: ${fileName}`, {
    invoiceId,
    sizeKB: Math.round(sizeBytes / 1024),
  })

  return {
    fileName,
    mimeType,
    fileSize: sizeBytes,
  }
}

/**
 * Simple upload for small files (<= 4MB)
 */
async function simpleUpload(
  baseUrl: string,
  entitySet: string,
  entityId: string,
  fileColumn: string,
  fileName: string,
  content: Buffer,
  token: string
): Promise<void> {
  const url = `${baseUrl}/${entitySet}(${entityId})/${fileColumn}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'x-ms-file-name': encodeURIComponent(fileName),
    },
    body: content,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dataverse upload failed: ${response.status} ${response.statusText} - ${errorText}`)
  }
}

/**
 * Chunked upload for large files (> 4MB)
 * Uses Dataverse chunked upload protocol
 */
async function chunkedUpload(
  baseUrl: string,
  entitySet: string,
  entityId: string,
  fileColumn: string,
  fileName: string,
  content: Buffer,
  token: string
): Promise<void> {
  const url = `${baseUrl}/${entitySet}(${entityId})/${fileColumn}`
  const totalSize = content.length
  const chunkSize = DOCUMENT_CONFIG.chunkSizeBytes

  // Initialize upload
  const initResponse = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-ms-file-name': encodeURIComponent(fileName),
      'x-ms-transfer-mode': 'chunked',
    },
  })

  if (!initResponse.ok) {
    const errorText = await initResponse.text()
    throw new Error(`Dataverse chunked upload init failed: ${initResponse.status} - ${errorText}`)
  }

  // Get location for chunk uploads
  const uploadUrl = initResponse.headers.get('Location') || url
  let offset = 0
  let chunkNumber = 0

  while (offset < totalSize) {
    const end = Math.min(offset + chunkSize, totalSize)
    const chunk = content.subarray(offset, end)
    const isLastChunk = end === totalSize

    logDataverseInfo('chunkedUpload', `Uploading chunk ${chunkNumber + 1}`, {
      offset,
      end,
      isLastChunk,
    })

    const chunkResponse = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
        'x-ms-file-name': encodeURIComponent(fileName),
      },
      body: chunk,
    })

    if (!chunkResponse.ok) {
      const errorText = await chunkResponse.text()
      throw new Error(`Dataverse chunk upload failed: ${chunkResponse.status} - ${errorText}`)
    }

    offset = end
    chunkNumber++
  }
}

/**
 * Download document from invoice (Dataverse File Column)
 * 
 * Returns the raw binary data and metadata
 */
export async function downloadInvoiceDocument(invoiceId: string): Promise<{
  content: Buffer
  fileName: string
  mimeType: string
  fileSize: number
} | null> {
  logDataverseInfo('downloadInvoiceDocument', `Downloading document for invoice`, { invoiceId })

  const baseUrl = getBaseUrl()
  const entitySet = DV.invoice.entitySet
  const fileColumn = DV.invoice.document
  const token = await getDataverseToken()

  const url = `${baseUrl}/${entitySet}(${invoiceId})/${fileColumn}/$value`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // 404 means no document exists
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorText = await response.text()
    logDataverseError('downloadInvoiceDocument', new Error(`Download failed: ${response.status}`))
    throw new Error(`Dataverse download failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // Get file name from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition')
  let fileName = 'document'
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename[*]?=['"]?([^'";]+)['"]?/)
    if (fileNameMatch) {
      fileName = decodeURIComponent(fileNameMatch[1])
    }
  }

  // Get content type - infer from filename if Dataverse returns generic octet-stream
  let mimeType = response.headers.get('Content-Type') || 'application/octet-stream'
  if (mimeType === 'application/octet-stream' && fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      tif: 'image/tiff',
    }
    if (ext && mimeMap[ext]) {
      mimeType = mimeMap[ext]
    }
  }

  // Get binary content
  const arrayBuffer = await response.arrayBuffer()
  const content = Buffer.from(arrayBuffer)

  logDataverseInfo('downloadInvoiceDocument', `Document downloaded: ${fileName}`, {
    invoiceId,
    sizeKB: Math.round(content.length / 1024),
    mimeType,
  })

  return {
    content,
    fileName,
    mimeType,
    fileSize: content.length,
  }
}

/**
 * Delete document from invoice
 */
export async function deleteInvoiceDocument(invoiceId: string): Promise<void> {
  logDataverseInfo('deleteInvoiceDocument', `Deleting document for invoice`, { invoiceId })

  const baseUrl = getBaseUrl()
  const entitySet = DV.invoice.entitySet
  const fileColumn = DV.invoice.document
  const token = await getDataverseToken()

  const url = `${baseUrl}/${entitySet}(${invoiceId})/${fileColumn}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text()
    logDataverseError('deleteInvoiceDocument', new Error(`Delete failed: ${response.status}`))
    throw new Error(`Dataverse delete failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  logDataverseInfo('deleteInvoiceDocument', `Document deleted successfully`, { invoiceId })
}

/**
 * Check if invoice has a document
 */
export async function hasInvoiceDocument(invoiceId: string): Promise<boolean> {
  const baseUrl = getBaseUrl()
  const entitySet = DV.invoice.entitySet
  const documentNameField = DV.invoice.documentName
  const token = await getDataverseToken()

  const url = `${baseUrl}/${entitySet}(${invoiceId})?$select=${documentNameField}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json() as Record<string, unknown>
  return !!data[documentNameField]
}
