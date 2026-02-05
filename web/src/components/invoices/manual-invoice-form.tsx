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

// MPK options (values from Dataverse option set)
const MPK_OPTIONS = [
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
  supplierCity: string
  supplierPostalCode: string
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
  supplierAddress: '',
  supplierCity: '',
  supplierPostalCode: '',
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
  const t = useTranslations('invoices')
  
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
        title: t('manualForm.gusDataFetched'),
        description: t('manualForm.gusFound', { name: data.nazwa }),
      })
    },
    onError: (error) => {
      setGusDataLoaded(false)
      toast({
        title: t('manualForm.gusSearchError'),
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
      supplierAddress: supplier.address || '',
      supplierCity: supplier.city || '',
      supplierPostalCode: supplier.postalCode || '',
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

    // Use company from context
    const data: ManualInvoiceCreate = {
      tenantNip: selectedCompany!.nip,
      tenantName: selectedCompany!.companyName,
      invoiceNumber: formData.invoiceNumber,
      supplierNip: formData.supplierNip,
      supplierName: formData.supplierName,
      supplierAddress: formData.supplierAddress || undefined,
      supplierCity: formData.supplierCity || undefined,
      supplierPostalCode: formData.supplierPostalCode || undefined,
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
              {t('manualForm.noCompanySelected')}. {t('manualForm.selectCompanyHint')}{' '}
              <a href="/settings" className="underline font-medium">{t('manualForm.addNewCompany')}</a>{' '}
              {t('manualForm.inSettings')}
            </AlertDescription>
          </Alert>
        )}

        {/* Supplier section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('manualForm.supplierSection')}
            </CardTitle>
            <CardDescription>
              {t('manualForm.supplierDescription')}
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
              {t('manualForm.searchSupplier')}
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.nipLabel')}</label>
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
                      <p>{t('manualForm.fetchFromGus')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {errors.supplierNip && <p className="text-sm text-red-500">{errors.supplierNip}</p>}
                {gusError && <p className="text-sm text-red-500">{gusError}</p>}
                {formData.supplierNip.length > 0 && formData.supplierNip.length < 10 && (
                  <p className="text-xs text-muted-foreground">
                    {t('manualForm.nipDigits', { count: formData.supplierNip.length })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  {t('manualForm.companyName')}
                  {gusDataLoaded && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('manualForm.fromGus')}
                    </Badge>
                  )}
                </label>
                <Input
                  placeholder={t('supplier')}
                  value={formData.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  className={errors.supplierName ? 'border-red-500' : ''}
                />
                {errors.supplierName && <p className="text-sm text-red-500">{errors.supplierName}</p>}
              </div>
            </div>

            {/* Address fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t('manualForm.addressLabel')}</label>
                <Input
                  placeholder={t('manualForm.addressPlaceholder')}
                  value={formData.supplierAddress}
                  onChange={(e) => handleChange('supplierAddress', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.postalCodeLabel')}</label>
                <Input
                  placeholder="00-000"
                  value={formData.supplierPostalCode}
                  onChange={(e) => handleChange('supplierPostalCode', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('manualForm.cityLabel')}</label>
              <Input
                placeholder={t('manualForm.cityPlaceholder')}
                value={formData.supplierCity}
                onChange={(e) => handleChange('supplierCity', e.target.value)}
              />
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
              {t('manualForm.invoiceSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.invoiceNumberLabel')}</label>
                <Input
                  placeholder={t('manualForm.invoiceNumberPlaceholder')}
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={errors.invoiceNumber ? 'border-red-500' : ''}
                />
                {errors.invoiceNumber && <p className="text-sm text-red-500">{errors.invoiceNumber}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('manualForm.issueDateLabel')}
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
                  {t('manualForm.dueDateLabel')}
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('manualForm.descriptionLabel')}</label>
              <Input
                placeholder={t('manualForm.descriptionPlaceholder')}
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
              {t('manualForm.amountsSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.netAmountLabel')}</label>
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
                <label className="text-sm font-medium">{t('manualForm.vatRateLabel')}</label>
                <Select value={formData.vatRate} onValueChange={handleVatRateChange}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.vatAmountLabel')}</label>
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
                  {t('manualForm.vatAutoCalculated')}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.grossAmountLabel')}</label>
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
                  {t('manualForm.grossAutoCalculated')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorization */}
        <Card>
          <CardHeader>
            <CardTitle>{t('manualForm.categorizationSection')}</CardTitle>
            <CardDescription>{t('manualForm.categorizationDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.mpkLabel')}</label>
                <Select value={formData.mpk} onValueChange={(v) => handleChange('mpk', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('manualForm.mpkPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MPK_OPTIONS.map((mpk) => (
                      <SelectItem key={mpk} value={mpk}>
                        {mpk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('manualForm.categoryLabel')}</label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.category || t('manualForm.categoryPlaceholder')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('manualForm.attachmentsSection')}
            </CardTitle>
            <CardDescription>{t('manualForm.attachmentsDescription')}</CardDescription>
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
