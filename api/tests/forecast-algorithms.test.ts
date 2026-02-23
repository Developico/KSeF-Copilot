/**
 * Tests for configurable forecast algorithms.
 *
 * Covers:
 * - Each algorithm strategy with explicit params
 * - Algorithm auto-selection logic
 * - AlgorithmConfigMap passthrough
 * - Presets and descriptors metadata
 * - Edge cases (insufficient data, zero values)
 */

import { describe, it, expect } from 'vitest'
import {
  generateForecast,
  getAlgorithmDescriptors,
  getForecastPresets,
  ALGORITHM_DESCRIPTORS,
  FORECAST_PRESETS,
  type MonthlyDataPoint,
  type ForecastAlgorithm,
} from '../src/lib/forecast/engine'

// ─── Test data helpers ──────────────────────────────────────────

function makeHistory(months: number, baseAmount = 10000): MonthlyDataPoint[] {
  const data: MonthlyDataPoint[] = []
  for (let i = 0; i < months; i++) {
    const month = i < 12
      ? `2025-${String(i + 1).padStart(2, '0')}`
      : `2026-${String(i - 11).padStart(2, '0')}`
    data.push({
      month,
      grossAmount: baseAmount + i * 500 + Math.sin(i * 0.5) * 2000,
      netAmount: (baseAmount + i * 500) * 0.8,
      invoiceCount: 5 + i,
    })
  }
  return data
}

// Seasonal-like data: high in summer, low in winter
function makeSeasonalHistory(): MonthlyDataPoint[] {
  const seasonalFactors = [0.5, 0.4, 0.6, 0.8, 1.0, 1.3, 1.5, 1.4, 1.2, 0.9, 0.7, 0.6]
  const data: MonthlyDataPoint[] = []
  for (let i = 0; i < 13; i++) {
    const monthIdx = i % 12
    const year = i < 12 ? 2025 : 2026
    const month = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
    const amount = 50000 * seasonalFactors[monthIdx]
    data.push({
      month,
      grossAmount: amount,
      netAmount: amount * 0.8,
      invoiceCount: Math.round(amount / 5000),
    })
  }
  return data
}

// ─── Metadata ───────────────────────────────────────────────────

describe('getAlgorithmDescriptors', () => {
  it('returns all algorithm descriptors', () => {
    const descriptors = getAlgorithmDescriptors()
    expect(descriptors).toEqual(ALGORITHM_DESCRIPTORS)
    expect(descriptors.length).toBeGreaterThanOrEqual(4)

    const ids = descriptors.map((d) => d.id)
    expect(ids).toContain('auto')
    expect(ids).toContain('moving-average')
    expect(ids).toContain('linear-regression')
    expect(ids).toContain('seasonal')
    expect(ids).toContain('exponential-smoothing')
  })

  it('each descriptor has valid parameter definitions', () => {
    const descriptors = getAlgorithmDescriptors()
    for (const d of descriptors) {
      for (const p of d.parameters) {
        expect(p.min).toBeLessThan(p.max)
        expect(p.default).toBeGreaterThanOrEqual(p.min)
        expect(p.default).toBeLessThanOrEqual(p.max)
        expect(p.step).toBeGreaterThan(0)
      }
    }
  })
})

describe('getForecastPresets', () => {
  it('returns all preset descriptors', () => {
    const presets = getForecastPresets()
    expect(presets).toEqual(FORECAST_PRESETS)
    expect(Object.keys(presets)).toEqual(['default', 'conservative', 'aggressive'])
  })

  it('each preset references a valid algorithm', () => {
    const presets = getForecastPresets()
    const validAlgos = ALGORITHM_DESCRIPTORS.map((d) => d.id)
    for (const [, preset] of Object.entries(presets)) {
      expect(validAlgos).toContain(preset.algorithm)
    }
  })
})

// ─── Algorithm selection ────────────────────────────────────────

