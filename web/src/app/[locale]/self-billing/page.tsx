'use client'

import { useState, useMemo, useCallback, Fragment } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  FileText, RefreshCw, Search, AlertCircle, Upload, Wand2, Loader2,
  Calendar, Building2, HandCoins, ChevronDown, ChevronRight,
  ChevronUp, Send, CheckCircle, XCircle, Filter, Trash2, ShieldCheck,
} from 'lucide-react'
import {
  useContextSelfBillingInvoices,
  useSubmitSelfBillingForReview,
  useApproveSelfBillingInvoice,
  useRejectSelfBillingInvoice,
  useSendSelfBillingToKsef,
  useDeleteSelfBillingInvoice,
  useRevertSelfBillingToDraft,
  useBatchSubmitSelfBilling,
  useBatchApproveSelfBilling,
  useBatchRejectSelfBilling,
  useBatchSendToKsef,
  useBatchDeleteSelfBilling,
} from '@/hooks/use-api'
import { useHasRole } from '@/components/auth/auth-provider'
import type { SelfBillingInvoiceStatusType, BatchActionResult } from '@/lib/api'
import type { SelfBillingInvoice } from '@/lib/api'
import { toast } from 'sonner'
import { StatusBadge, RowActions, GenerateDialog, ImportDialog, EditDraftDialog } from '@/components/self-billing'
import { useCompanyContext } from '@/contexts/company-context'

type StatusFilter = SelfBillingInvoiceStatusType | null
type GroupBy = 'date' | 'supplier' | 'none'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pl-PL')
}

