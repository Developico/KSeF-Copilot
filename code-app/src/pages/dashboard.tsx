import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  FileText,
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Receipt,
  Clock,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  DollarSign,
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrencyCompact } from '@/lib/format'
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
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`
}

function formatCurrencyShort(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Component ───────────────────────────────────────────────────

export function DashboardPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  // Date range — default last 12 months
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear() - 1, today.getMonth(), 1)

  const [fromDate, setFromDate] = useState(defaultFrom.toISOString().split('T')[0])
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0])

  const { data: stats, isLoading, error, refetch } = useDashboardStats(
    { fromDate, toDate, settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) },
  )

  // Chart data
  const monthlyData = useMemo(
    () =>
      (stats?.monthly ?? []).map((m) => ({
        ...m,
        name: formatMonth(m.month),
      })),
    [stats?.monthly],
  )

  const mpkData = useMemo(
    () =>
      (stats?.byMpk ?? []).map((m) => ({
        ...m,
        name: m.mpk || '—',
      })),
    [stats?.byMpk],
  )

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading || companyLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'dashboard.subtitle' })}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'dashboard.title' })}
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

  // ── No company ───────────────────────────────────────────────
  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'settings.noCompanies' })}
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center mt-2 text-sm text-primary hover:underline"
            >
              {intl.formatMessage({ id: 'dashboard.syncPanel' })} →
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totals = stats?.totals
  const payments = stats?.payments

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'dashboard.subtitle' })}
            {selectedCompany && (
              <span className="ml-2 font-medium text-foreground">
                — {selectedCompany.companyName}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Date range filter ─────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: 'dashboard.dateRange' })}:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'common.refresh' })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards (animated) ──────────────────────────────── */}
      <AnimatedCardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'dashboard.totalInvoices' })}
          value={totals?.invoiceCount ?? 0}
          format="number"
          icon={Receipt}
          iconColor="#64748b"
          borderColor="#3b82f6"
          subtitle={intl.formatMessage({ id: 'dashboard.inSystem' })}
          delay={0}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'dashboard.totalGross' })}
          value={totals?.grossAmount ?? 0}
          format="currency"
          icon={DollarSign}
          iconColor="#3b82f6"
          borderColor="#10b981"
          subtitle={`${intl.formatMessage({ id: 'invoices.netAmount' })}: ${formatCurrencyCompact(totals?.netAmount ?? 0)}`}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'dashboard.paid' })}
          value={payments?.paid.grossAmount ?? 0}
          format="currency"
          icon={CheckCircle}
          iconColor="#10b981"
          valueColor="#16a34a"
          borderColor="#10b981"
          subtitle={`${payments?.paid.count ?? 0} ${intl.formatMessage({ id: 'dashboard.invoicesLabel' })}`}
          delay={0.2}
        />
        <AnimatedKpiCard
          title={intl.formatMessage({ id: 'dashboard.toPay' })}
          value={payments?.pending.grossAmount ?? 0}
          format="currency"
          icon={Clock}
          iconColor="#f59e0b"
          valueColor="#ca8a04"
          borderColor="#f59e0b"
          subtitle={`${payments?.pending.count ?? 0} ${intl.formatMessage({ id: 'dashboard.pendingPayment' })}`}
          delay={0.3}
        />
      </AnimatedCardGrid>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly expenses bar chart */}
        {monthlyData.length > 0 && (
          <AnimatedCardWrapper delay={0.4}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {intl.formatMessage({ id: 'dashboard.monthlyExpenses' })}
                </CardTitle>
                <CardDescription>
                  {intl.formatMessage({ id: 'dashboard.monthlyExpensesDesc' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        className="text-muted-foreground"
                      />
                      <ReTooltip
                        formatter={(value) => [formatCurrencyShort(value as number), intl.formatMessage({ id: 'invoices.grossAmount' })]}
                      />
                      <Bar dataKey="grossAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedCardWrapper>
        )}

        {/* MPK pie chart */}
        {mpkData.length > 0 && (
          <AnimatedCardWrapper delay={0.5}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {intl.formatMessage({ id: 'dashboard.mpkDistribution' })}
                </CardTitle>
                <CardDescription>
                  {intl.formatMessage({ id: 'dashboard.mpkDistributionDesc' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mpkData}
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
                        {mpkData.map((_entry, index) => (
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
        )}
      </div>

      {/* ── Top suppliers ─────────────────────────────────────── */}
      {stats?.topSuppliers && stats.topSuppliers.length > 0 && (
        <AnimatedCardWrapper delay={0.6}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {intl.formatMessage({ id: 'dashboard.topSuppliers' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        {intl.formatMessage({ id: 'invoices.supplier' })}
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">
                        {intl.formatMessage({ id: 'invoices.nipLabel' })}
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                        {intl.formatMessage({ id: 'reports.invoiceCount' })}
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                        {intl.formatMessage({ id: 'invoices.grossAmount' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSuppliers.slice(0, 10).map((s, i) => (
                      <tr key={s.supplierNip || i} className="border-b last:border-0">
                        <td className="py-3 px-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-3 px-2 font-medium">{s.supplierName}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">
                          {s.supplierNip}
                        </td>
                        <td className="py-3 px-2 text-right">{s.invoiceCount}</td>
                        <td className="py-3 px-2 text-right font-medium">
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
      )}

      {/* ── Payment status cards ──────────────────────────────── */}
      {payments && (
        <div className="grid gap-4 md:grid-cols-3">
          <AnimatedCardWrapper delay={0.7}>
            <Card
              className="border-green-200 bg-green-50/50 dark:bg-green-950/20 hover:shadow-md transition-all border-l-4"
              style={{ borderLeftColor: '#10b981' }}
            >
              <CardHeader className="pb-2 py-2 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {intl.formatMessage({ id: 'invoices.paid' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrencyCompact(payments.paid.grossAmount)}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {payments.paid.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                </p>
              </CardContent>
            </Card>
          </AnimatedCardWrapper>

          <AnimatedCardWrapper delay={0.8}>
            <Card
              className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 hover:shadow-md transition-all border-l-4"
              style={{ borderLeftColor: '#f59e0b' }}
            >
              <CardHeader className="pb-2 py-2 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  {intl.formatMessage({ id: 'invoices.pending' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {formatCurrencyCompact(payments.pending.grossAmount)}
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  {payments.pending.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                </p>
              </CardContent>
            </Card>
          </AnimatedCardWrapper>

          <AnimatedCardWrapper delay={0.9}>
            <Card
              className="border-red-200 bg-red-50/50 dark:bg-red-950/20 hover:shadow-md transition-all border-l-4"
              style={{ borderLeftColor: '#ef4444' }}
            >
              <CardHeader className="pb-2 py-2 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  {intl.formatMessage({ id: 'invoices.overdue' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {formatCurrencyCompact(payments.overdue.grossAmount)}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {payments.overdue.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                </p>
              </CardContent>
            </Card>
          </AnimatedCardWrapper>
        </div>
      )}

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {intl.formatMessage({ id: 'dashboard.incomingInvoices' })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: 'dashboard.incomingInvoicesDesc' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/invoices"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {intl.formatMessage({ id: 'dashboard.browseInvoices' })}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              {intl.formatMessage({ id: 'dashboard.synchronization' })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: 'dashboard.synchronizationDesc' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/sync"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {intl.formatMessage({ id: 'dashboard.syncPanel' })}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {intl.formatMessage({ id: 'dashboard.reports' })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: 'dashboard.reportsDesc' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/forecast"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {intl.formatMessage({ id: 'dashboard.viewReports' })}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
