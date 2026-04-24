'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import { Link } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck, ShieldX, ShieldAlert, Clock, AlertTriangle, Loader2,
  HandCoins, Building2, Calendar, Search, RefreshCw, CheckCircle, XCircle,
  Sparkles, Receipt,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useHasRole } from '@/components/auth/auth-provider'
import {
  useContextPendingApprovals,
  useContextApprovalHistoryReport,
  useApproveInvoice,
  useRejectInvoice,
  useBulkApprove,
  useContextPendingSbApprovals,
  useApproveSelfBillingInvoice,
  useRejectSelfBillingInvoice,
  useContextSelfBillingInvoices,
  useContextCostDocuments,
  useBatchApproveCostDocuments,
  useBatchRejectCostDocuments,
} from '@/hooks/use-api'
import { ApprovalStatusBadge } from '@/components/invoices/invoice-approval-section'
import type { PendingApproval, ApprovalHistoryEntry, ApprovalStatus, SelfBillingInvoice } from '@/lib/api'

type ViewType = 'pending' | 'history' | 'costs-pending' | 'costs-history' | 'sb-pending' | 'sb-history'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: number, currency: string, locale: string) {
  return formatCurrency(amount, currency, locale === 'pl' ? 'pl-PL' : 'en-US')
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
  const tCommon = useTranslations('common')
  const tApproval = useTranslations('invoices.approval')
  const tSb = useTranslations('selfBilling')
  const tCosts = useTranslations('costs')
  const locale = useLocale()
  const isAdmin = useHasRole('Admin')
  const { toast } = useToast()

  // View & search state
  const [view, setView] = useState<ViewType>('pending')
  const [search, setSearch] = useState('')

  // Pending data
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useContextPendingApprovals()
  const allPendingItems = pendingData?.approvals ?? []
  const pendingCount = pendingData?.count ?? 0

  // SB Approvals data
  const { data: sbPendingData, isLoading: sbPendingLoading, refetch: refetchSbPending } = useContextPendingSbApprovals()
  const allSbPendingItems = sbPendingData?.invoices ?? []
  const sbPendingCount = allSbPendingItems.length

  // SB History — fetch Approved + Rejected SB invoices
  const { data: sbApprovedData, isLoading: sbApprovedLoading } = useContextSelfBillingInvoices({ status: 'SellerApproved' })
  const { data: sbRejectedData, isLoading: sbRejectedLoading } = useContextSelfBillingInvoices({ status: 'SellerRejected' })
  const sbHistoryLoading = sbApprovedLoading || sbRejectedLoading
  const allSbHistoryItems = useMemo(() => {
    const items = [
      ...(sbApprovedData?.invoices ?? []),
      ...(sbRejectedData?.invoices ?? []),
    ]
    return items.sort((a, b) => new Date(b.approvedAt ?? b.modifiedOn).getTime() - new Date(a.approvedAt ?? a.modifiedOn).getTime())
  }, [sbApprovedData, sbRejectedData])
  const sbHistoryCount = allSbHistoryItems.length

  // Cost documents data
  const { data: costsPendingData, isLoading: costsPendingLoading, refetch: refetchCostsPending } =
    useContextCostDocuments({ approvalStatus: 'Pending' })
  const allCostsPendingItems = costsPendingData?.items ?? []
  const costsPendingCount = allCostsPendingItems.length

  const { data: costsHistoryData, isLoading: costsHistoryLoading } =
    useContextCostDocuments({ approvalStatus: 'Approved' })
  const allCostsHistoryItems = costsHistoryData?.items ?? []

  // Cost mutations
  const costApproveMutation = useBatchApproveCostDocuments()
  const costRejectMutation = useBatchRejectCostDocuments()
  const [costActionDialog, setCostActionDialog] = useState<{
    type: 'approve' | 'reject'
    id: string
    documentNumber: string
  } | null>(null)

  const closeCostDialog = useCallback(() => {
    setCostActionDialog(null)
  }, [])

  const handleCostConfirm = useCallback(async () => {
    if (!costActionDialog) return
    try {
      if (costActionDialog.type === 'approve') {
        await costApproveMutation.mutateAsync([costActionDialog.id])
        toast({ title: tApproval('approvedSuccess') })
      } else {
        await costRejectMutation.mutateAsync([costActionDialog.id])
        toast({ title: tApproval('rejectedSuccess') })
      }
      closeCostDialog()
      refetchCostsPending()
    } catch {
      toast({ title: tApproval('approveError'), variant: 'destructive' })
    }
  }, [costActionDialog, costApproveMutation, costRejectMutation, toast, tApproval, closeCostDialog, refetchCostsPending])

  const isCostMutating = costApproveMutation.isPending || costRejectMutation.isPending
  const sbApproveMutation = useApproveSelfBillingInvoice()
  const sbRejectMutation = useRejectSelfBillingInvoice()

  // SB reject dialog
  const [sbRejectDialog, setSbRejectDialog] = useState<{ id: string; invoiceNumber: string } | null>(null)
  const [sbRejectReason, setSbRejectReason] = useState('')

  // SB approve dialog
  const [sbApproveDialog, setSbApproveDialog] = useState<{ id: string; invoiceNumber: string } | null>(null)
  const [sbApproveInvoiceNumber, setSbApproveInvoiceNumber] = useState('')
  const [sbApproveComment, setSbApproveComment] = useState('')

  // Auto-switch to SB tab when no regular invoices pending but SB has pending
  const autoSwitched = useRef(false)
  useEffect(() => {
    if (autoSwitched.current) return
    if (pendingLoading || sbPendingLoading) return
    if (pendingCount === 0 && sbPendingCount > 0) {
      setView('sb-pending')
      autoSwitched.current = true
    }
  }, [pendingLoading, sbPendingLoading, pendingCount, sbPendingCount])

  // History filters
  const [historyStatus, setHistoryStatus] = useState<string>('all')
  const historyFilters = historyStatus !== 'all' ? { status: historyStatus } : undefined
  const { data: historyData, isLoading: historyLoading } = useContextApprovalHistoryReport(historyFilters)
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

  const handleRefresh = useCallback(async () => {
    if (view === 'pending') await refetchPending()
    else if (view === 'costs-pending') await refetchCostsPending()
    else if (view === 'sb-pending') await refetchSbPending()
  }, [view, refetchPending, refetchCostsPending, refetchSbPending])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">{t('subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {tCommon('refresh')}
        </Button>
      </div>

      {/* View toggle buttons */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
            {/* --- Invoices section --- */}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">{t('invoicesSection')}</span>
            <Button
              variant={view === 'pending' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setView('pending')}
            >
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t('pendingTab')}</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
              )}
              {pendingCount === 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">0</Badge>
              )}
            </Button>
            <Button
              variant={view === 'history' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setView('history')}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden md:inline">{t('historyTab')}</span>
              {historySummary && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {historySummary.approved + historySummary.rejected}
                </Badge>
              )}
            </Button>

            <div className="h-6 w-px bg-border mx-1 hidden lg:block" />

            {/* --- Other Costs section --- */}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">{t('costsSection')}</span>
            <Button
              variant={view === 'costs-pending' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setView('costs-pending')}
            >
              <Receipt className="h-3.5 w-3.5 text-orange-500" />
              <span className="hidden sm:inline">{t('pendingTab')}</span>
              {costsPendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{costsPendingCount}</Badge>
              )}
              {costsPendingCount === 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">0</Badge>
              )}
            </Button>
            <Button
              variant={view === 'costs-history' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setView('costs-history')}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
              <span className="hidden md:inline">{t('historyTab')}</span>
            </Button>

            <div className="h-6 w-px bg-border mx-1 hidden lg:block" />

            {/* --- Self-Billing section --- */}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">{t('sbSection')}</span>
            <Button
              variant={view === 'sb-pending' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setView('sb-pending')}
            >
              <HandCoins className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden md:inline">{t('pendingTab')}</span>
              {sbPendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{sbPendingCount}</Badge>
              )}
              {sbPendingCount === 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">0</Badge>
              )}
            </Button>
            <Button
              variant={view === 'sb-history' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setView('sb-history')}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden md:inline">{t('sbHistoryTab')}</span>
              {sbHistoryCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{sbHistoryCount}</Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search + History status filter */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-[180px] lg:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {view === 'history' && (
          <Select value={historyStatus} onValueChange={setHistoryStatus}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('all')}</SelectItem>
              <SelectItem value="Approved">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  {tApproval('approved')}
                </div>
              </SelectItem>
              <SelectItem value="Rejected">
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  {tApproval('rejected')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {view === 'history' && historySummary && (
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

      {/* ================================================================ */}
      {/* Pending View                                                     */}
      {/* ================================================================ */}
      {view === 'pending' && (
        <div className="space-y-4">
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
                      <TableHead>{t('mpk')}</TableHead>
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
                              className="font-medium text-foreground hover:underline"
                            >
                              {item.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground hidden md:block shrink-0" />
                              <div className="font-medium text-sm truncate max-w-[150px] md:max-w-[200px]">{item.supplierName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(item.grossAmount, item.currency, locale)}
                          </TableCell>
                          <TableCell>
                            {item.mpkCenterName ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                {item.mpkCenterName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
        </div>
      )}

      {/* ================================================================ */}
      {/* History View                                                     */}
      {/* ================================================================ */}
      {view === 'history' && (
        <div className="space-y-4">
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
                      <TableHead>{t('mpk')}</TableHead>
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
                            className="font-medium text-foreground hover:underline"
                          >
                            {entry.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground hidden md:block shrink-0" />
                            <div className="font-medium text-sm truncate max-w-[150px] md:max-w-[200px]">{entry.supplierName}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(entry.grossAmount, entry.currency, locale)}
                        </TableCell>
                        <TableCell>
                          {entry.mpkCenterName ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              {entry.mpkCenterName}
                            </Badge>
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
        </div>
      )}

      {/* ================================================================ */}
      {/* SB Pending View                                                  */}
      {/* ================================================================ */}
      {view === 'sb-pending' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {sbPendingLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sbPendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <HandCoins className="h-12 w-12 mb-4 opacity-40" />
                  <p>{t('sbNoApprovals')}</p>
                </div>
              ) : (
                <>
                  <div className="px-4 pt-4 pb-2 text-sm text-muted-foreground">
                    {t('sbPendingCount', { count: sbPendingCount })}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('sbInvoice')}</TableHead>
                        <TableHead>{t('sbDate')}</TableHead>
                        <TableHead>{t('sbSupplier')}</TableHead>
                        <TableHead className="text-right">{t('sbAmount')}</TableHead>
                        <TableHead>{t('sbSubmittedAt')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sbPendingItems.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <HandCoins className="h-4 w-4 text-emerald-500 shrink-0" />
                              <Link href={`/self-billing/${inv.id}`} className="font-medium text-foreground hover:underline">
                                {inv.invoiceNumber}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(inv.invoiceDate, locale)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <div className="font-medium text-sm truncate max-w-[200px]">{inv.supplierName || '—'}</div>
                                {inv.supplierNip && (
                                  <div className="text-xs text-muted-foreground">NIP: {inv.supplierNip}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(inv.grossAmount, inv.currency ?? 'PLN', locale)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.submittedAt ? (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(inv.submittedAt, locale)}
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 border-green-200 hover:bg-green-50"
                                disabled={sbApproveMutation.isPending || sbRejectMutation.isPending}
                                onClick={() => {
                                  setSbApproveInvoiceNumber(inv.invoiceNumber)
                                  setSbApproveComment('')
                                  setSbApproveDialog({ id: inv.id, invoiceNumber: inv.invoiceNumber })
                                }}
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                {tApproval('approve')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-700 border-red-200 hover:bg-red-50"
                                disabled={sbApproveMutation.isPending || sbRejectMutation.isPending}
                                onClick={() => {
                                  setSbRejectReason('')
                                  setSbRejectDialog({ id: inv.id, invoiceNumber: inv.invoiceNumber })
                                }}
                              >
                                <ShieldX className="h-4 w-4 mr-1" />
                                {tApproval('reject')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* SB History View                                                  */}
      {/* ================================================================ */}
      {view === 'sb-history' && (
        <div className="space-y-4">
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
                  <p>{t('sbNoHistory')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('sbInvoice')}</TableHead>
                      <TableHead>{t('sbDate')}</TableHead>
                      <TableHead>{t('sbSupplier')}</TableHead>
                      <TableHead className="text-right">{t('sbAmount')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('sbApprovedAt')}</TableHead>
                      <TableHead>{t('sbRejectedReason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sbHistoryItems.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <HandCoins className="h-4 w-4 text-emerald-500 shrink-0" />
                            <Link href={`/self-billing/${inv.id}`} className="font-medium text-foreground hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDate(inv.invoiceDate, locale)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <div className="font-medium text-sm truncate max-w-[200px]">{inv.supplierName || '—'}</div>
                              {inv.supplierNip && (
                                <div className="text-xs text-muted-foreground">NIP: {inv.supplierNip}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(inv.grossAmount, inv.currency ?? 'PLN', locale)}
                        </TableCell>
                        <TableCell>
                          {inv.status === 'SellerApproved' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('sbStatusApproved')}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              {t('sbStatusRejected')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(inv.approvedAt, locale)}
                        </TableCell>
                        <TableCell className="max-w-50 truncate text-sm text-muted-foreground">
                          {inv.sellerRejectionReason ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* Costs Pending View                                               */}
      {/* ================================================================ */}
      {view === 'costs-pending' && (
        <div className="space-y-4">
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
                  <p>{t('noCostsPending')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('documentNumber')}</TableHead>
                      <TableHead>{t('documentType')}</TableHead>
                      <TableHead>
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {t('issuer')}
                      </TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead>{t('mpk')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costsPendingItems.map((doc) => {
                      const mpkValue = doc.costCenter || doc.aiMpkSuggestion
                      const isAi = !!doc.aiMpkSuggestion && (!doc.costCenter || doc.costCenter === doc.aiMpkSuggestion)
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Link
                              href={`/costs/${doc.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {doc.documentNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tCosts(`docType.${doc.documentType}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-48 truncate">{doc.issuerName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(doc.grossAmount, doc.currency ?? 'PLN', locale)}
                          </TableCell>
                          <TableCell>
                            {mpkValue ? (
                              isAi ? (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 gap-1">
                                  <Sparkles className="h-3 w-3" />{mpkValue}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                  {mpkValue}
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => setCostActionDialog({ type: 'approve', id: doc.id, documentNumber: doc.documentNumber })}
                                disabled={isCostMutating}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {tApproval('approve')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-700 border-red-200 hover:bg-red-50"
                                onClick={() => setCostActionDialog({ type: 'reject', id: doc.id, documentNumber: doc.documentNumber })}
                                disabled={isCostMutating}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
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
        </div>
      )}

      {/* ================================================================ */}
      {/* Costs History View                                               */}
      {/* ================================================================ */}
      {view === 'costs-history' && (
        <div className="space-y-4">
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
                  <p>{t('noCostsHistory')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('documentNumber')}</TableHead>
                      <TableHead>{t('documentType')}</TableHead>
                      <TableHead>
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {t('issuer')}
                      </TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead>{t('mpk')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('decidedBy')}</TableHead>
                      <TableHead>{t('decidedAt')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costsHistoryItems.map((doc) => {
                      const mpkValue = doc.costCenter || doc.aiMpkSuggestion
                      const isAi = !!doc.aiMpkSuggestion && (!doc.costCenter || doc.costCenter === doc.aiMpkSuggestion)
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Link
                              href={`/costs/${doc.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {doc.documentNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tCosts(`docType.${doc.documentType}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-48 truncate">{doc.issuerName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(doc.grossAmount, doc.currency ?? 'PLN', locale)}
                          </TableCell>
                          <TableCell>
                            {mpkValue ? (
                              isAi ? (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 gap-1">
                                  <Sparkles className="h-3 w-3" />{mpkValue}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                  {mpkValue}
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ApprovalStatusBadge status={doc.approvalStatus as ApprovalStatus} />
                          </TableCell>
                          <TableCell className="text-sm">{doc.approvedBy ?? '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(doc.approvedAt, locale)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* SB Approve Dialog                                                */}
      <Dialog open={!!sbApproveDialog} onOpenChange={(open) => !open && setSbApproveDialog(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{tSb('detail.approveTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {tSb('detail.approveConfirm', { number: sbApproveDialog?.invoiceNumber ?? '' })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="sb-approve-invoice-number">{tSb('detail.invoiceNumberLabel')}</Label>
            <Input
              id="sb-approve-invoice-number"
              value={sbApproveInvoiceNumber}
              onChange={(e) => setSbApproveInvoiceNumber(e.target.value)}
              maxLength={256}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sb-approve-comment">{tSb('detail.commentOptional')}</Label>
            <Textarea
              id="sb-approve-comment"
              value={sbApproveComment}
              onChange={(e) => setSbApproveComment(e.target.value)}
              placeholder={tSb('detail.commentPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSbApproveDialog(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={sbApproveMutation.isPending || !sbApproveInvoiceNumber.trim()}
              onClick={() => {
                if (!sbApproveDialog) return
                const trimmedNumber = sbApproveInvoiceNumber.trim()
                sbApproveMutation.mutate(
                  {
                    id: sbApproveDialog.id,
                    comment: sbApproveComment.trim() || undefined,
                    invoiceNumber: trimmedNumber !== sbApproveDialog.invoiceNumber ? trimmedNumber : undefined,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: tApproval('approvedSuccess') })
                      setSbApproveDialog(null)
                      refetchSbPending()
                    },
                    onError: () => toast({ title: tApproval('approveError'), variant: 'destructive' }),
                  }
                )
              }}
            >
              {sbApproveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              {tApproval('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* SB Reject Dialog                                                 */}
      {/* ================================================================ */}
      <Dialog open={!!sbRejectDialog} onOpenChange={(open) => !open && setSbRejectDialog(null)}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>{tApproval('rejectTitle')}</DialogTitle>
            <DialogDescription>
              {sbRejectDialog?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tApproval('commentLabel')}</Label>
            <Input
              value={sbRejectReason}
              onChange={(e) => setSbRejectReason(e.target.value)}
              placeholder={tApproval('commentPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSbRejectDialog(null)}>
              {tApproval('cancel')}
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              disabled={sbRejectMutation.isPending}
              onClick={() => {
                if (!sbRejectDialog) return
                sbRejectMutation.mutate(
                  { id: sbRejectDialog.id, reason: sbRejectReason || undefined },
                  {
                    onSuccess: () => {
                      toast({ title: tApproval('rejectedSuccess') })
                      setSbRejectDialog(null)
                      refetchSbPending()
                    },
                    onError: () => toast({ title: tApproval('rejectError'), variant: 'destructive' }),
                  }
                )
              }}
            >
              {sbRejectMutation.isPending ? tApproval('processing') : tApproval('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      {/* ================================================================ */}
      {/* Cost Action Dialog (Approve / Reject)                           */}
      {/* ================================================================ */}
      <Dialog open={!!costActionDialog} onOpenChange={(open) => !open && closeCostDialog()}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>
              {costActionDialog?.type === 'approve' ? tApproval('approveTitle') : tApproval('rejectTitle')}
            </DialogTitle>
            <DialogDescription>
              {costActionDialog?.documentNumber}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeCostDialog}>
              {tApproval('cancel')}
            </Button>
            <Button
              onClick={handleCostConfirm}
              disabled={isCostMutating}
              className={
                costActionDialog?.type === 'reject'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {isCostMutating
                ? tApproval('processing')
                : costActionDialog?.type === 'reject'
                  ? tApproval('reject')
                  : tApproval('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
