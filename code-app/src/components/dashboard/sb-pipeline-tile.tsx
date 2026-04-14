import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Receipt, AlertTriangle } from 'lucide-react'
import { useSelfBillingInvoices, useSbAgreements } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'

interface SbPipelineTileProps {
  delay?: number
}

export function SbPipelineTile({ delay = 0 }: SbPipelineTileProps) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const settingId = selectedCompany?.id
  const { data, isLoading } = useSelfBillingInvoices(
    settingId ? { settingId } : undefined,
    { enabled: !!settingId }
  )
  const { data: agreementsData } = useSbAgreements(
    settingId ? { settingId } : undefined,
    { enabled: !!settingId }
  )

  const counts = useMemo(() => {
    const c = { Draft: 0, PendingSeller: 0, SellerApproved: 0, SentToKsef: 0 }
    for (const inv of data?.invoices ?? []) {
      if (inv.status in c) {
        c[inv.status as keyof typeof c]++
      }
    }
    return c
  }, [data])

  const expiringCount = useMemo(() => {
    const in30days = new Date()
    in30days.setDate(in30days.getDate() + 30)
    return (agreementsData?.agreements ?? []).filter((a) => {
      if (!a.validTo) return false
      return new Date(a.validTo) <= in30days
    }).length
  }, [agreementsData])

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

  const stages = [
    { key: 'Draft', count: counts.Draft, color: '#64748b' },
    { key: 'PendingSeller', count: counts.PendingSeller, color: '#3b82f6' },
    { key: 'SellerApproved', count: counts.SellerApproved, color: '#10b981' },
    { key: 'SentToKsef', count: counts.SentToKsef, color: '#6366f1' },
  ]

  const total = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12 md:col-span-4"
    >
      <Link to="/self-billing" className="block h-full">
        <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-l-3 border-l-indigo-400">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-500" />
                {intl.formatMessage({ id: 'dashboard.tiles.selfBilling' })}
              </span>
              {expiringCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 text-amber-600 border-amber-300">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  {expiringCount} {intl.formatMessage({ id: 'dashboard.tiles.expiringAgreements' })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            {/* Pipeline visualization */}
            <div className="flex items-center mb-3">
              {stages.map((stage, i) => (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: stage.color }}
                    >
                      {stage.count}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 text-center leading-tight">
                      {intl.formatMessage({ id: `dashboard.tiles.sb${stage.key}` })}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="w-full h-px bg-muted-foreground/30 mt-[-12px]" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{total} {intl.formatMessage({ id: 'dashboard.tiles.totalSb' })}</span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {intl.formatMessage({ id: 'dashboard.tiles.manage' })} →
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
