/**
 * Forecast engine — statistical time-series prediction
 * 
 * Uses linear regression + moving average with optional seasonality.
 * Supports configurable algorithm selection and per-algorithm parameters.
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

// ── Algorithm types ─────────────────────────────────────────────

/** Supported forecast algorithm identifiers */
export type ForecastAlgorithm =
  | 'auto'
  | 'moving-average'
  | 'linear-regression'
  | 'seasonal'
  | 'exponential-smoothing'

/** Per-algorithm configuration parameters */
export interface MovingAverageConfig {
  /** Window size in months (2–12, default: 3) */
  windowSize?: number
}

export interface LinearRegressionConfig {
  /** Blend ratio of regression vs moving-average (0–1, default: 0.6) */
  blendRatio?: number
}

export interface SeasonalConfig {
  /** Variance threshold to consider seasonality significant (0.001–0.1, default: 0.01) */
  significanceThreshold?: number
}

export interface ExponentialSmoothingConfig {
  /** Smoothing factor alpha (0.1–0.9, default: 0.3) */
  alpha?: number
  /** Trend smoothing factor beta for Holt's method (0–0.9, default: 0). 0 = simple ES, >0 = Holt's */
  beta?: number
}

/** Union config type keyed by algorithm name */
export interface AlgorithmConfigMap {
  'moving-average'?: MovingAverageConfig
  'linear-regression'?: LinearRegressionConfig
  'seasonal'?: SeasonalConfig
  'exponential-smoothing'?: ExponentialSmoothingConfig
}

/** Metadata describing an algorithm and its tunable parameters */
export interface AlgorithmDescriptor {
  id: ForecastAlgorithm
  name: string
  description: string
  /** Minimum months of history required for this algorithm */
  minDataPoints: number
  parameters: AlgorithmParameterDescriptor[]
}

export interface AlgorithmParameterDescriptor {
  key: string
  label: string
  description: string
  type: 'number'
  min: number
  max: number
  step: number
  default: number
}

// ── Forecast result & params ────────────────────────────────────

export interface ForecastResult {
  historical: MonthlyDataPoint[]
  forecast: ForecastPoint[]
  trend: 'up' | 'down' | 'stable'
  trendPercent: number              // month-over-month trend %
  confidence: number                // 0-1 overall confidence
  method: 'moving-average' | 'linear-regression' | 'seasonal' | 'exponential-smoothing'
  summary: {
    nextMonth: number               // predicted amount for next month
    totalForecast: number           // sum of all forecast months
    avgMonthly: number              // average historical monthly
  }
}

export interface ForecastParams {
  horizon: 1 | 6 | 12
  historyMonths?: number            // how many months of history to use (default: 24)
  /** Algorithm override — 'auto' (default) lets the engine pick the best method */
  algorithm?: ForecastAlgorithm
  /** Per-algorithm parameter overrides */
  algorithmConfig?: AlgorithmConfigMap
}

export interface GroupedForecastResult {
  group: string                     // MPK name, category name, or supplier name
  forecast: ForecastResult
}

// ── Algorithm presets ───────────────────────────────────────────

export type ForecastPreset = 'default' | 'conservative' | 'aggressive'

export const FORECAST_PRESETS: Record<ForecastPreset, {
  label: string
  description: string
  algorithm: ForecastAlgorithm
  algorithmConfig: AlgorithmConfigMap
}> = {
  default: {
    label: 'Default',
    description: 'Automatic algorithm selection with balanced parameters',
    algorithm: 'auto',
    algorithmConfig: {},
  },
  conservative: {
    label: 'Conservative',
    description: 'Lower sensitivity, wider confidence intervals, favours moving average',
    algorithm: 'moving-average',
    algorithmConfig: {
      'moving-average': { windowSize: 6 },
    },
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Higher sensitivity, trend-focused with exponential smoothing',
    algorithm: 'exponential-smoothing',
    algorithmConfig: {
      'exponential-smoothing': { alpha: 0.6, beta: 0.3 },
    },
  },
}

// ── Algorithm descriptors (metadata for UI) ─────────────────────

