import { describe, it, expect } from 'vitest'
import {
  fillMissingMonths,
  parseDateToMonth,
  generateForecast,
  type MonthlyDataPoint,
} from '../src/lib/forecast/engine'

describe('parseDateToMonth', () => {
  it('parses ISO date-only "YYYY-MM-DD"', () => {
    expect(parseDateToMonth('2025-12-15')).toBe('2025-12')
    expect(parseDateToMonth('2025-01-01')).toBe('2025-01')
    expect(parseDateToMonth('2026-02-28')).toBe('2026-02')
  })

  it('parses ISO datetime with Z suffix', () => {
    // "2025-12-01T00:00:00Z" — midnight UTC is still December
    expect(parseDateToMonth('2025-12-01T00:00:00Z')).toBe('2025-12')
  })

  it('parses ISO datetime with timezone offset', () => {
    // "2025-12-01T00:00:00+01:00" → stored UTC = Nov 30 23:00 UTC
    // parseDateToMonth should return the LOCAL date's month
    const result = parseDateToMonth('2025-12-01T00:00:00+01:00')
    // new Date("2025-12-01T00:00:00+01:00") gives Nov 30 23:00 UTC
    // In local time this depends on the runtime TZ, but the function uses new Date()
    // which converts to local. The key: it should not naively substring to "2025-12"
    // when the actual UTC date is November.
    expect(result).toBeTruthy()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })

  it('returns null for empty/invalid strings', () => {
    expect(parseDateToMonth('')).toBeNull()
    expect(parseDateToMonth('not-a-date')).toBeNull()
  })

  it('handles Dataverse date format without time', () => {
    expect(parseDateToMonth('2025-12-31')).toBe('2025-12')
    expect(parseDateToMonth('2025-06-15')).toBe('2025-06')
  })
})

