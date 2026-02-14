import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  BarChart3,
  AlertCircle,
  PieChart as PieChartIcon,
  TrendingUp,
  Building2,
  Receipt,
  DollarSign,
  FileText,
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatCurrencyCompact, formatNumber } from '@/lib/format'
import {
  AnimatedKpiCard,
  AnimatedCardGrid,
  AnimatedCardWrapper,
} from '@/components/dashboard/animated-kpi-card'

// ─── Constants ───────────────────────────────────────────────────

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

// ─── Helpers ─────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────

export function ReportsPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const [_year] = useState(() => new Date().getFullYear())

  const { data: stats, isLoading, error } = useDashboardStats(
    { settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  // Chart data
  const monthlyChartData = useMemo(
    () =>
      (stats?.monthly ?? []).map((m) => ({
        ...m,
        name: formatMonth(m.month),
      })),
    [stats?.monthly],
  )

  const mpkChartData = useMemo(
    () =>
      (stats?.byMpk ?? []).map((m) => ({
        ...m,
        name: m.mpk || '—',
      })),
    [stats?.byMpk],
  )

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading || companyLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'reports.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'reports.subtitle' })}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
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
            {intl.formatMessage({ id: 'reports.title' })}
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
  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'reports.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'reports.subtitle' })}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'reports.noData' })}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const avgAmount =
    stats.totals.invoiceCount > 0
      ? stats.totals.grossAmount / stats.totals.invoiceCount
      : 0

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {intl.formatMessage({ id: 'reports.title' })}
        </h1>
        <p className="text-muted-foreground">
          {intl.formatMessage({ id: 'reports.subtitle' })}
          {stats.period && (
            <span className="ml-2">
              ({stats.period.from} — {stats.period.to})
            </span>
          )}
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <AnimatedCardGrid className="grid gap-4 md:grid-cols-3">
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'reports.totalAmount' })}
          value={stats.totals.grossAmount}
          format="currency"
          icon={DollarSign}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`Net: ${formatCurrencyCompact(stats.totals.netAmount)}`}
          delay={0}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'reports.invoiceCount' })}
          value={stats.totals.invoiceCount}
          format="number"
          icon={Receipt}
          iconColor="#10b981"
          borderColor="#10b981"
          subtitle={`${stats.period.from} — ${stats.period.to}`}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'reports.averageAmount' })}
          value={avgAmount}
          format="currency"
          icon={FileText}
          iconColor="#f59e0b"
          borderColor="#f59e0b"
          subtitle={intl.formatMessage({ id: 'dashboard.perInvoice' })}
          delay={0.2}
        />
      </AnimatedCardGrid>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            {intl.formatMessage({ id: 'reports.summary' })}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            {intl.formatMessage({ id: 'reports.byMonth' })}
          </TabsTrigger>
          <TabsTrigger value="mpk" className="gap-1.5">
            <PieChartIcon className="h-4 w-4" />
            {intl.formatMessage({ id: 'reports.byCostCenter' })}
          </TabsTrigger>
          <TabsTrigger value="vendor" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            {intl.formatMessage({ id: 'reports.byVendor' })}
          </TabsTrigger>
        </TabsList>

        {/* ── Summary tab ──────────────────────────────────── */}
        <TabsContent value="summary" className="space-y-6">
          {/* Payment breakdown */}
          <AnimatedCardWrapper delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'invoices.paymentStatus' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-green-50/50 dark:bg-green-950/20 p-4 border-l-4 border-green-500">
                    <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.paid' })}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrencyCompact(stats.payments.paid.grossAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.payments.paid.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20 p-4 border-l-4 border-yellow-500">
                    <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.pending' })}</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrencyCompact(stats.payments.pending.grossAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.payments.pending.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50/50 dark:bg-red-950/20 p-4 border-l-4 border-red-500">
                    <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.overdue' })}</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrencyCompact(stats.payments.overdue.grossAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.payments.overdue.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCardWrapper>

          {/* Monthly bar chart */}
          {monthlyChartData.length > 0 && (
            <AnimatedCardWrapper delay={0.4}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {intl.formatMessage({ id: 'reports.monthlyChart' })}
                  </CardTitle>
                  <CardDescription>
                    {intl.formatMessage({ id: 'reports.monthlyChartDesc' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80" data-testid="reports-bar-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <ReTooltip
                          formatter={(value, name) => [
                            formatCurrencyShort(value as number),
                            name === 'grossAmount'
                              ? intl.formatMessage({ id: 'invoices.grossAmount' })
                              : name === 'netAmount'
                              ? intl.formatMessage({ id: 'invoices.netAmount' })
                              : String(name),
                          ]}
                        />
                        <Bar dataKey="grossAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="netAmount" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCardWrapper>
          )}
        </TabsContent>

        {/* ── By Month tab ─────────────────────────────────── */}
        <TabsContent value="monthly">
          {stats.monthly.length > 0 ? (
            <AnimatedCardWrapper delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {intl.formatMessage({ id: 'reports.byMonth' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'reports.period' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'reports.invoiceCount' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.netAmount' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.vatAmount' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.monthly.map((m) => (
                          <tr key={m.month} className="border-b last:border-0">
                            <td className="p-2 font-medium">{formatMonth(m.month)}</td>
                            <td className="p-2 text-right">{m.invoiceCount}</td>
                            <td className="p-2 text-right">{formatCurrency(m.netAmount)}</td>
                            <td className="p-2 text-right text-muted-foreground">{formatCurrency(m.vatAmount)}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(m.grossAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCardWrapper>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {intl.formatMessage({ id: 'reports.noData' })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── By Cost Center tab ───────────────────────────── */}
        <TabsContent value="mpk" className="space-y-6">
          {mpkChartData.length > 0 ? (
            <>
              {/* Pie chart */}
              <AnimatedCardWrapper delay={0.2}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      {intl.formatMessage({ id: 'reports.byCostCenter' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" data-testid="reports-pie-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={mpkChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="grossAmount"
                          >
                            {mpkChartData.map((_entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(value) => formatCurrencyShort(value as number)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCardWrapper>

              {/* MPK table */}
              <AnimatedCardWrapper delay={0.3}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {stats.byMpk.map((mpk, i) => (
                        <div key={mpk.mpk} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                              <span className="font-medium">{mpk.mpk || '—'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">
                                {mpk.invoiceCount} inv.
                              </span>
                              <span className="font-medium w-28 text-right">
                                {formatCurrencyCompact(mpk.grossAmount)}
                              </span>
                              <Badge variant="outline" className="text-xs w-12 justify-center">
                                {mpk.percentage.toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${mpk.percentage}%`,
                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCardWrapper>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {intl.formatMessage({ id: 'reports.noData' })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── By Vendor tab ────────────────────────────────── */}
        <TabsContent value="vendor">
          {stats.topSuppliers.length > 0 ? (
            <AnimatedCardWrapper delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {intl.formatMessage({ id: 'reports.byVendor' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">#</th>
                          <th className="text-left p-2 font-medium">
                            {intl.formatMessage({ id: 'invoices.supplier' })}
                          </th>
                          <th className="text-left p-2 font-medium hidden sm:table-cell">
                            {intl.formatMessage({ id: 'invoices.nipLabel' })}
                          </th>
                          <th className="text-right p-2 font-medium">
                            {intl.formatMessage({ id: 'reports.invoiceCount' })}
                          </th>
                          <th className="text-right p-2 font-medium">
                            {intl.formatMessage({ id: 'invoices.grossAmount' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topSuppliers.map((s, i) => (
                          <tr key={s.supplierNip || i} className="border-b last:border-0">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-medium">{s.supplierName}</td>
                            <td className="p-2 text-muted-foreground hidden sm:table-cell">
                              {s.supplierNip}
                            </td>
                            <td className="p-2 text-right">{s.invoiceCount}</td>
                            <td className="p-2 text-right font-medium">
                              {formatCurrencyCompact(s.grossAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCardWrapper>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {intl.formatMessage({ id: 'reports.noData' })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
