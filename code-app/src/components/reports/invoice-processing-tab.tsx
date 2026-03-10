import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Clock, Zap, Upload } from 'lucide-react'
import { useReportInvoiceProcessing } from '@/hooks/use-api'
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
  LineChart,
  Line,
} from 'recharts'

function formatDays(days: number | null, t: (id: string) => string) {
  if (days === null) return '—'
  if (days < 1) return `${Math.round(days * 24)} ${t('hours')}`
  return `${days.toFixed(1)} ${t('days')}`
}

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short' })
}

export function InvoiceProcessingTab() {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id: `reports.processing.${id}` })
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading } = useReportInvoiceProcessing(selectedCompany?.id ?? '')

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
  if (!report || report.months.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('noData')}
        </CardContent>
      </Card>
    )
  }

  const { months, totals } = report

  const ksefPercent = totals.totalReceived > 0
    ? Math.round((totals.fromKsef / totals.totalReceived) * 100)
    : 0

  const volumeChartData = months.map((m) => ({
    month: formatMonth(m.month),
    ksef: m.fromKsef,
    manual: m.fromManual,
  }))

  const timingChartData = months
    .filter((m) => m.avgClassifyDays !== null || m.avgApproveDays !== null)
    .map((m) => ({
      month: formatMonth(m.month),
      classify: m.avgClassifyDays,
      approve: m.avgApproveDays,
      total: m.avgTotalDays,
    }))

  const statusChartData = months.map((m) => ({
    month: formatMonth(m.month),
    approved: m.approved,
    rejected: m.rejected,
    pending: m.pending,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title={t('totalReceived')}
          value={totals.totalReceived}
          format="number"
          icon={FileText}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`${ksefPercent}% KSeF`}
          delay={0}
        />
        <AnimatedKpiCard
          title={t('avgClassifyTime')}
          value={totals.avgClassifyDays ?? 0}
          format="number"
          icon={Upload}
          iconColor="#8b5cf6"
          borderColor="#8b5cf6"
          subtitle={formatDays(totals.avgClassifyDays, t)}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={t('avgApproveTime')}
          value={totals.avgApproveDays ?? 0}
          format="number"
          icon={Clock}
          iconColor="#f59e0b"
          borderColor="#f59e0b"
          subtitle={formatDays(totals.avgApproveDays, t)}
          delay={0.2}
        />
        <AnimatedKpiCard
          title={t('avgTotalTime')}
          value={totals.avgTotalDays ?? 0}
          format="number"
          icon={Zap}
          iconColor="#10b981"
          borderColor="#10b981"
          subtitle={formatDays(totals.avgTotalDays, t)}
          delay={0.3}
        />
      </AnimatedCardGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('volumeChart')}</CardTitle>
            <CardDescription>{t('volumeChartDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ksef" name="KSeF" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="manual" name={t('manual')} fill="#8b5cf6" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('statusChart')}</CardTitle>
            <CardDescription>{t('statusChartDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" name={t('approved')} fill="#10b981" stackId="a" />
                <Bar dataKey="rejected" name={t('rejected')} fill="#ef4444" stackId="a" />
                <Bar dataKey="pending" name={t('pending')} fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {timingChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('timingChart')}</CardTitle>
            <CardDescription>{t('timingChartDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timingChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis unit="d" />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}d`, '']} />
                <Legend />
                <Line type="monotone" dataKey="classify" name={t('classifyTime')} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="approve" name={t('approveTime')} stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="total" name={t('totalTime')} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">{t('month')}</th>
                  <th className="text-right p-2 font-medium">{t('received')}</th>
                  <th className="text-right p-2 font-medium hidden sm:table-cell">KSeF</th>
                  <th className="text-right p-2 font-medium hidden sm:table-cell">{t('manual')}</th>
                  <th className="text-right p-2 font-medium hidden md:table-cell">{t('classified')}</th>
                  <th className="text-right p-2 font-medium">{t('approved')}</th>
                  <th className="text-right p-2 font-medium hidden lg:table-cell">{t('avgClassifyShort')}</th>
                  <th className="text-right p-2 font-medium hidden lg:table-cell">{t('avgApproveShort')}</th>
                  <th className="text-right p-2 font-medium hidden md:table-cell">{t('avgTotalShort')}</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="p-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="p-2 text-right">{m.totalReceived}</td>
                    <td className="p-2 text-right hidden sm:table-cell">{m.fromKsef}</td>
                    <td className="p-2 text-right hidden sm:table-cell">{m.fromManual}</td>
                    <td className="p-2 text-right hidden md:table-cell">
                      {m.classified}
                      {m.totalReceived > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({Math.round((m.classified / m.totalReceived) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <span className="text-green-600">{m.approved}</span>
                      {m.rejected > 0 && <span className="text-red-600 ml-1">/ {m.rejected}</span>}
                    </td>
                    <td className="p-2 text-right hidden lg:table-cell">{formatDays(m.avgClassifyDays, t)}</td>
                    <td className="p-2 text-right hidden lg:table-cell">{formatDays(m.avgApproveDays, t)}</td>
                    <td className="p-2 text-right hidden md:table-cell">{formatDays(m.avgTotalDays, t)}</td>
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
