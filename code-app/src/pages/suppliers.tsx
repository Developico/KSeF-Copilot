import { useState, useMemo, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  Card, CardContent,
  Badge, Skeleton, Button, Input, Checkbox,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui'
import {
  Building2, Plus, RefreshCw, MoreHorizontal, Eye, Ban,
  Trash2, Search, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown, Power,
  Upload, FileText, FileSpreadsheet, CheckCircle, AlertTriangle,
} from 'lucide-react'
import {
  useSuppliers, useDeleteSupplier,
  useCreateSupplierFromVat, useRefreshSupplierVat, useUpdateSupplier,
  useImportSuppliers, useConfirmSupplierImport,
  useBatchDeactivateSuppliers, useBatchReactivateSuppliers,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { buildXlsx } from '@/lib/xlsx-builder'
import type { Supplier, SupplierListParams, SupplierStatusType, SupplierImportResult, SupplierImportEnrichedRow, BatchActionResult } from '@/lib/types'

type SortField = 'name' | 'nip' | 'status' | 'totalInvoiceCount' | 'totalGrossAmount'
type SortDir = 'asc' | 'desc'

function StatusBadge({ status }: { status: string }) {
  const intl = useIntl()
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive'; className: string }> = {
    Active: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    Inactive: { variant: 'secondary', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    Blocked: { variant: 'destructive', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  }
  const cfg = map[status] ?? map.Inactive
  return (
    <Badge className={cfg.className}>
      {intl.formatMessage({ id: `suppliers.status.${status}` })}
    </Badge>
  )
}

export function SuppliersPage() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [addFromVatOpen, setAddFromVatOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [vatNip, setVatNip] = useState('')

  const params: SupplierListParams = {
    settingId: selectedCompany?.id ?? '',
    status: statusFilter ? statusFilter as SupplierStatusType : undefined,
    search: search || undefined,
  }

  const { data, isLoading, error, refetch } = useSuppliers(params)
  const deleteMutation = useDeleteSupplier()
  const createFromVatMutation = useCreateSupplierFromVat()
  const refreshVatMutation = useRefreshSupplierVat()
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

  function toggleSelectAll(list: Supplier[]) {
    const ids = list.map(s => s.id)
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
    if (allSelected) clearSelection()
    else setSelectedIds(new Set(ids))
  }

  // Count per status (from unfiltered data when no status filter)
  const allSuppliers = data?.suppliers ?? []
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of allSuppliers) {
      c[s.status] = (c[s.status] ?? 0) + 1
    }
    return c
  }, [allSuppliers])

  const suppliers = useMemo(() => {
    const list = data?.suppliers ?? []
    return [...list].sort((a, b) => {
      if (sortField === 'totalInvoiceCount' || sortField === 'totalGrossAmount') {
        const diff = (a[sortField] ?? 0) - (b[sortField] ?? 0)
        return sortDir === 'asc' ? diff : -diff
      }
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  function handleDelete(supplier: Supplier) {
    deleteMutation.mutate(supplier.id, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: 'suppliers.deleted' }))
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  function handleCreateFromVat() {
    if (!vatNip.trim()) return
    createFromVatMutation.mutate(vatNip.trim(), {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: 'suppliers.createdFromVat' }))
        setAddFromVatOpen(false)
        setVatNip('')
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  function handleRefreshVat(id: string) {
    refreshVatMutation.mutate(id, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: 'suppliers.vatRefreshed' }))
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  function handleReactivate(id: string) {
    updateMutation.mutate(
      { id, data: { status: 'Active' } },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'suppliers.reactivated' }))
        },
        onError: (err) => {
          toast.error(err.message)
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
    void refetch()
    if (result.failed === 0) {
      toast.success(intl.formatMessage({ id: 'suppliers.bulk.resultSuccess' }, { count: result.succeeded }))
    } else {
      toast.warning(intl.formatMessage({ id: 'suppliers.bulk.resultPartial' }, {
        succeeded: result.succeeded,
        total: result.total,
        failed: result.failed,
      }))
    }
  }

  const executeBulkAction = useCallback((action: 'deactivate' | 'reactivate') => {
    const ids = selectedSuppliers
      .filter(s => action === 'deactivate' ? s.status === 'Active' : s.status !== 'Active')
      .map(s => s.id)

    if (ids.length === 0) return
    setBulkConfirmAction(null)

    const opts = {
      onSuccess: (result: BatchActionResult) => handleBatchResult(result),
      onError: (err: Error) => toast.error(err.message),
    }

    if (action === 'deactivate') batchDeactivateMutation.mutate(ids, opts)
    else batchReactivateMutation.mutate(ids, opts)
  }, [selectedSuppliers, batchDeactivateMutation, batchReactivateMutation])

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {intl.formatMessage({ id: 'suppliers.title' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'suppliers.subtitle' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'common.refresh' })}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'suppliers.import' })}
          </Button>
          <Button size="sm" onClick={() => setAddFromVatOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'suppliers.addFromVat' })}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={intl.formatMessage({ id: 'suppliers.searchPlaceholder' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['Active', 'Inactive', 'Blocked'] as const).map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              {intl.formatMessage({ id: `suppliers.status.${s}` })}
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {counts[s] ?? 0}
              </Badge>
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {suppliers.length} {intl.formatMessage({ id: 'suppliers.suppliersCount' })}
        </span>
      </div>

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
      {!isLoading && !error && suppliers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              {intl.formatMessage({ id: 'suppliers.empty' })}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'suppliers.emptyDescription' })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table (desktop) */}
      {!isLoading && !error && suppliers.length > 0 && (
        <>
          <div className="hidden md:block rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={suppliers.length > 0 && suppliers.every(s => selectedIds.has(s.id))}
                      onCheckedChange={() => toggleSelectAll(suppliers)}
                      aria-label={intl.formatMessage({ id: 'suppliers.bulk.selectAll' })}
                    />
                  </th>
                  <th
                    className="p-3 text-left font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('name')}
                  >
                    <span className="flex items-center">
                      {intl.formatMessage({ id: 'suppliers.name' })}
                      <SortIcon field="name" />
                    </span>
                  </th>
                  <th
                    className="p-3 text-left font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('nip')}
                  >
                    <span className="flex items-center">
                      NIP
                      <SortIcon field="nip" />
                    </span>
                  </th>
                  <th
                    className="p-3 text-left font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('status')}
                  >
                    <span className="flex items-center">
                      {intl.formatMessage({ id: 'common.status' })}
                      <SortIcon field="status" />
                    </span>
                  </th>
                  <th className="p-3 text-left font-medium">
                    {intl.formatMessage({ id: 'suppliers.city' })}
                  </th>
                  <th
                    className="p-3 text-right font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('totalInvoiceCount')}
                  >
                    <span className="flex items-center justify-end">
                      {intl.formatMessage({ id: 'suppliers.totalInvoices' })}
                      <SortIcon field="totalInvoiceCount" />
                    </span>
                  </th>
                  <th
                    className="p-3 text-right font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('totalGrossAmount')}
                  >
                    <span className="flex items-center justify-end">
                      {intl.formatMessage({ id: 'suppliers.totalAmount' })}
                      <SortIcon field="totalGrossAmount" />
                    </span>
                  </th>
                  <th className="p-3 text-right font-medium">
                    {intl.formatMessage({ id: 'common.actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map(supplier => (
                  <tr key={supplier.id} className={`hover:bg-muted/50 transition-colors ${selectedIds.has(supplier.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(supplier.id)}
                        onCheckedChange={() => toggleSelect(supplier.id)}
                        aria-label={supplier.name}
                      />
                    </td>
                    <td className="p-3">
                      <Link
                        to={`/suppliers/${supplier.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-xs">{supplier.nip}</td>
                    <td className="p-3">
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td className="p-3 text-muted-foreground">{supplier.city}</td>
                    <td className="p-3 text-right tabular-nums">{supplier.totalInvoiceCount}</td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {formatCurrency(supplier.totalGrossAmount)}
                    </td>
                    <td className="p-3 text-right">
                      <SupplierRowActions
                        supplier={supplier}
                        onDelete={handleDelete}
                        onRefreshVat={handleRefreshVat}
                        onReactivate={handleReactivate}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list (mobile) */}
          <div className="md:hidden space-y-3">
            {suppliers.map(supplier => (
              <Card key={supplier.id} className={selectedIds.has(supplier.id) ? 'ring-1 ring-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(supplier.id)}
                        onCheckedChange={() => toggleSelect(supplier.id)}
                        aria-label={supplier.name}
                        className="mt-1"
                      />
                      <div>
                        <Link
                          to={`/suppliers/${supplier.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {supplier.name}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        NIP: {supplier.nip}
                      </p>
                      {supplier.city && (
                        <p className="text-xs text-muted-foreground mt-1">{supplier.city}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {supplier.totalInvoiceCount} {intl.formatMessage({ id: 'suppliers.totalInvoices' }).toLowerCase()}
                        {' · '}
                        {formatCurrency(supplier.totalGrossAmount)}
                      </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={supplier.status} />
                      <SupplierRowActions
                        supplier={supplier}
                        onDelete={handleDelete}
                        onRefreshVat={handleRefreshVat}
                        onReactivate={handleReactivate}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add from VAT dialog */}
      <Dialog open={addFromVatOpen} onOpenChange={setAddFromVatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({ id: 'suppliers.addFromVat' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder={intl.formatMessage({ id: 'suppliers.nipPlaceholder' })}
              value={vatNip}
              onChange={(e) => setVatNip(e.target.value)}
              maxLength={10}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFromVatOpen(false)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              onClick={handleCreateFromVat}
              disabled={createFromVatMutation.isPending || vatNip.trim().length < 10}
            >
              {createFromVatMutation.isPending
                ? intl.formatMessage({ id: 'common.loading' })
                : intl.formatMessage({ id: 'common.add' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Import dialog */}
      <SupplierImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      {/* ── Bulk action toolbar ─────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background border rounded-lg shadow-lg px-4 py-2">
          <span className="text-sm font-medium mr-2">
            {intl.formatMessage({ id: 'suppliers.bulk.selected' }, { count: selectedIds.size })}
          </span>
          {eligibleCounts.deactivate > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('deactivate')}
            >
              <Ban className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'suppliers.bulk.deactivate' })} ({eligibleCounts.deactivate})
            </Button>
          )}
          {eligibleCounts.reactivate > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkBusy}
              onClick={() => setBulkConfirmAction('reactivate')}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {intl.formatMessage({ id: 'suppliers.bulk.reactivate' })} ({eligibleCounts.reactivate})
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            {intl.formatMessage({ id: 'suppliers.bulk.deselectAll' })}
          </Button>
        </div>
      )}

      {/* ── Bulk confirm dialog ─────────────────────────── */}
      <Dialog open={bulkConfirmAction !== null} onOpenChange={(open) => { if (!open) setBulkConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'suppliers.bulk.confirmTitle' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {bulkConfirmAction === 'deactivate'
              ? intl.formatMessage({ id: 'suppliers.bulk.confirmDeactivate' }, { count: eligibleCounts.deactivate })
              : intl.formatMessage({ id: 'suppliers.bulk.confirmReactivate' }, { count: eligibleCounts.reactivate })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmAction(null)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant={bulkConfirmAction === 'deactivate' ? 'destructive' : 'default'}
              disabled={isBulkBusy}
              onClick={() => executeBulkAction(bulkConfirmAction!)}
            >
              {isBulkBusy
                ? intl.formatMessage({ id: 'suppliers.bulk.processing' })
                : bulkConfirmAction === 'deactivate'
                  ? intl.formatMessage({ id: 'suppliers.bulk.deactivate' })
                  : intl.formatMessage({ id: 'suppliers.bulk.reactivate' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Supplier Import Dialog ───────────────────────────────────────

const IMPORT_TEMPLATE_COLUMNS = ['nip', 'sbAgreement'] as const
const IMPORT_SAMPLE_ROWS = [['1234567890', 'yes']]

function downloadFile(content: string | Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([content instanceof Uint8Array ? content.buffer as ArrayBuffer : content], { type: mimeType })
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

function SupplierImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const importMutation = useImportSuppliers()
  const confirmMutation = useConfirmSupplierImport()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<SupplierImportResult | null>(null)

  function handleDownloadCsv() {
    const csv = generateCsv(IMPORT_TEMPLATE_COLUMNS, IMPORT_SAMPLE_ROWS)
    downloadFile(csv, 'supplier-import-template.csv', 'text/csv;charset=utf-8')
  }

  function handleDownloadExcel() {
    const xlsx = buildXlsx(IMPORT_TEMPLATE_COLUMNS, IMPORT_SAMPLE_ROWS)
    downloadFile(xlsx, 'supplier-import-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
  }

  function handleImport() {
    if (!file || !selectedCompany) return
    importMutation.mutate(
      { file, settingId: selectedCompany.id },
      {
        onSuccess: (result) => setPreview(result),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleConfirmImport() {
    if (!preview || !selectedCompany) return
    const validRows = preview.rows.filter((r) => r.valid)
    if (validRows.length === 0) return

    confirmMutation.mutate(
      { settingId: selectedCompany.id, rows: validRows },
      {
        onSuccess: (result) => {
          toast.success(intl.formatMessage({ id: 'suppliers.importSuccess' }, { count: result.created }))
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'suppliers.importTitle' })}</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'suppliers.importDescription' })}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: 'suppliers.downloadTemplate' })}:
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
            <div className="flex gap-4 text-sm">
              <span>
                {intl.formatMessage({ id: 'suppliers.totalRows' })}: <strong>{preview.totalRows}</strong>
              </span>
              <span className="text-green-600">
                {intl.formatMessage({ id: 'suppliers.validRows' })}: <strong>{preview.validRows}</strong>
              </span>
              <span className="text-red-600">
                {intl.formatMessage({ id: 'suppliers.invalidRows' })}: <strong>{preview.invalidRows}</strong>
              </span>
            </div>

            {preview.parseErrors.length > 0 && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
                <p className="font-medium text-red-700 mb-1">
                  {intl.formatMessage({ id: 'suppliers.parseErrors' })}:
                </p>
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  {preview.parseErrors.map((e, i) => (
                    <li key={i}>
                      {intl.formatMessage({ id: 'suppliers.rowError' }, { row: e.row, message: e.message })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {invalidRows.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {intl.formatMessage({ id: 'suppliers.skippedRows' })}:
                </p>
                <ul className="list-disc list-inside text-amber-600 space-y-0.5">
                  {invalidRows.map((row, i) => (
                    <li key={i}>
                      {row.nip}{row.name ? ` (${row.name})` : ''} — {row.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validRows.length > 0 && (
              <div className="max-h-60 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">NIP</th>
                      <th className="text-left p-2">{intl.formatMessage({ id: 'suppliers.name' })}</th>
                      <th className="text-left p-2">{intl.formatMessage({ id: 'suppliers.city' })}</th>
                      <th className="text-left p-2">{intl.formatMessage({ id: 'suppliers.vatStatus' })}</th>
                      <th className="text-center p-2">{intl.formatMessage({ id: 'suppliers.sbAgreement' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono">{row.nip}</td>
                        <td className="p-2">{row.name ?? '—'}</td>
                        <td className="p-2">{row.city ?? '—'}</td>
                        <td className="p-2">{row.vatStatus ?? '—'}</td>
                        <td className="p-2 text-center">{row.sbAgreement ? '✓' : '—'}</td>
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
            <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
              <Upload className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'suppliers.import' })}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || confirmMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'suppliers.confirmImport' })} ({validRows.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Row actions ──────────────────────────────────────────────────

function SupplierRowActions({
  supplier,
  onDelete,
  onRefreshVat,
  onReactivate,
}: {
  supplier: Supplier
  onDelete: (s: Supplier) => void
  onRefreshVat: (id: string) => void
  onReactivate: (id: string) => void
}) {
  const intl = useIntl()
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
            <Link to={`/suppliers/${supplier.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'common.view' })}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRefreshVat(supplier.id)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'suppliers.refreshVat' })}
          </DropdownMenuItem>
          {supplier.status !== 'Active' && (
            <DropdownMenuItem onClick={() => onReactivate(supplier.id)}>
              <Power className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'suppliers.reactivate' })}
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
            {intl.formatMessage({ id: 'suppliers.deleteConfirm' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {intl.formatMessage({ id: 'suppliers.deleteConfirmDesc' }, { name: supplier.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onDelete(supplier)}
          >
            {intl.formatMessage({ id: 'common.delete' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
