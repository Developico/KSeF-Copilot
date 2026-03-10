/**
 * Document Scanner Modal — upload a PDF/image, extract invoice data with AI,
 * review/edit extracted fields, then create an invoice.
 *
 * Flow: Upload → Processing → Preview/Edit → Create
 */

import { useState, useCallback, useRef } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { Button, Input, Label, Separator, ScrollArea, Badge } from '@/components/ui'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import { useExtractDocument, useCreateManualInvoice, useMpkCenters } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  Upload, FileText, Loader2, CheckCircle, AlertTriangle, X,
  Eye, PenLine, Trash2,
} from 'lucide-react'
import type { ExtractionResult, ExtractedInvoiceData, ManualInvoiceCreate } from '@/lib/types'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

type Step = 'upload' | 'processing' | 'preview' | 'error'

interface DocumentScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentScannerModal({ open, onOpenChange }: DocumentScannerModalProps) {
  const intl = useIntl()
  const navigate = useNavigate()
  const { selectedCompany } = useCompanyContext()
  const { data: mpkCentersData } = useMpkCenters(selectedCompany?.id ?? '')
  const mpkOptions = mpkCentersData?.mpkCenters?.map(mc => ({ id: mc.id, name: mc.name })) ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [editedData, setEditedData] = useState<ExtractedInvoiceData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const extractMutation = useExtractDocument({
    onSuccess: (res) => {
      if (res.success && res.data) {
        setResult(res)
        // Flatten address into a single string for the editable form
        const addr = res.data.supplierAddress
        const flatAddress = addr
          ? [addr.street, addr.buildingNumber, addr.postalCode, addr.city].filter(Boolean).join(', ')
          : ''
        const edited = { ...res.data } as ExtractedInvoiceData & { _supplierAddressFlat?: string }
        edited._supplierAddressFlat = flatAddress
        setEditedData(edited)
        setStep('preview')
      } else {
        setErrorMessage(res.error ?? intl.formatMessage({ id: 'scanner.extractionFailed' }))
        setStep('error')
      }
    },
    onError: (err) => {
      setErrorMessage(err.message)
      setStep('error')
    },
  })

