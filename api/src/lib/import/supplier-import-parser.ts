/**
 * Supplier Import Parser
 *
 * Parses CSV and Excel (.xlsx) files for bulk supplier creation.
 * Expected columns (header row required):
 *   nip            — 10-digit Polish NIP (required)
 *   sbAgreement    — yes/no/tak/nie (optional, default: no)
 */

import ExcelJS from 'exceljs'

export interface SupplierImportRow {
  nip: string
  sbAgreement: boolean
}

export interface SupplierImportResult {
  rows: SupplierImportRow[]
  errors: Array<{ row: number; message: string }>
  totalRows: number
}

const MAX_ROWS = 100

/**
 * Validate NIP checksum (weights: 6,5,7,2,3,4,5,6,7)
 */
function isValidNipChecksum(nip: string): boolean {
  if (nip.length !== 10) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(nip[i], 10), 0)
  return sum % 11 === parseInt(nip[9], 10)
}

function parseSbAgreementValue(value: string): boolean {
  const v = value.toLowerCase().trim()
  return v === 'yes' || v === 'tak' || v === '1' || v === 'true'
}

function validateRow(record: Record<string, string>, rowNum: number): SupplierImportRow {
  const nip = (record.nip ?? '').replace(/[\s-]/g, '')
  if (!nip || !/^\d{10}$/.test(nip)) {
    throw new Error(`Row ${rowNum}: Invalid NIP "${record.nip}" — must be 10 digits`)
  }
  if (!isValidNipChecksum(nip)) {
    throw new Error(`Row ${rowNum}: NIP "${nip}" has invalid checksum`)
  }

  const sbAgreement = parseSbAgreementValue(record.sbagreement ?? '')

  return { nip, sbAgreement }
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

/**
 * Parse CSV text into supplier import rows
 */
export function parseCsv(csvText: string): SupplierImportResult {
  // Strip BOM if present
  const text = csvText.replace(/^\uFEFF/, '')
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }], totalRows: 0 }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())

  if (!headers.includes('nip')) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Missing required column: nip' }],
      totalRows: lines.length - 1,
    }
  }

  const dataLineCount = lines.length - 1
  if (dataLineCount > MAX_ROWS) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Too many rows: ${dataLineCount}. Maximum is ${MAX_ROWS} (VAT API daily limit).` }],
      totalRows: dataLineCount,
    }
  }

  const rows: SupplierImportRow[] = []
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

  return { rows, errors, totalRows: dataLineCount }
}

/**
 * Parse Excel (.xlsx) buffer into supplier import rows
 */
export async function parseExcel(buffer: Buffer): Promise<SupplierImportResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], errors: [{ row: 0, message: 'Excel file must have a header row and at least one data row' }], totalRows: 0 }
  }

  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim().toLowerCase()
  })

  if (!headers.includes('nip')) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Missing required column: nip' }],
      totalRows: worksheet.rowCount - 1,
    }
  }

  const dataRowCount = worksheet.rowCount - 1
  if (dataRowCount > MAX_ROWS) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Too many rows: ${dataRowCount}. Maximum is ${MAX_ROWS} (VAT API daily limit).` }],
      totalRows: dataRowCount,
    }
  }

  const rows: SupplierImportRow[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const excelRow = worksheet.getRow(i)
    if (!excelRow.hasValues) continue

    const record: Record<string, string> = {}
    headers.forEach((h, idx) => {
      const cell = excelRow.getCell(idx + 1)
      record[h] = String(cell.value ?? '').trim()
    })

    try {
      const row = validateRow(record, i)
      rows.push(row)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Invalid row'
      errors.push({ row: i, message: errMsg })
    }
  }

  return { rows, errors, totalRows: dataRowCount }
}

/**
 * Generate CSV template for download
 */
export function generateCsvTemplate(): string {
  const headers = ['nip', 'sbAgreement']
  const example = ['1234567890', 'yes']
  return headers.join(',') + '\n' + example.join(',') + '\n'
}

/**
 * Generate Excel (.xlsx) template for download
 */
export async function generateExcelTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Supplier Import')

  worksheet.columns = [
    { header: 'nip', key: 'nip', width: 15 },
    { header: 'sbAgreement', key: 'sbAgreement', width: 15 },
  ]

  const headerRowRef = worksheet.getRow(1)
  headerRowRef.font = { bold: true }
  headerRowRef.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  worksheet.addRow({ nip: '1234567890', sbAgreement: 'yes' })

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