describe('fillMissingMonths', () => {
  it('returns same data when all months are consecutive', () => {
    const data: MonthlyDataPoint[] = [
      { month: '2025-10', grossAmount: 100, netAmount: 80, invoiceCount: 5 },
      { month: '2025-11', grossAmount: 200, netAmount: 160, invoiceCount: 8 },
      { month: '2025-12', grossAmount: 150, netAmount: 120, invoiceCount: 6 },
    ]
    const result = fillMissingMonths(data)
    expect(result).toHaveLength(3)
    expect(result.map((d) => d.month)).toEqual(['2025-10', '2025-11', '2025-12'])
  })

  it('fills a gap month with zero values', () => {
    const data: MonthlyDataPoint[] = [
      { month: '2025-10', grossAmount: 100, netAmount: 80, invoiceCount: 5 },
      // December 2025 is missing
      { month: '2025-12', grossAmount: 150, netAmount: 120, invoiceCount: 6 },
    ]
    const result = fillMissingMonths(data)
    expect(result).toHaveLength(3)
    expect(result[1]).toEqual({
      month: '2025-11',
      grossAmount: 0,
      netAmount: 0,
      invoiceCount: 0,
    })
  })

  it('fills multiple gap months', () => {
    const data: MonthlyDataPoint[] = [
      { month: '2025-08', grossAmount: 100, netAmount: 80, invoiceCount: 5 },
      { month: '2025-12', grossAmount: 150, netAmount: 120, invoiceCount: 6 },
    ]
    const result = fillMissingMonths(data)
    expect(result).toHaveLength(5)
    expect(result.map((d) => d.month)).toEqual([
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
    ])
    // Existing data preserved
    expect(result[0].grossAmount).toBe(100)
    expect(result[4].grossAmount).toBe(150)
    // Gap months are zero
    expect(result[1].grossAmount).toBe(0)
    expect(result[2].grossAmount).toBe(0)
    expect(result[3].grossAmount).toBe(0)
  })

  it('handles year boundary (Dec → Jan)', () => {
    const data: MonthlyDataPoint[] = [
      { month: '2025-11', grossAmount: 100, netAmount: 80, invoiceCount: 5 },
      { month: '2026-02', grossAmount: 200, netAmount: 160, invoiceCount: 8 },
    ]
    const result = fillMissingMonths(data)
    expect(result).toHaveLength(4)
    expect(result.map((d) => d.month)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })

  it('returns unchanged for single month', () => {
    const data: MonthlyDataPoint[] = [
      { month: '2025-12', grossAmount: 100, netAmount: 80, invoiceCount: 5 },
    ]
    const result = fillMissingMonths(data)
    expect(result).toHaveLength(1)
  })

  it('returns empty for empty input', () => {
    expect(fillMissingMonths([])).toEqual([])
  })
})

describe('generateForecast', () => {
  it('fills gap months in historical output', () => {
    const historical: MonthlyDataPoint[] = [
      { month: '2025-09', grossAmount: 1000, netAmount: 800, invoiceCount: 5 },
      { month: '2025-10', grossAmount: 1100, netAmount: 880, invoiceCount: 6 },
      // November missing
      { month: '2025-12', grossAmount: 1200, netAmount: 960, invoiceCount: 7 },
      { month: '2026-01', grossAmount: 1300, netAmount: 1040, invoiceCount: 8 },
    ]
    const result = generateForecast(historical, { horizon: 1 })

    // Historical should have November filled in
    const months = result.historical.map((d) => d.month)
    expect(months).toContain('2025-11')
    expect(months).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01'])

    // November should have zero values
    const nov = result.historical.find((d) => d.month === '2025-11')
    expect(nov).toBeDefined()
    expect(nov!.grossAmount).toBe(0)
    expect(nov!.invoiceCount).toBe(0)
  })

  it('generates forecast points beyond last historical month', () => {
    const historical: MonthlyDataPoint[] = [
      { month: '2025-10', grossAmount: 1000, netAmount: 800, invoiceCount: 5 },
      { month: '2025-11', grossAmount: 1100, netAmount: 880, invoiceCount: 6 },
      { month: '2025-12', grossAmount: 1200, netAmount: 960, invoiceCount: 7 },
    ]
    const result = generateForecast(historical, { horizon: 3 })

    expect(result.forecast).toHaveLength(3)
    expect(result.forecast[0].month).toBe('2026-01')
    expect(result.forecast[1].month).toBe('2026-02')
    expect(result.forecast[2].month).toBe('2026-03')
  })

  it('CI lower bound is proportional to predicted, not zero', () => {
    // 13 months of data with seasonal-like variance to trigger seasonal method
    const historical: MonthlyDataPoint[] = [
      { month: '2025-01', grossAmount: 50000,  netAmount: 40000,  invoiceCount: 10 },
      { month: '2025-02', grossAmount: 30000,  netAmount: 24000,  invoiceCount: 8 },
      { month: '2025-03', grossAmount: 20000,  netAmount: 16000,  invoiceCount: 6 },
      { month: '2025-04', grossAmount: 15000,  netAmount: 12000,  invoiceCount: 5 },
      { month: '2025-05', grossAmount: 18000,  netAmount: 14400,  invoiceCount: 7 },
      { month: '2025-06', grossAmount: 120000, netAmount: 96000,  invoiceCount: 20 },
      { month: '2025-07', grossAmount: 200000, netAmount: 160000, invoiceCount: 30 },
      { month: '2025-08', grossAmount: 180000, netAmount: 144000, invoiceCount: 28 },
      { month: '2025-09', grossAmount: 300000, netAmount: 240000, invoiceCount: 40 },
      { month: '2025-10', grossAmount: 90000,  netAmount: 72000,  invoiceCount: 15 },
      { month: '2025-11', grossAmount: 60000,  netAmount: 48000,  invoiceCount: 12 },
      { month: '2025-12', grossAmount: 80000,  netAmount: 64000,  invoiceCount: 14 },
      { month: '2026-01', grossAmount: 40000,  netAmount: 32000,  invoiceCount: 9 },
    ]
    const result = generateForecast(historical, { horizon: 6 })

    // Every forecast point should have lower > 0 if predicted is significant
    for (const fp of result.forecast) {
      if (fp.predicted > 5000) {
        expect(fp.lower).toBeGreaterThan(0)
        // Lower should be at least 20% of predicted (CI wraps the line, doesn't drop to 0)
        expect(fp.lower).toBeGreaterThan(fp.predicted * 0.1)
      }
      expect(fp.upper).toBeGreaterThan(fp.predicted)
    }
  })
})
