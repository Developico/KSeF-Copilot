/**
 * CSV export utilities for invoice data.
 *
 * Uses semicolon separator and BOM for Polish Excel compatibility.
 */

import type { Invoice } from './types'
import { formatDate } from './format'

/** CSV field separator — semicolons work better with Polish Excel. */
const SEP = ';'

/** UTF-8 BOM so Excel opens the file with correct encoding. */
const BOM = '\uFEFF'

/**
 * Escape a CSV field value — wrap in quotes when needed.
 */
function escapeField(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert an array of invoices to a CSV string.
 */
export function invoicesToCsv(
  invoices: Invoice[],
  options?: { locale?: string }
): string {
  const locale = options?.locale ?? 'pl-PL'

  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Due Date',
    'Supplier',
    'Supplier NIP',
    'Net Amount',
    'VAT Amount',
    'Gross Amount',
    'Currency',
    'Payment Status',
    'MPK',
    'Category',
    'Description',
    'Source',
  ]

  const rows = invoices.map((inv) => [
    escapeField(inv.invoiceNumber),
    escapeField(inv.invoiceDate ? formatDate(inv.invoiceDate, locale) : ''),
    escapeField(inv.dueDate ? formatDate(inv.dueDate, locale) : ''),
    escapeField(inv.supplierName),
    escapeField(inv.supplierNip),
    escapeField(inv.netAmount),
    escapeField(inv.vatAmount),
    escapeField(inv.grossAmount),
    escapeField(inv.currency ?? 'PLN'),
    escapeField(inv.paymentStatus),
    escapeField(inv.mpk),
    escapeField(inv.category),
    escapeField(inv.description),
    escapeField(inv.source),
  ])

  return BOM + [headers.join(SEP), ...rows.map((r) => r.join(SEP))].join('\n')
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = 'text/csv;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate a dated filename for export.
 */
export function createExportFilename(
  prefix = 'invoices',
  startDate?: string,
  endDate?: string
): string {
  const today = new Date().toISOString().slice(0, 10)
  if (startDate && endDate) {
    return `${prefix}_${startDate}_${endDate}.csv`
  }
  return `${prefix}_${today}.csv`
}

/**
 * Convenience: convert invoices to CSV and download.
 */
export function exportInvoicesToCsv(
  invoices: Invoice[],
  options?: { filename?: string; locale?: string; startDate?: string; endDate?: string }
): void {
  const csv = invoicesToCsv(invoices, { locale: options?.locale })
  const filename =
    options?.filename ??
    createExportFilename('invoices', options?.startDate, options?.endDate)
  downloadFile(csv, filename)
}
