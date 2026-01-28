'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
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

export interface InvoiceFiltersProps {
  filters: InvoiceListParams
  onChange: (filters: InvoiceListParams) => void
  availableMpks?: string[]
  availableCategories?: string[]
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const SOURCES = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'KSeF', label: 'KSeF' },
  { value: 'Manual', label: 'Ręczne' },
]

const PAYMENT_STATUSES = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'pending', label: 'Oczekujące' },
  { value: 'paid', label: 'Opłacone' },
]

const SORT_OPTIONS = [
  { value: 'invoiceDate', label: 'Data faktury' },
  { value: 'dueDate', label: 'Termin płatności' },
  { value: 'grossAmount', label: 'Kwota brutto' },
  { value: 'supplierName', label: 'Dostawca' },
]

// ============================================================================
// Main Component
// ============================================================================

export function InvoiceFilters({
  filters,
  onChange,
  availableMpks = [],
  availableCategories = [],
  className,
}: InvoiceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Count active filters
  const activeFilterCount = [
    filters.paymentStatus,
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
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po numerze, dostawcy..."
            className="pl-9"
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
          />
        </div>

        {/* Payment Status */}
        <Select
          value={filters.paymentStatus || 'all'}
          onValueChange={(v) => updateFilter('paymentStatus', v === 'all' ? undefined : v as 'pending' | 'paid')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source */}
        <Select
          value={filters.source || 'all'}
          onValueChange={(v) => updateFilter('source', v === 'all' ? undefined : v as 'KSeF' | 'Manual')}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Źródło" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Expand/Collapse */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Więcej filtrów
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
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
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Wyczyść
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data faktury
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {filters.fromDate
                        ? format(new Date(filters.fromDate), 'dd.MM.yyyy', { locale: pl })
                        : 'Od'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.fromDate ? new Date(filters.fromDate) : undefined}
                      onSelect={(date: Date | undefined) =>
                        updateFilter('fromDate', date?.toISOString().split('T')[0])
                      }
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {filters.toDate
                        ? format(new Date(filters.toDate), 'dd.MM.yyyy', { locale: pl })
                        : 'Do'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.toDate ? new Date(filters.toDate) : undefined}
                      onSelect={(date: Date | undefined) =>
                        updateFilter('toDate', date?.toISOString().split('T')[0])
                      }
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Due Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Termin płatności
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {filters.dueDateFrom
                        ? format(new Date(filters.dueDateFrom), 'dd.MM.yyyy', { locale: pl })
                        : 'Od'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dueDateFrom ? new Date(filters.dueDateFrom) : undefined}
                      onSelect={(date: Date | undefined) =>
                        updateFilter('dueDateFrom', date?.toISOString().split('T')[0])
                      }
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {filters.dueDateTo
                        ? format(new Date(filters.dueDateTo), 'dd.MM.yyyy', { locale: pl })
                        : 'Do'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dueDateTo ? new Date(filters.dueDateTo) : undefined}
                      onSelect={(date: Date | undefined) =>
                        updateFilter('dueDateTo', date?.toISOString().split('T')[0])
                      }
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Kwota brutto (PLN)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Od"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <Input
                  type="number"
                  placeholder="Do"
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
                Dostawca
              </Label>
              <Input
                placeholder="NIP lub nazwa"
                value={filters.supplierName || filters.supplierNip || ''}
                onChange={(e) => {
                  const value = e.target.value
                  // If it looks like NIP (digits only), set as NIP
                  if (/^\d+$/.test(value)) {
                    updateFilter('supplierNip', value || undefined)
                    updateFilter('supplierName', undefined)
                  } else {
                    updateFilter('supplierName', value || undefined)
                    updateFilter('supplierNip', undefined)
                  }
                }}
              />
            </div>

            {/* MPK */}
            {availableMpks.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  MPK
                </Label>
                <Select
                  value={filters.mpk || 'all'}
                  onValueChange={(v) => updateFilter('mpk', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz MPK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {availableMpks.map((mpk) => (
                      <SelectItem key={mpk} value={mpk}>
                        {mpk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            {availableCategories.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Kategoria
                </Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(v) => updateFilter('category', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Overdue Checkbox */}
            <div className="space-y-2">
              <Label>Opcje</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue"
                  checked={filters.overdue || false}
                  onCheckedChange={(checked) =>
                    updateFilter('overdue', checked === true ? true : undefined)
                  }
                />
                <label
                  htmlFor="overdue"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tylko zaległe
                </label>
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <Label className="whitespace-nowrap">Sortowanie:</Label>
            <Select
              value={filters.orderBy || 'invoiceDate'}
              onValueChange={(v) => updateFilter('orderBy', v as InvoiceListParams['orderBy'])}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.orderDirection || 'desc'}
              onValueChange={(v) => updateFilter('orderDirection', v as 'asc' | 'desc')}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Malejąco</SelectItem>
                <SelectItem value="asc">Rosnąco</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
