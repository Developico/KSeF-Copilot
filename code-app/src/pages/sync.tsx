import { useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  ExternalLink,
  Terminal,
  Import,
  Sparkles,
} from 'lucide-react'
import {
  useKsefStatus,
  useKsefSession,
  useStartKsefSession,
  useEndKsefSession,
  useSyncPreview,
  useRunSync,
  useImportInvoices,
  useBatchCategorize,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatDate } from '@/lib/format'
import type { SyncPreviewInvoice } from '@/lib/types'

// ── KSeF portal URL ──────────────────────────────────────────────

function ksefPortalUrl(env: string | undefined, ref: string): string {
  const base =
    env === 'test'
      ? 'https://ksef-test.mf.gov.pl'
      : env === 'demo'
        ? 'https://ksef-demo.mf.gov.pl'
        : 'https://ksef.mf.gov.pl'
  return `${base}/web/verify/${ref}`
}

// ── Sync log entry type ──────────────────────────────────────────

interface LogEntry {
  timestamp: string
  type: 'info' | 'success' | 'error'
  message: string
}

export function SyncPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [log, setLog] = useState<LogEntry[]>([])
  const [aiCategorize, setAiCategorize] = useState(false)
  const [aiProgress, setAiProgress] = useState<{ total: number; done: number; status: 'idle' | 'running' | 'done' | 'error' }>({ total: 0, done: 0, status: 'idle' })
  const appendLog = useCallback((type: LogEntry['type'], message: string) => {
    setLog((prev) => [
      ...prev,
      { timestamp: new Date().toISOString(), type, message },
    ])
  }, [])

  const { data: status, isLoading: statusLoading } = useKsefStatus(
    { companyId: selectedCompany?.id, nip: selectedCompany?.nip },
    { enabled: !companyLoading && Boolean(selectedCompany) }
  )

  const { data: sessionData, isLoading: sessionLoading } = useKsefSession({
    enabled: !companyLoading && Boolean(selectedCompany),
  })

  const startSession = useStartKsefSession()
  const endSession = useEndKsefSession()

  const { data: preview, isLoading: previewLoading, refetch: fetchPreview } = useSyncPreview(
    {
      settingId: selectedCompany?.id,
      nip: selectedCompany?.nip,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: Boolean(sessionData?.session?.status === 'active') && Boolean(selectedCompany?.nip) }
  )

  const runSync = useRunSync()
  const importInvoices = useImportInvoices()
  const batchCategorize = useBatchCategorize()

  const session = sessionData?.session
  const isConnected = status?.isConnected ?? false
  const hasSession = session?.status === 'active'
  const environment = selectedCompany?.environment ?? status?.environment

  // ── Selection helpers ────────────────────────────────────────

  const newInvoices = (preview?.invoices ?? []).filter((i) => !i.alreadyImported)

  function toggleSelect(ref: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ref)) next.delete(ref)
      else next.add(ref)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === newInvoices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(newInvoices.map((i) => i.ksefReferenceNumber)))
    }
  }

  // ── Handlers ─────────────────────────────────────────────────

  async function runAiCategorization(invoiceIds: string[]) {
    if (invoiceIds.length === 0) return
    const BATCH_SIZE = 50
    const batches: string[][] = []
    for (let i = 0; i < invoiceIds.length; i += BATCH_SIZE) {
      batches.push(invoiceIds.slice(i, i + BATCH_SIZE))
    }
    setAiProgress({ total: invoiceIds.length, done: 0, status: 'running' })
    appendLog('info', `🤖 AI categorization started for ${invoiceIds.length} invoice(s)...`)
    let totalSuccess = 0
    let totalFailed = 0
    try {
      for (const batch of batches) {
        const result = await batchCategorize.mutateAsync({ invoiceIds: batch, autoApply: true })
        totalSuccess += result.success
        totalFailed += result.failed
        setAiProgress(prev => ({ ...prev, done: prev.done + batch.length }))
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => appendLog('error', `AI: ${err}`))
        }
      }
      appendLog('success', `AI categorization completed: ${totalSuccess} success, ${totalFailed} failed`)
      setAiProgress(prev => ({ ...prev, status: 'done' }))
    } catch (error) {
      appendLog('error', `AI categorization error: ${error instanceof Error ? error.message : 'Unknown'}`)
      setAiProgress(prev => ({ ...prev, status: 'error' }))
    }
  }

  function handleSync() {
    if (!selectedCompany) return
    appendLog('info', `Starting full sync for ${selectedCompany.companyName}...`)
    runSync.mutate(
      {
        settingId: selectedCompany.id,
        nip: selectedCompany.nip,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
      {
        onSuccess: async (result) => {
          appendLog('success', `Sync completed. Imported: ${result.imported}, skipped: ${result.skipped}`)
          if (result.errors.length > 0) {
            result.errors.forEach((err) =>
              appendLog('error', `${err.ksefReferenceNumber}: ${err.error}`)
            )
          }
          // Auto-categorize new invoices with AI if enabled
          if (aiCategorize && result.newInvoiceIds && result.newInvoiceIds.length > 0) {
            await runAiCategorization(result.newInvoiceIds)
          }
        },
        onError: (err) => appendLog('error', `Sync failed: ${err.message}`),
      }
    )
  }

  function handleImportSelected() {
    if (!selectedCompany || selected.size === 0) return
    const refs = Array.from(selected)
    appendLog('info', `Importing ${refs.length} selected invoice(s)...`)
    importInvoices.mutate(
      {
        referenceNumbers: refs,
        nip: selectedCompany.nip,
        settingId: selectedCompany.id,
      },
      {
        onSuccess: async (result) => {
          appendLog('success', `Import completed. Imported: ${result.imported}`)
          setSelected(new Set())
          // Auto-categorize new invoices with AI if enabled
          if (aiCategorize && result.newInvoiceIds && result.newInvoiceIds.length > 0) {
            await runAiCategorization(result.newInvoiceIds)
          }
        },
        onError: (err) => appendLog('error', `Import failed: ${err.message}`),
      }
    )
  }

  function handlePreview() {
    appendLog('info', 'Fetching preview from KSeF...')
    void fetchPreview().then(({ data }) => {
      if (data) {
        appendLog('success', `Found ${data.total} invoices (${data.new} new)`)
        // Auto-select all new invoices
        setSelected(new Set(data.invoices.filter((i) => !i.alreadyImported).map((i) => i.ksefReferenceNumber)))
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {intl.formatMessage({ id: 'sync.title' })}
        </h1>
        <p className="text-muted-foreground">
          {intl.formatMessage({ id: 'sync.subtitle' })}
        </p>
      </div>

      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected
              ? <Wifi className="h-5 w-5 text-green-500" />
              : <WifiOff className="h-5 w-5 text-muted-foreground" />}
            {intl.formatMessage({ id: 'sync.connectionStatus' })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: 'sync.environment' })}:{' '}
            {environment
              ? intl.formatMessage({ id: `sync.${environment}` })
              : '—'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading || companyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : !selectedCompany ? (
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'settings.noCompanies' })}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={isConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }>
                  {isConnected
                    ? intl.formatMessage({ id: 'sync.connected' })
                    : intl.formatMessage({ id: 'sync.sessionInactive' })}
                </Badge>
                {status?.tokenExpiringSoon && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    Token expiring ({status.daysUntilExpiry}d)
                  </Badge>
                )}
              </div>
              {status?.lastSync && (
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: 'dashboard.lastSync' })}: {formatDate(status.lastSync)}
                </p>
              )}
              {status?.error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{status.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {intl.formatMessage({ id: 'sync.sessionStatus' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={hasSession
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : ''
                } variant={hasSession ? 'default' : 'secondary'}>
                  {hasSession
                    ? intl.formatMessage({ id: 'sync.sessionActive' })
                    : intl.formatMessage({ id: 'sync.sessionInactive' })}
                </Badge>
                {session && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {session.sessionId.slice(0, 16)}...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!hasSession ? (
                  <Button
                    onClick={() => {
                      appendLog('info', 'Starting KSeF session...')
                      startSession.mutate(selectedCompany?.nip, {
                        onSuccess: () => appendLog('success', 'Session started'),
                        onError: (err) => appendLog('error', `Session start failed: ${err.message}`),
                      })
                    }}
                    disabled={startSession.isPending || !selectedCompany}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {startSession.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Play className="h-4 w-4 mr-2" />}
                    {intl.formatMessage({ id: 'sync.startSession' })}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      appendLog('info', 'Ending KSeF session...')
                      endSession.mutate(undefined, {
                        onSuccess: () => appendLog('success', 'Session ended'),
                        onError: (err) => appendLog('error', `Session end failed: ${err.message}`),
                      })
                    }}
                    disabled={endSession.isPending}
                    variant="destructive"
                  >
                    {endSession.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Square className="h-4 w-4 mr-2" />}
                    {intl.formatMessage({ id: 'sync.endSession' })}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {intl.formatMessage({ id: 'sync.import' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date range */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="sync-date-from" className="text-sm font-medium mb-1.5 block">
                {intl.formatMessage({ id: 'sync.dateFrom' })}
              </label>
              <input
                id="sync-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="sync-date-to" className="text-sm font-medium mb-1.5 block">
                {intl.formatMessage({ id: 'sync.dateTo' })}
              </label>
              <input
                id="sync-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewLoading || !selectedCompany}
            >
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {intl.formatMessage({ id: 'sync.preview' })}
            </Button>
            <Button
              onClick={handleSync}
              disabled={runSync.isPending || batchCategorize.isPending || !selectedCompany}
            >
              {(runSync.isPending || batchCategorize.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {runSync.isPending
                ? intl.formatMessage({ id: 'dashboard.syncing' })
                : intl.formatMessage({ id: 'common.ksefSync' })}
            </Button>
          </div>

          {/* AI categorization option */}
          <div className="flex items-start gap-3 rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 p-3">
            <input
              type="checkbox"
              id="ai-categorize"
              checked={aiCategorize}
              onChange={(e) => setAiCategorize(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="ai-categorize" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-1.5 text-sm font-medium text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                AI Categorization
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                Automatically describe invoices with AI after sync (MPK, category, description). Adds ~2s per invoice.
              </p>
            </label>
          </div>

          {/* AI progress */}
          {aiProgress.status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-4 w-4" />
                  AI Categorization
                </span>
                <span className="text-muted-foreground">
                  {aiProgress.done}/{aiProgress.total}{' '}
                  ({aiProgress.total > 0
                    ? Math.round((aiProgress.done / aiProgress.total) * 100)
                    : 0}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-purple-100 dark:bg-purple-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    aiProgress.status === 'error'
                      ? 'bg-red-500'
                      : aiProgress.status === 'done'
                        ? 'bg-green-500'
                        : 'bg-purple-500'
                  }`}
                  style={{
                    width: `${aiProgress.total > 0 ? (aiProgress.done / aiProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              {aiProgress.status === 'done' && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  AI categorization completed successfully.
                </p>
              )}
              {aiProgress.status === 'error' && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  AI categorization encountered errors. Check the log below for details.
                </p>
              )}
            </div>
          )}

          {/* Sync result */}
          {runSync.isSuccess && runSync.data && (
            <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {intl.formatMessage({ id: 'dashboard.syncCompleted' })}
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                {intl.formatMessage(
                  { id: 'dashboard.syncCompletedDesc' },
                  { count: runSync.data.imported }
                )}
                {runSync.data.skipped > 0 && ` (${runSync.data.skipped} skipped)`}
              </p>
            </div>
          )}

          {runSync.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{runSync.error.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview table with checkboxes */}
      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {intl.formatMessage({ id: 'sync.newInvoices' })}: {preview.new} / {preview.total}
              </CardTitle>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleImportSelected}
                    disabled={importInvoices.isPending || batchCategorize.isPending}
                  >
                    {importInvoices.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Import className="h-4 w-4 mr-2" />}
                    {intl.formatMessage({ id: 'sync.importSelected' })} ({selected.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {preview.invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {intl.formatMessage({ id: 'invoices.noResults' })}
              </p>
            ) : (
              <>
                {/* Select all / deselect all */}
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    checked={selected.size === newInvoices.length && newInvoices.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label={intl.formatMessage({ id: 'sync.selectAll' })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selected.size === newInvoices.length
                      ? intl.formatMessage({ id: 'sync.deselectAll' })
                      : intl.formatMessage({ id: 'sync.selectAll' })}
                  </span>
                </div>
                <Separator className="mb-3" />

                {/* Desktop table */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 w-8" />
                        <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.invoiceNumber' })}</th>
                        <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.invoiceDate' })}</th>
                        <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.supplier' })}</th>
                        <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                        <th className="text-center p-2 font-medium">{intl.formatMessage({ id: 'common.status' })}</th>
                        <th className="p-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {preview.invoices.map((inv) => (
                        <PreviewRow
                          key={inv.ksefReferenceNumber}
                          invoice={inv}
                          checked={selected.has(inv.ksefReferenceNumber)}
                          onToggle={() => toggleSelect(inv.ksefReferenceNumber)}
                          environment={environment}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {preview.invoices.map((inv) => (
                    <MobilePreviewCard
                      key={inv.ksefReferenceNumber}
                      invoice={inv}
                      checked={selected.has(inv.ksefReferenceNumber)}
                      onToggle={() => toggleSelect(inv.ksefReferenceNumber)}
                      environment={environment}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operation log */}
      {log.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Terminal className="h-4 w-4" />
                {intl.formatMessage({ id: 'sync.syncLog' })}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLog([])}>
                {intl.formatMessage({ id: 'common.close' })}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-zinc-950 dark:bg-zinc-900 p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
              {log.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-zinc-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={
                      entry.type === 'success'
                        ? 'text-green-400'
                        : entry.type === 'error'
                          ? 'text-red-400'
                          : 'text-zinc-300'
                    }
                  >
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Preview row (desktop table) ──────────────────────────────────

function PreviewRow({
  invoice,
  checked,
  onToggle,
  environment,
}: {
  invoice: SyncPreviewInvoice
  checked: boolean
  onToggle: () => void
  environment: string | undefined
}) {
  const intl = useIntl()
  return (
    <tr className="border-b last:border-0">
      <td className="p-2">
        {!invoice.alreadyImported && (
          <Checkbox checked={checked} onCheckedChange={onToggle} />
        )}
      </td>
      <td className="p-2 font-mono text-xs">{invoice.invoiceNumber}</td>
      <td className="p-2">{formatDate(invoice.invoiceDate)}</td>
      <td className="p-2 truncate max-w-40">{invoice.supplierName}</td>
      <td className="p-2 text-right font-medium">{formatCurrency(invoice.grossAmount)}</td>
      <td className="p-2 text-center">
        <Badge variant={invoice.alreadyImported ? 'secondary' : 'default'} className="text-xs">
          {invoice.alreadyImported
            ? intl.formatMessage({ id: 'sync.alreadyImported' })
            : intl.formatMessage({ id: 'sync.newInvoices' })}
        </Badge>
      </td>
      <td className="p-2">
        <a
          href={ksefPortalUrl(environment, invoice.ksefReferenceNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
          title="KSeF portal"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </td>
    </tr>
  )
}

// ── Mobile preview card ──────────────────────────────────────────

function MobilePreviewCard({
  invoice,
  checked,
  onToggle,
  environment,
}: {
  invoice: SyncPreviewInvoice
  checked: boolean
  onToggle: () => void
  environment: string | undefined
}) {
  const intl = useIntl()
  return (
    <div className="rounded-md border p-3 flex items-start gap-3">
      <div className="pt-0.5">
        {!invoice.alreadyImported ? (
          <Checkbox checked={checked} onCheckedChange={onToggle} />
        ) : (
          <div className="w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs truncate">{invoice.invoiceNumber}</span>
          <Badge variant={invoice.alreadyImported ? 'secondary' : 'default'} className="text-xs shrink-0">
            {invoice.alreadyImported
              ? intl.formatMessage({ id: 'sync.alreadyImported' })
              : intl.formatMessage({ id: 'sync.newInvoices' })}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1 truncate">{invoice.supplierName}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm">{formatDate(invoice.invoiceDate)}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatCurrency(invoice.grossAmount)}</span>
            <a
              href={ksefPortalUrl(environment, invoice.ksefReferenceNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="KSeF portal"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
