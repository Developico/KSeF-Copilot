import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, AlertCircle, PieChart, TrendingUp, Building2 } from 'lucide-react'
import { useDashboardStats } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatCurrencyCompact, formatNumber } from '@/lib/format'

export function ReportsPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const { data: stats, isLoading, error } = useDashboardStats(
    { settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) }
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {intl.formatMessage({ id: 'reports.title' })}
        </h1>
        <p className="text-muted-foreground">
          {intl.formatMessage({ id: 'reports.subtitle' })}
        </p>
      </div>

      {/* Loading */}
      {(isLoading || companyLoading) && (
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

      {/* No data */}
      {!isLoading && !companyLoading && !stats && !error && (
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'reports.noData' })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report data */}
      {stats && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'reports.totalAmount' })}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyCompact(stats.totals.grossAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Net: {formatCurrencyCompact(stats.totals.netAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'reports.invoiceCount' })}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(stats.totals.invoiceCount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.period.from} — {stats.period.to}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {intl.formatMessage({ id: 'reports.averageAmount' })}
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyCompact(
                    stats.totals.invoiceCount > 0
                      ? stats.totals.grossAmount / stats.totals.invoiceCount
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'dashboard.perInvoice' })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {intl.formatMessage({ id: 'invoices.paymentStatus' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.paid' })}</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrencyCompact(stats.payments.paid.grossAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.payments.paid.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.pending' })}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrencyCompact(stats.payments.pending.grossAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.payments.pending.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.overdue' })}</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrencyCompact(stats.payments.overdue.grossAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.payments.overdue.count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly breakdown */}
          {stats.monthly.length > 0 && (
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
                        <th className="text-right p-2 font-medium">Net</th>
                        <th className="text-right p-2 font-medium">VAT</th>
                        <th className="text-right p-2 font-medium">Gross</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.monthly.map((m) => (
                        <tr key={m.month} className="border-b last:border-0">
                          <td className="p-2 font-medium">{m.month}</td>
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
          )}

          {/* By MPK */}
          {stats.byMpk.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  {intl.formatMessage({ id: 'reports.byCostCenter' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.byMpk.map((mpk) => (
                    <div key={mpk.mpk} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{mpk.mpk || '—'}</span>
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
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${mpk.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top suppliers */}
          {stats.topSuppliers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {intl.formatMessage({ id: 'reports.byVendor' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSuppliers.map((s, i) => (
                    <div key={s.supplierNip || i} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                        <span className="truncate">{s.supplierName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{s.supplierNip}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground text-xs">{s.invoiceCount} inv.</span>
                        <span className="font-medium">{formatCurrencyCompact(s.grossAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
