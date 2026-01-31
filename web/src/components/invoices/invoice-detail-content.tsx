'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  Upload,
  Check,
  Clock,
  AlertCircle,
  Sparkles,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  FileUp,
  Pencil,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

import { api, Invoice, Attachment } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy', { locale: pl })
}

function formatDateTime(date: string | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: pl })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600'
  if (confidence >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Wysoka'
  if (confidence >= 0.5) return 'Średnia'
  return 'Niska'
}

// ============================================================================
// Types
// ============================================================================

interface InvoiceDetailContentProps {
  invoiceId: string
}

// ============================================================================
// Main Component
// ============================================================================

export function InvoiceDetailContent({ invoiceId }: InvoiceDetailContentProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Classification editing state
  const [isEditingClassification, setIsEditingClassification] = useState(false)
  const [editMpk, setEditMpk] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  
  // Full invoice editing state (for manual invoices)
  const [isEditingInvoice, setIsEditingInvoice] = useState(false)
  const [editSupplierName, setEditSupplierName] = useState('')
  const [editSupplierNip, setEditSupplierNip] = useState('')
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('')
  const [editInvoiceDate, setEditInvoiceDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNetAmount, setEditNetAmount] = useState('')
  const [editVatAmount, setEditVatAmount] = useState('')
  const [editGrossAmount, setEditGrossAmount] = useState('')
  
  // State for collapsible attachments
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false)
  
  // State for attachment preview
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Fetch invoice details
  const {
    data: invoice,
    isLoading: invoiceLoading,
    error: invoiceError,
  } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.invoices.get(invoiceId),
  })

  // Fetch attachments
  const {
    data: attachmentsData,
    isLoading: attachmentsLoading,
  } = useQuery({
    queryKey: ['attachments', invoiceId],
    queryFn: () => api.invoices.listAttachments(invoiceId),
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file)
      return api.invoices.uploadAttachment(invoiceId, {
        fileName: file.name,
        mimeType: file.type,
        content: base64,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', invoiceId] })
      setUploadProgress(0)
      toast({
        title: 'Sukces',
        description: 'Załącznik został dodany',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się dodać załącznika',
        variant: 'destructive',
      })
    },
  })

  // Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => api.invoices.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', invoiceId] })
    },
  })
  
  // Preview attachment handler
  const handlePreview = useCallback(async (attachment: Attachment) => {
    // Check if it's a previewable type
    const previewableTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!previewableTypes.includes(attachment.mimeType)) {
      toast({
        title: 'Informacja',
        description: 'Ten typ pliku nie obsługuje podglądu. Użyj pobierania.',
      })
      return
    }
    
    setPreviewAttachment(attachment)
    setPreviewLoading(true)
    setPreviewContent(null)
    
    try {
      const result = await api.invoices.downloadAttachment(attachment.id)
      // Create data URL from base64
      const dataUrl = `data:${attachment.mimeType};base64,${result.content}`
      setPreviewContent(dataUrl)
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać podglądu załącznika',
        variant: 'destructive',
      })
      setPreviewAttachment(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [toast])

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: () => api.invoices.markAsPaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    },
  })

  // Apply AI suggestion mutation
  const applyAiMutation = useMutation({
    mutationFn: () => {
      if (!invoice?.aiMpkSuggestion && !invoice?.aiCategorySuggestion) {
        throw new Error('Brak sugestii AI do zastosowania')
      }
      return api.invoices.update(invoiceId, {
        mpk: invoice.aiMpkSuggestion,
        category: invoice.aiCategorySuggestion,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      toast({
        title: 'Sukces',
        description: 'Sugestie AI zostały zastosowane',
      })
    },
  })

  // AI Categorization mutation
  const categorizeAiMutation = useMutation({
    mutationFn: () => api.invoices.categorizeWithAI(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      toast({
        title: 'Sukces',
        description: 'Faktura została skategoryzowana przez AI',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd kategoryzacji AI',
        description: error.message || 'Nie udało się skategoryzować faktury',
        variant: 'destructive',
      })
    },
  })

  // Update classification mutation
  const updateClassificationMutation = useMutation({
    mutationFn: (data: { mpk?: string; category?: string; description?: string }) => 
      api.invoices.update(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      setIsEditingClassification(false)
      toast({
        title: 'Sukces',
        description: 'Klasyfikacja została zaktualizowana',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zaktualizować klasyfikacji',
        variant: 'destructive',
      })
    },
  })

  // Start editing classification
  function startEditingClassification() {
    setEditMpk(invoice?.mpk || '')
    setEditCategory(invoice?.category || '')
    setEditDescription(invoice?.description || '')
    setIsEditingClassification(true)
  }

  // Save classification
  function saveClassification() {
    updateClassificationMutation.mutate({
      mpk: editMpk || undefined,
      category: editCategory || undefined,
      description: editDescription || undefined,
    })
  }

  // Cancel editing
  function cancelEditingClassification() {
    setIsEditingClassification(false)
  }

  // Apply AI suggestions and enter edit mode
  function applyAiToEdit() {
    setEditMpk(invoice?.aiMpkSuggestion || editMpk)
    setEditCategory(invoice?.aiCategorySuggestion || editCategory)
    // Also apply AI description if available
    if (invoice?.aiDescription) {
      setEditDescription(invoice.aiDescription)
    } else if (!isEditingClassification) {
      setEditDescription(invoice?.description || '')
    }
    if (!isEditingClassification) {
      setIsEditingClassification(true)
    }
  }

  // Update invoice mutation (for manual invoices)
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: {
      supplierName?: string
      supplierNip?: string
      invoiceNumber?: string
      invoiceDate?: string
      dueDate?: string
      netAmount?: number
      vatAmount?: number
      grossAmount?: number
    }) => api.invoices.update(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      setIsEditingInvoice(false)
      toast({
        title: 'Sukces',
        description: 'Faktura została zaktualizowana',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zaktualizować faktury',
        variant: 'destructive',
      })
    },
  })

  // Start editing invoice (manual only)
  function startEditingInvoice() {
    if (invoice?.source !== 'Manual') return
    setEditSupplierName(invoice?.supplierName || '')
    setEditSupplierNip(invoice?.supplierNip || '')
    setEditInvoiceNumber(invoice?.invoiceNumber || '')
    setEditInvoiceDate(invoice?.invoiceDate?.split('T')[0] || '')
    setEditDueDate(invoice?.dueDate?.split('T')[0] || '')
    setEditNetAmount(invoice?.netAmount?.toString() || '')
    setEditVatAmount(invoice?.vatAmount?.toString() || '')
    setEditGrossAmount(invoice?.grossAmount?.toString() || '')
    setIsEditingInvoice(true)
  }

  // Save invoice changes
  function saveInvoice() {
    updateInvoiceMutation.mutate({
      supplierName: editSupplierName || undefined,
      supplierNip: editSupplierNip || undefined,
      invoiceNumber: editInvoiceNumber || undefined,
      invoiceDate: editInvoiceDate || undefined,
      dueDate: editDueDate || undefined,
      netAmount: editNetAmount ? parseFloat(editNetAmount) : undefined,
      vatAmount: editVatAmount ? parseFloat(editVatAmount) : undefined,
      grossAmount: editGrossAmount ? parseFloat(editGrossAmount) : undefined,
    })
  }

  // Cancel editing invoice
  function cancelEditingInvoice() {
    setIsEditingInvoice(false)
  }

  // Helper: File to Base64
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      // Simulate progress
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setUploadProgress(Math.min(progress, 90))
        if (progress >= 90) clearInterval(interval)
      }, 100)
      reader.readAsDataURL(file)
    })
  }

  // Validate file
  const validateFile = useCallback((file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Nieobsługiwany typ pliku',
        description: `Plik "${file.name}" ma nieobsługiwany format`,
        variant: 'destructive',
      })
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Plik zbyt duży',
        description: `Plik "${file.name}" przekracza 10 MB`,
        variant: 'destructive',
      })
      return false
    }
    return true
  }, [toast])

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      if (validateFile(file)) {
        uploadMutation.mutate(file)
      }
    })
  }, [validateFile, uploadMutation])

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (validateFile(file)) {
        uploadMutation.mutate(file)
      }
    })
    // Reset input
    e.target.value = ''
  }, [validateFile, uploadMutation])

  // Handle download
  async function handleDownload(attachment: Attachment) {
    try {
      const { content } = await api.invoices.downloadAttachment(attachment.id)
      const blob = base64ToBlob(content, attachment.mimeType)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  // Helper: Base64 to Blob
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // Loading state
  if (invoiceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    )
  }

  // Error state
  if (invoiceError || !invoice) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nie udało się pobrać szczegółów faktury. Spróbuj odświeżyć stronę.
        </AlertDescription>
      </Alert>
    )
  }

  const isOverdue = invoice.dueDate && 
    new Date(invoice.dueDate) < new Date() && 
    invoice.paymentStatus === 'pending'

  const hasAttachments = (attachmentsData?.attachments?.length || 0) > 0

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Powrót do listy</span>
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground text-sm truncate">{invoice.supplierName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {invoice.paymentStatus === 'pending' && (
            <Button
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
              size="sm"
            >
              <Check className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Oznacz opłacone</span>
            </Button>
          )}
          <Badge
            variant={invoice.paymentStatus === 'paid' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1"
          >
            {invoice.paymentStatus === 'paid' ? 'Opłacona' : isOverdue ? 'Zaległe' : 'Oczekuje'}
          </Badge>
        </div>
      </div>

      {/* Main Layout: Left content + Right AI Panel */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Side - Invoice Data */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Top Row: Invoice Info + Supplier + Amounts in 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Invoice Info - Compact */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Dane faktury
                </div>
                {invoice.source === 'Manual' && !isEditingInvoice && (
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={startEditingInvoice}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {isEditingInvoice ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Numer faktury"
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 flex-1" onClick={cancelEditingInvoice}>
                      <X className="h-3 w-3 mr-1" />Anuluj
                    </Button>
                    <Button variant="default" size="sm" className="h-7 flex-1" onClick={saveInvoice} disabled={updateInvoiceMutation.isPending}>
                      <Save className="h-3 w-3 mr-1" />Zapisz
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nr:</span>
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data:</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(invoice.invoiceDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Termin:</span>
                    <span className={cn('flex items-center gap-1', isOverdue && 'text-red-600')}>
                      <Clock className="h-3 w-3" />
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Źródło:</span>
                    <Badge variant="outline" className="h-5 text-xs">
                      {invoice.source === 'KSeF' ? 'KSeF' : 'Ręczna'}
                    </Badge>
                  </div>
                </div>
              )}
            </Card>

            {/* Supplier - Compact */}
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Building2 className="h-4 w-4" />
                Dostawca
              </div>
              {isEditingInvoice ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Nazwa dostawcy"
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="NIP"
                    value={editSupplierNip}
                    onChange={(e) => setEditSupplierNip(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="font-medium truncate" title={invoice.supplierName}>
                    {invoice.supplierName}
                  </p>
                  <p className="text-muted-foreground font-mono text-xs">
                    NIP: {invoice.supplierNip}
                  </p>
                </div>
              )}
            </Card>

            {/* Amounts - Compact */}
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <CreditCard className="h-4 w-4" />
                Kwoty
              </div>
              {isEditingInvoice ? (
                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Netto"
                    value={editNetAmount}
                    onChange={(e) => setEditNetAmount(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="VAT"
                    value={editVatAmount}
                    onChange={(e) => setEditVatAmount(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Brutto"
                    value={editGrossAmount}
                    onChange={(e) => setEditGrossAmount(e.target.value)}
                    className="h-8 text-sm font-medium"
                  />
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Netto</span>
                    <span>{formatCurrency(invoice.netAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <span>{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>Brutto</span>
                    <span>{formatCurrency(invoice.grossAmount, invoice.currency)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Classification Section */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                Klasyfikacja
              </div>
              {!isEditingClassification ? (
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={startEditingClassification}>
                  <Pencil className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={cancelEditingClassification}>
                    <X className="h-3 w-3" />
                  </Button>
                  <Button variant="default" size="sm" className="h-6 px-2" onClick={saveClassification} disabled={updateClassificationMutation.isPending}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {isEditingClassification ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">MPK</Label>
                    <Select value={editMpk} onValueChange={setEditMpk}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Wybierz MPK..." />
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
                  <div>
                    <Label className="text-xs">Kategoria</Label>
                    <Input
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      placeholder="Wpisz kategorię..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Opis</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Wpisz opis faktury..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">MPK</span>
                  <p className="font-medium">{invoice.mpk || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Kategoria</span>
                  <p className="font-medium">{invoice.category || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Opis</span>
                  <p className="font-medium truncate" title={invoice.description || '-'}>
                    {invoice.description || '-'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Invoice Items - if any */}
          {invoice.items && invoice.items.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <FileText className="h-4 w-4" />
                Pozycje faktury ({invoice.items.length})
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Opis</TableHead>
                    <TableHead className="text-xs text-right">Ilość</TableHead>
                    <TableHead className="text-xs text-right">Netto</TableHead>
                    <TableHead className="text-xs text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell className="text-sm text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.netAmount)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(item.grossAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Attachments - Collapsible */}
          <Card className="p-4">
            <button
              className="w-full flex items-center justify-between text-sm font-medium"
              onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
            >
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Załączniki
                {hasAttachments && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {attachmentsData?.attachments?.length}
                  </Badge>
                )}
              </div>
              {attachmentsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {attachmentsExpanded && (
              <div className="mt-4 space-y-3">
                {/* Drop zone */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "hover:border-primary",
                    uploadMutation.isPending && "opacity-50 pointer-events-none"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('detail-file-input')?.click()}
                >
                  <FileUp className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Przeciągnij lub <span className="text-primary">wybierz pliki</span>
                  </p>
                  <input
                    id="detail-file-input"
                    type="file"
                    multiple
                    accept=".pdf,image/jpeg,image/png,image/gif,image/webp,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Upload progress */}
                {uploadMutation.isPending && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-1" />
                    <p className="text-xs text-muted-foreground text-center">Przesyłanie...</p>
                  </div>
                )}

                {/* Attachments list */}
                {attachmentsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : hasAttachments ? (
                  <div className="space-y-1">
                    {attachmentsData?.attachments?.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{attachment.fileName}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => handlePreview(attachment)}
                          title="Podgląd"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(attachment)} title="Pobierz">
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(attachment.id)} title="Usuń">
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Brak załączników</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side - AI Panel (sticky) */}
        <div className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-4">
            <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Asystent AI
                  </CardTitle>
                  {invoice.aiConfidence !== undefined && (
                    <Badge variant="outline" className={cn("text-xs", getConfidenceColor(invoice.aiConfidence))}>
                      {Math.round(invoice.aiConfidence * 100)}%
                    </Badge>
                  )}
                </div>
                {invoice.aiProcessedAt && (
                  <CardDescription className="text-xs">
                    Analiza: {formatDateTime(invoice.aiProcessedAt)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion) ? (
                  <>
                    {/* AI Suggestions */}
                    <div className="space-y-3">
                      {invoice.aiMpkSuggestion && (
                        <div className="p-3 bg-white dark:bg-background rounded-lg border">
                          <span className="text-xs text-muted-foreground">Sugerowane MPK</span>
                          <p className="font-medium text-purple-700 dark:text-purple-400">
                            {invoice.aiMpkSuggestion}
                          </p>
                        </div>
                      )}
                      {invoice.aiCategorySuggestion && (
                        <div className="p-3 bg-white dark:bg-background rounded-lg border">
                          <span className="text-xs text-muted-foreground">Sugerowana kategoria</span>
                          <p className="font-medium text-purple-700 dark:text-purple-400">
                            {invoice.aiCategorySuggestion}
                          </p>
                        </div>
                      )}
                      {invoice.aiDescription && (
                        <div className="p-3 bg-white dark:bg-background rounded-lg border">
                          <span className="text-xs text-muted-foreground">Sugerowany opis</span>
                          <p className="text-sm mt-1">{invoice.aiDescription}</p>
                        </div>
                      )}
                      {invoice.aiRationale && (
                        <div className="p-3 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg">
                          <span className="text-xs text-muted-foreground">Uzasadnienie AI</span>
                          <p className="text-xs text-purple-800 dark:text-purple-300 mt-1">
                            {invoice.aiRationale}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        variant="default"
                        size="sm"
                        onClick={applyAiToEdit}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {isEditingClassification ? 'Przepisz do formularza' : 'Zastosuj sugestie'}
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        size="sm"
                        onClick={() => categorizeAiMutation.mutate()}
                        disabled={categorizeAiMutation.isPending}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {categorizeAiMutation.isPending ? 'Analizuję...' : 'Ponów analizę'}
                      </Button>
                    </div>
                  </>
                ) : (
                  // No AI suggestions yet
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      AI może automatycznie zasugerować MPK, kategorię i opis dla tej faktury
                    </p>
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => categorizeAiMutation.mutate()}
                      disabled={categorizeAiMutation.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {categorizeAiMutation.isPending ? 'Analizuję...' : 'Uruchom analizę AI'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Attachment Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="!max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewAttachment?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[500px]">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ładowanie podglądu...</p>
                </div>
              </div>
            ) : previewContent && previewAttachment ? (
              previewAttachment.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewContent}
                  title="Podgląd PDF"
                  className="w-full h-full min-h-[500px]"
                />
              ) : previewAttachment.mimeType.startsWith('image/') ? (
                <img
                  src={previewContent}
                  alt={previewAttachment.fileName}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Ten typ pliku nie obsługuje podglądu.
                </p>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