export default function SelfBillingPage() {
  const t = useTranslations('selfBilling')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { selectedCompany } = useCompanyContext()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveInvoice, setApproveInvoice] = useState<SelfBillingInvoice | null>(null)
  const [approveInvoiceNumber, setApproveInvoiceNumber] = useState('')
  const [approveComment, setApproveComment] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectId, setRejectId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [revertOpen, setRevertOpen] = useState(false)
  const [revertId, setRevertId] = useState('')
  const [revertReason, setRevertReason] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<SelfBillingInvoice | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // Advanced filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Fetch ALL invoices (no status filter on API - we filter client-side)
  const { data, isLoading, error, refetch } = useContextSelfBillingInvoices()
  const submitMutation = useSubmitSelfBillingForReview()
  const approveMutation = useApproveSelfBillingInvoice()
  const rejectMutation = useRejectSelfBillingInvoice()
  const sendToKsefMutation = useSendSelfBillingToKsef()
  const deleteMutation = useDeleteSelfBillingInvoice()
  const revertMutation = useRevertSelfBillingToDraft()
  const batchSubmitMutation = useBatchSubmitSelfBilling()
  const batchApproveMutation = useBatchApproveSelfBilling()
  const batchRejectMutation = useBatchRejectSelfBilling()
  const batchSendToKsefMutation = useBatchSendToKsef()
  const batchDeleteMutation = useBatchDeleteSelfBilling()
  const isAdmin = useHasRole('Admin')

  const allInvoices = data?.invoices ?? []

  // ── Selection ────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'submit' | 'approve' | 'sendKsef' | 'delete' | null>(null)

  // Clear selection when filters change
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(filteredInvoices: SelfBillingInvoice[]) {
    const filteredIds = filteredInvoices.map(inv => inv.id)
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))
    if (allSelected) {
      clearSelection()
    } else {
      setSelectedIds(new Set(filteredIds))
    }
  }

  // Counts for quick-filter badges (always based on allInvoices)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const inv of allInvoices) {
      c[inv.status] = (c[inv.status] ?? 0) + 1
    }
    return c
  }, [allInvoices])

  // Active filter count for the advanced panel
  const activeFilterCount = [dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length

  // Client-side filtering: status → search → advanced
  const invoices = useMemo(() => {
    let list = allInvoices
    if (statusFilter) list = list.filter((inv) => inv.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.supplierName?.toLowerCase().includes(q) ||
          inv.supplierNip?.toLowerCase().includes(q),
      )
    }
    if (dateFrom) {
      list = list.filter((inv) => (inv.invoiceDate ?? '') >= dateFrom)
    }
    if (dateTo) {
      list = list.filter((inv) => (inv.invoiceDate ?? '') <= dateTo)
    }
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) list = list.filter((inv) => inv.grossAmount >= min)
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) list = list.filter((inv) => inv.grossAmount <= max)
    }
    return list
  }, [allInvoices, statusFilter, search, dateFrom, dateTo, minAmount, maxAmount])

  const MONTH_NAMES = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1)
      return date.toLocaleDateString(locale, { month: 'long' })
    })
  }, [locale])

  interface SbGroup {
    key: string
    label: string
    invoices: SelfBillingInvoice[]
    totalGross: number
  }

  const grouped = useMemo<SbGroup[]>(() => {
    const sorted = [...invoices].sort(
      (a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''),
    )
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: tCommon('all'),
        invoices: sorted,
        totalGross: sorted.reduce((s, inv) => s + inv.grossAmount, 0),
      }]
    }
    const groups: Record<string, SbGroup> = {}
    for (const inv of sorted) {
      let key: string
      let label: string
      if (groupBy === 'supplier') {
        key = inv.supplierId || 'unknown'
        label = inv.supplierName || t('detail.supplier')
      } else {
        const d = inv.invoiceDate ? new Date(inv.invoiceDate) : null
        key = d
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          : 'unknown'
        label = d
          ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
          : t('noDate')
      }
      if (!groups[key]) {
        groups[key] = { key, label, invoices: [], totalGross: 0 }
      }
      groups[key].invoices.push(inv)
      groups[key].totalGross += inv.grossAmount
    }
    const result = Object.values(groups)
    if (groupBy === 'date') {
      result.sort((a, b) => b.key.localeCompare(a.key))
    } else {
      result.sort((a, b) => a.label.localeCompare(b.label, 'pl'))
    }
    return result
  }, [invoices, groupBy, MONTH_NAMES, t, tCommon])

  function toggleGroupCollapse(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Actions ────────────────────────────────────────────────────

  function handleEdit(invoice: SelfBillingInvoice) {
    setEditInvoice(invoice)
    setEditOpen(true)
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => { toast.success(t('deleted')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleSubmit(id: string) {
    submitMutation.mutate(id, {
      onSuccess: () => { toast.success(t('submitted')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function openApprove(invoice: SelfBillingInvoice) {
    setApproveInvoice(invoice)
    setApproveInvoiceNumber(invoice.invoiceNumber)
    setApproveComment('')
    setApproveOpen(true)
  }

  function handleApproveConfirm() {
    if (!approveInvoice) return
    const trimmedNumber = approveInvoiceNumber.trim()
    if (!trimmedNumber) return
    approveMutation.mutate(
      {
        id: approveInvoice.id,
        comment: approveComment.trim() || undefined,
        invoiceNumber: trimmedNumber !== approveInvoice.invoiceNumber ? trimmedNumber : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('approved'))
          setApproveOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
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
          toast.success(t('rejected'))
          setRejectOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleSendToKsef(id: string) {
    sendToKsefMutation.mutate(id, {
      onSuccess: () => { toast.success(t('sentToKsef')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function openRevert(id: string) {
    setRevertId(id)
    setRevertReason('')
    setRevertOpen(true)
  }

  function handleRevert() {
    if (!revertId || !revertReason.trim()) return
    revertMutation.mutate(
      { id: revertId, reason: revertReason.trim() },
      {
        onSuccess: () => {
          toast.success(t('detail.reverted'))
          setRevertOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const clearAdvancedFilters = useCallback(() => {
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
  }, [])

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

  function handleBatchResult(result: BatchActionResult) {
    clearSelection()
    refetch()
    if (result.failed === 0) {
      toast.success(t('bulk.resultSuccess', { count: result.succeeded }))
    } else {
      toast.warning(t('bulk.resultPartial', {
        succeeded: result.succeeded,
        total: result.total,
        failed: result.failed,
      }))
    }
  }

  function executeBulkAction(action: 'submit' | 'approve' | 'sendKsef' | 'delete') {
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
  }

  function executeBulkReject() {
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
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <HandCoins className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {tCommon('refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            {t('generate')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('import')}
          </Button>
        </div>
      </div>

      {/* Quick Status Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
            <Button
              variant={statusFilter === null ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setStatusFilter(null)}
            >
              <HandCoins className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tCommon('all')}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{allInvoices.length}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'Draft' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setStatusFilter(statusFilter === 'Draft' ? null : 'Draft')}
            >
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              <span className="hidden md:inline">{t('status_Draft')}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{counts.Draft ?? 0}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'PendingSeller' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setStatusFilter(statusFilter === 'PendingSeller' ? null : 'PendingSeller')}
            >
              <Send className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden md:inline">{t('status_PendingSeller')}</span>
              <Badge className="ml-1 h-5 px-1.5 bg-blue-100 text-blue-800">{counts.PendingSeller ?? 0}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'SellerApproved' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setStatusFilter(statusFilter === 'SellerApproved' ? null : 'SellerApproved')}
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="hidden md:inline">{t('status_SellerApproved')}</span>
              <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800">{counts.SellerApproved ?? 0}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'SellerRejected' ? 'default' : 'ghost'}
              size="sm"
              className={statusFilter === 'SellerRejected' ? 'h-8 gap-1 lg:gap-1.5' : 'h-8 gap-1 lg:gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50'}
              onClick={() => setStatusFilter(statusFilter === 'SellerRejected' ? null : 'SellerRejected')}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t('status_SellerRejected')}</span>
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{counts.SellerRejected ?? 0}</Badge>
            </Button>

            <div className="h-6 w-px bg-border hidden lg:block" />

            <Button
              variant={statusFilter === 'SentToKsef' ? 'default' : 'ghost'}
              size="sm"
              className={statusFilter === 'SentToKsef' ? 'h-8 gap-1 lg:gap-1.5' : 'h-8 gap-1 lg:gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}
              onClick={() => setStatusFilter(statusFilter === 'SentToKsef' ? null : 'SentToKsef')}
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t('status_SentToKsef')}</span>
              <Badge className="ml-1 h-5 px-1.5 bg-indigo-100 text-indigo-800">{counts.SentToKsef ?? 0}</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search + Grouping + Filters toggle */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] lg:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grouping */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{t('groupByLabel')}:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-[120px] lg:w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t('groupByMonth')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="supplier">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{t('supplier')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t('groupByNone')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters toggle */}
          <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9">
                <Filter className="h-4 w-4" />
                <span className="hidden md:inline">{t('filters')}</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeFilterCount}</Badge>
                )}
                {filtersExpanded
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearAdvancedFilters}>
              <XCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t('clearFilters')}</span>
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <CollapsibleContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('dateFrom')}</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('dateTo')}</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('amountMin')}</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('amountMax')}</label>
                <Input
                  type="number"
                  placeholder="999 999.99"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Content */}
      <div>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{(error as Error).message}</span>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && invoices.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t('empty')}</h3>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && invoices.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              {t('invoicesCount', { count: invoices.length })}
            </div>

            {/* Desktop table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={invoices.length > 0 && invoices.every(inv => selectedIds.has(inv.id))}
                        onCheckedChange={() => toggleSelectAll(invoices)}
                        aria-label={t('bulk.selectAll')}
                      />
                    </TableHead>
                    <TableHead>{t('invoiceNumber')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('invoiceDate')}</TableHead>
                    <TableHead>{t('supplier')}</TableHead>
                    <TableHead className="text-right">{t('grossAmount')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead className="w-[100px] lg:w-[120px] text-center">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((group) => (
                    <Fragment key={`desktop-${group.key}`}>
                      {groupBy !== 'none' && (
                        <TableRow
                          className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                          onClick={() => toggleGroupCollapse(group.key)}
                        >
                          <TableCell colSpan={7}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {collapsedGroups.has(group.key) ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <span className="font-semibold">{group.label}</span>
                                <Badge variant="secondary">
                                  {t('invoicesCount', { count: group.invoices.length })}
                                </Badge>
                              </div>
                              <span className="font-semibold">
                                {formatCurrency(group.totalGross)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {(!collapsedGroups.has(group.key) || groupBy === 'none') && group.invoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`}
                          onDoubleClick={() => inv.status === 'Draft' && handleEdit(inv)}
                        >
                          <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(inv.id)}
                              onCheckedChange={() => toggleSelect(inv.id)}
                              aria-label={inv.invoiceNumber}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <HandCoins className="h-4 w-4 text-emerald-500 hidden sm:block shrink-0" />
                              <div>
                                <Link
                                  href={`/${locale}/self-billing/${inv.id}`}
                                  className="font-medium text-sm text-foreground hover:underline"
                                >
                                  {inv.invoiceNumber}
                                </Link>
                                {inv.ksefReferenceNumber && (
                                  <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                                    {inv.ksefReferenceNumber.slice(0, 20) || '—'}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground lg:hidden">
                                  {formatDate(inv.invoiceDate)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(inv.invoiceDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground hidden md:block shrink-0" />
                              <div>
                                <div className="font-medium text-sm truncate max-w-[120px] md:max-w-[200px]">
                                  {inv.supplierName || '—'}
                                </div>
                                {inv.supplierNip && (
                                  <div className="text-xs text-muted-foreground hidden sm:block">
                                    NIP: {inv.supplierNip}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(inv.grossAmount)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={inv.status} t={t} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <RowActions
                                invoice={inv}
                                t={t}
                                tCommon={tCommon}
                                isAdmin={isAdmin}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onSubmit={handleSubmit}
                                onApprove={openApprove}
                                onReject={openReject}
                                onSendToKsef={handleSendToKsef}
                                onRevert={openRevert}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
              </CardContent>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {grouped.map((group) => (
                <Fragment key={`mobile-${group.key}`}>
                  {groupBy !== 'none' && (
                    <button
                      onClick={() => toggleGroupCollapse(group.key)}
                      className="flex items-center gap-2 mb-2 mt-4 w-full text-left hover:opacity-80 transition-opacity"
                    >
                      {collapsedGroups.has(group.key) ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-semibold text-sm">{group.label}</span>
                      <Badge variant="secondary">
                        {t('invoicesCount', { count: group.invoices.length })}
                      </Badge>
                      <span className="ml-auto text-sm font-semibold">
                        {formatCurrency(group.totalGross)}
                      </span>
                    </button>
                  )}
                  {(!collapsedGroups.has(group.key) || groupBy === 'none') && (
                    <div className="space-y-3 mb-4">
                      {group.invoices.map((inv) => (
                        <Card
                          key={inv.id}
                          className={`${selectedIds.has(inv.id) ? 'ring-2 ring-primary' : ''}${inv.status === 'Draft' ? ' cursor-pointer' : ''}`}
                          onDoubleClick={() => inv.status === 'Draft' && handleEdit(inv)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <Checkbox
                                  checked={selectedIds.has(inv.id)}
                                  onCheckedChange={() => toggleSelect(inv.id)}
                                  aria-label={inv.invoiceNumber}
                                  className="mt-0.5 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <HandCoins className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <Link
                                      href={`/${locale}/self-billing/${inv.id}`}
                                      className="font-medium text-sm truncate text-foreground hover:underline"
                                    >
                                      {inv.invoiceNumber}
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <p className="text-sm text-muted-foreground truncate">{inv.supplierName || '—'}</p>
                                  </div>
                                  {inv.supplierNip && (
                                    <p className="text-xs text-muted-foreground ml-5">NIP: {inv.supplierNip}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">{formatDate(inv.invoiceDate)}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                                <span className="font-medium">{formatCurrency(inv.grossAmount)}</span>
                                <StatusBadge status={inv.status} t={t} />
                              </div>
                            </div>
                            <div className="flex justify-end mt-2">
                              <RowActions
                                invoice={inv}
                                t={t}
                                tCommon={tCommon}
                                isAdmin={isAdmin}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onSubmit={handleSubmit}
                                onApprove={openApprove}
                                onReject={openReject}
                                onSendToKsef={handleSendToKsef}
                                onRevert={openRevert}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
            </>
          )}
        </div>

      {/* Generate dialog */}

      {/* Floating bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap max-w-[95vw]">
          <span className="text-sm font-medium whitespace-nowrap">
            {t('bulk.selected', { count: selectedIds.size })}
          </span>
          <div className="h-4 w-px bg-border" />
          {eligibleCounts.submit > 0 && isAdmin && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('submit')}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {t('bulk.submit', { count: eligibleCounts.submit })}
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
              {t('bulk.approve', { count: eligibleCounts.approve })}
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
              {t('bulk.reject', { count: eligibleCounts.reject })}
            </Button>
          )}
          {eligibleCounts.sendKsef > 0 && isAdmin && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('sendKsef')}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {t('bulk.sendKsef', { count: eligibleCounts.sendKsef })}
            </Button>
          )}
          {eligibleCounts.delete > 0 && isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('delete')}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t('bulk.delete', { count: eligibleCounts.delete })}
            </Button>
          )}
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            {t('bulk.deselectAll')}
          </Button>
          {isBulkBusy && (
            <span className="text-xs text-muted-foreground animate-pulse">
              {t('bulk.processing')}
            </span>
          )}
        </div>
      )}

      {/* Generate dialog */}
      <GenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Edit draft dialog */}
      <EditDraftDialog invoice={editInvoice} open={editOpen} onOpenChange={setEditOpen} />

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('detail.approveTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('detail.approveConfirm', { number: approveInvoice?.invoiceNumber ?? '' })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="sb-approve-invoice-number">{t('detail.invoiceNumberLabel')}</Label>
            <Input
              id="sb-approve-invoice-number"
              value={approveInvoiceNumber}
              onChange={(e) => setApproveInvoiceNumber(e.target.value)}
              maxLength={256}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sb-approve-comment">{t('detail.commentOptional')}</Label>
            <Textarea
              id="sb-approve-comment"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder={t('detail.commentPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending || !approveInvoiceNumber.trim()}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              {t('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('rejectReasonPlaceholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to draft dialog */}
      <Dialog open={revertOpen} onOpenChange={setRevertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.revertTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('detail.revertReasonPlaceholder')}
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleRevert}
              disabled={revertMutation.isPending || !revertReason.trim()}
            >
              {t('detail.revertButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk confirm dialog (submit / approve / sendKsef / delete) */}
      <Dialog open={bulkConfirmAction !== null} onOpenChange={(open) => { if (!open) setBulkConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulk.confirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">
            {bulkConfirmAction === 'submit' && t('bulk.confirmSubmit', { count: eligibleCounts.submit })}
            {bulkConfirmAction === 'approve' && t('bulk.confirmApprove', { count: eligibleCounts.approve })}
            {bulkConfirmAction === 'sendKsef' && t('bulk.confirmSendKsef', { count: eligibleCounts.sendKsef })}
            {bulkConfirmAction === 'delete' && t('bulk.confirmDelete', { count: eligibleCounts.delete })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmAction(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant={bulkConfirmAction === 'delete' ? 'destructive' : 'default'}
              onClick={() => bulkConfirmAction && executeBulkAction(bulkConfirmAction)}
              disabled={isBulkBusy}
            >
              {isBulkBusy ? t('bulk.processing') : tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk reject dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulk.confirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm">{t('bulk.confirmReject', { count: eligibleCounts.reject })}</p>
            <Input
              placeholder={t('bulk.rejectReasonPlaceholder')}
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={executeBulkReject}
              disabled={isBulkBusy || !bulkRejectReason.trim()}
            >
              {isBulkBusy ? t('bulk.processing') : t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

