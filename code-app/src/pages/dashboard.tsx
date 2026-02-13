import { useIntl } from 'react-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  Receipt,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDashboardStats } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrencyCompact, formatNumber } from '@/lib/format'

export function DashboardPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const { data: stats, isLoading, error } = useDashboardStats(
    { settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  // Loading skeleton
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

  // Error state
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

  // No company selected
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
  const monthly = stats?.monthly ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
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
        {stats?.period && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {stats.period.from} → {stats.period.to}
          </Badge>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: 'dashboard.totalInvoices' })}
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totals?.invoiceCount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'dashboard.inSystem' })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: 'dashboard.totalGross' })}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyCompact(totals?.grossAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'dashboard.allInvoices' })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: 'dashboard.paid' })}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrencyCompact(payments?.paid.grossAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'dashboard.completedPayments' })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: 'dashboard.toPay' })}
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrencyCompact(payments?.pending.grossAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'dashboard.pendingPayment' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly overview */}
      {monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {intl.formatMessage({ id: 'dashboard.reports' })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: 'dashboard.reportsDesc' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthly.map((m) => (
                <div
                  key={m.month}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{m.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {m.invoiceCount}{' '}
                      {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                    </span>
                    <span className="font-medium w-32 text-right">
                      {formatCurrencyCompact(m.grossAmount)}
                    </span>
                    <div className="w-32 hidden lg:block">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(
                              100,
                              ((m.grossAmount ?? 0) /
                                Math.max(
                                  ...monthly.map(
                                    (x) => x.grossAmount ?? 1
                                  )
                                )) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top suppliers */}
      {stats?.topSuppliers && stats.topSuppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: 'dashboard.topSuppliers' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topSuppliers.slice(0, 5).map((s, i) => (
                <div
                  key={s.supplierNip || i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 text-right">
                      {i + 1}.
                    </span>
                    <span className="truncate">{s.supplierName}</span>
                  </div>
                  <span className="font-medium shrink-0">
                    {formatCurrencyCompact(s.grossAmount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
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
              <BarChart3 className="h-5 w-5" />
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
