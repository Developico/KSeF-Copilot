import { useState, useMemo, useCallback } from 'react'
import { useIntl } from 'react-intl'
import {
  Card, CardContent,
  Badge, Skeleton, Button, Input, Checkbox,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import {
  Plus, RefreshCw, Eye, Loader2,
  ArrowUp, ArrowDown, CheckCircle, XCircle, CreditCard,
  Sparkles, Trash2, Download,
} from 'lucide-react'
import {
  CostDocumentFilters,
  DEFAULT_COST_FILTERS,
  type CostDocumentFilterValues,
  type CostGroupBy,
} from '@/components/costs/cost-document-filters'
import {
  useContextCostDocuments,
  useCreateCostDocument,
  useDeleteCostDocument,
  useBatchApproveCostDocuments,
  useBatchRejectCostDocuments,
  useBatchMarkPaidCostDocuments,
  useAICostDocCategorize,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatCurrency } from '@/lib/format'
import { exportCostDocumentsToCsv } from '@/lib/export'
import { CostDocumentScannerModal } from '@/components/costs/cost-document-scanner-modal'
import { toast } from 'sonner'
import type {
  CostDocumentType,
  CostDocumentCreate,
  CostDocument,
} from '@/lib/types'

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

type SortCol = 'documentDate' | 'grossAmount' | 'issuerName'

export function CostsPage() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const t = (id: string) => intl.formatMessage({ id })

  // State
  const [filters, setFilters] = useState<CostDocumentFilterValues>({ ...DEFAULT_COST_FILTERS })
  const [sortColumn, setSortColumn] = useState<SortCol>('documentDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [detailDoc, setDetailDoc] = useState<CostDocument | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'markPaid' | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [groupBy, setGroupBy] = useState<CostGroupBy>('date')

  // Data
  const { data, isLoading, refetch } = useContextCostDocuments()
  const deleteMutation = useDeleteCostDocument()
  const batchApproveMutation = useBatchApproveCostDocuments()
  const batchRejectMutation = useBatchRejectCostDocuments()
  const batchMarkPaidMutation = useBatchMarkPaidCostDocuments()
  const aiCategorizeMutation = useAICostDocCategorize()

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
    if (filters.fromDate) list = list.filter(d => d.documentDate >= filters.fromDate)
    if (filters.toDate) list = list.filter(d => d.documentDate <= filters.toDate)
    if (filters.dueDateFrom) list = list.filter(d => d.dueDate && d.dueDate >= filters.dueDateFrom)
    if (filters.dueDateTo) list = list.filter(d => d.dueDate && d.dueDate <= filters.dueDateTo)
    if (filters.minAmount) list = list.filter(d => d.grossAmount >= Number(filters.minAmount))
    if (filters.maxAmount) list = list.filter(d => d.grossAmount <= Number(filters.maxAmount))
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      toast.success(t('common.refreshed'))
    } finally { setIsRefreshing(false) }
  }, [refetch, t])

  const toggleSort = (col: SortCol) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(col); setSortDirection('asc') }
  }

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortColumn !== col) return null
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />
  }

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const toggleSelectAll = () => {
    const ids = sorted.map(d => d.id)
    setSelectedIds(ids.length > 0 && ids.every(id => selectedIds.has(id)) ? new Set() : new Set(ids))
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await deleteMutation.mutateAsync(deleteConfirmId)
      toast.success(t('costs.deleted'))
    } catch {
      toast.error(t('common.error'))
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
      toast.success(`${ids.length} documents updated`)
      clearSelection()
    } catch {
      toast.error(t('common.error'))
    }
    setBulkAction(null)
  }

  const handleAICategorize = async (id: string) => {
    try {
      await aiCategorizeMutation.mutateAsync({ costDocumentId: id })
      toast.success(t('costs.aiCategorized'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleExport = useCallback(() => {
    if (sorted.length === 0) {
      toast.error(t('costs.noDataToExport'))
      return
    }
    exportCostDocumentsToCsv(sorted)
    toast.success(t('costs.exportCompleted'))
  }, [sorted, t])

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('costs.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('costs.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setScannerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('costs.addNew')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
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
          <span className="text-sm font-medium">{selectedIds.size} {t('costs.selected')}</span>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('approve')}>
            <CheckCircle className="h-4 w-4 mr-1" />{t('costs.approve')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('reject')}>
            <XCircle className="h-4 w-4 mr-1" />{t('costs.reject')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('markPaid')}>
            <CreditCard className="h-4 w-4 mr-1" />{t('costs.markPaid')}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>{t('common.cancel')}</Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('costs.noDocuments')}</CardContent></Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-[40px] p-2">
                  <Checkbox checked={sorted.length > 0 && sorted.every(d => selectedIds.has(d.id))} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="p-2 text-left font-medium">{t('costs.colType')}</th>
                <th className="p-2 text-left font-medium">{t('costs.colNumber')}</th>
                <th className="p-2 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('documentDate')}>
                  {t('costs.colDate')}<SortIcon col="documentDate" />
                </th>
                <th className="p-2 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('issuerName')}>
                  {t('costs.colIssuer')}<SortIcon col="issuerName" />
                </th>
                <th className="p-2 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('grossAmount')}>
                  {t('costs.colAmount')}<SortIcon col="grossAmount" />
                </th>
                <th className="p-2 text-left font-medium">{t('costs.colStatus')}</th>
                <th className="p-2 text-left font-medium">{t('costs.colApproval')}</th>
                <th className="p-2 text-left font-medium">{t('costs.colPayment')}</th>
                <th className="p-2 text-right font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(doc => (
                <tr key={doc.id} className={`border-b hover:bg-muted/30 transition-colors ${selectedIds.has(doc.id) ? 'bg-primary/5' : ''}`}>
                  <td className="p-2">
                    <Checkbox checked={selectedIds.has(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} />
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-xs">
                      {t(`costs.docType.${doc.documentType}`)}
                    </Badge>
                  </td>
                  <td className="p-2 font-medium">{doc.documentNumber}</td>
                  <td className="p-2">{doc.documentDate}</td>
                  <td className="p-2 max-w-[200px] truncate">{doc.issuerName}</td>
                  <td className="p-2 text-right font-medium">
                    {formatCurrency(doc.grossAmount, doc.currency || 'PLN')}
                  </td>
                  <td className="p-2">
                    <Badge className={STATUS_COLORS[doc.status] || ''}>{doc.status}</Badge>
                  </td>
                  <td className="p-2">
                    {doc.approvalStatus && (
                      <Badge className={APPROVAL_STATUS_COLORS[doc.approvalStatus] || ''}>{doc.approvalStatus}</Badge>
                    )}
                  </td>
                  <td className="p-2">
                    <Badge className={PAYMENT_STATUS_COLORS[doc.paymentStatus] || ''}>{doc.paymentStatus}</Badge>
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailDoc(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleAICategorize(doc.id)}
                        disabled={aiCategorizeMutation.isPending}>
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteConfirmId(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('common.delete')}</DialogTitle></DialogHeader>
          <p>{t('costs.deleteConfirmMessage')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk action confirmation */}
      <Dialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('costs.bulkConfirmTitle')}</DialogTitle></DialogHeader>
          <p>{t('costs.bulkConfirmMessage')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleBulkAction}>{t('common.confirm')}</Button>
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
        onCreated={() => { void refetch() }}
      />

      {/* Create dialog (manual fallback) */}
      <CostDocumentCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); void refetch() }}
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

