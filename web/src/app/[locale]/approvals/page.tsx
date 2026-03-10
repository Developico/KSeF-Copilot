'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldCheck, ShieldX, ShieldAlert, Clock, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useHasRole } from '@/components/auth/auth-provider'
import {
  useContextPendingApprovals,
  useContextApprovalHistoryReport,
  useApproveInvoice,
  useRejectInvoice,
  useBulkApprove,
} from '@/hooks/use-api'
import { ApprovalStatusBadge } from '@/components/invoices/invoice-approval-section'
import type { PendingApproval, ApprovalHistoryEntry, ApprovalStatus } from '@/lib/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === 'pl' ? 'pl-PL' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | undefined, locale: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateStr: string | undefined, locale: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(pendingSince: string, slaHours?: number): boolean {
  if (!slaHours) return false
  const since = new Date(pendingSince)
  const deadline = new Date(since.getTime() + slaHours * 60 * 60 * 1000)
  return new Date() > deadline
}

function getSlaDeadline(pendingSince: string, slaHours?: number): Date | null {
  if (!slaHours) return null
  const since = new Date(pendingSince)
  return new Date(since.getTime() + slaHours * 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApprovalsPage() {
  const t = useTranslations('approvals')
  const tApproval = useTranslations('invoices.approval')
  const locale = useLocale()
  const isAdmin = useHasRole('Admin')
  const { toast } = useToast()

  // Pending tab
  const { data: pendingData, isLoading: pendingLoading } = useContextPendingApprovals()
  const pendingItems = pendingData?.approvals ?? []
  const pendingCount = pendingData?.count ?? 0

  // History tab filters
  const [historyStatus, setHistoryStatus] = useState<string>('all')
  const historyFilters = historyStatus !== 'all' ? { status: historyStatus } : undefined
  const { data: historyData, isLoading: historyLoading } = useContextApprovalHistoryReport(historyFilters)
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
      setSelectedIds(new Set(pendingItems.map((item) => item.id)))
    }
  }, [selectedIds.size, pendingItems])

  // Mutations
  const approveMutation = useApproveInvoice()
  const rejectMutation = useRejectInvoice()
  const bulkApproveMutation = useBulkApprove()

  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'bulk-approve'
    invoiceId?: string
    invoiceNumber?: string
  } | null>(null)
  const [comment, setComment] = useState('')

  const openAction = useCallback(
    (type: 'approve' | 'reject', item: PendingApproval) => {
      setComment('')
      setActionDialog({ type, invoiceId: item.id, invoiceNumber: item.invoiceNumber })
    },
    []
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
        toast({ title: tApproval('approvedSuccess') })
      } else if (actionDialog.type === 'reject' && actionDialog.invoiceId) {
        await rejectMutation.mutateAsync({
          invoiceId: actionDialog.invoiceId,
          comment: comment || undefined,
        })
        toast({ title: tApproval('rejectedSuccess') })
      } else if (actionDialog.type === 'bulk-approve') {
        const ids = Array.from(selectedIds)
        await bulkApproveMutation.mutateAsync({
          invoiceIds: ids,
          comment: comment || undefined,
        })
        toast({ title: t('bulkApproveSuccess', { count: ids.length }) })
        setSelectedIds(new Set())
      }
      closeDialog()
    } catch {
      if (actionDialog.type === 'approve') {
        toast({ title: tApproval('approveError'), variant: 'destructive' })
      } else if (actionDialog.type === 'reject') {
        toast({ title: tApproval('rejectError'), variant: 'destructive' })
      } else {
        toast({ title: t('bulkApproveError'), variant: 'destructive' })
      }
    }
  }, [
    actionDialog,
    comment,
    selectedIds,
    approveMutation,
    rejectMutation,
    bulkApproveMutation,
    toast,
    tApproval,
    t,
    closeDialog,
  ])

  const isMutating =
    approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            {t('pendingTab')}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 min-w-5 px-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">{t('historyTab')}</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* Pending Tab                                                      */}
        {/* ================================================================ */}
        <TabsContent value="pending" className="space-y-4">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <span className="text-sm font-medium">
                {t('selected', { count: selectedIds.size })}
              </span>
              <Button size="sm" onClick={openBulkApprove}>
                <ShieldCheck className="h-4 w-4 mr-1" />
                {t('bulkApprove')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                {t('clearSelection')}
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
                  <p>{t('noPending')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedIds.size === pendingItems.length &&
                            pendingItems.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label={t('selectAll')}
                        />
                      </TableHead>
                      <TableHead>{t('invoiceNumber')}</TableHead>
                      <TableHead>{t('supplier')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead>{t('mpkCenter')}</TableHead>
                      <TableHead>{t('pendingSince')}</TableHead>
                      <TableHead>{t('slaDeadline')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.map((item) => {
                      const overdue = isOverdue(item.pendingSince, item.approvalSlaHours)
                      const deadline = getSlaDeadline(
                        item.pendingSince,
                        item.approvalSlaHours
                      )
                      return (
                        <TableRow
                          key={item.id}
                          className={overdue ? 'bg-red-50/50 dark:bg-red-950/20' : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/invoices/${item.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {item.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-50 truncate">
                            {item.supplierName}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(item.grossAmount, item.currency, locale)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.mpkCenterName ?? '—'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatDateTime(item.pendingSince, locale)}
                          </TableCell>
                          <TableCell>
                            {deadline ? (
                              <span
                                className={
                                  overdue
                                    ? 'text-destructive font-medium'
                                    : 'text-muted-foreground text-sm'
                                }
                              >
                                {overdue && (
                                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                                )}
                                {formatDateTime(deadline.toISOString(), locale)}
                                {overdue && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-2 text-[10px]"
                                  >
                                    {t('overdue')}
                                  </Badge>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => openAction('approve', item)}
                                disabled={isMutating}
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                {tApproval('approve')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-700 border-red-200 hover:bg-red-50"
                                onClick={() => openAction('reject', item)}
                                disabled={isMutating}
                              >
                                <ShieldX className="h-4 w-4 mr-1" />
                                {tApproval('reject')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* History Tab                                                      */}
        {/* ================================================================ */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={historyStatus} onValueChange={setHistoryStatus}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('status')}: All</SelectItem>
                <SelectItem value="Approved">{tApproval('approved')}</SelectItem>
                <SelectItem value="Rejected">{tApproval('rejected')}</SelectItem>
              </SelectContent>
            </Select>

            {historySummary && (
              <div className="flex gap-2 ml-auto">
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                  {tApproval('approved')}: {historySummary.approved}
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                  {tApproval('rejected')}: {historySummary.rejected}
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
                  <p>{t('noHistory')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('invoiceNumber')}</TableHead>
                      <TableHead>{t('supplier')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead>{t('mpkCenter')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('decidedBy')}</TableHead>
                      <TableHead>{t('decidedAt')}</TableHead>
                      <TableHead>{t('comment')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyEntries.map((entry, idx) => (
                      <TableRow key={`${entry.invoiceId}-${idx}`}>
                        <TableCell>
                          <Link
                            href={`/invoices/${entry.invoiceId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {entry.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-50 truncate">
                          {entry.supplierName}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(entry.grossAmount, entry.currency, locale)}
                        </TableCell>
                        <TableCell>
                          {entry.mpkCenterName ? (
                            <Badge variant="outline">{entry.mpkCenterName}</Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <ApprovalStatusBadge
                            status={entry.approvalStatus as ApprovalStatus}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.approvedBy ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.approvedAt, locale)}
                        </TableCell>
                        <TableCell className="max-w-50 truncate text-sm text-muted-foreground">
                          {entry.approvalComment ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* Action Dialog (Approve / Reject / Bulk Approve)                  */}
      {/* ================================================================ */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'approve' && tApproval('approveTitle')}
              {actionDialog?.type === 'reject' && tApproval('rejectTitle')}
              {actionDialog?.type === 'bulk-approve' && t('bulkApproveTitle')}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'approve' && tApproval('approveDesc')}
              {actionDialog?.type === 'reject' && tApproval('rejectDesc')}
              {actionDialog?.type === 'bulk-approve' &&
                t('bulkApproveDesc', { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tApproval('commentLabel')}</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={tApproval('commentPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {tApproval('cancel')}
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
                ? tApproval('processing')
                : actionDialog?.type === 'reject'
                  ? tApproval('reject')
                  : tApproval('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
