/**
 * Cost Document Import Parser
 *
 * Parses CSV and Excel (.xlsx) files for bulk cost document import.
 * Expected columns (header row required):
 *   documentType, documentNumber, issueDate, issuerName, issuerNip,
 *   grossAmount, netAmount, vatAmount, currency, category, description,
 *   mpk, paymentMethod, dueDate
 *
 * Required: documentType, documentNumber, issueDate, issuerName, grossAmount
 */

import ExcelJS from 'exceljs'

const VALID_DOCUMENT_TYPES = [
  'Receipt',
  'Acknowledgment',
  'ProForma',
  'DebitNote',
  'Bill',
  'ContractInvoice',
  'Other',
] as const

export interface CostDocumentImportRow {
  documentType: string
  documentNumber: string
  issueDate: string
  dueDate?: string
  issuerName: string
  issuerNip?: string
  grossAmount: number
  netAmount?: number
  vatAmount?: number
  currency: string
  category?: string
  description?: string
  mpk?: string
  paymentMethod?: string
}

export interface CostDocumentImportResult {
  rows: CostDocumentImportRow[]
  errors: Array<{ row: number; message: string }>
  totalRows: number
}

const REQUIRED_COLUMNS = [
  'documentType',
  'documentNumber',
  'issueDate',
  'issuerName',
  'grossAmount',
] as const

/**
 * Parse CSV text into import rows
 */
export function parseCsv(csvText: string): CostDocumentImportResult {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }], totalRows: 0 }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim())

  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing required columns: ${missing.join(', ')}` }],
      totalRows: lines.length - 1,
    }
  }

  const rows: CostDocumentImportRow[] = []
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

function validateRow(record: Record<string, string>, rowNum: number): CostDocumentImportRow {
  // Document type
  const documentType = record.documentType
  if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType as typeof VALID_DOCUMENT_TYPES[number])) {
    throw new Error(
      `Row ${rowNum}: Invalid documentType "${record.documentType}" — must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
    )
  }

  // Document number
  const documentNumber = record.documentNumber
  if (!documentNumber) {
    throw new Error(`Row ${rowNum}: documentNumber is required`)
  }

  // Issue date
  const issueDate = record.issueDate
  if (!issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
    throw new Error(`Row ${rowNum}: Invalid issueDate "${record.issueDate}" — expected YYYY-MM-DD`)
  }

  // Issuer name
  const issuerName = record.issuerName
  if (!issuerName) {
    throw new Error(`Row ${rowNum}: issuerName is required`)
  }

  // Gross amount
  const grossAmount = parseFloat(record.grossAmount)
  if (isNaN(grossAmount) || grossAmount < 0) {
    throw new Error(`Row ${rowNum}: Invalid grossAmount "${record.grossAmount}"`)
  }

  // Optional NIP validation
  let issuerNip: string | undefined
  if (record.issuerNip) {
    const nip = record.issuerNip.replace(/\D/g, '')
    if (nip.length !== 10) {
      throw new Error(`Row ${rowNum}: Invalid issuerNip "${record.issuerNip}" — must be 10 digits`)
    }
    issuerNip = nip
  }

  // Optional amounts
  const netAmount = record.netAmount ? parseFloat(record.netAmount) : undefined
  if (netAmount !== undefined && isNaN(netAmount)) {
    throw new Error(`Row ${rowNum}: Invalid netAmount "${record.netAmount}"`)
  }
  const vatAmount = record.vatAmount ? parseFloat(record.vatAmount) : undefined
  if (vatAmount !== undefined && isNaN(vatAmount)) {
    throw new Error(`Row ${rowNum}: Invalid vatAmount "${record.vatAmount}"`)
  }

  // Optional due date
  const dueDate = record.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(record.dueDate)
    ? record.dueDate
    : undefined

  const currency = record.currency || 'PLN'

  return {
    documentType,
    documentNumber,
    issueDate,
    dueDate,
    issuerName,
    issuerNip,
    grossAmount,
    netAmount,
    vatAmount,
    currency,
    category: record.category || undefined,
    description: record.description || undefined,
    mpk: record.mpk || undefined,
    paymentMethod: record.paymentMethod || undefined,
  }
}

/**
 * Parse Excel (.xlsx) buffer into import rows
 */
export async function parseExcel(buffer: Buffer): Promise<CostDocumentImportResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], errors: [{ row: 0, message: 'Excel file must have a header row and at least one data row' }], totalRows: 0 }
  }

  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim()
  })

  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing required columns: ${missing.join(', ')}` }],
      totalRows: worksheet.rowCount - 1,
    }
  }

  const rows: CostDocumentImportRow[] = []
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
 * Generate CSV template for download
 */
export function generateCsvTemplate(): string {
  const headers = [
    'documentType', 'documentNumber', 'issueDate', 'dueDate',
    'issuerName', 'issuerNip', 'grossAmount', 'netAmount', 'vatAmount',
    'currency', 'category', 'description', 'mpk', 'paymentMethod',
  ]
  const example = [
    'Receipt', 'PAR/2025/001', '2025-01-15', '',
    'Sklep ABC', '', '123.00', '100.00', '23.00',
    'PLN', 'Materiały biurowe', 'Zakup artykułów biurowych', 'BackOffice', 'gotówka',
  ]
  return headers.join(',') + '\n' + example.join(',') + '\n'
}

/**
 * Generate Excel template for download
 */
export async function generateExcelTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Cost Documents')

  const columns = [
    { header: 'documentType', key: 'documentType', width: 18 },
    { header: 'documentNumber', key: 'documentNumber', width: 20 },
    { header: 'issueDate', key: 'issueDate', width: 14 },
    { header: 'dueDate', key: 'dueDate', width: 14 },
    { header: 'issuerName', key: 'issuerName', width: 30 },
    { header: 'issuerNip', key: 'issuerNip', width: 14 },
    { header: 'grossAmount', key: 'grossAmount', width: 14 },
    { header: 'netAmount', key: 'netAmount', width: 14 },
    { header: 'vatAmount', key: 'vatAmount', width: 14 },
    { header: 'currency', key: 'currency', width: 10 },
    { header: 'category', key: 'category', width: 20 },
    { header: 'description', key: 'description', width: 30 },
    { header: 'mpk', key: 'mpk', width: 15 },
    { header: 'paymentMethod', key: 'paymentMethod', width: 15 },
  ]

  worksheet.columns = columns

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  // Add example row
  worksheet.addRow({
    documentType: 'Receipt',
    documentNumber: 'PAR/2025/001',
    issueDate: '2025-01-15',
    dueDate: '',
    issuerName: 'Sklep ABC',
    issuerNip: '',
    grossAmount: 123.00,
    netAmount: 100.00,
    vatAmount: 23.00,
    currency: 'PLN',
    category: 'Materiały biurowe',
    description: 'Zakup artykułów biurowych',
    mpk: 'BackOffice',
    paymentMethod: 'gotówka',
  })

  // Add data validation for documentType column
  worksheet.getColumn('documentType').eachCell((cell, rowNumber) => {
    if (rowNumber > 1) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Receipt,Acknowledgment,ProForma,DebitNote,Bill,ContractInvoice,Other"'],
      }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
