'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/format'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wallet, Plus, RefreshCw, Eye, Loader2,
  ArrowUp, ArrowDown, CheckCircle, XCircle, CreditCard,
  Sparkles, Trash2, Download,
} from 'lucide-react'
import {
  CostDocumentFilters,
  DEFAULT_COST_FILTERS,
  type CostDocumentFilterValues,
  type CostGroupBy,
} from '@/components/costs/cost-document-filters'
import { useCompanyContext } from '@/contexts/company-context'
import {
  useContextCostDocuments,
  useCreateCostDocument,
  useDeleteCostDocument,
  useBatchApproveCostDocuments,
  useBatchRejectCostDocuments,
  useBatchMarkPaidCostDocuments,
  useAICategorize,
} from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import type {
  CostDocumentType,
  CostDocumentCreate,
  CostDocument,
} from '@/lib/api'
import { exportCostDocumentsToCsv } from '@/lib/export'
import { CostDocumentScannerModal } from '@/components/costs/cost-document-scanner-modal'

// ============================================================================
// Constants
// ============================================================================

const COST_DOCUMENT_TYPES: CostDocumentType[] = [
  'Receipt', 'Acknowledgment', 'ProForma', 'DebitNote', 'Bill', 'ContractInvoice', 'Other',
]

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  Active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

// ============================================================================
// Page
// ============================================================================

