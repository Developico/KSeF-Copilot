import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp, Wallet, PiggyBank } from 'lucide-react'
import { useReportBudgetUtilization } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import {
  AnimatedKpiCard,
  AnimatedCardGrid,
} from '@/components/dashboard/animated-kpi-card'
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
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function BudgetUtilizationTab() {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id: `reports.budget.${id}` })
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading } = useReportBudgetUtilization(selectedCompany?.id ?? '')

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
      {period.from && (
        <p className="text-sm text-muted-foreground">
          {t('period')}: {formatDate(period.from)} — {formatDate(period.to)}
        </p>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('chartTitle')}</CardTitle>
          <CardDescription>{t('chartDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="utilized" name={t('utilized')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="remaining" name={t('remaining')} fill="#e2e8f0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">{t('mpk')}</th>
                  <th className="text-right p-2 font-medium">{t('budgetAmount')}</th>
                  <th className="text-right p-2 font-medium">{t('utilized')}</th>
                  <th className="text-right p-2 font-medium hidden sm:table-cell">{t('remaining')}</th>
                  <th className="p-2 font-medium w-[140px]">{t('utilization')}</th>
                  <th className="text-right p-2 font-medium hidden md:table-cell">{t('invoices')}</th>
                  <th className="p-2 font-medium">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {mpkCenters.map((m) => (
                  <tr key={m.mpkCenterId} className="border-b last:border-0">
                    <td className="p-2 font-medium">{m.mpkCenterName}</td>
                    <td className="p-2 text-right">{formatCurrency(m.budgetAmount)}</td>
                    <td className="p-2 text-right">{formatCurrency(m.utilized)}</td>
                    <td className="p-2 text-right hidden sm:table-cell">{formatCurrency(m.remaining)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(m.utilizationPercent, 100)}
                          className={`h-2 ${m.isExceeded ? '[&>div]:bg-red-500' : m.isWarning ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">{m.utilizationPercent}%</span>
                      </div>
                    </td>
                    <td className="p-2 text-right hidden md:table-cell">{m.invoiceCount}</td>
                    <td className="p-2">
                      {m.isExceeded ? (
                        <Badge variant="destructive">{t('statusExceeded')}</Badge>
                      ) : m.isWarning ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">{t('statusWarning')}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">{t('statusOk')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
