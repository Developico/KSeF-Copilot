import { useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import {
  Badge, Button, Input, Label, Card, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import {
  Filter, X, ChevronDown, ChevronUp, Search,
  Building2, DollarSign, Tag, Folder, Calendar,
  FileText, AlertCircle, CheckCircle, Clock,
  ArrowDownToLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CostDocumentType, CostDocumentStatus, CostDocument } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

export type CostGroupBy = 'date' | 'mpk' | 'category' | 'none'

export interface CostDocumentFilterValues {
  search: string
  typeFilter: CostDocumentType | 'all'
  statusFilter: CostDocumentStatus | 'all'
  paymentStatus: 'all' | 'pending' | 'paid'
  approvalStatus: 'all' | 'Draft' | 'Pending' | 'Approved' | 'Rejected'
  source: 'all' | 'Manual' | 'OCR' | 'Import'
  fromDate: string
  toDate: string
  dueDateFrom: string
  dueDateTo: string
  minAmount: string
  maxAmount: string
  issuerSearch: string
  mpk: string
  category: string
}

export const DEFAULT_COST_FILTERS: CostDocumentFilterValues = {
  search: '',
  typeFilter: 'all',
  statusFilter: 'all',
  paymentStatus: 'all',
  approvalStatus: 'all',
  source: 'all',
  fromDate: '',
  toDate: '',
  dueDateFrom: '',
  dueDateTo: '',
  minAmount: '',
  maxAmount: '',
  issuerSearch: '',
  mpk: '',
  category: '',
}

export interface CostDocumentFiltersProps {
  filters: CostDocumentFilterValues
  onChange: (filters: CostDocumentFilterValues) => void
  documents: CostDocument[]
  availableMpks?: string[]
  availableCategories?: string[]
  className?: string
  groupBy?: CostGroupBy
  onGroupByChange?: (groupBy: CostGroupBy) => void
}

// ============================================================================
// Component
// ============================================================================

export function CostDocumentFilters({
  filters,
  onChange,
  documents,
  availableMpks = [],
  availableCategories = [],
  className,
  groupBy,
  onGroupByChange,
}: CostDocumentFiltersProps) {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })
  const [expanded, setExpanded] = useState(false)

  // Counts for status pills
  const totalCount = documents.length
  const pendingCount = documents.filter(d => d.paymentStatus === 'pending').length
  const overdueCount = documents.filter(d =>
    d.paymentStatus === 'pending' && d.dueDate && new Date(d.dueDate) < new Date()
  ).length
  const paidCount = documents.filter(d => d.paymentStatus === 'paid').length

  // Approval counts
  const approvalPendingCount = documents.filter(d => d.approvalStatus === 'Pending').length
  const approvedCount = documents.filter(d => d.approvalStatus === 'Approved').length
  const rejectedCount = documents.filter(d => d.approvalStatus === 'Rejected').length

  const activeFilterCount = [
    filters.typeFilter !== 'all',
    filters.source !== 'all',
    filters.fromDate,
    filters.toDate,
    filters.dueDateFrom,
    filters.dueDateTo,
    filters.minAmount,
    filters.maxAmount,
    filters.issuerSearch,
    filters.mpk,
    filters.category,
    filters.search,
  ].filter(Boolean).length

  const update = useCallback(
    (patch: Partial<CostDocumentFilterValues>) => {
      onChange({ ...filters, ...patch })
    },
    [filters, onChange]
  )

  const clearFilters = useCallback(() => {
    onChange({ ...DEFAULT_COST_FILTERS })
  }, [onChange])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick status pills */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            {/* Payment status filters */}
            <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
              <Button
                variant={filters.paymentStatus === 'all' && filters.statusFilter === 'all' && filters.approvalStatus === 'all' ? 'default' : 'ghost'}
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => update({ paymentStatus: 'all', statusFilter: 'all', approvalStatus: 'all' })}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('common.all')}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{totalCount}</Badge>
              </Button>
              <Button
                variant={filters.paymentStatus === 'pending' && filters.approvalStatus === 'all' ? 'default' : 'ghost'}
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => update({ paymentStatus: 'pending', statusFilter: 'all', approvalStatus: 'all' })}
              >
                <ArrowDownToLine className="h-3.5 w-3.5 text-orange-500" />
                <span className="hidden sm:inline">{t('costs.toPay')}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
              </Button>
              <Button
                variant="ghost"
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  update({ paymentStatus: 'pending', dueDateTo: today, statusFilter: 'all', approvalStatus: 'all' })
                }}
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="hidden sm:inline">{t('costs.overdue')}</span>
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{overdueCount}</Badge>
              </Button>
              <Button
                variant={filters.paymentStatus === 'paid' && filters.approvalStatus === 'all' ? 'default' : 'ghost'}
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => update({ paymentStatus: 'paid', statusFilter: 'all', approvalStatus: 'all' })}
              >
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="hidden sm:inline">{t('costs.paid')}</span>
                <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{paidCount}</Badge>
              </Button>
            </div>

            {/* Separator */}
            <div className="hidden lg:block h-6 w-px bg-border" />

            {/* Approval status filters */}
            <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
              <Button
                variant={filters.approvalStatus === 'Pending' ? 'default' : 'ghost'}
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => update({ approvalStatus: 'Pending', paymentStatus: 'all', statusFilter: 'all' })}
              >
                <Clock className="h-3.5 w-3.5 text-yellow-500" />
                <span className="hidden sm:inline">{t('costs.approvalPending')}</span>
                <Badge className="ml-1 h-5 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{approvalPendingCount}</Badge>
              </Button>
              <Button
                variant={filters.approvalStatus === 'Approved' ? 'default' : 'ghost'}
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => update({ approvalStatus: 'Approved', paymentStatus: 'all', statusFilter: 'all' })}
              >
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="hidden sm:inline">{t('costs.approved')}</span>
                <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{approvedCount}</Badge>
              </Button>
              <Button
                variant={filters.approvalStatus === 'Rejected' ? 'default' : 'ghost'}
                size="sm" className="h-8 gap-1 lg:gap-1.5"
                onClick={() => update({ approvalStatus: 'Rejected', paymentStatus: 'all', statusFilter: 'all' })}
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="hidden sm:inline">{t('costs.rejected')}</span>
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{rejectedCount}</Badge>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search + Grouping + Filters toggle */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('costs.searchPlaceholder')}
            className="pl-8 h-9"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </div>

        {/* Grouping */}
        {onGroupByChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{t('costs.groupByLabel')}:</span>
            <Select value={groupBy || 'date'} onValueChange={(v) => onGroupByChange(v as CostGroupBy)}>
              <SelectTrigger className="w-[120px] lg:w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t('costs.groupByMonth')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="mpk">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5" />
                    <span>MPK</span>
                  </div>
                </SelectItem>
                <SelectItem value="category">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{t('costs.category')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t('costs.groupByNone')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Expand toggle */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1 h-9"
          onClick={() => setExpanded(!expanded)}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden md:inline">{t('costs.filters')}</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Clear */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('common.clear')}</span>
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="space-y-4 pt-3 border-t animate-in slide-in-from-top-2 duration-200">
          {/* Row 1: Date ranges + Amount + Issuer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Document date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {t('costs.documentDate')}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="h-9 flex-1"
                  value={filters.fromDate}
                  onChange={(e) => update({ fromDate: e.target.value })}
                />
                <Input
                  type="date"
                  className="h-9 flex-1"
                  value={filters.toDate}
                  onChange={(e) => update({ toDate: e.target.value })}
                />
              </div>
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {t('costs.dueDate')}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="h-9 flex-1"
                  value={filters.dueDateFrom}
                  onChange={(e) => update({ dueDateFrom: e.target.value })}
                />
                <Input
                  type="date"
                  className="h-9 flex-1"
                  value={filters.dueDateTo}
                  onChange={(e) => update({ dueDateTo: e.target.value })}
                />
              </div>
            </div>

            {/* Amount range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                {t('costs.grossAmountPln')}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={t('common.from')}
                  className="h-9 flex-1"
                  value={filters.minAmount}
                  onChange={(e) => update({ minAmount: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder={t('common.to')}
                  className="h-9 flex-1"
                  value={filters.maxAmount}
                  onChange={(e) => update({ maxAmount: e.target.value })}
                />
              </div>
            </div>

            {/* Issuer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                {t('costs.issuer')}
              </Label>
              <Input
                placeholder={t('costs.issuerSearchPlaceholder')}
                className="h-9"
                value={filters.issuerSearch}
                onChange={(e) => update({ issuerSearch: e.target.value })}
              />
            </div>
          </div>

          {/* Row 2: MPK + Category + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MPK */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Folder className="h-4 w-4" />
                MPK
              </Label>
              <Select
                value={filters.mpk || 'all'}
                onValueChange={(v) => update({ mpk: v === 'all' ? '' : v })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {availableMpks.map((mpk) => (
                    <SelectItem key={mpk} value={mpk}>{mpk}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4" />
                {t('costs.category')}
              </Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(v) => update({ category: v === 'all' ? '' : v })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {t('costs.source')}
              </Label>
              <Select
                value={filters.source}
                onValueChange={(v) => update({ source: v as CostDocumentFilterValues['source'] })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="Manual">{t('costs.sourceManual')}</SelectItem>
                  <SelectItem value="OCR">OCR</SelectItem>
                  <SelectItem value="Import">Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
