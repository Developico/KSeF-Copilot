'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useToast } from '@/hooks/use-toast'
import { api, queryKeys, ManualInvoiceCreate } from '@/lib/api'
import { useSelectedCompany } from '@/contexts/company-context'
import { useGusLookup, validateNipChecksum, formatNipDisplay } from '@/hooks/use-gus-lookup'
import { SupplierLookupDialog, SupplierData } from './supplier-lookup-dialog'
import { 
  FileText, 
  Upload, 
  Save, 
  X, 
  Building2, 
  Calendar, 
  DollarSign,
  FileUp,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  ExternalLink,
  Check,
  ChevronsUpDown,
  Plus,
} from 'lucide-react'

// MPK options (must match backend)
const MPK_OPTIONS = [
  { value: 'Consultants', label: 'Konsultanci' },
  { value: 'BackOffice', label: 'Back Office' },
  { value: 'Management', label: 'Zarząd' },
  { value: 'Cars', label: 'Samochody' },
  { value: 'Legal', label: 'Prawny' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sprzedaż' },
  { value: 'Delivery', label: 'Realizacja' },
  { value: 'Finance', label: 'Finanse' },
  { value: 'Other', label: 'Inne' },
]

// Default category suggestions
const DEFAULT_CATEGORIES = [
  'IT / Oprogramowanie',
  'Biuro',
  'Marketing',
  'Podróże',
  'Media',
  'Usługi profesjonalne',
  'Sprzęt',
  'Materiały',
  'Inne',
]

// VAT rate options
const VAT_RATES = [
  { value: '23', label: '23%', rate: 0.23 },
  { value: '8', label: '8%', rate: 0.08 },
  { value: '5', label: '5%', rate: 0.05 },
  { value: '0', label: '0%', rate: 0 },
  { value: 'zw', label: 'zw (zwolniony)', rate: 0 },
  { value: 'np', label: 'np (nie podlega)', rate: 0 },
  { value: 'oo', label: 'oo (odwrotne obciążenie)', rate: 0 },
]

interface FileAttachment {
  file: File
  preview?: string
}

interface FormData {
  tenantNip: string
  tenantName: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  invoiceDate: string
  dueDate: string
  netAmount: string
  vatRate: string
  vatAmount: string
  grossAmount: string
  description: string
  mpk: string
  category: string
}

const initialFormData: FormData = {
  tenantNip: '',
  tenantName: '',
  invoiceNumber: '',
  supplierNip: '',
  supplierName: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  netAmount: '',
  vatRate: '23',
  vatAmount: '',
  grossAmount: '',
  description: '',
  mpk: '',
  category: '',
}

export function ManualInvoiceForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { selectedCompany, isLoading: isLoadingCompany } = useSelectedCompany()
  
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  
  // GUS lookup state
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [gusDataLoaded, setGusDataLoaded] = useState(false)
  
  // Category combobox state
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  
  // All available categories (default + custom)
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories]
  
  // GUS lookup hook
  const {
    lookup: gusLookup,
    data: gusData,
    isLoading: isGusLoading,
    error: gusError,
    isSuccess: isGusSuccess,
    clear: clearGus,
    validateNip,
  } = useGusLookup({
    autoLookup: false, // We'll trigger manually
    onSuccess: (data) => {
      // Auto-fill supplier name from GUS data
      setFormData(prev => ({
        ...prev,
        supplierName: data.nazwa,
      }))
      setGusDataLoaded(true)
      setErrors(prev => ({ ...prev, supplierName: undefined }))
      toast({
        title: 'Dane pobrane z GUS',
        description: `Znaleziono: ${data.nazwa}`,
      })
    },
    onError: (error) => {
      setGusDataLoaded(false)
      toast({
        title: 'Błąd wyszukiwania GUS',
        description: error,
        variant: 'destructive',
      })
    },
  })

  // Handle supplier selection from dialog
  const handleSupplierSelect = useCallback((supplier: SupplierData) => {
    setFormData(prev => ({
      ...prev,
      supplierNip: supplier.nip.replace(/\D/g, ''),
      supplierName: supplier.name,
    }))
    setGusDataLoaded(true)
    setErrors(prev => ({ 
      ...prev, 
      supplierNip: undefined, 
      supplierName: undefined 
    }))
  }, [])

  // Handle NIP change with validation
  const handleNipChange = useCallback((value: string) => {
    const cleanNip = value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, supplierNip: cleanNip }))
    setGusDataLoaded(false)
    clearGus()
    
    // Clear error on change
    if (errors.supplierNip) {
      setErrors(prev => ({ ...prev, supplierNip: undefined }))
    }
    
    // Validate NIP when 10 digits
    if (cleanNip.length === 10) {
      const validation = validateNip(cleanNip)
      if (!validation.valid && validation.error) {
        setErrors(prev => ({ ...prev, supplierNip: validation.error }))
      }
    }
  }, [errors.supplierNip, validateNip, clearGus])

  // Trigger GUS lookup
  const handleGusLookup = useCallback(() => {
    if (formData.supplierNip.length === 10) {
      gusLookup(formData.supplierNip)
    }
  }, [formData.supplierNip, gusLookup])

  // Sync form with selected company from context
  useEffect(() => {
    if (selectedCompany) {
      setFormData(prev => ({
        ...prev,
        tenantNip: selectedCompany.nip,
        tenantName: selectedCompany.companyName,
      }))
    }
  }, [selectedCompany])

  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: async (data: ManualInvoiceCreate) => {
      const invoice = await api.invoices.createManual(data)
      return invoice
    },
    onSuccess: async (invoice) => {
      // Upload attachments if any
      for (const attachment of attachments) {
        try {
          const base64 = await fileToBase64(attachment.file)
          await api.invoices.uploadAttachment(invoice.id, {
            fileName: attachment.file.name,
            mimeType: attachment.file.type,
            content: base64,
          })
        } catch (error) {
          console.error('Failed to upload attachment:', error)
          toast({
            title: 'Ostrzeżenie',
            description: `Nie udało się wgrać załącznika: ${attachment.file.name}`,
            variant: 'destructive',
          })
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() })
      
      toast({
        title: 'Sukces',
        description: 'Faktura została dodana',
      })
      
      router.push('/invoices')
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się utworzyć faktury',
        variant: 'destructive',
      })
    },
  })

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (data:type;base64,)
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle input change
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Auto-calculate VAT and gross from net + VAT rate
  const calculateAmounts = (netValue: string, vatRateValue: string) => {
    const net = parseFloat(netValue) || 0
    const rateConfig = VAT_RATES.find(r => r.value === vatRateValue)
    const rate = rateConfig?.rate ?? 0.23
    
    const vat = net * rate
    const gross = net + vat
    
    return {
      vatAmount: vat > 0 ? vat.toFixed(2) : '',
      grossAmount: gross > 0 ? gross.toFixed(2) : '',
    }
  }

  const handleNetAmountChange = (value: string) => {
    const calculated = calculateAmounts(value, formData.vatRate)
    setFormData(prev => ({
      ...prev,
      netAmount: value,
      ...calculated,
    }))
    if (value && parseFloat(value) >= 0) {
      setErrors(prev => ({ ...prev, netAmount: undefined }))
    }
  }

  const handleVatRateChange = (rate: string) => {
    const calculated = calculateAmounts(formData.netAmount, rate)
    setFormData(prev => ({
      ...prev,
      vatRate: rate,
      ...calculated,
    }))
  }

  // Handle manual VAT amount override
  const handleVatAmountManual = (value: string) => {
    const net = parseFloat(formData.netAmount) || 0
    const vat = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      vatAmount: value,
      grossAmount: (net + vat).toFixed(2),
    }))
  }

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [])

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
  }

  // Add files to attachments
  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Validate type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Błąd',
          description: `Nieobsługiwany typ pliku: ${file.name}`,
          variant: 'destructive',
        })
        return false
      }
      // Validate size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Błąd',
          description: `Plik zbyt duży: ${file.name} (max 10 MB)`,
          variant: 'destructive',
        })
        return false
      }
      return true
    })

    const newAttachments: FileAttachment[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))

    setAttachments(prev => [...prev, ...newAttachments])
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev]
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!)
      }
      updated.splice(index, 1)
      return updated
    })
  }

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    // Company comes from context now - check if we have it
    if (!selectedCompany) {
      toast({
        title: 'Brak wybranej firmy',
        description: 'Wybierz firmę w nagłówku aplikacji',
        variant: 'destructive',
      })
      return false
    }
    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Numer faktury jest wymagany'
    }
    if (!formData.supplierNip || !/^\d{10}$/.test(formData.supplierNip)) {
      newErrors.supplierNip = 'NIP sprzedawcy musi mieć 10 cyfr'
    }
    if (!formData.supplierName.trim()) {
      newErrors.supplierName = 'Nazwa sprzedawcy jest wymagana'
    }
    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Data faktury jest wymagana'
    }
    if (!formData.netAmount || parseFloat(formData.netAmount) < 0) {
      newErrors.netAmount = 'Kwota netto musi być >= 0'
    }
    // VAT amount is auto-calculated but can be manually overridden
    // Only validate if user entered a negative value
    if (formData.vatAmount && parseFloat(formData.vatAmount) < 0) {
      newErrors.vatAmount = 'Kwota VAT nie może być ujemna'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      toast({
        title: 'Błąd walidacji',
        description: 'Popraw błędy w formularzu',
        variant: 'destructive',
      })
      return
    }

    // Use company from context
    const data: ManualInvoiceCreate = {
      tenantNip: selectedCompany!.nip,
      tenantName: selectedCompany!.companyName,
      invoiceNumber: formData.invoiceNumber,
      supplierNip: formData.supplierNip,
      supplierName: formData.supplierName,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || undefined,
      netAmount: parseFloat(formData.netAmount),
      vatAmount: parseFloat(formData.vatAmount),
      grossAmount: parseFloat(formData.grossAmount),
      description: formData.description || undefined,
      mpk: formData.mpk || undefined,
      category: formData.category || undefined,
    }

    createMutation.mutate(data)
  }

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* No company selected warning */}
        {!isLoadingCompany && !selectedCompany && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nie wybrano firmy. Wybierz firmę w nagłówku aplikacji lub{' '}
              <a href="/settings" className="underline font-medium">dodaj nową firmę</a>{' '}
              w ustawieniach.
            </AlertDescription>
          </Alert>
        )}

        {/* Supplier section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sprzedawca
            </CardTitle>
            <CardDescription>
              Dane dostawcy/sprzedawcy. Możesz wyszukać firmę w rejestrze REGON (GUS).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Supplier lookup button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSupplierDialogOpen(true)}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Wyszukaj dostawcę w rejestrze REGON lub historii faktur
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NIP *</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="0000000000"
                      value={formData.supplierNip}
                      onChange={(e) => handleNipChange(e.target.value)}
                      className={errors.supplierNip ? 'border-red-500' : ''}
                    />
                    {/* NIP validation indicator */}
                    {formData.supplierNip.length === 10 && !errors.supplierNip && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleGusLookup}
                        disabled={formData.supplierNip.length !== 10 || isGusLoading || !!errors.supplierNip}
                      >
                        {isGusLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pobierz dane z rejestru REGON (GUS)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {errors.supplierNip && <p className="text-sm text-red-500">{errors.supplierNip}</p>}
                {gusError && <p className="text-sm text-red-500">{gusError}</p>}
                {formData.supplierNip.length > 0 && formData.supplierNip.length < 10 && (
                  <p className="text-xs text-muted-foreground">
                    Wpisz 10 cyfr NIP ({formData.supplierNip.length}/10)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Nazwa firmy *
                  {gusDataLoaded && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      z GUS
                    </Badge>
                  )}
                </label>
                <Input
                  placeholder="Nazwa dostawcy"
                  value={formData.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  className={errors.supplierName ? 'border-red-500' : ''}
                />
                {errors.supplierName && <p className="text-sm text-red-500">{errors.supplierName}</p>}
              </div>
            </div>

            {/* GUS data preview */}
            {isGusSuccess && gusData && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm">
                    <strong>{gusData.nazwa}</strong>
                    {gusData.adres && <span className="text-muted-foreground"> • {gusData.adres}</span>}
                    {gusData.pkdNazwa && (
                      <div className="text-xs text-muted-foreground mt-1">
                        PKD: {gusData.pkd} - {gusData.pkdNazwa}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Supplier Lookup Dialog */}
        <SupplierLookupDialog
          open={isSupplierDialogOpen}
          onOpenChange={setIsSupplierDialogOpen}
          onSelect={handleSupplierSelect}
          tenantNip={selectedCompany?.nip}
          currentNip={formData.supplierNip}
        />

        {/* Invoice details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dane faktury
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Numer faktury *</label>
                <Input
                  placeholder="FV/2024/001"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={errors.invoiceNumber ? 'border-red-500' : ''}
                />
                {errors.invoiceNumber && <p className="text-sm text-red-500">{errors.invoiceNumber}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Data wystawienia *
                </label>
                <Input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => handleChange('invoiceDate', e.target.value)}
                  className={errors.invoiceDate ? 'border-red-500' : ''}
                />
                {errors.invoiceDate && <p className="text-sm text-red-500">{errors.invoiceDate}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Termin płatności
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Opis</label>
              <Input
                placeholder="Krótki opis faktury"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Amounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Kwoty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Netto (PLN) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.netAmount}
                  onChange={(e) => handleNetAmountChange(e.target.value)}
                  className={errors.netAmount ? 'border-red-500' : ''}
                />
                {errors.netAmount && <p className="text-sm text-red-500">{errors.netAmount}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stawka VAT</label>
                <Select value={formData.vatRate} onValueChange={handleVatRateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz stawkę" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">VAT (PLN)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.vatAmount}
                  onChange={(e) => handleVatAmountManual(e.target.value)}
                  className={errors.vatAmount ? 'border-red-500' : ''}
                />
                {errors.vatAmount && <p className="text-sm text-red-500">{errors.vatAmount}</p>}
                <p className="text-xs text-muted-foreground">
                  Wyliczone automatycznie, możesz zmienić ręcznie
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brutto (PLN)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.grossAmount}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Wyliczone automatycznie
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorization */}
        <Card>
          <CardHeader>
            <CardTitle>Kategoryzacja</CardTitle>
            <CardDescription>Przypisz MPK i kategorię (opcjonalne)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">MPK</label>
                <Select value={formData.mpk} onValueChange={(v) => handleChange('mpk', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz MPK..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MPK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategoria</label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.category || "Wybierz lub wpisz kategorię..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Szukaj lub dodaj kategorię..."
                        value={categoryInput}
                        onValueChange={setCategoryInput}
                      />
                      <CommandList>
                        <CommandEmpty className="py-2 px-3">
                          {categoryInput.trim() ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2"
                              onClick={() => {
                                const newCategory = categoryInput.trim()
                                if (!allCategories.includes(newCategory)) {
                                  setCustomCategories(prev => [...prev, newCategory])
                                }
                                handleChange('category', newCategory)
                                setCategoryInput('')
                                setCategoryOpen(false)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Dodaj &quot;{categoryInput.trim()}&quot;
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Wpisz nazwę nowej kategorii
                            </span>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {allCategories
                            .filter(cat => 
                              cat.toLowerCase().includes(categoryInput.toLowerCase())
                            )
                            .map((cat) => (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={() => {
                                  handleChange('category', cat)
                                  setCategoryInput('')
                                  setCategoryOpen(false)
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.category === cat ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {cat}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Załączniki
            </CardTitle>
            <CardDescription>PDF lub zdjęcie faktury (opcjonalne, max 10 MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Przeciągnij pliki tutaj lub <span className="text-primary">wybierz z dysku</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPEG, PNG, GIF, WebP (max 10 MB)
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    {att.preview ? (
                      <img 
                        src={att.preview} 
                        alt={att.file.name} 
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(att.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Zapisz fakturę
          </Button>
        </div>
      </div>
    </form>
    </TooltipProvider>
  )
}
