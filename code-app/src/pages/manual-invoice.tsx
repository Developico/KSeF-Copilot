import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, FileText, Building2, Calendar as CalendarIcon,
  CreditCard, Tag,
} from 'lucide-react'
import { useCreateManualInvoice, useExchangeRate } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { GusLookupDialog } from '@/components/invoices/gus-lookup-dialog'
import { toast } from 'sonner'
import type { ManualInvoiceCreate } from '@/lib/types'

type Currency = 'PLN' | 'EUR' | 'USD'

export function ManualInvoicePage() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { selectedCompany } = useCompanyContext()
  const createInvoice = useCreateManualInvoice()

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [supplierNip, setSupplierNip] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplierAddress, setSupplierAddress] = useState('')
  const [supplierCity, setSupplierCity] = useState('')
  const [supplierPostalCode, setSupplierPostalCode] = useState('')
  const [netAmount, setNetAmount] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [grossAmount, setGrossAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('PLN')
  const [mpk, setMpk] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  // Auto-calculate gross when net+vat change
  const calculatedGross = useMemo(() => {
    const n = parseFloat(netAmount) || 0
    const v = parseFloat(vatAmount) || 0
    return (n + v).toFixed(2)
  }, [netAmount, vatAmount])

  // Exchange rate query (only for non-PLN currencies)
  const { data: exchangeData } = useExchangeRate(
    currency === 'PLN' ? 'EUR' : currency,
    invoiceDate || undefined,
    { enabled: currency !== 'PLN' },
  )

  const plnEquivalent = useMemo(() => {
    const gross = parseFloat(grossAmount || calculatedGross) || 0
    if (currency === 'PLN' || !exchangeData?.rate) return null
    return (gross * exchangeData.rate).toFixed(2)
  }, [grossAmount, calculatedGross, currency, exchangeData])

  function handleGusApply(data: {
    supplierNip: string
    supplierName: string
    supplierAddress?: string
    supplierCity?: string
    supplierPostalCode?: string
  }) {
    setSupplierNip(data.supplierNip)
    setSupplierName(data.supplierName)
    setSupplierAddress(data.supplierAddress ?? '')
    setSupplierCity(data.supplierCity ?? '')
    setSupplierPostalCode(data.supplierPostalCode ?? '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedCompany) return
    if (!invoiceNumber || !supplierNip || !supplierName || !invoiceDate) return

    const gross = parseFloat(grossAmount || calculatedGross) || 0

    const payload: ManualInvoiceCreate = {
      settingId: selectedCompany.id,
      tenantNip: selectedCompany.nip,
      tenantName: selectedCompany.companyName,
      invoiceNumber,
      supplierNip,
      supplierName,
      supplierAddress: supplierAddress || undefined,
      supplierCity: supplierCity || undefined,
      supplierPostalCode: supplierPostalCode || undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      netAmount: parseFloat(netAmount) || 0,
      vatAmount: parseFloat(vatAmount) || 0,
      grossAmount: gross,
      currency,
      description: description || undefined,
      mpk: mpk || undefined,
      category: category || undefined,
    }

    if (currency !== 'PLN' && exchangeData?.rate) {
      payload.exchangeRate = exchangeData.rate
      payload.exchangeDate = exchangeData.effectiveDate
      payload.grossAmountPln = parseFloat(plnEquivalent ?? '0')
    }

    createInvoice.mutate(payload, {
      onSuccess: (invoice) => {
        toast.success(intl.formatMessage({ id: 'invoices.invoiceCreated' }))
        void navigate(`/invoices/${invoice.id}`)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {intl.formatMessage({ id: 'common.back' })}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" />
          {intl.formatMessage({ id: 'invoices.manualInvoice' })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: 'invoices.createManual' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {intl.formatMessage({ id: 'invoices.supplierDetails' })}
              </CardTitle>
              <GusLookupDialog onApply={handleGusApply} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-nip">{intl.formatMessage({ id: 'invoices.nipLabel' })} *</Label>
                <Input
                  id="supplier-nip"
                  value={supplierNip}
                  onChange={(e) => setSupplierNip(e.target.value)}
                  placeholder="0000000000"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-name">{intl.formatMessage({ id: 'common.name' })} *</Label>
                <Input
                  id="supplier-name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">{intl.formatMessage({ id: 'common.street' })}</Label>
              <Input
                id="supplier-address"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-postal">{intl.formatMessage({ id: 'invoices.postalCode' })}</Label>
                <Input
                  id="supplier-postal"
                  value={supplierPostalCode}
                  onChange={(e) => setSupplierPostalCode(e.target.value)}
                  placeholder="00-000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-city">{intl.formatMessage({ id: 'invoices.city' })}</Label>
                <Input
                  id="supplier-city"
                  value={supplierCity}
                  onChange={(e) => setSupplierCity(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.invoiceDetails' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-number">{intl.formatMessage({ id: 'invoices.invoiceNumber' })} *</Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-date">{intl.formatMessage({ id: 'invoices.invoiceDate' })} *</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">{intl.formatMessage({ id: 'invoices.dueDate' })}</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.amounts' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{intl.formatMessage({ id: 'invoices.currency' })}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger id="currency" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLN">PLN</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="net-amount">{intl.formatMessage({ id: 'invoices.netAmount' })}</Label>
                <Input
                  id="net-amount"
                  type="number"
                  step="0.01"
                  value={netAmount}
                  onChange={(e) => setNetAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat-amount">{intl.formatMessage({ id: 'invoices.vatAmount' })}</Label>
                <Input
                  id="vat-amount"
                  type="number"
                  step="0.01"
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gross-amount">{intl.formatMessage({ id: 'invoices.grossAmount' })}</Label>
                <Input
                  id="gross-amount"
                  type="number"
                  step="0.01"
                  value={grossAmount || calculatedGross}
                  onChange={(e) => setGrossAmount(e.target.value)}
                />
              </div>
            </div>
            {currency !== 'PLN' && exchangeData?.rate && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {intl.formatMessage({ id: 'invoices.exchangeRate' })}:
                    </span>{' '}
                    <span className="font-mono font-medium">{exchangeData.rate.toFixed(4)}</span>
                    <span className="text-muted-foreground ml-1">
                      ({exchangeData.effectiveDate})
                    </span>
                  </div>
                  {plnEquivalent && (
                    <div>
                      <span className="text-muted-foreground">
                        {intl.formatMessage({ id: 'invoices.plnEquivalent' })}:
                      </span>{' '}
                      <span className="font-medium">{plnEquivalent} PLN</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              {intl.formatMessage({ id: 'invoices.editClassification' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mpk">{intl.formatMessage({ id: 'invoices.mpk' })}</Label>
                <Input id="mpk" value={mpk} onChange={(e) => setMpk(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{intl.formatMessage({ id: 'invoices.category' })}</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{intl.formatMessage({ id: 'invoices.description' })}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => void navigate('/invoices')}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button type="submit" disabled={createInvoice.isPending}>
            {intl.formatMessage({ id: 'invoices.createManual' })}
          </Button>
        </div>
      </form>
    </div>
  )
}
