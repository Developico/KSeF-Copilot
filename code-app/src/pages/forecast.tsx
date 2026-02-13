import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  BarChart3,
  Target,
} from 'lucide-react'
import { useForecastMonthly, useAnomalies } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrencyCompact, formatCurrency, formatNumber } from '@/lib/format'
import type { ForecastHorizon } from '@/lib/types'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

export function ForecastPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const [horizon, setHorizon] = useState<ForecastHorizon>(6)

  const { data: forecast, isLoading, error } = useForecastMonthly(
    { horizon, settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  const { data: anomalyData } = useAnomalies(
    { settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'forecast.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'forecast.subtitle' })}
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {([1, 6, 12] as ForecastHorizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                horizon === h
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {intl.formatMessage({ id: `forecast.horizon${h}` })}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {(isLoading || companyLoading) && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast data */}
      {forecast && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'forecast.tabOverview' })}
                </CardTitle>
                <TrendIcon trend={forecast.trend} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyCompact(forecast.summary.nextMonth)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {forecast.trend === 'up' ? '+' : forecast.trend === 'down' ? '' : ''}
                  {forecast.trendPercent.toFixed(1)}% trend
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'reports.totalAmount' })}
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyCompact(forecast.summary.totalForecast)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {horizon} {horizon === 1 ? 'month' : 'months'} forecast
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'dashboard.average' })}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyCompact(forecast.summary.avgMonthly)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {intl.formatMessage({ id: 'dashboard.perInvoice' })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Method & confidence */}
          <div className="flex items-center gap-3">
            <Badge variant="outline">{forecast.method}</Badge>
            <span className="text-sm text-muted-foreground">
              Confidence: {Math.round(forecast.confidence * 100)}%
            </span>
          </div>

          {/* Historical data */}
          {forecast.historical.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Historical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {forecast.historical.map((m) => {
                    const maxGross = Math.max(...forecast.historical.map((x) => x.grossAmount || 1))
                    return (
                      <div key={m.month} className="flex items-center gap-3 text-sm">
                        <span className="w-20 shrink-0 font-medium">{m.month}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(m.grossAmount / maxGross) * 100}%` }}
                          />
                        </div>
                        <span className="w-28 text-right shrink-0">
                          {formatCurrencyCompact(m.grossAmount)}
                        </span>
                        <span className="w-16 text-right text-muted-foreground shrink-0">
                          {m.invoiceCount} inv.
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Forecast data */}
          {forecast.forecast.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Forecast ({horizon}m)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Month</th>
                        <th className="text-right p-2 font-medium">Predicted</th>
                        <th className="text-right p-2 font-medium">Lower</th>
                        <th className="text-right p-2 font-medium">Upper</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.forecast.map((f) => (
                        <tr key={f.month} className="border-b last:border-0">
                          <td className="p-2 font-medium">{f.month}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(f.predicted)}</td>
                          <td className="p-2 text-right text-muted-foreground">{formatCurrency(f.lower)}</td>
                          <td className="p-2 text-right text-muted-foreground">{formatCurrency(f.upper)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Anomalies */}
      {anomalyData && anomalyData.anomalies.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              {intl.formatMessage({ id: 'forecast.tabAnomalies' })} ({anomalyData.summary.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalyData.anomalies.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1">
                  <div className="min-w-0 flex-1">
                    <span className="truncate">{a.supplierName}</span>
                    <span className="text-muted-foreground ml-2">{a.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={
                        a.severity === 'critical' ? 'border-red-500 text-red-500' :
                        a.severity === 'high' ? 'border-amber-500 text-amber-500' :
                        ''
                      }
                    >
                      {a.severity}
                    </Badge>
                    <span className="font-medium">{formatCurrencyCompact(a.grossAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {!isLoading && !companyLoading && !forecast && !error && (
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'forecast.noData' })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
