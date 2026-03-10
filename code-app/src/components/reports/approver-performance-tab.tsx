import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ShieldCheck, Clock, TrendingUp } from 'lucide-react'
import { useReportApproverPerformance } from '@/hooks/use-api'
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
  Cell,
} from 'recharts'

function formatHours(hours: number | null, t: (id: string) => string) {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} ${t('minutes')}`
  if (hours < 24) return `${hours.toFixed(1)} ${t('hours')}`
  return `${(hours / 24).toFixed(1)} ${t('days')}`
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

export function ApproverPerformanceTab() {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id: `reports.approvers.${id}` })
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading } = useReportApproverPerformance(selectedCompany?.id ?? '')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
  if (!report || report.approvers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('noData')}
        </CardContent>
      </Card>
    )
  }

  const { approvers, totals } = report

  const decisionsChartData = approvers.map((a) => ({
    name: a.approverName.split(' ').slice(0, 2).join(' '),
    approved: a.approvedCount,
    rejected: a.rejectedCount,
  }))

  const responseChartData = approvers
    .filter((a) => a.avgResponseHours !== null)
    .map((a) => ({
      name: a.approverName.split(' ').slice(0, 2).join(' '),
      hours: a.avgResponseHours!,
    }))

  return (
    <div className="space-y-4 md:space-y-6">
      <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
        <AnimatedKpiCard
          title={t('totalDecisions')}
          value={totals.totalDecisions}
          format="number"
          icon={ShieldCheck}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`${approvers.length} ${t('approversCount')}`}
          delay={0}
        />
        <AnimatedKpiCard
          title={t('avgResponseTime')}
          value={totals.avgResponseHours ?? 0}
          format="number"
          icon={Clock}
          iconColor="#f59e0b"
          borderColor="#f59e0b"
          subtitle={totals.avgResponseHours !== null ? formatHours(totals.avgResponseHours, t) : '—'}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={t('slaCompliance')}
          value={totals.overallSlaCompliance}
          format="number"
          icon={TrendingUp}
          iconColor={totals.overallSlaCompliance >= 90 ? '#10b981' : totals.overallSlaCompliance >= 70 ? '#f59e0b' : '#ef4444'}
          borderColor={totals.overallSlaCompliance >= 90 ? '#10b981' : totals.overallSlaCompliance >= 70 ? '#f59e0b' : '#ef4444'}
          subtitle={`${totals.overallSlaCompliance}%`}
          delay={0.2}
        />
      </AnimatedCardGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('decisionsChart')}</CardTitle>
            <CardDescription>{t('decisionsChartDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={decisionsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" name={t('approved')} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name={t('rejected')} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {responseChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('responseChart')}</CardTitle>
              <CardDescription>{t('responseChartDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={responseChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis unit="h" />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}h`, t('avgTime')]} />
                  <Bar dataKey="hours" name={t('avgTime')} radius={[4, 4, 0, 0]}>
                    {responseChartData.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">{t('approver')}</th>
                  <th className="text-right p-2 font-medium">{t('decisions')}</th>
                  <th className="text-right p-2 font-medium hidden sm:table-cell">{t('approved')}</th>
                  <th className="text-right p-2 font-medium hidden sm:table-cell">{t('rejected')}</th>
                  <th className="text-right p-2 font-medium">{t('approvalRate')}</th>
                  <th className="text-right p-2 font-medium hidden md:table-cell">{t('avgTime')}</th>
                  <th className="text-right p-2 font-medium hidden lg:table-cell">{t('fastest')}</th>
                  <th className="text-right p-2 font-medium hidden lg:table-cell">{t('slowest')}</th>
                  <th className="p-2 font-medium w-[120px] hidden md:table-cell">{t('sla')}</th>
                </tr>
              </thead>
              <tbody>
                {approvers.map((a) => (
                  <tr key={a.approverOid || a.approverName} className="border-b last:border-0">
                    <td className="p-2 font-medium">{a.approverName}</td>
                    <td className="p-2 text-right">{a.totalDecisions}</td>
                    <td className="p-2 text-right text-green-600 hidden sm:table-cell">{a.approvedCount}</td>
                    <td className="p-2 text-right text-red-600 hidden sm:table-cell">{a.rejectedCount}</td>
                    <td className="p-2 text-right">
                      <Badge variant="outline">{a.approvalRate}%</Badge>
                    </td>
                    <td className="p-2 text-right hidden md:table-cell">{formatHours(a.avgResponseHours, t)}</td>
                    <td className="p-2 text-right hidden lg:table-cell text-green-600">{formatHours(a.minResponseHours, t)}</td>
                    <td className="p-2 text-right hidden lg:table-cell text-red-600">{formatHours(a.maxResponseHours, t)}</td>
                    <td className="p-2 hidden md:table-cell">
                      {(a.withinSlaCount + a.overSlaCount) > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={a.slaComplianceRate}
                            className={`h-2 ${a.slaComplianceRate >= 90 ? '[&>div]:bg-green-500' : a.slaComplianceRate >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`}
                          />
                          <span className="text-xs text-muted-foreground w-10 text-right">{a.slaComplianceRate}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
