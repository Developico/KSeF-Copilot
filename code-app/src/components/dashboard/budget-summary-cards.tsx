import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'
import { useBudgetSummary } from '@/hooks/use-api'
import type { BudgetStatus } from '@/lib/types'

function BudgetBar({ status }: { status: BudgetStatus }) {
  const pct = status.utilizationPercent
  const barColor = status.isExceeded
    ? 'bg-red-500'
    : status.isWarning
      ? 'bg-amber-500'
      : 'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate">{status.mpkCenterName}</span>
        <div className="flex items-center gap-2">
          {status.isExceeded && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {pct.toFixed(0)}%
            </Badge>
          )}
          {status.isWarning && !status.isExceeded && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
              {pct.toFixed(0)}%
            </Badge>
          )}
          {!status.isWarning && !status.isExceeded && (
            <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
          )}
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {status.utilized.toLocaleString('pl-PL')} / {status.budgetAmount.toLocaleString('pl-PL')} PLN
        </span>
        <span>
          {status.invoiceCount} inv.
        </span>
      </div>
    </div>
  )
}

export function BudgetSummaryCards({ settingId }: { settingId: string }) {
  const intl = useIntl()
  const { data, isLoading } = useBudgetSummary(settingId, {
    enabled: !!settingId,
  })

  const budgets = data?.data ?? []
  if (!isLoading && budgets.length === 0) return null

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0)
  const totalUtilized = budgets.reduce((s, b) => s + b.utilized, 0)
  const overallPct = totalBudget > 0 ? (totalUtilized / totalBudget) * 100 : 0
  const warningCount = budgets.filter((b) => b.isWarning || b.isExceeded).length

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {intl.formatMessage({ id: 'budget.summaryTitle' })}
          {warningCount > 0 && (
            <Badge variant="destructive" className="text-xs ml-auto">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {warningCount}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <TrendingUp className="h-3 w-3 inline mr-0.5" />
            {overallPct.toFixed(0)}% {intl.formatMessage({ id: 'budget.overall' })}
          </span>
          <span>
            {totalUtilized.toLocaleString('pl-PL')} / {totalBudget.toLocaleString('pl-PL')} PLN
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((b) => (
          <BudgetBar key={b.mpkCenterId} status={b} />
        ))}
      </CardContent>
    </Card>
  )
}
