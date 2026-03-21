'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useContextPendingApprovals } from '@/hooks/use-api'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface ApprovalsTileProps {
  delay?: number
}

export function ApprovalsTile({ delay = 0 }: ApprovalsTileProps) {
  const t = useTranslations('dashboard.tiles')
  const { data, isLoading } = useContextPendingApprovals()

  const pendingCount = data?.count ?? 0
  const approvals = data?.approvals ?? []

  // Check for SLA breaches
  const now = new Date()
  const pastSlaCount = approvals.filter((a) => {
    if (!a.pendingSince || !a.approvalSlaHours) return false
    const pendingSince = new Date(a.pendingSince)
    const hoursElapsed = (now.getTime() - pendingSince.getTime()) / (1000 * 60 * 60)
    return hoursElapsed > a.approvalSlaHours
  }).length

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
      <Link href="/approvals" className="block h-full">
        <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-l-3 border-l-purple-400">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-500" />
                {t('approvals')}
              </span>
              {pastSlaCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 animate-pulse">
                  {pastSlaCount} {t('pastSla')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-3">
              {pendingCount}
              <span className="text-sm font-normal text-muted-foreground ml-2">{t('pending')}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                {t('awaitingReview')}
              </span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {t('reviewNow')} →
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
