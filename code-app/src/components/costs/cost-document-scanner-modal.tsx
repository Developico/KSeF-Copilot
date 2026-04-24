/**
 * Cost Document Scanner Modal — upload a PDF/image, extract cost document data
 * with AI, review/edit extracted fields, then create a cost document.
 *
 * Flow: Upload → Processing → Preview/Edit → Create
 */

import { useState, useCallback, useRef } from 'react'
import { useIntl } from 'react-intl'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui'
import { Button, Input, Label, Separator, ScrollArea, Badge } from '@/components/ui'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import { useExtractCostDocument, useCreateCostDocument } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { toast } from 'sonner'
import {
  Upload, FileText, Loader2, CheckCircle, AlertTriangle,
  Building2, DollarSign,
} from 'lucide-react'
import type {
  CostDocumentExtractionResult,
  CostDocumentType,
  CostDocumentCreate,
} from '@/lib/types'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

type Step = 'upload' | 'processing' | 'preview' | 'error'

const DOCUMENT_TYPE_OPTIONS: CostDocumentType[] = [
  'Receipt',
  'Acknowledgment',
  'ProForma',
  'DebitNote',
  'Bill',
  'ContractInvoice',
  'Other',
]

function normalizeDateInput(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const match = trimmed.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/)
  if (match) {
    const [, dd, mm, yyyy] = match
    return `${yyyy}-${mm}-${dd}`
  }

  return trimmed
}

function normalizeNip(value?: string): string | undefined {
  if (!value) return undefined
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? digits : undefined
}

interface CostDocumentScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSkipToManual?: () => void
  onCreated?: () => void
}

