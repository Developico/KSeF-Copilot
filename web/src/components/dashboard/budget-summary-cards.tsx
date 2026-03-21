'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'
import { useContextBudgetSummary, useContextPendingApprovals } from '@/hooks/use-api'
import { AnimatedCardWrapper, AnimatedKpiCard, AnimatedCardGrid } from './animated-kpi-card'
import type { BudgetStatus } from '@/lib/api'
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

export function BudgetSummaryCards() {
  const t = useTranslations('dashboard.budget')
  const { data: budgetData, isLoading: budgetLoading } = useContextBudgetSummary()
  const { data: approvalsData, isLoading: approvalsLoading } = useContextPendingApprovals()

  const budgetStatuses = budgetData?.data ?? []
  const pendingCount = approvalsData?.count ?? 0

  if (budgetLoading || approvalsLoading) return null
  if (budgetStatuses.length === 0 && pendingCount === 0) return null

  const totalBudget = budgetStatuses.reduce((sum, b) => sum + b.budgetAmount, 0)
  const totalUtilized = budgetStatuses.reduce((sum, b) => sum + b.utilized, 0)
  const overallPercent = totalBudget > 0 ? (totalUtilized / totalBudget) * 100 : 0
  const warningCount = budgetStatuses.filter((b) => b.isWarning && !b.isExceeded).length
  const exceededCount = budgetStatuses.filter((b) => b.isExceeded).length

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <AnimatedCardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pendingCount > 0 && (
          <AnimatedKpiCard
            title={t('pendingApprovals')}
            value={pendingCount}
            format="number"
            icon={AlertTriangle}
            iconColor="#f59e0b"
            valueColor="#ca8a04"
            borderColor="#f59e0b"
            subtitle={t('awaitingDecision')}
            delay={0}
          />
        )}

        {totalBudget > 0 && (
          <AnimatedKpiCard
            title={t('totalBudget')}
            value={totalBudget}
            format="currency"
            icon={DollarSign}
            iconColor="#3b82f6"
            borderColor="#3b82f6"
            subtitle={t('utilization', { percent: overallPercent.toFixed(0) })}
            delay={0.1}
          />
        )}

        {exceededCount > 0 && (
          <AnimatedKpiCard
            title={t('exceeded')}
            value={exceededCount}
            format="number"
            icon={AlertTriangle}
            iconColor="#ef4444"
            valueColor="#dc2626"
            borderColor="#ef4444"
            subtitle={t('mpkOverBudget')}
            delay={0.2}
          />
        )}

        {warningCount > 0 && (
          <AnimatedKpiCard
            title={t('warnings')}
            value={warningCount}
            format="number"
            icon={TrendingUp}
            iconColor="#f97316"
            valueColor="#ea580c"
            borderColor="#f97316"
            subtitle={t('above80')}
            delay={0.3}
          />
        )}
      </AnimatedCardGrid>

      {/* Budget per MPK breakdown */}
      {budgetStatuses.length > 0 && (
        <AnimatedCardWrapper delay={0.4}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('mpkBudgets')}
              </CardTitle>
              <CardDescription>{t('mpkBudgetsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetStatuses.map((b) => (
                  <BudgetRow key={b.mpkCenterId} status={b} t={t} />
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>
      )}
    </div>
  )
}

function BudgetRow({
  status,
  t,
}: {
  status: BudgetStatus
  t: ReturnType<typeof useTranslations>
}) {
  const percent = Math.min(status.utilizationPercent, 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{status.mpkCenterName}</span>
          {status.isExceeded && (
            <Badge variant="destructive" className="text-xs">
              {t('exceededBadge')}
            </Badge>
          )}
          {status.isWarning && !status.isExceeded && (
            <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300 bg-yellow-50">
              {t('warningBadge')}
            </Badge>
          )}
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {formatCurrency(status.utilized)} / {formatCurrency(status.budgetAmount)}
        </span>
      </div>
      <Progress
        value={percent}
        className={
          status.isExceeded
            ? '[&>div]:bg-destructive'
            : status.isWarning
              ? '[&>div]:bg-yellow-500'
              : ''
        }
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{status.utilizationPercent.toFixed(1)}%</span>
        <span>
          {t('remaining')}: {formatCurrency(status.remaining)}
        </span>
      </div>
    </div>
  )
}