// ── Create Dialog ────────────────────────────────────────────────

function CostDocumentCreateDialog({
  open, onClose, onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })
  const createMutation = useCreateCostDocument()
  const { selectedCompany } = useCompanyContext()

  const [form, setForm] = useState<Partial<CostDocumentCreate>>({
    documentType: 'Receipt',
    currency: 'PLN',
  })

  const update = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.documentNumber || !form.documentDate || !form.issuerName || !form.grossAmount) {
      toast.error(t('costs.fillRequired'))
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
      toast.success(t('costs.created'))
      onCreated()
      setForm({ documentType: 'Receipt', currency: 'PLN' })
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('costs.createTitle')}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">{t('costs.colType')}</label>
            <Select value={form.documentType || 'Receipt'} onValueChange={v => update('documentType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COST_DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{t(`costs.docType.${type}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">{t('costs.colNumber')} *</label>
            <Input value={form.documentNumber || ''} onChange={e => update('documentNumber', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">{t('costs.colDate')} *</label>
              <Input type="date" value={form.documentDate || ''} onChange={e => update('documentDate', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('costs.dueDate')}</label>
              <Input type="date" value={form.dueDate || ''} onChange={e => update('dueDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('costs.colIssuer')} *</label>
            <Input value={form.issuerName || ''} onChange={e => update('issuerName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('costs.issuerNip')}</label>
            <Input value={form.issuerNip || ''} onChange={e => update('issuerNip', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">{t('costs.netAmount')}</label>
              <Input type="number" step="0.01" value={form.netAmount || ''} onChange={e => update('netAmount', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('costs.vatAmount')}</label>
              <Input type="number" step="0.01" value={form.vatAmount || ''} onChange={e => update('vatAmount', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('costs.colAmount')} *</label>
              <Input type="number" step="0.01" value={form.grossAmount || ''} onChange={e => update('grossAmount', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('costs.description')}</label>
            <Input value={form.description || ''} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">{t('costs.category')}</label>
              <Input value={form.category || ''} onChange={e => update('category', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('costs.project')}</label>
              <Input value={form.project || ''} onChange={e => update('project', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('costs.notes')}</label>
            <Input value={form.notes || ''} onChange={e => update('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Component ─────────────────────────────────────────────

function CostDocumentDetail({ doc }: { doc: CostDocument }) {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })

  const fields = [
    { label: t('costs.colType'), value: t(`costs.docType.${doc.documentType}`) },
    { label: t('costs.colNumber'), value: doc.documentNumber },
    { label: t('costs.colDate'), value: doc.documentDate },
    { label: t('costs.dueDate'), value: doc.dueDate || '-' },
    { label: t('costs.colIssuer'), value: doc.issuerName },
    { label: t('costs.issuerNip'), value: doc.issuerNip || '-' },
    { label: t('costs.netAmount'), value: formatCurrency(doc.netAmount, doc.currency || 'PLN') },
    { label: t('costs.vatAmount'), value: doc.vatAmount ? formatCurrency(doc.vatAmount, doc.currency || 'PLN') : '-' },
    { label: t('costs.colAmount'), value: formatCurrency(doc.grossAmount, doc.currency || 'PLN') },
    { label: t('costs.colStatus'), value: doc.status },
    { label: t('costs.colApproval'), value: doc.approvalStatus || '-' },
    { label: t('costs.colPayment'), value: doc.paymentStatus },
    { label: t('costs.category'), value: doc.category || '-' },
    { label: t('costs.project'), value: doc.project || '-' },
    { label: t('costs.description'), value: doc.description || '-' },
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
            <Sparkles className="h-3 w-3" />{t('costs.aiDescription')}
          </p>
          <p className="text-sm mt-1">{doc.aiDescription}</p>
          {doc.aiConfidence && (
            <p className="text-xs text-muted-foreground mt-1">{t('costs.aiConfidence')}: {Math.round(doc.aiConfidence * 100)}%</p>
          )}
        </div>
      )}
    </div>
  )
}
