'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  RefreshCw, 
  AlertCircle, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  TrendingUp,
  Building2,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { useKsefStatus, useInvoices, useRunSync } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'

export default function HomePage() {
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
        title: 'Synchronizacja zakończona',
        description: `Zaimportowano ${result.imported} faktur`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Błąd synchronizacji',
        description: error instanceof Error ? error.message : 'Nieznany błąd',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Zarządzaj fakturami kosztowymi z KSeF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={stats.ksefConnected ? 'default' : 'destructive'}>
            <Zap className="mr-1 h-3 w-3" />
            {stats.ksefConnected ? 'Połączono z KSeF' : 'Brak połączenia'}
          </Badge>
          <Button onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizacja...' : 'Synchronizuj'}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {stats.lastSyncAt && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Ostatnia synchronizacja</p>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.lastSyncAt).toLocaleString('pl-PL')}
              </p>
            </div>
            <Badge variant="outline">
              <Building2 className="mr-1 h-3 w-3" />
              {stats.activeCompanies} firm
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
              <p className="text-sm font-medium text-destructive">Błąd synchronizacji</p>
              <p className="text-xs text-muted-foreground">
                {syncMutation.error instanceof Error ? syncMutation.error.message : 'Unknown error'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie faktury</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : stats.totalInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              W systemie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychodzące</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : stats.incoming}
            </div>
            <p className="text-xs text-muted-foreground">
              Faktury kosztowe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opłacone</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '—' : stats.paid}
            </div>
            <p className="text-xs text-muted-foreground">
              Zakończone płatności
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {isLoading ? '—' : stats.pendingPayment}
            </div>
            <p className="text-xs text-muted-foreground">
              Do opłacenia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-blue-500" />
              Faktury przychodzące
            </CardTitle>
            <CardDescription>
              Przeglądaj i kategoryzuj faktury kosztowe pobrane z KSeF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/invoices">
                Przeglądaj faktury
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Synchronizacja
            </CardTitle>
            <CardDescription>
              Pobierz nowe faktury z KSeF i zsynchronizuj status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sync">
                Panel synchronizacji
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Raporty
            </CardTitle>
            <CardDescription>
              Analizuj koszty i generuj zestawienia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/reports">
                Zobacz raporty
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Ostatnia aktywność</CardTitle>
          <CardDescription>Ostatnio zaimportowane faktury</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Brak faktur w systemie. Uruchom synchronizację, aby pobrać faktury.
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
                        {new Intl.NumberFormat('pl-PL', {
                          style: 'currency',
                          currency: 'PLN',
                        }).format(invoice.grossAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </Link>
                ))}
                {invoices.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="link" asChild>
                      <Link href="/invoices">Zobacz wszystkie ({invoices.length})</Link>
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
