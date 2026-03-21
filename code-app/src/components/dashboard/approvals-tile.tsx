import { motion } from 'framer-motion'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Clock } from 'lucide-react'
import { usePendingApprovals } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'

interface ApprovalsTileProps {
  delay?: number
}

export function ApprovalsTile({ delay = 0 }: ApprovalsTileProps) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading } = usePendingApprovals(selectedCompany?.id ?? '')

  const pendingCount = data?.count ?? 0
  const approvals = data?.approvals ?? []

  const overdueCount = approvals.filter((a) => a.isOverdue).length

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12 md:col-span-4"
    >
      <Link to="/approvals" className="block h-full">
        <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-l-3 border-l-purple-400">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-500" />
                {intl.formatMessage({ id: 'dashboard.tiles.approvals' })}
              </span>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 animate-pulse">
                  {overdueCount} {intl.formatMessage({ id: 'dashboard.tiles.pastSla' })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-3">
              {pendingCount}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {intl.formatMessage({ id: 'dashboard.tiles.pending' })}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                {intl.formatMessage({ id: 'dashboard.tiles.awaitingReview' })}
              </span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {intl.formatMessage({ id: 'dashboard.tiles.reviewNow' })} →
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
