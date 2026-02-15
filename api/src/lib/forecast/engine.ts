/**
 * Forecast engine — statistical time-series prediction
 * 
 * Uses linear regression + moving average with optional seasonality.
 * All calculations are server-side with no external dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface MonthlyDataPoint {
  month: string       // "YYYY-MM"
  grossAmount: number
  netAmount: number
  invoiceCount: number
}

export interface ForecastPoint {
  month: string
  predicted: number
  lower: number       // confidence interval lower bound (80%)
  upper: number       // confidence interval upper bound (80%)
}

export interface ForecastResult {
  historical: MonthlyDataPoint[]
  forecast: ForecastPoint[]
  trend: 'up' | 'down' | 'stable'
  trendPercent: number              // month-over-month trend %
  confidence: number                // 0-1 overall confidence
  method: 'moving-average' | 'linear-regression' | 'seasonal'
  summary: {
    nextMonth: number               // predicted amount for next month
    totalForecast: number           // sum of all forecast months
    avgMonthly: number              // average historical monthly
  }
}

export interface ForecastParams {
  horizon: 1 | 6 | 12
  historyMonths?: number            // how many months of history to use (default: 24)
}

export interface GroupedForecastResult {
  group: string                     // MPK name, category name, or supplier name
  forecast: ForecastResult
}

// ============================================================================
// Core: Linear Regression
// ============================================================================

interface RegressionResult {
  slope: number
  intercept: number
  r2: number         // coefficient of determination
}

/**
 * Simple linear regression: y = slope * x + intercept
 */
