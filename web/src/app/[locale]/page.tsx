'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { 
  FileText, 
  RefreshCw, 
  AlertCircle, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  TrendingUp,
  Building2,
  LayoutDashboard,
  CreditCard,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useContextInvoices } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { AnimatedKpiCard, AnimatedCardGrid, AnimatedCardWrapper, formatCurrency } from '@/components/dashboard/animated-kpi-card'

export default function HomePage() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  const { data: invoicesData, isLoading: dataLoading } = useContextInvoices()
  const isLoading = companyLoading || dataLoading

  // Calculate stats from invoices
  const invoices = invoicesData?.invoices || []
  const stats = {
    count: invoices.length,
    total: invoices.reduce((acc, inv) => acc + inv.grossAmount, 0),
    paid: invoices.filter(i => i.paymentStatus === 'paid').reduce((acc, inv) => acc + inv.grossAmount, 0),
    pending: invoices.filter(i => i.paymentStatus === 'pending').reduce((acc, inv) => acc + inv.grossAmount, 0),
    avgInvoice: invoices.length > 0 ? invoices.reduce((acc, inv) => acc + inv.grossAmount, 0) / invoices.length : 0,
    uniqueSuppliers: new Set(invoices.map(i => i.supplierNip)).size,
  }

  // Locale-aware formatting
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'PLN' }).format(amount)
  
  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString(locale)
  
  const formatDateTime = (date: string) => 
    new Date(date).toLocaleString(locale)

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title={t('allInvoices')}
          value={stats.count}
          format="number"
          icon={FileText}
          iconColor="#64748b"
          borderColor="#64748b"
          subtitle={`${stats.uniqueSuppliers} ${t('suppliers')}`}
          delay={0}
          isLoading={isLoading}
        />

        <AnimatedKpiCard
          title={t('totalGross')}
          value={stats.total}
          format="currency"
          icon={TrendingUp}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`${t('average')} ${formatCurrency(stats.avgInvoice)} ${t('perInvoice')}`}
          delay={0.1}
          isLoading={isLoading}
        />

        <AnimatedKpiCard
          title={t('paidAmount')}
          value={stats.paid}
          format="currency"
          icon={CreditCard}
          iconColor="#10b981"
          valueColor="#16a34a"
          borderColor="#10b981"
          subtitle={`${stats.count > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : 0}% ${t('ofTotal')}`}
          delay={0.2}
          isLoading={isLoading}
        />

        <AnimatedKpiCard
          title={t('pendingAmount')}
          value={stats.pending}
          format="currency"
          icon={CreditCard}
          iconColor="#ef4444"
          valueColor="#dc2626"
          borderColor="#ef4444"
          subtitle={`${stats.count > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}% ${t('ofTotal')}`}
          delay={0.3}
          isLoading={isLoading}
        />
      </AnimatedCardGrid>

      {/* Quick Actions */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatedCardWrapper delay={0.4}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-blue-500" />
                {t('incomingInvoices')}
              </CardTitle>
              <CardDescription>
                {t('incomingInvoicesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/invoices">
                  {t('browseInvoices')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>

        <AnimatedCardWrapper delay={0.5}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                {t('synchronization')}
              </CardTitle>
              <CardDescription>
                {t('synchronizationDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/sync">
                  {t('syncPanel')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>

        <AnimatedCardWrapper delay={0.6}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                {t('reports')}
              </CardTitle>
              <CardDescription>
                {t('reportsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/reports">
                  {t('viewReports')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>
      </div>

      {/* Recent Activity */}
      <AnimatedCardWrapper delay={0.7}>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>{t('recentActivity')}</CardTitle>
            <CardDescription>{t('recentActivityDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {t('noInvoices')}
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map((invoice) => (
                  <Link 
                    key={invoice.id} 
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{invoice.supplierName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(invoice.grossAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invoice.invoiceDate)}
                      </p>
                    </div>
                  </Link>
                ))}
                {invoices.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="link" asChild>
                      <Link href="/invoices">{t('viewAll', { count: invoices.length })}</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </AnimatedCardWrapper>
    </div>
  )
}