  const createInvoiceMutation = useCreateManualInvoice({
    onSuccess: async (invoice) => {
      // Upload the source document
      if (fileBase64 && file) {
        try {
          await api.invoices.uploadDocument(invoice.id, {
            fileName: file.name,
            mimeType: file.type,
            content: fileBase64,
          })
        } catch (docError) {
          console.error('Failed to upload document:', docError)
          // Don't fail — invoice was already created
        }
      }
      toast.success(intl.formatMessage({ id: 'invoices.invoiceCreated' }))
      resetState()
      onOpenChange(false)
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const resetState = useCallback(() => {
    setStep('upload')
    setFile(null)
    setFileBase64(null)
    setResult(null)
    setEditedData(null)
    setErrorMessage('')
    setIsDragging(false)
    setTouched({})
  }, [])

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return intl.formatMessage({ id: 'scanner.invalidFileType' })
    }
    if (f.size > MAX_FILE_SIZE) {
      return intl.formatMessage({ id: 'scanner.fileTooLarge' })
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
      setFileBase64(base64)
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

  const updateField = (field: keyof ExtractedInvoiceData, value: string | number) => {
    if (!editedData) return
    setEditedData({ ...editedData, [field]: value })
  }

  const handleCreateInvoice = async () => {
    if (!editedData || !selectedCompany) return

    // Mark required fields as touched to show validation
    setTouched({ invoiceNumber: true, supplierNip: true, supplierName: true })

    // Validate required fields
    if (!editedData.invoiceNumber?.trim()) {
      toast.error(intl.formatMessage({ id: 'scanner.extractionFailed' }))
      return
    }
    if (!editedData.supplierNip?.trim()) {
      toast.error(intl.formatMessage({ id: 'scanner.extractionFailed' }))
      return
    }
    if (!editedData.supplierName?.trim()) {
      toast.error(intl.formatMessage({ id: 'scanner.extractionFailed' }))
      return
    }

    const addr = editedData.supplierAddress
    const supplierAddressStr = addr
      ? [addr.street, addr.buildingNumber, addr.postalCode, addr.city].filter(Boolean).join(', ')
      : (editedData as Record<string, unknown>)._supplierAddressFlat as string | undefined

    const data: ManualInvoiceCreate = {
      tenantNip: selectedCompany.nip,
      tenantName: selectedCompany.companyName ?? selectedCompany.nip,
      settingId: selectedCompany.id,
      invoiceNumber: editedData.invoiceNumber ?? '',
      invoiceDate: editedData.issueDate ?? new Date().toISOString().slice(0, 10),
      dueDate: editedData.dueDate,
      supplierName: editedData.supplierName ?? '',
      supplierNip: editedData.supplierNip ?? '',
      supplierAddress: supplierAddressStr || undefined,
      netAmount: editedData.netAmount ?? 0,
      vatAmount: editedData.vatAmount ?? 0,
      grossAmount: editedData.grossAmount ?? 0,
      currency: (editedData.currency as 'PLN' | 'EUR' | 'USD') ?? 'PLN',
      mpk: editedData.suggestedMpk,
      mpkCenterId: mpkOptions.find(o => o.name === editedData.suggestedMpk)?.id || undefined,
      category: editedData.suggestedCategory,
      description: editedData.suggestedDescription,
      // AI suggestion fields - original values from extraction
      aiMpkSuggestion: result?.data?.suggestedMpk || undefined,
      aiCategorySuggestion: result?.data?.suggestedCategory || undefined,
      aiDescription: result?.data?.suggestedDescription || undefined,
      aiConfidence: result?.confidence,
    }

    createInvoiceMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {intl.formatMessage({ id: 'scanner.title' })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'scanner.description' })}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
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
              {intl.formatMessage({ id: 'scanner.dropOrClick' })}
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              {intl.formatMessage({ id: 'scanner.supportedFormats' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'scanner.maxSize' })}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              aria-label={intl.formatMessage({ id: 'scanner.dropOrClick' })}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">
                {intl.formatMessage({ id: 'scanner.processing' })}
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
                {intl.formatMessage({ id: 'scanner.extractionFailed' })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={resetState}>
              {intl.formatMessage({ id: 'scanner.tryAgain' })}
            </Button>
          </div>
        )}

        {/* Step: Preview & Edit */}
        {step === 'preview' && editedData && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {/* Confidence badge */}
              {result && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {intl.formatMessage({ id: 'scanner.confidence' })}:
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

              {/* Supplier section */}
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {intl.formatMessage({ id: 'invoices.supplierDetails' })}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.supplier' })}</Label>
                    <Input
                      value={editedData.supplierName ?? ''}
                      onChange={(e) => updateField('supplierName', e.target.value)}
                      className={touched.supplierName && !editedData.supplierName?.trim() ? 'border-destructive' : ''}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.nipLabel' })}</Label>
                    <Input
                      value={editedData.supplierNip ?? ''}
                      onChange={(e) => updateField('supplierNip', e.target.value)}
                      className={touched.supplierNip && !editedData.supplierNip?.trim() ? 'border-destructive' : ''}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">{intl.formatMessage({ id: 'common.street' })}</Label>
                  <Input
                    value={(editedData as Record<string, unknown>)._supplierAddressFlat as string ?? ''}
                    onChange={(e) => {
                      setEditedData((prev) => {
                        if (!prev) return prev
                        return { ...prev, _supplierAddressFlat: e.target.value } as typeof prev
                      })
                    }}
                  />
                </div>
              </div>

              {/* Invoice details */}
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {intl.formatMessage({ id: 'invoices.invoiceDetails' })}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.invoiceNumber' })}</Label>
                    <Input
                      value={editedData.invoiceNumber ?? ''}
                      onChange={(e) => updateField('invoiceNumber', e.target.value)}
                      className={touched.invoiceNumber && !editedData.invoiceNumber?.trim() ? 'border-destructive' : ''}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.issueDate' })}</Label>
                    <Input
                      type="date"
                      value={editedData.issueDate ?? ''}
                      onChange={(e) => updateField('issueDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.dueDate' })}</Label>
                    <Input
                      type="date"
                      value={editedData.dueDate ?? ''}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {intl.formatMessage({ id: 'invoices.amounts' })}
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.netAmount' })}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.netAmount ?? 0}
                      onChange={(e) => updateField('netAmount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.vatAmount' })}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.vatAmount ?? 0}
                      onChange={(e) => updateField('vatAmount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.grossAmount' })}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.grossAmount ?? 0}
                      onChange={(e) => updateField('grossAmount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.currency' })}</Label>
                    <Input
                      value={editedData.currency ?? 'PLN'}
                      onChange={(e) => updateField('currency', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {intl.formatMessage({ id: 'scanner.classification' })}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.mpk' })}</Label>
                    <Select
                      value={editedData.suggestedMpk ?? ''}
                      onValueChange={(v) => updateField('suggestedMpk', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={intl.formatMessage({ id: 'invoices.mpk' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {mpkOptions.map((option) => (
                          <SelectItem key={option.id} value={option.name}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.category' })}</Label>
                    <Input
                      value={editedData.suggestedCategory ?? ''}
                      onChange={(e) => updateField('suggestedCategory', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{intl.formatMessage({ id: 'invoices.description' })}</Label>
                    <Input
                      value={editedData.suggestedDescription ?? ''}
                      onChange={(e) => updateField('suggestedDescription', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Extracted items */}
              {editedData.items && editedData.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    {intl.formatMessage({ id: 'scanner.extractedItems' })}
                    <Badge variant="secondary" className="ml-2">{editedData.items.length}</Badge>
                  </h4>
                  <div className="rounded-md border text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">{intl.formatMessage({ id: 'invoices.description' })}</th>
                          <th className="text-right p-2">{intl.formatMessage({ id: 'invoices.netAmount' })}</th>
                          <th className="text-right p-2">{intl.formatMessage({ id: 'invoices.vatAmount' })}</th>
                          <th className="text-right p-2">{intl.formatMessage({ id: 'invoices.grossAmount' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedData.items.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-2 max-w-40 truncate">{item.description}</td>
                            <td className="p-2 text-right">{item.netAmount?.toFixed(2) ?? '—'}</td>
                            <td className="p-2 text-right">{item.vatAmount?.toFixed(2) ?? '—'}</td>
                            <td className="p-2 text-right">{item.grossAmount?.toFixed(2) ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {step === 'preview' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={resetState}>
              <Trash2 className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'scanner.scanAnother' })}
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {intl.formatMessage({ id: 'scanner.createInvoice' })}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
