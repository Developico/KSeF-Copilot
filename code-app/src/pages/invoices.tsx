import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Search,
  AlertCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { useInvoices } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice, InvoiceListParams } from '@/lib/types'

type SortField = 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate'
type SortDir = 'asc' | 'desc'

function PaymentBadge({ status }: { status: Invoice['paymentStatus'] }) {
  const intl = useIntl()
  if (status === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {intl.formatMessage({ id: 'invoices.paid' })}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
      {intl.formatMessage({ id: 'invoices.pending' })}
    </Badge>
  )
}

export function InvoicesPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [sortField, setSortField] = useState<SortField>('invoiceDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const params = useMemo<InvoiceListParams>(() => {
    const p: InvoiceListParams = {
      settingId: selectedCompany?.id,
      orderBy: sortField,
      orderDirection: sortDir,
    }
    if (paymentFilter !== 'all') p.paymentStatus = paymentFilter
    if (search.trim()) p.search = search.trim()
    return p
  }, [selectedCompany?.id, sortField, sortDir, paymentFilter, search])

  const { data, isLoading, error, refetch } = useInvoices(params, {
    enabled: !companyLoading && Boolean(selectedCompany?.id),
  })

  const invoices = data?.invoices ?? []
  const count = data?.count ?? 0

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'invoices.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'invoices.subtitle' })}
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          {intl.formatMessage({ id: 'common.refresh' })}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={intl.formatMessage({ id: 'common.search' }) + '...'}
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'paid', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPaymentFilter(f)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                paymentFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all'
                ? intl.formatMessage({ id: 'common.all' })
                : intl.formatMessage({ id: `invoices.${f}` })}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading || companyLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      ) : !selectedCompany ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'settings.noCompanies' })}
            </p>
            <Link to="/settings" className="text-sm text-primary hover:underline mt-2 inline-block">
              {intl.formatMessage({ id: 'navigation.settings' })} →
            </Link>
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {intl.formatMessage({ id: 'invoices.noInvoices' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {search || paymentFilter !== 'all'
                ? intl.formatMessage({ id: 'invoices.noMatchingInvoices' })
                : intl.formatMessage({ id: 'invoices.runSyncToFetch' })}
            </p>
            {!search && paymentFilter === 'all' && (
              <Link
                to="/sync"
                className="inline-flex items-center mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {intl.formatMessage({ id: 'invoices.goToSync' })}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {count} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">
                    <button onClick={() => toggleSort('invoiceDate')} className="inline-flex items-center hover:text-foreground">
                      {intl.formatMessage({ id: 'invoices.invoiceDate' })}
                      <SortIcon field="invoiceDate" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'invoices.invoiceNumber' })}
                  </th>
                  <th className="text-left p-3 font-medium">
                    <button onClick={() => toggleSort('supplierName')} className="inline-flex items-center hover:text-foreground">
                      {intl.formatMessage({ id: 'invoices.supplier' })}
                      <SortIcon field="supplierName" />
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button onClick={() => toggleSort('grossAmount')} className="inline-flex items-center hover:text-foreground">
                      {intl.formatMessage({ id: 'invoices.grossAmount' })}
                      <SortIcon field="grossAmount" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'invoices.mpk' })}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'invoices.category' })}
                  </th>
                  <th className="text-center p-3 font-medium">
                    {intl.formatMessage({ id: 'invoices.paymentStatus' })}
                  </th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                    <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="p-3 max-w-48 truncate" title={inv.supplierName}>
                      {inv.supplierName}
                    </td>
                    <td className="p-3 text-right font-medium whitespace-nowrap">
                      {formatCurrency(inv.grossAmount, inv.currency)}
                    </td>
                    <td className="p-3 text-muted-foreground">{inv.mpk ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">{inv.category ?? '—'}</td>
                    <td className="p-3 text-center">
                      <PaymentBadge status={inv.paymentStatus} />
                    </td>
                    <td className="p-3">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="block">
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{inv.supplierName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="font-medium">{formatCurrency(inv.grossAmount, inv.currency)}</p>
                        <div className="mt-1">
                          <PaymentBadge status={inv.paymentStatus} />
                        </div>
                      </div>
                    </div>
                    {(inv.mpk || inv.category) && (
                      <div className="flex gap-2 mt-2">
                        {inv.mpk && (
                          <Badge variant="outline" className="text-xs">{inv.mpk}</Badge>
                        )}
                        {inv.category && (
                          <Badge variant="outline" className="text-xs">{inv.category}</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
