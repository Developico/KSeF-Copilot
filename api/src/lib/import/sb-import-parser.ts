/**
 * Self-Billing Import Parser
 *
 * Parses CSV and Excel (.xlsx) files for bulk self-billing invoice creation.
 * Expected columns (header row required):
 *   supplierNip, itemDescription, quantity, unit, unitPrice, vatRate, invoiceDate, dueDate
 *
 * All columns except dueDate are required.
 */

import ExcelJS from 'exceljs'

export interface SbImportRow {
  supplierNip: string
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  invoiceDate: string
  dueDate?: string
}

export interface SbImportResult {
  rows: SbImportRow[]
  errors: Array<{ row: number; message: string }>
  totalRows: number
}

const REQUIRED_COLUMNS = [
  'supplierNip',
  'itemDescription',
  'quantity',
  'unit',
  'unitPrice',
  'vatRate',
  'invoiceDate',
] as const

/**
 * Parse CSV text into import rows
 */
export function parseCsv(csvText: string): SbImportResult {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }], totalRows: 0 }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim())

  // Validate required columns
  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing required columns: ${missing.join(', ')}` }],
      totalRows: lines.length - 1,
    }
  }

  const rows: SbImportRow[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const record: Record<string, string> = {}
    headers.forEach((h, idx) => {
      record[h] = (values[idx] || '').trim()
    })

    try {
      const row = validateRow(record, i + 1)
      rows.push(row)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Invalid row'
      errors.push({ row: i + 1, message: errMsg })
    }
  }

  return { rows, errors, totalRows: lines.length - 1 }
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',' || char === ';') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current)
  return result
}

function validateRow(record: Record<string, string>, rowNum: number): SbImportRow {
  const nip = record.supplierNip?.replace(/\D/g, '')
  if (!nip || nip.length !== 10) {
    throw new Error(`Row ${rowNum}: Invalid NIP "${record.supplierNip}" — must be 10 digits`)
  }

  const itemDescription = record.itemDescription
  if (!itemDescription) {
    throw new Error(`Row ${rowNum}: itemDescription is required`)
  }

  const quantity = parseFloat(record.quantity)
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error(`Row ${rowNum}: Invalid quantity "${record.quantity}"`)
  }

  const unit = record.unit || 'szt.'

  const unitPrice = parseFloat(record.unitPrice)
  if (isNaN(unitPrice) || unitPrice < 0) {
    throw new Error(`Row ${rowNum}: Invalid unitPrice "${record.unitPrice}"`)
  }

  const vatRate = parseFloat(record.vatRate)
  if (isNaN(vatRate)) {
    throw new Error(`Row ${rowNum}: Invalid vatRate "${record.vatRate}"`)
  }

  const invoiceDate = record.invoiceDate
  if (!invoiceDate || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
    throw new Error(`Row ${rowNum}: Invalid invoiceDate "${record.invoiceDate}" — expected YYYY-MM-DD`)
  }

  const dueDate = record.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(record.dueDate)
    ? record.dueDate
    : undefined

  return {
    supplierNip: nip,
    itemDescription,
    quantity,
    unit,
    unitPrice,
    vatRate,
    invoiceDate,
    dueDate,
  }
}

/**
 * Generate CSV template for download
 */
export function generateCsvTemplate(): string {
  const headers = ['supplierNip', 'itemDescription', 'quantity', 'unit', 'unitPrice', 'vatRate', 'invoiceDate', 'dueDate']
  const example = ['1234567890', 'Monthly service fee', '1', 'szt.', '1000.00', '23', '2025-01-31', '2025-02-28']
  return headers.join(',') + '\n' + example.join(',') + '\n'
}

/**
 * Parse Excel (.xlsx) buffer into import rows
 */
export async function parseExcelImport(buffer: Buffer): Promise<SbImportResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], errors: [{ row: 0, message: 'Excel file must have a header row and at least one data row' }], totalRows: 0 }
  }

  // Read header row
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim()
  })

  // Validate required columns
  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing required columns: ${missing.join(', ')}` }],
      totalRows: worksheet.rowCount - 1,
    }
  }

  const rows: SbImportRow[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const excelRow = worksheet.getRow(i)
    if (!excelRow.hasValues) continue

    const record: Record<string, string> = {}
    headers.forEach((h, idx) => {
      const cell = excelRow.getCell(idx + 1)
      let value = ''
      if (cell.value instanceof Date) {
        value = cell.value.toISOString().split('T')[0]
      } else {
        value = String(cell.value ?? '').trim()
      }
      record[h] = value
    })

    try {
      const row = validateRow(record, i)
      rows.push(row)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Invalid row'
      errors.push({ row: i, message: errMsg })
    }
  }

  return { rows, errors, totalRows: worksheet.rowCount - 1 }
}

/**
 * Generate Excel (.xlsx) template for download
 */
export async function generateExcelTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Self-Billing Import')

  const columns = [
    { header: 'supplierNip', key: 'supplierNip', width: 15 },
    { header: 'itemDescription', key: 'itemDescription', width: 30 },
    { header: 'quantity', key: 'quantity', width: 12 },
    { header: 'unit', key: 'unit', width: 10 },
    { header: 'unitPrice', key: 'unitPrice', width: 15 },
    { header: 'vatRate', key: 'vatRate', width: 10 },
    { header: 'invoiceDate', key: 'invoiceDate', width: 15 },
    { header: 'dueDate', key: 'dueDate', width: 15 },
  ]
  worksheet.columns = columns

  // Style header row
  const headerRowRef = worksheet.getRow(1)
  headerRowRef.font = { bold: true }
  headerRowRef.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Add example row
  worksheet.addRow({
    supplierNip: '1234567890',
    itemDescription: 'Monthly service fee',
    quantity: 1,
    unit: 'szt.',
    unitPrice: 1000.00,
    vatRate: 23,
    invoiceDate: '2025-01-31',
    dueDate: '2025-02-28',
  })

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
