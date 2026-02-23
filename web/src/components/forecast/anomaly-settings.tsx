'use client'

/**
 * AnomalySettings — side panel for configuring anomaly detection rules & parameters.
 *
 * Features:
 * - Preset selector (default / conservative / aggressive)
 * - Per-rule toggle (enable/disable)
 * - Dynamic parameter sliders per rule driven by metadata from GET /api/anomalies/rules
 * - Reset to defaults
 */

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { RotateCcw, ShieldAlert } from 'lucide-react'
import { useAnomalyRules } from '@/hooks/use-api'
import type { AnomalyType, AnomalyRuleConfig, AnomalyPreset } from '@/lib/api'

// ─── Types ──────────────────────────────────────────────────────

export interface AnomalySettingsState {
  enabledRules: Set<AnomalyType>
  ruleConfig: AnomalyRuleConfig
  preset: AnomalyPreset | 'custom'
}

export const DEFAULT_ANOMALY_SETTINGS: AnomalySettingsState = {
  enabledRules: new Set<AnomalyType>([
    'amount-spike',
    'new-supplier',
    'duplicate-suspect',
    'category-shift',
    'frequency-change',
  ]),
  ruleConfig: {},
  preset: 'default',
}

interface AnomalySettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: AnomalySettingsState
  onChange: (value: AnomalySettingsState) => void
}

// ─── Component ──────────────────────────────────────────────────

export function AnomalySettings({
  open,
  onOpenChange,
  value,
  onChange,
}: AnomalySettingsProps) {
  const t = useTranslations('anomalySettings')
  const { data: meta } = useAnomalyRules()

  const rules = meta?.rules ?? []
  const presets = meta?.presets

  // Apply a preset
  const applyPreset = useCallback(
    (presetId: AnomalyPreset) => {
      if (!presets) return
      const p = presets[presetId]
      onChange({
        enabledRules: new Set(p.enabledRules),
        ruleConfig: structuredClone(p.ruleConfig),
        preset: presetId,
      })
    },
    [presets, onChange],
  )

  // Toggle a rule on/off
  const handleToggleRule = useCallback(
    (ruleId: AnomalyType, checked: boolean) => {
      const next = new Set(value.enabledRules)
      if (checked) {
        next.add(ruleId)
      } else {
        next.delete(ruleId)
      }
      onChange({ ...value, enabledRules: next, preset: 'custom' })
    },
    [value, onChange],
  )

  // Update a single parameter value for a specific rule
  const handleParamChange = useCallback(
    (ruleId: AnomalyType, key: string, numValue: number) => {
      const existing = (value.ruleConfig[ruleId] ?? {}) as Record<string, number>
      onChange({
        ...value,
        ruleConfig: {
          ...value.ruleConfig,
          [ruleId]: { ...existing, [key]: numValue },
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

  // Get current param value for a rule
  const getParamValue = (ruleId: AnomalyType, key: string, defaultVal: number): number => {
    const cfg = value.ruleConfig[ruleId] as Record<string, number> | undefined
    return cfg?.[key] ?? defaultVal
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>
            {t('description')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-6 pb-4">
            {/* ── Presets ──────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('preset')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {presets &&
                  (Object.keys(presets) as AnomalyPreset[]).map((pid) => (
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

            {/* ── Rules ───────────────────────────────────── */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {t('rules')}
              </Label>

              {rules.map((rule) => {
                const enabled = value.enabledRules.has(rule.id)
                return (
                  <Card
                    key={rule.id}
                    className={enabled ? '' : 'opacity-60'}
                  >
                    <CardContent className="pt-4 space-y-3">
                      {/* Rule toggle */}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`rule-${rule.id}`}
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            handleToggleRule(rule.id, checked === true)
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`rule-${rule.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {t(`rule.${rule.id}.name`)}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t(`rule.${rule.id}.description`)}
                          </p>
                        </div>
                      </div>

                      {/* Parameters (only when enabled) */}
                      {enabled && rule.parameters.length > 0 && (
                        <div className="pl-7 space-y-3">
                          {rule.parameters.map((param) => {
                            const currentValue = getParamValue(
                              rule.id,
                              param.key,
                              param.default,
                            )
                            return (
                              <div key={param.key} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">{t(`rule.${rule.id}.params.${param.key}.label`)}</Label>
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {currentValue}
                                  </Badge>
                                </div>
                                <Slider
                                  value={[currentValue]}
                                  onValueChange={([v]) =>
                                    handleParamChange(rule.id, param.key, v)
                                  }
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                  {t(`rule.${rule.id}.params.${param.key}.description`)}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-4 pb-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {t('enabledCount', {
                count: value.enabledRules.size,
                total: rules.length,
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('reset')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
