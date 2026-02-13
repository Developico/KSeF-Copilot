import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import {
  useKsefStatus,
  useKsefSession,
  useStartKsefSession,
  useEndKsefSession,
  useSyncPreview,
  useRunSync,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatDate } from '@/lib/format'

export function SyncPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
    { enabled: false }
  )

  const runSync = useRunSync()

  const session = sessionData?.session
  const isConnected = status?.isConnected ?? false
  const hasSession = session?.status === 'active'

  function handleSync() {
    if (!selectedCompany) return
    runSync.mutate({
      settingId: selectedCompany.id,
      nip: selectedCompany.nip,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
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
            {status?.environment
              ? intl.formatMessage({ id: `sync.${status.environment}` })
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
                  <button
                    onClick={() => startSession.mutate(selectedCompany?.nip)}
                    disabled={startSession.isPending || !selectedCompany}
                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {startSession.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Play className="h-4 w-4" />}
                    {intl.formatMessage({ id: 'sync.startSession' })}
                  </button>
                ) : (
                  <button
                    onClick={() => endSession.mutate()}
                    disabled={endSession.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {endSession.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Square className="h-4 w-4" />}
                    {intl.formatMessage({ id: 'sync.endSession' })}
                  </button>
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
              <label className="text-sm font-medium mb-1.5 block">
                {intl.formatMessage({ id: 'sync.dateFrom' })}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">
                {intl.formatMessage({ id: 'sync.dateTo' })}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => void fetchPreview()}
              disabled={previewLoading || !selectedCompany}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {intl.formatMessage({ id: 'sync.preview' })}
            </button>
            <button
              onClick={handleSync}
              disabled={runSync.isPending || !selectedCompany}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {runSync.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {runSync.isPending
                ? intl.formatMessage({ id: 'dashboard.syncing' })
                : intl.formatMessage({ id: 'common.ksefSync' })}
            </button>
          </div>

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

      {/* Preview table */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: 'sync.newInvoices' })}: {preview.new} / {preview.total}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preview.invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {intl.formatMessage({ id: 'invoices.noResults' })}
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.invoiceNumber' })}</th>
                      <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.invoiceDate' })}</th>
                      <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.supplier' })}</th>
                      <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                      <th className="text-center p-2 font-medium">{intl.formatMessage({ id: 'common.status' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.invoices.map((inv) => (
                      <tr key={inv.ksefReferenceNumber} className="border-b last:border-0">
                        <td className="p-2 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="p-2">{formatDate(inv.invoiceDate)}</td>
                        <td className="p-2 truncate max-w-40">{inv.supplierName}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(inv.grossAmount)}</td>
                        <td className="p-2 text-center">
                          <Badge variant={inv.alreadyImported ? 'secondary' : 'default'} className="text-xs">
                            {inv.alreadyImported
                              ? intl.formatMessage({ id: 'sync.alreadyImported' })
                              : intl.formatMessage({ id: 'sync.newInvoices' })}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
