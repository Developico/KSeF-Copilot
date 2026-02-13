import { useParams, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { useInvoice, useMarkInvoiceAsPaid } from '@/hooks/use-api'
import { formatCurrency, formatDate } from '@/lib/format'

function PaymentBadge({ status }: { status: 'paid' | 'pending' }) {
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

  const { data: invoice, isLoading, error } = useInvoice(id ?? '')
  const markAsPaid = useMarkInvoiceAsPaid()

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
          <PaymentBadge status={invoice.paymentStatus} />
          {invoice.paymentStatus === 'pending' && (
            <button
              disabled={markAsPaid.isPending}
              onClick={() => markAsPaid.mutate({ id: invoice.id })}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {intl.formatMessage({ id: 'invoices.markAsPaid' })}
            </button>
          )}
        </div>
      </div>

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
                <DetailRow label="PLN" value={formatCurrency(invoice.grossAmountPln, 'PLN')} />
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

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" />
            {intl.formatMessage({ id: 'invoices.description' })}
          </CardTitle>
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
      {(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion || invoice.aiDescription) && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-purple-700 dark:text-purple-300">
              <Sparkles className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.aiSuggestion' })}
              {invoice.aiConfidence != null && (
                <Badge variant="outline" className="text-xs ml-2">
                  {Math.round(invoice.aiConfidence * 100)}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
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
        </Card>
      )}

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
    </div>
  )
}