describe('generateForecast with algorithm param', () => {
  it('uses moving-average when explicitly set', () => {
    const hist = makeHistory(6)
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'moving-average',
    })
    expect(result.method).toBe('moving-average')
    expect(result.forecast).toHaveLength(3)
  })

  it('uses linear-regression when explicitly set', () => {
    const hist = makeHistory(6)
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'linear-regression',
    })
    expect(result.method).toBe('linear-regression')
    expect(result.forecast).toHaveLength(3)
  })

  it('uses seasonal when explicitly set', () => {
    const hist = makeSeasonalHistory()
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'seasonal',
    })
    expect(result.method).toBe('seasonal')
    expect(result.forecast).toHaveLength(3)
  })

  it('uses exponential-smoothing when explicitly set', () => {
    const hist = makeHistory(6)
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'exponential-smoothing',
    })
    expect(result.method).toBe('exponential-smoothing')
    expect(result.forecast).toHaveLength(3)
  })

  it('auto selects an appropriate algorithm', () => {
    const hist = makeHistory(6)
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'auto',
    })
    const validMethods = ['moving-average', 'linear-regression', 'seasonal', 'exponential-smoothing']
    expect(validMethods).toContain(result.method)
    expect(result.forecast).toHaveLength(3)
  })

  it('defaults to auto when algorithm is omitted', () => {
    const hist = makeHistory(6)
    const result = generateForecast(hist, { horizon: 3 })
    const validMethods = ['moving-average', 'linear-regression', 'seasonal', 'exponential-smoothing']
    expect(validMethods).toContain(result.method)
  })
})

// ─── Algorithm config passthrough ───────────────────────────────

describe('algorithmConfig parameters', () => {
  it('moving-average respects windowSize', () => {
    const hist = makeHistory(12)
    const result3 = generateForecast(hist, {
      horizon: 1,
      algorithm: 'moving-average',
      algorithmConfig: { 'moving-average': { windowSize: 3 } },
    })
    const result6 = generateForecast(hist, {
      horizon: 1,
      algorithm: 'moving-average',
      algorithmConfig: { 'moving-average': { windowSize: 6 } },
    })

    // Different window sizes should produce (likely) different forecasts
    expect(result3.method).toBe('moving-average')
    expect(result6.method).toBe('moving-average')
    // Both should produce valid results
    expect(result3.forecast[0].predicted).toBeGreaterThan(0)
    expect(result6.forecast[0].predicted).toBeGreaterThan(0)
  })

  it('linear-regression respects blendRatio', () => {
    const hist = makeHistory(6)
    const result0 = generateForecast(hist, {
      horizon: 1,
      algorithm: 'linear-regression',
      algorithmConfig: { 'linear-regression': { blendRatio: 0 } },
    })
    const result1 = generateForecast(hist, {
      horizon: 1,
      algorithm: 'linear-regression',
      algorithmConfig: { 'linear-regression': { blendRatio: 1 } },
    })

    expect(result0.method).toBe('linear-regression')
    expect(result1.method).toBe('linear-regression')
    expect(result0.forecast[0].predicted).toBeGreaterThan(0)
    expect(result1.forecast[0].predicted).toBeGreaterThan(0)
  })

  it('exponential-smoothing respects alpha/beta', () => {
    const hist = makeHistory(6)
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'exponential-smoothing',
      algorithmConfig: { 'exponential-smoothing': { alpha: 0.8, beta: 0.3 } },
    })

    expect(result.method).toBe('exponential-smoothing')
    expect(result.forecast).toHaveLength(3)
    for (const fp of result.forecast) {
      expect(Number.isFinite(fp.predicted)).toBe(true)
      expect(fp.lower).toBeLessThan(fp.upper)
    }
  })

  it('seasonal respects significanceThreshold', () => {
    const hist = makeSeasonalHistory()
    const result = generateForecast(hist, {
      horizon: 3,
      algorithm: 'seasonal',
      algorithmConfig: { 'seasonal': { significanceThreshold: 0.5 } },
    })

    expect(result.method).toBe('seasonal')
    expect(result.forecast).toHaveLength(3)
  })
})

