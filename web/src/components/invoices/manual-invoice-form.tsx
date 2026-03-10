'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
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
import { useContextMpkCenters } from '@/hooks/use-api'
import { generatePdfThumbnail, isPdfFile } from '@/lib/pdf-thumbnail'
import { useVatLookup, validateNipChecksum, formatNipDisplay } from '@/hooks/use-vat-lookup'
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

// MPK options — fallback when API is unavailable; overridden by useContextMpkCenters
const DEFAULT_MPK_OPTIONS = [
  'Consultants',
  'BackOffice',
  'Management',
  'Cars',
  'Legal',
  'Marketing',
  'Sales',
  'Delivery',
  'Finance',
  'Other',
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
  supplierAddress: string
  invoiceDate: string
  dueDate: string
  netAmount: string
  vatRate: string
  vatAmount: string
  grossAmount: string
  currency: 'PLN' | 'EUR' | 'USD'
  exchangeRate: string
  exchangeDate: string
  description: string
  mpkCenterId: string
  category: string
}

const initialFormData: FormData = {
  tenantNip: '',
  tenantName: '',
  invoiceNumber: '',
  supplierNip: '',
  supplierName: '',
  supplierAddress: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  netAmount: '',
  vatRate: '23',
  vatAmount: '',
  grossAmount: '',
  currency: 'PLN',
  exchangeRate: '',
  exchangeDate: '',
  description: '',
  mpkCenterId: '',
  category: '',
}

