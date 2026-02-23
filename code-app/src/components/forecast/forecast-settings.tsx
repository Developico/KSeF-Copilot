/**
 * ForecastSettings — side panel for configuring forecast algorithm & parameters.
 *
 * Features:
 * - Preset selector (default / conservative / aggressive)
 * - Algorithm dropdown (auto / moving-average / linear-regression / seasonal / exp-smoothing)
 * - Dynamic parameter sliders driven by metadata from GET /api/forecast/algorithms
 * - Reset to defaults
 */

import { useCallback, useEffect, useMemo } from 'react'
import { useIntl } from 'react-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RotateCcw, Sparkles } from 'lucide-react'
import { useForecastAlgorithms } from '@/hooks/use-api'
import type {
  ForecastAlgorithm,
  AlgorithmConfigMap,
  ForecastPreset,
} from '@/lib/types'

// ─── Types ──────────────────────────────────────────────────────

export interface ForecastSettingsState {
  algorithm: ForecastAlgorithm
  algorithmConfig: AlgorithmConfigMap
  preset: ForecastPreset | 'custom'
}

interface ForecastSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ForecastSettingsState
  onChange: (value: ForecastSettingsState) => void
}

// ─── Component ──────────────────────────────────────────────────

export function ForecastSettings({
  open,
  onOpenChange,
  value,
  onChange,
}: ForecastSettingsProps) {
  const intl = useIntl()
  const { data: meta } = useForecastAlgorithms()

  const algorithms = meta?.algorithms ?? []
  const presets = meta?.presets

  // Current algorithm descriptor
  const currentAlgo = useMemo(
    () => algorithms.find((a) => a.id === value.algorithm),
    [algorithms, value.algorithm],
  )

  // Apply a preset
  const applyPreset = useCallback(
    (presetId: ForecastPreset) => {
      if (!presets) return
      const p = presets[presetId]
      onChange({
        algorithm: p.algorithm,
        algorithmConfig: p.algorithmConfig,
        preset: presetId,
      })
    },
    [presets, onChange],
  )

  // When algorithm changes, reset its config to defaults
  const handleAlgorithmChange = useCallback(
    (algo: ForecastAlgorithm) => {
      const descriptor = algorithms.find((a) => a.id === algo)
      const defaults: Record<string, number> = {}
      descriptor?.parameters.forEach((p) => {
        defaults[p.key] = p.default
      })
      onChange({
        ...value,
        algorithm: algo,
        algorithmConfig: algo === 'auto' ? {} : { [algo]: defaults } as AlgorithmConfigMap,
        preset: 'custom',
      })
    },
    [algorithms, value, onChange],
  )

  // Update a single parameter value
  const handleParamChange = useCallback(
    (key: string, numValue: number) => {
      const algo = value.algorithm
      if (algo === 'auto') return
      const existing = (value.algorithmConfig[algo] ?? {}) as Record<string, number>
      onChange({
        ...value,
        algorithmConfig: {
          ...value.algorithmConfig,
          [algo]: { ...existing, [key]: numValue },
        },
        preset: 'custom',
      })
    },
    [value, onChange],
  )

  // Reset to default preset
  const handleReset = useCallback(() => {
    applyPreset('default')
  }, [applyPreset])

  // Get current param value
  const getParamValue = (key: string, defaultVal: number): number => {
    const algo = value.algorithm
    if (algo === 'auto') return defaultVal
    const cfg = value.algorithmConfig[algo] as Record<string, number> | undefined
    return cfg?.[key] ?? defaultVal
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {intl.formatMessage({ id: 'forecastSettings.title' })}
          </SheetTitle>
          <SheetDescription>
            {intl.formatMessage({ id: 'forecastSettings.description' })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-4">
            {/* ── Presets ──────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {intl.formatMessage({ id: 'forecastSettings.preset' })}
              </Label>
              <div className="flex flex-wrap gap-2">
                {presets &&
                  (Object.keys(presets) as ForecastPreset[]).map((pid) => (
                    <Button
                      key={pid}
                      variant={value.preset === pid ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset(pid)}
                    >
                      {intl.formatMessage({ id: `forecastSettings.preset.${pid}` })}
                    </Button>
                  ))}
                {value.preset === 'custom' && (
                  <Badge variant="secondary">
                    {intl.formatMessage({ id: 'forecastSettings.preset.custom' })}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Algorithm selector ──────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {intl.formatMessage({ id: 'forecastSettings.algorithm' })}
              </Label>
              <Select
                value={value.algorithm}
                onValueChange={(v) => handleAlgorithmChange(v as ForecastAlgorithm)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex flex-col">
                        <span>{intl.formatMessage({ id: `forecastSettings.algo.${a.id}.name` })}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentAlgo && (
                <p className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: `forecastSettings.algo.${currentAlgo.id}.description` })}
                </p>
              )}
            </div>

            <Separator />

            {/* ── Dynamic parameters ─────────────────────── */}
            {currentAlgo && currentAlgo.parameters.length > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  {intl.formatMessage({ id: 'forecastSettings.parameters' })}
                </Label>
                {currentAlgo.parameters.map((param) => {
                  const currentValue = getParamValue(param.key, param.default)
                  return (
                    <div key={param.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{intl.formatMessage({ id: `forecastSettings.algo.${currentAlgo.id}.params.${param.key}.label` })}</Label>
                        <span className="text-xs font-mono text-muted-foreground">
                          {currentValue}
                        </span>
                      </div>
                      <Slider
                        value={[currentValue]}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        onValueChange={([v]) => handleParamChange(param.key, v)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: `forecastSettings.algo.${currentAlgo.id}.params.${param.key}.description` })}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {value.algorithm === 'auto' && (
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'forecastSettings.autoDescription' })}
              </p>
            )}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'forecastSettings.reset' })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export const DEFAULT_FORECAST_SETTINGS: ForecastSettingsState = {
  algorithm: 'auto',
  algorithmConfig: {},
  preset: 'default',
}
