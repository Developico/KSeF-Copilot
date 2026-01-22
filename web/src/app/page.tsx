'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  TrendingUp,
  Building2,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalInvoices: number
  pendingPayment: number
  paid: number
  incoming: number
  outgoing: number
  lastSyncAt?: string
  ksefConnected: boolean
  activeCompanies: number
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    pendingPayment: 0,
    paid: 0,
    incoming: 0,
    outgoing: 0,
    ksefConnected: false,
    activeCompanies: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      // TODO: Load from API
      // const response = await fetch('/api/stats')
      // const data = await response.json()
      // setStats(data)
      
      // Mock data for now
      setStats({
        totalInvoices: 156,
        pendingPayment: 12,
        paid: 144,
        incoming: 89,
        outgoing: 67,
        lastSyncAt: new Date().toISOString(),
        ksefConnected: true,
        activeCompanies: 3,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      // TODO: Trigger sync
      // await fetch('/api/ksef/sync/incoming', { method: 'POST' })
      await new Promise(resolve => setTimeout(resolve, 2000))
      await loadStats()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
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
              W tym miesiącu
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
            <CardTitle className="text-sm font-medium">Wychodzące</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : stats.outgoing}
            </div>
            <p className="text-xs text-muted-foreground">
              Faktury sprzedaży
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
              <Link href="/invoices?direction=incoming">
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
          <CardDescription>Ostatnio przetworzone faktury</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie...</p>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Brak ostatniej aktywności. Uruchom synchronizację, aby pobrać faktury.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
