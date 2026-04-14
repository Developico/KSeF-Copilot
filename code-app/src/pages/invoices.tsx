import { useState, useMemo, useCallback, Fragment } from 'react'
import { useIntl } from 'react-intl'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Skeleton, Button, Input, Checkbox,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui'
import {
  FileText, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown,
  RefreshCw, Eye, Plus, ScanLine, Download,
  CheckCircle, XCircle, Trash2,
  Paperclip, StickyNote, CornerDownRight, Ban,
  Calendar, Building2, Sparkles, ChevronRight,
} from 'lucide-react'
import { useInvoices, useMarkInvoiceAsPaid, useUpdateInvoice, useDeleteInvoice, useBatchMarkPaidInvoices, useBatchMarkUnpaidInvoices, useBatchApproveInvoices, useBatchRejectInvoices, useBatchDeleteInvoices } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatDate } from '@/lib/format'
import { exportInvoicesToCsv } from '@/lib/export'
import {
  InvoiceFilters,
  type InvoiceFilterValues,
  type GroupBy,
  DEFAULT_FILTERS,
} from '@/components/invoices/invoice-filters'
import { DocumentScannerModal } from '@/components/invoices/document-scanner-modal'
import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import { InvoicePagination } from '@/components/invoices/invoice-pagination'
import { useHasRole } from '@/components/auth/auth-provider'
import { toast } from 'sonner'
import type { Invoice, InvoiceListParams, BatchActionResult } from '@/lib/types'

type SortField = 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

// ============================================================================
// Correction nesting — place corrective invoices right after their parent
// ============================================================================

interface NestedInvoice {
  invoice: Invoice
  isCorrection: boolean
}

/** Detect corrective invoices by type field OR by KOR/ prefix (fallback when invoiceType is missing) */
function isCorrectiveInvoice(inv: Invoice): boolean {
  return inv.invoiceType === 'Corrective' || /^KOR[/\-]/i.test(inv.invoiceNumber ?? '')
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
      corrections.sort((a, b) =>
        (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? '')
      )
      for (const corr of corrections) {
        result.push({ invoice: corr, isCorrection: true })
      }
    }
  }

  return result
}

/** Group invoices by selected grouping key. */
function groupInvoices(
  invoices: Invoice[],
  groupBy: GroupBy,
  intl: ReturnType<typeof useIntl>
): { key: string; label: string; invoices: Invoice[]; totalGross: number; isPartialPln: boolean }[] {
  if (groupBy === 'none') {
    const total = invoices.reduce((s, inv) => s + (inv.grossAmountPln ?? inv.grossAmount), 0)
    const isPartialPln = invoices.some(inv => inv.currency !== 'PLN' && !inv.grossAmountPln)
    return [{ key: '__all', label: '', invoices, totalGross: total, isPartialPln }]
  }

  const groups = new Map<string, Invoice[]>()

  for (const inv of invoices) {
    let key: string
    if (groupBy === 'date') {
      key = inv.invoiceDate ? inv.invoiceDate.slice(0, 7) : '__none'
    } else if (groupBy === 'mpk') {
      key = inv.mpkCenterName || inv.mpk || '__none'
    } else {
      key = inv.category ?? '__none'
    }
    const list = groups.get(key) ?? []
    list.push(inv)
    groups.set(key, list)
  }

  const noneLabel =
    groupBy === 'date'
      ? intl.formatMessage({ id: 'invoices.noDate' })
      : groupBy === 'mpk'
        ? intl.formatMessage({ id: 'invoices.noMpk' })
        : intl.formatMessage({ id: 'invoices.noCategory' })

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === '__none') return 1
      if (b === '__none') return -1
      return a.localeCompare(b)
    })
    .map(([key, invs]) => {
      const total = invs.reduce((s, inv) => s + (inv.grossAmountPln ?? inv.grossAmount), 0)
      const isPartialPln = invs.some(inv => inv.currency !== 'PLN' && !inv.grossAmountPln)
      return {
        key,
        label: key === '__none' ? noneLabel : key,
        invoices: invs,
        totalGross: total,
        isPartialPln,
      }
    })
}

