import { motion } from 'framer-motion'
import { useIntl } from 'react-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react'
import type { DashboardStats } from '@/lib/types'
import { formatCurrencyCompact, formatNumber } from '@/lib/format'

interface KpiMiniTilesProps {
  stats: DashboardStats
  delay?: number
}

function AnimatedValue({ end, delay = 0, formatFn }: { end: number; delay?: number; formatFn: (n: number) => string }) {
  // Simple display without countup to avoid dependency issues
  return <>{formatFn(end)}</>
}

export function KpiMiniTiles({ stats, delay = 0 }: KpiMiniTilesProps) {
  const intl = useIntl()

  const totalPaid = stats.payments.paid.grossAmount
  const totalAll = stats.totals.grossAmount
  const paidPercent = totalAll > 0 ? (totalPaid / totalAll) * 100 : 0
  const pendingAndOverdue = stats.payments.pending.grossAmount + stats.payments.overdue.grossAmount
  const overdueCount = stats.payments.overdue.count

  const tiles = [
    {
      label: intl.formatMessage({ id: 'dashboard.tiles.allInvoices' }),
      value: stats.totals.invoiceCount,
      format: 'number' as const,
      icon: FileText,
      color: '#64748b',
      subtitle: `${stats.topSuppliers.length} ${intl.formatMessage({ id: 'dashboard.tiles.suppliers' })}`,
    },
    {
      label: intl.formatMessage({ id: 'dashboard.tiles.totalGross' }),
      value: stats.totals.grossAmount,
      format: 'currency' as const,
      icon: DollarSign,
      color: '#3b82f6',
      subtitle: `${intl.formatMessage({ id: 'dashboard.tiles.average' })} ${formatCurrencyCompact(stats.totals.invoiceCount > 0 ? stats.totals.grossAmount / stats.totals.invoiceCount : 0)} ${intl.formatMessage({ id: 'dashboard.tiles.perInvoice' })}`,
    },
    {
      label: intl.formatMessage({ id: 'dashboard.tiles.paid' }),
      value: paidPercent,
      format: 'percent' as const,
      icon: CheckCircle,
      color: '#10b981',
      subtitle: formatCurrencyCompact(totalPaid),
    },
    {
      label: intl.formatMessage({ id: 'dashboard.tiles.pendingAmount' }),
      value: pendingAndOverdue,
      format: 'currency' as const,
      icon: AlertTriangle,
      color: overdueCount > 0 ? '#ef4444' : '#f59e0b',
      subtitle: overdueCount > 0
        ? `${overdueCount} ${intl.formatMessage({ id: 'dashboard.tiles.overdue' })}`
        : `${stats.payments.pending.count} ${intl.formatMessage({ id: 'dashboard.tiles.pendingPayment' })}`,
      pulse: overdueCount > 0,
    },
  ]

  return (
    <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-3 row-span-2">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.08,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <Card className="h-full hover:shadow-md transition-all border-l-3" style={{ borderLeftColor: tile.color }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{tile.label}</span>
                <tile.icon className="h-3.5 w-3.5" style={{ color: tile.color }} />
              </div>
              <div className="text-xl font-bold" style={{ color: tile.color === '#64748b' ? undefined : tile.color }}>
                {tile.format === 'currency'
                  ? formatCurrencyCompact(tile.value)
                  : tile.format === 'percent'
                    ? `${tile.value.toFixed(0)}%`
                    : formatNumber(tile.value)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                {tile.subtitle}
                {tile.pulse && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 animate-pulse">
                    !
                  </Badge>
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
