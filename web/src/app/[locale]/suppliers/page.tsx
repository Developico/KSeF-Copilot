'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import { Link, useRouter } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Building2, Search, Plus, RefreshCw, Ban, Eye, Loader2,
  ArrowUp, ArrowDown, CheckCircle, XCircle, Power, Upload,
} from 'lucide-react'
import { useCompanyContext } from '@/contexts/company-context'
import {
  useContextSuppliers,
  useDeleteSupplier,
  useCreateSupplierFromVat,
  useUpdateSupplier,
  useBatchDeactivateSuppliers,
  useBatchReactivateSuppliers,
} from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import type { SupplierStatusType, BatchActionResult } from '@/lib/api'
import { SupplierVatSearchDialog } from '@/components/suppliers/supplier-vat-search-dialog'
import { SupplierImportDialog } from '@/components/suppliers/supplier-import-dialog'

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  Blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function SuppliersPage() {
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const { selectedCompany } = useCompanyContext()
  const { toast } = useToast()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplierStatusType | null>(null)
  const [addVatOpen, setAddVatOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState<'name' | 'totalInvoiceCount' | 'totalGrossAmount'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Fetch ALL suppliers (client-side filtering for counts)
  const { data, isLoading, refetch } = useContextSuppliers()

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    const minDelay = new Promise(resolve => setTimeout(resolve, 600))
    try {
      await Promise.all([refetch(), minDelay])
      toast({ description: tCommon('refreshed') })
    } finally {
      setIsRefreshing(false)
    }
  }, [refetch, toast, tCommon])

  const deleteMutation = useDeleteSupplier()
  const fromVatMutation = useCreateSupplierFromVat()
  const updateMutation = useUpdateSupplier()

  // Bulk action mutations
  const batchDeactivateMutation = useBatchDeactivateSuppliers()
  const batchReactivateMutation = useBatchReactivateSuppliers()

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null)

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(list: typeof allSuppliers) {
    const ids = list.map(s => s.id)
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
    if (allSelected) clearSelection()
    else setSelectedIds(new Set(ids))
  }

  const allSuppliers = useMemo(() => data?.suppliers ?? [], [data])

  // Status counts (computed from full list)
  const counts = useMemo(() => {
    const c: Record<string, number> = { Active: 0, Inactive: 0, Blocked: 0 }
    for (const s of allSuppliers) c[s.status] = (c[s.status] ?? 0) + 1
    return c
  }, [allSuppliers])

  // Client-side filtering pipeline: status → search
  const suppliers = useMemo(() => {
    let list = allSuppliers
    if (statusFilter) list = list.filter(s => s.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        s => s.name.toLowerCase().includes(q) || s.nip.toLowerCase().includes(q)
      )
    }
    return list
  }, [allSuppliers, statusFilter, search])

  const sortedSuppliers = useMemo(() => {
    const sorted = [...suppliers]
    const dir = sortDirection === 'desc' ? -1 : 1
    sorted.sort((a, b) => {
      switch (sortColumn) {
        case 'name':
          return a.name.localeCompare(b.name, 'pl') * dir
        case 'totalInvoiceCount':
          return ((a.totalInvoiceCount ?? 0) - (b.totalInvoiceCount ?? 0)) * dir
        case 'totalGrossAmount':
          return ((a.totalGrossAmount ?? 0) - (b.totalGrossAmount ?? 0)) * dir
        default:
          return 0
      }
    })
    return sorted
  }, [suppliers, sortColumn, sortDirection])

  function handleDelete(id: string) {
    deleteMutation.mutate(id, { onSuccess: () => refetch() })
  }

  function handleDeactivate(id: string) {
    updateMutation.mutate(
      { id, data: { status: 'Inactive' } },
      {
        onSuccess: () => {
          refetch()
          toast({ description: t('deactivated') })
        },
        onError: (error) => {
          toast({ variant: 'destructive', description: error instanceof Error ? error.message : t('deactivateError') })
        },
      }
    )
  }

  function handleReactivate(id: string) {
    updateMutation.mutate(
      { id, data: { status: 'Active' } },
      {
        onSuccess: () => {
          refetch()
          toast({ description: t('reactivated') })
        },
        onError: (error) => {
          toast({ variant: 'destructive', description: error instanceof Error ? error.message : t('reactivateError') })
        },
      }
    )
  }

  function handleAddFromVat({ nip, settingId }: { nip: string; settingId: string }) {
    fromVatMutation.mutate(
      { nip, settingId },
      {
        onSuccess: () => {
          setAddVatOpen(false)
          refetch()
          toast({ description: t('vatCreatedSuccess') })
        },
        onError: (error) => {
          const msg = error instanceof Error ? error.message : t('vatCreatedError')
          const isConflict = msg.includes('already exists')
          toast({
            variant: 'destructive',
            description: isConflict ? t('vatAlreadyExists') : msg,
          })
        },
      }
    )
  }

  // ── Bulk action helpers ─────────────────────────────────

  const selectedSuppliers = useMemo(() =>
    allSuppliers.filter(s => selectedIds.has(s.id)),
    [allSuppliers, selectedIds],
  )

  const eligibleCounts = useMemo(() => ({
    deactivate: selectedSuppliers.filter(s => s.status === 'Active').length,
    reactivate: selectedSuppliers.filter(s => s.status !== 'Active').length,
  }), [selectedSuppliers])

  const isBulkBusy = batchDeactivateMutation.isPending || batchReactivateMutation.isPending

  function handleBatchResult(result: BatchActionResult) {
    clearSelection()
    refetch()
    if (result.failed === 0) {
      toast({ description: t('bulk.resultSuccess', { count: result.succeeded }) })
    } else {
      toast({
        variant: 'destructive',
        description: t('bulk.resultPartial', {
          succeeded: result.succeeded,
          total: result.total,
          failed: result.failed,
        }),
      })
    }
  }

  function executeBulkAction(action: 'deactivate' | 'reactivate') {
    const ids = selectedSuppliers
      .filter(s => action === 'deactivate' ? s.status === 'Active' : s.status !== 'Active')
      .map(s => s.id)

    if (ids.length === 0) return
    setBulkConfirmAction(null)

    const opts = {
      onSuccess: (result: BatchActionResult) => handleBatchResult(result),
      onError: (err: Error) => toast({ variant: 'destructive', description: err.message }),
    }

    if (action === 'deactivate') batchDeactivateMutation.mutate(ids, opts)
    else batchReactivateMutation.mutate(ids, opts)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('import')}
          </Button>
          <Button size="sm" onClick={() => setAddVatOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {tCommon('add')}
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
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tCommon('all')}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{allSuppliers.length}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'Active' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setStatusFilter(statusFilter === 'Active' ? null : 'Active')}
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="hidden md:inline">{t('statusActive')}</span>
              <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800">{counts.Active ?? 0}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'Inactive' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1 lg:gap-1.5"
              onClick={() => setStatusFilter(statusFilter === 'Inactive' ? null : 'Inactive')}
            >
              <Ban className="h-3.5 w-3.5 text-gray-400" />
              <span className="hidden md:inline">{t('statusInactive')}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{counts.Inactive ?? 0}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'Blocked' ? 'default' : 'ghost'}
              size="sm"
              className={statusFilter === 'Blocked' ? 'h-8 gap-1 lg:gap-1.5' : 'h-8 gap-1 lg:gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50'}
              onClick={() => setStatusFilter(statusFilter === 'Blocked' ? null : 'Blocked')}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t('statusBlocked')}</span>
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{counts.Blocked ?? 0}</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search bar */}
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-[180px] lg:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {sortedSuppliers.length} {t('suppliersCount')}
        </div>
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

        {!isLoading && sortedSuppliers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t('empty')}</h3>
            </CardContent>
          </Card>
        )}

        {!isLoading && sortedSuppliers.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={sortedSuppliers.length > 0 && sortedSuppliers.every(s => selectedIds.has(s.id))}
                            onCheckedChange={() => toggleSelectAll(sortedSuppliers)}
                            aria-label={t('bulk.selectAll')}
                          />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => {
                            if (sortColumn === 'name') setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                            else { setSortColumn('name'); setSortDirection('asc') }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {t('name')}
                            {sortColumn === 'name' && (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                          </div>
                        </TableHead>
                        <TableHead>{t('nip')}</TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => {
                            if (sortColumn === 'totalInvoiceCount') setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                            else { setSortColumn('totalInvoiceCount'); setSortDirection('desc') }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {t('invoiceCount')}
                            {sortColumn === 'totalInvoiceCount' && (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => {
                            if (sortColumn === 'totalGrossAmount') setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                            else { setSortColumn('totalGrossAmount'); setSortDirection('desc') }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {t('totalAmount')}
                            {sortColumn === 'totalGrossAmount' && (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                          </div>
                        </TableHead>
                        <TableHead>{t('statusLabel')}</TableHead>
                        <TableHead className="w-[100px] lg:w-[120px] text-center">{tCommon('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSuppliers.map(s => (
                        <TableRow
                          key={s.id}
                          className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(s.id) ? 'bg-primary/5' : ''}`}
                          onDoubleClick={() => router.push(`/suppliers/${s.id}`)}
                        >
                          <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(s.id)}
                              onCheckedChange={() => toggleSelect(s.id)}
                              aria-label={s.name}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-teal-500 hidden sm:block shrink-0" />
                              <Link
                                href={`/suppliers/${s.id}`}
                                className="hover:underline text-foreground"
                              >
                                {s.name}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{s.nip}</TableCell>
                          <TableCell className="text-right">{s.totalInvoiceCount}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(s.totalGrossAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[s.status] ?? STATUS_COLORS.Active}>
                              {t(`status${s.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/suppliers/${s.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {s.status !== 'Active' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={t('reactivate')}
                                  onClick={() => handleReactivate(s.id)}
                                >
                                  <Power className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              {s.status === 'Active' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={t('deactivate')}
                                  onClick={() => handleDeactivate(s.id)}
                                >
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {sortedSuppliers.map(s => (
                <Card
                  key={s.id}
                  className="cursor-pointer"
                  onDoubleClick={() => router.push(`/suppliers/${s.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                          <Link
                            href={`/suppliers/${s.id}`}
                            className="font-medium text-sm truncate text-foreground hover:underline"
                          >
                            {s.name}
                          </Link>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1 ml-5">
                          NIP: {s.nip}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          {t('invoiceCount')}: {s.totalInvoiceCount}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                        <span className="font-medium text-sm">{formatCurrency(s.totalGrossAmount)}</span>
                        <Badge className={STATUS_COLORS[s.status] ?? STATUS_COLORS.Active}>
                          {t(`status${s.status}`)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2 gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/suppliers/${s.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {s.status !== 'Active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('reactivate')}
                          onClick={() => handleReactivate(s.id)}
                        >
                          <Power className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {s.status === 'Active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('deactivate')}
                          onClick={() => handleDeactivate(s.id)}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add from VAT dialog */}
      <SupplierVatSearchDialog
        open={addVatOpen}
        onOpenChange={setAddVatOpen}
        onAdd={handleAddFromVat}
        isPending={fromVatMutation.isPending}
        settingId={selectedCompany?.id || ''}
      />

      {/* Supplier import dialog */}
      <SupplierImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      {/* Bulk action floating toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap max-w-[95vw]">
          <span className="text-sm font-medium whitespace-nowrap">
            {t('bulk.selected', { count: selectedIds.size })}
          </span>
          <div className="h-4 w-px bg-border" />
          {eligibleCounts.deactivate > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('deactivate')}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" />
              {t('bulk.deactivate', { count: eligibleCounts.deactivate })}
            </Button>
          )}
          {eligibleCounts.reactivate > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('reactivate')}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              {t('bulk.reactivate', { count: eligibleCounts.reactivate })}
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

      {/* Bulk confirm dialog */}
      <Dialog open={bulkConfirmAction !== null} onOpenChange={(open) => { if (!open) setBulkConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulk.confirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">
            {bulkConfirmAction === 'deactivate' && t('bulk.confirmDeactivate', { count: eligibleCounts.deactivate })}
            {bulkConfirmAction === 'reactivate' && t('bulk.confirmReactivate', { count: eligibleCounts.reactivate })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmAction(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant={bulkConfirmAction === 'deactivate' ? 'destructive' : 'default'}
              onClick={() => bulkConfirmAction && executeBulkAction(bulkConfirmAction)}
              disabled={isBulkBusy}
            >
              {isBulkBusy ? t('bulk.processing') : tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
