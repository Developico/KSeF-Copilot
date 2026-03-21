/**
 * ForecastComparison — A/B comparison view showing two forecast algorithm results side-by-side.
 *
 * Users can select two different algorithm configurations and compare their
 * predictions, confidence levels, and trends in a split view with overlaid charts.
 */

import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
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
} from 'lucide-react'
import { useForecastMonthly, useForecastAlgorithms } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrencyCompact } from '@/lib/format'
import type { ForecastAlgorithm, ForecastHorizon, ForecastResult } from '@/lib/types'

// ─── Helpers ────────────────────────────────────────────────────

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`
}

function formatCurrencyShort(amount: number): string {
  return formatCurrencyCompact(amount)
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

// ─── Component ──────────────────────────────────────────────────

export function ForecastComparison({ horizon }: ForecastComparisonProps) {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  const { data: meta } = useForecastAlgorithms()

  const algorithms = meta?.algorithms ?? []
  const algorithmOptions = algorithms.filter((a) => a.id !== 'auto')

  const [algoA, setAlgoA] = useState<ForecastAlgorithm>('moving-average')
  const [algoB, setAlgoB] = useState<ForecastAlgorithm>('linear-regression')

  const enabled = !companyLoading && Boolean(selectedCompany?.id)

  const paramsA = useMemo(
    () => ({ horizon, settingId: selectedCompany?.id, algorithm: algoA }),
    [horizon, selectedCompany?.id, algoA],
  )
  const paramsB = useMemo(
    () => ({ horizon, settingId: selectedCompany?.id, algorithm: algoB }),
    [horizon, selectedCompany?.id, algoB],
  )

  const { data: forecastA, isLoading: loadingA } = useForecastMonthly(paramsA, { enabled })
  const { data: forecastB, isLoading: loadingB } = useForecastMonthly(paramsB, { enabled })

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
            {intl.formatMessage({ id: 'forecastComparison.title' })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: 'forecastComparison.description' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-blue-600">
                {intl.formatMessage({ id: 'forecastComparison.algorithmA' })}
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
                      {intl.formatMessage({ id: `forecastSettings.algo.${a.id}.name` })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-emerald-600">
                {intl.formatMessage({ id: 'forecastComparison.algorithmB' })}
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
                      {intl.formatMessage({ id: `forecastSettings.algo.${a.id}.name` })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overlay chart */}
      {!loading && chartData.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
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
                    name={intl.formatMessage({ id: 'forecastComparison.historical' })}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedA"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                    name={intl.formatMessage({ id: `forecastSettings.algo.${algoA}.name` })}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedB"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                    name={intl.formatMessage({ id: `forecastSettings.algo.${algoB}.name` })}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side KPI comparison */}
      {forecastA && forecastB && (
        <div className="grid grid-cols-2 gap-4">
          <ComparisonCard
            label={intl.formatMessage({ id: `forecastSettings.algo.${algoA}.name` })}
            forecast={forecastA}
            color="blue"
          />
          <ComparisonCard
            label={intl.formatMessage({ id: `forecastSettings.algo.${algoB}.name` })}
            forecast={forecastB}
            color="emerald"
          />
        </div>
      )}
    </div>
  )
}

// ─── Sub-component ──────────────────────────────────────────────

function ComparisonCard({
  label,
  forecast,
  color,
}: {
  label: string
  forecast: ForecastResult
  color: 'blue' | 'emerald'
}) {
  const intl = useIntl()
  const borderClass = color === 'blue' ? 'border-blue-500/40' : 'border-emerald-500/40'

  return (
    <Card className={borderClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{label}</span>
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={forecast.trend} />
            <Badge variant="outline" className="text-xs">
              {forecast.trend === 'up' ? '+' : ''}
              {forecast.trendPercent.toFixed(1)}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'forecast.nextMonth' })}
            </p>
            <p className="font-bold">
              {formatCurrencyCompact(forecast.summary.nextMonth)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'forecast.totalForecast' })}
            </p>
            <p className="font-bold">
              {formatCurrencyCompact(forecast.summary.totalForecast)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'forecast.confidence' })}
            </p>
            <p className="font-bold">
              {Math.round(forecast.confidence * 100)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'forecast.method' })}
            </p>
            <p className="font-bold text-xs">{forecast.method}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
