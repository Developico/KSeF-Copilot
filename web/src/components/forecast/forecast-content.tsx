'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  BarChart3,
  Building2,
  Tags,
  Truck,
  Loader2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Settings2,
  GitCompareArrows,
} from 'lucide-react'
import { ForecastSettings, DEFAULT_FORECAST_SETTINGS } from '@/components/forecast/forecast-settings'
import type { ForecastSettingsState } from '@/components/forecast/forecast-settings'
import { AnomalySettings, DEFAULT_ANOMALY_SETTINGS } from '@/components/forecast/anomaly-settings'
import type { AnomalySettingsState } from '@/components/forecast/anomaly-settings'
import { ForecastComparison } from '@/components/forecast/forecast-comparison'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts'
import { AnimatedKpiCard, AnimatedCardGrid } from '@/components/dashboard/animated-kpi-card'
import {
  useContextForecastMonthly,
  useContextForecastByMpk,
  useContextForecastByCategory,
  useContextForecastBySupplier,
  useContextAnomalies,
} from '@/hooks/use-api'
import type {
  ForecastResult,
  ForecastHorizon,
  GroupedForecastResult,
  Anomaly,
  AnomalySeverity,
  AnomalyType,
} from '@/lib/api'
import { Link } from '@/i18n/navigation'
import { formatCurrencyCompact } from '@/lib/format'

// ============================================================================
// Constants
// ============================================================================

const HORIZON_OPTIONS: { value: ForecastHorizon; label: string }[] = [
  { value: 1, label: '1 month' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
]

const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400',
}

const SEVERITY_BADGE_VARIANT: Record<AnomalySeverity, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

const ANOMALY_TYPE_KEYS: Record<AnomalyType, string> = {
  'amount-spike': 'typeAmountSpike',
  'new-supplier': 'typeNewSupplier',
  'category-shift': 'typeCategoryShift',
  'frequency-change': 'typeFrequencyChange',
  'duplicate-suspect': 'typeDuplicateSuspect',
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

// ============================================================================
// Helpers
// ============================================================================

function formatAmount(amount: number, locale: string): string {
  return formatCurrencyCompact(amount, 'PLN', locale === 'pl' ? 'pl-PL' : 'en-US')
}

function formatMonth(month: string, locale: string): string {
  const [year, m] = month.split('-')
  const date = new Date(parseInt(year), parseInt(m) - 1)
  return date.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    month: 'short',
    year: '2-digit',
  })
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

// ============================================================================
// KPI Cards
// ============================================================================

function ForecastKPICards({
  data,
  t,
}: {
  data: ForecastResult
  t: (key: string) => string
}) {
  const trendSubtitle = `${data.trendPercent > 0 ? '+' : ''}${data.trendPercent}% ${t('monthOverMonth')}`

  return (
    <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
      <AnimatedKpiCard
        title={t('nextMonth')}
        value={data.summary.nextMonth}
        format="currency"
        icon={Activity}
        iconColor="#3b82f6"
        borderColor="#3b82f6"
        subtitle={t('predictedExpenses')}
        delay={0}
      />
      <AnimatedKpiCard
        title={t('trend')}
        value={data.trendPercent}
        format="percent"
        icon={data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus}
        iconColor={data.trend === 'up' ? '#ef4444' : data.trend === 'down' ? '#10b981' : '#64748b'}
        valueColor={data.trend === 'up' ? '#dc2626' : data.trend === 'down' ? '#16a34a' : undefined}
        borderColor={data.trend === 'up' ? '#ef4444' : data.trend === 'down' ? '#10b981' : '#64748b'}
        subtitle={t('monthOverMonth')}
        delay={0.1}
      />
      <AnimatedKpiCard
        title={t('totalForecast')}
        value={data.summary.totalForecast}
        format="currency"
        icon={BarChart3}
        iconColor="#8b5cf6"
        borderColor="#8b5cf6"
        subtitle={t('forSelectedPeriod')}
        delay={0.2}
      />
      <AnimatedKpiCard
        title={t('confidence')}
        value={Math.round(data.confidence * 100)}
        format="percent"
        icon={ShieldAlert}
        iconColor="#f59e0b"
        borderColor="#f59e0b"
        subtitle={`${t('method')}: ${data.method}`}
        delay={0.3}
      />
    </AnimatedCardGrid>
  )
}

