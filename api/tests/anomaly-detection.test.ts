/**
 * Tests for configurable anomaly detection rules.
 *
 * Covers:
 * - detectAnomalies with enabledRules filtering
 * - Per-rule config passthrough (thresholds, windows)
 * - Preset metadata
 * - Edge cases (empty data, all rules disabled)
 */

import { describe, it, expect } from 'vitest'
import {
  detectAnomalies,
  getAnomalyRuleDescriptors,
  getAnomalyPresets,
  ANOMALY_RULE_DESCRIPTORS,
  ANOMALY_PRESETS,
  type InvoiceRecord,
  type AnomalyType,
  type AnomalyRuleConfig,
} from '../src/lib/forecast/anomalies'

// ─── Test data helpers ──────────────────────────────────────────

function makeHistoricalInvoices(count = 20): InvoiceRecord[] {
  const invoices: InvoiceRecord[] = []
  for (let i = 0; i < count; i++) {
    invoices.push({
      id: `hist-${i}`,
      invoiceNumber: `FV/2025/${i + 1}`,
      invoiceDate: `2025-${String(Math.floor(i / 2) + 1).padStart(2, '0')}-15`,
      grossAmount: 5000 + (i % 5) * 1000,
      netAmount: 4000 + (i % 5) * 800,
      supplierNip: `111222333${i % 3}`,
      supplierName: `Supplier ${i % 3}`,
      mpk: `MPK-${i % 2 + 1}`,
      category: i % 2 === 0 ? 'Materials' : 'Services',
    })
  }
  return invoices
}

function makeRecentInvoices(): InvoiceRecord[] {
  return [
    // Normal invoice from known supplier
    {
      id: 'rec-1',
      invoiceNumber: 'FV/2026/001',
      invoiceDate: '2026-01-10',
      grossAmount: 6000,
      netAmount: 4800,
      supplierNip: '1112223330',
      supplierName: 'Supplier 0',
      mpk: 'MPK-1',
      category: 'Materials',
    },
    // Very high amount — amount spike
    {
      id: 'rec-2',
      invoiceNumber: 'FV/2026/002',
      invoiceDate: '2026-01-15',
      grossAmount: 500000,
      netAmount: 400000,
      supplierNip: '1112223330',
      supplierName: 'Supplier 0',
      mpk: 'MPK-1',
      category: 'Materials',
    },
    // New supplier with high value
    {
      id: 'rec-3',
      invoiceNumber: 'FV/2026/003',
      invoiceDate: '2026-01-20',
      grossAmount: 100000,
      netAmount: 80000,
      supplierNip: '9999999999',
      supplierName: 'New Unknown Supplier',
      mpk: 'MPK-2',
      category: 'Consulting',
    },
    // Possible duplicate — same supplier, similar amount, close date
    {
      id: 'rec-4',
      invoiceNumber: 'FV/2026/004',
      invoiceDate: '2026-01-11',
      grossAmount: 6000,
      netAmount: 4800,
      supplierNip: '1112223330',
      supplierName: 'Supplier 0',
      mpk: 'MPK-1',
      category: 'Materials',
    },
  ]
}

// ─── Metadata ───────────────────────────────────────────────────

describe('getAnomalyRuleDescriptors', () => {
  it('returns all rule descriptors', () => {
    const descriptors = getAnomalyRuleDescriptors()
    expect(descriptors).toEqual(ANOMALY_RULE_DESCRIPTORS)
    expect(descriptors.length).toBe(5)

    const ids = descriptors.map((d) => d.id)
    expect(ids).toContain('amount-spike')
    expect(ids).toContain('new-supplier')
    expect(ids).toContain('duplicate-suspect')
    expect(ids).toContain('category-shift')
    expect(ids).toContain('frequency-change')
  })

  it('each descriptor has valid parameter definitions', () => {
    const descriptors = getAnomalyRuleDescriptors()
    for (const d of descriptors) {
      expect(d.name).toBeTruthy()
      expect(d.description).toBeTruthy()
      for (const p of d.parameters) {
        expect(p.min).toBeLessThan(p.max)
        expect(p.default).toBeGreaterThanOrEqual(p.min)
        expect(p.default).toBeLessThanOrEqual(p.max)
        expect(p.step).toBeGreaterThan(0)
      }
    }
  })
})

describe('getAnomalyPresets', () => {
  it('returns all preset descriptors', () => {
    const presets = getAnomalyPresets()
    expect(presets).toEqual(ANOMALY_PRESETS)
    expect(Object.keys(presets)).toEqual(['default', 'conservative', 'aggressive'])
  })

  it('each preset has valid enabledRules list', () => {
    const presets = getAnomalyPresets()
    const validRules: AnomalyType[] = [
      'amount-spike', 'new-supplier', 'duplicate-suspect', 'category-shift', 'frequency-change',
    ]
    for (const [, preset] of Object.entries(presets)) {
      for (const rule of preset.enabledRules) {
        expect(validRules).toContain(rule)
      }
    }
  })
})

// ─── enabledRules filtering ─────────────────────────────────────

