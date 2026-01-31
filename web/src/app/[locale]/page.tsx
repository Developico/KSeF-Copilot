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
  Zap,
  LayoutDashboard,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useKsefStatus, useInvoices, useRunSync } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'

export default function HomePage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { toast } = useToast()
  const { data: ksefStatus, isLoading: isStatusLoading } = useKsefStatus()
  const { data: invoicesData, isLoading: isInvoicesLoading, refetch: refetchInvoices } = useInvoices()
  const syncMutation = useRunSync()

  const isLoading = isStatusLoading || isInvoicesLoading
  const isSyncing = syncMutation.isPending

  // Calculate stats from invoices
  const invoices = invoicesData?.invoices || []
  const stats = {
    totalInvoices: invoices.length,
    pendingPayment: invoices.filter(i => i.paymentStatus === 'pending').length,
    paid: invoices.filter(i => i.paymentStatus === 'paid').length,
    incoming: invoices.length, // All invoices from sync are incoming (cost invoices)
    outgoing: 0,
    lastSyncAt: ksefStatus?.lastSync,
    ksefConnected: ksefStatus?.isConnected || false,
    activeCompanies: 1,
  }

  async function handleSync() {
    try {
      const result = await syncMutation.mutateAsync(undefined)
      await refetchInvoices()
      toast({
        title: t('syncCompleted'),
        description: t('syncCompletedDesc', { count: result.imported }),
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: t('syncError'),
        description: error instanceof Error ? error.message : tCommon('error'),
        variant: 'destructive',
      })
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={stats.ksefConnected ? 'default' : 'destructive'} className="text-xs">
            <Zap className="mr-1 h-3 w-3" />
            {stats.ksefConnected ? t('ksefConnected') : t('ksefDisconnected')}
          </Badge>
          <Button onClick={handleSync} disabled={isSyncing} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? t('syncing') : t('sync')}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {stats.lastSyncAt && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t('lastSync')}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(stats.lastSyncAt)}
              </p>
            </div>
            <Badge variant="outline">
              <Building2 className="mr-1 h-3 w-3" />
              {t('companies', { count: stats.activeCompanies })}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Sync Error */}
      {syncMutation.isError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{t('syncError')}</p>
              <p className="text-xs text-muted-foreground">
                {syncMutation.error instanceof Error ? syncMutation.error.message : tCommon('error')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalInvoices')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : stats.totalInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('inSystem')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('incoming')}</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : stats.incoming}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('costInvoices')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('paid')}</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '—' : stats.paid}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('completedPayments')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pendingPayment')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {isLoading ? '—' : stats.pendingPayment}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('toPay')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
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

        <Card>
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

        <Card>
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
      </div>

      {/* Recent Activity */}
      <Card>
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
    </div>
  )
}
