import { describe, it, expect } from 'vitest'
import { parseCsv, generateCsvTemplate } from '../src/lib/import/sb-import-parser'

describe('sb-import-parser', () => {
  describe('parseCsv', () => {
    it('should parse valid CSV with all columns', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Monthly service fee,1,szt.,1000.00,23,2025-01-31,2025-02-28',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual({
        supplierNip: '1234567890',
        itemDescription: 'Monthly service fee',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 1000,
        vatRate: 23,
        invoiceDate: '2025-01-31',
        dueDate: '2025-02-28',
      })
    })

    it('should handle missing optional dueDate', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Service,2,godz.,100.00,23,2025-03-15,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows[0].dueDate).toBeUndefined()
    })

    it('should parse multiple rows', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Service A,1,szt.,500,23,2025-01-01,',
        '0987654321,Service B,3,godz.,200,8,2025-01-02,2025-02-01',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].supplierNip).toBe('1234567890')
      expect(result.rows[1].supplierNip).toBe('0987654321')
    })

    it('should reject CSV without header', () => {
      const csv = '1234567890,Service,1,szt.,100.00,23,2025-01-01,'
      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/header/)
    })

    it('should report error for missing required columns', () => {
      const csv = [
        'supplierNip,itemDescription,quantity',
        '1234567890,Service,1',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/Missing required columns/)
      expect(result.rows).toHaveLength(0)
    })

    it('should validate NIP format (10 digits)', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '12345,Service,1,szt.,100,23,2025-01-01,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/NIP/)
    })

    it('should validate quantity is positive', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Service,0,szt.,100,23,2025-01-01,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/quantity/)
    })

    it('should validate invoiceDate format YYYY-MM-DD', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Service,1,szt.,100,23,01-01-2025,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/invoiceDate/)
    })

    it('should handle quoted fields with commas', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,"Service, monthly",1,szt.,100,23,2025-01-01,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows[0].itemDescription).toBe('Service, monthly')
    })

    it('should handle semicolon delimiters', () => {
      const csv = [
        'supplierNip;itemDescription;quantity;unit;unitPrice;vatRate;invoiceDate;dueDate',
        '1234567890;Service;1;szt.;100;23;2025-01-01;',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
    })

    it('should skip empty lines', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Service,1,szt.,100,23,2025-01-01,',
        '',
        '0987654321,Other,2,godz.,200,8,2025-02-01,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(2)
    })

    it('should report row-level errors alongside valid rows', () => {
      const csv = [
        'supplierNip,itemDescription,quantity,unit,unitPrice,vatRate,invoiceDate,dueDate',
        '1234567890,Service,1,szt.,100,23,2025-01-01,',
        'BADNIP,Bad row,-1,szt.,abc,xx,invalid,',
      ].join('\n')

      const result = parseCsv(csv)
      expect(result.rows).toHaveLength(1)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('generateCsvTemplate', () => {
    it('should return CSV with header and example row', () => {
      const template = generateCsvTemplate()
      const lines = template.trim().split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('supplierNip')
      expect(lines[0]).toContain('invoiceDate')
      expect(lines[1]).toContain('1234567890')
    })

    it('should be parseable by parseCsv', () => {
      const template = generateCsvTemplate()
      const result = parseCsv(template)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
    })
  })
})
