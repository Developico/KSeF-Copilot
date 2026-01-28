'use client'

import { useState, useCallback } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { api, queryKeys, ManualInvoiceCreate } from '@/lib/api'
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

// Category suggestions
const CATEGORY_OPTIONS = [
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
  
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

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

  // Auto-calculate gross from net + vat
  const handleAmountChange = (field: 'netAmount' | 'vatAmount', value: string) => {
    const newData = { ...formData, [field]: value }
    
    const net = parseFloat(newData.netAmount) || 0
    const vat = parseFloat(newData.vatAmount) || 0
    
    if (net > 0 || vat > 0) {
      newData.grossAmount = (net + vat).toFixed(2)
    }
    
    setFormData(newData)
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

    if (!formData.tenantNip || !/^\d{10}$/.test(formData.tenantNip)) {
      newErrors.tenantNip = 'NIP nabywcy musi mieć 10 cyfr'
    }
    if (!formData.tenantName.trim()) {
      newErrors.tenantName = 'Nazwa nabywcy jest wymagana'
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
    if (!formData.vatAmount || parseFloat(formData.vatAmount) < 0) {
      newErrors.vatAmount = 'Kwota VAT musi być >= 0'
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

    const data: ManualInvoiceCreate = {
      tenantNip: formData.tenantNip,
      tenantName: formData.tenantName,
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
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Buyer section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Nabywca
            </CardTitle>
            <CardDescription>Dane Twojej firmy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NIP *</label>
                <Input
                  placeholder="0000000000"
                  value={formData.tenantNip}
                  onChange={(e) => handleChange('tenantNip', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={errors.tenantNip ? 'border-red-500' : ''}
                />
                {errors.tenantNip && <p className="text-sm text-red-500">{errors.tenantNip}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nazwa firmy *</label>
                <Input
                  placeholder="Nazwa firmy"
                  value={formData.tenantName}
                  onChange={(e) => handleChange('tenantName', e.target.value)}
                  className={errors.tenantName ? 'border-red-500' : ''}
                />
                {errors.tenantName && <p className="text-sm text-red-500">{errors.tenantName}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sprzedawca
            </CardTitle>
            <CardDescription>Dane dostawcy/sprzedawcy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NIP *</label>
                <Input
                  placeholder="0000000000"
                  value={formData.supplierNip}
                  onChange={(e) => handleChange('supplierNip', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={errors.supplierNip ? 'border-red-500' : ''}
                />
                {errors.supplierNip && <p className="text-sm text-red-500">{errors.supplierNip}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nazwa firmy *</label>
                <Input
                  placeholder="Nazwa dostawcy"
                  value={formData.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  className={errors.supplierName ? 'border-red-500' : ''}
                />
                {errors.supplierName && <p className="text-sm text-red-500">{errors.supplierName}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

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
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Netto (PLN) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.netAmount}
                  onChange={(e) => handleAmountChange('netAmount', e.target.value)}
                  className={errors.netAmount ? 'border-red-500' : ''}
                />
                {errors.netAmount && <p className="text-sm text-red-500">{errors.netAmount}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">VAT (PLN) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.vatAmount}
                  onChange={(e) => handleAmountChange('vatAmount', e.target.value)}
                  className={errors.vatAmount ? 'border-red-500' : ''}
                />
                {errors.vatAmount && <p className="text-sm text-red-500">{errors.vatAmount}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brutto (PLN)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.grossAmount}
                  onChange={(e) => handleChange('grossAmount', e.target.value)}
                  className="bg-muted"
                />
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
                <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorię..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
  )
}