export function CostDocumentScannerModal({
  open,
  onOpenChange,
  onSkipToManual,
  onCreated,
}: CostDocumentScannerModalProps) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<CostDocumentExtractionResult | null>(null)
  const [formData, setFormData] = useState<Partial<CostDocumentCreate>>({
    documentType: 'Receipt',
    currency: 'PLN',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const createMutation = useCreateCostDocument()

  const extractMutation = useExtractCostDocument({
    onSuccess: (res) => {
      setResult(res)
      if (res.success && res.data) {
        setFormData({
          documentType: res.data.documentType || 'Receipt',
          documentNumber: res.data.documentNumber || '',
          documentDate: res.data.issueDate || '',
          dueDate: res.data.dueDate || '',
          issuerName: res.data.issuerName || '',
          issuerNip: res.data.issuerNip || '',
          netAmount: res.data.netAmount,
          vatAmount: res.data.vatAmount,
          grossAmount: res.data.grossAmount,
          currency: res.data.currency || 'PLN',
          description: res.data.suggestedDescription || res.data.serviceDescription || '',
          category: res.data.suggestedCategory || '',
        })
        setStep('preview')
      } else {
        setErrorMessage(res.error ?? intl.formatMessage({ id: 'costs.scanner.extractionFailed' }))
        setStep('error')
      }
    },
    onError: (err) => {
      setErrorMessage(err.message)
      setStep('error')
    },
  })

  const resetState = useCallback(() => {
    setStep('upload')
    setFile(null)
    setResult(null)
    setFormData({ documentType: 'Receipt', currency: 'PLN' })
    setErrorMessage('')
    setIsDragging(false)
  }, [])

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return intl.formatMessage({ id: 'costs.scanner.invalidFileType' })
    }
    if (f.size > MAX_FILE_SIZE) {
      return intl.formatMessage({ id: 'costs.scanner.fileTooLarge' })
    }
    return null
  }

  const processFile = async (f: File) => {
    const error = validateFile(f)
    if (error) {
      setErrorMessage(error)
      setStep('error')
      return
    }
    setFile(f)
    setStep('processing')

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      extractMutation.mutate({
        fileName: f.name,
        mimeType: f.type,
        content: base64,
      })
    }
    reader.onerror = () => {
      setErrorMessage('Failed to read file')
      setStep('error')
    }
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) void processFile(droppedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) void processFile(selected)
  }

  const updateForm = (field: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleCreate = async () => {
    if (!formData.documentNumber || !formData.documentDate || !formData.issuerName || !formData.grossAmount) {
      toast.error(intl.formatMessage({ id: 'costs.fillRequired' }))
      return
    }

    const payload: CostDocumentCreate = {
      documentType: formData.documentType as CostDocumentType,
      documentNumber: formData.documentNumber!,
      documentDate: normalizeDateInput(formData.documentDate) || formData.documentDate!,
      issuerName: formData.issuerName!,
      grossAmount: Number(formData.grossAmount),
      currency: formData.currency || 'PLN',
      ...(selectedCompany?.id ? { settingId: selectedCompany.id } : {}),
      ...(normalizeDateInput(formData.dueDate) ? { dueDate: normalizeDateInput(formData.dueDate) } : {}),
      ...(normalizeNip(formData.issuerNip) ? { issuerNip: normalizeNip(formData.issuerNip) } : {}),
      ...(typeof formData.netAmount === 'number' ? { netAmount: formData.netAmount } : {}),
      ...(typeof formData.vatAmount === 'number' ? { vatAmount: formData.vatAmount } : {}),
      ...(formData.description?.trim() ? { description: formData.description.trim() } : {}),
      ...(formData.category?.trim() ? { category: formData.category.trim() } : {}),
    }

    try {
      await createMutation.mutateAsync(payload)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : intl.formatMessage({ id: 'common.error' })
      toast.error(message)
      return
    }

    toast.success(intl.formatMessage({ id: 'costs.created' }))
    handleClose()
    try {
      onCreated?.()
    } catch (error) {
      console.error('[Cost OCR] onCreated callback failed after successful create:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {intl.formatMessage({ id: 'costs.scanner.title' })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'costs.scanner.description' })}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {intl.formatMessage({ id: 'costs.scanner.dropOrClick' })}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                {intl.formatMessage({ id: 'costs.scanner.supportedFormats' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: 'costs.scanner.maxSize' })}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                aria-label={intl.formatMessage({ id: 'costs.scanner.dropOrClick' })}
                onChange={handleFileSelect}
              />
            </div>

            {onSkipToManual && (
              <div className="text-center pt-2 border-t">
                <Button
                  variant="link"
                  onClick={(e) => { e.stopPropagation(); onSkipToManual() }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {intl.formatMessage({ id: 'costs.scanner.skipImport' })}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">
                {intl.formatMessage({ id: 'costs.scanner.processing' })}
              </p>
              {file && (
                <p className="text-sm text-muted-foreground mt-1">{file.name}</p>
              )}
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">
                {intl.formatMessage({ id: 'costs.scanner.extractionFailed' })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={resetState}>
              {intl.formatMessage({ id: 'costs.scanner.tryAgain' })}
            </Button>
          </div>
        )}

        {/* Step: Preview & Edit */}
        {step === 'preview' && formData && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {/* Confidence badge */}
              {result && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {intl.formatMessage({ id: 'costs.scanner.confidence' })}:
                  </span>
                  <Badge
                    variant={result.confidence >= 0.8 ? 'default' : 'secondary'}
                    className={result.confidence >= 0.8
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : ''}
                  >
                    {Math.round(result.confidence * 100)}%
                  </Badge>
                  {result.processingTimeMs && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(result.processingTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              )}

              <Separator />

              {/* Document type */}
              <div>
                <Label className="text-xs">{intl.formatMessage({ id: 'costs.colType' })}</Label>
                <Select
                  value={formData.documentType || 'Receipt'}
                  onValueChange={v => updateForm('documentType', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map(type => (
                      <SelectItem key={type} value={type}>
                        {intl.formatMessage({ id: `costs.docType.${type}` })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document number & dates */}
              <div>
                <Label className="text-xs">{intl.formatMessage({ id: 'costs.colNumber' })} *</Label>
                <Input
                  value={formData.documentNumber || ''}
                  onChange={e => updateForm('documentNumber', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.colDate' })} *</Label>
                  <Input
                    type="date"
                    value={formData.documentDate || ''}
                    onChange={e => updateForm('documentDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.dueDate' })}</Label>
                  <Input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={e => updateForm('dueDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Issuer section */}
              <div className="flex items-center gap-1 mt-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {intl.formatMessage({ id: 'costs.scanner.issuerSection' })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.colIssuer' })} *</Label>
                  <Input
                    value={formData.issuerName || ''}
                    onChange={e => updateForm('issuerName', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.issuerNip' })}</Label>
                  <Input
                    value={formData.issuerNip || ''}
                    onChange={e => updateForm('issuerNip', e.target.value)}
                  />
                </div>
              </div>

              {/* Amounts section */}
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {intl.formatMessage({ id: 'costs.scanner.amountsSection' })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.netAmount' })}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.netAmount ?? ''}
                    onChange={e => updateForm('netAmount', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.vatAmount' })}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.vatAmount ?? ''}
                    onChange={e => updateForm('vatAmount', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{intl.formatMessage({ id: 'costs.colAmount' })} *</Label>
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
                <Label className="text-xs">{intl.formatMessage({ id: 'costs.description' })}</Label>
                <Input
                  value={formData.description || ''}
                  onChange={e => updateForm('description', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">{intl.formatMessage({ id: 'costs.category' })}</Label>
                <Input
                  value={formData.category || ''}
                  onChange={e => updateForm('category', e.target.value)}
                />
              </div>

              <Separator />

              <div className="flex justify-end gap-2 pb-2">
                <Button variant="outline" onClick={resetState}>
                  {intl.formatMessage({ id: 'costs.scanner.tryAgain' })}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  {intl.formatMessage({ id: 'common.cancel' })}
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {intl.formatMessage({ id: 'costs.scanner.createCostDocument' })}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
