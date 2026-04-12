'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  FileUp,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  api,
  type ExtractedCostDocumentData,
  type CostDocumentExtractionResult,
  type CostDocumentType,
  type CostDocumentCreate,
} from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useCompanyContext } from '@/contexts/company-context'
import { useCreateCostDocument } from '@/hooks/use-api'

// ============================================================================
// Types
// ============================================================================

interface CostDocumentScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSkipToManual?: () => void
  onCreated?: () => void
}

type ModalStep = 'upload' | 'processing' | 'preview' | 'error'

const SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const DOCUMENT_TYPE_OPTIONS: { value: CostDocumentType; label: string }[] = [
  { value: 'Receipt', label: 'Receipt' },
  { value: 'Acknowledgment', label: 'Acknowledgment' },
  { value: 'ProForma', label: 'Pro Forma' },
  { value: 'DebitNote', label: 'Debit Note' },
  { value: 'Bill', label: 'Bill' },
  { value: 'ContractInvoice', label: 'Contract Invoice' },
  { value: 'Other', label: 'Other' },
]

// ============================================================================
// Component
// ============================================================================

export function CostDocumentScannerModal({
  open,
  onOpenChange,
  onSkipToManual,
  onCreated,
}: CostDocumentScannerModalProps) {
  const { toast } = useToast()
  const t = useTranslations('costs')
  const tCommon = useTranslations('common')
  const { selectedCompany } = useCompanyContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ModalStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractionResult, setExtractionResult] = useState<CostDocumentExtractionResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Editable form state (initialized from extraction)
  const [formData, setFormData] = useState<Partial<CostDocumentCreate>>({
    documentType: 'Receipt',
    currency: 'PLN',
  })

  const createMutation = useCreateCostDocument()

  // Extraction mutation
  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file)
      return api.documents.extractCost({
        fileName: file.name,
        mimeType: file.type,
        content: base64,
      })
    },
    onSuccess: (result) => {
      setExtractionResult(result)
      if (result.success && result.data) {
        // Pre-fill form from extracted data
        setFormData({
          documentType: result.data.documentType || 'Receipt',
          documentNumber: result.data.documentNumber || '',
          documentDate: result.data.issueDate || '',
          dueDate: result.data.dueDate || '',
          issuerName: result.data.issuerName || '',
          issuerNip: result.data.issuerNip || '',
          netAmount: result.data.netAmount,
          vatAmount: result.data.vatAmount,
          grossAmount: result.data.grossAmount,
          currency: result.data.currency || 'PLN',
          description: result.data.suggestedDescription || result.data.serviceDescription || '',
          category: result.data.suggestedCategory || '',
          costCenter: result.data.suggestedMpk || '',
        })
        setStep('preview')
      } else {
        setErrorMessage(result.error || t('scanner.extractionFailed'))
        setStep('error')
      }
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || t('scanner.processingError'))
      setStep('error')
    },
  })

  // Reset state
  const resetState = useCallback(() => {
    setStep('upload')
    setUploadedFile(null)
    setExtractionResult(null)
    setErrorMessage(null)
    setFormData({ documentType: 'Receipt', currency: 'PLN' })
    extractMutation.reset()
  }, [extractMutation])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(resetState, 200)
    }
    onOpenChange(newOpen)
  }, [onOpenChange, resetState])

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return t('scanner.unsupportedType')
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('scanner.fileTooLarge')
    }
    return null
  }, [t])

  // Process file
  const processFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast({ title: tCommon('error'), description: error, variant: 'destructive' })
      return
    }
    setUploadedFile(file)
    setStep('processing')
    extractMutation.mutate(file)
  }, [validateFile, toast, tCommon, extractMutation])

  // Drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) processFile(files[0])
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) processFile(files[0])
    e.target.value = ''
  }, [processFile])

  const handleRetry = useCallback(() => {
    setStep('upload')
    setErrorMessage(null)
    setExtractionResult(null)
  }, [])

  // Create cost document from form
  const handleCreate = async () => {
    if (!formData.documentNumber || !formData.documentDate || !formData.issuerName || !formData.grossAmount) {
      toast({ description: t('fillRequired'), variant: 'destructive' })
      return
    }
    try {
      await createMutation.mutateAsync({
        ...formData,
        settingId: selectedCompany?.id || '',
        documentType: formData.documentType as CostDocumentType,
        documentNumber: formData.documentNumber!,
        documentDate: formData.documentDate!,
        issuerName: formData.issuerName!,
        grossAmount: Number(formData.grossAmount),
      })
      toast({ description: t('created') })
      handleOpenChange(false)
      onCreated?.()
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const updateForm = (field: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            {step === 'upload' && t('scanner.title')}
            {step === 'processing' && t('scanner.titleProcessing')}
            {step === 'preview' && t('scanner.titlePreview')}
            {step === 'error' && t('scanner.titleError')}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && t('scanner.descUpload')}
            {step === 'processing' && t('scanner.descProcessing')}
            {step === 'preview' && t('scanner.descPreview')}
            {step === 'error' && t('scanner.descError')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('scanner.dropHere')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('scanner.orClickToSelect')}</p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> PDF</span>
                  <span className="flex items-center gap-1"><ImageIcon className="h-4 w-4" /> JPEG, PNG, WebP</span>
                  <span>{t('scanner.maxSize')}</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label={t('scanner.selectFile')}
                />
              </div>

              {onSkipToManual && (
                <div className="text-center pt-2 border-t">
                  <Button
                    variant="link"
                    onClick={(e) => { e.stopPropagation(); onSkipToManual() }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t('scanner.skipImport')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Processing step */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t('scanner.analyzing', { name: uploadedFile?.name ?? '' })}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {uploadedFile?.type === 'application/pdf'
                  ? t('scanner.extractingPdf')
                  : t('scanner.extractingImage')}
              </p>
              <Progress value={undefined} className="w-64 mx-auto h-2" />
            </div>
          )}

          {/* Preview step — editable form with extracted data */}
          {step === 'preview' && extractionResult?.data && (
            <div className="space-y-4">
              {/* Confidence indicator */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">{t('scanner.confidenceLabel')}</span>
                <Badge variant={extractionResult.confidence > 0.8 ? 'default' : 'secondary'}>
                  {Math.round(extractionResult.confidence * 100)}%
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  {extractionResult.sourceType === 'pdf' ? 'PDF' : t('scanner.imageSource')}
                </span>
              </div>

              <Separator />

              <ScrollArea className="max-h-[50vh]">
                <div className="grid gap-3 pr-4">
                  {/* Document type */}
                  <div>
                    <Label>{t('colType')}</Label>
                    <Select
                      value={formData.documentType || 'Receipt'}
                      onValueChange={v => updateForm('documentType', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Document number & dates */}
                  <div>
                    <Label>{t('colNumber')} *</Label>
                    <Input
                      value={formData.documentNumber || ''}
                      onChange={e => updateForm('documentNumber', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t('colDate')} *</Label>
                      <Input
                        type="date"
                        value={formData.documentDate || ''}
                        onChange={e => updateForm('documentDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('dueDate')}</Label>
                      <Input
                        type="date"
                        value={formData.dueDate || ''}
                        onChange={e => updateForm('dueDate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Issuer */}
                  <div className="flex items-center gap-1 mt-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('scanner.issuerSection')}</span>
                  </div>
                  <div>
                    <Label>{t('colIssuer')} *</Label>
                    <Input
                      value={formData.issuerName || ''}
                      onChange={e => updateForm('issuerName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t('issuerNip')}</Label>
                    <Input
                      value={formData.issuerNip || ''}
                      onChange={e => updateForm('issuerNip', e.target.value)}
                    />
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center gap-1 mt-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('scanner.amountsSection')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>{t('netAmount')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.netAmount ?? ''}
                        onChange={e => updateForm('netAmount', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div>
                      <Label>{t('vatAmount')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.vatAmount ?? ''}
                        onChange={e => updateForm('vatAmount', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div>
                      <Label>{t('colAmount')} *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.grossAmount ?? ''}
                        onChange={e => updateForm('grossAmount', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  {/* Description & classification */}
                  <div>
                    <Label>{t('description')}</Label>
                    <Input
                      value={formData.description || ''}
                      onChange={e => updateForm('description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t('category')}</Label>
                      <Input
                        value={formData.category || ''}
                        onChange={e => updateForm('category', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('costCenter')}</Label>
                      <Input
                        value={formData.costCenter || ''}
                        onChange={e => updateForm('costCenter', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  {t('scanner.tryAgain')}
                </Button>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {t('scanner.createCostDocument')}
                </Button>
              </div>
            </div>
          )}

          {/* Error step */}
          {step === 'error' && (
            <div className="py-12 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('scanner.processingFailed')}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{errorMessage}</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleRetry}>{t('scanner.tryAgain')}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
