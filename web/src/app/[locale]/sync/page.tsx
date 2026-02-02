'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
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
  Building2,
  ExternalLink,
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
import { useSelectedCompany } from '@/contexts/company-context'
import { RequireRole } from '@/components/auth/auth-provider'

export default function SyncPage() {
  const t = useTranslations('sync')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { selectedCompany } = useSelectedCompany()
  const nip = selectedCompany?.nip
  
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [syncLog, setSyncLog] = useState<string[]>([])

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Queries
  const { data: status, isLoading: isLoadingStatus } = useKsefStatus()
  const { data: sessionData, isLoading: isLoadingSession } = useKsefSession()
  const { 
    data: previewData, 
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useSyncPreview({ 
    nip,
    dateFrom, 
    dateTo, 
    enabled: Boolean(sessionData?.session) && Boolean(nip),
  })

  // Mutations
  const startSessionMutation = useStartSession()
  const endSessionMutation = useEndSession()
  const runSyncMutation = useRunSync()
  const importMutation = useImportInvoices()

  const session = sessionData?.session
  const newInvoices = previewData?.invoices.filter(inv => !inv.alreadyImported) || []

  // Reset state when company changes
  useEffect(() => {
    // Clear all local state when company (NIP) changes
    setSelectedInvoices(new Set())
    setSyncLog([])
  }, [nip])

  // Helper to generate KSeF portal link
  const getKsefPortalLink = (ksefNumber: string) => 
    `https://ap.ksef.mf.gov.pl/invoice/${ksefNumber}`

  // Locale-aware formatting
  const formatTime = () => new Date().toLocaleTimeString(locale)
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'PLN' }).format(amount)
  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString(locale)

  function addLog(message: string) {
    const timestamp = formatTime()
    setSyncLog(prev => [...prev, `[${timestamp}] ${message}`])
  }

  async function handleStartSession() {
    if (!nip) {
      addLog(t('sessionError') + ': No company selected')
      return
    }
    addLog(t('initSession'))
    try {
      await startSessionMutation.mutateAsync(nip)
      addLog(t('sessionStarted'))
    } catch (error) {
      addLog(`${t('sessionError')}: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  async function handleEndSession() {
    addLog(t('closingSession'))
    try {
      await endSessionMutation.mutateAsync()
      addLog(t('sessionClosed'))
    } catch (error) {
      addLog(`${t('sessionCloseError')}: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  async function handleSyncAll() {
    addLog(t('startingFullSync'))
    try {
      const result = await runSyncMutation.mutateAsync({ nip, dateFrom, dateTo })
      addLog(t('syncResult', { imported: result.imported, skipped: result.skipped, failed: result.failed }))
      // Log error details if any
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: { ksefReferenceNumber: string; error: string }) => {
          addLog(`❌ ${err.ksefReferenceNumber}: ${err.error}`)
        })
      }
      await refetchPreview()
    } catch (error) {
      addLog(`${t('syncError')}: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  async function handleImportSelected() {
    if (selectedInvoices.size === 0) return
    
    const refs = Array.from(selectedInvoices)
    addLog(t('importingSelected', { count: refs.length }))
    
    try {
      const result = await importMutation.mutateAsync({ referenceNumbers: refs, nip })
      addLog(t('importResult', { imported: result.imported, failed: result.failed }))
      // Log error details if any
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: { ksefReferenceNumber: string; error: string }) => {
          addLog(`❌ ${err.ksefReferenceNumber}: ${err.error}`)
        })
      }
      setSelectedInvoices(new Set())
      await refetchPreview()
    } catch (error) {
      addLog(`${t('importError')}: ${error instanceof Error ? error.message : 'Unknown'}`)
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
        <p className="text-muted-foreground">{t('noPermission')}</p>
      </div>
    }>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <RefreshCw className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>

        {/* Status and Session */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
          {/* KSeF Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status?.isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                {t('connectionStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse text-muted-foreground">{tCommon('loading')}</div>
              ) : status ? (
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('connected')}:</span>
                    <Badge variant={status.isConnected ? 'default' : 'destructive'}>
                      {status.isConnected ? tCommon('yes') : tCommon('no')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('environment')}:</span>
                    <span className="font-medium">{status.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('nip')}:</span>
                    <span className="font-mono">{status.nip}</span>
                  </div>
                  {status.tokenExpiringSoon && status.daysUntilExpiry !== undefined && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t('tokenExpiring', { days: status.daysUntilExpiry })}</span>
                    </div>
                  )}
                  {status.error && (
                    <div className="text-destructive text-xs">{status.error}</div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">{t('noStatusData')}</p>
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
                {t('ksefSession')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session ? (
                <>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tCommon('status')}:</span>
                      <Badge variant="default">{t('sessionActive')}</Badge>
                    </div>
                    {session.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('expires')}:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.expiresAt).toLocaleTimeString(locale)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('processed')}:</span>
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
                    {t('endSession')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('noActiveSession')}
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
                    {startSessionMutation.isPending ? t('connecting') : t('startSession')}
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
              {t('fetchInvoices')}
            </CardTitle>
            <CardDescription>
              {t('fetchInvoicesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('dateFrom')}
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
                  {t('dateTo')}
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSyncAll} 
                  disabled={!session || isSyncing}
                  className="w-full"
                  size={isMobile ? "sm" : "default"}
                >
                  {isSyncing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isSyncing ? t('syncing') : (isMobile ? t('syncAllShort') : t('syncAll'))}
                </Button>
              </div>
            </div>
            
            {isLoadingPreview && session && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('fetchingInvoices', { dateFrom, dateTo })}
              </div>
            )}
            
            {!session && (
              <p className="text-sm text-muted-foreground">
                {t('startSessionHint')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Preview */}
        {previewData && previewData.invoices.length > 0 && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg md:text-xl">{t('foundInvoicesTitle')}</CardTitle>
                <CardDescription>
                  {newInvoices.length > 0 
                    ? t('newInvoicesToImport', { new: newInvoices.length, total: previewData.total })
                    : t('allInvoicesImported')}
                </CardDescription>
              </div>
              {selectedInvoices.size > 0 && (
                <Button 
                  onClick={handleImportSelected}
                  disabled={importMutation.isPending}
                  size={isMobile ? "sm" : "default"}
                >
                  {importMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('import')} ({selectedInvoices.size})
                </Button>
              )}
            </CardHeader>
            <CardContent className={isMobile ? "px-3" : "p-0"}>
              {isMobile ? (
                // Mobile: Card view
                <div className="space-y-3">
                  {/* Select all on mobile */}
                  {newInvoices.length > 0 && (
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox 
                        checked={selectedInvoices.size === newInvoices.length}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">{t('selectAllNew')}</span>
                    </div>
                  )}
                  {previewData.invoices.map((invoice) => (
                    <div 
                      key={invoice.ksefReferenceNumber}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Checkbox 
                            checked={selectedInvoices.has(invoice.ksefReferenceNumber)}
                            onCheckedChange={() => toggleInvoiceSelection(invoice.ksefReferenceNumber)}
                            disabled={invoice.alreadyImported}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{invoice.invoiceNumber}</p>
                              <a 
                                href={getKsefPortalLink(invoice.ksefReferenceNumber)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title={t('openInKsef')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              {invoice.ksefReferenceNumber.slice(0, 20)}...
                            </p>
                          </div>
                        </div>
                        {invoice.alreadyImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t('alreadyImported')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                            {t('newBadge')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{invoice.supplierName}</span>
                        <span className="text-muted-foreground">({invoice.supplierNip})</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(invoice.invoiceDate)}
                        </div>
                        <span className="font-bold">
                          {formatCurrency(invoice.grossAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop: Table view
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
                    <TableHead>{t('invoiceNumber')}</TableHead>
                    <TableHead>{t('seller')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('grossAmount')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invoice.invoiceNumber}</span>
                            <a 
                              href={getKsefPortalLink(invoice.ksefReferenceNumber)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title={t('openInKsef')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
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
                        {formatDate(invoice.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.grossAmount)}
                      </TableCell>
                      <TableCell>
                        {invoice.alreadyImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t('alreadyImported')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {t('newBadge')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Operation Log */}
        {syncLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('syncLog')}
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
