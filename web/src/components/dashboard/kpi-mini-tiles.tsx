'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react'
import type { DashboardStats } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

interface KpiMiniTilesProps {
  stats: DashboardStats
  delay?: number
}

export function KpiMiniTiles({ stats, delay = 0 }: KpiMiniTilesProps) {
  const t = useTranslations('dashboard.tiles')

  const totalPaid = stats.payments.paid.grossAmount
  const totalAll = stats.totals.grossAmount
  const paidPercent = totalAll > 0 ? (totalPaid / totalAll) * 100 : 0
  const pendingAndOverdue = stats.payments.pending.grossAmount + stats.payments.overdue.grossAmount
  const overdueCount = stats.payments.overdue.count

  const tiles = [
    {
      label: t('allInvoices'),
      value: stats.totals.invoiceCount,
      format: 'number' as const,
      icon: FileText,
      color: '#64748b',
      subtitle: `${stats.topSuppliers.length} ${t('suppliers')}`,
    },
    {
      label: t('totalGross'),
      value: stats.totals.grossAmount,
      format: 'currency' as const,
      icon: DollarSign,
      color: '#3b82f6',
      subtitle: `${t('average')} ${formatCurrency(stats.totals.invoiceCount > 0 ? stats.totals.grossAmount / stats.totals.invoiceCount : 0)} ${t('perInvoice')}`,
    },
    {
      label: t('paid'),
      value: paidPercent,
      format: 'percent' as const,
      icon: CheckCircle,
      color: '#10b981',
      subtitle: formatCurrency(totalPaid),
    },
    {
      label: t('pendingAmount'),
      value: pendingAndOverdue,
      format: 'currency' as const,
      icon: AlertTriangle,
      color: overdueCount > 0 ? '#ef4444' : '#f59e0b',
      subtitle: overdueCount > 0
        ? `${overdueCount} ${t('overdue')}`
        : `${stats.payments.pending.count} ${t('pendingPayment')}`,
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
                {tile.format === 'currency' ? (
                  <CountUp
                    start={0}
                    end={tile.value}
                    duration={1.5}
                    delay={delay + i * 0.08}
                    separator=" "
                    decimal=","
                    decimals={0}
                    formattingFn={formatCurrency}
                  />
                ) : tile.format === 'percent' ? (
                  <CountUp
                    start={0}
                    end={tile.value}
                    duration={1.5}
                    delay={delay + i * 0.08}
                    decimals={0}
                    suffix="%"
                  />
                ) : (
                  <CountUp
                    start={0}
                    end={tile.value}
                    duration={1.5}
                    delay={delay + i * 0.08}
                    separator=" "
                  />
                )}
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
