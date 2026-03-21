'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, Building2, Loader2, AlertCircle, MapPin,
  ShieldCheck, ShieldAlert, Landmark, CheckCircle2,
} from 'lucide-react'
import {
  useVatLookup,
  formatNipDisplay,
  validateNipChecksum,
} from '@/hooks/use-vat-lookup'
import type { VatSubjectData } from '@/lib/api'
import { cn } from '@/lib/utils'

interface SupplierVatSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (data: { nip: string; settingId: string }) => void
  isPending: boolean
  settingId: string
}

export function SupplierVatSearchDialog({
  open,
  onOpenChange,
  onAdd,
  isPending,
  settingId,
}: SupplierVatSearchDialogProps) {
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const [searchInput, setSearchInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [selected, setSelected] = useState(false)

  const {
    lookup: vatLookup,
    data: vatResult,
    isLoading: isSearching,
    error: lookupError,
    clear: clearLookup,
  } = useVatLookup()

  const handleSearchChange = useCallback(
    (value: string) => {
      // Only allow digits and dashes
      const filtered = value.replace(/[^\d-]/g, '')
      setSearchInput(filtered)
      setValidationError(null)
      setSelected(false)
      clearLookup()

      const clean = filtered.replace(/\D/g, '')

      if (clean.length === 10) {
        // NIP (10 digits)
        const validation = validateNipChecksum(clean)
        if (!validation.valid) {
          setValidationError(validation.error || t('vatInvalidNip'))
          return
        }
        vatLookup({ nip: clean })
      } else if (clean.length === 9 || clean.length === 14) {
        // REGON (9 or 14 digits)
        vatLookup({ regon: clean })
      }
    },
    [vatLookup, clearLookup, t],
  )

  const handleAdd = useCallback(() => {
    if (!vatResult) return
    onAdd({ nip: vatResult.nip, settingId })
  }, [vatResult, onAdd, settingId])

  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setValidationError(null)
      setSelected(false)
      clearLookup()
    }
  }, [open, clearLookup])

  const displayError = validationError || lookupError
  const cleanNip = searchInput.replace(/\D/g, '')
  const isActive = vatResult?.statusVat === 'Czynny'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('vatSearchTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('vatSearchDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('vatSearchPlaceholder')}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 font-mono"
            maxLength={16}
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Validation hint */}
        {cleanNip.length > 0 && cleanNip.length < 9 && !displayError && (
          <p className="text-xs text-muted-foreground">
            {cleanNip.length} cyfr — wpisz NIP (10), REGON (9 lub 14)
          </p>
        )}

        <Separator />

        {/* Results area */}
        <div className="min-h-[180px]">
          {isSearching ? (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('vatSearching')}
              </div>
              <div className="p-4 border rounded-lg">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ) : displayError ? (
            <div className="flex flex-col items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-center text-sm">{displayError}</p>
            </div>
          ) : vatResult ? (
            <button
              type="button"
              onClick={() => setSelected(!selected)}
              className={cn(
                'w-full text-left p-4 rounded-lg border transition-all',
                'hover:bg-accent hover:border-accent-foreground/20',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                selected && 'border-primary bg-primary/5',
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">{vatResult.name}</span>
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
                    {vatResult.statusVat}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    NIP: <span className="font-mono">{formatNipDisplay(vatResult.nip)}</span>
                  </span>
                  {vatResult.regon && (
                    <span>
                      REGON: <span className="font-mono">{vatResult.regon}</span>
                    </span>
                  )}
                  {vatResult.krs && <span>KRS: {vatResult.krs}</span>}
                </div>

                {(vatResult.workingAddress || vatResult.residenceAddress) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>{vatResult.workingAddress || vatResult.residenceAddress}</span>
                  </div>
                )}

                {vatResult.accountNumbers && vatResult.accountNumbers.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Landmark className="h-3 w-3 flex-shrink-0" />
                    <span>
                      {t('vatBankAccounts', { count: vatResult.accountNumbers.length })}
                    </span>
                  </div>
                )}

                {selected && (
                  <div className="flex justify-end">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p>{t('vatSearchDescription')}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Biała Lista VAT — Ministerstwo Finansów
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!vatResult || !selected || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('vatSelectAndAdd')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
