import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, TrendingUp, FileText, Coins } from 'lucide-react'
import { useReportCostDistribution } from '@/hooks/use-api'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

export function CostDistributionTab() {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading } = useReportCostDistribution(selectedCompany?.id ?? '')

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
  if (!report || report.totals.totalDocuments === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('reports.costDistribution.noData')}
        </CardContent>
      </Card>
    )
  }

  const { byType, byCategory, byMonth, totals } = report

  const avgGross = totals.totalDocuments > 0
    ? Math.round(totals.totalGross / totals.totalDocuments)
    : 0
  const vatPercent = totals.totalGross > 0
    ? ((totals.totalVat / totals.totalGross) * 100).toFixed(1)
    : '0'

  const pieData = byType.map((entry, i) => ({
    name: entry.documentType,
    value: entry.totalGross,
    count: entry.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const allTypes = Array.from(new Set(byType.map(t => t.documentType)))
  const stackedData = byMonth.map(m => ({
    month: m.month,
    ...m.byType,
    total: m.total,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title={t('reports.costDistribution.totalDocuments')}
          value={totals.totalDocuments}
          format="number"
          icon={FileText}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`${byType.length} ${t('reports.costDistribution.documentTypes')}`}
          delay={0}
        />
        <AnimatedKpiCard
          title={t('reports.costDistribution.totalGross')}
          value={totals.totalGross}
          format="currency"
          icon={Coins}
          iconColor="#10b981"
          valueColor="#16a34a"
          borderColor="#10b981"
          subtitle={`${t('reports.costDistribution.average')} ${formatCurrency(avgGross)}`}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={t('reports.costDistribution.totalNet')}
          value={totals.totalNet}
          format="currency"
          icon={TrendingUp}
          iconColor="#8b5cf6"
          borderColor="#8b5cf6"
          delay={0.2}
        />
        <AnimatedKpiCard
          title={t('reports.costDistribution.totalVat')}
          value={totals.totalVat}
          format="currency"
          icon={Receipt}
          iconColor="#f59e0b"
          borderColor="#f59e0b"
          subtitle={`${vatPercent}% ${t('reports.costDistribution.ofGross')}`}
          delay={0.3}
        />
      </AnimatedCardGrid>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart — By Document Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.costDistribution.byTypeTitle')}</CardTitle>
            <CardDescription>{t('reports.costDistribution.byTypeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  innerRadius="35%"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.costDistribution.byCategoryTitle')}</CardTitle>
            <CardDescription>{t('reports.costDistribution.byCategoryDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byCategory.slice(0, 10).map((cat, idx) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                      <span className="text-sm font-semibold">{formatCurrency(cat.totalGross)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${cat.percent}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {cat.percent.toFixed(1)}%
                  </div>
                </div>
              ))}
              {byCategory.length === 0 && (
                <div className="text-center text-muted-foreground py-4">{t('reports.costDistribution.noCategories')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart — Monthly by Type */}
      {byMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.costDistribution.byMonthTitle')}</CardTitle>
            <CardDescription>{t('reports.costDistribution.byMonthDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                {allTypes.map((type, i) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    stackId="costs"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Type Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports.costDistribution.detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">{t('reports.costDistribution.colType')}</th>
                <th className="p-2 text-right font-medium">{t('reports.costDistribution.colCount')}</th>
                <th className="p-2 text-right font-medium">{t('reports.costDistribution.colNet')}</th>
                <th className="p-2 text-right font-medium">{t('reports.costDistribution.colGross')}</th>
                <th className="p-2 text-right font-medium">{t('reports.costDistribution.colPercent')}</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((entry) => (
                <tr key={entry.documentType} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium">{entry.documentType}</td>
                  <td className="p-2 text-right">{entry.count}</td>
                  <td className="p-2 text-right">{formatCurrency(entry.totalNet)}</td>
                  <td className="p-2 text-right">{formatCurrency(entry.totalGross)}</td>
                  <td className="p-2 text-right">
                    <Badge variant="outline">{entry.percent.toFixed(1)}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
