import { useState, useMemo, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  RefreshCw,
  Tag,
  Calendar,
} from 'lucide-react'
import { useDashboardStats, useInvoices } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import {
  AnimatedKpiCard,
  AnimatedCardGrid,
  AnimatedCardWrapper,
} from '@/components/dashboard/animated-kpi-card'

// ─── Types ───────────────────────────────────────────────────────

interface CategoryData {
  category: string
  count: number
  totalGross: number
  percentage: number
}

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

  // ── Year / Month filters ───────────────────────────────────
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const availableYears = useMemo(() => {
    const years: number[] = []
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y)
    return years
  }, [currentYear])

  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      intl.formatMessage({ id: `reports.monthNames.${i + 1}` })
    )
  }, [intl])

  // Compute date range from selections
  const dateParams = useMemo(() => {
    const year = parseInt(selectedYear)
    if (selectedMonth === 'all') {
      return {
        fromDate: `${year}-01-01`,
        toDate: `${year}-12-31`,
      }
    }
    const month = parseInt(selectedMonth)
    const lastDay = new Date(year, month, 0).getDate()
    return {
      fromDate: `${year}-${String(month).padStart(2, '0')}-01`,
      toDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }, [selectedYear, selectedMonth])

  const { data: stats, isLoading, error, refetch } = useDashboardStats(
    { settingId: selectedCompany?.id, ...dateParams },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  // Fetch invoices for category aggregation (same date range)
  const { data: invoiceData } = useInvoices(
    { settingId: selectedCompany?.id, ...dateParams },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  // ── Category aggregation (client-side) ─────────────────────
  const categoryData = useMemo<CategoryData[]>(() => {
    const invoices = invoiceData?.invoices ?? []
    if (invoices.length === 0) return []

    const uncategorizedLabel = intl.formatMessage({ id: 'reports.uncategorized' })
    const map = new Map<string, { count: number; totalGross: number }>()

    for (const inv of invoices) {
      const cat = inv.category || uncategorizedLabel
      const existing = map.get(cat) ?? { count: 0, totalGross: 0 }
      existing.count += 1
      existing.totalGross += inv.grossAmount ?? 0
      map.set(cat, existing)
    }

    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.totalGross, 0)
    return Array.from(map.entries())
      .map(([category, { count, totalGross }]) => ({
        category,
        count,
        totalGross,
        percentage: grandTotal > 0 ? (totalGross / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalGross - a.totalGross)
  }, [invoiceData?.invoices, intl])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

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
      {/* ── Header with filters ──────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[110px]">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {intl.formatMessage({ id: 'reports.allMonths' })}
              </SelectItem>
              {monthNames.map((name, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} title={intl.formatMessage({ id: 'reports.refresh' })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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
          <TabsTrigger value="categories" className="gap-1.5">
            <Tag className="h-4 w-4" />
            {intl.formatMessage({ id: 'reports.categoriesTab' })}
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
                          <th className="text-right p-2 font-medium hidden sm:table-cell">{intl.formatMessage({ id: 'invoices.vatAmount' })}</th>
                          <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.monthly.map((m) => (
                          <tr key={m.month} className="border-b last:border-0">
                            <td className="p-2 font-medium">{formatMonth(m.month)}</td>
                            <td className="p-2 text-right">{m.invoiceCount}</td>
                            <td className="p-2 text-right">{formatCurrency(m.netAmount)}</td>
                            <td className="p-2 text-right text-muted-foreground hidden sm:table-cell">{formatCurrency(m.vatAmount)}</td>
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
                          <th className="text-right p-2 font-medium hidden md:table-cell">
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
                            <td className="p-2 text-right hidden md:table-cell">{s.invoiceCount}</td>
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

        {/* ── Categories tab ───────────────────────────────── */}
        <TabsContent value="categories">
          {categoryData.length > 0 ? (
            <AnimatedCardWrapper delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {intl.formatMessage({ id: 'reports.categoriesTab' })}
                  </CardTitle>
                  <CardDescription>
                    {intl.formatMessage({ id: 'reports.categoriesDesc' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryData.map((cat, i) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="font-medium truncate">{cat.category}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {cat.count}
                            </Badge>
                          </div>
                          <span className="font-medium ml-4 shrink-0">
                            {formatCurrencyCompact(cat.totalGross)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cat.percentage.toFixed(1)}% {intl.formatMessage({ id: 'dashboard.ofTotal' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCardWrapper>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Tag className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p>{intl.formatMessage({ id: 'reports.noCategoryData' })}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
