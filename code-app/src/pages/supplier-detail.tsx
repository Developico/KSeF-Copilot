import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Skeleton, Button, Separator, Input,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui'
import {
  ArrowLeft, AlertCircle, Building2, FileText,
  RefreshCw, Calendar, ShieldCheck, Power, Plus, Loader2, Pencil, Trash2,
  ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, Eye, CheckCircle,
  XCircle, CornerDownRight, Paperclip, StickyNote,
} from 'lucide-react'
import {
  useSupplier, useSupplierStats, useInvoices,
  useRefreshSupplierVat, useSbAgreements, useUpdateSupplier,
  useCreateSbAgreement, useUpdateSbAgreement, useTerminateSbAgreement,
  useMarkInvoiceAsPaid, useUpdateInvoice, useDeleteInvoice,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { SupplierSbTemplates } from '@/components/suppliers/supplier-sb-templates'
import { SupplierNotesSection } from '@/components/suppliers/supplier-notes-section'
import { SupplierAttachmentsSection } from '@/components/suppliers/supplier-attachments-section'
import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { InvoicePagination } from '@/components/invoices/invoice-pagination'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import type { Invoice, InvoiceListParams } from '@/lib/types'

function StatusBadge({ status }: { status: string }) {
  const intl = useIntl()
  const map: Record<string, string> = {
    Active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    Blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return (
    <Badge className={map[status] ?? map.Inactive}>
      {intl.formatMessage({ id: `suppliers.status.${status}` })}
    </Badge>
  )
}

function PaymentBadge({ status, dueDate }: { status: Invoice['paymentStatus']; dueDate?: string }) {
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

function isCorrectiveInvoice(inv: Invoice): boolean {
  return inv.invoiceType === 'Corrective' || /^KOR[/\-]/i.test(inv.invoiceNumber ?? '')
}

interface NestedInvoice {
  invoice: Invoice
  isCorrection: boolean
}

function nestCorrections(invoices: Invoice[]): NestedInvoice[] {
  const correctionsByParent = new Map<string, Invoice[]>()
  for (const inv of invoices) {
    if (isCorrectiveInvoice(inv) && inv.parentInvoiceId) {
      const list = correctionsByParent.get(inv.parentInvoiceId) ?? []
      list.push(inv)
      correctionsByParent.set(inv.parentInvoiceId, list)
    }
  }
  if (correctionsByParent.size === 0) {
    return invoices.map(inv => ({ invoice: inv, isCorrection: false }))
  }
  const nestedCorrectionIds = new Set<string>()
  for (const [parentId, corrs] of correctionsByParent) {
    if (invoices.some(i => i.id === parentId)) {
      for (const c of corrs) nestedCorrectionIds.add(c.id)
    }
  }
  const result: NestedInvoice[] = []
  for (const inv of invoices) {
    if (nestedCorrectionIds.has(inv.id)) continue
    result.push({ invoice: inv, isCorrection: false })
    const corrections = correctionsByParent.get(inv.id)
    if (corrections) {
      corrections.sort((a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''))
      for (const corr of corrections) {
        result.push({ invoice: corr, isCorrection: true })
      }
    }
  }
  return result
}

interface InvoiceRowActionsProps {
  invoice: Invoice
  intl: ReturnType<typeof useIntl>
  onMarkAsPaid: (id: string) => void
  onMarkAsUnpaid: (id: string) => void
  onDelete: (id: string) => void
}

function InvoiceRowActions({ invoice, intl, onMarkAsPaid, onMarkAsUnpaid, onDelete }: InvoiceRowActionsProps) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/invoices/${invoice.id}`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.viewDetails' })}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {invoice.paymentStatus === 'paid' ? (
            <DropdownMenuItem onClick={() => onMarkAsUnpaid(invoice.id)}>
              <XCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'invoices.markAsUnpaid' })}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onMarkAsPaid(invoice.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'invoices.markAsPaid' })}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'common.delete' })}
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {intl.formatMessage({ id: 'invoices.deleteConfirmTitle' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {intl.formatMessage(
              { id: 'invoices.deleteConfirmDesc' },
              { number: invoice.invoiceNumber }
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(invoice.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {intl.formatMessage({ id: 'common.delete' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

export function SupplierDetailPage() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { selectedCompany } = useCompanyContext()
  const { data: supplierData, isLoading, error } = useSupplier(id ?? '')
  const { data: statsData } = useSupplierStats(id ?? '')
  const { data: agreementsData } = useSbAgreements({
    supplierId: id,
    settingId: selectedCompany?.id,
  })
  const refreshVatMutation = useRefreshSupplierVat()
  const updateMutation = useUpdateSupplier()
  const createAgreementMutation = useCreateSbAgreement()
  const updateAgreementMutation = useUpdateSbAgreement()
  const terminateAgreementMutation = useTerminateSbAgreement()

  const supplier = supplierData?.supplier
  const stats = statsData?.stats
  const agreements = agreementsData?.agreements ?? []
  const activeAgreement = agreements.find((a) => a.status === 'Active')

  // Invoice list — same data as the main invoices page, filtered by supplier
  type SortField = 'invoiceDate' | 'grossAmount' | 'dueDate'
  type SortDir = 'asc' | 'desc'
  const PAGE_SIZE = 25
  const [sortField, setSortField] = useState<SortField>('invoiceDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [invoicePage, setInvoicePage] = useState(0)

  const invoiceParams = useMemo<InvoiceListParams>(() => ({
    settingId: selectedCompany?.id,
    supplierNip: supplier?.nip,
    orderBy: sortField,
    orderDirection: sortDir,
  }), [selectedCompany?.id, supplier?.nip, sortField, sortDir])

  const { data: invoicesData, refetch: refetchInvoices } = useInvoices(invoiceParams, {
    enabled: Boolean(selectedCompany?.id) && Boolean(supplier?.nip),
  })
  const allInvoices = invoicesData?.invoices ?? []
  const paginatedInvoices = useMemo(() => {
    const start = invoicePage * PAGE_SIZE
    return allInvoices.slice(start, start + PAGE_SIZE)
  }, [allInvoices, invoicePage])

  const markPaidMutation = useMarkInvoiceAsPaid({
    onSuccess: () => { toast.success(intl.formatMessage({ id: 'invoices.markedAsPaid' })); void refetchInvoices() },
  })
  const updateInvoiceMutation = useUpdateInvoice({
    onSuccess: () => { toast.success(intl.formatMessage({ id: 'invoices.markedAsUnpaid' })); void refetchInvoices() },
  })
  const deleteInvoiceMutation = useDeleteInvoice({
    onSuccess: () => { toast.success(intl.formatMessage({ id: 'invoices.deleteSuccess' })); void refetchInvoices() },
  })

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setInvoicePage(0)
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  const handleMarkAsPaid = (invoiceId: string) => markPaidMutation.mutate({ id: invoiceId })
  const handleMarkAsUnpaid = (invoiceId: string) => updateInvoiceMutation.mutate({ id: invoiceId, data: { paymentStatus: 'pending' } })
  const handleDelete = (invoiceId: string) => deleteInvoiceMutation.mutate(invoiceId)

  const [showAgreementForm, setShowAgreementForm] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState(false)
  const [agreementForm, setAgreementForm] = useState({
    name: '',
    agreementDate: new Date().toISOString().split('T')[0],
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    notes: '',
    autoApprove: false,
  })

  function handleRefreshVat() {
    if (!id) return
    refreshVatMutation.mutate(id, {
      onSuccess: () => toast.success(intl.formatMessage({ id: 'suppliers.vatRefreshed' })),
      onError: (err) => toast.error(err.message),
    })
  }

  function handleReactivate() {
    if (!id) return
    updateMutation.mutate(
      { id, data: { status: 'Active' } },
      {
        onSuccess: () => toast.success(intl.formatMessage({ id: 'suppliers.reactivated' })),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-destructive">{error?.message ?? 'Supplier not found'}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            <StatusBadge status={supplier.status} />
          </div>
          <p className="text-sm text-muted-foreground font-mono">NIP: {supplier.nip}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshVat}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {intl.formatMessage({ id: 'suppliers.refreshVat' })}
        </Button>
        {supplier.status !== 'Active' && (
          <Button
            size="sm"
            onClick={handleReactivate}
            disabled={updateMutation.isPending}
          >
            <Power className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'suppliers.reactivate' })}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Supplier details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {intl.formatMessage({ id: 'suppliers.details' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label={intl.formatMessage({ id: 'suppliers.name' })} value={supplier.name} />
            <Separator />
            <DetailRow label="NIP" value={supplier.nip} mono />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'common.street' })} value={supplier.street} />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'suppliers.city' })} value={supplier.city} />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'suppliers.postalCode' })} value={supplier.postalCode} />
            <Separator />
            <DetailRow label={intl.formatMessage({ id: 'suppliers.source' })} value={supplier.source} />
            <Separator />
            <DetailRow
              label={intl.formatMessage({ id: 'suppliers.vatVerifiedAt' })}
              value={supplier.vatStatusDate ? formatDate(supplier.vatStatusDate) : undefined}
            />
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {intl.formatMessage({ id: 'suppliers.statistics' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <>
                <DetailRow
                  label={intl.formatMessage({ id: 'suppliers.totalInvoices' })}
                  value={String(stats.invoiceCount ?? 0)}
                />
                <Separator />
                <DetailRow
                  label={intl.formatMessage({ id: 'suppliers.totalAmount' })}
                  value={formatCurrency(stats.totalGross ?? 0)}
                />
                <Separator />
                <DetailRow
                  label={intl.formatMessage({ id: 'suppliers.lastInvoiceDate' })}
                  value={stats.lastInvoiceDate ? formatDate(stats.lastInvoiceDate) : undefined}
                />
                <Separator />
                <DetailRow
                  label={intl.formatMessage({ id: 'suppliers.selfBillingCount' })}
                  value={String(stats.selfBillingInvoiceCount ?? 0)}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {intl.formatMessage({ id: 'suppliers.noStats' })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {intl.formatMessage({ id: 'invoices.title' })}
            {allInvoices.length > 0 && (
              <Badge variant="secondary" className="ml-2">{allInvoices.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {intl.formatMessage({ id: 'suppliers.noInvoices' })}
            </p>
          ) : (
            <>
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
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'invoices.approvalColumn' })}
                      </th>
                      <th className="text-center p-3 font-medium whitespace-nowrap">
                        {intl.formatMessage({ id: 'invoices.selfBillingColumn' })}
                      </th>
                      <th className="text-center p-3 font-medium">
                        {intl.formatMessage({ id: 'invoices.paymentStatus' })}
                      </th>
                      <th className="p-3 text-right font-medium">
                        {intl.formatMessage({ id: 'common.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nestCorrections(paginatedInvoices).map(({ invoice: inv, isCorrection }) => (
                      <tr
                        key={inv.id}
                        className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${isCorrection ? 'bg-orange-50/40 dark:bg-orange-950/20 border-l-2 border-l-orange-300 dark:border-l-orange-700' : ''}`}
                        onDoubleClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="p-3 whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                        <td className="p-3 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            {isCorrection && (
                              <CornerDownRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                            )}
                            <span className={isCorrection ? 'text-orange-700 dark:text-orange-300' : ''}>{inv.invoiceNumber}</span>
                            {isCorrectiveInvoice(inv) && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-[10px] px-1 py-0 leading-tight font-sans">
                                {intl.formatMessage({ id: 'invoices.invoiceTypeCorrective' })}
                              </Badge>
                            )}
                            {inv.invoiceType === 'Advance' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px] px-1 py-0 leading-tight font-sans">
                                {intl.formatMessage({ id: 'invoices.invoiceTypeAdvance' })}
                              </Badge>
                            )}
                            {inv.hasAttachments && (
                              <span title={`${inv.attachmentCount ?? 0} attachment(s)`}>
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </span>
                            )}
                            {inv.hasNotes && (
                              <span title={`${inv.noteCount ?? 0} note(s)`}>
                                <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`p-3 text-right font-medium whitespace-nowrap ${inv.grossAmount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {inv.currency !== 'PLN' && inv.grossAmountPln ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">{formatCurrency(inv.grossAmount, inv.currency)}</span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <span className="text-xs">≈ {formatCurrency(inv.grossAmountPln, 'PLN')}</span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : formatCurrency(inv.grossAmount, inv.currency)}
                        </td>
                        <td className="p-3 text-muted-foreground">{inv.mpkCenterName || inv.mpk || '—'}</td>
                        <td className="p-3 text-muted-foreground">{inv.category ?? '—'}</td>
                        <td className="p-3">
                          <ApprovalStatusBadge status={inv.approvalStatus} />
                        </td>
                        <td className="p-3 text-center">
                          {inv.isSelfBilling && (
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800 text-[10px] px-1.5 py-0 leading-tight font-sans">
                              {intl.formatMessage({ id: 'invoices.selfBillingColumn' })}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <PaymentBadge status={inv.paymentStatus} dueDate={inv.dueDate} />
                        </td>
                        <td className="p-3 text-right">
                          <InvoiceRowActions
                            invoice={inv}
                            intl={intl}
                            onMarkAsPaid={handleMarkAsPaid}
                            onMarkAsUnpaid={handleMarkAsUnpaid}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {nestCorrections(paginatedInvoices).map(({ invoice: inv, isCorrection }) => (
                  <div key={inv.id} className={isCorrection ? 'ml-4 border-l-2 border-l-orange-300 dark:border-l-orange-700 pl-2' : ''}>
                    <Card className={`hover:bg-muted/30 transition-colors ${isCorrection ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <Link to={`/invoices/${inv.id}`} className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isCorrection && <CornerDownRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                              <p className={`text-xs font-mono ${isCorrection ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>
                                {inv.invoiceNumber}
                              </p>
                              {isCorrectiveInvoice(inv) && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-[10px] px-1 py-0 leading-tight">
                                  {intl.formatMessage({ id: 'invoices.invoiceTypeCorrective' })}
                                </Badge>
                              )}
                              {inv.hasAttachments && <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              {inv.hasNotes && <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(inv.invoiceDate)}</p>
                          </Link>
                          <div className="flex items-start gap-2 shrink-0 ml-3">
                            <div className="text-right">
                              <p className={`font-medium ${inv.grossAmount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {inv.currency !== 'PLN' && inv.grossAmountPln ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help">{formatCurrency(inv.grossAmount, inv.currency)}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        <span className="text-xs">≈ {formatCurrency(inv.grossAmountPln, 'PLN')}</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : formatCurrency(inv.grossAmount, inv.currency)}
                              </p>
                              <div className="mt-1">
                                <PaymentBadge status={inv.paymentStatus} dueDate={inv.dueDate} />
                              </div>
                            </div>
                            <InvoiceRowActions
                              invoice={inv}
                              intl={intl}
                              onMarkAsPaid={handleMarkAsPaid}
                              onMarkAsUnpaid={handleMarkAsUnpaid}
                              onDelete={handleDelete}
                            />
                          </div>
                        </div>
                        {(inv.mpkCenterName || inv.mpk || inv.category || inv.isSelfBilling) && (
                          <div className="flex gap-2 mt-2">
                            {(inv.mpkCenterName || inv.mpk) && (
                              <Badge variant="outline" className="text-xs">{inv.mpkCenterName || inv.mpk}</Badge>
                            )}
                            {inv.category && (
                              <Badge variant="outline" className="text-xs">{inv.category}</Badge>
                            )}
                            {inv.isSelfBilling && (
                              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800 text-xs">
                                {intl.formatMessage({ id: 'invoices.selfBillingColumn' })}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <InvoicePagination
                currentPage={invoicePage}
                totalItems={allInvoices.length}
                pageSize={PAGE_SIZE}
                onPageChange={setInvoicePage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Self-billing agreement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              {intl.formatMessage({ id: 'suppliers.agreement.title' })}
            </CardTitle>
            {!activeAgreement && !showAgreementForm && !editingAgreement && (
              <Button variant="outline" size="sm" onClick={() => setShowAgreementForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'suppliers.agreement.add' })}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeAgreement && !editingAgreement ? (
            <>
              <DetailRow
                label={intl.formatMessage({ id: 'suppliers.agreement.name' })}
                value={activeAgreement.name}
              />
              <Separator />
              <DetailRow
                label={intl.formatMessage({ id: 'suppliers.agreement.status' })}
                value={activeAgreement.status}
              />
              <Separator />
              <DetailRow
                label={intl.formatMessage({ id: 'suppliers.agreement.validFrom' })}
                value={formatDate(activeAgreement.validFrom)}
              />
              <Separator />
              <DetailRow
                label={intl.formatMessage({ id: 'suppliers.agreement.validTo' })}
                value={activeAgreement.validTo ? formatDate(activeAgreement.validTo) : '—'}
              />
              {activeAgreement.notes && (
                <>
                  <Separator />
                  <DetailRow
                    label={intl.formatMessage({ id: 'suppliers.agreement.notes' })}
                    value={activeAgreement.notes}
                  />
                </>
              )}
              <Separator />
              <DetailRow
                label={intl.formatMessage({ id: 'suppliers.agreement.autoApprove' })}
                value={
                  <Badge className={activeAgreement.autoApprove ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}>
                    {activeAgreement.autoApprove
                      ? intl.formatMessage({ id: 'suppliers.agreement.autoApproveOn' })
                      : intl.formatMessage({ id: 'suppliers.agreement.autoApproveOff' })}
                  </Badge>
                }
              />
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAgreementForm({
                      name: activeAgreement.name,
                      agreementDate: activeAgreement.agreementDate?.split('T')[0] ?? '',
                      validFrom: activeAgreement.validFrom?.split('T')[0] ?? '',
                      validTo: activeAgreement.validTo?.split('T')[0] ?? '',
                      notes: activeAgreement.notes ?? '',
                      autoApprove: activeAgreement.autoApprove ?? false,
                    })
                    setEditingAgreement(true)
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  {intl.formatMessage({ id: 'suppliers.agreement.edit' })}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={terminateAgreementMutation.isPending}
                  onClick={() => {
                    terminateAgreementMutation.mutate(activeAgreement.id, {
                      onSuccess: () => toast.success(intl.formatMessage({ id: 'suppliers.agreement.terminated' })),
                      onError: (err) => toast.error(err.message),
                    })
                  }}
                >
                  {terminateAgreementMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Trash2 className="h-4 w-4 mr-1" />
                  {intl.formatMessage({ id: 'suppliers.agreement.terminate' })}
                </Button>
              </div>
            </>
          ) : (showAgreementForm || editingAgreement) ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{intl.formatMessage({ id: 'suppliers.agreement.name' })}</label>
                  <Input
                    value={agreementForm.name}
                    onChange={(e) => setAgreementForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={intl.formatMessage({ id: 'suppliers.agreement.namePlaceholder' })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{intl.formatMessage({ id: 'suppliers.agreement.agreementDate' })}</label>
                  <Input
                    type="date"
                    value={agreementForm.agreementDate}
                    onChange={(e) => setAgreementForm(f => ({ ...f, agreementDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{intl.formatMessage({ id: 'suppliers.agreement.validFrom' })}</label>
                  <Input
                    type="date"
                    value={agreementForm.validFrom}
                    onChange={(e) => setAgreementForm(f => ({ ...f, validFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{intl.formatMessage({ id: 'suppliers.agreement.validTo' })}</label>
                  <Input
                    type="date"
                    value={agreementForm.validTo}
                    onChange={(e) => setAgreementForm(f => ({ ...f, validTo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{intl.formatMessage({ id: 'suppliers.agreement.notes' })}</label>
                <Input
                  value={agreementForm.notes}
                  onChange={(e) => setAgreementForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={intl.formatMessage({ id: 'suppliers.agreement.notesPlaceholder' })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoApprove"
                  checked={agreementForm.autoApprove}
                  onCheckedChange={(checked) => setAgreementForm(f => ({ ...f, autoApprove: checked === true }))}
                />
                <label htmlFor="autoApprove" className="text-sm font-medium cursor-pointer">
                  {intl.formatMessage({ id: 'suppliers.agreement.autoApprove' })}
                </label>
                <span className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'suppliers.agreement.autoApproveHint' })}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAgreementForm(false); setEditingAgreement(false) }}>
                  {intl.formatMessage({ id: 'common.cancel' })}
                </Button>
                {editingAgreement ? (
                  <Button
                    size="sm"
                    disabled={!agreementForm.name || !agreementForm.validFrom || updateAgreementMutation.isPending}
                    onClick={() => {
                      updateAgreementMutation.mutate(
                        {
                          id: activeAgreement!.id,
                          data: {
                            name: agreementForm.name,
                            agreementDate: agreementForm.agreementDate,
                            validFrom: agreementForm.validFrom,
                            validTo: agreementForm.validTo || undefined,
                            notes: agreementForm.notes || undefined,
                            autoApprove: agreementForm.autoApprove,
                          },
                        },
                        {
                          onSuccess: () => {
                            setEditingAgreement(false)
                            toast.success(intl.formatMessage({ id: 'suppliers.agreement.updated' }))
                          },
                          onError: (err) => toast.error(err.message),
                        }
                      )
                    }}
                  >
                    {updateAgreementMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {intl.formatMessage({ id: 'common.save' })}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!agreementForm.name || !agreementForm.validFrom || createAgreementMutation.isPending}
                    onClick={() => {
                      createAgreementMutation.mutate(
                        {
                          supplierId: id,
                          settingId: selectedCompany?.id,
                          name: agreementForm.name,
                          agreementDate: agreementForm.agreementDate,
                          validFrom: agreementForm.validFrom,
                          validTo: agreementForm.validTo || undefined,
                          notes: agreementForm.notes || undefined,
                          autoApprove: agreementForm.autoApprove,
                        },
                        {
                          onSuccess: () => {
                            setShowAgreementForm(false)
                            toast.success(intl.formatMessage({ id: 'suppliers.agreement.created' }))
                          },
                          onError: (err) => toast.error(err.message),
                        }
                      )
                    }}
                  >
                    {createAgreementMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {intl.formatMessage({ id: 'common.save' })}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {intl.formatMessage({ id: 'suppliers.agreement.noAgreement' })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Self-billing templates */}
      {supplier.settingId && (
        <SupplierSbTemplates supplierId={id ?? ''} settingId={supplier.settingId} />
      )}


      {/* Notes */}
      <SupplierNotesSection supplierId={id ?? ''} />

      {/* Attachments */}
      <SupplierAttachmentsSection supplierId={id ?? ''} />
    </div>
  )
}
