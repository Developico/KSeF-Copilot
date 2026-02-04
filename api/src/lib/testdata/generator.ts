/**
 * Test data generator for invoices
 * Creates realistic invoice data in Dataverse for testing purposes
 */

import { InvoiceCreate, InvoiceSource } from '../../types/invoice'
import {
  SAMPLE_SUPPLIERS,
  AMOUNT_RANGES,
  PAYMENT_TERMS,
  randomElement,
  randomAmount,
  randomVatRate,
  randomDate,
  formatDate,
  generateInvoiceNumber,
} from './templates'

export interface GenerateInvoicesOptions {
  /** NIP of the tenant (your company) */
  tenantNip: string
  /** Name of the tenant company */
  tenantName: string
  /** Number of invoices to generate */
  count: number
  /** Start date for invoice dates (default: 6 months ago) */
  fromDate?: Date
  /** End date for invoice dates (default: today) */
  toDate?: Date
  /** Percentage of invoices that should be marked as paid (0-100, default: 30) */
  paidPercentage?: number
  /** Source to use for generated invoices (default: Manual) */
  source?: InvoiceSource
}

export interface GeneratedInvoice extends InvoiceCreate {
  /** Whether this invoice should be marked as paid after creation */
  shouldBePaid: boolean
  /** Suggested payment date if paid */
  suggestedPaymentDate?: string
}

/**
 * Generate a single random invoice
 */
export function generateSingleInvoice(
  tenantNip: string,
  tenantName: string,
  invoiceDate: Date,
  index: number,
  options: { paidPercentage?: number; source?: InvoiceSource } = {}
): GeneratedInvoice {
  const { paidPercentage = 30, source = InvoiceSource.Manual } = options
  
  // Pick random supplier
  const supplier = randomElement(SAMPLE_SUPPLIERS)
  
  // Get amount range for category
  const amountRange = AMOUNT_RANGES[supplier.category] || AMOUNT_RANGES['default']
  
  // Generate amounts
  const netAmount = randomAmount(amountRange.min, amountRange.max)
  const vatRate = randomVatRate()
  const vatAmount = Math.round(netAmount * vatRate * 100) / 100
  const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100
  
  // Calculate due date
  const paymentTermDays = randomElement(PAYMENT_TERMS)
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + paymentTermDays)
  
  // Generate invoice number
  const invoiceNumber = generateInvoiceNumber(invoiceDate, index)
  
  // Generate reference number (simulating KSeF reference)
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  const referenceNumber = source === InvoiceSource.KSeF
    ? `${timestamp}-${random}-${index.toString().padStart(4, '0')}`
    : `MANUAL-${timestamp}-${random}`
  
  // Determine if invoice should be paid
  const shouldBePaid = Math.random() * 100 < paidPercentage
  
  // If paid, calculate payment date (between invoice date and due date, or up to 7 days late)
  let suggestedPaymentDate: string | undefined
  if (shouldBePaid) {
    const maxPayDate = new Date(dueDate)
    maxPayDate.setDate(maxPayDate.getDate() + 7) // Allow up to 7 days late
    const today = new Date()
    const paymentDate = randomDate(
      invoiceDate,
      maxPayDate > today ? today : maxPayDate
    )
    suggestedPaymentDate = formatDate(paymentDate)
  }
  
  return {
    tenantNip,
    tenantName,
    referenceNumber,
    invoiceNumber,
    supplierNip: supplier.nip,
    supplierName: supplier.name,
    invoiceDate: formatDate(invoiceDate),
    dueDate: formatDate(dueDate),
    netAmount,
    vatAmount,
    grossAmount,
    category: supplier.category,
    mpk: supplier.mpk,
    source,
    description: `Test invoice - ${supplier.category}`,
    shouldBePaid,
    suggestedPaymentDate,
  }
}

/**
 * Generate multiple random invoices
 */
export function generateInvoices(options: GenerateInvoicesOptions): GeneratedInvoice[] {
  const {
    tenantNip,
    tenantName,
    count,
    fromDate = getDefaultFromDate(),
    toDate = new Date(),
    paidPercentage = 30,
    source = InvoiceSource.Manual,
  } = options
  
  const invoices: GeneratedInvoice[] = []
  
  for (let i = 0; i < count; i++) {
    const invoiceDate = randomDate(fromDate, toDate)
    const invoice = generateSingleInvoice(
      tenantNip,
      tenantName,
      invoiceDate,
      i + 1,
      { paidPercentage, source }
    )
    invoices.push(invoice)
  }
  
  // Sort by invoice date descending
  invoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
  
  return invoices
}

/**
 * Get default from date (6 months ago)
 */
function getDefaultFromDate(): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - 6)
  return date
}

/**
 * Summary of generated invoices
 */
export interface GenerationSummary {
  total: number
  created: number
  paid: number
  failed: number
  errors: string[]
  byCategory: Record<string, number>
  byMpk: Record<string, number>
  totalNetAmount: number
  totalGrossAmount: number
}

/**
 * Calculate summary statistics for generated invoices
 */
export function calculateSummary(invoices: GeneratedInvoice[]): Omit<GenerationSummary, 'created' | 'paid' | 'failed' | 'errors'> {
  const byCategory: Record<string, number> = {}
  const byMpk: Record<string, number> = {}
  let totalNetAmount = 0
  let totalGrossAmount = 0
  
  for (const inv of invoices) {
    // Count by category
    const cat = inv.category || 'Unknown'
    byCategory[cat] = (byCategory[cat] || 0) + 1
    
    // Count by MPK
    const mpk = inv.mpk || 'Unknown'
    byMpk[mpk] = (byMpk[mpk] || 0) + 1
    
    // Sum amounts
    totalNetAmount += inv.netAmount
    totalGrossAmount += inv.grossAmount
  }
  
  return {
    total: invoices.length,
    byCategory,
    byMpk,
    totalNetAmount: Math.round(totalNetAmount * 100) / 100,
    totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
  }
}
