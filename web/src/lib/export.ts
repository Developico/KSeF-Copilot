import { Invoice } from './api'

export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
  dateFormat?: 'pl' | 'iso'
}

/**
 * Formats date according to specified format
 */
function formatDate(dateString: string | undefined, format: 'pl' | 'iso'): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (format === 'pl') {
    return date.toLocaleDateString('pl-PL')
  }
  return dateString.split('T')[0]
}

/**
 * Formats amount for CSV export
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

/**
 * Escapes CSV field value
 */
function escapeCsvField(value: string | undefined | null): string {
  if (value === undefined || value === null) return ''
  const stringValue = String(value)
  // If contains comma, quote, or newline - wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/**
 * Converts invoices to CSV format
 */
export function invoicesToCsv(invoices: Invoice[], options: ExportOptions = {}): string {
  const { includeHeaders = true, dateFormat = 'pl' } = options

  const headers = [
    'Numer faktury',
    'Numer KSeF',
    'Data faktury',
    'Termin płatności',
    'NIP dostawcy',
    'Nazwa dostawcy',
    'Kwota netto',
    'Kwota VAT',
    'Kwota brutto',
    'Waluta',
    'Status płatności',
    'Data płatności',
    'MPK',
    'Kategoria',
    'Projekt',
  ]

  const rows = invoices.map(inv => [
    escapeCsvField(inv.invoiceNumber),
    escapeCsvField(inv.referenceNumber),
    formatDate(inv.invoiceDate, dateFormat),
    formatDate(inv.dueDate, dateFormat),
    escapeCsvField(inv.supplierNip),
    escapeCsvField(inv.supplierName),
    formatAmount(inv.netAmount),
    formatAmount(inv.vatAmount),
    formatAmount(inv.grossAmount),
    escapeCsvField(inv.currency || 'PLN'),
    inv.paymentStatus === 'paid' ? 'Opłacona' : 'Oczekująca',
    formatDate(inv.paymentDate, dateFormat),
    escapeCsvField(inv.mpk),
    escapeCsvField(inv.category),
    escapeCsvField(inv.project),
  ])

  const csvRows = includeHeaders 
    ? [headers.join(';'), ...rows.map(row => row.join(';'))]
    : rows.map(row => row.join(';'))

  // Add BOM for Excel compatibility with UTF-8
  return '\ufeff' + csvRows.join('\r\n')
}

/**
 * Downloads data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports invoices to CSV file and triggers download
 */
export function exportInvoicesToCsv(invoices: Invoice[], options: ExportOptions = {}): void {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const filename = options.filename || `faktury-${dateStr}.csv`
  
  const csvContent = invoicesToCsv(invoices, options)
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8')
}

/**
 * Creates export filename with date range
 */
export function createExportFilename(
  prefix: string,
  startDate?: Date,
  endDate?: Date
): string {
  const formatDatePart = (date: Date) => date.toISOString().split('T')[0]
  
  if (startDate && endDate) {
    return `${prefix}-${formatDatePart(startDate)}-${formatDatePart(endDate)}.csv`
  }
  
  return `${prefix}-${formatDatePart(new Date())}.csv`
}
