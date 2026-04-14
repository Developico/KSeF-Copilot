'use client'

import { useState, useMemo, useCallback, Fragment } from 'react'
import { Link } from '@/i18n/navigation'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { formatCurrency as formatCurrencyUtil } from '@/lib/format'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { InvoiceAmountCell } from '@/components/invoices/currency-amount'
import { ApprovalStatusBadge } from '@/components/invoices/invoice-approval-section'
import type { ApprovalStatus } from '@/lib/api'
import { useCompanyContext } from '@/contexts/company-context'
import { useHasRole } from '@/components/auth/auth-provider'
import {
  useContextCostDocuments,
  useCreateCostDocument,
  useDeleteCostDocument,
  useUpdateCostDocument,
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

// ============================================================================
// Grouping types
// ============================================================================

interface CostDocumentGroup {
  key: string
  label: string
  documents: CostDocument[]
  totalGross: number
  isPartialPln: boolean
}

// ============================================================================
// Page
// ============================================================================

export default function CostsPage() {
  const router = useRouter()
  const t = useTranslations('costs')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const isAdmin = useHasRole('Admin')
  const { toast } = useToast()

  // Locale-aware formatting
  const formatCurrency = useCallback((amount: number, currency: string = 'PLN') => {
    return formatCurrencyUtil(amount, currency, locale)
  }, [locale])

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString(locale)
  }, [locale])

  const MONTH_NAMES = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1)
      return date.toLocaleDateString(locale, { month: 'long' })
    })
  }, [locale])

  // State
  const [filters, setFilters] = useState<CostDocumentFilterValues>({ ...DEFAULT_COST_FILTERS })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState<'documentDate' | 'grossAmount' | 'issuerName'>('documentDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'markPaid' | null>(null)
  const [groupBy, setGroupBy] = useState<CostGroupBy>('date')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Data hooks
  const { data, isLoading, refetch } = useContextCostDocuments()
  const deleteMutation = useDeleteCostDocument()
  const updateMutation = useUpdateCostDocument()
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

  // Grouping
  const groupedDocuments = useMemo<CostDocumentGroup[]>(() => {
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: t('title'),
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
            label = `${MONTH_NAMES[month]} ${year}`
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
          label = tCommon('all')
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
  }, [sorted, groupBy, t, tCommon, MONTH_NAMES])

  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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

  const handleDelete = async (id: string, docNumber: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast({ description: t('deleted') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const handleTogglePaymentStatus = async (id: string, docNumber: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    try {
      await updateMutation.mutateAsync({ id, data: { paymentStatus: newStatus } })
      toast({ description: newStatus === 'paid' ? t('markAsPaid') : t('markAsUnpaid') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
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
        <Card>
          <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={sorted.length > 0 && sorted.every(d => selectedIds.has(d.id))} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>{t('colNumber')}</TableHead>
                <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('documentDate')}>
                  {t('colDate')}<SortIcon col="documentDate" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('issuerName')}>
                  {t('colIssuer')}<SortIcon col="issuerName" />
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('grossAmount')}>
                  {t('colAmount')}<SortIcon col="grossAmount" />
                </TableHead>
                <TableHead className="hidden xl:table-cell">{t('colMpk')}</TableHead>
                <TableHead className="hidden xl:table-cell">{t('colCategory')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('colApproval')}</TableHead>
                <TableHead className="text-center">{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedDocuments.map(group => (
                <Fragment key={`group-container-${group.key}`}>
                  {/* Group header row */}
                  {groupBy !== 'none' && (
                    <TableRow
                      key={`group-${group.key}`}
                      className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                      onClick={() => toggleGroupCollapse(group.key)}
                    >
                      <TableCell colSpan={9}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {collapsedGroups.has(group.key) ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="font-semibold">{group.label}</span>
                            <Badge variant="secondary">
                              {t('documentsCount', { count: group.documents.length })}
                            </Badge>
                          </div>
                          <span className="font-semibold">
                            {group.isPartialPln ? '~ ' : ''}{formatCurrency(group.totalGross)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Document rows in group */}
                  {!collapsedGroups.has(group.key) && group.documents.map(doc => (
                    <TableRow
                      key={doc.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(doc.id) ? 'bg-primary/5' : ''}`}
                      onDoubleClick={() => router.push(`/costs/${doc.id}`)}
                    >
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={() => toggleSelect(doc.id)}
                          aria-label={doc.documentNumber}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CostTypeIcon type={doc.documentType} className="h-4 w-4 hidden sm:block" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">{doc.documentNumber}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight">
                                {t(`docType.${doc.documentType}`)}
                              </Badge>
                            </div>
                            {/* Show date on tablet when column is hidden */}
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {formatDate(doc.documentDate)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(doc.documentDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground hidden md:block" />
                          <div>
                            <div className="font-medium text-sm truncate max-w-30 md:max-w-50">{doc.issuerName}</div>
                            {doc.issuerNip && (
                              <div className="text-xs text-muted-foreground hidden sm:block">
                                NIP: {doc.issuerNip}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        <InvoiceAmountCell
                          amount={doc.grossAmount}
                          currency={(doc.currency || 'PLN') as 'PLN' | 'EUR' | 'USD'}
                          grossAmountPln={doc.grossAmountPln}
                          className={doc.grossAmount < 0 ? 'text-red-600 dark:text-red-400' : undefined}
                        />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
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
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
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
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <ApprovalStatusBadge status={doc.approvalStatus as ApprovalStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* Fixed grid: always 3 button slots for consistent alignment */}
                          {isAdmin ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleTogglePaymentStatus(doc.id, doc.documentNumber, doc.paymentStatus) }}
                              disabled={updateMutation.isPending}
                              title={doc.paymentStatus === 'paid' ? t('markAsUnpaid') : t('markAsPaid')}
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
                            <Link href={`/costs/${doc.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={tCommon('delete')}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('deleteConfirmDesc', { number: doc.documentNumber })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(doc.id, doc.documentNumber)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {tCommon('delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="w-10 h-10 inline-block" />
                          )}
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
      )}

      {/* Showing count */}
      {sorted.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          {t('showingCount', { count: sorted.length })}
        </div>
      )}

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

// (Detail view moved to /costs/[id]/page.tsx)
