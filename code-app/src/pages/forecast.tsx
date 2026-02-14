import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  BarChart3,
  Target,
  Activity,
  Building2,
  FolderOpen,
  Users,
  AlertTriangle,
} from 'lucide-react'
import {
  useForecastMonthly,
  useForecastByMpk,
  useForecastByCategory,
  useForecastBySupplier,
  useAnomalies,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrencyCompact, formatCurrency } from '@/lib/format'
import {
  AnimatedKpiCard,
  AnimatedCardGrid,
  AnimatedCardWrapper,
} from '@/components/dashboard/animated-kpi-card'
import type { ForecastHorizon, ForecastResult } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`
}

function formatCurrencyShort(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

const CHART_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16',
]

// ─── GroupedForecastView sub-component ────────────────────────────

function GroupedForecastView({
  groups,
  label,
}: {
  groups: { group: string; forecast: ForecastResult }[]
  label: string
}) {
  const intl = useIntl()

  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          {intl.formatMessage({ id: 'forecast.noData' })}
        </CardContent>
      </Card>
    )
  }

  // Comparison bar chart — next-month prediction per group
  const comparisonData = groups.map((g) => ({
    name: g.group || '—',
    nextMonth: g.forecast.summary.nextMonth,
    total: g.forecast.summary.totalForecast,
  }))

  return (
    <div className="space-y-6">
      {/* Comparison chart */}
      <AnimatedCardWrapper delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              {label} — {intl.formatMessage({ id: 'forecast.comparison' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={120}
                  />
                  <ReTooltip
                    formatter={(value) => formatCurrencyShort(value as number)}
                  />
                  <Bar dataKey="nextMonth" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Next month" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </AnimatedCardWrapper>

      {/* Detail cards per group */}
      {groups.slice(0, 8).map((g, idx) => (
        <AnimatedCardWrapper key={g.group} delay={0.3 + idx * 0.05}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{g.group || '—'}</span>
                <div className="flex items-center gap-2">
                  <TrendIcon trend={g.forecast.trend} />
                  <Badge variant="outline" className="text-xs">
                    {g.forecast.trend === 'up' ? '+' : ''}
                    {g.forecast.trendPercent.toFixed(1)}%
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Next month</p>
                  <p className="font-bold">{formatCurrencyCompact(g.forecast.summary.nextMonth)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total forecast</p>
                  <p className="font-bold">{formatCurrencyCompact(g.forecast.summary.totalForecast)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Avg monthly</p>
                  <p className="font-bold">{formatCurrencyCompact(g.forecast.summary.avgMonthly)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export function ForecastPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const [horizon, setHorizon] = useState<ForecastHorizon>(6)

  const enabled = !companyLoading && Boolean(selectedCompany?.id)
  const queryParams = { horizon, settingId: selectedCompany?.id }

  const { data: forecast, isLoading, error } = useForecastMonthly(queryParams, { enabled })
  const { data: byMpk } = useForecastByMpk(queryParams, { enabled })
  const { data: byCategory } = useForecastByCategory(queryParams, { enabled })
  const { data: bySupplier } = useForecastBySupplier(queryParams, { enabled })
  const { data: anomalyData } = useAnomalies(
    { settingId: selectedCompany?.id },
    { enabled },
  )

  // Build combined chart data: historical + forecast + CI band
  const chartData = useMemo(() => {
    if (!forecast) return []
    const hist = forecast.historical.map((m) => ({
      month: formatMonth(m.month),
      actual: m.grossAmount,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }))
    const fc = forecast.forecast.map((f) => ({
      month: formatMonth(f.month),
      actual: null as number | null,
      predicted: f.predicted,
      lower: f.lower,
      upper: f.upper,
    }))
    // Overlap: last historical point also gets first forecast value
    if (hist.length > 0 && fc.length > 0) {
      fc[0] = { ...fc[0], actual: hist[hist.length - 1].actual }
    }
    return [...hist, ...fc]
  }, [forecast])

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading || companyLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'forecast.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'forecast.subtitle' })}
          </p>
        </div>
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
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'forecast.title' })}
          </h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── No data ─────────────────────────────────────────────────
  if (!forecast) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'forecast.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'forecast.subtitle' })}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'forecast.noData' })}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <AnimatedCardGrid className="grid gap-4 md:grid-cols-3">
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'forecast.nextMonth' })}
          value={forecast.summary.nextMonth}
          format="currency"
          icon={Target}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`${forecast.trend === 'up' ? '+' : ''}${forecast.trendPercent.toFixed(1)}% trend`}
          trend={{
            value: forecast.trendPercent,
            direction: forecast.trend === 'up' ? 'up' : forecast.trend === 'down' ? 'down' : 'neutral',
          }}
          delay={0}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'forecast.totalForecast' })}
          value={forecast.summary.totalForecast}
          format="currency"
          icon={Activity}
          iconColor="#10b981"
          borderColor="#10b981"
          subtitle={`${horizon} ${horizon === 1 ? 'month' : 'months'} forecast`}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'forecast.avgMonthly' })}
          value={forecast.summary.avgMonthly}
          format="currency"
          icon={BarChart3}
          iconColor="#f59e0b"
          borderColor="#f59e0b"
          subtitle={intl.formatMessage({ id: 'dashboard.perInvoice' })}
          delay={0.2}
        />
      </AnimatedCardGrid>

      {/* Method + confidence */}
      <div className="flex items-center gap-3">
        <Badge variant="outline">{forecast.method}</Badge>
        <span className="text-sm text-muted-foreground">
          {intl.formatMessage({ id: 'forecast.confidence' })}: {Math.round(forecast.confidence * 100)}%
        </span>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-4 w-4" />
            {intl.formatMessage({ id: 'forecast.tabOverview' })}
          </TabsTrigger>
          <TabsTrigger value="mpk" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            {intl.formatMessage({ id: 'forecast.tabMpk' })}
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-1.5">
            <FolderOpen className="h-4 w-4" />
            {intl.formatMessage({ id: 'forecast.tabCategory' })}
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-1.5">
            <Users className="h-4 w-4" />
            {intl.formatMessage({ id: 'forecast.tabSupplier' })}
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            {intl.formatMessage({ id: 'forecast.tabAnomalies' })}
            {anomalyData && anomalyData.summary.total > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                {anomalyData.summary.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab ─────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Area chart: historical + forecast + CI band */}
          {chartData.length > 0 && (
            <AnimatedCardWrapper delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {intl.formatMessage({ id: 'forecast.chartTitle' })}
                  </CardTitle>
                  <CardDescription>
                    {intl.formatMessage({ id: 'forecast.chartDesc' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80" data-testid="forecast-area-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <ReTooltip
                          formatter={(value) => formatCurrencyShort(value as number)}
                        />
                        {/* CI band */}
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stroke="none"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          connectNulls={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stroke="none"
                          fill="#ffffff"
                          fillOpacity={1}
                          connectNulls={false}
                        />
                        {/* Forecast line */}
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          stroke="#3b82f6"
                          strokeDasharray="5 5"
                          fill="#3b82f6"
                          fillOpacity={0.05}
                          connectNulls={false}
                        />
                        {/* Historical line */}
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.2}
                          connectNulls={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCardWrapper>
          )}

          {/* Forecast table */}
          {forecast.forecast.length > 0 && (
            <AnimatedCardWrapper delay={0.4}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {intl.formatMessage({ id: 'forecast.forecastTable' })} ({horizon}m)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'reports.period' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'forecast.predicted' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'forecast.lower' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'forecast.upper' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.forecast.map((f) => (
                          <tr key={f.month} className="border-b last:border-0">
                            <td className="p-2 font-medium">{formatMonth(f.month)}</td>
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
            </AnimatedCardWrapper>
          )}
        </TabsContent>

        {/* ── By MPK tab ───────────────────────────────────── */}
        <TabsContent value="mpk">
          <GroupedForecastView
            groups={byMpk?.groups ?? []}
            label={intl.formatMessage({ id: 'forecast.tabMpk' })}
          />
        </TabsContent>

        {/* ── By Category tab ──────────────────────────────── */}
        <TabsContent value="category">
          <GroupedForecastView
            groups={byCategory?.groups ?? []}
            label={intl.formatMessage({ id: 'forecast.tabCategory' })}
          />
        </TabsContent>

        {/* ── By Supplier tab ──────────────────────────────── */}
        <TabsContent value="supplier">
          <GroupedForecastView
            groups={bySupplier?.groups ?? []}
            label={intl.formatMessage({ id: 'forecast.tabSupplier' })}
          />
        </TabsContent>

        {/* ── Anomalies tab ────────────────────────────────── */}
        <TabsContent value="anomalies" className="space-y-4">
          {anomalyData && anomalyData.anomalies.length > 0 ? (
            <>
              {/* Severity summary */}
              <AnimatedCardGrid className="grid gap-4 md:grid-cols-4">
                {(['critical', 'high', 'medium', 'low'] as const).map((sev, i) => {
                  const count = anomalyData.summary.bySeverity[sev] ?? 0
                  const colors = {
                    critical: { icon: '#ef4444', border: '#ef4444' },
                    high: { icon: '#f59e0b', border: '#f59e0b' },
                    medium: { icon: '#3b82f6', border: '#3b82f6' },
                    low: { icon: '#6b7280', border: '#6b7280' },
                  }
                  return (
                    <AnimatedKpiCard
                      key={sev}
                      title={sev.charAt(0).toUpperCase() + sev.slice(1)}
                      value={count}
                      format="number"
                      icon={AlertTriangle}
                      iconColor={colors[sev].icon}
                      borderColor={colors[sev].border}
                      delay={i * 0.1}
                    />
                  )
                })}
              </AnimatedCardGrid>

              {/* Anomaly list */}
              <AnimatedCardWrapper delay={0.4}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      {intl.formatMessage({ id: 'forecast.tabAnomalies' })} ({anomalyData.summary.total})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.supplier' })}</th>
                            <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.invoiceNumber' })}</th>
                            <th className="text-left p-2 font-medium">Type</th>
                            <th className="text-left p-2 font-medium">Severity</th>
                            <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {anomalyData.anomalies.slice(0, 20).map((a) => (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="p-2">{a.supplierName}</td>
                              <td className="p-2 text-muted-foreground">{a.invoiceNumber}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">
                                  {a.type}
                                </Badge>
                              </td>
                              <td className="p-2">
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
                              </td>
                              <td className="p-2 text-right font-medium">
                                {formatCurrencyCompact(a.grossAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCardWrapper>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {intl.formatMessage({ id: 'forecast.noAnomalies' })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
