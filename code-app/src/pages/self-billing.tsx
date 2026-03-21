import { useState, useMemo, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  Card, CardContent,
  Badge, Skeleton, Button, Input, Checkbox, Textarea,
  Tabs, TabsContent, TabsList, TabsTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, MonthPicker,
} from '@/components/ui'
import {
  FileText, Plus, RefreshCw, MoreHorizontal,
  Search, AlertCircle, Send, CheckCircle, XCircle,
  Upload, Download, Wand2, Filter, ChevronDown, Eye,
  FileSpreadsheet, AlertTriangle, Trash2,
} from 'lucide-react'
import {
  useSelfBillingInvoices,
  useSubmitSelfBillingForReview,
  useApproveSelfBillingInvoice,
  useRejectSelfBillingInvoice,
  useSendSelfBillingToKsef,
  useGenerateSelfBilling,
  useConfirmGeneratedSelfBilling,
  useImportSelfBilling,
  useConfirmSelfBillingImport,
  useBatchSubmitSelfBilling,
  useBatchApproveSelfBilling,
  useBatchRejectSelfBilling,
  useBatchSendToKsef,
  useBatchDeleteSelfBilling,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { buildXlsx } from '@/lib/xlsx-builder'
import type {
  SelfBillingInvoice,
  SelfBillingInvoiceListParams,
  SelfBillingInvoiceStatusType,
  SelfBillingGenerateRequest,
  SelfBillingGeneratePreview,
  SelfBillingImportResult,
  BatchActionResult,
} from '@/lib/types'

type TabValue = 'all' | 'Draft' | 'PendingSeller' | 'SellerApproved' | 'SellerRejected' | 'SentToKsef'

function InvoiceStatusBadge({ status }: { status: string }) {
  const intl = useIntl()
  const colors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    PendingSeller: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    SellerApproved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    SellerRejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    SentToKsef: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    Cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }
  return (
    <Badge className={colors[status] ?? colors.Draft}>
      {intl.formatMessage({ id: `selfBilling.status.${status}` })}
    </Badge>
  )
}