export function ManualInvoiceForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { selectedCompany, isLoading: isLoadingCompany } = useSelectedCompany()
  const t = useTranslations('invoices')
  const { data: mpkCentersData } = useContextMpkCenters()
  const mpkOptions = mpkCentersData?.mpkCenters?.map(mc => ({ id: mc.id, name: mc.name }))
    ?? DEFAULT_MPK_OPTIONS.map(name => ({ id: name, name }))
  
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [invoiceDocument, setInvoiceDocument] = useState<FileAttachment | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  
  // VAT lookup state
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [vatDataLoaded, setVatDataLoaded] = useState(false)
  
  // Category combobox state
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  
  // All available categories (default + custom)
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories]
  
  // VAT lookup hook
  const {
    lookup: vatLookup,
    data: vatData,
    isLoading: isVatLoading,
    error: vatError,
    isSuccess: isVatSuccess,
    clear: clearVat,
  } = useVatLookup({
    onSuccess: (data) => {
      // Auto-fill supplier name from VAT data
      setFormData(prev => ({
        ...prev,
        supplierName: data.name,
      }))
      setVatDataLoaded(true)
      setErrors(prev => ({ ...prev, supplierName: undefined }))
      toast({
        title: t('manualForm.vatDataFetched'),
        description: t('manualForm.vatFound', { name: data.name }),
      })
    },
    onError: (error) => {
      setVatDataLoaded(false)
      toast({
        title: t('manualForm.vatSearchError'),
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
      supplierAddress: [supplier.address, supplier.postalCode, supplier.city].filter(Boolean).join(', '),
    }))
    setVatDataLoaded(true)
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
    setVatDataLoaded(false)
    clearVat()
    
    // Clear error on change
    if (errors.supplierNip) {
      setErrors(prev => ({ ...prev, supplierNip: undefined }))
    }
    
    // Validate NIP when 10 digits
    if (cleanNip.length === 10) {
      const validation = validateNipChecksum(cleanNip)
      if (!validation.valid && validation.error) {
        setErrors(prev => ({ ...prev, supplierNip: validation.error }))
      }
    }
  }, [errors.supplierNip, clearVat])

  // Trigger VAT lookup
  const handleVatLookup = useCallback(() => {
    if (formData.supplierNip.length === 10) {
      vatLookup({ nip: formData.supplierNip })
    }
  }, [formData.supplierNip, vatLookup])

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
      // Upload invoice document (scan) if provided
      if (invoiceDocument) {
        try {
          const base64 = await fileToBase64(invoiceDocument.file)

          // Generate thumbnail for PDFs
          let thumbnail: string | undefined
          if (isPdfFile(invoiceDocument.file)) {
            try {
              const thumbResult = await generatePdfThumbnail(invoiceDocument.file)
              thumbnail = thumbResult.base64
            } catch (thumbErr) {
              console.warn('Failed to generate PDF thumbnail:', thumbErr)
            }
          }

          await api.invoices.uploadDocument(invoice.id, {
            fileName: invoiceDocument.file.name,
            mimeType: invoiceDocument.file.type,
            content: base64,
            thumbnail,
          })
        } catch (error) {
          console.error('Failed to upload invoice document:', error)
          toast({
            title: t('manualForm.warning'),
            description: t('manualForm.attachmentUploadFailed', { name: invoiceDocument.file.name }),
            variant: 'destructive',
          })
        }
      }

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
            title: t('manualForm.warning'),
            description: t('manualForm.attachmentUploadFailed', { name: attachment.file.name }),
            variant: 'destructive',
          })
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() })
      
      toast({
        title: t('manualForm.success'),
        description: t('manualForm.invoiceAdded'),
      })
      
      router.push('/invoices')
    },
    onError: (error: Error) => {
      toast({
        title: t('manualForm.validationError'),
        description: error.message || t('manualForm.createError'),
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

  // Fetch exchange rate from NBP API
  const handleFetchExchangeRate = async () => {
    if (!formData.invoiceDate || formData.currency === 'PLN') return

    try {
      const response = await api.exchangeRates.get(formData.currency, formData.invoiceDate)
      setFormData(prev => ({
        ...prev,
        exchangeRate: response.rate.toFixed(4),
        exchangeDate: response.effectiveDate,
      }))
      toast({
        title: t('manualForm.rateFetched'),
        description: t('manualForm.rateFetchedDesc', { 
          currency: formData.currency, 
          date: response.effectiveDate, 
          rate: response.rate.toFixed(4) 
        }),
      })
    } catch (error) {
      toast({
        title: t('manualForm.validationError'),
        description: t('manualForm.rateFetchError'),
        variant: 'destructive',
      })
    }
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
          title: t('manualForm.validationError'),
          description: t('manualForm.unsupportedFileType', { name: file.name }),
          variant: 'destructive',
        })
        return false
      }
      // Validate size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('manualForm.validationError'),
          description: t('manualForm.fileTooLarge', { name: file.name }),
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

  // Handle document drop (single file for dvlp_doc)
  const handleDocumentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setDocumentFile(files[0])
    }
  }, [])

  // Handle document select
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setDocumentFile(files[0])
    }
  }

  // Set document file (validates and sets invoiceDocument state)
  const setDocumentFile = (file: File) => {
    // Validate type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('manualForm.validationError'),
        description: t('manualForm.unsupportedFileType', { name: file.name }),
        variant: 'destructive',
      })
      return
    }
    // Validate size (128 MB for dvlp_doc)
    if (file.size > 128 * 1024 * 1024) {
      toast({
        title: t('manualForm.validationError'),
        description: t('manualForm.fileTooLarge', { name: file.name }),
        variant: 'destructive',
      })
      return
    }
    
    // Clean up previous preview
    if (invoiceDocument?.preview) {
      URL.revokeObjectURL(invoiceDocument.preview)
    }
    
    setInvoiceDocument({
      file,
      preview: URL.createObjectURL(file),
    })
  }

  // Remove document
  const removeDocument = () => {
    if (invoiceDocument?.preview) {
      URL.revokeObjectURL(invoiceDocument.preview)
    }
    setInvoiceDocument(null)
  }

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    // Company comes from context now - check if we have it
    if (!selectedCompany) {
      toast({
        title: t('manualForm.noCompanySelected'),
        description: t('manualForm.selectCompanyHint'),
        variant: 'destructive',
      })
      return false
    }
    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = t('manualForm.invoiceNumberRequired')
    }
    if (!formData.supplierNip || !/^\d{10}$/.test(formData.supplierNip)) {
      newErrors.supplierNip = t('manualForm.supplierNipRequired')
    }
    if (!formData.supplierName.trim()) {
      newErrors.supplierName = t('manualForm.supplierNameRequired')
    }
    if (!formData.invoiceDate) {
      newErrors.invoiceDate = t('manualForm.invoiceDateRequired')
    }
    if (!formData.netAmount || parseFloat(formData.netAmount) < 0) {
      newErrors.netAmount = t('manualForm.netAmountRequired')
    }
    // VAT amount is auto-calculated but can be manually overridden
    // Only validate if user entered a negative value
    if (formData.vatAmount && parseFloat(formData.vatAmount) < 0) {
      newErrors.vatAmount = t('manualForm.vatAmountNegative')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      toast({
        title: t('manualForm.validationError'),
        description: t('manualForm.fixFormErrors'),
        variant: 'destructive',
      })
      return
    }

    const grossAmount = parseFloat(formData.grossAmount)
    const exchangeRate = formData.exchangeRate ? parseFloat(formData.exchangeRate) : undefined
    const grossAmountPln = formData.currency !== 'PLN' && exchangeRate
      ? grossAmount * exchangeRate
      : undefined

    // Use company from context
    const data: ManualInvoiceCreate = {
      tenantNip: selectedCompany!.nip,
      tenantName: selectedCompany!.companyName,
      invoiceNumber: formData.invoiceNumber,
      supplierNip: formData.supplierNip,
      supplierName: formData.supplierName,
      supplierAddress: formData.supplierAddress || undefined,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || undefined,
      netAmount: parseFloat(formData.netAmount),
      vatAmount: parseFloat(formData.vatAmount),
      grossAmount: grossAmount,
      description: formData.description || undefined,
      mpkCenterId: formData.mpkCenterId || undefined,
      category: formData.category || undefined,
      // Currency fields
      currency: formData.currency,
      exchangeRate: exchangeRate,
      exchangeDate: formData.exchangeDate || undefined,
      grossAmountPln: grossAmountPln,
    }

    createMutation.mutate(data)
  }

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* No company selected warning */}
        {!isLoadingCompany && !selectedCompany && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('manualForm.noCompanySelected')}. {t('manualForm.selectCompanyHint')}{' '}
              <a href="/settings" className="underline font-medium">{t('manualForm.addNewCompany')}</a>{' '}
              {t('manualForm.inSettings')}
            </AlertDescription>
          </Alert>
        )}

        {/* Top Row: Invoice Info + Supplier + Amounts in 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Invoice Info - Compact */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <FileText className="h-4 w-4" />
              {t('manualForm.invoiceSection')}
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('manualForm.invoiceNumberLabel')}</label>
                <Input
                  placeholder={t('manualForm.invoiceNumberPlaceholder')}
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={`h-8 text-sm ${errors.invoiceNumber ? 'border-red-500' : ''}`}
                />
                {errors.invoiceNumber && <p className="text-xs text-red-500">{errors.invoiceNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('manualForm.issueDateLabel')}
                  </label>
                  <Input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => handleChange('invoiceDate', e.target.value)}
                    className={`h-8 text-sm ${errors.invoiceDate ? 'border-red-500' : ''}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('manualForm.dueDateLabel')}
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('manualForm.descriptionLabel')}</label>
                <Input
                  placeholder={t('manualForm.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Supplier - Compact */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                {t('manualForm.supplierSection')}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setIsSupplierDialogOpen(true)}
              >
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('manualForm.nipLabel')}</label>
                <div className="relative">
                  <Input
                    placeholder="0000000000"
                    value={formData.supplierNip}
                    onChange={(e) => handleNipChange(e.target.value)}
                    className={`h-8 text-sm font-mono ${errors.supplierNip ? 'border-red-500' : ''}`}
                  />
                  {formData.supplierNip.length === 10 && !errors.supplierNip && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500" />
                  )}
                </div>
                {errors.supplierNip && <p className="text-xs text-red-500">{errors.supplierNip}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('manualForm.companyName')}</label>
                <Input
                  placeholder={t('supplier')}
                  value={formData.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  className={`h-8 text-sm ${errors.supplierName ? 'border-red-500' : ''}`}
                />
                {errors.supplierName && <p className="text-xs text-red-500">{errors.supplierName}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('manualForm.addressLabel')}</label>
                <Input
                  placeholder={t('manualForm.addressPlaceholder')}
                  value={formData.supplierAddress}
                  onChange={(e) => handleChange('supplierAddress', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Amounts - Compact */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <DollarSign className="h-4 w-4" />
              {t('manualForm.amountsSection')}
            </div>
            <div className="space-y-2">
              {/* Currency and Exchange Rate row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('manualForm.currencyLabel')}</label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v: 'PLN' | 'EUR' | 'USD') => handleChange('currency', v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={t('manualForm.currencyPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLN">{t('manualForm.currencyPln')}</SelectItem>
                      <SelectItem value="EUR">{t('manualForm.currencyEur')}</SelectItem>
                      <SelectItem value="USD">{t('manualForm.currencyUsd')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.currency !== 'PLN' && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('manualForm.exchangeRateLabel', { currency: formData.currency })}</label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="4.35"
                        value={formData.exchangeRate}
                        onChange={(e) => handleChange('exchangeRate', e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleFetchExchangeRate}
                        disabled={!formData.invoiceDate}
                        title={t('manualForm.fetchNbpRate')}
                      >
                        {t('manualForm.fetchNbpRate')}
                      </Button>
                    </div>
                    {formData.exchangeDate && (
                      <p className="text-xs text-muted-foreground">
                        {t('manualForm.nbpRateFromDate', { date: formData.exchangeDate })}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Net and VAT */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('manualForm.netAmountLabel', { currency: formData.currency })}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.netAmount}
                    onChange={(e) => handleNetAmountChange(e.target.value)}
                    className={`h-8 text-sm ${errors.netAmount ? 'border-red-500' : ''}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('manualForm.vatRateLabel')}</label>
                  <Select value={formData.vatRate} onValueChange={handleVatRateChange}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={t('manualForm.vatRateSelect')} />
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
              </div>

              {/* VAT amount and Gross */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('manualForm.vatAmountLabel', { currency: formData.currency })}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.vatAmount}
                    onChange={(e) => handleVatAmountManual(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('manualForm.grossAmountLabel', { currency: formData.currency })}</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.grossAmount}
                    readOnly
                    className="h-8 text-sm bg-muted cursor-not-allowed font-semibold"
                  />
                </div>
              </div>

              {/* PLN equivalents for foreign currencies */}
              {formData.currency !== 'PLN' && formData.netAmount && formData.exchangeRate && (
                <div className="p-2 bg-muted rounded-md space-y-1 text-xs">
                  <p className="text-muted-foreground font-medium">{t('manualForm.plnEquivalentHeader', { rate: formData.exchangeRate })}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-muted-foreground">{t('manualForm.netPln')}</span>
                      <p className="font-semibold">
                        {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                          parseFloat(formData.netAmount) * parseFloat(formData.exchangeRate)
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('manualForm.vatPln')}</span>
                      <p className="font-semibold">
                        {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                          parseFloat(formData.vatAmount || '0') * parseFloat(formData.exchangeRate)
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('manualForm.grossPln')}</span>
                      <p className="font-semibold">
                        {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                          parseFloat(formData.grossAmount || '0') * parseFloat(formData.exchangeRate)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Supplier Lookup Dialog */}
        <SupplierLookupDialog
          open={isSupplierDialogOpen}
          onOpenChange={setIsSupplierDialogOpen}
          onSelect={handleSupplierSelect}
          tenantNip={selectedCompany?.nip}
          currentNip={formData.supplierNip}
        />

        {/* Categorization */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <FileText className="h-4 w-4" />
            {t('manualForm.categorizationSection')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('manualForm.mpkLabel')}</label>
              <Select value={formData.mpkCenterId} onValueChange={(v) => handleChange('mpkCenterId', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('manualForm.mpkPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {mpkOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('manualForm.categoryLabel')}</label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between font-normal h-8 text-sm"
                  >
                    {formData.category || t('manualForm.categoryPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('manualForm.categorySearch')}
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
                            {t('manualForm.categoryAdd', { name: categoryInput.trim() })}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t('manualForm.categoryTypeNew')}
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
        </Card>

        {/* Invoice Image (Scan) - dvlp_doc */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <FileText className="h-4 w-4" />
            {t('manualForm.invoiceImageSection')}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {t('manualForm.invoiceImageDescription')}
          </p>
          <div className="space-y-3">
            {invoiceDocument ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {invoiceDocument.file.type.startsWith('image/') && invoiceDocument.preview ? (
                    <img 
                      src={invoiceDocument.preview} 
                      alt={invoiceDocument.file.name} 
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{invoiceDocument.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(invoiceDocument.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={removeDocument}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                {/* Inline preview for PDF and images */}
                {invoiceDocument.preview && (
                  <div className="border rounded-lg overflow-hidden bg-muted/50">
                    {invoiceDocument.file.type === 'application/pdf' ? (
                      <iframe
                        src={invoiceDocument.preview}
                        title={invoiceDocument.file.name}
                        className="w-full h-[300px]"
                      />
                    ) : invoiceDocument.file.type.startsWith('image/') ? (
                      <img
                        src={invoiceDocument.preview}
                        alt={invoiceDocument.file.name}
                        className="w-full h-[300px] object-contain"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDocumentDrop}
                onClick={() => document.getElementById('document-input')?.click()}
              >
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('manualForm.dropImageHere')} <span className="text-primary">{t('manualForm.selectFromDisk')}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('manualForm.imageFormats')}
                </p>
                <input
                  id="document-input"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleDocumentSelect}
                  aria-label={t('manualForm.invoiceImageSection')}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Attachments */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Upload className="h-4 w-4" />
            {t('manualForm.attachmentsSection')}
          </div>
          <div className="space-y-3">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('manualForm.dropFilesHere')} <span className="text-primary">{t('manualForm.selectFromDisk')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('manualForm.fileFormats')}
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
                aria-label={t('manualForm.attachmentsSection')}
              />
            </div>

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                  >
                    {att.preview ? (
                      <img 
                        src={att.preview} 
                        alt={att.file.name} 
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
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
                      className="h-6 w-6"
                      onClick={() => removeAttachment(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            {t('manualForm.cancel')}
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
            {t('manualForm.saveInvoice')}
          </Button>
        </div>
      </div>
    </form>
    </TooltipProvider>
  )
}