function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = xs.length
  if (n < 2) {
    return { slope: 0, intercept: ys[0] || 0, r2: 0 }
  }

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const sumX2 = xs.reduce((a, x) => a + x * x, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 }
  }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R² calculation
  const meanY = sumY / n
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0)
  const ssTot = ys.reduce((a, y) => a + (y - meanY) ** 2, 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

// ============================================================================
// Core: Moving Average
// ============================================================================

/**
 * Weighted moving average (more weight on recent months)
 */
function weightedMovingAverage(values: number[], window: number): number {
  const slice = values.slice(-window)
  const weights = slice.map((_, i) => i + 1) // 1, 2, 3, ... (recent = heavier)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  return slice.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight
}

// ============================================================================
// Core: Seasonality Detection
// ============================================================================

interface SeasonalIndex {
  [monthNum: number]: number // 1-12 → ratio vs average
}

/**
 * Detect seasonal patterns by comparing each calendar month to overall average.
 * Requires at least 12 months of data.
 */
function detectSeasonality(data: MonthlyDataPoint[]): SeasonalIndex | null {
  if (data.length < 12) return null

  const monthSums = new Map<number, { total: number; count: number }>()

  for (const d of data) {
    const monthNum = parseInt(d.month.split('-')[1], 10)
    const existing = monthSums.get(monthNum) || { total: 0, count: 0 }
    existing.total += d.grossAmount
    existing.count++
    monthSums.set(monthNum, existing)
  }

  const overallAvg = data.reduce((s, d) => s + d.grossAmount, 0) / data.length
  if (overallAvg === 0) return null

  const index: SeasonalIndex = {}
  for (const [monthNum, { total, count }] of monthSums) {
    index[monthNum] = (total / count) / overallAvg
  }

  // Check if seasonality is significant (variance of indices > 0.1)
  const indices = Object.values(index)
  const meanIdx = indices.reduce((a, b) => a + b, 0) / indices.length
  const variance = indices.reduce((a, v) => a + (v - meanIdx) ** 2, 0) / indices.length

  return variance > 0.01 ? index : null
}

// ============================================================================
// Main Forecast Function
// ============================================================================

/**
 * Generate forecast from historical monthly data.
 * 
 * Strategy:
 * - < 3 months: weighted moving average only (low confidence)
 * - 3-11 months: linear regression + moving average blend
 * - 12+ months: linear regression + seasonality adjustment
 */
export function generateForecast(
  historical: MonthlyDataPoint[],
  params: ForecastParams
): ForecastResult {
  const { horizon } = params

  // Sort chronologically and fill gaps
  const filled = fillMissingMonths(historical)
  const sorted = filled.sort((a, b) => a.month.localeCompare(b.month))

  if (sorted.length === 0) {
    return emptyForecast(horizon)
  }

  const amounts = sorted.map((d) => d.grossAmount)
  const avgMonthly = amounts.reduce((a, b) => a + b, 0) / amounts.length

  // Choose method based on data availability
  let method: ForecastResult['method']
  let forecastValues: number[]
  let confidenceBase: number
  // Relative CV (coefficient of variation) of model residuals — used for CI
  let residualCV: number
  const seasonality = detectSeasonality(sorted)

  if (sorted.length < 3) {
    // Too little data — simple moving average
    method = 'moving-average'
    const avg = weightedMovingAverage(amounts, amounts.length)
    forecastValues = Array(horizon).fill(avg)
    confidenceBase = 0.3
    // Use raw CV as fallback
    residualCV = avg > 0 ? standardDeviation(amounts) / avg : 0.5
  } else if (sorted.length < 12 || !seasonality) {
    // Linear regression without seasonality
    method = 'linear-regression'
    const xs = amounts.map((_, i) => i)
    const reg = linearRegression(xs, amounts)

    forecastValues = []
    for (let i = 0; i < horizon; i++) {
      const x = sorted.length + i
      const regValue = reg.slope * x + reg.intercept
      const maValue = weightedMovingAverage(amounts, Math.min(6, amounts.length))
      // Blend: 60% regression, 40% moving average
      forecastValues.push(Math.max(0, regValue * 0.6 + maValue * 0.4))
    }
    confidenceBase = Math.min(0.8, 0.4 + reg.r2 * 0.4)
    // Residual CV: how far the model's predictions are from actuals, relative to predicted
    const fitted = xs.map((x) => reg.slope * x + reg.intercept)
    const relErrors = amounts.map((y, i) => fitted[i] > 0 ? (y - fitted[i]) / fitted[i] : 0)
    residualCV = standardDeviation(relErrors)
  } else {
    // Full model with seasonality
    method = 'seasonal'
    const xs = amounts.map((_, i) => i)
    // Deseasonalize
    const deseasonalized = sorted.map((d, i) => {
      const monthNum = parseInt(d.month.split('-')[1], 10)
      return amounts[i] / (seasonality[monthNum] || 1)
    })
    const reg = linearRegression(xs, deseasonalized)

    forecastValues = []
    const lastMonth = sorted[sorted.length - 1].month
    for (let i = 0; i < horizon; i++) {
      const x = sorted.length + i
      const futureMonth = addMonths(lastMonth, i + 1)
      const monthNum = parseInt(futureMonth.split('-')[1], 10)
      const baseValue = reg.slope * x + reg.intercept
      const seasonalFactor = seasonality[monthNum] || 1
      forecastValues.push(Math.max(0, baseValue * seasonalFactor))
    }
    confidenceBase = Math.min(0.85, 0.5 + reg.r2 * 0.35)
    // Residual CV: compare model's fitted values (with seasonality) against actuals
    const fitted = sorted.map((d, i) => {
      const monthNum = parseInt(d.month.split('-')[1], 10)
      return (reg.slope * i + reg.intercept) * (seasonality[monthNum] || 1)
    })
    const relErrors = amounts.map((y, i) => fitted[i] > 0 ? (y - fitted[i]) / fitted[i] : 0)
    residualCV = standardDeviation(relErrors)
  }

  // Ensure residualCV has a reasonable minimum so CI is never invisibly thin
  residualCV = Math.max(residualCV, 0.05)

  // Build forecast points with confidence intervals
  // Uses relative CI (proportional to predicted value) based on model residuals.
  // This ensures the band wraps around the forecast line rather than extending to 0.
  const lastMonth = sorted[sorted.length - 1].month

  const forecast: ForecastPoint[] = forecastValues.map((predicted, i) => {
    const month = addMonths(lastMonth, i + 1)
    // Confidence interval widens with horizon
    const horizonFactor = 1 + (i * 0.15) // 15% wider per month
    const interval = predicted * residualCV * horizonFactor * 1.28 // 80% CI ≈ 1.28 σ

    return {
      month,
      predicted: Math.round(predicted * 100) / 100,
      lower: Math.round(Math.max(0, predicted - interval) * 100) / 100,
      upper: Math.round((predicted + interval) * 100) / 100,
    }
  })

  // Calculate trend
  const recentAvg = weightedMovingAverage(amounts, Math.min(3, amounts.length))
  const olderAvg = amounts.length >= 6
    ? amounts.slice(0, -3).reduce((a, b) => a + b, 0) / (amounts.length - 3)
    : recentAvg
  const trendPercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

  let trend: ForecastResult['trend'] = 'stable'
  if (trendPercent > 5) trend = 'up'
  else if (trendPercent < -5) trend = 'down'

  // Adjust confidence by horizon (longer = less confident)
  const horizonPenalty = horizon === 1 ? 1 : horizon === 6 ? 0.85 : 0.7
  const confidence = Math.round(confidenceBase * horizonPenalty * 100) / 100

  return {
    historical: sorted,
    forecast,
    trend,
    trendPercent: Math.round(trendPercent * 10) / 10,
    confidence,
    method,
    summary: {
      nextMonth: forecast[0]?.predicted || 0,
      totalForecast: forecast.reduce((s, f) => s + f.predicted, 0),
      avgMonthly: Math.round(avgMonthly * 100) / 100,
    },
  }
}

// ============================================================================
// Helpers
// ============================================================================

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function addMonths(yearMonth: string, count: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const date = new Date(y, m - 1 + count, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Fill gaps in monthly data so every month between first and last is present.
 * Months without data get zero values. This prevents visual gaps in charts.
 */
export function fillMissingMonths(data: MonthlyDataPoint[]): MonthlyDataPoint[] {
  if (data.length < 2) return data

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month))
  const first = sorted[0].month
  const last = sorted[sorted.length - 1].month
  const monthMap = new Map(sorted.map((d) => [d.month, d]))

  const result: MonthlyDataPoint[] = []
  let current = first
  while (current <= last) {
    result.push(
      monthMap.get(current) || { month: current, grossAmount: 0, netAmount: 0, invoiceCount: 0 }
    )
    current = addMonths(current, 1)
  }
  return result
}

/**
 * Parse a date string (ISO or other) into "YYYY-MM" format.
 * Handles ISO 8601 with timezone offsets, plain dates, and DateTimes.
 */
export function parseDateToMonth(dateStr: string): string | null {
  if (!dateStr) return null

  // Try ISO substring first for "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/)
  if (isoMatch) {
    // For DateTime strings with timezone, parse properly to get correct local month
    if (dateStr.includes('T')) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }
    }
    return `${isoMatch[1]}-${isoMatch[2]}`
  }

  // Fallback: try native Date parsing
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  return null
}

function emptyForecast(horizon: number): ForecastResult {
  return {
    historical: [],
    forecast: [],
    trend: 'stable',
    trendPercent: 0,
    confidence: 0,
    method: 'moving-average',
    summary: { nextMonth: 0, totalForecast: 0, avgMonthly: 0 },
  }
}
