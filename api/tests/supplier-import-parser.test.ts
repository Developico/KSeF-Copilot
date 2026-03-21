import { describe, it, expect } from 'vitest'
import { parseCsv, parseExcel, generateCsvTemplate, generateExcelTemplate } from '../src/lib/import/supplier-import-parser'
import ExcelJS from 'exceljs'

// Valid NIPs (pass checksum validation)
const VALID_NIP_1 = '5261040828'
const VALID_NIP_2 = '6462933485'

/** Helper: build an Excel buffer from header + data rows */
async function buildExcelBuffer(headers: string[], dataRows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')
  ws.addRow(headers)
  for (const row of dataRows) {
    ws.addRow(row)
  }
  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

describe('supplier-import-parser', () => {
  describe('parseCsv', () => {
    it('should parse valid CSV with nip and sbAgreement', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};yes`
      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual({ nip: VALID_NIP_1, sbAgreement: true })
    })

    it('should parse sbAgreement = no', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};no`
      const result = parseCsv(csv)
      expect(result.rows[0].sbAgreement).toBe(false)
    })

    it('should parse Polish sbAgreement values (tak/nie)', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};tak\n${VALID_NIP_2};nie`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].sbAgreement).toBe(true)
      expect(result.rows[1].sbAgreement).toBe(false)
    })

    it('should default sbAgreement to false when empty', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};`
      const result = parseCsv(csv)
      expect(result.rows[0].sbAgreement).toBe(false)
    })

    it('should handle BOM in CSV', () => {
      const csv = `\uFEFFnip;sbAgreement\n${VALID_NIP_1};yes`
      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
    })

    it('should handle comma-separated CSV', () => {
      const csv = `nip,sbAgreement\n${VALID_NIP_1},yes`
      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
    })

    it('should handle CRLF line endings', () => {
      const csv = `nip;sbAgreement\r\n${VALID_NIP_1};yes\r\n${VALID_NIP_2};no`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(2)
    })

    it('should reject CSV without header row', () => {
      const csv = `${VALID_NIP_1};yes`
      const result = parseCsv(csv)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject CSV missing required nip column', () => {
      const csv = `sbAgreement\nyes`
      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/nip/)
      expect(result.rows).toHaveLength(0)
    })

    it('should reject NIP with wrong number of digits', () => {
      const csv = `nip;sbAgreement\n12345;yes`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/NIP/)
    })

    it('should reject NIP with invalid checksum', () => {
      // Flip the last digit to break the checksum
      const badNip = VALID_NIP_1.slice(0, 9) + ((parseInt(VALID_NIP_1[9], 10) + 1) % 10)
      const csv = `nip;sbAgreement\n${badNip};yes`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/checksum/)
    })

    it('should strip dashes and spaces from NIP', () => {
      const dashNip = `${VALID_NIP_1.slice(0, 3)}-${VALID_NIP_1.slice(3, 6)}-${VALID_NIP_1.slice(6, 8)}-${VALID_NIP_1.slice(8)}`
      const csv = `nip;sbAgreement\n${dashNip};yes`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].nip).toBe(VALID_NIP_1)
    })

    it('should parse multiple valid rows', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};yes\n${VALID_NIP_2};no`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(2)
      expect(result.totalRows).toBe(2)
    })

    it('should collect valid rows and report errors for invalid ones', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};yes\n12345;no\n${VALID_NIP_2};tak`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.totalRows).toBe(3)
    })

    it('should reject CSV exceeding MAX_ROWS (100)', () => {
      const header = 'nip;sbAgreement'
      const dataLines = Array.from({ length: 101 }, () => `${VALID_NIP_1};yes`)
      const csv = [header, ...dataLines].join('\n')
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/Too many rows/)
    })

    it('should skip empty lines', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};yes\n\n${VALID_NIP_2};no\n`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(2)
    })

    it('should handle quoted fields', () => {
      const csv = `nip;sbAgreement\n"${VALID_NIP_1}";"yes"`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].nip).toBe(VALID_NIP_1)
    })

    it('should parse sbAgreement = "1" and "true" as true', () => {
      const csv = `nip;sbAgreement\n${VALID_NIP_1};1\n${VALID_NIP_2};true`
      const result = parseCsv(csv)
      expect(result.rows[0].sbAgreement).toBe(true)
      expect(result.rows[1].sbAgreement).toBe(true)
    })

    it('should be case-insensitive for headers', () => {
      const csv = `NIP;SbAgreement\n${VALID_NIP_1};Yes`
      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(1)
    })
  })

  describe('parseExcel', () => {
    it('should parse valid Excel file', async () => {
      const buf = await buildExcelBuffer(['nip', 'sbAgreement'], [[VALID_NIP_1, 'yes']])
      const result = await parseExcel(buf)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual({ nip: VALID_NIP_1, sbAgreement: true })
    })

    it('should reject Excel missing nip column', async () => {
      const buf = await buildExcelBuffer(['sbAgreement'], [['yes']])
      const result = await parseExcel(buf)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/nip/)
    })

    it('should collect errors for invalid rows in Excel', async () => {
      const buf = await buildExcelBuffer(
        ['nip', 'sbAgreement'],
        [[VALID_NIP_1, 'yes'], ['BADNIP', 'no'], [VALID_NIP_2, 'tak']],
      )
      const result = await parseExcel(buf)
      expect(result.rows).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('generateCsvTemplate', () => {
    it('should produce valid CSV with header and example row', () => {
      const csv = generateCsvTemplate()
      expect(csv).toContain('nip')
      expect(csv).toContain('sbAgreement')
      expect(csv).toContain('1234567890')
      expect(csv).toContain('yes')
    })
  })

  describe('generateExcelTemplate', () => {
    it('should produce a valid xlsx buffer with header + example', async () => {
      const buf = await generateExcelTemplate()
      expect(buf).toBeInstanceOf(Buffer)
      expect(buf.length).toBeGreaterThan(0)

      // Re-parse and verify contents
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf as unknown as ExcelJS.Buffer)
      const ws = wb.worksheets[0]
      expect(ws).toBeDefined()
      expect(ws.getRow(1).getCell(1).value).toBe('nip')
      expect(ws.getRow(1).getCell(2).value).toBe('sbAgreement')
      expect(String(ws.getRow(2).getCell(1).value)).toBe('1234567890')
    })
  })
})
