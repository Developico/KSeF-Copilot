import { useState } from 'react'
import { useIntl } from 'react-intl'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Search, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import { useGusLookup } from '@/hooks/use-api'
import type { GusCompanyData } from '@/lib/types'

interface SupplierData {
  supplierNip: string
  supplierName: string
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  supplierCountry?: string
}

interface GusLookupDialogProps {
  onApply: (data: SupplierData) => void
}

function validateNip(nip: string): boolean {
  const clean = nip.replace(/[\s-]/g, '')
  if (!/^\d{10}$/.test(clean)) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(clean[i], 10), 0)
  return sum % 11 === parseInt(clean[9], 10)
}

export function GusLookupDialog({ onApply }: GusLookupDialogProps) {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [nip, setNip] = useState('')
  const [result, setResult] = useState<GusCompanyData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const gusLookup = useGusLookup()

  function handleSearch() {
    const clean = nip.replace(/[\s-]/g, '')
    if (!validateNip(clean)) {
      setErrorMessage(intl.formatMessage({ id: 'invoices.validNipRequired' }))
      return
    }

    setErrorMessage('')
    setResult(null)

    gusLookup.mutate(clean, {
      onSuccess: (res) => {
        if (res.success && res.data) {
          setResult(res.data)
        } else {
          setErrorMessage(intl.formatMessage({ id: 'invoices.supplierNotFound' }))
        }
      },
      onError: (err) => setErrorMessage(err.message),
    })
  }

  function handleApply() {
    if (!result) return
    const address = [result.ulica, result.nrBudynku, result.nrLokalu ? `/${result.nrLokalu}` : '']
      .filter(Boolean)
      .join(' ')

    onApply({
      supplierNip: result.nip,
      supplierName: result.nazwa,
      supplierAddress: address || undefined,
      supplierCity: result.miejscowosc,
      supplierPostalCode: result.kodPocztowy,
      supplierCountry: 'PL',
    })
    setOpen(false)
    setResult(null)
    setNip('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setResult(null); setErrorMessage(''); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Search className="h-4 w-4 mr-1" />
          {intl.formatMessage({ id: 'invoices.gusLookup' })}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'invoices.gusLookup' })}</DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'invoices.gusLookupDesc' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="gus-nip">{intl.formatMessage({ id: 'invoices.searchByNip' })}</Label>
            <div className="flex gap-2">
              <Input
                id="gus-nip"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="0000000000"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={gusLookup.isPending}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}

          {result && (
            <div className="p-4 rounded-md border bg-green-50 dark:bg-green-950/20 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {intl.formatMessage({ id: 'invoices.supplierFound' })}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{result.nazwa}</span>
                </div>
                <p className="text-muted-foreground ml-6">
                  {intl.formatMessage({ id: 'invoices.nipLabel' })}: {result.nip}
                </p>
                {result.adres && (
                  <p className="text-muted-foreground ml-6">{result.adres}</p>
                )}
                <p className="text-muted-foreground ml-6">
                  {result.kodPocztowy} {result.miejscowosc}
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          {result && (
            <Button onClick={handleApply}>
              {intl.formatMessage({ id: 'invoices.applySupplierData' })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
