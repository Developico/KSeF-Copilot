import { useState } from 'react'
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
  Save,
  X,
  Loader2,
} from 'lucide-react'
import { useInvoice, useMarkInvoiceAsPaid, useUpdateInvoice, useCategorizeWithAI } from '@/hooks/use-api'
import { formatCurrency, formatDate } from '@/lib/format'
import { ClassificationEditDialog } from '@/components/invoices/classification-edit-dialog'
import { AttachmentsSection } from '@/components/invoices/attachments-section'
import { NotesSection } from '@/components/invoices/notes-section'
import { InvoiceDocumentSidebar } from '@/components/invoices/invoice-document-sidebar'
import { toast } from 'sonner'

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

  // ── Manual invoice edit mode ────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    supplierName: '',
    supplierNip: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    netAmount: 0,
    vatAmount: 0,
    grossAmount: 0,
    currency: 'PLN',
    exchangeRate: '',
  })

  function startEdit() {
    if (!invoice) return
    setEditData({
      supplierName: invoice.supplierName ?? '',
      supplierNip: invoice.supplierNip ?? '',
      invoiceNumber: invoice.invoiceNumber ?? '',
      invoiceDate: invoice.invoiceDate?.split('T')[0] ?? '',
      dueDate: invoice.dueDate?.split('T')[0] ?? '',
      netAmount: invoice.netAmount ?? 0,
      vatAmount: invoice.vatAmount ?? 0,
      grossAmount: invoice.grossAmount ?? 0,
      currency: invoice.currency ?? 'PLN',
      exchangeRate: invoice.exchangeRate?.toString() ?? '',
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
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
          invoiceNumber: editData.invoiceNumber,
          invoiceDate: editData.invoiceDate,
          dueDate: editData.dueDate || undefined,
          netAmount: editData.netAmount,
          vatAmount: editData.vatAmount,
          grossAmount: editData.grossAmount,
          currency: editData.currency,
          exchangeRate,
          grossAmountPln,
        },
      },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success(intl.formatMessage({ id: 'settings.saveSuccess' }))
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const isManual = invoice?.source === 'Manual'

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
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="pt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </CardContent></Card>
          <Card><CardContent className="pt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
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
          {isManual && !editing && (
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

      {/* Manual invoice edit form */}
      {editing && isManual && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-300">
              <Edit2 className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.editInvoice' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.supplier' })}
                </label>
                <input
                  type="text"
                  value={editData.supplierName}
                  onChange={(e) => setEditData((d) => ({ ...d, supplierName: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.nipLabel' })}
                </label>
                <input
                  type="text"
                  value={editData.supplierNip}
                  onChange={(e) => setEditData((d) => ({ ...d, supplierNip: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.invoiceNumber' })}
                </label>
                <input
                  type="text"
                  value={editData.invoiceNumber}
                  onChange={(e) => setEditData((d) => ({ ...d, invoiceNumber: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.invoiceDate' })}
                </label>
                <input
                  type="date"
                  value={editData.invoiceDate}
                  onChange={(e) => setEditData((d) => ({ ...d, invoiceDate: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.dueDate' })}
                </label>
                <input
                  type="date"
                  value={editData.dueDate}
                  onChange={(e) => setEditData((d) => ({ ...d, dueDate: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.netAmount' })}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.netAmount}
                  onChange={(e) => setEditData((d) => ({ ...d, netAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.vatAmount' })}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.vatAmount}
                  onChange={(e) => setEditData((d) => ({ ...d, vatAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.grossAmount' })}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.grossAmount}
                  onChange={(e) => setEditData((d) => ({ ...d, grossAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            {/* Currency & exchange rate */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'invoices.currency' })}
                </label>
                <select
                  value={editData.currency}
                  onChange={(e) => setEditData((d) => ({ ...d, currency: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              {editData.currency !== 'PLN' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {intl.formatMessage({ id: 'invoices.exchangeRateLabel' })}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="4.3500"
                    value={editData.exchangeRate}
                    onChange={(e) => setEditData((d) => ({ ...d, exchangeRate: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={saveEdit}
                disabled={updateInvoice.isPending}
              >
                {updateInvoice.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Save className="h-4 w-4 mr-2" />}
                {intl.formatMessage({ id: 'common.save' })}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'common.cancel' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Invoice details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.viewDetails' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DetailRow label={intl.formatMessage({ id: 'invoices.invoiceNumber' })} value={invoice.invoiceNumber} mono />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'invoices.invoiceDate' })} value={formatDate(invoice.invoiceDate)} />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'invoices.dueDate' })} value={invoice.dueDate ? formatDate(invoice.dueDate) : undefined} />
            <Separator />
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
          </CardContent>
        </Card>

        {/* Supplier info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.supplier' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DetailRow label={intl.formatMessage({ id: 'common.name' })} value={invoice.supplierName} />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'invoices.nipLabel' })} value={invoice.supplierNip} mono />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'common.street' })} value={invoice.supplierAddress} />
            <Separator />
            <DetailRow
              label="City"
              value={
                [invoice.supplierPostalCode, invoice.supplierCity]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            />
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
