/**
 * Advanced invoice filter panel — collapsible panel with search, date ranges,
 * amount range, supplier, MPK, category, source, description status, and grouping.
 */

import { useState } from 'react'
import { useIntl } from 'react-intl'
import {
  Button, Input, Label, Badge, Separator,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import {
  Filter, ChevronDown, ChevronUp, X, CornerDownRight,
} from 'lucide-react'
import type { ApprovalStatus } from '@/lib/types'

export type GroupBy = 'none' | 'date' | 'mpk' | 'category'
export type SortColumn = 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate' | 'invoiceNumber'
export type SortDirection = 'asc' | 'desc'
export type DescriptionStatus = 'all' | 'notDescribed' | 'aiSuggestion' | 'described'

export interface InvoiceFilterValues {
  search: string
  paymentStatus: 'all' | 'paid' | 'pending' | 'overdue'
  descriptionStatus: DescriptionStatus
  fromDate: string
  toDate: string
  dueDateFrom: string
  dueDateTo: string
  minAmount: string
  maxAmount: string
  supplierSearch: string
  mpk: string
  category: string
  source: 'all' | 'KSeF' | 'Manual'
  groupBy: GroupBy
  sortColumn: SortColumn
  sortDirection: SortDirection
  correctionsOnly: boolean
  approvalStatus: 'all' | ApprovalStatus
}

export const DEFAULT_FILTERS: InvoiceFilterValues = {
  search: '',
  paymentStatus: 'all' as 'all' | 'paid' | 'pending' | 'overdue',
  descriptionStatus: 'all',
  fromDate: '',
  toDate: '',
  dueDateFrom: '',
  dueDateTo: '',
  minAmount: '',
  maxAmount: '',
  supplierSearch: '',
  mpk: '',
  category: '',
  source: 'all',
  groupBy: 'none',
  sortColumn: 'invoiceDate',
  sortDirection: 'desc',
  correctionsOnly: false,
  approvalStatus: 'all',
}

interface InvoiceFiltersProps {
  filters: InvoiceFilterValues
  onChange: (filters: InvoiceFilterValues) => void
  mpkOptions?: string[]
  categoryOptions?: string[]
}

export function InvoiceFilters({
  filters,
  onChange,
  mpkOptions = [],
  categoryOptions = [],
}: InvoiceFiltersProps) {
  const intl = useIntl()
  const [expanded, setExpanded] = useState(false)

  const update = (patch: Partial<InvoiceFilterValues>) => {
    onChange({ ...filters, ...patch })
  }

  const activeFilterCount = [
    filters.paymentStatus !== 'all',
    filters.descriptionStatus !== 'all',
    filters.correctionsOnly,
    filters.fromDate !== '',
    filters.toDate !== '',
    filters.dueDateFrom !== '',
    filters.dueDateTo !== '',
    filters.minAmount !== '',
    filters.maxAmount !== '',
    filters.supplierSearch !== '',
    filters.mpk !== '',
    filters.category !== '',
    filters.source !== 'all',
    filters.approvalStatus !== 'all',
  ].filter(Boolean).length

  const clearAll = () => {
    onChange({ ...DEFAULT_FILTERS })
  }

  return (
    <div className="space-y-3">
      {/* Top row: search + quick filters + expand toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={intl.formatMessage({ id: 'common.search' }) + '...'}
            className="pl-9"
          />
        </div>

        {/* Payment status buttons */}
        <div className="flex gap-1.5">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filters.paymentStatus === f ? 'default' : 'outline'}
              onClick={() => update({ paymentStatus: f })}
            >
              {f === 'all'
                ? intl.formatMessage({ id: 'common.all' })
                : intl.formatMessage({ id: `invoices.${f}` })}
            </Button>
          ))}
        </div>

        {/* Corrections toggle */}
        <Button
          size="sm"
          variant={filters.correctionsOnly ? 'default' : 'outline'}
          className={filters.correctionsOnly ? '' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'}
          onClick={() => update({ correctionsOnly: !filters.correctionsOnly })}
        >
          <CornerDownRight className="h-3.5 w-3.5 mr-1" />
          {intl.formatMessage({ id: 'invoices.withCorrections' })}
        </Button>

        {/* Grouping */}
        <Select value={filters.groupBy} onValueChange={(v) => update({ groupBy: v as GroupBy })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={intl.formatMessage({ id: 'invoices.groupBy' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{intl.formatMessage({ id: 'invoices.noGrouping' })}</SelectItem>
            <SelectItem value="date">{intl.formatMessage({ id: 'invoices.groupByDate' })}</SelectItem>
            <SelectItem value="mpk">{intl.formatMessage({ id: 'invoices.groupByMpk' })}</SelectItem>
            <SelectItem value="category">{intl.formatMessage({ id: 'invoices.groupByCategory' })}</SelectItem>
          </SelectContent>
        </Select>

        {/* Expand toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="relative"
        >
          {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {intl.formatMessage({ id: 'invoices.filters' })}
          {activeFilterCount > 0 && (
            <Badge className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Expanded filter panel */}
      {expanded && (
        <div className="rounded-md border p-4 space-y-4 bg-muted/30 animate-in slide-in-from-top-2 duration-200">
          {/* Row 1: Date range + Due date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.invoiceDate' })}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => update({ fromDate: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'scanner.from' })}
                />
                <Input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => update({ toDate: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'scanner.to' })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.dueDate' })}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.dueDateFrom}
                  onChange={(e) => update({ dueDateFrom: e.target.value })}
                />
                <Input
                  type="date"
                  value={filters.dueDateTo}
                  onChange={(e) => update({ dueDateTo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Amount range + Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.grossAmount' })}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={(e) => update({ minAmount: e.target.value })}
                  placeholder="Min"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={(e) => update({ maxAmount: e.target.value })}
                  placeholder="Max"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.supplier' })}
              </Label>
              <Input
                value={filters.supplierSearch}
                onChange={(e) => update({ supplierSearch: e.target.value })}
                placeholder={intl.formatMessage({ id: 'invoices.supplier' }) + ' / NIP'}
              />
            </div>
          </div>

          {/* Row 3: MPK + Category + Source + Description status + Approval status */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.mpk' })}
              </Label>
              <Select value={filters.mpk || '_all'} onValueChange={(v) => update({ mpk: v === '_all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{intl.formatMessage({ id: 'common.all' })}</SelectItem>
                  {mpkOptions.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.category' })}
              </Label>
              <Select value={filters.category || '_all'} onValueChange={(v) => update({ category: v === '_all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{intl.formatMessage({ id: 'common.all' })}</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'scanner.source' })}
              </Label>
              <Select value={filters.source} onValueChange={(v) => update({ source: v as InvoiceFilterValues['source'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'common.all' })}</SelectItem>
                  <SelectItem value="KSeF">KSeF</SelectItem>
                  <SelectItem value="Manual">{intl.formatMessage({ id: 'scanner.manual' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'invoices.descriptionStatusLabel' })}
              </Label>
              <Select value={filters.descriptionStatus} onValueChange={(v) => update({ descriptionStatus: v as DescriptionStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'common.all' })}</SelectItem>
                  <SelectItem value="notDescribed">{intl.formatMessage({ id: 'invoices.notDescribed' })}</SelectItem>
                  <SelectItem value="aiSuggestion">{intl.formatMessage({ id: 'invoices.aiSuggestion' })}</SelectItem>
                  <SelectItem value="described">{intl.formatMessage({ id: 'invoices.described' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {intl.formatMessage({ id: 'approval.title' })}
              </Label>
              <Select value={filters.approvalStatus} onValueChange={(v) => update({ approvalStatus: v as InvoiceFilterValues['approvalStatus'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'common.all' })}</SelectItem>
                  <SelectItem value="Pending">{intl.formatMessage({ id: 'approval.status.Pending' })}</SelectItem>
                  <SelectItem value="Approved">{intl.formatMessage({ id: 'approval.status.Approved' })}</SelectItem>
                  <SelectItem value="Rejected">{intl.formatMessage({ id: 'approval.status.Rejected' })}</SelectItem>
                  <SelectItem value="Cancelled">{intl.formatMessage({ id: 'approval.status.Cancelled' })}</SelectItem>
                  <SelectItem value="Draft">{intl.formatMessage({ id: 'approval.status.Draft' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <>
              <Separator />
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <X className="h-3.5 w-3.5 mr-1" />
                {intl.formatMessage({ id: 'invoices.clearFilters' })}
                <Badge variant="secondary" className="ml-1.5">{activeFilterCount}</Badge>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