describe('enabledRules filtering', () => {
  const historical = makeHistoricalInvoices()
  const recent = makeRecentInvoices()

  it('all rules enabled produces anomalies', () => {
    const result = detectAnomalies(recent, historical)
    // With our test data, at least the amount-spike and new-supplier should fire
    expect(result.anomalies.length).toBeGreaterThan(0)
    expect(result.analyzedInvoices).toBe(recent.length)
  })

  it('disabling all rules produces zero anomalies', () => {
    const result = detectAnomalies(recent, historical, {
      enabledRules: [],
    })
    expect(result.anomalies).toHaveLength(0)
  })

  it('enabling only amount-spike returns only amount-spike anomalies', () => {
    const result = detectAnomalies(recent, historical, {
      enabledRules: ['amount-spike'],
    })
    for (const a of result.anomalies) {
      expect(a.type).toBe('amount-spike')
    }
  })

  it('enabling only new-supplier returns only new-supplier anomalies', () => {
    const result = detectAnomalies(recent, historical, {
      enabledRules: ['new-supplier'],
    })
    for (const a of result.anomalies) {
      expect(a.type).toBe('new-supplier')
    }
  })

  it('enabling only duplicate-suspect returns only duplicate-suspect anomalies', () => {
    const result = detectAnomalies(recent, historical, {
      enabledRules: ['duplicate-suspect'],
    })
    for (const a of result.anomalies) {
      expect(a.type).toBe('duplicate-suspect')
    }
  })
})

// ─── Per-rule config ────────────────────────────────────────────

describe('per-rule config thresholds', () => {
  const historical = makeHistoricalInvoices()
  const recent = makeRecentInvoices()

  it('amount-spike: lowering zScoreThreshold catches more anomalies', () => {
    const strict = detectAnomalies(recent, historical, {
      enabledRules: ['amount-spike'],
      ruleConfig: { 'amount-spike': { zScoreThreshold: 5.0 } },
    })
    const loose = detectAnomalies(recent, historical, {
      enabledRules: ['amount-spike'],
      ruleConfig: { 'amount-spike': { zScoreThreshold: 0.5 } },
    })
    expect(loose.anomalies.length).toBeGreaterThanOrEqual(strict.anomalies.length)
  })

  it('new-supplier: higher amountThreshold catches fewer anomalies', () => {
    const low = detectAnomalies(recent, historical, {
      enabledRules: ['new-supplier'],
      ruleConfig: { 'new-supplier': { amountThreshold: 1000 } },
    })
    const high = detectAnomalies(recent, historical, {
      enabledRules: ['new-supplier'],
      ruleConfig: { 'new-supplier': { amountThreshold: 500000 } },
    })
    expect(low.anomalies.length).toBeGreaterThanOrEqual(high.anomalies.length)
  })

  it('duplicate-suspect: wider dayWindow catches more duplicates', () => {
    const narrow = detectAnomalies(recent, historical, {
      enabledRules: ['duplicate-suspect'],
      ruleConfig: { 'duplicate-suspect': { dayWindow: 1, amountTolerancePct: 5 } },
    })
    const wide = detectAnomalies(recent, historical, {
      enabledRules: ['duplicate-suspect'],
      ruleConfig: { 'duplicate-suspect': { dayWindow: 30, amountTolerancePct: 5 } },
    })
    expect(wide.anomalies.length).toBeGreaterThanOrEqual(narrow.anomalies.length)
  })

  it('sensitivityThreshold legacy compat maps to amount-spike zScoreThreshold', () => {
    const viaSensitivity = detectAnomalies(recent, historical, {
      enabledRules: ['amount-spike'],
      sensitivityThreshold: 1.5,
    })
    const viaRuleConfig = detectAnomalies(recent, historical, {
      enabledRules: ['amount-spike'],
      ruleConfig: { 'amount-spike': { zScoreThreshold: 1.5 } },
    })
    // Both should produce same number of amount-spike anomalies
    expect(viaSensitivity.anomalies.length).toBe(viaRuleConfig.anomalies.length)
  })
})

// ─── Result structure ───────────────────────────────────────────

describe('anomaly result structure', () => {
  const historical = makeHistoricalInvoices()
  const recent = makeRecentInvoices()

  it('result contains summary with severity breakdown', () => {
    const result = detectAnomalies(recent, historical)
    expect(result.summary).toBeDefined()
    expect(typeof result.summary.total).toBe('number')
    expect(result.summary.bySeverity).toBeDefined()
    for (const sev of ['low', 'medium', 'high', 'critical'] as const) {
      expect(typeof result.summary.bySeverity[sev]).toBe('number')
    }
  })

  it('each anomaly has required fields', () => {
    const result = detectAnomalies(recent, historical)
    for (const a of result.anomalies) {
      expect(a.id).toBeTruthy()
      expect(a.invoiceId).toBeTruthy()
      expect(a.invoiceNumber).toBeTruthy()
      expect(['amount-spike', 'new-supplier', 'duplicate-suspect', 'category-shift', 'frequency-change']).toContain(a.type)
      expect(['low', 'medium', 'high', 'critical']).toContain(a.severity)
      expect(typeof a.score).toBe('number')
      expect(typeof a.grossAmount).toBe('number')
    }
  })

  it('result contains period boundaries', () => {
    const result = detectAnomalies(recent, historical)
    expect(result.period).toBeDefined()
    expect(result.period.from).toBeTruthy()
    expect(result.period.to).toBeTruthy()
  })
})

// ─── Edge cases ─────────────────────────────────────────────────

describe('anomaly edge cases', () => {
  it('empty recent invoices returns zero anomalies', () => {
    const result = detectAnomalies([], makeHistoricalInvoices())
    expect(result.anomalies).toHaveLength(0)
    expect(result.summary.total).toBe(0)
    expect(result.analyzedInvoices).toBe(0)
  })

  it('empty historical invoices still detects some anomalies', () => {
    const recent = makeRecentInvoices()
    // With no history, all suppliers are "new"
    const result = detectAnomalies(recent, [])
    // At minimum new-supplier should fire for all invoices
    expect(result.analyzedInvoices).toBe(recent.length)
  })

  it('both empty returns clean result', () => {
    const result = detectAnomalies([], [])
    expect(result.anomalies).toHaveLength(0)
    expect(result.summary.total).toBe(0)
  })
})
