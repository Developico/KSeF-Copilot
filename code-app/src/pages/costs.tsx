import { useState, useMemo, useCallback, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import {
  Card, CardContent,
  Badge, Skeleton, Button, Input, Checkbox,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import {
  Wallet, Plus, RefreshCw, Eye, Loader2,
  ArrowUp, ArrowDown, CheckCircle, XCircle, CreditCard,
  Sparkles, Trash2, Download, Calendar, Building2,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  CostDocumentFilters,
  DEFAULT_COST_FILTERS,
  type CostDocumentFilterValues,
  type CostGroupBy,
} from '@/components/costs/cost-document-filters'
import { CostTypeIcon } from '@/components/costs/cost-type-icon'
import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import {
  useContextCostDocuments,
  useCreateCostDocument,
  useDeleteCostDocument,
  useUpdateCostDocument,
  useBatchApproveCostDocuments,
  useBatchRejectCostDocuments,
  useBatchMarkPaidCostDocuments,
  useAICostDocCategorize,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { useHasRole } from '@/components/auth/auth-provider'
import { formatCurrency, formatDate } from '@/lib/format'
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

interface CostDocumentGroup {
  key: string
  label: string
  documents: CostDocument[]
  totalGross: number
  isPartialPln: boolean
}

type SortCol = 'documentDate' | 'grossAmount' | 'issuerName'

const MONTH_NAMES_PL = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]

export function CostsPage() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { selectedCompany } = useCompanyContext()
  const isAdmin = useHasRole('Admin')
  const t = (id: string) => intl.formatMessage({ id })

  // State
  const [filters, setFilters] = useState<CostDocumentFilterValues>({ ...DEFAULT_COST_FILTERS })
  const [sortColumn, setSortColumn] = useState<SortCol>('documentDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'markPaid' | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [groupBy, setGroupBy] = useState<CostGroupBy>('date')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Data
  const { data, isLoading, refetch } = useContextCostDocuments()
  const deleteMutation = useDeleteCostDocument()
  const updateMutation = useUpdateCostDocument()
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

  // Grouping
  const groupedDocuments = useMemo<CostDocumentGroup[]>(() => {
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: t('costs.title'),
        documents: sorted,
        totalGross: sorted.reduce((sum, d) => sum + (d.currency === 'PLN' ? d.grossAmount : (d.grossAmountPln ?? d.grossAmount)), 0),
        isPartialPln: sorted.some(d => d.currency !== 'PLN' && !d.grossAmountPln),
      }]
    }
    const groups: Record<string, CostDocumentGroup> = {}
    for (const doc of sorted) {
      let key: string
      let label: string
      switch (groupBy) {
        case 'date': {
          const date = doc.documentDate ? new Date(doc.documentDate) : null
          if (date) {
            const year = date.getFullYear()
            const month = date.getMonth()
            key = `${year}-${String(month + 1).padStart(2, '0')}`
            label = `${MONTH_NAMES_PL[month]} ${year}`
          } else {
            key = 'unknown'
            label = '-'
          }
          break
        }
        case 'mpk':
          key = doc.costCenter || 'brak'
          label = doc.costCenter || '-'
          break
        case 'category':
          key = doc.category || 'brak'
          label = doc.category || '-'
          break
        default:
          key = 'all'
          label = t('common.all')
      }
      if (!groups[key]) {
        groups[key] = { key, label, documents: [], totalGross: 0, isPartialPln: false }
      }
      groups[key].documents.push(doc)
      const plnValue = doc.currency === 'PLN' ? doc.grossAmount : (doc.grossAmountPln ?? doc.grossAmount)
      groups[key].totalGross += plnValue
      if (doc.currency !== 'PLN' && !doc.grossAmountPln) groups[key].isPartialPln = true
    }
    const sortedGroups = Object.values(groups)
    if (groupBy === 'date') {
      sortedGroups.sort((a, b) => b.key.localeCompare(a.key))
    } else {
      sortedGroups.sort((a, b) => {
        if (a.key === 'brak') return 1
        if (b.key === 'brak') return -1
        return a.label.localeCompare(b.label, 'pl')
      })
    }
    return sortedGroups
  }, [sorted, groupBy, t])

  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t('costs.deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleTogglePaymentStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    try {
      await updateMutation.mutateAsync({ id, data: { paymentStatus: newStatus } })
      toast.success(newStatus === 'paid' ? t('costs.markAsPaid') : t('costs.markAsUnpaid'))
    } catch {
      toast.error(t('common.error'))
    }
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('costs.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('costs.subtitle')}
            </p>
          </div>
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



      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('costs.noDocuments')}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-2">
                  <Checkbox checked={sorted.length > 0 && sorted.every(d => selectedIds.has(d.id))} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="p-2 text-left font-medium">{t('costs.colNumber')}</th>
                <th className="p-2 text-left font-medium hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('documentDate')}>
                  {t('costs.colDate')}<SortIcon col="documentDate" />
                </th>
                <th className="p-2 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('issuerName')}>
                  {t('costs.colIssuer')}<SortIcon col="issuerName" />
                </th>
                <th className="p-2 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('grossAmount')}>
                  {t('costs.colAmount')}<SortIcon col="grossAmount" />
                </th>
                <th className="p-2 text-left font-medium hidden xl:table-cell">{t('costs.colMpk')}</th>
                <th className="p-2 text-left font-medium hidden xl:table-cell">{t('costs.colCategory')}</th>
                <th className="p-2 text-left font-medium hidden lg:table-cell">{t('costs.colApproval')}</th>
                <th className="p-2 text-center font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {groupedDocuments.map(group => (
                <Fragment key={`group-container-${group.key}`}>
                  {/* Group header row */}
                  {groupBy !== 'none' && (
                    <tr
                      key={`group-${group.key}`}
                      className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-b"
                      onClick={() => toggleGroupCollapse(group.key)}
                    >
                      <td colSpan={9} className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {collapsedGroups.has(group.key) ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="font-semibold">{group.label}</span>
                            <Badge variant="secondary">
                              {group.documents.length} {t('costs.documentsCount')}
                            </Badge>
                          </div>
                          <span className="font-semibold">
                            {group.isPartialPln ? '~ ' : ''}{formatCurrency(group.totalGross, 'PLN')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Document rows */}
                  {!collapsedGroups.has(group.key) && group.documents.map(doc => (
                    <tr
                      key={doc.id}
                      className={`border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.has(doc.id) ? 'bg-primary/5' : ''}`}
                      onDoubleClick={() => navigate(`/costs/${doc.id}`)}
                    >
                      <td className="p-2 w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <CostTypeIcon type={doc.documentType} className="h-4 w-4 hidden sm:block" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">{doc.documentNumber}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight">
                                {t(`costs.docType.${doc.documentType}`)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {formatDate(doc.documentDate)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(doc.documentDate)}
                        </div>
                      </td>
                      <td className="p-2 max-w-48" title={doc.issuerName}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground hidden md:block shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{doc.issuerName}</div>
                            {doc.issuerNip && (
                              <div className="text-xs text-muted-foreground hidden sm:block">
                                NIP: {doc.issuerNip}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium text-sm">
                        <div>
                          <span className={doc.grossAmount < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                            {formatCurrency(doc.grossAmount, doc.currency || 'PLN')}
                          </span>
                          {doc.currency && doc.currency !== 'PLN' && doc.grossAmountPln && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(doc.grossAmountPln, 'PLN')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 hidden xl:table-cell">
                        {doc.costCenter ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {doc.costCenter}
                          </Badge>
                        ) : doc.aiMpkSuggestion ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                            <Sparkles className="h-3 w-3" />
                            {doc.aiMpkSuggestion}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="p-2 hidden xl:table-cell">
                        {doc.category ? (
                          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                            {doc.category}
                          </Badge>
                        ) : doc.aiCategorySuggestion ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                            <Sparkles className="h-3 w-3" />
                            {doc.aiCategorySuggestion}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="p-2 hidden lg:table-cell">
                        <ApprovalStatusBadge status={doc.approvalStatus} />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          {isAdmin ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleTogglePaymentStatus(doc.id, doc.paymentStatus) }}
                              disabled={updateMutation.isPending}
                              title={doc.paymentStatus === 'paid' ? t('costs.markAsUnpaid') : t('costs.markAsPaid')}
                            >
                              <CheckCircle
                                className={`h-5 w-5 transition-colors ${doc.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                              />
                            </Button>
                          ) : (
                            <span className="inline-flex items-center justify-center h-8 w-8">
                              <CheckCircle
                                className={`h-5 w-5 ${doc.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                              />
                            </span>
                          )}
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/costs/${doc.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={t('common.delete')}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('costs.deleteConfirmTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('costs.deleteConfirmDesc')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(doc.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('common.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="w-10 h-10 inline-block" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Showing count */}
      {sorted.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          {t('costs.showingCount')}: {sorted.length}
        </div>
      )}

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

      {/* Bulk action floating toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap max-w-[95vw]">
          <span className="text-sm font-medium whitespace-nowrap">
            {intl.formatMessage({ id: 'costs.selected' }, { count: selectedIds.size })}
          </span>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => setBulkAction('approve')}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />{t('costs.approve')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('reject')}>
            <XCircle className="h-3.5 w-3.5 mr-1.5" />{t('costs.reject')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('markPaid')}>
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />{t('costs.markPaid')}
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={clearSelection}>{t('common.cancel')}</Button>
        </div>
      )}

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