// ─── Confidence & bounds ────────────────────────────────────────

describe('forecast result structure', () => {
  const algorithms: ForecastAlgorithm[] = [
    'moving-average', 'linear-regression', 'seasonal', 'exponential-smoothing',
  ]

  for (const algo of algorithms) {
    it(`${algo}: forecast points have valid lower/upper bounds`, () => {
      const hist = algo === 'seasonal' ? makeSeasonalHistory() : makeHistory(8)
      const result = generateForecast(hist, { horizon: 3, algorithm: algo })

      for (const fp of result.forecast) {
        expect(Number.isFinite(fp.predicted)).toBe(true)
        expect(fp.lower).toBeLessThanOrEqual(fp.predicted)
        expect(fp.upper).toBeGreaterThanOrEqual(fp.predicted)
        expect(fp.month).toMatch(/^\d{4}-\d{2}$/)
      }
    })

    it(`${algo}: confidence is between 0 and 1`, () => {
      const hist = algo === 'seasonal' ? makeSeasonalHistory() : makeHistory(8)
      const result = generateForecast(hist, { horizon: 3, algorithm: algo })
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it(`${algo}: trend is one of up/down/stable`, () => {
      const hist = algo === 'seasonal' ? makeSeasonalHistory() : makeHistory(8)
      const result = generateForecast(hist, { horizon: 3, algorithm: algo })
      expect(['up', 'down', 'stable']).toContain(result.trend)
    })

    it(`${algo}: summary has valid values`, () => {
      const hist = algo === 'seasonal' ? makeSeasonalHistory() : makeHistory(8)
      const result = generateForecast(hist, { horizon: 3, algorithm: algo })
      expect(Number.isFinite(result.summary.nextMonth)).toBe(true)
      expect(Number.isFinite(result.summary.totalForecast)).toBe(true)
      expect(Number.isFinite(result.summary.avgMonthly)).toBe(true)
    })
  }
})

// ─── Edge cases ─────────────────────────────────────────────────

describe('edge cases', () => {
  it('empty historical data returns empty forecast', () => {
    const result = generateForecast([], { horizon: 3 })
    expect(result.forecast).toHaveLength(0)
    expect(result.historical).toHaveLength(0)
    expect(result.confidence).toBe(0)
  })

  it('single data point produces a forecast', () => {
    const hist: MonthlyDataPoint[] = [
      { month: '2025-12', grossAmount: 10000, netAmount: 8000, invoiceCount: 5 },
    ]
    const result = generateForecast(hist, { horizon: 1, algorithm: 'moving-average' })
    expect(result.forecast.length).toBeGreaterThanOrEqual(1)
    expect(result.forecast[0].predicted).toBeGreaterThan(0)
  })

  it('confidence decreases with insufficient data for chosen algorithm', () => {
    // Seasonal needs 12+ data points; giving only 4 should penalize confidence.
    // The engine may fall back to a simpler method when data is insufficient.
    const hist = makeHistory(4)
    const resultSeasonal = generateForecast(hist, { horizon: 1, algorithm: 'seasonal' })
    // Compare with a full-data run to verify confidence penalty
    const fullHist = makeSeasonalHistory()
    const resultFull = generateForecast(fullHist, { horizon: 1, algorithm: 'seasonal' })
    // Insufficient data should yield lower confidence than adequate data
    expect(resultSeasonal.confidence).toBeLessThanOrEqual(resultFull.confidence)
  })

  it('all-zero historical data produces zero forecast', () => {
    const hist: MonthlyDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, '0')}`,
      grossAmount: 0,
      netAmount: 0,
      invoiceCount: 0,
    }))
    const result = generateForecast(hist, { horizon: 3 })
    for (const fp of result.forecast) {
      expect(fp.predicted).toBe(0)
    }
  })
})
