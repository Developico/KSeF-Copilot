'use client'

import { useState } from 'react'
import { RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface CurrencyAmountProps {
  amount: number
  currency: 'PLN' | 'EUR' | 'USD'
  plnAmount?: number
  exchangeRate?: number
  exchangeDate?: string
  exchangeSource?: string
  className?: string
  showConversion?: boolean
}

/**
 * Displays an amount with currency symbol and optional PLN conversion
 */
export function CurrencyAmount({
  amount,
  currency,
  plnAmount,
  exchangeRate,
  exchangeDate,
  exchangeSource,
  className,
  showConversion = true,
}: CurrencyAmountProps) {
  const formattedAmount = formatAmount(amount, currency)
  const formattedPlnAmount = plnAmount ? formatAmount(plnAmount, 'PLN') : null
  const formattedDate = exchangeDate ? formatDate(exchangeDate) : null

  const isForeignCurrency = currency !== 'PLN'

  return (
    <div className={cn('space-y-1', className)}>
      <div className="font-medium">{formattedAmount}</div>
      {isForeignCurrency && showConversion && (
        <div className="text-sm text-muted-foreground">
          {formattedPlnAmount ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">≈ {formattedPlnAmount}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div>Kurs: {exchangeRate?.toFixed(4)}</div>
                    {formattedDate && <div>Data: {formattedDate}</div>}
                    {exchangeSource && <div>Źródło: {exchangeSource}</div>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-yellow-600">Brak kursu</span>
          )}
        </div>
      )}
    </div>
  )
}

interface ExchangeRateEditorProps {
  currency: 'EUR' | 'USD'
  date: string // Invoice date for rate lookup
  rate?: number
  onRateChange: (rate: number, date: string, source: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Editor for exchange rate with NBP API refresh button
 */
export function ExchangeRateEditor({
  currency,
  date,
  rate,
  onRateChange,
  disabled = false,
  className,
}: ExchangeRateEditorProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [localRate, setLocalRate] = useState(rate?.toFixed(4) ?? '')
  const [warning, setWarning] = useState<string | null>(null)

  const handleRefreshRate = async () => {
    setIsLoading(true)
    setWarning(null)

    try {
      const result = await api.exchangeRates.get(currency, date)
      setLocalRate(result.rate.toFixed(4))
      onRateChange(result.rate, result.effectiveDate, 'NBP API')

      if (result.warningThreshold) {
        setWarning(
          `Uwaga: Kurs zmienił się o ${result.changePercent?.toFixed(2)}% ` +
            `względem poprzedniego dnia.`
        )
      }

      toast({
        title: 'Pobrano kurs NBP',
        description: `${currency}/PLN: ${result.rate.toFixed(4)} (${result.effectiveDate})`,
      })
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error)
      toast({
        title: 'Błąd pobierania kursu',
        description: error instanceof Error ? error.message : 'Nieznany błąd',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualRateChange = (value: string) => {
    setLocalRate(value)
    const numericRate = parseFloat(value)
    if (!isNaN(numericRate) && numericRate > 0) {
      onRateChange(numericRate, date, 'Manual')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-muted-foreground">
        Kurs {currency}/PLN
      </Label>
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.0001"
          min="0"
          value={localRate}
          onChange={(e) => handleManualRateChange(e.target.value)}
          placeholder="4.3500"
          disabled={disabled}
          className="w-32"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefreshRate}
                disabled={disabled || isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Pobierz kurs NBP z dnia {formatDate(date)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {warning && (
        <div className="flex items-center gap-1 text-sm text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span>{warning}</span>
        </div>
      )}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>Kurs średni NBP z dnia sprzedaży</span>
      </div>
    </div>
  )
}

interface CurrencyDisplayProps {
  grossAmount: number
  currency: 'PLN' | 'EUR' | 'USD'
  grossAmountPln?: number
  exchangeRate?: number
  exchangeDate?: string
  exchangeSource?: string
  className?: string
}

/**
 * Full currency display with original amount and PLN conversion
 */
export function CurrencyDisplay({
  grossAmount,
  currency,
  grossAmountPln,
  exchangeRate,
  exchangeDate,
  exchangeSource,
  className,
}: CurrencyDisplayProps) {
  const isForeignCurrency = currency !== 'PLN'

  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Kwota brutto</Label>
          <div className="text-xl font-semibold">
            {formatAmount(grossAmount, currency)}
          </div>
        </div>

        {isForeignCurrency && (
          <>
            <div className="border-t pt-3">
              <Label className="text-xs text-muted-foreground">Równowartość w PLN</Label>
              <div className="text-lg font-medium">
                {grossAmountPln ? (
                  formatAmount(grossAmountPln, 'PLN')
                ) : (
                  <span className="text-yellow-600">Brak kursu</span>
                )}
              </div>
            </div>

            {exchangeRate && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Kurs:</span> {exchangeRate.toFixed(4)}
                </div>
                {exchangeDate && (
                  <div>
                    <span className="font-medium">Data:</span> {formatDate(exchangeDate)}
                  </div>
                )}
                {exchangeSource && (
                  <div>
                    <span className="font-medium">Źródło:</span> {exchangeSource}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// InvoiceAmountCell — compact table variant
// ============================================================================

interface InvoiceAmountCellProps {
  amount: number
  currency: 'PLN' | 'EUR' | 'USD'
  grossAmountPln?: number
  className?: string
}

/**
 * Table-optimised amount cell.
 * For foreign-currency invoices, wraps the amount in a tooltip that shows
 * the PLN equivalent on hover. When PLN equivalent is unknown, shows only
 * the original amount (silent – no warning badge).
 */
export function InvoiceAmountCell({
  amount,
  currency,
  grossAmountPln,
  className,
}: InvoiceAmountCellProps) {
  const isForeign = currency !== 'PLN'
  const formatted = formatAmount(amount, currency)

  if (isForeign && grossAmountPln) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('cursor-help', className)}>{formatted}</span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <span className="text-xs">≈ {formatAmount(grossAmountPln, 'PLN')}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return <span className={className}>{formatted}</span>
}

// ============================================================================
// Helpers
// ============================================================================

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string): string {
  try {
    return format(new Date(date), 'dd MMM yyyy', { locale: pl })
  } catch {
    return date
  }
}
