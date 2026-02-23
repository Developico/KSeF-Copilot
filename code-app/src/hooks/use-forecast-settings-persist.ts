/**
 * useForecastSettingsPersist — persists ForecastSettings + AnomalySettings to localStorage.
 *
 * Handles serialization of Set<AnomalyType> and provides stable
 * defaults on first load.
 */

import { useLocalStorage } from './use-local-storage'
import {
  DEFAULT_FORECAST_SETTINGS,
  type ForecastSettingsState,
} from '@/components/forecast/forecast-settings'
import {
  DEFAULT_ANOMALY_SETTINGS,
  type AnomalySettingsState,
} from '@/components/forecast/anomaly-settings'
import type { AnomalyType } from '@/lib/types'

const FORECAST_STORAGE_KEY = 'ksef:forecast-settings'
const ANOMALY_STORAGE_KEY = 'ksef:anomaly-settings'

// ─── Anomaly state serialization (Set ↔ Array) ──────────────────

interface AnomalySettingsSerialized {
  enabledRules: AnomalyType[]
  ruleConfig: AnomalySettingsState['ruleConfig']
  preset: AnomalySettingsState['preset']
}

function serializeAnomalySettings(state: AnomalySettingsState): string {
  const serialized: AnomalySettingsSerialized = {
    enabledRules: Array.from(state.enabledRules),
    ruleConfig: state.ruleConfig,
    preset: state.preset,
  }
  return JSON.stringify(serialized)
}

function deserializeAnomalySettings(raw: string): AnomalySettingsState {
  const parsed: AnomalySettingsSerialized = JSON.parse(raw)
  return {
    enabledRules: new Set(parsed.enabledRules),
    ruleConfig: parsed.ruleConfig,
    preset: parsed.preset,
  }
}

// ─── Hooks ──────────────────────────────────────────────────────

export function useForecastSettingsPersist() {
  return useLocalStorage<ForecastSettingsState>(
    FORECAST_STORAGE_KEY,
    DEFAULT_FORECAST_SETTINGS,
  )
}

export function useAnomalySettingsPersist() {
  return useLocalStorage<AnomalySettingsState>(
    ANOMALY_STORAGE_KEY,
    DEFAULT_ANOMALY_SETTINGS,
    {
      serialize: serializeAnomalySettings,
      deserialize: deserializeAnomalySettings,
    },
  )
}