// ============================================================================
// Forecast Chart
// ============================================================================

function ForecastChart({
  data,
  locale,
  t,
}: {
  data: ForecastResult
  locale: string
  t: (key: string) => string
}) {
  const chartData = useMemo(() => {
    const historical = data.historical.map((d) => ({
      month: formatMonth(d.month, locale),
      rawMonth: d.month,
      actual: d.grossAmount,
      predicted: null as number | null,
      lower: null as number | null,
      ciBand: null as number | null,
    }))

    const forecast = data.forecast.map((d) => ({
      month: formatMonth(d.month, locale),
      rawMonth: d.month,
      actual: null as number | null,
      predicted: d.predicted,
      lower: d.lower,
      ciBand: d.upper - d.lower,
    }))

    // Bridge: make last historical point also start the forecast line
    // so both lines connect without a gap
    if (historical.length > 0 && forecast.length > 0) {
      const last = historical[historical.length - 1]
      // Set predicted on the last historical point so forecast line starts there
      last.predicted = last.actual
      last.lower = last.actual
      last.ciBand = 0
    }

    return [...historical, ...forecast]
  }, [data, locale])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('expenseForecast')}</CardTitle>
        <CardDescription>{t('historicalAndPredicted')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatAmount(Number(value) || 0, locale), '']}
              labelFormatter={(label) => String(label)}
            />
            <Legend />
            {/* Confidence interval band (lower transparent + ciBand colored, stacked) */}
            <Area
              type="monotone"
              dataKey="lower"
              stackId="ci"
              stroke="none"
              fill="transparent"
              fillOpacity={0}
              name=""
              legendType="none"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="ciBand"
              stackId="ci"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.15}
              name={t('confidenceInterval')}
              connectNulls={false}
            />
            {/* Historical line */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
              strokeWidth={2}
              name={t('actual')}
              connectNulls={false}
            />
            {/* Forecast line (Line, not Area — no fill to baseline) */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name={t('predicted')}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Grouped Forecast (MPK / Category / Supplier)
// ============================================================================

function GroupedForecastView({
  groups,
  locale,
  t,
}: {
  groups: GroupedForecastResult[]
  locale: string
  t: (key: string) => string
}) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('noData')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forecastBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('group')}</TableHead>
                <TableHead className="text-right">{t('avgMonthly')}</TableHead>
                <TableHead className="text-right">{t('nextMonthPrediction')}</TableHead>
                <TableHead className="text-right">{t('totalForecast')}</TableHead>
                <TableHead className="text-center">{t('trend')}</TableHead>
                <TableHead className="text-center">{t('confidence')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.group}>
                  <TableCell className="font-medium">{g.group}</TableCell>
                  <TableCell className="text-right">
                    {formatAmount(g.forecast.summary.avgMonthly, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAmount(g.forecast.summary.nextMonth, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAmount(g.forecast.summary.totalForecast, locale)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon trend={g.forecast.trend} />
                      <span className="text-sm">
                        {g.forecast.trendPercent > 0 ? '+' : ''}{g.forecast.trendPercent}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {Math.round(g.forecast.confidence * 100)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stacked bar chart comparing groups */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forecastComparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={groups.map((g) => ({
                name: g.group.length > 15 ? g.group.substring(0, 15) + '…' : g.group,
                current: g.forecast.summary.avgMonthly,
                forecast: g.forecast.summary.nextMonth,
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [formatAmount(Number(value) || 0, locale), '']} />
              <Legend />
              <Bar dataKey="current" name={t('currentAvg')} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="forecast" name={t('predicted')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Anomaly List
// ============================================================================

function AnomalySection({
  locale,
  t,
}: {
  locale: string
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const { data, isLoading, error } = useContextAnomalies({ periodDays: 30 })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('errorLoading')}
        </CardContent>
      </Card>
    )
  }

  if (data.anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mb-2 text-green-500">✓</div>
          <p className="text-muted-foreground">{t('noAnomalies')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
        <CardContent className="flex items-center gap-4 py-4">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-medium">
              {t('anomaliesFound', { count: data.summary.total })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('totalAnomalyAmount')}: {formatAmount(data.summary.totalAmount, locale)}
              {' · '}{t('period')}: {data.period.from} — {data.period.to}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {(['critical', 'high', 'medium', 'low'] as AnomalySeverity[]).map((sev) => {
              const count = data.summary.bySeverity[sev]
              if (count === 0) return null
              const severityKeys: Record<AnomalySeverity, string> = {
                critical: 'severityCritical',
                high: 'severityHigh',
                medium: 'severityMedium',
                low: 'severityLow',
              }
              return (
                <Badge
                  key={sev}
                  variant={SEVERITY_BADGE_VARIANT[sev]}
                  className="text-xs"
                >
                  {t(severityKeys[sev])}: {count}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Anomaly cards */}
      <div className="space-y-3">
        {data.anomalies.map((anomaly) => (
          <AnomalyCard key={anomaly.id} anomaly={anomaly} locale={locale} t={t} />
        ))}
      </div>
    </div>
  )
}

function AnomalyCard({
  anomaly,
  locale,
  t,
}: {
  anomaly: Anomaly
  locale: string
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const severityKeys: Record<AnomalySeverity, string> = {
    critical: 'severityCritical',
    high: 'severityHigh',
    medium: 'severityMedium',
    low: 'severityLow',
  }

  // Use translated description if descriptionKey is available, otherwise fallback
  const description = anomaly.descriptionKey
    ? t(anomaly.descriptionKey, anomaly.descriptionParams || {})
    : anomaly.description

  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4">
        {/* Severity indicator */}
        <div className={`mt-1 h-3 w-3 rounded-full ${SEVERITY_COLORS[anomaly.severity]}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={SEVERITY_BADGE_VARIANT[anomaly.severity]} className="text-xs">
              {t(severityKeys[anomaly.severity]).toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {t(ANOMALY_TYPE_KEYS[anomaly.type])}
            </Badge>
            <span className="text-xs text-muted-foreground">{anomaly.invoiceDate}</span>
          </div>
          <p className="text-sm font-medium">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {anomaly.supplierName} · {anomaly.invoiceNumber}
          </p>
        </div>

        {/* Amount + deviation */}
        <div className="text-right shrink-0">
          <p className="font-semibold">{formatAmount(anomaly.grossAmount, locale)}</p>
          <div className="flex items-center justify-end gap-1 text-xs">
            {anomaly.deviation > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-red-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-green-500" />
            )}
            <span className={anomaly.deviation > 0 ? 'text-red-500' : 'text-green-500'}>
              {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%
            </span>
          </div>
        </div>

        {/* Link to invoice */}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/invoices/${anomaly.invoiceId}`}>→</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Loading / Error States
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
        {message}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ForecastContent() {
  const t = useTranslations('forecast')
  const locale = useLocale()
  const [horizon, setHorizon] = useState<ForecastHorizon>(6)
  const [activeTab, setActiveTab] = useState('overview')

  // Settings state
  const [forecastSettingsOpen, setForecastSettingsOpen] = useState(false)
  const [anomalySettingsOpen, setAnomalySettingsOpen] = useState(false)
  const [forecastSettings, setForecastSettings] = useState<ForecastSettingsState>(DEFAULT_FORECAST_SETTINGS)
  const [anomalySettings, setAnomalySettings] = useState<AnomalySettingsState>(DEFAULT_ANOMALY_SETTINGS)

  // Build params with algorithm from settings
  const forecastParams = useMemo(() => ({
    horizon,
    ...(forecastSettings.algorithm !== 'auto' && { algorithm: forecastSettings.algorithm }),
    ...(Object.keys(forecastSettings.algorithmConfig).length > 0 && {
      algorithmConfig: JSON.stringify(forecastSettings.algorithmConfig),
    }),
  }), [horizon, forecastSettings])

  const monthlyQuery = useContextForecastMonthly(forecastParams)
  const mpkQuery = useContextForecastByMpk(forecastParams)
  const categoryQuery = useContextForecastByCategory(forecastParams)
  const supplierQuery = useContextForecastBySupplier({ ...forecastParams, top: 10 })

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Horizon selector + settings */}
        <div className="flex items-center gap-2">
          <Select
            value={String(horizon)}
            onValueChange={(v) => setHorizon(parseInt(v) as ForecastHorizon)}
          >
            <SelectTrigger className="w-[140px] md:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {t(`horizon${opt.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setForecastSettingsOpen(true)}
            title={t('forecastSettingsBtn')}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          {activeTab === 'anomalies' && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAnomalySettingsOpen(true)}
              title={t('anomalySettingsBtn')}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards — always visible above tabs */}
      {monthlyQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : monthlyQuery.data ? (
        <ForecastKPICards data={monthlyQuery.data} t={t} />
      ) : monthlyQuery.error ? (
        <ErrorState message={t('errorLoading')} />
      ) : null}

      {/* Tabs — full width */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            {t('tabOverview')}
          </TabsTrigger>
          <TabsTrigger value="mpk">
            <Building2 className="mr-2 h-4 w-4" />
            {t('tabMpk')}
          </TabsTrigger>
          <TabsTrigger value="category">
            <Tags className="mr-2 h-4 w-4" />
            {t('tabCategory')}
          </TabsTrigger>
          <TabsTrigger value="supplier">
            <Truck className="mr-2 h-4 w-4" />
            {t('tabSupplier')}
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t('tabAnomalies')}
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <GitCompareArrows className="mr-2 h-4 w-4" />
            {t('tabComparison')}
          </TabsTrigger>
        </TabsList>

        {/* Overview — chart only (KPI cards are above) */}
        <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {monthlyQuery.isLoading ? (
            <LoadingState />
          ) : monthlyQuery.error ? (
            <ErrorState message={t('errorLoading')} />
          ) : monthlyQuery.data ? (
            <ForecastChart data={monthlyQuery.data} locale={locale} t={t} />
          ) : null}
        </TabsContent>

        {/* By MPK */}
        <TabsContent value="mpk" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {mpkQuery.isLoading ? (
            <LoadingState />
          ) : mpkQuery.error ? (
            <ErrorState message={t('errorLoading')} />
          ) : mpkQuery.data ? (
            <GroupedForecastView groups={mpkQuery.data.groups} locale={locale} t={t} />
          ) : null}
        </TabsContent>

        {/* By Category */}
        <TabsContent value="category" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {categoryQuery.isLoading ? (
            <LoadingState />
          ) : categoryQuery.error ? (
            <ErrorState message={t('errorLoading')} />
          ) : categoryQuery.data ? (
            <GroupedForecastView groups={categoryQuery.data.groups} locale={locale} t={t} />
          ) : null}
        </TabsContent>

        {/* By Supplier */}
        <TabsContent value="supplier" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {supplierQuery.isLoading ? (
            <LoadingState />
          ) : supplierQuery.error ? (
            <ErrorState message={t('errorLoading')} />
          ) : supplierQuery.data ? (
            <GroupedForecastView groups={supplierQuery.data.groups} locale={locale} t={t} />
          ) : null}
        </TabsContent>

        {/* Anomalies */}
        <TabsContent value="anomalies" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <AnomalySection locale={locale} t={t} />
        </TabsContent>

        {/* A/B Comparison */}
        <TabsContent value="comparison" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <ForecastComparison horizon={horizon} />
        </TabsContent>
      </Tabs>

      {/* Settings side panels */}
      <ForecastSettings
        open={forecastSettingsOpen}
        onOpenChange={setForecastSettingsOpen}
        value={forecastSettings}
        onChange={setForecastSettings}
      />
      <AnomalySettings
        open={anomalySettingsOpen}
        onOpenChange={setAnomalySettingsOpen}
        value={anomalySettings}
        onChange={setAnomalySettings}
      />
    </div>
  )
}
