import { motion } from 'framer-motion'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { DollarSign } from 'lucide-react'
import { useBudgetSummary } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'

interface BudgetTileProps {
  delay?: number
}

export function BudgetTile({ delay = 0 }: BudgetTileProps) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading } = useBudgetSummary(selectedCompany?.id ?? '')

  const budgetStatuses = data?.data ?? []

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="col-span-12 md:col-span-4"
      >
        <Card className="h-full">
          <CardContent className="p-5">
            <div className="h-28 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (budgetStatuses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="col-span-12 md:col-span-4"
      >
        <Card className="h-full border-l-3 border-l-sky-400">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-sky-500" />
              {intl.formatMessage({ id: 'dashboard.tiles.budget' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'dashboard.tiles.noBudgets' })}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const sorted = [...budgetStatuses].sort((a, b) => b.utilizationPercent - a.utilizationPercent)
  const top = sorted.slice(0, 3)
  const exceededCount = budgetStatuses.filter((b) => b.isExceeded).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12 md:col-span-4"
    >
      <Link to="/settings?tab=costcenters" className="block h-full">
        <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-l-3 border-l-sky-400">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-sky-500" />
                {intl.formatMessage({ id: 'dashboard.tiles.budget' })}
              </span>
              {exceededCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5">
                  {exceededCount} {intl.formatMessage({ id: 'dashboard.tiles.exceeded' })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="space-y-2.5">
              {top.map((b) => {
                const percent = Math.min(b.utilizationPercent, 100)
                const progressClass = b.isExceeded
                  ? '[&>div]:bg-destructive'
                  : b.isWarning
                    ? '[&>div]:bg-yellow-500'
                    : '[&>div]:bg-sky-500'

                return (
                  <div key={b.mpkCenterId} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground truncate max-w-[120px]">{b.mpkCenterName}</span>
                      <span className="font-mono text-muted-foreground">{b.utilizationPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={percent} className={`h-1.5 ${progressClass}`} />
                  </div>
                )
              })}
            </div>
            {budgetStatuses.length > 3 && (
              <p className="text-[10px] text-muted-foreground mt-2">
                +{budgetStatuses.length - 3} {intl.formatMessage({ id: 'dashboard.tiles.more' })}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
