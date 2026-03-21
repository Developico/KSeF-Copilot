'use client'

/**
 * ForecastComparison — A/B comparison view showing two forecast algorithm results side-by-side.
 *
 * Users can select two different algorithm configurations and compare their
 * predictions, confidence levels, and trends in a split view with overlaid charts.
 */

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompareArrows,
  Loader2,
} from 'lucide-react'
import { useContextForecastMonthly, useForecastAlgorithms } from '@/hooks/use-api'
import type { ForecastAlgorithm, ForecastHorizon, ForecastResult } from '@/lib/api'
import { formatCurrencyCompact as formatCurrencyShort } from '@/lib/format'

// ─── Helpers ────────────────────────────────────────────────────

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

// ─── Types ──────────────────────────────────────────────────────

interface ForecastComparisonProps {
  horizon: ForecastHorizon
}

// ─── Comparison Card ────────────────────────────────────────────

function ComparisonCard({
  label,
  color,
  data,
}: {
  label: string
  color: string
  data: ForecastResult | undefined
}) {
  const t = useTranslations('forecastComparison')
  if (!data) return null

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="outline" className="text-xs ml-auto">{data.method}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">{t('nextMonth')}</p>
            <p className="text-sm font-semibold">{formatCurrencyShort(data.summary.nextMonth)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('trend')}</p>
            <div className="flex items-center justify-center gap-1">
              <TrendIcon trend={data.trend} />
              <span className="text-sm">{data.trendPercent > 0 ? '+' : ''}{data.trendPercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('confidence')}</p>
            <p className="text-sm font-semibold">{Math.round(data.confidence * 100)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ──────────────────────────────────────────────────

export function ForecastComparison({ horizon }: ForecastComparisonProps) {
  const t = useTranslations('forecastComparison')
  const tAlgo = useTranslations('forecastSettings')
  const { data: meta } = useForecastAlgorithms()

  const algorithms = meta?.algorithms ?? []
  const algorithmOptions = algorithms.filter((a) => a.id !== 'auto')

  const [algoA, setAlgoA] = useState<ForecastAlgorithm>('moving-average')
  const [algoB, setAlgoB] = useState<ForecastAlgorithm>('linear-regression')

  const paramsA = useMemo(
    () => ({ horizon, algorithm: algoA }),
    [horizon, algoA],
  )
  const paramsB = useMemo(
    () => ({ horizon, algorithm: algoB }),
    [horizon, algoB],
  )

  const { data: forecastA, isLoading: loadingA } = useContextForecastMonthly(paramsA)
  const { data: forecastB, isLoading: loadingB } = useContextForecastMonthly(paramsB)

  // Merge both forecasts into a single series for the overlay chart
  const chartData = useMemo(() => {
    if (!forecastA || !forecastB) return []

    const histPoints = forecastA.historical.map((m) => ({
      month: formatMonth(m.month),
      actual: m.grossAmount,
      predictedA: null as number | null,
      predictedB: null as number | null,
    }))

    const maxLen = Math.max(forecastA.forecast.length, forecastB.forecast.length)
    const fcPoints = Array.from({ length: maxLen }, (_, i) => ({
      month: formatMonth(
        forecastA.forecast[i]?.month ?? forecastB.forecast[i]?.month ?? '',
      ),
      actual: null as number | null,
      predictedA: forecastA.forecast[i]?.predicted ?? null,
      predictedB: forecastB.forecast[i]?.predicted ?? null,
    }))

    // Overlap last historical + first forecast
    if (histPoints.length > 0 && fcPoints.length > 0) {
      fcPoints[0] = {
        ...fcPoints[0],
        actual: histPoints[histPoints.length - 1].actual,
      }
    }

    return [...histPoints, ...fcPoints]
  }, [forecastA, forecastB])

  const loading = loadingA || loadingB

  return (
    <div className="space-y-4">
      {/* Algorithm selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitCompareArrows className="h-4 w-4" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-blue-600">
                {t('algorithmA')}
              </label>
              <Select
                value={algoA}
                onValueChange={(v) => setAlgoA(v as ForecastAlgorithm)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithmOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {tAlgo(`algo.${a.id}.name`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-emerald-600">
                {t('algorithmB')}
              </label>
              <Select
                value={algoB}
                onValueChange={(v) => setAlgoB(v as ForecastAlgorithm)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithmOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {tAlgo(`algo.${a.id}.name`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Overlay chart */}
      {!loading && chartData.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <ReTooltip
                    formatter={((value: number | undefined, name: string | undefined) => [
                      formatCurrencyShort(value ?? 0),
                      name ?? '',
                    ]) as never}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#6b7280"
                    fill="#6b7280"
                    fillOpacity={0.1}
                    name={t('historical')}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedA"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                    name={`${t('algorithmA')}: ${tAlgo(`algo.${algoA}.name`)}`}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedB"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                    name={`${t('algorithmB')}: ${tAlgo(`algo.${algoB}.name`)}`}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side KPI comparison */}
      {!loading && forecastA && forecastB && (
        <div className="grid grid-cols-2 gap-4">
          <ComparisonCard
            label={`${t('algorithmA')}: ${tAlgo(`algo.${algoA}.name`)}`}
            color="#3b82f6"
            data={forecastA}
          />
          <ComparisonCard
            label={`${t('algorithmB')}: ${tAlgo(`algo.${algoB}.name`)}`}
            color="#10b981"
            data={forecastB}
          />
        </div>
      )}
    </div>
  )
}
