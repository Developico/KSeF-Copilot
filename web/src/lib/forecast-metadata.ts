/**
 * Fallback metadata for forecast algorithms and anomaly rules.
 *
 * Mirrors the backend definitions in api/src/lib/forecast/engine.ts
 * and api/src/lib/forecast/anomalies.ts. Used as fallback / placeholder
 * when the metadata API endpoints are unavailable.
 */

import type {
  ForecastAlgorithmsResponse,
  AnomalyRulesResponse,
} from './api'

// ─── Forecast Algorithms ────────────────────────────────────────

export const FALLBACK_FORECAST_META: ForecastAlgorithmsResponse = {
  algorithms: [
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
      description: "Simple or Holt's double exponential smoothing. Responsive to recent changes.",
      minDataPoints: 2,
      parameters: [
        { key: 'alpha', label: 'Alpha (level)', description: 'Level smoothing factor — higher = more reactive to recent data', type: 'number', min: 0.1, max: 0.9, step: 0.05, default: 0.3 },
        { key: 'beta', label: 'Beta (trend)', description: 'Trend smoothing factor — 0 disables trend component (simple ES)', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0 },
      ],
    },
  ],
  presets: {
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
  },
}

// ─── Anomaly Rules ──────────────────────────────────────────────

export const FALLBACK_ANOMALY_META: AnomalyRulesResponse = {
  rules: [
    {
      id: 'amount-spike',
      name: 'Amount Spike',
      description: 'Detects invoices with amounts significantly higher than the supplier average (Z-score).',
      parameters: [
        { key: 'zScoreThreshold', label: 'Z-Score Threshold', description: 'Standard deviations above supplier mean', type: 'number', min: 1.0, max: 5.0, step: 0.1, default: 2.0 },
      ],
    },
    {
      id: 'new-supplier',
      name: 'New Supplier',
      description: 'Flags first-time invoices from previously unknown suppliers above a certain amount.',
      parameters: [
        { key: 'amountThreshold', label: 'Amount Threshold (PLN)', description: 'Minimum gross amount to trigger alert', type: 'number', min: 1000, max: 100000, step: 1000, default: 10000 },
      ],
    },
    {
      id: 'duplicate-suspect',
      name: 'Duplicate Suspect',
      description: 'Identifies potential duplicate invoices — same supplier, similar amount, close dates.',
      parameters: [
        { key: 'amountTolerancePct', label: 'Amount Tolerance (%)', description: 'Maximum amount difference percentage', type: 'number', min: 1, max: 20, step: 1, default: 5 },
        { key: 'dayWindow', label: 'Day Window', description: 'Maximum days between suspected duplicates', type: 'number', min: 1, max: 14, step: 1, default: 3 },
      ],
    },
    {
      id: 'category-shift',
      name: 'Category Shift',
      description: 'Flags spending categories where recent total is significantly above the monthly average.',
      parameters: [
        { key: 'shiftThresholdPct', label: 'Shift Threshold (%)', description: 'Minimum percentage above average to flag', type: 'number', min: 10, max: 200, step: 5, default: 50 },
      ],
    },
    {
      id: 'frequency-change',
      name: 'Frequency Change',
      description: 'Detects suppliers sending invoices much more frequently than their historical average.',
      parameters: [
        { key: 'frequencyMultiplier', label: 'Frequency Multiplier', description: 'Multiplier of expected invoice frequency to trigger', type: 'number', min: 1.5, max: 5, step: 0.5, default: 2 },
      ],
    },
  ],
  presets: {
    default: {
      label: 'Default',
      description: 'Balanced detection with standard thresholds',
      enabledRules: ['amount-spike', 'new-supplier', 'duplicate-suspect', 'category-shift', 'frequency-change'],
      ruleConfig: {},
    },
    conservative: {
      label: 'Conservative',
      description: 'Higher thresholds — only flags clear anomalies, fewer false positives',
      enabledRules: ['amount-spike', 'new-supplier', 'duplicate-suspect'],
      ruleConfig: {
        'amount-spike': { zScoreThreshold: 3.0 },
        'new-supplier': { amountThreshold: 25000 },
        'duplicate-suspect': { amountTolerancePct: 3, dayWindow: 2 },
      },
    },
    aggressive: {
      label: 'Aggressive',
      description: 'Lower thresholds — catches more anomalies, may include more false positives',
      enabledRules: ['amount-spike', 'new-supplier', 'duplicate-suspect', 'category-shift', 'frequency-change'],
      ruleConfig: {
        'amount-spike': { zScoreThreshold: 1.5 },
        'new-supplier': { amountThreshold: 5000 },
        'duplicate-suspect': { amountTolerancePct: 10, dayWindow: 5 },
        'category-shift': { shiftThresholdPct: 30 },
        'frequency-change': { frequencyMultiplier: 1.5 },
      },
    },
  },
}
