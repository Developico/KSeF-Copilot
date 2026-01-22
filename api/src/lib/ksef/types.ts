/**
 * KSeF API Types
 */

/**
 * KSeF Session status
 */
export interface KsefSession {
  sessionToken: string
  referenceNumber: string
  createdAt: Date
  expiresAt?: Date
}

/**
 * KSeF Invoice header (from list)
 */
export interface KsefInvoiceHeader {
  ksefReferenceNumber: string
  invoiceNumber: string
  invoiceDate: string
  subjectNip: string
  subjectName: string
  grossValue: number
  acquisitionTimestamp: string
}

/**
 * KSeF API response wrapper
 */
export interface KsefApiResponse<T> {
  timestamp: string
  referenceNumber?: string
  processingCode?: number
  processingDescription?: string
  payload?: T
}

/**
 * KSeF session init request
 */
export interface KsefSessionInitRequest {
  context: {
    contextIdentifier: {
      type: 'onip'
      identifier: string // NIP
    }
  }
}

/**
 * KSeF session init response
 */
export interface KsefSessionInitResponse {
  timestamp: string
  referenceNumber: string
  sessionToken: {
    token: string
    context: {
      contextIdentifier: {
        type: string
        identifier: string
      }
    }
  }
}

/**
 * KSeF query criteria for invoice list
 */
export interface KsefInvoiceQueryCriteria {
  subjectType: 'subject2' // Buyer (us)
  type: 'incremental' | 'range'
  acquisitionTimestampThresholdFrom?: string
  acquisitionTimestampThresholdTo?: string
  invoicingDateFrom?: string
  invoicingDateTo?: string
}

/**
 * KSeF invoice list response
 */
export interface KsefInvoiceListResponse {
  timestamp: string
  referenceNumber: string
  invoiceHeaderList: KsefInvoiceHeader[]
  numberOfElements: number
  pageSize: number
  pageOffset: number
}

/**
 * KSeF invoice download response (XML)
 */
export interface KsefInvoiceDownloadResponse {
  timestamp: string
  invoiceXml: string
}

/**
 * Parsed invoice from FA(2) XML
 */
export interface ParsedInvoice {
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  supplier: {
    nip: string
    name: string
    address?: string
  }
  buyer: {
    nip: string
    name: string
    address?: string
  }
  netAmount: number
  vatAmount: number
  grossAmount: number
  items: ParsedInvoiceItem[]
  rawXml: string
}

/**
 * Invoice line item
 */
export interface ParsedInvoiceItem {
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  netAmount: number
  vatRate: string
  vatAmount: number
  grossAmount: number
}

/**
 * KSeF status response for health check
 */
export interface KsefStatusResponse {
  isConnected: boolean
  environment: string
  nip: string
  tokenExpiry?: string
  tokenExpiringSoon: boolean
  daysUntilExpiry?: number
  hasActiveSession: boolean
  lastSync?: string
  error?: string
}
