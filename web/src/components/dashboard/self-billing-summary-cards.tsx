'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Receipt, FileEdit, Clock, CheckCircle, Send, AlertTriangle } from 'lucide-react'
import { useContextSelfBillingInvoices, useContextSbAgreements } from '@/hooks/use-api'
import { AnimatedCardWrapper } from './animated-kpi-card'

export function SelfBillingSummaryCards() {
  const t = useTranslations('selfBilling')
  const { data, isLoading } = useContextSelfBillingInvoices({})
  const { data: agreementsData } = useContextSbAgreements()

  const counts = useMemo(() => {
    const c = { Draft: 0, PendingSeller: 0, SellerApproved: 0, SentToKsef: 0, total: 0 }
    for (const inv of data?.invoices ?? []) {
      c.total++
      if (inv.status in c) {
        c[inv.status as keyof typeof c]++
      }
    }
    return c
  }, [data])

  const sentThisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return (data?.invoices ?? []).filter((inv) => {
      if (inv.status !== 'SentToKsef') return false
      const d = new Date(inv.sentDate ?? inv.invoiceDate ?? '')
      return d.getMonth() === month && d.getFullYear() === year
    }).length
  }, [data])

  const expiringCount = useMemo(() => {
    const in30days = new Date()
    in30days.setDate(in30days.getDate() + 30)
    return (agreementsData?.agreements ?? []).filter((a) => {
      if (!a.validTo) return false
      const vt = new Date(a.validTo)
      return vt <= in30days
    }).length
  }, [agreementsData])

  if (isLoading || counts.total === 0) return null

  const cards = [
    { key: 'Draft', icon: FileEdit, color: '#64748b', count: counts.Draft },
    { key: 'PendingSeller', icon: Clock, color: '#3b82f6', count: counts.PendingSeller },
    { key: 'SellerApproved', icon: CheckCircle, color: '#10b981', count: counts.SellerApproved },
    { key: 'SentToKsef', icon: Send, color: '#6366f1', count: counts.SentToKsef },
  ] as const

  return (
    <AnimatedCardWrapper delay={1.0}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {cards.map(({ key, icon: Icon, color, count }) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border p-3"
                style={{ borderLeftWidth: 3, borderLeftColor: color }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{t(`status_${key}`)}</p>
                </div>
              </div>
            ))}
            <div
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ borderLeftWidth: 3, borderLeftColor: '#10b981' }}
            >
              <Receipt className="h-5 w-5" style={{ color: '#10b981' }} />
              <div>
                <p className="text-2xl font-bold">{sentThisMonth}</p>
                <p className="text-xs text-muted-foreground">{t('sentThisMonth')}</p>
              </div>
            </div>
            {expiringCount > 0 && (
              <div
                className="flex items-center gap-3 rounded-lg border border-amber-200 p-3"
                style={{ borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-2xl font-bold">{expiringCount}</p>
                  <p className="text-xs text-muted-foreground">{t('expiringAgreements')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AnimatedCardWrapper>
  )
}