export const ALGORITHM_DESCRIPTORS: AlgorithmDescriptor[] = [
  {
    id: 'auto',
    name: 'Automatic',
    description: 'Automatically selects the best algorithm based on data availability',
    minDataPoints: 1,
    parameters: [],
  },
  {
    id: 'moving-average',
    name: 'Weighted Moving Average',
    description: 'Weighted moving average — more weight on recent months. Best for stable, low-variance data.',
    minDataPoints: 1,
    parameters: [
      { key: 'windowSize', label: 'Window Size', description: 'Number of recent months to consider', type: 'number', min: 2, max: 12, step: 1, default: 3 },
    ],
  },
  {
    id: 'linear-regression',
    name: 'Linear Regression',
    description: 'OLS linear regression blended with moving average. Good for data with a clear linear trend.',
    minDataPoints: 3,
    parameters: [
      { key: 'blendRatio', label: 'Blend Ratio', description: 'Weight of regression vs moving average (1.0 = pure regression)', type: 'number', min: 0, max: 1, step: 0.1, default: 0.6 },
    ],
  },
  {
    id: 'seasonal',
    name: 'Seasonal Decomposition',
    description: 'Linear regression on deseasonalized data with seasonal index re-application. Requires 12+ months.',
    minDataPoints: 12,
    parameters: [
      { key: 'significanceThreshold', label: 'Significance Threshold', description: 'Minimum variance of seasonal indices to consider pattern significant', type: 'number', min: 0.001, max: 0.1, step: 0.001, default: 0.01 },
    ],
  },
  {
    id: 'exponential-smoothing',
    name: 'Exponential Smoothing',
    description: 'Simple or Holt\'s double exponential smoothing. Responsive to recent changes.',
    minDataPoints: 2,
    parameters: [
      { key: 'alpha', label: 'Alpha (level)', description: 'Level smoothing factor — higher = more reactive to recent data', type: 'number', min: 0.1, max: 0.9, step: 0.05, default: 0.3 },
      { key: 'beta', label: 'Beta (trend)', description: 'Trend smoothing factor — 0 disables trend component (simple ES)', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0 },
    ],
  },
]

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
 * @param significanceThreshold - variance of seasonal indices must exceed this (default 0.01)
 */
function detectSeasonality(data: MonthlyDataPoint[], significanceThreshold = 0.01): SeasonalIndex | null {
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

  // Check if seasonality is significant
  const indices = Object.values(index)
  const meanIdx = indices.reduce((a, b) => a + b, 0) / indices.length
  const variance = indices.reduce((a, v) => a + (v - meanIdx) ** 2, 0) / indices.length

  return variance > significanceThreshold ? index : null
}

// ============================================================================
// Main Forecast Function
// ============================================================================

/**
 * Generate forecast from historical monthly data.
 * 
 * Strategy (when algorithm = 'auto'):
 * - < 3 months: weighted moving average only (low confidence)
 * - 3-11 months: linear regression + moving average blend
 * - 12+ months: linear regression + seasonality adjustment
 * 
 * When a specific algorithm is requested, it is used regardless of data size
 * (though confidence is penalised when data is insufficient).
 */