export function SelfBillingPage() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabValue>('all')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectId, setRejectId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  const params: SelfBillingInvoiceListParams = {
    settingId: selectedCompany?.id ?? '',
    status: tab !== 'all' ? (tab as SelfBillingInvoiceStatusType) : undefined,
  }

  const { data, isLoading, error, refetch } = useSelfBillingInvoices(params)
  const submitMutation = useSubmitSelfBillingForReview()
  const approveMutation = useApproveSelfBillingInvoice()
  const rejectMutation = useRejectSelfBillingInvoice()
  const sendToKsefMutation = useSendSelfBillingToKsef()
  const batchSubmitMutation = useBatchSubmitSelfBilling()
  const batchApproveMutation = useBatchApproveSelfBilling()
  const batchRejectMutation = useBatchRejectSelfBilling()
  const batchSendToKsefMutation = useBatchSendToKsef()
  const batchDeleteMutation = useBatchDeleteSelfBilling()

  // ── Selection state ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'submit' | 'approve' | 'sendKsef' | 'delete' | null>(null)

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(list: SelfBillingInvoice[]) {
    const ids = list.map(inv => inv.id)
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
    if (allSelected) {
      clearSelection()
    } else {
      setSelectedIds(new Set(ids))
    }
  }

  const invoices = useMemo(() => {
    let list = data?.invoices ?? []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        inv =>
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.supplierName?.toLowerCase().includes(q) ||
          inv.supplierNip?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) list = list.filter(inv => (inv.invoiceDate ?? '') >= dateFrom)
    if (dateTo) list = list.filter(inv => (inv.invoiceDate ?? '') <= dateTo)
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) list = list.filter(inv => inv.grossAmount >= min)
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) list = list.filter(inv => inv.grossAmount <= max)
    }
    return list
  }, [data, search, dateFrom, dateTo, minAmount, maxAmount])

  const activeFilterCount = [dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length

  function clearAdvancedFilters() {
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
  }

  // ── Actions ────────────────────────────────────────────────────

  function handleSubmit(id: string) {
    submitMutation.mutate(id, {
      onSuccess: () => toast.success(intl.formatMessage({ id: 'selfBilling.submitted' })),
      onError: (err) => toast.error(err.message),
    })
  }

  function handleApprove(id: string) {
    approveMutation.mutate({ id }, {
      onSuccess: () => toast.success(intl.formatMessage({ id: 'selfBilling.approved' })),
      onError: (err) => toast.error(err.message),
    })
  }

  function openReject(id: string) {
    setRejectId(id)
    setRejectReason('')
    setRejectOpen(true)
  }

  function handleReject() {
    if (!rejectId) return
    rejectMutation.mutate(
      { id: rejectId, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'selfBilling.rejected' }))
          setRejectOpen(false)
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  function handleSendToKsef(id: string) {
    sendToKsefMutation.mutate(id, {
      onSuccess: () => toast.success(intl.formatMessage({ id: 'selfBilling.sentToKsef' })),
      onError: (err) => toast.error(err.message),
    })
  }

  // ── Status summary ─────────────────────────────────────────────

  const allInvoices = data?.invoices ?? []
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const inv of allInvoices) {
      c[inv.status] = (c[inv.status] ?? 0) + 1
    }
    return c
  }, [allInvoices])

  // ── Bulk selection helpers ─────────────────────────────────

  const selectedInvoices = useMemo(() =>
    allInvoices.filter(inv => selectedIds.has(inv.id)),
    [allInvoices, selectedIds],
  )

  const eligibleCounts = useMemo(() => {
    const sel = selectedInvoices
    return {
      submit: sel.filter(inv => inv.status === 'Draft').length,
      approve: sel.filter(inv => inv.status === 'PendingSeller').length,
      reject: sel.filter(inv => inv.status === 'PendingSeller').length,
      sendKsef: sel.filter(inv => inv.status === 'SellerApproved').length,
      delete: sel.filter(inv => inv.status === 'Draft' || inv.status === 'SellerRejected').length,
    }
  }, [selectedInvoices])

  const isBulkBusy = batchSubmitMutation.isPending || batchApproveMutation.isPending ||
    batchRejectMutation.isPending || batchSendToKsefMutation.isPending || batchDeleteMutation.isPending

  const handleBatchResult = useCallback((result: BatchActionResult) => {
    clearSelection()
    if (result.failed === 0) {
      toast.success(intl.formatMessage({ id: 'selfBilling.bulk.resultSuccess' }, { count: result.succeeded }))
    } else {
      toast.warning(intl.formatMessage({ id: 'selfBilling.bulk.resultPartial' }, {
        succeeded: result.succeeded,
        total: result.total,
        failed: result.failed,
      }))
    }
  }, [clearSelection, intl])

  const executeBulkAction = useCallback((action: 'submit' | 'approve' | 'sendKsef' | 'delete') => {
    const ids = selectedInvoices
      .filter(inv => {
        if (action === 'submit') return inv.status === 'Draft'
        if (action === 'approve') return inv.status === 'PendingSeller'
        if (action === 'sendKsef') return inv.status === 'SellerApproved'
        if (action === 'delete') return inv.status === 'Draft' || inv.status === 'SellerRejected'
        return false
      })
      .map(inv => inv.id)

    if (ids.length === 0) return
    setBulkConfirmAction(null)

    const opts = {
      onSuccess: (result: BatchActionResult) => handleBatchResult(result),
      onError: (err: Error) => toast.error(err.message),
    }

    if (action === 'submit') batchSubmitMutation.mutate(ids, opts)
    else if (action === 'approve') batchApproveMutation.mutate(ids, opts)
    else if (action === 'sendKsef') batchSendToKsefMutation.mutate(ids, opts)
    else if (action === 'delete') batchDeleteMutation.mutate(ids, opts)
  }, [selectedInvoices, handleBatchResult, batchSubmitMutation, batchApproveMutation, batchSendToKsefMutation, batchDeleteMutation])

  const executeBulkReject = useCallback(() => {
    if (!bulkRejectReason.trim()) return
    const ids = selectedInvoices
      .filter(inv => inv.status === 'PendingSeller')
      .map(inv => inv.id)
    if (ids.length === 0) return
    setBulkRejectOpen(false)
    batchRejectMutation.mutate(
      { invoiceIds: ids, reason: bulkRejectReason.trim() },
      {
        onSuccess: (result) => handleBatchResult(result),
        onError: (err) => toast.error(err.message),
      },
    )
  }, [bulkRejectReason, selectedInvoices, handleBatchResult, batchRejectMutation])

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'selfBilling.title' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'selfBilling.subtitle' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'common.refresh' })}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'selfBilling.import' })}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'selfBilling.generate' })}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {(['Draft', 'PendingSeller', 'SellerApproved', 'SentToKsef'] as const).map(status => (
          <Card key={status} className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setTab(status)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: `selfBilling.status.${status}` })}
              </p>
              <p className="text-2xl font-bold mt-1">{counts[status] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search + Advanced Filters */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="all">
              {intl.formatMessage({ id: 'common.all' })} ({allInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="Draft">
              {intl.formatMessage({ id: 'selfBilling.status.Draft' })}
            </TabsTrigger>
            <TabsTrigger value="PendingSeller">
              {intl.formatMessage({ id: 'selfBilling.status.PendingSeller' })}
            </TabsTrigger>
            <TabsTrigger value="SellerApproved">
              {intl.formatMessage({ id: 'selfBilling.status.SellerApproved' })}
            </TabsTrigger>
            <TabsTrigger value="SellerRejected">
              {intl.formatMessage({ id: 'selfBilling.status.SellerRejected' })}
            </TabsTrigger>
            <TabsTrigger value="SentToKsef">
              {intl.formatMessage({ id: 'selfBilling.status.SentToKsef' })}
            </TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={intl.formatMessage({ id: 'selfBilling.searchPlaceholder' })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Advanced filters (collapsible) */}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(o => !o)}>
            <Filter className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'selfBilling.advancedFilters' })}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
          {filtersOpen && (
            <Card className="mt-2">
              <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">{intl.formatMessage({ id: 'selfBilling.dateFrom' })}</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{intl.formatMessage({ id: 'selfBilling.dateTo' })}</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{intl.formatMessage({ id: 'selfBilling.minAmount' })}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{intl.formatMessage({ id: 'selfBilling.maxAmount' })}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
                      {intl.formatMessage({ id: 'selfBilling.clearFilters' })}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filtered count */}
        {!isLoading && !error && (
          <p className="text-xs text-muted-foreground mt-2">
            {invoices.length} {intl.formatMessage({ id: 'selfBilling.invoicesCount' })}
          </p>
        )}

        <TabsContent value={tab} className="mt-4">
          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive">{error.message}</span>
              </CardContent>
            </Card>
          )}

          {/* Empty */}
          {!isLoading && !error && invoices.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  {intl.formatMessage({ id: 'selfBilling.empty' })}
                </h3>
              </CardContent>
            </Card>
          )}

          {/* Table (desktop) */}
          {!isLoading && !error && invoices.length > 0 && (
            <>
              <div className="hidden md:block rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={invoices.length > 0 && invoices.every(inv => selectedIds.has(inv.id))}
                          onCheckedChange={() => toggleSelectAll(invoices)}
                          aria-label={intl.formatMessage({ id: 'selfBilling.bulk.selectAll' })}
                        />
                      </th>
                      <th className="p-3 text-left font-medium">
                        {intl.formatMessage({ id: 'selfBilling.invoiceNumber' })}
                      </th>
                      <th className="p-3 text-left font-medium">
                        {intl.formatMessage({ id: 'selfBilling.supplier' })}
                      </th>
                      <th className="p-3 text-left font-medium">
                        {intl.formatMessage({ id: 'selfBilling.issueDate' })}
                      </th>
                      <th className="p-3 text-right font-medium">
                        {intl.formatMessage({ id: 'selfBilling.grossAmount' })}
                      </th>
                      <th className="p-3 text-left font-medium">
                        {intl.formatMessage({ id: 'common.status' })}
                      </th>
                      <th className="p-3 text-right font-medium">
                        {intl.formatMessage({ id: 'common.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map(inv => (
                      <tr key={inv.id} className={`hover:bg-muted/50 transition-colors ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.has(inv.id)}
                            onCheckedChange={() => toggleSelect(inv.id)}
                          />
                        </td>
                        <td className="p-3 font-mono text-xs">
                          <Link to={`/self-billing/${inv.id}`} className="text-primary hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="p-3">{inv.supplierName}</td>
                        <td className="p-3">{formatDate(inv.invoiceDate)}</td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(inv.grossAmount)}
                        </td>
                        <td className="p-3">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="p-3 text-right">
                          <InvoiceRowActions
                            invoice={inv}
                            onSubmit={handleSubmit}
                            onApprove={handleApprove}
                            onReject={openReject}
                            onSendToKsef={handleSendToKsef}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card list (mobile) */}
              <div className="md:hidden space-y-3">
                {invoices.map(inv => (
                  <Card key={inv.id} className={selectedIds.has(inv.id) ? 'ring-2 ring-primary/30' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          className="mt-1"
                          checked={selectedIds.has(inv.id)}
                          onCheckedChange={() => toggleSelect(inv.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-xs font-medium">{inv.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground mt-1">{inv.supplierName}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="font-medium">{formatCurrency(inv.grossAmount)}</span>
                              <InvoiceStatusBadge status={inv.status} />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <InvoiceRowActions
                              invoice={inv}
                              onSubmit={handleSubmit}
                              onApprove={handleApprove}
                              onReject={openReject}
                              onSendToKsef={handleSendToKsef}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate dialog */}
      <GenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({ id: 'selfBilling.rejectTitle' })}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={intl.formatMessage({ id: 'selfBilling.rejectReasonPlaceholder' })}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {intl.formatMessage({ id: 'selfBilling.reject' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Floating bulk toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium whitespace-nowrap">
            {intl.formatMessage({ id: 'selfBilling.bulk.selected' }, { count: selectedIds.size })}
          </span>

          {eligibleCounts.submit > 0 && (
            <Button size="sm" variant="outline" disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('submit')}>
              <Send className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'selfBilling.bulk.submit' })} ({eligibleCounts.submit})
            </Button>
          )}
          {eligibleCounts.approve > 0 && (
            <Button size="sm" variant="outline" disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('approve')}>
              <CheckCircle className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'selfBilling.bulk.approve' })} ({eligibleCounts.approve})
            </Button>
          )}
          {eligibleCounts.reject > 0 && (
            <Button size="sm" variant="outline" disabled={isBulkBusy}
              onClick={() => setBulkRejectOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'selfBilling.bulk.reject' })} ({eligibleCounts.reject})
            </Button>
          )}
          {eligibleCounts.sendKsef > 0 && (
            <Button size="sm" variant="outline" disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('sendKsef')}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'selfBilling.bulk.sendKsef' })} ({eligibleCounts.sendKsef})
            </Button>
          )}
          {eligibleCounts.delete > 0 && (
            <Button size="sm" variant="destructive" disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('delete')}>
              <Trash2 className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'selfBilling.bulk.delete' })} ({eligibleCounts.delete})
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={clearSelection}>
            {intl.formatMessage({ id: 'selfBilling.bulk.deselectAll' })}
          </Button>
        </div>
      )}

      {/* ── Bulk confirm dialog ── */}
      <Dialog open={bulkConfirmAction !== null} onOpenChange={(open) => { if (!open) setBulkConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'selfBilling.bulk.confirmTitle' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            {bulkConfirmAction && intl.formatMessage(
              { id: `selfBilling.bulk.confirm${bulkConfirmAction.charAt(0).toUpperCase()}${bulkConfirmAction.slice(1)}` as 'selfBilling.bulk.confirmSubmit' },
              { count: eligibleCounts[bulkConfirmAction as keyof typeof eligibleCounts] ?? 0 },
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmAction(null)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant={bulkConfirmAction === 'delete' ? 'destructive' : 'default'}
              disabled={isBulkBusy}
              onClick={() => bulkConfirmAction && executeBulkAction(bulkConfirmAction as 'submit' | 'approve' | 'sendKsef' | 'delete')}
            >
              {isBulkBusy
                ? intl.formatMessage({ id: 'selfBilling.bulk.processing' })
                : intl.formatMessage({ id: 'common.confirm' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk reject dialog ── */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({ id: 'selfBilling.bulk.reject' })} ({eligibleCounts.reject})
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={intl.formatMessage({ id: 'selfBilling.bulk.rejectReasonPlaceholder' })}
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant="destructive"
              disabled={!bulkRejectReason.trim() || batchRejectMutation.isPending}
              onClick={executeBulkReject}
            >
              {batchRejectMutation.isPending
                ? intl.formatMessage({ id: 'selfBilling.bulk.processing' })
                : intl.formatMessage({ id: 'selfBilling.bulk.reject' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Row actions (context-sensitive by status) ────────────────────

function InvoiceRowActions({
  invoice,
  onSubmit,
  onApprove,
  onReject,
  onSendToKsef,
}: {
  invoice: SelfBillingInvoice
  onSubmit: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onSendToKsef: (id: string) => void
}) {
  const intl = useIntl()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">          <DropdownMenuItem asChild>
            <Link to={`/self-billing/${invoice.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'common.view' })}
            </Link>
          </DropdownMenuItem>        {invoice.status === 'Draft' && (
          <DropdownMenuItem onClick={() => onSubmit(invoice.id)}>
            <Send className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'selfBilling.submitForReview' })}
          </DropdownMenuItem>
        )}
        {invoice.status === 'PendingSeller' && (
          <>
            <DropdownMenuItem onClick={() => onApprove(invoice.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'selfBilling.approve' })}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onReject(invoice.id)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'selfBilling.reject' })}
            </DropdownMenuItem>
          </>
        )}
        {invoice.status === 'SellerApproved' && (
          <DropdownMenuItem onClick={() => onSendToKsef(invoice.id)}>
            <Upload className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'selfBilling.sendToKsef' })}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Generate wizard dialog ───────────────────────────────────────

function GenerateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const generateMutation = useGenerateSelfBilling()
  const confirmMutation = useConfirmGeneratedSelfBilling()

  const [period, setPeriod] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [previewed, setPreviewed] = useState(false)
  const [previewCount, setPreviewCount] = useState(0)
  const [previewData, setPreviewData] = useState<SelfBillingGeneratePreview[]>([])

  function handleGenerate() {
    const [year, month] = period.split('-').map(Number)
    const request: SelfBillingGenerateRequest = {
      settingId: selectedCompany?.id ?? '',
      period: { month, year },
    }
    generateMutation.mutate(request, {
      onSuccess: (result) => {
        const previews = result.data.previews ?? []
        setPreviewData(previews)
        setPreviewCount(result.data.totals?.invoiceCount ?? previews.length)
        setPreviewed(true)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleConfirm() {
    confirmMutation.mutate(
      { settingId: selectedCompany?.id ?? '', previews: previewData },
      {
        onSuccess: (result) => {
          toast.success(
            intl.formatMessage(
              { id: 'selfBilling.generatedSuccess' },
              { count: result.data.created }
            )
          )
          onOpenChange(false)
          setPreviewed(false)
          setPreviewData([])
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: 'selfBilling.generateTitle' })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!previewed ? (
            <>
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: 'selfBilling.period' })}
              </label>
              <MonthPicker value={period} onChange={setPeriod} />
            </>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                {intl.formatMessage(
                  { id: 'selfBilling.previewCount' },
                  { count: previewCount }
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'selfBilling.confirmGenerate' })}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setPreviewed(false); setPreviewData([]) }}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          {!previewed ? (
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              <Wand2 className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'selfBilling.generatePreview' })}
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'selfBilling.confirmAndCreate' })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Import dialog ────────────────────────────────────────────────

