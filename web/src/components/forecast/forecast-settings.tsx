'use client'

/**
 * ForecastSettings — side panel for configuring forecast algorithm & parameters.
 *
 * Features:
 * - Preset selector (default / conservative / aggressive)
 * - Algorithm dropdown (auto / moving-average / linear-regression / seasonal / exp-smoothing)
 * - Dynamic parameter sliders driven by metadata from GET /api/forecast/algorithms
 * - Reset to defaults
 */

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
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
} from '@/lib/api'

// ─── Types ──────────────────────────────────────────────────────

export interface ForecastSettingsState {
  algorithm: ForecastAlgorithm
  algorithmConfig: AlgorithmConfigMap
  preset: ForecastPreset | 'custom'
}

export const DEFAULT_FORECAST_SETTINGS: ForecastSettingsState = {
  algorithm: 'auto',
  algorithmConfig: {},
  preset: 'default',
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
  const t = useTranslations('forecastSettings')
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
            {t('title')}
          </SheetTitle>
          <SheetDescription>
            {t('description')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-4">
            {/* ── Presets ──────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('preset')}
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
                      {t(`presets.${pid}`)}
                    </Button>
                  ))}
                {value.preset === 'custom' && (
                  <Badge variant="secondary">
                    {t('presets.custom')}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Algorithm selector ──────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('algorithm')}
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
                        <span>{t(`algo.${a.id}.name`)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentAlgo && (
                <p className="text-xs text-muted-foreground">
                  {value.algorithm === 'auto' ? t('autoDescription') : t(`algo.${currentAlgo.id}.description`)}
                </p>
              )}
            </div>

            {/* ── Parameters ──────────────────────────────── */}
            {currentAlgo && currentAlgo.parameters.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    {t('parameters')}
                  </Label>
                  {currentAlgo.parameters.map((param) => {
                    const currentValue = getParamValue(param.key, param.default)
                    return (
                      <div key={param.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t(`algo.${currentAlgo.id}.params.${param.key}.label`)}</Label>
                          <Badge variant="outline" className="text-xs font-mono">
                            {currentValue}
                          </Badge>
                        </div>
                        <Slider
                          value={[currentValue]}
                          onValueChange={([v]) => handleParamChange(param.key, v)}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t(`algo.${currentAlgo.id}.params.${param.key}.description`)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-4 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('reset')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
