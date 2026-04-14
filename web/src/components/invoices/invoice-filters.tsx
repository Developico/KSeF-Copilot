'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Search,
  Building2,
  Tag,
  DollarSign,
  Folder,
  FileText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { InvoiceListParams } from '@/lib/api'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type GroupBy = 'date' | 'mpk' | 'category' | 'none'
export type SortColumn = 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate' | 'invoiceNumber'
export type SortDirection = 'asc' | 'desc'

export interface InvoiceFiltersProps {
  filters: InvoiceListParams
  onChange: (filters: InvoiceListParams) => void
  availableMpks?: string[]
  availableCategories?: string[]
  className?: string
  // Grouping & Sorting props
  groupBy?: GroupBy
  onGroupByChange?: (groupBy: GroupBy) => void
  sortColumn?: SortColumn
  onSortColumnChange?: (sortColumn: SortColumn) => void
  sortDirection?: SortDirection
  onSortDirectionChange?: (sortDirection: SortDirection) => void
}

// ============================================================================
// Main Component
// ============================================================================

export function InvoiceFilters({
  filters,
  onChange,
  availableMpks = [],
  availableCategories = [],
  className,
  groupBy,
  onGroupByChange,
  sortColumn,
  onSortColumnChange,
  sortDirection,
  onSortDirectionChange,
}: InvoiceFiltersProps) {
  const t = useTranslations('invoices')
  const tCommon = useTranslations('common')
  const appLocale = useLocale()
  const [isExpanded, setIsExpanded] = useState(false)

  // Count active filters (excluding payment status which is handled by quick buttons)
  const activeFilterCount = [
    filters.source,
    filters.mpk || filters.mpkList?.length,
    filters.category,
    filters.supplierNip || filters.supplierName,
    filters.minAmount || filters.maxAmount,
    filters.fromDate || filters.toDate,
    filters.dueDateFrom || filters.dueDateTo,
    filters.overdue,
    filters.search,
  ].filter(Boolean).length

  // Update a single filter
  const updateFilter = useCallback(
    <K extends keyof InvoiceListParams>(key: K, value: InvoiceListParams[K] | undefined) => {
      onChange({ ...filters, [key]: value })
    },
    [filters, onChange]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    onChange({
      top: filters.top,
      orderBy: filters.orderBy,
      orderDirection: filters.orderDirection,
    })
  }, [filters.top, filters.orderBy, filters.orderDirection, onChange])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Filters Row */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] lg:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-9 h-9"
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
          />
        </div>

        {/* Grouping - if handlers provided */}
        {onGroupByChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{t('groupBy')}:</span>
            <Select value={groupBy || 'date'} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
              <SelectTrigger className="w-[120px] lg:w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t('groupByDate')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="mpk">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5" />
                    <span>{t('mpk')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="category">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{t('category')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t('noGrouping')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Expand/Collapse */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-9">
              <Filter className="h-4 w-4" />
              <span className="hidden md:inline">{t('filters')}</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('clearFilters')}</span>
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-4 pt-4 border-t">
          {/* Row 1: Date filters and amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('invoiceDate')}
              </Label>
              <div className="flex gap-2">
                <DatePickerInput
                  value={filters.fromDate}
                  onChange={(v) => updateFilter('fromDate', v)}
                  placeholder={tCommon('from')}
                  locale={appLocale}
                  minDate={new Date(2020, 0)}
                  maxDate={new Date(2030, 11)}
                  className="flex-1"
                />
                <DatePickerInput
                  value={filters.toDate}
                  onChange={(v) => updateFilter('toDate', v)}
                  placeholder={tCommon('to')}
                  locale={appLocale}
                  minDate={new Date(2020, 0)}
                  maxDate={new Date(2030, 11)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Due Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('dueDate')}
              </Label>
              <div className="flex gap-2">
                <DatePickerInput
                  value={filters.dueDateFrom}
                  onChange={(v) => updateFilter('dueDateFrom', v)}
                  placeholder={tCommon('from')}
                  locale={appLocale}
                  minDate={new Date(2020, 0)}
                  maxDate={new Date(2030, 11)}
                  className="flex-1"
                />
                <DatePickerInput
                  value={filters.dueDateTo}
                  onChange={(v) => updateFilter('dueDateTo', v)}
                  placeholder={tCommon('to')}
                  locale={appLocale}
                  minDate={new Date(2020, 0)}
                  maxDate={new Date(2030, 11)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('grossAmountPln')}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={tCommon('from')}
                  className="h-9"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <Input
                  type="number"
                  placeholder={tCommon('to')}
                  className="h-9"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    updateFilter('maxAmount', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('supplier')}
              </Label>
              <Input
                placeholder={t('nipOrName')}
                className="h-9"
                value={filters.supplierName || filters.supplierNip || ''}
                onChange={(e) => {
                  const value = e.target.value
                  // If it looks like NIP (digits only), set as NIP; otherwise as name
                  if (/^\d+$/.test(value)) {
                    onChange({ ...filters, supplierNip: value || undefined, supplierName: undefined })
                  } else {
                    onChange({ ...filters, supplierName: value || undefined, supplierNip: undefined })
                  }
                }}
              />
            </div>
          </div>

          {/* Row 2: Dropdowns - equal width */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MPK */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {t('mpk')}
              </Label>
              <Select
                value={filters.mpk || 'all'}
                onValueChange={(v) => updateFilter('mpk', v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={t('selectMpk')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  {availableMpks.map((mpk) => (
                    <SelectItem key={mpk} value={mpk}>
                      {mpk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('category')}
              </Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(v) => updateFilter('category', v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('source')}
              </Label>
              <Select
                value={filters.source || 'all'}
                onValueChange={(v) => updateFilter('source', v === 'all' ? undefined : v as 'KSeF' | 'Manual')}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('source')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('sourceAll')}</SelectItem>
                  <SelectItem value="KSeF">KSeF</SelectItem>
                  <SelectItem value="Manual">{t('sourceManual')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
