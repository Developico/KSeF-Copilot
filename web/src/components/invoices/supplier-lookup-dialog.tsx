'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Building2,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  MapPin,
} from 'lucide-react'
import { useGusSearch, useRecentSuppliers, formatNipDisplay, RecentSupplier } from '@/hooks/use-gus-lookup'
import { GusSearchResult } from '@/lib/api'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface SupplierData {
  nip: string
  name: string
  address?: string
  city?: string
  postalCode?: string
}

interface SupplierLookupDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean
  /**
   * Callback when dialog is closed
   */
  onOpenChange: (open: boolean) => void
  /**
   * Callback when a supplier is selected
   */
  onSelect: (supplier: SupplierData) => void
  /**
   * Tenant NIP for fetching recent suppliers
   */
  tenantNip?: string
  /**
   * Current supplier NIP (for highlighting)
   */
  currentNip?: string
}

// ============================================================================
// Sub-components
// ============================================================================

interface SupplierCardProps {
  supplier: GusSearchResult | RecentSupplier
  isRecent?: boolean
  isSelected?: boolean
  onSelect: () => void
  t: ReturnType<typeof useTranslations<'invoices'>>
}

function SupplierCard({ supplier, isRecent = false, isSelected = false, onSelect, t }: SupplierCardProps) {
  const isRecentSupplier = 'invoiceCount' in supplier

  // Get display name - handle both GusSearchResult and RecentSupplier
  const displayName = 'nazwa' in supplier ? supplier.nazwa : supplier.name

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        'hover:bg-accent hover:border-accent-foreground/20',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{displayName}</span>
          </div>
          
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{formatNipDisplay(supplier.nip)}</span>
            {isRecentSupplier && (supplier as RecentSupplier).invoiceCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {t('supplierLookup.invoiceCount', { count: (supplier as RecentSupplier).invoiceCount })}
                </span>
              </>
            )}
          </div>

          {'adres' in supplier && supplier.adres && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{supplier.adres}</span>
            </div>
          )}
          
          {'address' in supplier && supplier.address && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {isRecent && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {t('supplierLookup.recentBadge')}
            </Badge>
          )}
          {isSelected && (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
        </div>
      </div>
    </button>
  )
}

interface SearchResultsProps {
  results: GusSearchResult[]
  isLoading: boolean
  error: string | null
  query: string
  currentNip?: string
  onSelect: (result: GusSearchResult) => void
  t: ReturnType<typeof useTranslations<'invoices'>>
}

function SearchResults({ results, isLoading, error, query, currentNip, onSelect, t }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-56" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center">{error}</p>
      </div>
    )
  }

  if (query.length > 0 && query.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Search className="h-8 w-8 mb-2 opacity-50" />
        <p>{t('supplierLookup.minCharsHint')}</p>
      </div>
    )
  }

  if (query.length >= 3 && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Building2 className="h-8 w-8 mb-2 opacity-50" />
        <p>{t('supplierLookup.notFoundForQuery', { query })}</p>
        <p className="text-sm mt-1">{t('supplierLookup.checkSpelling')}</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Search className="h-8 w-8 mb-2 opacity-50" />
        <p>{t('supplierLookup.searchPrompt')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <SupplierCard
          key={result.regon || result.nip}
          supplier={result}
          isSelected={result.nip === currentNip}
          onSelect={() => onSelect(result)}
          t={t}
        />
      ))}
    </div>
  )
}

interface RecentSuppliersListProps {
  suppliers: RecentSupplier[]
  isLoading: boolean
  error: string | null
  currentNip?: string
  onSelect: (supplier: RecentSupplier) => void
  t: ReturnType<typeof useTranslations<'invoices'>>
}

function RecentSuppliersList({ suppliers, isLoading, error, currentNip, onSelect, t }: RecentSuppliersListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center">{error}</p>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p>{t('supplierLookup.noHistory')}</p>
        <p className="text-sm mt-1">{t('supplierLookup.noHistoryHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {suppliers.map((supplier) => (
        <SupplierCard
          key={supplier.nip}
          supplier={supplier}
          isRecent
          isSelected={supplier.nip === currentNip}
          onSelect={() => onSelect(supplier)}
          t={t}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SupplierLookupDialog({
  open,
  onOpenChange,
  onSelect,
  tenantNip,
  currentNip,
}: SupplierLookupDialogProps) {
  const t = useTranslations('invoices')
  const [activeTab, setActiveTab] = useState<'search' | 'recent'>('recent')
  const [searchInput, setSearchInput] = useState('')

  // GUS search hook
  const {
    search: gusSearch,
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    query: searchQuery,
    clear: clearSearch,
  } = useGusSearch({
    debounceMs: 400,
    minQueryLength: 3,
  })

  // Recent suppliers hook
  const {
    suppliers: recentSuppliers,
    isLoading: isLoadingRecent,
    error: recentError,
    filter: filterRecent,
  } = useRecentSuppliers({
    tenantNip,
    limit: 15,
    enabled: open,
  })

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    gusSearch(value)
  }, [gusSearch])

  // Handle selecting from GUS search
  const handleSelectFromSearch = useCallback((result: GusSearchResult) => {
    onSelect({
      nip: result.nip,
      name: result.nazwa,
      address: result.adres,
      city: result.miejscowosc,
    })
    onOpenChange(false)
  }, [onSelect, onOpenChange])

  // Handle selecting from recent suppliers
  const handleSelectFromRecent = useCallback((supplier: RecentSupplier) => {
    onSelect({
      nip: supplier.nip,
      name: supplier.name,
      address: supplier.address,
    })
    onOpenChange(false)
  }, [onSelect, onOpenChange])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setActiveTab('recent')
    }
  }, [open])

  // Filtered recent suppliers based on search input
  const filteredRecent = searchInput ? filterRecent(searchInput) : recentSuppliers

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('supplierLookup.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('supplierLookup.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('supplierLookup.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <Separator />

        {/* Recent suppliers only - GUS search disabled */}
        <ScrollArea className="flex-1 mt-4 min-h-[300px]">
          <RecentSuppliersList
            suppliers={searchInput ? filteredRecent : recentSuppliers}
            isLoading={isLoadingRecent}
            error={recentError}
            currentNip={currentNip}
            onSelect={handleSelectFromRecent}
            t={t}
          />
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('supplierLookup.suppliersFromHistory')}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
