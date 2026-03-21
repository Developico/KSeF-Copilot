'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp, Wallet, PiggyBank } from 'lucide-react'
import { useContextBudgetUtilizationReport } from '@/hooks/use-api'
import { AnimatedKpiCard, AnimatedCardGrid } from '@/components/dashboard/animated-kpi-card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrencyCompact } from '@/lib/format'

function formatCurrency(amount: number, locale: string) {
  return formatCurrencyCompact(amount, 'PLN', locale === 'pl' ? 'pl-PL' : 'en-US')
}

function formatDate(dateStr: string, locale: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function BudgetUtilizationTab() {
  const t = useTranslations('reports.budget')
  const locale = useLocale()
  const { data, isLoading } = useContextBudgetUtilizationReport()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    )
  }

  const report = data?.data
  if (!report || report.mpkCenters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('noData')}
        </CardContent>
      </Card>
    )
  }

  const { totals, mpkCenters, period } = report

  const chartData = mpkCenters.map((m) => ({
    name: m.mpkCenterName,
    budget: m.budgetAmount,
    utilized: m.utilized,
    remaining: Math.max(0, m.remaining),
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Period info */}
      {period.from && (
        <p className="text-sm text-muted-foreground">
          {t('period')}: {formatDate(period.from, locale)} — {formatDate(period.to, locale)}
        </p>
      )}

      {/* KPI Cards */}
      <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title={t('totalBudget')}
          value={totals.totalBudget}
          format="currency"
          icon={Wallet}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          delay={0}
        />
        <AnimatedKpiCard
          title={t('utilized')}
          value={totals.totalUtilized}
          format="currency"
          icon={TrendingUp}
          iconColor={totals.overallUtilizationPercent >= 100 ? '#ef4444' : totals.overallUtilizationPercent >= 80 ? '#f59e0b' : '#10b981'}
          borderColor={totals.overallUtilizationPercent >= 100 ? '#ef4444' : totals.overallUtilizationPercent >= 80 ? '#f59e0b' : '#10b981'}
          subtitle={`${totals.overallUtilizationPercent}%`}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={t('remaining')}
          value={totals.totalRemaining}
          format="currency"
          icon={PiggyBank}
          iconColor="#10b981"
          borderColor="#10b981"
          delay={0.2}
        />
        <AnimatedKpiCard
          title={t('mpkCount')}
          value={mpkCenters.length}
          format="number"
          icon={AlertTriangle}
          iconColor="#64748b"
          borderColor="#64748b"
          subtitle={`${mpkCenters.filter(m => m.isExceeded).length} ${t('exceeded')}`}
          delay={0.3}
        />
      </AnimatedCardGrid>

      {/* Chart: Budget vs Utilized per MPK */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('chartTitle')}</CardTitle>
          <CardDescription>{t('chartDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v, locale)} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value), locale)} />
              <Legend />
              <Bar dataKey="utilized" name={t('utilized')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="remaining" name={t('remaining')} fill="#e2e8f0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MPK Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mpk')}</TableHead>
                  <TableHead className="text-right">{t('budgetAmount')}</TableHead>
                  <TableHead className="text-right">{t('utilized')}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{t('remaining')}</TableHead>
                  <TableHead className="w-[140px]">{t('utilization')}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t('invoices')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mpkCenters.map((m) => (
                  <TableRow key={m.mpkCenterId}>
                    <TableCell className="font-medium">{m.mpkCenterName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.budgetAmount, locale)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.utilized, locale)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{formatCurrency(m.remaining, locale)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(m.utilizationPercent, 100)}
                          className={`h-2 ${m.isExceeded ? '[&>div]:bg-red-500' : m.isWarning ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">{m.utilizationPercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">{m.invoiceCount}</TableCell>
                    <TableCell>
                      {m.isExceeded ? (
                        <Badge variant="destructive">{t('statusExceeded')}</Badge>
                      ) : m.isWarning ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">{t('statusWarning')}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">{t('statusOk')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