export default function CostsPage() {
  const t = useTranslations('costs')
  const tCommon = useTranslations('common')
  const { toast } = useToast()

  // State
  const [filters, setFilters] = useState<CostDocumentFilterValues>({ ...DEFAULT_COST_FILTERS })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState<'documentDate' | 'grossAmount' | 'issuerName'>('documentDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [detailDoc, setDetailDoc] = useState<CostDocument | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'markPaid' | null>(null)
  const [groupBy, setGroupBy] = useState<CostGroupBy>('date')

  // Data hooks
  const { data, isLoading, refetch } = useContextCostDocuments()
  const deleteMutation = useDeleteCostDocument()
  const batchApproveMutation = useBatchApproveCostDocuments()
  const batchRejectMutation = useBatchRejectCostDocuments()
  const batchMarkPaidMutation = useBatchMarkPaidCostDocuments()
  const aiCategorizeMutation = useAICategorize()

  const allDocuments = useMemo(() => data?.items ?? [], [data])

  // Derived: available MPKs + categories for filter dropdowns
  const availableMpks = useMemo(() => {
    const set = new Set<string>()
    for (const d of allDocuments) if (d.costCenter) set.add(d.costCenter)
    return Array.from(set).sort()
  }, [allDocuments])

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    for (const d of allDocuments) if (d.category) set.add(d.category)
    return Array.from(set).sort()
  }, [allDocuments])

  // Filtering
  const filtered = useMemo(() => {
    let list = allDocuments
    if (filters.statusFilter !== 'all') list = list.filter(d => d.status === filters.statusFilter)
    if (filters.typeFilter !== 'all') list = list.filter(d => d.documentType === filters.typeFilter)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(d =>
        d.documentNumber?.toLowerCase().includes(q) ||
        d.issuerName?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      )
    }
    if (filters.paymentStatus !== 'all') list = list.filter(d => d.paymentStatus === filters.paymentStatus)
    if (filters.approvalStatus !== 'all') list = list.filter(d => d.approvalStatus === filters.approvalStatus)
    if (filters.fromDate) list = list.filter(d => d.documentDate >= filters.fromDate!)
    if (filters.toDate) list = list.filter(d => d.documentDate <= filters.toDate!)
    if (filters.dueDateFrom) list = list.filter(d => d.dueDate && d.dueDate >= filters.dueDateFrom!)
    if (filters.dueDateTo) list = list.filter(d => d.dueDate && d.dueDate <= filters.dueDateTo!)
    if (filters.minAmount != null) list = list.filter(d => d.grossAmount >= filters.minAmount!)
    if (filters.maxAmount != null) list = list.filter(d => d.grossAmount <= filters.maxAmount!)
    if (filters.issuerSearch) {
      const q = filters.issuerSearch.toLowerCase()
      list = list.filter(d =>
        d.issuerName?.toLowerCase().includes(q) ||
        d.issuerNip?.toLowerCase().includes(q)
      )
    }
    if (filters.mpk) list = list.filter(d => d.costCenter === filters.mpk)
    if (filters.category) list = list.filter(d => d.category === filters.category)
    if (filters.source !== 'all') list = list.filter(d => d.source === filters.source)
    return list
  }, [allDocuments, filters])

  // Sorting
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      switch (sortColumn) {
        case 'documentDate':
          return dir * ((a.documentDate || '').localeCompare(b.documentDate || ''))
        case 'grossAmount':
          return dir * (a.grossAmount - b.grossAmount)
        case 'issuerName':
          return dir * ((a.issuerName || '').localeCompare(b.issuerName || ''))
        default:
          return 0
      }
    })
  }, [filtered, sortColumn, sortDirection])

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    const minDelay = new Promise(resolve => setTimeout(resolve, 600))
    try {
      await Promise.all([refetch(), minDelay])
      toast({ description: tCommon('refreshed') })
    } finally { setIsRefreshing(false) }
  }, [refetch, toast, tCommon])

  const toggleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(col); setSortDirection('asc') }
  }

  const SortIcon = ({ col }: { col: typeof sortColumn }) => {
    if (sortColumn !== col) return null
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />
  }

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const toggleSelectAll = () => {
    const ids = sorted.map(d => d.id)
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(ids))
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await deleteMutation.mutateAsync(deleteConfirmId)
      toast({ description: t('deleted') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
    setDeleteConfirmId(null)
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      if (bulkAction === 'approve') await batchApproveMutation.mutateAsync(ids)
      else if (bulkAction === 'reject') await batchRejectMutation.mutateAsync(ids)
      else if (bulkAction === 'markPaid') await batchMarkPaidMutation.mutateAsync(ids)
      toast({ description: `${bulkAction}: ${ids.length} documents` })
      clearSelection()
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
    setBulkAction(null)
  }

  const handleAICategorize = async (id: string) => {
    try {
      await aiCategorizeMutation.mutateAsync({ costDocumentId: id })
      toast({ description: t('aiCategorized') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const handleExport = useCallback(() => {
    if (sorted.length === 0) {
      toast({ description: t('noDataToExport'), variant: 'destructive' })
      return
    }
    exportCostDocumentsToCsv(sorted)
    toast({ description: t('exportCompleted') })
  }, [sorted, toast, t])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setScannerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addNew')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {tCommon('export')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CostDocumentFilters
        filters={filters}
        onChange={setFilters}
        documents={allDocuments}
        availableMpks={availableMpks}
        availableCategories={availableCategories}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-sm font-medium">{selectedIds.size} {t('selected')}</span>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('approve')}>
            <CheckCircle className="h-4 w-4 mr-1" />{t('approve')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('reject')}>
            <XCircle className="h-4 w-4 mr-1" />{t('reject')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('markPaid')}>
            <CreditCard className="h-4 w-4 mr-1" />{t('markPaid')}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>{tCommon('cancel')}</Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('noDocuments')}</CardContent></Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox checked={sorted.length > 0 && sorted.every(d => selectedIds.has(d.id))} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>{t('colType')}</TableHead>
                <TableHead>{t('colNumber')}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('documentDate')}>
                  {t('colDate')}<SortIcon col="documentDate" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('issuerName')}>
                  {t('colIssuer')}<SortIcon col="issuerName" />
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('grossAmount')}>
                  {t('colAmount')}<SortIcon col="grossAmount" />
                </TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead>{t('colApproval')}</TableHead>
                <TableHead>{t('colPayment')}</TableHead>
                <TableHead className="text-right">{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(doc => (
                <TableRow key={doc.id} className={selectedIds.has(doc.id) ? 'bg-muted/50' : undefined}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t(`docType.${doc.documentType}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{doc.documentNumber}</TableCell>
                  <TableCell>{doc.documentDate}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{doc.issuerName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(doc.grossAmount, doc.currency || 'PLN')}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[doc.status] || ''}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.approvalStatus && (
                      <Badge className={APPROVAL_STATUS_COLORS[doc.approvalStatus] || ''}>{doc.approvalStatus}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={PAYMENT_STATUS_COLORS[doc.paymentStatus] || ''}>{doc.paymentStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailDoc(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title={t('aiCategorize')} onClick={() => handleAICategorize(doc.id)}
                        disabled={aiCategorizeMutation.isPending}>
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title={tCommon('delete')} onClick={() => setDeleteConfirmId(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tCommon('delete')}</DialogTitle></DialogHeader>
          <p>{t('deleteConfirmMessage')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{tCommon('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk action confirmation dialog */}
      <Dialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('bulkConfirmTitle')}</DialogTitle></DialogHeader>
          <p>{t('bulkConfirmMessage', { count: selectedIds.size, action: bulkAction || '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>{tCommon('cancel')}</Button>
            <Button onClick={handleBulkAction}>{tCommon('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner modal (OCR import) */}
      <CostDocumentScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSkipToManual={() => {
          setScannerOpen(false)
          setCreateOpen(true)
        }}
        onCreated={() => { refetch() }}
      />

      {/* Create dialog (manual fallback) */}
      <CostDocumentCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refetch() }}
      />

      {/* Detail dialog */}
      <Dialog open={detailDoc !== null} onOpenChange={() => setDetailDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailDoc?.documentNumber}</DialogTitle>
          </DialogHeader>
          {detailDoc && <CostDocumentDetail doc={detailDoc} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Create Dialog Component
// ============================================================================

function CostDocumentCreateDialog({
  open, onClose, onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const t = useTranslations('costs')
  const tCommon = useTranslations('common')
  const createMutation = useCreateCostDocument()
  const { toast } = useToast()
  const { selectedCompany } = useCompanyContext()

  const [form, setForm] = useState<Partial<CostDocumentCreate>>({
    documentType: 'Receipt',
    currency: 'PLN',
  })

  const update = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.documentNumber || !form.documentDate || !form.issuerName || !form.grossAmount) {
      toast({ description: t('fillRequired'), variant: 'destructive' })
      return
    }
    try {
      await createMutation.mutateAsync({
        ...form,
        settingId: selectedCompany?.id || '',
        documentType: form.documentType as CostDocumentType,
        documentNumber: form.documentNumber!,
        documentDate: form.documentDate!,
        issuerName: form.issuerName!,
        grossAmount: Number(form.grossAmount),
      })
      toast({ description: t('created') })
      onCreated()
      setForm({ documentType: 'Receipt', currency: 'PLN' })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('createTitle')}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">{t('colType')}</label>
            <Select value={form.documentType || 'Receipt'} onValueChange={v => update('documentType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COST_DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{t(`docType.${type}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">{t('colNumber')} *</label>
            <Input value={form.documentNumber || ''} onChange={e => update('documentNumber', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">{t('colDate')} *</label>
              <Input type="date" value={form.documentDate || ''} onChange={e => update('documentDate', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('dueDate')}</label>
              <Input type="date" value={form.dueDate || ''} onChange={e => update('dueDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('colIssuer')} *</label>
            <Input value={form.issuerName || ''} onChange={e => update('issuerName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('issuerNip')}</label>
            <Input value={form.issuerNip || ''} onChange={e => update('issuerNip', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">{t('netAmount')}</label>
              <Input type="number" step="0.01" value={form.netAmount || ''} onChange={e => update('netAmount', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('vatAmount')}</label>
              <Input type="number" step="0.01" value={form.vatAmount || ''} onChange={e => update('vatAmount', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('colAmount')} *</label>
              <Input type="number" step="0.01" value={form.grossAmount || ''} onChange={e => update('grossAmount', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('description')}</label>
            <Input value={form.description || ''} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">{t('category')}</label>
              <Input value={form.category || ''} onChange={e => update('category', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('project')}</label>
              <Input value={form.project || ''} onChange={e => update('project', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('notes')}</label>
            <Input value={form.notes || ''} onChange={e => update('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Detail Component
// ============================================================================

function CostDocumentDetail({ doc }: { doc: CostDocument }) {
  const t = useTranslations('costs')

  const fields = [
    { label: t('colType'), value: t(`docType.${doc.documentType}`) },
    { label: t('colNumber'), value: doc.documentNumber },
    { label: t('colDate'), value: doc.documentDate },
    { label: t('dueDate'), value: doc.dueDate || '-' },
    { label: t('colIssuer'), value: doc.issuerName },
    { label: t('issuerNip'), value: doc.issuerNip || '-' },
    { label: t('netAmount'), value: formatCurrency(doc.netAmount, doc.currency || 'PLN') },
    { label: t('vatAmount'), value: doc.vatAmount ? formatCurrency(doc.vatAmount, doc.currency || 'PLN') : '-' },
    { label: t('colAmount'), value: formatCurrency(doc.grossAmount, doc.currency || 'PLN') },
    { label: t('colStatus'), value: doc.status },
    { label: t('colApproval'), value: doc.approvalStatus || '-' },
    { label: t('colPayment'), value: doc.paymentStatus },
    { label: t('category'), value: doc.category || '-' },
    { label: t('project'), value: doc.project || '-' },
    { label: t('description'), value: doc.description || '-' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.label}>
            <p className="text-xs text-muted-foreground">{f.label}</p>
            <p className="text-sm font-medium">{f.value}</p>
          </div>
        ))}
      </div>
      {doc.aiDescription && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />{t('aiDescription')}
          </p>
          <p className="text-sm mt-1">{doc.aiDescription}</p>
          {doc.aiConfidence && (
            <p className="text-xs text-muted-foreground mt-1">{t('aiConfidence')}: {Math.round(doc.aiConfidence * 100)}%</p>
          )}
        </div>
      )}
    </div>
  )
}
