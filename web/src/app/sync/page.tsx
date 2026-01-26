'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Calendar,
  Download,
  Play,
  Square,
  Clock,
  FileText,
  ArrowDownToLine,
} from 'lucide-react'
import {
  useKsefStatus,
  useKsefSession,
  useStartSession,
  useEndSession,
  useSyncPreview,
  useRunSync,
  useImportInvoices,
} from '@/hooks/use-api'
import { RequireRole } from '@/components/auth/auth-provider'

export default function SyncPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [syncLog, setSyncLog] = useState<string[]>([])

  // Queries
  const { data: status, isLoading: isLoadingStatus } = useKsefStatus()
  const { data: sessionData, isLoading: isLoadingSession } = useKsefSession()
  const { 
    data: previewData, 
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useSyncPreview({ 
    dateFrom, 
    dateTo, 
    enabled: Boolean(sessionData?.session),
  })

  // Mutations
  const startSessionMutation = useStartSession()
  const endSessionMutation = useEndSession()
  const runSyncMutation = useRunSync()
  const importMutation = useImportInvoices()

  const session = sessionData?.session
  const newInvoices = previewData?.invoices.filter(inv => !inv.alreadyImported) || []

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('pl-PL')
    setSyncLog(prev => [...prev, `[${timestamp}] ${message}`])
  }

  async function handleStartSession() {
    addLog('Inicjalizacja sesji KSeF...')
    try {
      await startSessionMutation.mutateAsync(undefined)
      addLog('Sesja została uruchomiona pomyślnie.')
    } catch (error) {
      addLog(`Błąd podczas uruchamiania sesji: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  async function handleEndSession() {
    addLog('Zamykanie sesji KSeF...')
    try {
      await endSessionMutation.mutateAsync()
      addLog('Sesja została zamknięta.')
    } catch (error) {
      addLog(`Błąd podczas zamykania sesji: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  async function handlePreview() {
    addLog(`Pobieranie listy faktur od ${dateFrom} do ${dateTo}...`)
    await refetchPreview()
    addLog(`Znaleziono ${previewData?.total || 0} faktur, ${previewData?.new || 0} nowych.`)
  }

  async function handleSyncAll() {
    addLog(`Rozpoczynam pełną synchronizację...`)
    try {
      const result = await runSyncMutation.mutateAsync({ dateFrom, dateTo })
      addLog(`Zaimportowano ${result.imported} faktur, pominięto ${result.skipped}, błędów: ${result.failed}`)
      await refetchPreview()
    } catch (error) {
      addLog(`Błąd synchronizacji: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  async function handleImportSelected() {
    if (selectedInvoices.size === 0) return
    
    const refs = Array.from(selectedInvoices)
    addLog(`Importowanie ${refs.length} wybranych faktur...`)
    
    try {
      const result = await importMutation.mutateAsync({ referenceNumbers: refs })
      addLog(`Zaimportowano ${result.imported} faktur, błędów: ${result.failed}`)
      setSelectedInvoices(new Set())
      await refetchPreview()
    } catch (error) {
      addLog(`Błąd importu: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  function toggleInvoiceSelection(ref: string) {
    setSelectedInvoices(prev => {
      const next = new Set(prev)
      if (next.has(ref)) {
        next.delete(ref)
      } else {
        next.add(ref)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedInvoices.size === newInvoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(newInvoices.map(inv => inv.ksefReferenceNumber)))
    }
  }

  const isLoading = isLoadingStatus || isLoadingSession
  const isSyncing = runSyncMutation.isPending || importMutation.isPending

  return (
    <RequireRole role="Admin" fallback={
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Brak uprawnień do synchronizacji faktur.</p>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Synchronizacja KSeF</h1>
          <p className="text-muted-foreground">
            Pobierz nowe faktury z Krajowego Systemu e-Faktur
          </p>
        </div>

        {/* Status and Session */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* KSeF Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status?.isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                Status połączenia KSeF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
              ) : status ? (
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Połączony:</span>
                    <Badge variant={status.isConnected ? 'default' : 'destructive'}>
                      {status.isConnected ? 'Tak' : 'Nie'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Środowisko:</span>
                    <span className="font-medium">{status.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NIP:</span>
                    <span className="font-mono">{status.nip}</span>
                  </div>
                  {status.tokenExpiringSoon && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Token wygasa za {status.daysUntilExpiry} dni</span>
                    </div>
                  )}
                  {status.error && (
                    <div className="text-destructive text-xs">{status.error}</div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Brak danych o statusie</p>
              )}
            </CardContent>
          </Card>

          {/* Session Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {session ? (
                  <Zap className="h-5 w-5 text-green-500" />
                ) : (
                  <Zap className="h-5 w-5 text-muted-foreground" />
                )}
                Sesja KSeF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session ? (
                <>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="default">Aktywna</Badge>
                    </div>
                    {session.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wygasa:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.expiresAt).toLocaleTimeString('pl-PL')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Przetworzone:</span>
                      <span className="font-medium">{session.invoicesProcessed}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleEndSession}
                    disabled={endSessionMutation.isPending}
                  >
                    {endSessionMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="mr-2 h-4 w-4" />
                    )}
                    Zakończ sesję
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Brak aktywnej sesji. Uruchom sesję, aby móc synchronizować faktury.
                  </p>
                  <Button 
                    onClick={handleStartSession} 
                    disabled={startSessionMutation.isPending || !status?.isConnected}
                  >
                    {startSessionMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    {startSessionMutation.isPending ? 'Łączenie...' : 'Uruchom sesję'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sync Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Pobierz faktury
            </CardTitle>
            <CardDescription>
              Wybierz zakres dat i pobierz nowe faktury zakupowe z KSeF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data od
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data do
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={handlePreview} 
                  disabled={!session || isLoadingPreview}
                  className="w-full"
                >
                  {isLoadingPreview ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Podgląd
                </Button>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSyncAll} 
                  disabled={!session || isSyncing}
                  className="w-full"
                >
                  {isSyncing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isSyncing ? 'Synchronizacja...' : 'Synchronizuj wszystko'}
                </Button>
              </div>
            </div>
            
            {!session && (
              <p className="text-sm text-muted-foreground">
                Uruchom sesję KSeF, aby móc synchronizować faktury.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Preview */}
        {previewData && previewData.invoices.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Znalezione faktury</CardTitle>
                <CardDescription>
                  {newInvoices.length > 0 
                    ? `${newInvoices.length} nowych faktur do zaimportowania z ${previewData.total} znalezionych`
                    : 'Wszystkie faktury zostały już zaimportowane'}
                </CardDescription>
              </div>
              {selectedInvoices.size > 0 && (
                <Button 
                  onClick={handleImportSelected}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Importuj wybrane ({selectedInvoices.size})
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedInvoices.size === newInvoices.length && newInvoices.length > 0}
                        onCheckedChange={toggleSelectAll}
                        disabled={newInvoices.length === 0}
                      />
                    </TableHead>
                    <TableHead>Numer faktury</TableHead>
                    <TableHead>Sprzedawca</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Kwota brutto</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.invoices.map((invoice) => (
                    <TableRow key={invoice.ksefReferenceNumber}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedInvoices.has(invoice.ksefReferenceNumber)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.ksefReferenceNumber)}
                          disabled={invoice.alreadyImported}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {invoice.ksefReferenceNumber.slice(0, 20)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{invoice.supplierName}</div>
                          <div className="text-xs text-muted-foreground">{invoice.supplierNip}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pl-PL', {
                          style: 'currency',
                          currency: 'PLN',
                        }).format(invoice.grossAmount)}
                      </TableCell>
                      <TableCell>
                        {invoice.alreadyImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Zaimportowana
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Nowa
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Operation Log */}
        {syncLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dziennik operacji
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                {syncLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RequireRole>
  )
}
