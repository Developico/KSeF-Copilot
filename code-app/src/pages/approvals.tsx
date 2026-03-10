import { useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  Card, CardContent,
  Badge, Skeleton, Button, Checkbox,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Input, Label,
} from '@/components/ui'
import {
  ShieldCheck, ShieldX, ShieldAlert, Clock, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useCompanyContext } from '@/contexts/company-context'
import {
  usePendingApprovals,
  useReportApprovalHistory,
  useApproveInvoice,
  useRejectInvoice,
  useBulkApprove,
} from '@/hooks/use-api'
import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import type { PendingApproval } from '@/lib/types'

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

  // Pending tab
  const { data: pendingData, isLoading: pendingLoading } = usePendingApprovals(settingId)
  const pendingItems = pendingData?.approvals ?? []
  const pendingCount = pendingData?.count ?? 0

  // History tab filters
  const [historyStatus, setHistoryStatus] = useState<string>('all')
  const historyFilters = historyStatus !== 'all' ? { status: historyStatus } : undefined
  const { data: historyData, isLoading: historyLoading } = useReportApprovalHistory(
    settingId,
    historyFilters,
  )
  const historyEntries = historyData?.data?.entries ?? []
  const historySummary = historyData?.data?.summary

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

  const isMutating =
    approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {intl.formatMessage({ id: 'approvals.title' })}
        </h1>
        <p className="text-muted-foreground">
          {intl.formatMessage({ id: 'approvals.subtitle' })}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            {intl.formatMessage({ id: 'approvals.pendingTab' })}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 min-w-5 px-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            {intl.formatMessage({ id: 'approvals.historyTab' })}
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* Pending Tab                                                     */}
        {/* ============================================================== */}
        <TabsContent value="pending" className="space-y-4">
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
                          {intl.formatMessage({ id: 'approvals.mpkCenter' })}
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
                            <Badge variant="outline">{item.mpkCenterName ?? '—'}</Badge>
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
        </TabsContent>

        {/* ============================================================== */}
        {/* History Tab                                                     */}
        {/* ============================================================== */}
        <TabsContent value="history" className="space-y-4">
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
                          {intl.formatMessage({ id: 'approvals.mpkCenter' })}
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
                              <Badge variant="outline">{entry.mpkCenterName}</Badge>
                            ) : (
                              '—'
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
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* Action Dialog (Approve / Reject / Bulk Approve)                  */}
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
    </div>
  )
}
