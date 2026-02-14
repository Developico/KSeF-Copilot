import { useState, useCallback, useEffect, useRef } from 'react'
import { useIntl } from 'react-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
  CheckCircle,
  AlertCircle,
  FileText,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Landmark,
} from 'lucide-react'
import { useVatLookup, useRecentSuppliers } from '@/hooks/use-api'
import type { RecentSupplier } from '@/hooks/use-api'
import type { VatSubjectData } from '@/lib/types'
import { formatNip, stripNip, validateNipChecksum } from '@/lib/nip-utils'
import { cn } from '@/lib/utils'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a Polish address from WL VAT API into street, postalCode, city.
 *
 * Input examples:
 *   "JANA KOCHANOWSKIEGO 42/23, 01-864 WARSZAWA"
 *   "ul. Grunwaldzka 5, 80-244 GDAŃSK"
 *
 * Polish postal code format: XX-XXX (always 2 digits, dash, 3 digits)
 */
function parsePolishAddress(raw: string): {
  street: string
  postalCode: string
  city: string
} {
  const match = raw.match(/(\d{2}-\d{3})\s+(.+)$/)
  if (match) {
    const postalCode = match[1]
    const city = match[2].trim()
    const postalIdx = raw.indexOf(postalCode)
    const street = raw.substring(0, postalIdx).replace(/[,\s]+$/, '').trim()
    return { street, postalCode, city }
  }
  return { street: raw, postalCode: '', city: '' }
}

// ============================================================================
// Types
// ============================================================================

export interface SupplierData {
  supplierNip: string
  supplierName: string
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  supplierCountry?: string
}

interface SupplierLookupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (supplier: SupplierData) => void
  tenantNip?: string
  currentNip?: string
}

// ============================================================================
// Sub-components
// ============================================================================

interface SupplierCardProps {
  nip: string
  name: string
  address?: string
  invoiceCount?: number
  isRecent?: boolean
  isSelected?: boolean
  onSelect: () => void
}

function SupplierCard({
  nip,
  name,
  address,
  invoiceCount,
  isRecent = false,
  isSelected = false,
  onSelect,
}: SupplierCardProps) {
  const intl = useIntl()

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        'hover:bg-accent hover:border-accent-foreground/20',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{name}</span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{formatNip(nip)}</span>
            {invoiceCount != null && invoiceCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {intl.formatMessage(
                    { id: 'invoices.supplierLookup.invoiceCount' },
                    { count: invoiceCount },
                  )}
                </span>
              </>
            )}
          </div>

          {address && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {isRecent && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {intl.formatMessage({ id: 'invoices.supplierLookup.recentBadge' })}
            </Badge>
          )}
          {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
        </div>
      </div>
    </button>
  )
}

function LoadingSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: count }).map((_, i) => (
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
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)

  const [activeTab, setActiveTab] = useState<'recent' | 'search'>('recent')
  const [searchInput, setSearchInput] = useState('')
  const [vatResult, setVatResult] = useState<VatSubjectData | null>(null)
  const [searchError, setSearchError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const vatLookup = useVatLookup()

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

  /**
   * Auto-detect input type:
   *  - 10 digits → NIP lookup
   *  - 9 or 14 digits → REGON lookup
   *  - text → filter recent suppliers
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      setVatResult(null)
      setSearchError('')

      if (debounceRef.current) clearTimeout(debounceRef.current)

      const clean = stripNip(value)

      // NIP lookup (10 digits)
      if (/^\d{10}$/.test(clean)) {
        if (!validateNipChecksum(clean)) {
          setSearchError(t('invoices.nipChecksumError'))
          return
        }
        setActiveTab('search')
        debounceRef.current = setTimeout(() => {
          vatLookup.mutate(
            { nip: clean },
            {
              onSuccess: (res) => {
                if (res.success && res.data) {
                  setVatResult(res.data)
                  setSearchError('')
                } else {
                  setSearchError(t('invoices.supplierNotFound'))
                }
              },
              onError: (err) => setSearchError(err.message),
            },
          )
        }, 300)
        return
      }

      // REGON lookup (9 or 14 digits)
      if (/^\d{9}$/.test(clean) || /^\d{14}$/.test(clean)) {
        setActiveTab('search')
        debounceRef.current = setTimeout(() => {
          vatLookup.mutate(
            { regon: clean },
            {
              onSuccess: (res) => {
                if (res.success && res.data) {
                  setVatResult(res.data)
                  setSearchError('')
                } else {
                  setSearchError(t('invoices.supplierNotFound'))
                }
              },
              onError: (err) => setSearchError(err.message),
            },
          )
        }, 300)
        return
      }

      // Text → stay on recent tab for filtering
      if (value.trim().length > 0) {
        setActiveTab('recent')
      }
    },
    [vatLookup, t],
  )

  // Handle selecting a VAT result
  const handleSelectVat = useCallback(
    (data: VatSubjectData) => {
      const rawAddress = data.workingAddress || data.residenceAddress || ''
      const parsed = parsePolishAddress(rawAddress)

      onSelect({
        supplierNip: data.nip,
        supplierName: data.name,
        supplierAddress: parsed.street || undefined,
        supplierCity: parsed.city || undefined,
        supplierPostalCode: parsed.postalCode || undefined,
        supplierCountry: 'PL',
      })
      onOpenChange(false)
    },
    [onSelect, onOpenChange],
  )

  // Handle selecting a recent supplier
  const handleSelectRecent = useCallback(
    (supplier: RecentSupplier) => {
      onSelect({
        supplierNip: supplier.nip,
        supplierName: supplier.name,
        supplierAddress: supplier.address,
        supplierCountry: 'PL',
      })
      onOpenChange(false)
    },
    [onSelect, onOpenChange],
  )

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setActiveTab('recent')
      setVatResult(null)
      setSearchError('')
    }
  }, [open])

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Filter recent suppliers by text input
  const filteredRecent = searchInput ? filterRecent(searchInput) : recentSuppliers

  const isSearching = vatLookup.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('invoices.supplierLookup.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('invoices.supplierLookup.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('invoices.supplierLookup.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Separator />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'recent' | 'search')}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('invoices.supplierLookup.recentTab')}
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              {t('invoices.supplierLookup.searchTab')}
            </TabsTrigger>
          </TabsList>

          {/* Recent suppliers tab */}
          <TabsContent value="recent" className="flex-1 mt-2">
            <ScrollArea className="h-[360px]">
              {isLoadingRecent ? (
                <LoadingSkeletons count={4} />
              ) : recentError ? (
                <div className="flex flex-col items-center justify-center py-8 text-destructive">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p className="text-center text-sm">{recentError}</p>
                </div>
              ) : filteredRecent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p>{t('invoices.supplierLookup.noHistory')}</p>
                  <p className="text-sm mt-1">
                    {t('invoices.supplierLookup.noHistoryHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecent.map((supplier) => (
                    <SupplierCard
                      key={supplier.nip}
                      nip={supplier.nip}
                      name={supplier.name}
                      address={supplier.address}
                      invoiceCount={supplier.invoiceCount}
                      isRecent
                      isSelected={supplier.nip === currentNip}
                      onSelect={() => handleSelectRecent(supplier)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* VAT Search tab */}
          <TabsContent value="search" className="flex-1 mt-2">
            <ScrollArea className="h-[360px]">
              {isSearching ? (
                <LoadingSkeletons />
              ) : searchError ? (
                <div className="flex flex-col items-center justify-center py-8 text-destructive">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p className="text-center text-sm">{searchError}</p>
                </div>
              ) : vatResult ? (
                <VatResultCard
                  data={vatResult}
                  isSelected={vatResult.nip === currentNip}
                  onSelect={() => handleSelectVat(vatResult)}
                  t={t}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <p>{t('invoices.supplierLookup.searchPrompt')}</p>
                  <p className="text-sm mt-1">
                    {t('invoices.supplierLookup.nipOrRegonHint')}
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {activeTab === 'recent'
              ? t('invoices.supplierLookup.suppliersFromHistory')
              : t('invoices.supplierLookup.vatSource')}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// VAT Result Card — detailed display of White List data
// ============================================================================

interface VatResultCardProps {
  data: VatSubjectData
  isSelected: boolean
  onSelect: () => void
  t: (id: string, values?: Record<string, string | number>) => string
}

function VatResultCard({ data, isSelected, onSelect, t }: VatResultCardProps) {
  const isActive = data.statusVat === 'Czynny'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        'hover:bg-accent hover:border-accent-foreground/20',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'border-primary bg-primary/5',
      )}
    >
      <div className="space-y-3">
        {/* Name + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{data.name}</span>
          </div>
          <Badge
            variant={isActive ? 'default' : 'destructive'}
            className="flex-shrink-0 gap-1"
          >
            {isActive ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <ShieldAlert className="h-3 w-3" />
            )}
            {data.statusVat}
          </Badge>
        </div>

        {/* NIP + REGON */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            NIP: <span className="font-mono">{formatNip(data.nip)}</span>
          </span>
          {data.regon && (
            <span>
              REGON: <span className="font-mono">{data.regon}</span>
            </span>
          )}
          {data.krs && <span>KRS: {data.krs}</span>}
        </div>

        {/* Address */}
        {(data.workingAddress || data.residenceAddress) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span>{data.workingAddress || data.residenceAddress}</span>
          </div>
        )}

        {/* Bank accounts count */}
        {data.accountNumbers.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Landmark className="h-3 w-3 flex-shrink-0" />
            <span>
              {t('invoices.supplierLookup.bankAccounts', {
                count: data.accountNumbers.length,
              })}
            </span>
          </div>
        )}

        {isSelected && (
          <div className="flex justify-end">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </button>
  )
}
