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

/**
 * KSeF Session (extended)
 */
export interface KsefSession {
  sessionId: string
  referenceNumber: string
  nip: string
  sessionToken: string
  createdAt: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'terminated' | 'error'
  terminatedAt?: Date
  invoicesProcessed: number
  errorMessage?: string
}

/**
 * Session status response
 */
export interface KsefSessionStatus {
  isActive: boolean
  sessionId?: string
  createdAt?: Date
  expiresAt?: Date
  invoicesProcessed?: number
  reason?: string
}

/**
 * Auth challenge response
 */
export interface KsefAuthChallengeResponse {
  timestamp: string
  challenge: string
}

/**
 * Init session response
 */
export interface KsefInitSessionResponse {
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
 * Terminate session response
 */
export interface KsefTerminateSessionResponse {
  timestamp: string
  referenceNumber: string
}

/**
 * Invoice to send to KSeF
 */
export interface KsefInvoice {
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  seller: {
    nip: string
    name: string
    address: {
      street: string
      buildingNumber: string
      apartmentNumber?: string
      postalCode: string
      city: string
      country: string
    }
  }
  buyer: {
    nip: string
    name: string
    address: {
      street: string
      buildingNumber: string
      apartmentNumber?: string
      postalCode: string
      city: string
      country: string
    }
  }
  items: KsefInvoiceItem[]
  currency: string
  paymentMethod?: string
  bankAccount?: string
  notes?: string
}

/**
 * Invoice line item
 */
export interface KsefInvoiceItem {
  lineNumber: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  netAmount: number
  vatRate: number // 23, 8, 5, 0, -1 (zw)
  vatAmount: number
  grossAmount: number
  pkwiu?: string
  gtu?: string // GTU_01-GTU_13
}

/**
 * Send invoice response
 */
export interface KsefSendInvoiceResponse {
  timestamp: string
  referenceNumber: string
  elementReferenceNumber: string
  ksefReferenceNumber?: string
  invoiceHash: string
}

/**
 * Get invoice response
 */
export interface KsefGetInvoiceResponse {
  ksefReferenceNumber: string
  invoiceXml: string
  invoice: KsefInvoice
}

/**
 * Invoice status response
 */
export interface KsefInvoiceStatusResponse {
  timestamp: string
  elementReferenceNumber: string
  processingCode: number
  processingDescription: string
  ksefReferenceNumber?: string
  acquisitionTimestamp?: string
}

/**
 * Query invoices request
 */
export interface KsefQueryInvoicesRequest {
  subjectType?: 'subject1' | 'subject2' // subject1 = seller (outgoing), subject2 = buyer (incoming)
  type?: 'incremental' | 'range'
  dateFrom?: string
  dateTo?: string
  pageSize?: number
  pageOffset?: number
}

/**
 * Query invoices response
 */
export interface KsefQueryInvoicesResponse {
  timestamp: string
  referenceNumber: string
  invoiceHeaderList: KsefInvoiceHeader[]
  numberOfElements: number
  pageSize: number
  pageOffset: number
}

