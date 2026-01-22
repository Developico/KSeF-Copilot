'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Building2,
  Calendar,
  Download,
  Play,
  Square,
  Clock,
  FileText,
  ArrowDownToLine,
} from 'lucide-react'

interface KsefSession {
  sessionId: string
  nip: string
  status: 'active' | 'expired' | 'error'
  expiresAt: string
  invoicesProcessed: number
}

interface Company {
  id: string
  name: string
  nip: string
  hasActiveSession: boolean
}

interface SyncResult {
  invoiceNumber: string
  ksefReference: string
  sellerName: string
  issueDate: string
  grossAmount: number
  status: 'new' | 'imported' | 'error'
}

// Mock data
const mockCompanies: Company[] = [
  { id: '1', name: 'Developico Sp. z o.o.', nip: '1234567890', hasActiveSession: true },
  { id: '2', name: 'Test Company S.A.', nip: '0987654321', hasActiveSession: false },
]

const mockSession: KsefSession = {
  sessionId: 'sess_abc123',
  nip: '1234567890',
  status: 'active',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  invoicesProcessed: 156,
}

const mockSyncResults: SyncResult[] = [
  {
    invoiceNumber: 'FV/2024/01/099',
    ksefReference: '1122334455-20240120-ABCD1234',
    sellerName: 'New Supplier Ltd.',
    issueDate: '2024-01-20',
    grossAmount: 3690.00,
    status: 'new',
  },
  {
    invoiceNumber: 'FV/2024/01/100',
    ksefReference: '5566778899-20240121-EFGH5678',
    sellerName: 'Another Vendor',
    issueDate: '2024-01-21',
    grossAmount: 1230.00,
    status: 'new',
  },
]

export default function SyncPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [session, setSession] = useState<KsefSession | null>(null)
  const [syncResults, setSyncResults] = useState<SyncResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isStartingSession, setIsStartingSession] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [syncLog, setSyncLog] = useState<string[]>([])

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadSessionStatus()
    }
  }, [selectedCompany])

  async function loadCompanies() {
    try {
      // TODO: Load from API
      setCompanies(mockCompanies)
      if (mockCompanies.length > 0) {
        setSelectedCompany(mockCompanies[0].id)
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSessionStatus() {
    try {
      // TODO: Load from API
      const company = companies.find(c => c.id === selectedCompany)
      if (company?.hasActiveSession) {
        setSession(mockSession)
      } else {
        setSession(null)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  async function startSession() {
    setIsStartingSession(true)
    addLog('Inicjalizacja sesji KSeF...')
    try {
      // TODO: Call API
      await new Promise(resolve => setTimeout(resolve, 2000))
      addLog('Sesja została uruchomiona pomyślnie.')
      setSession(mockSession)
    } catch (error) {
      addLog('Błąd podczas uruchamiania sesji.')
      console.error('Failed to start session:', error)
    } finally {
      setIsStartingSession(false)
    }
  }

  async function endSession() {
    addLog('Zamykanie sesji KSeF...')
    try {
      // TODO: Call API
      await new Promise(resolve => setTimeout(resolve, 1000))
      addLog('Sesja została zamknięta.')
      setSession(null)
    } catch (error) {
      addLog('Błąd podczas zamykania sesji.')
      console.error('Failed to end session:', error)
    }
  }

  async function syncInvoices() {
    if (!session) return
    
    setIsSyncing(true)
    setSyncResults([])
    addLog(`Rozpoczynam synchronizację faktur od ${dateFrom || 'początku'} do ${dateTo || 'teraz'}...`)
    
    try {
      // TODO: Call API
      await new Promise(resolve => setTimeout(resolve, 3000))
      addLog(`Znaleziono ${mockSyncResults.length} nowych faktur.`)
      setSyncResults(mockSyncResults)
    } catch (error) {
      addLog('Błąd podczas synchronizacji.')
      console.error('Failed to sync:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  async function importInvoices() {
    const newInvoices = syncResults.filter(r => r.status === 'new')
    addLog(`Importowanie ${newInvoices.length} faktur...`)
    
    try {
      // TODO: Call API
      await new Promise(resolve => setTimeout(resolve, 2000))
      setSyncResults(prev => prev.map(r => ({ ...r, status: 'imported' as const })))
      addLog('Import zakończony pomyślnie.')
    } catch (error) {
      addLog('Błąd podczas importu.')
      console.error('Failed to import:', error)
    }
  }

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('pl-PL')
    setSyncLog(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const selectedCompanyData = companies.find(c => c.id === selectedCompany)
  const newInvoicesCount = syncResults.filter(r => r.status === 'new').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Synchronizacja KSeF</h1>
        <p className="text-muted-foreground">
          Pobierz nowe faktury z Krajowego Systemu e-Faktur
        </p>
      </div>

      {/* Company Selector and Session Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Firma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz firmę" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      <span>{company.name}</span>
                      {company.hasActiveSession && (
                        <Badge variant="outline" className="ml-2">
                          <Zap className="mr-1 h-3 w-3" />
                          Aktywna
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedCompanyData && (
              <div className="text-sm text-muted-foreground">
                NIP: {selectedCompanyData.nip}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {session ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              )}
              Status sesji KSeF
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wygasa:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.expiresAt).toLocaleTimeString('pl-PL')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Przetworzone faktury:</span>
                    <span className="font-medium">{session.invoicesProcessed}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={endSession}>
                  <Square className="mr-2 h-4 w-4" />
                  Zakończ sesję
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Brak aktywnej sesji. Uruchom sesję, aby móc synchronizować faktury.
                </p>
                <Button onClick={startSession} disabled={isStartingSession}>
                  {isStartingSession ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isStartingSession ? 'Łączenie...' : 'Uruchom sesję'}
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
          <div className="grid gap-4 md:grid-cols-3">
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
                onClick={syncInvoices} 
                disabled={!session || isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isSyncing ? 'Synchronizacja...' : 'Pobierz z KSeF'}
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

      {/* Sync Results */}
      {syncResults.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Znalezione faktury</CardTitle>
              <CardDescription>
                {newInvoicesCount > 0 
                  ? `${newInvoicesCount} nowych faktur do zaimportowania`
                  : 'Wszystkie faktury zostały już zaimportowane'}
              </CardDescription>
            </div>
            {newInvoicesCount > 0 && (
              <Button onClick={importInvoices}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Importuj wszystkie ({newInvoicesCount})
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer faktury</TableHead>
                  <TableHead>Sprzedawca</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Kwota brutto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {result.ksefReference.slice(0, 20)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{result.sellerName}</TableCell>
                    <TableCell>
                      {new Date(result.issueDate).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('pl-PL', {
                        style: 'currency',
                        currency: 'PLN',
                      }).format(result.grossAmount)}
                    </TableCell>
                    <TableCell>
                      {result.status === 'new' && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Nowa
                        </Badge>
                      )}
                      {result.status === 'imported' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Zaimportowana
                        </Badge>
                      )}
                      {result.status === 'error' && (
                        <Badge variant="destructive">
                          Błąd
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

      {/* Log */}
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
  )
}
