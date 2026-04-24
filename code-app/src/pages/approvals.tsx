import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  Card, CardContent,
  Badge, Skeleton, Button, Checkbox,
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Input, Label,
} from '@/components/ui'
import {
  ShieldCheck, ShieldX, ShieldAlert, Clock, AlertTriangle,
  HandCoins, Building2, Calendar, Search, RefreshCw, CheckCircle, XCircle,
  Sparkles, Receipt,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useCompanyContext } from '@/contexts/company-context'
import {
  usePendingApprovals,
  useReportApprovalHistory,
  useApproveInvoice,
  useRejectInvoice,
  useBulkApprove,
  useSelfBillingInvoices,
  useApproveSelfBillingInvoice,
  useRejectSelfBillingInvoice,
  useCostDocuments,
  useBatchApproveCostDocuments,
  useBatchRejectCostDocuments,
} from '@/hooks/use-api'
import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import type { PendingApproval, SelfBillingInvoice, CostDocument } from '@/lib/types'

type ViewType = 'pending' | 'history' | 'costs-pending' | 'costs-history' | 'sb-pending' | 'sb-history'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ApprovalsPage() {
  const intl = useIntl()
  const { isAdmin } = useAuth()
  const { selectedCompany } = useCompanyContext()
  const settingId = selectedCompany?.id ?? ''

  // View & search state
  const [view, setView] = useState<ViewType>('pending')
  const [search, setSearch] = useState('')

  // Pending tab
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = usePendingApprovals(settingId)
  const allPendingItems = pendingData?.approvals ?? []
  const pendingCount = pendingData?.count ?? 0

  // SB Pending — fetch PendingSeller invoices
  const { data: sbPendingData, isLoading: sbPendingLoading, refetch: refetchSbPending } = useSelfBillingInvoices(
    settingId ? { settingId, status: 'PendingSeller' } : undefined,
    { enabled: !!settingId }
  )
  const allSbPendingItems = sbPendingData?.invoices ?? []
  const sbPendingCount = allSbPendingItems.length

  // SB History — fetch Approved + Rejected SB invoices
  const { data: sbApprovedData, isLoading: sbApprovedLoading } = useSelfBillingInvoices(
    settingId ? { settingId, status: 'SellerApproved' } : undefined,
    { enabled: !!settingId }
  )
  const { data: sbRejectedData, isLoading: sbRejectedLoading } = useSelfBillingInvoices(
    settingId ? { settingId, status: 'SellerRejected' } : undefined,
    { enabled: !!settingId }
  )
  const sbHistoryLoading = sbApprovedLoading || sbRejectedLoading
  const allSbHistoryItems = useMemo(() => {
    const items = [
      ...(sbApprovedData?.invoices ?? []),
      ...(sbRejectedData?.invoices ?? []),
    ]
    return items.sort((a, b) => new Date(b.approvedAt ?? b.modifiedOn).getTime() - new Date(a.approvedAt ?? a.modifiedOn).getTime())
  }, [sbApprovedData, sbRejectedData])
  const sbHistoryCount = allSbHistoryItems.length

  // Cost Documents Pending Approval
  const { data: costsPendingData, isLoading: costsPendingLoading, refetch: refetchCostsPending } = useCostDocuments(
    settingId ? { settingId, approvalStatus: 'Pending' } : undefined,
    { enabled: !!settingId }
  )
  const allCostsPendingItems = costsPendingData?.items ?? []
  const costsPendingCount = allCostsPendingItems.length

  // Cost Documents Approval History (Approved + Rejected)
  const { data: costsApprovedData, isLoading: costsApprovedLoading } = useCostDocuments(
    settingId ? { settingId, approvalStatus: 'Approved' } : undefined,
    { enabled: !!settingId }
  )
  const { data: costsRejectedData, isLoading: costsRejectedLoading } = useCostDocuments(
    settingId ? { settingId, approvalStatus: 'Rejected' } : undefined,
    { enabled: !!settingId }
  )
  const costsHistoryLoading = costsApprovedLoading || costsRejectedLoading
  const allCostsHistoryItems = useMemo(() => {
    const items = [
      ...(costsApprovedData?.items ?? []),
      ...(costsRejectedData?.items ?? []),
    ]
    return items.sort((a, b) => new Date(b.approvedAt ?? b.modifiedOn ?? b.createdOn).getTime() - new Date(a.approvedAt ?? a.modifiedOn ?? a.createdOn).getTime())
  }, [costsApprovedData, costsRejectedData])

  // SB mutations
  const sbApproveMutation = useApproveSelfBillingInvoice()
  const sbRejectMutation = useRejectSelfBillingInvoice()

  // SB reject dialog
  const [sbRejectDialog, setSbRejectDialog] = useState<{ id: string; invoiceNumber: string } | null>(null)
  const [sbRejectReason, setSbRejectReason] = useState('')

  // Cost document mutations
  const costApproveMutation = useBatchApproveCostDocuments()
  const costRejectMutation = useBatchRejectCostDocuments()

  // Cost doc action dialog
  const [costActionDialog, setCostActionDialog] = useState<{
    type: 'approve' | 'reject'
    id: string
    documentNumber: string
  } | null>(null)
  const [costComment, setCostComment] = useState('')

  // Auto-switch to SB tab when no regular pending but SB pending exists
  const autoSwitched = useRef(false)
  useEffect(() => {
    if (!autoSwitched.current && pendingCount === 0 && sbPendingCount > 0) {
      setView('sb-pending')
      autoSwitched.current = true
    }
  }, [pendingCount, sbPendingCount])

  // History tab filters
  const [historyStatus, setHistoryStatus] = useState<string>('all')
  const historyFilters = historyStatus !== 'all' ? { status: historyStatus } : undefined
  const { data: historyData, isLoading: historyLoading } = useReportApprovalHistory(
    settingId,
    historyFilters,
  )
  const allHistoryEntries = historyData?.data?.entries ?? []
  const historySummary = historyData?.data?.summary

  // Client-side search filtering
  const pendingItems = useMemo(() => {
    if (!search) return allPendingItems
    const q = search.toLowerCase()
    return allPendingItems.filter(
      (item) =>
        item.invoiceNumber?.toLowerCase().includes(q) ||
        item.supplierName?.toLowerCase().includes(q)
    )
  }, [allPendingItems, search])

  const historyEntries = useMemo(() => {
    if (!search) return allHistoryEntries
    const q = search.toLowerCase()
    return allHistoryEntries.filter(
      (entry) =>
        entry.invoiceNumber?.toLowerCase().includes(q) ||
        entry.supplierName?.toLowerCase().includes(q)
    )
  }, [allHistoryEntries, search])

  const sbPendingItems = useMemo(() => {
    if (!search) return allSbPendingItems
    const q = search.toLowerCase()
    return allSbPendingItems.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.supplierName?.toLowerCase().includes(q) ||
        inv.supplierNip?.includes(q)
    )
  }, [allSbPendingItems, search])

  const sbHistoryItems = useMemo(() => {
    if (!search) return allSbHistoryItems
    const q = search.toLowerCase()
    return allSbHistoryItems.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.supplierName?.toLowerCase().includes(q) ||
        inv.supplierNip?.includes(q)
    )
  }, [allSbHistoryItems, search])

  const costsPendingItems = useMemo(() => {
    if (!search) return allCostsPendingItems
    const q = search.toLowerCase()
    return allCostsPendingItems.filter(
      (doc) =>
        doc.documentNumber?.toLowerCase().includes(q) ||
        doc.issuerName?.toLowerCase().includes(q)
    )
  }, [allCostsPendingItems, search])

  const costsHistoryItems = useMemo(() => {
    if (!search) return allCostsHistoryItems
    const q = search.toLowerCase()
    return allCostsHistoryItems.filter(
      (doc) =>
        doc.documentNumber?.toLowerCase().includes(q) ||
        doc.issuerName?.toLowerCase().includes(q)
    )
  }, [allCostsHistoryItems, search])

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingItems.map((item) => item.invoiceId)))
    }
  }, [selectedIds.size, pendingItems])

  // Mutations
  const approveMutation = useApproveInvoice()
  const rejectMutation = useRejectInvoice()
  const bulkApproveMutation = useBulkApprove()

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'bulk-approve'
    invoiceId?: string
    invoiceNumber?: string
  } | null>(null)
  const [comment, setComment] = useState('')

  const openAction = useCallback(
    (type: 'approve' | 'reject', item: PendingApproval) => {
      setComment('')
      setActionDialog({ type, invoiceId: item.invoiceId, invoiceNumber: item.invoiceNumber })
    },
    [],
  )

  const openBulkApprove = useCallback(() => {
    setComment('')
    setActionDialog({ type: 'bulk-approve' })
  }, [])

  const closeDialog = useCallback(() => {
    setActionDialog(null)
    setComment('')
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!actionDialog) return

    try {
      if (actionDialog.type === 'approve' && actionDialog.invoiceId) {
        await approveMutation.mutateAsync({
          invoiceId: actionDialog.invoiceId,
          comment: comment || undefined,
        })
        toast.success(intl.formatMessage({ id: 'approval.approved' }))
      } else if (actionDialog.type === 'reject' && actionDialog.invoiceId) {
        await rejectMutation.mutateAsync({
          invoiceId: actionDialog.invoiceId,
          comment: comment || undefined,
        })
        toast.success(intl.formatMessage({ id: 'approval.rejected' }))
      } else if (actionDialog.type === 'bulk-approve') {
        const ids = Array.from(selectedIds)
        await bulkApproveMutation.mutateAsync({
          invoiceIds: ids,
          comment: comment || undefined,
        })
        toast.success(intl.formatMessage({ id: 'approvals.bulkApproveSuccess' }, { count: ids.length }))
        setSelectedIds(new Set())
      }
      closeDialog()
    } catch {
      if (actionDialog.type === 'bulk-approve') {
        toast.error(intl.formatMessage({ id: 'approvals.bulkApproveError' }))
      } else {
        toast.error(
          actionDialog.type === 'approve'
            ? intl.formatMessage({ id: 'approvals.approveError' })
            : intl.formatMessage({ id: 'approvals.rejectError' }),
        )
      }
    }
  }, [actionDialog, comment, selectedIds, approveMutation, rejectMutation, bulkApproveMutation, intl, closeDialog])

  // SB approve / reject handlers
  const handleSbApprove = useCallback(async (inv: SelfBillingInvoice) => {
    try {
      await sbApproveMutation.mutateAsync({ id: inv.id })
      toast.success(intl.formatMessage({ id: 'approval.approved' }))
      refetchSbPending()
    } catch {
      toast.error(intl.formatMessage({ id: 'approvals.approveError' }))
    }
  }, [sbApproveMutation, intl, refetchSbPending])

  const handleSbRejectConfirm = useCallback(async () => {
    if (!sbRejectDialog) return
    try {
      await sbRejectMutation.mutateAsync({ id: sbRejectDialog.id, reason: sbRejectReason || '' })
      toast.success(intl.formatMessage({ id: 'approval.rejected' }))
      setSbRejectDialog(null)
      setSbRejectReason('')
      refetchSbPending()
    } catch {
      toast.error(intl.formatMessage({ id: 'approvals.rejectError' }))
    }
  }, [sbRejectDialog, sbRejectReason, sbRejectMutation, intl, refetchSbPending])

  // Cost doc approve / reject handlers
  const handleCostConfirm = useCallback(async () => {
    if (!costActionDialog) return
    try {
      if (costActionDialog.type === 'approve') {
        await costApproveMutation.mutateAsync([costActionDialog.id])
        toast.success(intl.formatMessage({ id: 'approval.approved' }))
      } else {
        await costRejectMutation.mutateAsync([costActionDialog.id])
        toast.success(intl.formatMessage({ id: 'approval.rejected' }))
      }
      setCostActionDialog(null)
      setCostComment('')
      refetchCostsPending()
    } catch {
      toast.error(
        costActionDialog.type === 'approve'
          ? intl.formatMessage({ id: 'approvals.approveError' })
          : intl.formatMessage({ id: 'approvals.rejectError' })
      )
    }
  }, [costActionDialog, costApproveMutation, costRejectMutation, intl, refetchCostsPending])

  // Refresh all data
  const handleRefresh = useCallback(() => {
    refetchPending()
    refetchSbPending()
    refetchCostsPending()
  }, [refetchPending, refetchSbPending, refetchCostsPending])

  const isMutating =
    approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending
  const isSbMutating = sbApproveMutation.isPending || sbRejectMutation.isPending
  const isCostMutating = costApproveMutation.isPending || costRejectMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'approvals.title' })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'approvals.subtitle' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {intl.formatMessage({ id: 'common.refresh' })}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={intl.formatMessage({ id: 'common.search' })}
          className="pl-9"
        />
      </div>

      {/* Tab bar — two labeled sections */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1">
        {/* INVOICES section */}
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {intl.formatMessage({ id: 'approvals.invoicesSection' })}
        </span>
        <Button
          variant={view === 'pending' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1.5"
          onClick={() => setView('pending')}
        >
          <ShieldCheck className="h-4 w-4" />
          {intl.formatMessage({ id: 'approvals.pendingTab' })}
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 min-w-5 px-1">
              {pendingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={view === 'history' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('history')}
        >
          {intl.formatMessage({ id: 'approvals.historyTab' })}
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* INNE KOSZTY section */}
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {intl.formatMessage({ id: 'approvals.costsSection' })}
        </span>
        <Button
          variant={view === 'costs-pending' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1.5"
          onClick={() => setView('costs-pending')}
        >
          <Receipt className="h-4 w-4" />
          {intl.formatMessage({ id: 'approvals.pendingTab' })}
          {costsPendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 min-w-5 px-1">
              {costsPendingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={view === 'costs-history' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('costs-history')}
        >
          {intl.formatMessage({ id: 'approvals.historyTab' })}
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* SELF-BILLING section */}
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {intl.formatMessage({ id: 'approvals.sbSection' })}
        </span>
        <Button
          variant={view === 'sb-pending' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1.5"
          onClick={() => setView('sb-pending')}
        >
          <HandCoins className="h-4 w-4" />
          {intl.formatMessage({ id: 'approvals.pendingTab' })}
          {sbPendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 min-w-5 px-1">
              {sbPendingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={view === 'sb-history' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('sb-history')}
        >
          {intl.formatMessage({ id: 'approvals.sbHistoryTab' })}
        </Button>
      </div>

      {/* ============================================================== */}
      {/* Invoice Pending View                                            */}
      {/* ============================================================== */}
      {view === 'pending' && (
        <div className="space-y-4">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: 'approvals.selected' }, { count: selectedIds.size })}
              </span>
              <Button size="sm" onClick={openBulkApprove}>
                <ShieldCheck className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'approvals.bulkApprove' })}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                {intl.formatMessage({ id: 'approvals.clearSelection' })}
              </Button>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {pendingLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mb-4 opacity-40" />
                  <p>{intl.formatMessage({ id: 'approvals.noPending' })}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-10 p-3">
                          <Checkbox
                            checked={
                              selectedIds.size === pendingItems.length && pendingItems.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                            aria-label={intl.formatMessage({ id: 'approvals.selectAll' })}
                          />
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.invoiceNumber' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.supplier' })}
                        </th>
                        <th className="text-right p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.amount' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.mpk' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.pendingSince' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.slaDeadline' })}
                        </th>
                        <th className="text-right p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.actions' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.map((item) => (
                        <tr
                          key={item.invoiceId}
                          className={`border-b hover:bg-muted/30 transition-colors ${item.isOverdue ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selectedIds.has(item.invoiceId)}
                              onCheckedChange={() => toggleSelect(item.invoiceId)}
                            />
                          </td>
                          <td className="p-3">
                            <Link
                              to={`/invoices/${item.invoiceId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {item.invoiceNumber}
                            </Link>
                          </td>
                          <td className="p-3 max-w-48 truncate">{item.supplierName}</td>
                          <td className="p-3 text-right font-mono">
                            {formatCurrency(item.grossAmount, item.currency)}
                          </td>
                          <td className="p-3">
                            {(() => {
                              const value = item.mpkCenterName
                              if (!value) return <span className="text-muted-foreground text-sm">—</span>
                              return (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                  {value}
                                </Badge>
                              )
                            })()}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatDateTime(item.submittedAt)}
                          </td>
                          <td className="p-3">
                            {item.slaDeadline ? (
                              <span
                                className={
                                  item.isOverdue
                                    ? 'text-destructive font-medium'
                                    : 'text-muted-foreground text-sm'
                                }
                              >
                                {item.isOverdue && (
                                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                                )}
                                {formatDateTime(item.slaDeadline)}
                                {item.isOverdue && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">
                                    {intl.formatMessage({ id: 'approvals.overdue' })}
                                  </Badge>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => openAction('approve', item)}
                                disabled={isMutating}
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                {intl.formatMessage({ id: 'approval.approve' })}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-700 border-red-200 hover:bg-red-50"
                                onClick={() => openAction('reject', item)}
                                disabled={isMutating}
                              >
                                <ShieldX className="h-4 w-4 mr-1" />
                                {intl.formatMessage({ id: 'approval.reject' })}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* Invoice History View                                            */}
      {/* ============================================================== */}
      {view === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={historyStatus} onValueChange={setHistoryStatus}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder={intl.formatMessage({ id: 'approvals.status' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {intl.formatMessage({ id: 'approvals.status' })}: {intl.formatMessage({ id: 'approvals.all' })}
                </SelectItem>
                <SelectItem value="Approved">
                  {intl.formatMessage({ id: 'approval.status.Approved' })}
                </SelectItem>
                <SelectItem value="Rejected">
                  {intl.formatMessage({ id: 'approval.status.Rejected' })}
                </SelectItem>
              </SelectContent>
            </Select>

            {historySummary && (
              <div className="flex gap-2 ml-auto">
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                  {intl.formatMessage({ id: 'approval.status.Approved' })}: {historySummary.approved}
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                  {intl.formatMessage({ id: 'approval.status.Rejected' })}: {historySummary.rejected}
                </Badge>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12 mb-4 opacity-40" />
                  <p>{intl.formatMessage({ id: 'approvals.noHistory' })}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.invoiceNumber' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.supplier' })}
                        </th>
                        <th className="text-right p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.amount' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.mpk' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.status' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approval.decidedBy' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approval.decidedAt' })}
                        </th>
                        <th className="text-left p-3 font-medium">
                          {intl.formatMessage({ id: 'approvals.comment' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEntries.map((entry, idx) => (
                        <tr key={`${entry.invoiceId}-${idx}`} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Link
                              to={`/invoices/${entry.invoiceId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {entry.invoiceNumber}
                            </Link>
                          </td>
                          <td className="p-3 max-w-48 truncate">{entry.supplierName}</td>
                          <td className="p-3 text-right font-mono">
                            {formatCurrency(entry.grossAmount, entry.currency)}
                          </td>
                          <td className="p-3">
                            {entry.mpkCenterName ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                {entry.mpkCenterName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <ApprovalStatusBadge status={entry.approvalStatus as 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'} />
                          </td>
                          <td className="p-3 text-sm">{entry.approvedBy ?? '—'}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {formatShortDate(entry.approvedAt)}
                          </td>
                          <td className="p-3 max-w-48 truncate text-sm text-muted-foreground">
                            {entry.approvalComment ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* Costs Pending View                                              */}
      {/* ============================================================== */}
      {view === 'costs-pending' && (
        <Card>
          <CardContent className="p-0">
            {costsPendingLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : costsPendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-40" />
                <p>{intl.formatMessage({ id: 'approvals.noCostsPending' })}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.documentNumber' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.documentType' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: 'approvals.issuer' })}
                      </th>
                      <th className="text-right p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.amount' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.mpk' })}
                      </th>
                      <th className="text-right p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {costsPendingItems.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <Link
                            to={`/costs/${doc.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {doc.documentNumber}
                          </Link>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {intl.formatMessage({ id: `costs.docType.${doc.documentType}` })}
                          </Badge>
                        </td>
                        <td className="p-3 max-w-48 truncate">{doc.issuerName}</td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(doc.grossAmount, doc.currency)}
                        </td>
                        <td className="p-3">
                          {(() => {
                            const value = doc.costCenter || doc.aiMpkSuggestion
                            const isAi = !!doc.aiMpkSuggestion && (!doc.costCenter || doc.costCenter === doc.aiMpkSuggestion)
                            if (!value) return <span className="text-muted-foreground text-sm">—</span>
                            return isAi ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 gap-1">
                                <Sparkles className="h-3 w-3" />{value}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                {value}
                              </Badge>
                            )
                          })()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-700 border-green-200 hover:bg-green-50"
                              onClick={() => setCostActionDialog({ type: 'approve', id: doc.id, documentNumber: doc.documentNumber })}
                              disabled={isCostMutating}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {intl.formatMessage({ id: 'approval.approve' })}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-700 border-red-200 hover:bg-red-50"
                              onClick={() => setCostActionDialog({ type: 'reject', id: doc.id, documentNumber: doc.documentNumber })}
                              disabled={isCostMutating}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {intl.formatMessage({ id: 'approval.reject' })}
                            </Button>
                          </div>
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

      {/* ============================================================== */}
      {/* Costs History View                                              */}
      {/* ============================================================== */}
      {view === 'costs-history' && (
        <Card>
          <CardContent className="p-0">
            {costsHistoryLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : costsHistoryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-40" />
                <p>{intl.formatMessage({ id: 'approvals.noCostsHistory' })}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.documentNumber' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.documentType' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: 'approvals.issuer' })}
                      </th>
                      <th className="text-right p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.amount' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.mpk' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.status' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approval.decidedBy' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approval.decidedAt' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {costsHistoryItems.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <Link
                            to={`/costs/${doc.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {doc.documentNumber}
                          </Link>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {intl.formatMessage({ id: `costs.docType.${doc.documentType}` })}
                          </Badge>
                        </td>
                        <td className="p-3 max-w-48 truncate">{doc.issuerName}</td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(doc.grossAmount, doc.currency)}
                        </td>
                        <td className="p-3">
                          {(() => {
                            const value = doc.costCenter || doc.aiMpkSuggestion
                            const isAi = !!doc.aiMpkSuggestion && (!doc.costCenter || doc.costCenter === doc.aiMpkSuggestion)
                            if (!value) return <span className="text-muted-foreground text-sm">—</span>
                            return isAi ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 gap-1">
                                <Sparkles className="h-3 w-3" />{value}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                {value}
                              </Badge>
                            )
                          })()}
                        </td>
                        <td className="p-3">
                          <ApprovalStatusBadge status={doc.approvalStatus as 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'} />
                        </td>
                        <td className="p-3 text-sm">{doc.approvedBy ?? '—'}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatShortDate(doc.approvedAt)}
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

      {/* ============================================================== */}
      {/* SB Pending View                                                 */}
      {/* ============================================================== */}
      {view === 'sb-pending' && (
        <Card>
          <CardContent className="p-0">
            {sbPendingLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sbPendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <HandCoins className="h-12 w-12 mb-4 opacity-40" />
                <p>{intl.formatMessage({ id: 'approvals.noPending' })}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.invoiceNumber' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: 'approvals.date' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: 'approvals.supplier' })}
                      </th>
                      <th className="text-right p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.amount' })}
                      </th>
                      <th className="text-right p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbPendingItems.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <Link
                            to={`/self-billing/${inv.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatShortDate(inv.invoiceDate)}
                        </td>
                        <td className="p-3">
                          <span className="max-w-48 truncate block">{inv.supplierName}</span>
                          <span className="text-xs text-muted-foreground">{inv.supplierNip}</span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(inv.grossAmount, inv.currency)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-700 border-green-200 hover:bg-green-50"
                              onClick={() => handleSbApprove(inv)}
                              disabled={isSbMutating}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {intl.formatMessage({ id: 'approval.approve' })}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-700 border-red-200 hover:bg-red-50"
                              onClick={() => setSbRejectDialog({ id: inv.id, invoiceNumber: inv.invoiceNumber })}
                              disabled={isSbMutating}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {intl.formatMessage({ id: 'approval.reject' })}
                            </Button>
                          </div>
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

      {/* ============================================================== */}
      {/* SB History View                                                 */}
      {/* ============================================================== */}
      {view === 'sb-history' && (
        <Card>
          <CardContent className="p-0">
            {sbHistoryLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sbHistoryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <HandCoins className="h-12 w-12 mb-4 opacity-40" />
                <p>{intl.formatMessage({ id: 'approvals.sbNoHistory' })}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.invoiceNumber' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: 'approvals.date' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: 'approvals.supplier' })}
                      </th>
                      <th className="text-right p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.amount' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.status' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.sbApprovedAt' })}
                      </th>
                      <th className="text-left p-3 font-medium">
                        {intl.formatMessage({ id: 'approvals.sbRejectedReason' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbHistoryItems.map((inv) => {
                      const isApproved = inv.status === 'SellerApproved'
                      return (
                        <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Link
                              to={`/self-billing/${inv.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                          {formatShortDate(inv.invoiceDate)}
                          </td>
                          <td className="p-3">
                            <span className="max-w-48 truncate block">{inv.supplierName}</span>
                            <span className="text-xs text-muted-foreground">{inv.supplierNip}</span>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatCurrency(inv.grossAmount, inv.currency)}
                          </td>
                          <td className="p-3">
                            {isApproved ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {intl.formatMessage({ id: 'approvals.sbStatusApproved' })}
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                {intl.formatMessage({ id: 'approvals.sbStatusRejected' })}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {formatShortDate(inv.approvedAt ?? inv.modifiedOn)}
                          </td>
                          <td className="p-3 max-w-48 truncate text-sm text-muted-foreground">
                            {inv.rejectionReason ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Invoice Action Dialog (Approve / Reject / Bulk Approve)          */}
      {/* ================================================================ */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'approve' &&
                intl.formatMessage({ id: 'approvals.approveTitle' })}
              {actionDialog?.type === 'reject' &&
                intl.formatMessage({ id: 'approvals.rejectTitle' })}
              {actionDialog?.type === 'bulk-approve' &&
                intl.formatMessage({ id: 'approvals.bulkApproveTitle' })}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'approve' &&
                intl.formatMessage({ id: 'approvals.approveDesc' })}
              {actionDialog?.type === 'reject' &&
                intl.formatMessage({ id: 'approvals.rejectDesc' })}
              {actionDialog?.type === 'bulk-approve' &&
                intl.formatMessage({ id: 'approvals.bulkApproveDesc' }, { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: 'approvals.commentLabel' })}</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={intl.formatMessage({ id: 'approval.commentPlaceholder' })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isMutating}
              className={
                actionDialog?.type === 'reject'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {isMutating
                ? intl.formatMessage({ id: 'approvals.processing' })
                : actionDialog?.type === 'reject'
                  ? intl.formatMessage({ id: 'approval.reject' })
                  : intl.formatMessage({ id: 'approval.approve' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Cost Document Action Dialog (Approve / Reject)                  */}
      {/* ================================================================ */}
      <Dialog open={!!costActionDialog} onOpenChange={(open) => { if (!open) { setCostActionDialog(null); setCostComment('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {costActionDialog?.type === 'approve'
                ? intl.formatMessage({ id: 'approvals.approveTitle' })
                : intl.formatMessage({ id: 'approvals.rejectTitle' })}
            </DialogTitle>
            <DialogDescription>
              {costActionDialog?.documentNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: 'approvals.commentLabel' })}</Label>
            <Input
              value={costComment}
              onChange={(e) => setCostComment(e.target.value)}
              placeholder={intl.formatMessage({ id: 'approval.commentPlaceholder' })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCostActionDialog(null); setCostComment('') }}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              onClick={handleCostConfirm}
              disabled={isCostMutating}
              className={costActionDialog?.type === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isCostMutating
                ? intl.formatMessage({ id: 'approvals.processing' })
                : costActionDialog?.type === 'reject'
                  ? intl.formatMessage({ id: 'approval.reject' })
                  : intl.formatMessage({ id: 'approval.approve' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* SB Reject Dialog                                                 */}
      {/* ================================================================ */}
      <Dialog open={!!sbRejectDialog} onOpenChange={(open) => { if (!open) { setSbRejectDialog(null); setSbRejectReason('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({ id: 'approvals.rejectTitle' })}
            </DialogTitle>
            <DialogDescription>
              {sbRejectDialog?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: 'approvals.sbRejectedReason' })}</Label>
            <Input
              value={sbRejectReason}
              onChange={(e) => setSbRejectReason(e.target.value)}
              placeholder={intl.formatMessage({ id: 'approval.commentPlaceholder' })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSbRejectDialog(null); setSbRejectReason('') }}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              onClick={handleSbRejectConfirm}
              disabled={isSbMutating}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSbMutating
                ? intl.formatMessage({ id: 'approvals.processing' })
                : intl.formatMessage({ id: 'approval.reject' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