const TEMPLATE_COLUMNS = [
  'invoiceNumber',
  'supplierNip',
  'supplierName',
  'invoiceDate',
  'dueDate',
  'currency',
  'itemDescription',
  'quantity',
  'unit',
  'unitPrice',
  'vatRate',
  'paymentTermDays',
  'sortOrder',
] as const

const SAMPLE_ROWS = [
  [
    'SF/2026/01/001', '1234567890', 'Supplier Name', '2026-01-15', '2026-02-14',
    'PLN', 'Consulting services', '10', 'h', '150.00', '23', '30', '1',
  ],
  [
    'SF/2026/01/001', '1234567890', 'Supplier Name', '2026-01-15', '2026-02-14',
    'PLN', 'Travel expenses', '1', 'szt.', '500.00', '23', '30', '2',
  ],
  [
    'SF/2026/01/002', '9876543210', 'Other Supplier', '2026-01-20', '2026-02-19',
    'PLN', 'Material delivery', '100', 'kg', '12.50', '23', '14', '1',
  ],
]

function downloadFile(content: string | Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob(
    [content instanceof Uint8Array ? content.buffer as ArrayBuffer : content],
    { type: mimeType },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function generateCsv(headers: readonly string[], sampleRows: string[][]): string {
  const BOM = '\uFEFF'
  const headerLine = headers.join(';')
  const dataLines = sampleRows.map((row) => row.join(';'))
  return BOM + [headerLine, ...dataLines].join('\r\n') + '\r\n'
}

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const importMutation = useImportSelfBilling()
  const confirmMutation = useConfirmSelfBillingImport()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<SelfBillingImportResult | null>(null)

  function handleDownloadCsv() {
    const csv = generateCsv(TEMPLATE_COLUMNS, SAMPLE_ROWS)
    downloadFile(csv, 'self-billing-import-template.csv', 'text/csv;charset=utf-8')
  }

  function handleDownloadExcel() {
    const xlsx = buildXlsx(TEMPLATE_COLUMNS, SAMPLE_ROWS)
    downloadFile(xlsx, 'self-billing-import-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
  }

  function handleUpload() {
    if (!file || !selectedCompany) return
    importMutation.mutate(
      { file, settingId: selectedCompany.id },
      {
        onSuccess: (result) => setPreview(result),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleConfirm() {
    if (!preview || !selectedCompany) return
    const validRows = preview.rows.filter((r) => r.valid)
    if (validRows.length === 0) return

    confirmMutation.mutate(
      { settingId: selectedCompany.id, rows: validRows },
      {
        onSuccess: (result) => {
          toast.success(
            intl.formatMessage(
              { id: 'selfBilling.generatedSuccess' },
              { count: result.created },
            ),
          )
          handleClose()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleClose() {
    onOpenChange(false)
    setFile(null)
    setPreview(null)
  }

  const validRows = preview?.rows.filter((r) => r.valid) ?? []
  const invalidRows = preview?.rows.filter((r) => !r.valid) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) { setFile(null); setPreview(null) }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: 'selfBilling.importTitle' })}
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'selfBilling.importDescription' })}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: 'selfBilling.downloadTemplate' })}:
              </span>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <span>
                {intl.formatMessage({ id: 'selfBilling.totalRows' })}:{' '}
                <strong>{preview.totalRows}</strong>
              </span>
              <span className="text-green-600">
                {intl.formatMessage({ id: 'selfBilling.validRows' })}:{' '}
                <strong>{preview.validRows}</strong>
              </span>
              <span className="text-red-600">
                {intl.formatMessage({ id: 'selfBilling.invalidRows' })}:{' '}
                <strong>{preview.invalidRows}</strong>
              </span>
            </div>

            {/* Parse errors */}
            {preview.parseErrors.length > 0 && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
                <p className="font-medium text-red-700 mb-1">
                  {intl.formatMessage({ id: 'selfBilling.parseErrors' })}:
                </p>
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  {preview.parseErrors.map((e, i) => (
                    <li key={i}>
                      {intl.formatMessage(
                        { id: 'selfBilling.rowError' },
                        { row: e.row, message: e.message },
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Invalid rows */}
            {invalidRows.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {intl.formatMessage({ id: 'selfBilling.invalidRowsDetail' })}:
                </p>
                <ul className="list-disc list-inside text-amber-600 space-y-0.5">
                  {invalidRows.map((row, i) => (
                    <li key={i}>
                      {row.supplierNip} — {row.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Valid rows preview */}
            {validRows.length > 0 && (
              <div className="max-h-60 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">
                        {intl.formatMessage({ id: 'selfBilling.supplier' })}
                      </th>
                      <th className="text-left p-2">
                        {intl.formatMessage({ id: 'selfBilling.item' })}
                      </th>
                      <th className="text-right p-2">
                        {intl.formatMessage({ id: 'selfBilling.quantity' })}
                      </th>
                      <th className="text-right p-2">
                        {intl.formatMessage({ id: 'selfBilling.netAmount' })}
                      </th>
                      <th className="text-right p-2">
                        {intl.formatMessage({ id: 'selfBilling.grossAmount' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.supplierName ?? row.supplierNip}</td>
                        <td className="p-2">{row.itemDescription}</td>
                        <td className="p-2 text-right">{row.quantity} {row.unit}</td>
                        <td className="p-2 text-right">{row.netAmount.toFixed(2)}</td>
                        <td className="p-2 text-right">{row.grossAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          {!preview ? (
            <Button onClick={handleUpload} disabled={!file || importMutation.isPending}>
              <Upload className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'selfBilling.import' })}
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={validRows.length === 0 || confirmMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'selfBilling.confirmAndCreate' })} ({validRows.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
