import { useState, useMemo, useRef } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, FileText, Building2, Calendar as CalendarIcon,
  CreditCard, Tag, Upload, X, Paperclip, AlertCircle, Loader2,
} from 'lucide-react'
import { useCreateManualInvoice, useExchangeRate } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { SupplierLookupDialog } from '@/components/invoices/supplier-lookup-dialog'
import type { SupplierData } from '@/components/invoices/supplier-lookup-dialog'
import { toast } from 'sonner'
import { validateNip, stripNip } from '@/lib/nip-utils'
import type { ManualInvoiceCreate } from '@/lib/types'
import { api } from '@/lib/api'

type Currency = 'PLN' | 'EUR' | 'USD'

/** Standard Polish VAT rates + special codes */
const VAT_RATES = [
  { value: '23', label: '23%' },
  { value: '8', label: '8%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
  { value: 'zw', label: 'zw' },
  { value: 'np', label: 'np' },
  { value: 'oo', label: 'oo' },
] as const

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10 MB

interface PendingFile {
  file: File
  base64: string
}

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
  const [netAmount, setNetAmount] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [grossAmount, setGrossAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('PLN')
  const [mpk, setMpk] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [vatRate, setVatRate] = useState('23')
  const [nipError, setNipError] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)

  // Auto-calculate VAT and gross from net + selected rate
  const calculatedVat = useMemo(() => {
    const n = parseFloat(netAmount) || 0
    const rate = parseFloat(vatRate)
    if (isNaN(rate)) return parseFloat(vatAmount) || 0  // special rates (zw/np/oo): keep manual
    return n * (rate / 100)
  }, [netAmount, vatRate, vatAmount])

  const calculatedGross = useMemo(() => {
    const n = parseFloat(netAmount) || 0
    const v = parseFloat(vatAmount) || calculatedVat
    return (n + v).toFixed(2)
  }, [netAmount, vatAmount, calculatedVat])

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

  function handleSupplierSelect(data: SupplierData) {
    setSupplierNip(data.supplierNip)
    setSupplierName(data.supplierName)
    setSupplierAddress([data.supplierAddress, data.supplierPostalCode, data.supplierCity].filter(Boolean).join(', '))
    setNipError(null)
  }

  function handleNipChange(value: string) {
    setSupplierNip(value)
    const stripped = stripNip(value)
    if (stripped.length === 10) {
      const err = validateNip(stripped)
      setNipError(err ? intl.formatMessage({ id: `invoices.${err}` }) : null)
    } else if (stripped.length > 0 && stripped.length < 10) {
      setNipError(null) // still typing
    } else {
      setNipError(null)
    }
  }

  async function handleAttachmentAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(intl.formatMessage({ id: 'scanner.fileTooLarge' }))
        continue
      }
      const base64 = await fileToBase64(file)
      setPendingFiles((prev) => [...prev, { file, base64 }])
    }
    e.target.value = ''
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedCompany) return
    if (!invoiceNumber || !supplierNip || !supplierName || !invoiceDate) return

    // Validate NIP before submitting
    const nipValidation = validateNip(supplierNip)
    if (nipValidation) {
      setNipError(intl.formatMessage({ id: `invoices.${nipValidation}` }))
      return
    }

    const gross = parseFloat(grossAmount || calculatedGross) || 0
    const vat = parseFloat(vatAmount) || calculatedVat

    const payload: ManualInvoiceCreate = {
      settingId: selectedCompany.id,
      tenantNip: selectedCompany.nip,
      tenantName: selectedCompany.companyName,
      invoiceNumber,
      supplierNip,
      supplierName,
      supplierAddress: supplierAddress || undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      netAmount: parseFloat(netAmount) || 0,
      vatAmount: vat,
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

    setIsSubmitting(true)
    createInvoice.mutate(payload, {
      onSuccess: async (invoice) => {
        // Upload pending attachments
        if (pendingFiles.length > 0) {
          try {
            await Promise.all(
              pendingFiles.map((pf) =>
                api.invoices.uploadAttachment(invoice.id, {
                  fileName: pf.file.name,
                  mimeType: pf.file.type,
                  content: pf.base64,
                }),
              ),
            )
          } catch {
            toast.error(intl.formatMessage({ id: 'errors.generic' }))
          }
        }
        setIsSubmitting(false)
        toast.success(intl.formatMessage({ id: 'invoices.invoiceCreated' }))
        void navigate(`/invoices/${invoice.id}`)
      },
      onError: (err) => {
        setIsSubmitting(false)
        toast.error(err.message)
      },
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
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setSupplierDialogOpen(true)}
              >
                <Building2 className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'invoices.lookupSupplier' })}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-nip">{intl.formatMessage({ id: 'invoices.nipLabel' })} *</Label>
                <Input
                  id="supplier-nip"
                  value={supplierNip}
                  onChange={(e) => handleNipChange(e.target.value)}
                  placeholder="0000000000"
                  className={`font-mono ${nipError ? 'border-destructive' : ''}`}
                  required
                />
                {nipError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {nipError}
                  </p>
                )}
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="vat-rate">{intl.formatMessage({ id: 'invoices.vatRate' })}</Label>
                <Select value={vatRate} onValueChange={(v) => {
                  setVatRate(v)
                  // Auto-fill VAT amount when switching to a numeric rate
                  const rate = parseFloat(v)
                  if (!isNaN(rate) && netAmount) {
                    const n = parseFloat(netAmount) || 0
                    setVatAmount((n * rate / 100).toFixed(2))
                  }
                }}>
                  <SelectTrigger id="vat-rate" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  value={vatAmount || (calculatedVat ? calculatedVat.toFixed(2) : '')}
                  onChange={(e) => setVatAmount(e.target.value)}
                  placeholder={calculatedVat ? calculatedVat.toFixed(2) : '0.00'}
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

        {/* Attachments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4" />
                {intl.formatMessage({ id: 'invoices.attachments' })}
                {pendingFiles.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingFiles.length}</Badge>
                )}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => attachmentInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'invoices.addAttachment' })}
              </Button>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES.join(',')}
                className="hidden"
                aria-label={intl.formatMessage({ id: 'invoices.addAttachment' })}
                onChange={handleAttachmentAdd}
              />
            </div>
          </CardHeader>
          {pendingFiles.length > 0 && (
            <CardContent>
              <div className="space-y-2">
                {pendingFiles.map((pf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{pf.file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(pf.file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePendingFile(idx)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => void navigate('/invoices')}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button type="submit" disabled={isSubmitting || createInvoice.isPending || !!nipError}>
            {(isSubmitting || createInvoice.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {intl.formatMessage({ id: 'invoices.createManual' })}
          </Button>
        </div>
      </form>

      {/* Supplier Lookup Dialog */}
      <SupplierLookupDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSelect={handleSupplierSelect}
        tenantNip={selectedCompany?.nip}
        currentNip={supplierNip || undefined}
      />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
