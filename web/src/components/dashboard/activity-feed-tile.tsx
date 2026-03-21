'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  FileText,
  CheckCircle,
  RefreshCw,
  FileStack,
} from 'lucide-react'
import type { ActivityItemType } from '@/lib/api'
import {
  useContextInvoices,
  useContextPendingApprovals,
  useContextSelfBillingInvoices,
} from '@/hooks/use-api'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

interface FeedItem {
  id: string
  type: ActivityItemType
  title: string
  description: string
  amount?: number
  currency?: string
  date: string
  link?: string
}

const typeConfig: Record<
  ActivityItemType,
  { icon: typeof Activity; color: string; bgColor: string }
> = {
  invoice: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  approval: { icon: CheckCircle, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  selfbilling: { icon: FileStack, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  sync: { icon: RefreshCw, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
}

const filterTabs: Array<{ key: ActivityItemType | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'allTypes' },
  { key: 'invoice', labelKey: 'invoices' },
  { key: 'approval', labelKey: 'approvals' },
  { key: 'selfbilling', labelKey: 'selfBillingTab' },
]

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ActivityFeedTileProps {
  delay?: number
}

export function ActivityFeedTile({ delay = 0 }: ActivityFeedTileProps) {
  const t = useTranslations('dashboard.tiles')
  const [activeTab, setActiveTab] = useState<ActivityItemType | 'all'>('all')

  // Fetch from existing deployed endpoints
  const { data: invoicesData, isLoading: invLoading } = useContextInvoices({ top: 10, orderBy: 'invoiceDate', orderDirection: 'desc' })
  const { data: approvalsData, isLoading: appLoading } = useContextPendingApprovals()
  const { data: sbData, isLoading: sbLoading } = useContextSelfBillingInvoices({})

  const isLoading = invLoading && appLoading && sbLoading

  // Build unified feed client-side from existing data
  const items = useMemo<FeedItem[]>(() => {
    const feed: FeedItem[] = []

    // Recent invoices
    for (const inv of invoicesData?.invoices ?? []) {
      feed.push({
        id: inv.id,
        type: 'invoice',
        title: inv.invoiceNumber || inv.referenceNumber || 'Invoice',
        description: inv.supplierName || '',
        amount: inv.grossAmount,
        currency: inv.currency,
        date: inv.importedAt || inv.invoiceDate,
        link: `/invoices/${inv.id}`,
      })
    }

    // Pending approvals (as activity items)
    for (const inv of approvalsData?.approvals ?? []) {
      feed.push({
        id: `approval-${inv.id}`,
        type: 'approval',
        title: inv.invoiceNumber || 'Invoice',
        description: inv.supplierName || '',
        amount: inv.grossAmount,
        currency: inv.currency,
        date: inv.pendingSince || inv.invoiceDate,
        link: `/invoices/${inv.id}`,
      })
    }

    // Self-billing invoices
    for (const sb of sbData?.invoices ?? []) {
      feed.push({
        id: `sb-${sb.id}`,
        type: 'selfbilling',
        title: sb.invoiceNumber || 'SB invoice',
        description: sb.supplierName || '',
        amount: sb.grossAmount,
        currency: sb.currency,
        date: sb.modifiedOn || sb.createdOn || sb.invoiceDate,
        link: '/self-billing',
      })
    }

    // Sort by date descending, take top 15
    feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return feed.slice(0, 15)
  }, [invoicesData, approvalsData, sbData])

  const filtered = activeTab === 'all' ? items : items.filter((i) => i.type === activeTab)

  if (isLoading) {
    return (
      <div className="col-span-12">
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-60" />
                  <Skeleton className="h-2 w-40" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12"
    >
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {t('activityFeed')}
            </span>
            <Badge variant="secondary" className="text-xs">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-5 pb-4">
          {/* Filter tabs */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {filterTabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-2.5 shrink-0"
                onClick={() => setActiveTab(tab.key)}
              >
                {t(tab.labelKey)}
              </Button>
            ))}
          </div>

          {/* Activity list */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('noActivity')}
              </p>
            )}
            {filtered.map((item) => {
              const config = typeConfig[item.type]
              const Icon = config.icon
              const row = (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${config.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.amount != null && (
                      <p className="text-xs font-medium">
                        {formatCurrency(item.amount, item.currency)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(item.date)}
                    </p>
                  </div>
                </div>
              )

              return item.link ? (
                <Link key={item.id} href={item.link} className="block">
                  {row}
                </Link>
              ) : (
                row
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
