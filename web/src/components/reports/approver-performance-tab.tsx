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
import { ShieldCheck, Clock, Users, TrendingUp } from 'lucide-react'
import { useContextApproverPerformanceReport } from '@/hooks/use-api'
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
  Cell,
} from 'recharts'

function formatHours(hours: number | null, t: ReturnType<typeof useTranslations>) {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} ${t('minutes')}`
  if (hours < 24) return `${hours.toFixed(1)} ${t('hours')}`
  return `${(hours / 24).toFixed(1)} ${t('days')}`
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

export function ApproverPerformanceTab() {
  const t = useTranslations('reports.approvers')
  const locale = useLocale()
  const { data, isLoading } = useContextApproverPerformanceReport()

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

  // Chart: decisions per approver
  const decisionsChartData = approvers.map((a) => ({
    name: a.approverName.split(' ').slice(0, 2).join(' '),
    approved: a.approvedCount,
    rejected: a.rejectedCount,
  }))

  // Chart: avg response time per approver
  const responseChartData = approvers
    .filter((a) => a.avgResponseHours !== null)
    .map((a) => ({
      name: a.approverName.split(' ').slice(0, 2).join(' '),
      hours: a.avgResponseHours!,
    }))

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
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
          value={totals.overallSlaComplianceRate}
          format="number"
          icon={TrendingUp}
          iconColor={totals.overallSlaComplianceRate >= 90 ? '#10b981' : totals.overallSlaComplianceRate >= 70 ? '#f59e0b' : '#ef4444'}
          borderColor={totals.overallSlaComplianceRate >= 90 ? '#10b981' : totals.overallSlaComplianceRate >= 70 ? '#f59e0b' : '#ef4444'}
          subtitle={`${totals.overallSlaComplianceRate}%`}
          delay={0.2}
        />
      </AnimatedCardGrid>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Decisions by approver */}
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

        {/* Response time by approver */}
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

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('approver')}</TableHead>
                  <TableHead className="text-right">{t('decisions')}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{t('approved')}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{t('rejected')}</TableHead>
                  <TableHead className="text-right">{t('approvalRate')}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t('avgTime')}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t('fastest')}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t('slowest')}</TableHead>
                  <TableHead className="w-[120px] hidden md:table-cell">{t('sla')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvers.map((a) => (
                  <TableRow key={a.approverOid || a.approverName}>
                    <TableCell className="font-medium">{a.approverName}</TableCell>
                    <TableCell className="text-right">{a.totalDecisions}</TableCell>
                    <TableCell className="text-right text-green-600 hidden sm:table-cell">{a.approvedCount}</TableCell>
                    <TableCell className="text-right text-red-600 hidden sm:table-cell">{a.rejectedCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{a.approvalRate}%</Badge>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">{formatHours(a.avgResponseHours, t)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-green-600">{formatHours(a.minResponseHours, t)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-red-600">{formatHours(a.maxResponseHours, t)}</TableCell>
                    <TableCell className="hidden md:table-cell">
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