export function generateForecast(
  historical: MonthlyDataPoint[],
  params: ForecastParams
): ForecastResult {
  const { horizon, algorithm = 'auto', algorithmConfig = {} } = params

  // Sort chronologically and fill gaps
  const filled = fillMissingMonths(historical)
  const sorted = filled.sort((a, b) => a.month.localeCompare(b.month))

  if (sorted.length === 0) {
    return emptyForecast(horizon)
  }

  const amounts = sorted.map((d) => d.grossAmount)
  const avgMonthly = amounts.reduce((a, b) => a + b, 0) / amounts.length

  // Resolve which strategy to use
  const resolvedAlgorithm = algorithm === 'auto'
    ? autoSelectAlgorithm(sorted)
    : algorithm

  // Dispatch to strategy
  let result: StrategyResult
  switch (resolvedAlgorithm) {
    case 'exponential-smoothing':
      result = strategyExponentialSmoothing(sorted, amounts, horizon, algorithmConfig['exponential-smoothing'])
      break
    case 'seasonal':
      result = strategySeasonal(sorted, amounts, horizon, algorithmConfig['seasonal'])
      break
    case 'linear-regression':
      result = strategyLinearRegression(sorted, amounts, horizon, algorithmConfig['linear-regression'])
      break
    case 'moving-average':
    default:
      result = strategyMovingAverage(amounts, horizon, algorithmConfig['moving-average'])
      break
  }

  // Penalise confidence when data is insufficient for the chosen algorithm
  const descriptor = ALGORITHM_DESCRIPTORS.find((d) => d.id === resolvedAlgorithm)
  if (descriptor && sorted.length < descriptor.minDataPoints) {
    result.confidenceBase *= 0.5
  }

  // Ensure residualCV has a reasonable minimum so CI is never invisibly thin
  result.residualCV = Math.max(result.residualCV, 0.05)

  // Build forecast points with confidence intervals
  const lastMonth = sorted[sorted.length - 1].month

  const forecast: ForecastPoint[] = result.forecastValues.map((predicted, i) => {
    const month = addMonths(lastMonth, i + 1)
    // Confidence interval widens with horizon
    const horizonFactor = 1 + (i * 0.15) // 15% wider per month
    const interval = predicted * result.residualCV * horizonFactor * 1.28 // 80% CI ≈ 1.28 σ

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
  const confidence = Math.round(result.confidenceBase * horizonPenalty * 100) / 100

  return {
    historical: sorted,
    forecast,
    trend,
    trendPercent: Math.round(trendPercent * 10) / 10,
    confidence,
    method: result.method,
    summary: {
      nextMonth: forecast[0]?.predicted || 0,
      totalForecast: forecast.reduce((s, f) => s + f.predicted, 0),
      avgMonthly: Math.round(avgMonthly * 100) / 100,
    },
  }
}

// ============================================================================
// Strategy Result
// ============================================================================

interface StrategyResult {
  method: ForecastResult['method']
  forecastValues: number[]
  confidenceBase: number
  residualCV: number
}

// ============================================================================
// Auto-selection
// ============================================================================

function autoSelectAlgorithm(sorted: MonthlyDataPoint[]): Exclude<ForecastAlgorithm, 'auto'> {
  if (sorted.length < 3) return 'moving-average'
  if (sorted.length < 12) return 'linear-regression'
  // Check if seasonality is significant, otherwise fall back to linear regression
  const seasonality = detectSeasonality(sorted)
  return seasonality ? 'seasonal' : 'linear-regression'
}

// ============================================================================
// Strategies
// ============================================================================

function strategyMovingAverage(
  amounts: number[],
  horizon: number,
  config?: MovingAverageConfig
): StrategyResult {
  const windowSize = clamp(config?.windowSize ?? 3, 2, 12)
  const avg = weightedMovingAverage(amounts, Math.min(windowSize, amounts.length))
  const forecastValues = Array(horizon).fill(avg)
  const residualCV = avg > 0 ? standardDeviation(amounts) / avg : 0.5
  return {
    method: 'moving-average',
    forecastValues,
    confidenceBase: 0.3,
    residualCV,
  }
}

function strategyLinearRegression(
  sorted: MonthlyDataPoint[],
  amounts: number[],
  horizon: number,
  config?: LinearRegressionConfig
): StrategyResult {
  const blendRatio = clamp(config?.blendRatio ?? 0.6, 0, 1)
  const xs = amounts.map((_, i) => i)
  const reg = linearRegression(xs, amounts)

  const forecastValues: number[] = []
  for (let i = 0; i < horizon; i++) {
    const x = sorted.length + i
    const regValue = reg.slope * x + reg.intercept
    const maValue = weightedMovingAverage(amounts, Math.min(6, amounts.length))
    forecastValues.push(Math.max(0, regValue * blendRatio + maValue * (1 - blendRatio)))
  }

  const confidenceBase = Math.min(0.8, 0.4 + reg.r2 * 0.4)
  const fitted = xs.map((x) => reg.slope * x + reg.intercept)
  const relErrors = amounts.map((y, i) => fitted[i] > 0 ? (y - fitted[i]) / fitted[i] : 0)
  const residualCV = standardDeviation(relErrors)

  return { method: 'linear-regression', forecastValues, confidenceBase, residualCV }
}

function strategySeasonal(
  sorted: MonthlyDataPoint[],
  amounts: number[],
  horizon: number,
  config?: SeasonalConfig
): StrategyResult {
  const sigThreshold = clamp(config?.significanceThreshold ?? 0.01, 0.001, 0.1)
  const seasonality = detectSeasonality(sorted, sigThreshold)

  // Fall back to linear regression if seasonality is not significant
  if (!seasonality) {
    return strategyLinearRegression(sorted, amounts, horizon)
  }

  const xs = amounts.map((_, i) => i)
  const deseasonalized = sorted.map((d, i) => {
    const monthNum = parseInt(d.month.split('-')[1], 10)
    return amounts[i] / (seasonality[monthNum] || 1)
  })
  const reg = linearRegression(xs, deseasonalized)

  const forecastValues: number[] = []
  const lastMonth = sorted[sorted.length - 1].month
  for (let i = 0; i < horizon; i++) {
    const x = sorted.length + i
    const futureMonth = addMonths(lastMonth, i + 1)
    const monthNum = parseInt(futureMonth.split('-')[1], 10)
    const baseValue = reg.slope * x + reg.intercept
    const seasonalFactor = seasonality[monthNum] || 1
    forecastValues.push(Math.max(0, baseValue * seasonalFactor))
  }

  const confidenceBase = Math.min(0.85, 0.5 + reg.r2 * 0.35)
  const fitted = sorted.map((d, i) => {
    const monthNum = parseInt(d.month.split('-')[1], 10)
    return (reg.slope * i + reg.intercept) * (seasonality[monthNum] || 1)
  })
  const relErrors = amounts.map((y, i) => fitted[i] > 0 ? (y - fitted[i]) / fitted[i] : 0)
  const residualCV = standardDeviation(relErrors)

  return { method: 'seasonal', forecastValues, confidenceBase, residualCV }
}

/**
 * Simple or Holt's double exponential smoothing.
 * - alpha controls level smoothing (higher = more reactive)
 * - beta controls trend smoothing (0 = simple ES, >0 = Holt's method)
 */
function strategyExponentialSmoothing(
  sorted: MonthlyDataPoint[],
  amounts: number[],
  horizon: number,
  config?: ExponentialSmoothingConfig
): StrategyResult {
  const alpha = clamp(config?.alpha ?? 0.3, 0.1, 0.9)
  const beta = clamp(config?.beta ?? 0, 0, 0.9)

  if (amounts.length === 0) {
    return { method: 'exponential-smoothing', forecastValues: Array(horizon).fill(0), confidenceBase: 0.1, residualCV: 0.5 }
  }

  // Initialise
  let level = amounts[0]
  let trend = amounts.length > 1 ? amounts[1] - amounts[0] : 0

  const fitted: number[] = [level]

  for (let i = 1; i < amounts.length; i++) {
    const prevLevel = level
    level = alpha * amounts[i] + (1 - alpha) * (prevLevel + (beta > 0 ? trend : 0))
    if (beta > 0) {
      trend = beta * (level - prevLevel) + (1 - beta) * trend
    }
    fitted.push(level + (beta > 0 ? trend : 0))
  }

  // Generate forecast
  const forecastValues: number[] = []
  for (let i = 1; i <= horizon; i++) {
    const predicted = level + (beta > 0 ? trend * i : 0)
    forecastValues.push(Math.max(0, predicted))
  }

  // Confidence & residual CV
  const relErrors = amounts.map((y, i) => fitted[i] > 0 ? (y - fitted[i]) / fitted[i] : 0)
  const residualCV = standardDeviation(relErrors)
  const confidenceBase = Math.min(0.75, 0.35 + (1 - residualCV) * 0.4)

  return { method: 'exponential-smoothing', forecastValues, confidenceBase, residualCV }
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
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

/** Return available algorithm descriptors (for metadata endpoint) */
export function getAlgorithmDescriptors(): AlgorithmDescriptor[] {
  return ALGORITHM_DESCRIPTORS
}

/** Return available forecast presets (for metadata endpoint) */
export function getForecastPresets(): Record<ForecastPreset, { label: string; description: string; algorithm: ForecastAlgorithm; algorithmConfig: AlgorithmConfigMap }> {
  return FORECAST_PRESETS
}
