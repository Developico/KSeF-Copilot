import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  Sparkles,
  Edit2,
  Pencil,
  Save,
  X,
  Loader2,
  Search,
} from 'lucide-react'
import { useInvoice, useMarkInvoiceAsPaid, useUpdateInvoice, useCategorizeWithAI, useExchangeRate } from '@/hooks/use-api'
import { formatCurrency, formatDate } from '@/lib/format'
import { ClassificationEditDialog } from '@/components/invoices/classification-edit-dialog'
import { AttachmentsSection } from '@/components/invoices/attachments-section'
import { NotesSection } from '@/components/invoices/notes-section'
import { InvoiceDocumentSidebar } from '@/components/invoices/invoice-document-sidebar'
import { SupplierLookupDialog } from '@/components/invoices/supplier-lookup-dialog'
import type { SupplierData } from '@/components/invoices/supplier-lookup-dialog'
import { useCompanyContext } from '@/contexts/company-context'
import { toast } from 'sonner'

/** Standard Polish VAT rates + special codes */
const VAT_RATES = [
  { value: '23', label: '23%' },
  { value: '8', label: '8%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
  { value: 'zw', label: 'zw (zwolnione)' },
] as const

function PaymentBadge({ status, dueDate }: { status: 'paid' | 'pending'; dueDate?: string }) {
  const intl = useIntl()
  if (status === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {intl.formatMessage({ id: 'invoices.paid' })}
      </Badge>
    )
  }
  const isOverdue = dueDate && new Date(dueDate) < new Date()
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        {intl.formatMessage({ id: 'invoices.overdue' })}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
      {intl.formatMessage({ id: 'invoices.pending' })}
    </Badge>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string | undefined | null; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()

  const { data: invoice, isLoading, error, refetch } = useInvoice(id ?? '')
  const markAsPaid = useMarkInvoiceAsPaid()
  const updateInvoice = useUpdateInvoice()
  const categorizeAI = useCategorizeWithAI()

  function handleMarkAsPaid() {
    markAsPaid.mutate(
      { id: invoice!.id },
      {
        onSuccess: () => toast.success(intl.formatMessage({ id: 'invoices.markedAsPaid' })),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleMarkAsUnpaid() {
    updateInvoice.mutate(
      { id: invoice!.id, data: { paymentStatus: 'pending' } },
      {
        onSuccess: () => toast.success(intl.formatMessage({ id: 'invoices.markedAsUnpaid' })),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  // ── Invoice edit mode ────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [editData, setEditData] = useState({
    supplierName: '',
    supplierNip: '',
    supplierAddress: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    netAmount: 0,
    vatAmount: 0,
    grossAmount: 0,
    currency: 'PLN',
    exchangeRate: '',
    exchangeRateDate: '',
    vatRate: '23',
  })

  // Auto-fetch exchange rate from NBP when currency or date changes
  const shouldFetchRate = editing && editData.currency !== 'PLN'
  const exchangeRateQuery = useExchangeRate(
    editData.currency as 'EUR' | 'USD',
    editData.exchangeRateDate || undefined,
    { enabled: shouldFetchRate }
  )

  useEffect(() => {
    if (exchangeRateQuery.data && shouldFetchRate) {
      setEditData((d) => ({
        ...d,
        exchangeRate: exchangeRateQuery.data.rate.toString(),
        exchangeRateDate: exchangeRateQuery.data.effectiveDate ?? d.exchangeRateDate,
      }))
    }
  }, [exchangeRateQuery.data, shouldFetchRate])

  function startEdit() {
    if (!invoice) return
    // Try to determine VAT rate from existing amounts
    const net = invoice.netAmount ?? 0
    const vat = invoice.vatAmount ?? 0
    let detectedVatRate = '23'
    if (net > 0) {
      const rate = (vat / net) * 100
      const match = VAT_RATES.find(r => Math.abs(parseFloat(r.value) - rate) < 0.5)
      if (match) detectedVatRate = match.value
    }
    setEditData({
      supplierName: invoice.supplierName ?? '',
      supplierNip: invoice.supplierNip ?? '',
      supplierAddress: invoice.supplierAddress ?? '',
      invoiceNumber: invoice.invoiceNumber ?? '',
      invoiceDate: invoice.invoiceDate?.split('T')[0] ?? '',
      dueDate: invoice.dueDate?.split('T')[0] ?? '',
      netAmount: invoice.netAmount ?? 0,
      vatAmount: invoice.vatAmount ?? 0,
      grossAmount: invoice.grossAmount ?? 0,
      currency: invoice.currency ?? 'PLN',
      exchangeRate: invoice.exchangeRate?.toString() ?? '',
      exchangeRateDate: invoice.exchangeDate?.split('T')[0] ?? '',
      vatRate: detectedVatRate,
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function handleSupplierSelect(data: SupplierData) {
    setEditData((d) => ({
      ...d,
      supplierNip: data.supplierNip,
      supplierName: data.supplierName,
      supplierAddress: [data.supplierAddress, data.supplierPostalCode, data.supplierCity].filter(Boolean).join(', '),
    }))
  }

  // Auto-calculation handlers for amounts
  function handleNetAmountChange(value: string) {
    const net = parseFloat(value) || 0
    const rate = parseFloat(editData.vatRate)
    if (!isNaN(rate)) {
      const vat = net * rate / 100
      setEditData((d) => ({ ...d, netAmount: net, vatAmount: parseFloat(vat.toFixed(2)), grossAmount: parseFloat((net + vat).toFixed(2)) }))
    } else {
      setEditData((d) => ({ ...d, netAmount: net, grossAmount: parseFloat((net + d.vatAmount).toFixed(2)) }))
    }
  }

  function handleVatRateChange(value: string) {
    const net = editData.netAmount
    const rate = parseFloat(value)
    if (!isNaN(rate)) {
      const vat = net * rate / 100
      setEditData((d) => ({ ...d, vatRate: value, vatAmount: parseFloat(vat.toFixed(2)), grossAmount: parseFloat((net + vat).toFixed(2)) }))
    } else {
      setEditData((d) => ({ ...d, vatRate: value }))
    }
  }

  function handleVatAmountChange(value: string) {
    const vat = parseFloat(value) || 0
    setEditData((d) => ({ ...d, vatAmount: vat, grossAmount: parseFloat((d.netAmount + vat).toFixed(2)) }))
  }

  function saveEdit() {
    if (!invoice) return
    const exchangeRate = editData.exchangeRate ? parseFloat(editData.exchangeRate) : undefined
    const grossAmountPln = editData.currency !== 'PLN' && exchangeRate
      ? editData.grossAmount * exchangeRate
      : undefined
    updateInvoice.mutate(
      {
        id: invoice.id,
        data: {
          supplierName: editData.supplierName,
          supplierNip: editData.supplierNip,
          supplierAddress: editData.supplierAddress || undefined,
          invoiceNumber: editData.invoiceNumber,
          invoiceDate: editData.invoiceDate,
          dueDate: editData.dueDate || undefined,
          netAmount: editData.netAmount,
          vatAmount: editData.vatAmount,
          grossAmount: editData.grossAmount,
          currency: editData.currency,
          exchangeRate,
          exchangeDate: editData.exchangeRateDate || undefined,
          exchangeSource: exchangeRate ? 'NBP' : undefined,
          grossAmountPln,
        },
      },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success(intl.formatMessage({ id: 'settings.saveSuccess' }))
          void refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {intl.formatMessage({ id: 'common.back' })}
          </Link>
        </div>
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="pt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </CardContent></Card>
          <Card><CardContent className="pt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </CardContent></Card>
          <Card><CardContent className="pt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </CardContent></Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {intl.formatMessage({ id: 'common.back' })}
          </Link>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {intl.formatMessage({ id: 'common.back' })}
        </Link>
      </div>

      {/* Title + payment status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {invoice.invoiceNumber}
          </h1>
          <p className="text-muted-foreground mt-1">
            {invoice.supplierName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PaymentBadge status={invoice.paymentStatus} dueDate={invoice.dueDate} />
          {invoice.source && (
            <Badge variant="outline" className="text-xs">
              {invoice.source === 'KSeF' ? 'KSeF' : intl.formatMessage({ id: 'invoices.manual' })}
            </Badge>
          )}
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'common.edit' })}
            </Button>
          )}
          {invoice.paymentStatus === 'pending' ? (
            <Button
              size="sm"
              variant="default"
              disabled={markAsPaid.isPending}
              onClick={handleMarkAsPaid}
              className="bg-green-600 hover:bg-green-700"
            >
              {intl.formatMessage({ id: 'invoices.markAsPaid' })}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={updateInvoice.isPending}
              onClick={handleMarkAsUnpaid}
            >
              {intl.formatMessage({ id: 'invoices.markAsUnpaid' })}
            </Button>
          )}
        </div>
      </div>

      {/* 3-column inline-edit layout */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Dane faktury */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                {intl.formatMessage({ id: 'invoices.viewDetails' })}
              </CardTitle>
              {!editing && (
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={startEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="edit-invoiceNumber" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'invoices.invoiceNumber' })}
                  </label>
                  <input
                    id="edit-invoiceNumber"
                    type="text"
                    value={editData.invoiceNumber}
                    onChange={(e) => setEditData((d) => ({ ...d, invoiceNumber: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="edit-invoiceDate" className="text-xs font-medium mb-1 block">
                      {intl.formatMessage({ id: 'invoices.invoiceDate' })}
                    </label>
                    <input
                      id="edit-invoiceDate"
                      type="date"
                      value={editData.invoiceDate}
                      onChange={(e) => setEditData((d) => ({ ...d, invoiceDate: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-dueDate" className="text-xs font-medium mb-1 block">
                      {intl.formatMessage({ id: 'invoices.dueDate' })}
                    </label>
                    <input
                      id="edit-dueDate"
                      type="date"
                      value={editData.dueDate}
                      onChange={(e) => setEditData((d) => ({ ...d, dueDate: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <DetailRow label={intl.formatMessage({ id: 'invoices.invoiceNumber' })} value={invoice.invoiceNumber} mono />
                <Separator />
                <DetailRow label={intl.formatMessage({ id: 'invoices.invoiceDate' })} value={formatDate(invoice.invoiceDate)} />
                <Separator />
                <DetailRow label={intl.formatMessage({ id: 'invoices.dueDate' })} value={invoice.dueDate ? formatDate(invoice.dueDate) : undefined} />
                <Separator />
                <DetailRow
                  label={intl.formatMessage({ id: 'invoices.source' })}
                  value={invoice.source === 'KSeF' ? 'KSeF' : intl.formatMessage({ id: 'invoices.manual' })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Dostawca */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {intl.formatMessage({ id: 'invoices.supplier' })}
              </CardTitle>
              <div className="flex items-center gap-1">
                {editing && (
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setSupplierDialogOpen(true)}>
                    <Search className="h-3 w-3" />
                  </Button>
                )}
                {!editing && (
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={startEdit}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-2">
                <div>
                  <label htmlFor="edit-supplierName" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'invoices.supplier' })}
                  </label>
                  <input
                    id="edit-supplierName"
                    type="text"
                    value={editData.supplierName}
                    onChange={(e) => setEditData((d) => ({ ...d, supplierName: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit-supplierNip" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'invoices.nipLabel' })}
                  </label>
                  <input
                    id="edit-supplierNip"
                    type="text"
                    value={editData.supplierNip}
                    onChange={(e) => setEditData((d) => ({ ...d, supplierNip: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit-supplierAddress" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'common.street' })}
                  </label>
                  <input
                    id="edit-supplierAddress"
                    type="text"
                    value={editData.supplierAddress}
                    onChange={(e) => setEditData((d) => ({ ...d, supplierAddress: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <DetailRow label={intl.formatMessage({ id: 'common.name' })} value={invoice.supplierName} />
                <Separator />
                <DetailRow label={intl.formatMessage({ id: 'invoices.nipLabel' })} value={invoice.supplierNip} mono />
                <Separator />
                <DetailRow label={intl.formatMessage({ id: 'common.street' })} value={invoice.supplierAddress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Kwoty */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                {intl.formatMessage({ id: 'invoices.grossAmount' })}
              </CardTitle>
              {!editing && (
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={startEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="edit-currency" className="text-xs font-medium mb-1 block">
                      {intl.formatMessage({ id: 'invoices.currency' })}
                    </label>
                    <select
                      id="edit-currency"
                      value={editData.currency}
                      onChange={(e) => setEditData((d) => ({ ...d, currency: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="PLN">PLN</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-vatRate" className="text-xs font-medium mb-1 block">
                      {intl.formatMessage({ id: 'invoices.vatRate' })}
                    </label>
                    <select
                      id="edit-vatRate"
                      value={editData.vatRate}
                      onChange={(e) => handleVatRateChange(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    >
                      {VAT_RATES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="edit-netAmount" className="text-xs font-medium mb-1 block">
                      {intl.formatMessage({ id: 'invoices.netAmount' })}
                    </label>
                    <input
                      id="edit-netAmount"
                      type="number"
                      step="0.01"
                      value={editData.netAmount}
                      onChange={(e) => handleNetAmountChange(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-vatAmount" className="text-xs font-medium mb-1 block">
                      {intl.formatMessage({ id: 'invoices.vatAmount' })}
                    </label>
                    <input
                      id="edit-vatAmount"
                      type="number"
                      step="0.01"
                      value={editData.vatAmount}
                      onChange={(e) => handleVatAmountChange(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-grossAmount" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'invoices.grossAmount' })}
                  </label>
                  <input
                    id="edit-grossAmount"
                    type="number"
                    step="0.01"
                    value={editData.grossAmount}
                    readOnly
                    className="w-full rounded-md border border-input bg-muted px-3 py-1.5 text-sm font-medium"
                  />
                </div>
                {editData.currency !== 'PLN' && (
                  <>
                    <div className="border-t pt-2 mt-1" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="edit-exchangeRateDate" className="text-xs font-medium mb-1 block">
                          {intl.formatMessage({ id: 'invoices.exchangeRateDate' }, { defaultMessage: 'Data kursu' })}
                        </label>
                        <input
                          id="edit-exchangeRateDate"
                          type="date"
                          value={editData.exchangeRateDate}
                          onChange={(e) => setEditData((d) => ({ ...d, exchangeRateDate: e.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-exchangeRate" className="text-xs font-medium mb-1 block">
                          {intl.formatMessage({ id: 'invoices.exchangeRateLabel' })}
                          {exchangeRateQuery.isFetching && (
                            <Loader2 className="h-3 w-3 animate-spin inline ml-1" />
                          )}
                        </label>
                        <input
                          id="edit-exchangeRate"
                          type="number"
                          step="0.0001"
                          placeholder="4.3500"
                          value={editData.exchangeRate}
                          onChange={(e) => setEditData((d) => ({ ...d, exchangeRate: e.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    {editData.exchangeRate && parseFloat(editData.exchangeRate) > 0 && (
                      <div className="rounded-md bg-muted/50 p-2 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Netto PLN</span>
                          <span>{formatCurrency(editData.netAmount * parseFloat(editData.exchangeRate), 'PLN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VAT PLN</span>
                          <span>{formatCurrency(editData.vatAmount * parseFloat(editData.exchangeRate), 'PLN')}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Brutto PLN</span>
                          <span>{formatCurrency(editData.grossAmount * parseFloat(editData.exchangeRate), 'PLN')}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-0">
                <DetailRow label={intl.formatMessage({ id: 'invoices.netAmount' })} value={formatCurrency(invoice.netAmount, invoice.currency)} />
                <Separator />
                <DetailRow label={intl.formatMessage({ id: 'invoices.vatAmount' })} value={formatCurrency(invoice.vatAmount, invoice.currency)} />
                <Separator />
                <DetailRow label={intl.formatMessage({ id: 'invoices.grossAmount' })} value={formatCurrency(invoice.grossAmount, invoice.currency)} />
                {invoice.currency !== 'PLN' && invoice.grossAmountPln && (
                  <>
                    <Separator />
                    <DetailRow label={intl.formatMessage({ id: 'invoices.plnEquivalent' })} value={formatCurrency(invoice.grossAmountPln, 'PLN')} />
                    {invoice.exchangeRate && (
                      <div className="text-xs text-muted-foreground text-right pb-1">
                        {intl.formatMessage({ id: 'invoices.exchangeRateLabel' })}: {invoice.exchangeRate.toFixed(4)}
                        {invoice.exchangeDate && ` (${formatDate(invoice.exchangeDate)})`}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save / Cancel bar */}
      {editing && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={cancelEdit}>
            <X className="h-4 w-4 mr-1" />
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button
            onClick={saveEdit}
            disabled={updateInvoice.isPending}
          >
            {updateInvoice.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
              : <Save className="h-4 w-4 mr-1" />}
            {intl.formatMessage({ id: 'common.save' })}
          </Button>
        </div>
      )}

      {/* Main content with optional document sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {/* Classification */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.description' })}
            </CardTitle>
            <ClassificationEditDialog invoice={invoice} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.mpk' })}</p>
              <p className="font-medium mt-0.5">{invoice.mpk || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.category' })}</p>
              <p className="font-medium mt-0.5">{invoice.category || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.description' })}</p>
              <p className="font-medium mt-0.5">{invoice.description || intl.formatMessage({ id: 'invoices.noDescription' })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI suggestions */}
      <Card className={`${(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion || invoice.aiDescription) ? 'border-purple-200 dark:border-purple-800' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                {intl.formatMessage({ id: 'invoices.aiSuggestion' })}
                {invoice.aiConfidence != null && (
                  <Badge variant="outline" className="text-xs ml-2">
                    {Math.round(invoice.aiConfidence * 100)}%
                  </Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={categorizeAI.isPending}
                onClick={() => {
                  categorizeAI.mutate(invoice.id, {
                    onSuccess: () => {
                      toast.success(intl.formatMessage({ id: 'invoices.aiTriggered' }))
                      void refetch()
                    },
                    onError: (err) => toast.error(err.message),
                  })
                }}
              >
                {categorizeAI.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion)
                  ? intl.formatMessage({ id: 'invoices.aiReanalyze' })
                  : intl.formatMessage({ id: 'invoices.aiTrigger' })}
              </Button>
            </div>
          </CardHeader>
          {(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion || invoice.aiDescription) && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {invoice.aiMpkSuggestion && (
                <div>
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.mpk' })}</p>
                  <p className="font-medium mt-0.5">{invoice.aiMpkSuggestion}</p>
                </div>
              )}
              {invoice.aiCategorySuggestion && (
                <div>
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.category' })}</p>
                  <p className="font-medium mt-0.5">{invoice.aiCategorySuggestion}</p>
                </div>
              )}
              {invoice.aiDescription && (
                <div>
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.description' })}</p>
                  <p className="font-medium mt-0.5">{invoice.aiDescription}</p>
                </div>
              )}
            </div>
            {invoice.aiRationale && (
              <p className="text-sm text-muted-foreground mt-3 italic">{invoice.aiRationale}</p>
            )}
          </CardContent>
          )}
        </Card>

      {/* Invoice items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.title' })} ({invoice.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">{intl.formatMessage({ id: 'invoices.description' })}</th>
                    <th className="text-right p-2 font-medium">Qty</th>
                    <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.netAmount' })}</th>
                    <th className="text-right p-2 font-medium">VAT</th>
                    <th className="text-right p-2 font-medium">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">{formatCurrency(item.netAmount, invoice.currency)}</td>
                      <td className="p-2 text-right whitespace-nowrap">{item.vatRate}</td>
                      <td className="p-2 text-right whitespace-nowrap font-medium">{formatCurrency(item.grossAmount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <AttachmentsSection invoiceId={invoice.id} />

      {/* Notes */}
      <NotesSection invoiceId={invoice.id} />
        </div>

        {/* Document sidebar */}
        <div className="space-y-4">
          <InvoiceDocumentSidebar
            invoiceId={invoice.id}
            hasDocument={invoice.hasDocument}
          />
        </div>
      </div>

      {/* Supplier Lookup Dialog */}
      <SupplierLookupDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSelect={handleSupplierSelect}
        tenantNip={selectedCompany?.nip}
        currentNip={editData.supplierNip || undefined}
      />
    </div>
  )
}