/** Client-side description status filter. */
function matchesDescriptionStatus(inv: Invoice, status: InvoiceFilterValues['descriptionStatus']): boolean {
  if (status === 'all') return true
  if (status === 'notDescribed') return !inv.description && !inv.mpkCenterName && !inv.mpk && !inv.category
  if (status === 'aiSuggestion') return Boolean(inv.aiMpkSuggestion || inv.aiCategorySuggestion)
  // described
  return Boolean(inv.description || inv.mpkCenterName || inv.mpk || inv.category)
}

/** Client-side supplier search filter. */
function matchesSupplierSearch(inv: Invoice, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (inv.supplierName?.toLowerCase().includes(q) ?? false) ||
    (inv.supplierNip?.includes(q) ?? false)
  )
}

export function InvoicesPage() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  const isAdmin = useHasRole('Admin')

  const [filters, setFilters] = useState<InvoiceFilterValues>(DEFAULT_FILTERS)
  const [currentPage, setCurrentPage] = useState(0)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // Build API query params from filters
  const params = useMemo<InvoiceListParams>(() => {
    const p: InvoiceListParams = {
      settingId: selectedCompany?.id,
      orderBy: filters.sortColumn as InvoiceListParams['orderBy'],
      orderDirection: filters.sortDirection,
    }
    if (filters.paymentStatus === 'overdue') {
      p.paymentStatus = 'pending'
      p.overdue = true
    } else if (filters.paymentStatus !== 'all') {
      p.paymentStatus = filters.paymentStatus
    }
    if (filters.search.trim()) p.search = filters.search.trim()
    if (filters.fromDate) p.fromDate = filters.fromDate
    if (filters.toDate) p.toDate = filters.toDate
    if (filters.dueDateFrom) p.dueDateFrom = filters.dueDateFrom
    if (filters.dueDateTo) p.dueDateTo = filters.dueDateTo
    if (filters.minAmount) p.minAmount = parseFloat(filters.minAmount)
    if (filters.maxAmount) p.maxAmount = parseFloat(filters.maxAmount)
    if (filters.mpk) p.mpk = filters.mpk
    if (filters.category) p.category = filters.category
    if (filters.source !== 'all') p.source = filters.source
    if (filters.approvalStatus !== 'all') p.approvalStatus = filters.approvalStatus
    return p
  }, [selectedCompany?.id, filters])

  const { data, isLoading, error, refetch } = useInvoices(params, {
    enabled: !companyLoading && Boolean(selectedCompany?.id),
  })

  // Mutations for inline actions
  const markPaidMutation = useMarkInvoiceAsPaid({
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: 'invoices.markedAsPaid' }))
      void refetch()
    },
  })
  const updateInvoiceMutation = useUpdateInvoice({
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: 'invoices.markedAsUnpaid' }))
      void refetch()
    },
  })
  const deleteInvoiceMutation = useDeleteInvoice({
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: 'invoices.deleteSuccess' }))
      void refetch()
    },
  })

  // Bulk action mutations
  const batchMarkPaidMutation = useBatchMarkPaidInvoices()
  const batchMarkUnpaidMutation = useBatchMarkUnpaidInvoices()
  const batchApproveMutation = useBatchApproveInvoices()
  const batchRejectMutation = useBatchRejectInvoices()
  const batchDeleteMutation = useBatchDeleteInvoices()

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'markPaid' | 'markUnpaid' | 'approve' | 'delete' | null>(null)
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(list: Invoice[]) {
    const ids = list.map(inv => inv.id)
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
    if (allSelected) clearSelection()
    else setSelectedIds(new Set(ids))
  }

  // Client-side filtering (supplier search + description status + corrections)
  const allInvoices = data?.invoices ?? []
  
  // Build correction parent IDs set once for reuse
  const correctionsParentIds = useMemo(() => {
    return new Set(
      allInvoices
        .filter(i => isCorrectiveInvoice(i) && i.parentInvoiceId)
        .map(i => i.parentInvoiceId!)
    )
  }, [allInvoices])
  
  const clientFilteredInvoices = useMemo(() => {
    let result = allInvoices
      .filter((inv) => matchesDescriptionStatus(inv, filters.descriptionStatus))
      .filter((inv) => matchesSupplierSearch(inv, filters.supplierSearch))
    
    if (filters.correctionsOnly) {
      result = result.filter(
        inv => isCorrectiveInvoice(inv) || correctionsParentIds.has(inv.id)
      )
    }
    
    return result
  }, [allInvoices, filters.descriptionStatus, filters.supplierSearch, filters.correctionsOnly, correctionsParentIds])

  const totalFiltered = clientFilteredInvoices.length

  // Pagination
  const paginatedInvoices = useMemo(() => {
    const start = currentPage * PAGE_SIZE
    return clientFilteredInvoices.slice(start, start + PAGE_SIZE)
  }, [clientFilteredInvoices, currentPage])

  // Grouping
  const groups = useMemo(
    () => groupInvoices(paginatedInvoices, filters.groupBy, intl),
    [paginatedInvoices, filters.groupBy, intl]
  )

  // Derive unique MPK/Category values for filter dropdowns
  const mpkOptions = useMemo(
    () => [...new Set(allInvoices.map((i) => i.mpkCenterName || i.mpk).filter(Boolean) as string[])].sort(),
    [allInvoices]
  )
  const categoryOptions = useMemo(
    () => [...new Set(allInvoices.map((i) => i.category).filter(Boolean) as string[])].sort(),
    [allInvoices]
  )

  // Reset page when filters change
  const handleFilterChange = useCallback((newFilters: InvoiceFilterValues) => {
    setFilters(newFilters)
    setCurrentPage(0)
  }, [])

  // Sort toggling (works via filter state)
  function toggleSort(field: SortField) {
    if (filters.sortColumn === field) {
      handleFilterChange({ ...filters, sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })
    } else {
      handleFilterChange({ ...filters, sortColumn: field, sortDirection: 'desc' })
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (filters.sortColumn !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return filters.sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  const handleExportCsv = () => {
    exportInvoicesToCsv(clientFilteredInvoices, {
      startDate: filters.fromDate || undefined,
      endDate: filters.toDate || undefined,
    })
  }

  const handleMarkAsPaid = (invoiceId: string) => {
    markPaidMutation.mutate({ id: invoiceId })
  }

  const handleMarkAsUnpaid = (invoiceId: string) => {
    updateInvoiceMutation.mutate({ id: invoiceId, data: { paymentStatus: 'pending' } })
  }

  const handleDelete = (invoiceId: string) => {
    deleteInvoiceMutation.mutate(invoiceId)
  }

  // ── Bulk action helpers ─────────────────────────────────

  const selectedInvoices = useMemo(() =>
    allInvoices.filter(inv => selectedIds.has(inv.id)),
    [allInvoices, selectedIds],
  )

  const eligibleCounts = useMemo(() => {
    const sel = selectedInvoices
    return {
      markPaid: sel.filter(inv => inv.paymentStatus !== 'paid').length,
      markUnpaid: sel.filter(inv => inv.paymentStatus === 'paid').length,
      approve: sel.filter(inv => inv.approvalStatus === 'Pending' || inv.approvalStatus === 'Draft').length,
      reject: sel.filter(inv => inv.approvalStatus === 'Pending' || inv.approvalStatus === 'Draft').length,
      delete: sel.length,
    }
  }, [selectedInvoices])

  const isBulkBusy = batchMarkPaidMutation.isPending || batchMarkUnpaidMutation.isPending ||
    batchApproveMutation.isPending || batchRejectMutation.isPending || batchDeleteMutation.isPending

  function handleBatchResult(result: BatchActionResult) {
    clearSelection()
    void refetch()
    if (result.failed === 0) {
      toast.success(intl.formatMessage({ id: 'invoices.bulk.resultSuccess' }, { count: result.succeeded }))
    } else {
      toast.warning(intl.formatMessage({ id: 'invoices.bulk.resultPartial' }, {
        succeeded: result.succeeded,
        total: result.total,
        failed: result.failed,
      }))
    }
  }

  const executeBulkAction = useCallback((action: 'markPaid' | 'markUnpaid' | 'approve' | 'delete') => {
    const ids = selectedInvoices
      .filter(inv => {
        if (action === 'markPaid') return inv.paymentStatus !== 'paid'
        if (action === 'markUnpaid') return inv.paymentStatus === 'paid'
        if (action === 'approve') return inv.approvalStatus === 'Pending' || inv.approvalStatus === 'Draft'
        if (action === 'delete') return true
        return false
      })
      .map(inv => inv.id)

    if (ids.length === 0) return
    setBulkConfirmAction(null)

    const opts = {
      onSuccess: (result: BatchActionResult) => handleBatchResult(result),
      onError: (err: Error) => toast.error(err.message),
    }

    if (action === 'markPaid') batchMarkPaidMutation.mutate(ids, opts)
    else if (action === 'markUnpaid') batchMarkUnpaidMutation.mutate(ids, opts)
    else if (action === 'approve') batchApproveMutation.mutate(ids, opts)
    else if (action === 'delete') batchDeleteMutation.mutate(ids, opts)
  }, [selectedInvoices, batchMarkPaidMutation, batchMarkUnpaidMutation, batchApproveMutation, batchDeleteMutation])

  const executeBulkReject = useCallback(() => {
    if (!bulkRejectReason.trim()) return
    const ids = selectedInvoices
      .filter(inv => inv.approvalStatus === 'Pending' || inv.approvalStatus === 'Draft')
      .map(inv => inv.id)
    if (ids.length === 0) return
    setBulkRejectOpen(false)
    batchRejectMutation.mutate(
      { invoiceIds: ids, comment: bulkRejectReason.trim() },
      {
        onSuccess: (result) => handleBatchResult(result),
        onError: (err) => toast.error(err.message),
      },
    )
  }, [selectedInvoices, bulkRejectReason, batchRejectMutation])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {intl.formatMessage({ id: 'invoices.title' })}
            </h1>
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'invoices.subtitle' })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'invoices.scanDocument' })}
          </Button>
          <Link to="/invoices/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'invoices.addInvoice' })}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={clientFilteredInvoices.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'invoices.exportCsv' })}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'common.refresh' })}
          </Button>
        </div>
      </div>

      {/* Advanced filters */}
      <InvoiceFilters
        filters={filters}
        onChange={handleFilterChange}
        mpkOptions={mpkOptions}
        categoryOptions={categoryOptions}
      />

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
      ) : totalFiltered === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {intl.formatMessage({ id: 'invoices.noInvoices' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {filters.search || filters.paymentStatus !== 'all'
                ? intl.formatMessage({ id: 'invoices.noMatchingInvoices' })
                : intl.formatMessage({ id: 'invoices.runSyncToFetch' })}
            </p>
            {!filters.search && filters.paymentStatus === 'all' && (
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
            {totalFiltered} {intl.formatMessage({ id: 'dashboard.invoicesLabel' })}
          </div>

          {groups.map((group) => (
            <Fragment key={group.key}>
              {/* Group header (collapsible) */}
              {filters.groupBy !== 'none' && (
                <button
                  onClick={() => toggleGroupCollapse(group.key)}
                  className="flex items-center gap-2 mb-2 mt-4 w-full text-left hover:opacity-80 transition-opacity"
                >
                  {collapsedGroups.has(group.key) ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                    {group.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({group.invoices.length})
                  </span>
                  <span className="ml-auto text-sm font-semibold">
                    {group.isPartialPln ? '~ ' : ''}{formatCurrency(group.totalGross, 'PLN')}
                  </span>
                </button>
              )}

              {/* Group content (collapsible) */}
              {(filters.groupBy === 'none' || !collapsedGroups.has(group.key)) && (
              <>
              {/* Desktop table */}
              <div className="hidden md:block rounded-md border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={group.invoices.length > 0 && group.invoices.every(inv => selectedIds.has(inv.id))}
                          onCheckedChange={() => toggleSelectAll(group.invoices)}
                          aria-label={intl.formatMessage({ id: 'invoices.bulk.selectAll' })}
                        />
                      </th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">
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
                      <th className="text-left p-3 font-medium hidden xl:table-cell">
                        {intl.formatMessage({ id: 'invoices.mpk' })}
                      </th>
                      <th className="text-left p-3 font-medium hidden xl:table-cell">
                        {intl.formatMessage({ id: 'invoices.category' })}
                      </th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">
                        {intl.formatMessage({ id: 'invoices.approvalColumn' })}
                      </th>
                      <th className="text-center p-3 font-medium whitespace-nowrap">
                        {intl.formatMessage({ id: 'invoices.selfBillingColumn' })}
                      </th>
                      <th className="p-3 text-center font-medium">
                        {intl.formatMessage({ id: 'common.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nestCorrections(group.invoices).map(({ invoice: inv, isCorrection }) => (
                      <tr key={inv.id} className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${isCorrection ? 'bg-orange-50/40 dark:bg-orange-950/20 border-l-2 border-l-orange-300 dark:border-l-orange-700' : ''} ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`} onDoubleClick={() => navigate(`/invoices/${inv.id}`)}>
                        <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(inv.id)}
                            onCheckedChange={() => toggleSelect(inv.id)}
                            aria-label={inv.invoiceNumber}
                          />
                        </td>
                        <td className="p-3 whitespace-nowrap hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(inv.invoiceDate)}
                          </div>
                        </td>
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
                          </div>
                          <div className="text-xs text-muted-foreground lg:hidden">
                            {formatDate(inv.invoiceDate)}
                          </div>
                        </td>
                        <td className="p-3 max-w-48" title={inv.supplierName}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground hidden md:block shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium text-sm">{inv.supplierName}</span>
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
                              {inv.supplierNip && (
                                <div className="text-xs text-muted-foreground hidden sm:block">
                                  NIP: {inv.supplierNip}
                                </div>
                              )}
                            </div>
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
                        <td className="p-3 hidden xl:table-cell">
                          {(inv.mpkCenterName || inv.mpk) ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-200">
                              {inv.mpkCenterName || inv.mpk}
                            </Badge>
                          ) : inv.aiMpkSuggestion ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-200 gap-1">
                              <Sparkles className="h-3 w-3" />
                              {inv.aiMpkSuggestion}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="p-3 hidden xl:table-cell">
                          {inv.category ? (
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-200">
                              {inv.category}
                            </Badge>
                          ) : inv.aiCategorySuggestion ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-200 gap-1">
                              <Sparkles className="h-3 w-3" />
                              {inv.aiCategorySuggestion}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
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
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); inv.paymentStatus === 'paid' ? handleMarkAsUnpaid(inv.id) : handleMarkAsPaid(inv.id) }}
                                disabled={markPaidMutation.isPending || updateInvoiceMutation.isPending}
                                title={inv.paymentStatus === 'paid' ? intl.formatMessage({ id: 'invoices.markAsUnpaid' }) : intl.formatMessage({ id: 'invoices.markAsPaid' })}
                              >
                                <CheckCircle
                                  className={`h-5 w-5 transition-colors ${inv.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                                />
                              </Button>
                            ) : (
                              <span className="inline-flex items-center justify-center h-8 w-8">
                                <CheckCircle
                                  className={`h-5 w-5 ${inv.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                                />
                              </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link to={`/invoices/${inv.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {isAdmin ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={intl.formatMessage({ id: 'common.delete' })}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {intl.formatMessage({ id: 'invoices.deleteConfirmTitle' })}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {intl.formatMessage(
                                        { id: 'invoices.deleteConfirmDesc' },
                                        { number: inv.invoiceNumber }
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(inv.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {intl.formatMessage({ id: 'common.delete' })}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <span className="w-8 h-8 inline-block" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 mb-4">
                {nestCorrections(group.invoices).map(({ invoice: inv, isCorrection }) => (
                  <div key={inv.id} className={isCorrection ? 'ml-4 border-l-2 border-l-orange-300 dark:border-l-orange-700 pl-2' : ''}>
                  <Card className={`hover:bg-muted/30 transition-colors ${isCorrection ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <Link to={`/invoices/${inv.id}`} className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isCorrection && <CornerDownRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                            <p className="font-medium truncate">{inv.supplierName}</p>
                            {inv.hasAttachments && <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            {inv.hasNotes && <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-mono mt-0.5 ${isCorrection ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>
                              {inv.invoiceNumber}
                            </p>
                            {isCorrectiveInvoice(inv) && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-[10px] px-1 py-0 leading-tight mt-0.5">
                                {intl.formatMessage({ id: 'invoices.invoiceTypeCorrective' })}
                              </Badge>
                            )}
                            {inv.invoiceType === 'Advance' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px] px-1 py-0 leading-tight mt-0.5">
                                {intl.formatMessage({ id: 'invoices.invoiceTypeAdvance' })}
                              </Badge>
                            )}
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
                          </div>
                          <div className="flex items-center gap-0.5">
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => inv.paymentStatus === 'paid' ? handleMarkAsUnpaid(inv.id) : handleMarkAsPaid(inv.id)}
                              >
                                <CheckCircle
                                  className={`h-4 w-4 transition-colors ${inv.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                                />
                              </Button>
                            ) : (
                              <span className="inline-flex items-center justify-center h-7 w-7">
                                <CheckCircle
                                  className={`h-4 w-4 ${inv.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                                />
                              </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link to={`/invoices/${inv.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
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
              </>
              )}
            </Fragment>
          ))}

          {/* Pagination */}
          <InvoicePagination
            currentPage={currentPage}
            totalItems={totalFiltered}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Document Scanner Modal */}
      <DocumentScannerModal open={scannerOpen} onOpenChange={setScannerOpen} />

      {/* Bulk action floating toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap max-w-[95vw]">
          <span className="text-sm font-medium whitespace-nowrap">
            {intl.formatMessage({ id: 'invoices.bulk.selected' }, { count: selectedIds.size })}
          </span>
          <div className="h-4 w-px bg-border" />
          {eligibleCounts.markPaid > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('markPaid')}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              {intl.formatMessage({ id: 'invoices.bulk.markPaid' }, { count: eligibleCounts.markPaid })}
            </Button>
          )}
          {eligibleCounts.markUnpaid > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('markUnpaid')}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" />
              {intl.formatMessage({ id: 'invoices.bulk.markUnpaid' }, { count: eligibleCounts.markUnpaid })}
            </Button>
          )}
          {eligibleCounts.approve > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('approve')}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              {intl.formatMessage({ id: 'invoices.bulk.approve' }, { count: eligibleCounts.approve })}
            </Button>
          )}
          {eligibleCounts.reject > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => { setBulkRejectReason(''); setBulkRejectOpen(true) }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              {intl.formatMessage({ id: 'invoices.bulk.reject' }, { count: eligibleCounts.reject })}
            </Button>
          )}
          {eligibleCounts.delete > 0 && (
            <Button
              size="sm"
              variant="destructive"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('delete')}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {intl.formatMessage({ id: 'invoices.bulk.delete' }, { count: eligibleCounts.delete })}
            </Button>
          )}
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            {intl.formatMessage({ id: 'invoices.bulk.deselectAll' })}
          </Button>
          {isBulkBusy && (
            <span className="text-xs text-muted-foreground animate-pulse">
              {intl.formatMessage({ id: 'invoices.bulk.processing' })}
            </span>
          )}
        </div>
      )}

      {/* Bulk confirm dialog */}
      <Dialog open={bulkConfirmAction !== null} onOpenChange={(open) => { if (!open) setBulkConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'invoices.bulk.confirmTitle' })}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">
            {bulkConfirmAction === 'markPaid' && intl.formatMessage({ id: 'invoices.bulk.confirmMarkPaid' }, { count: eligibleCounts.markPaid })}
            {bulkConfirmAction === 'markUnpaid' && intl.formatMessage({ id: 'invoices.bulk.confirmMarkUnpaid' }, { count: eligibleCounts.markUnpaid })}
            {bulkConfirmAction === 'approve' && intl.formatMessage({ id: 'invoices.bulk.confirmApprove' }, { count: eligibleCounts.approve })}
            {bulkConfirmAction === 'delete' && intl.formatMessage({ id: 'invoices.bulk.confirmDelete' }, { count: eligibleCounts.delete })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmAction(null)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant={bulkConfirmAction === 'delete' ? 'destructive' : 'default'}
              onClick={() => bulkConfirmAction && executeBulkAction(bulkConfirmAction)}
              disabled={isBulkBusy}
            >
              {isBulkBusy ? intl.formatMessage({ id: 'invoices.bulk.processing' }) : intl.formatMessage({ id: 'common.confirm' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk reject dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'invoices.bulk.confirmTitle' })}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm">{intl.formatMessage({ id: 'invoices.bulk.confirmReject' }, { count: eligibleCounts.reject })}</p>
            <Input
              placeholder={intl.formatMessage({ id: 'invoices.bulk.rejectReasonPlaceholder' })}
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant="destructive"
              onClick={executeBulkReject}
              disabled={isBulkBusy || !bulkRejectReason.trim()}
            >
              {isBulkBusy ? intl.formatMessage({ id: 'invoices.bulk.processing' }) : intl.formatMessage({ id: 'invoices.bulk.reject' }, { count: eligibleCounts.reject })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* End of InvoicesPage */
