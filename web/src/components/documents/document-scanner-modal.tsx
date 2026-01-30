'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { 
  FileUp, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { api, type ExtractionResult, type ExtractedInvoiceData } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { ExtractionPreview } from './extraction-preview'

interface DocumentScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when user chooses to skip import and go to manual entry */
  onSkipToManual?: () => void
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

/**
 * Modal for scanning/uploading documents and extracting invoice data.
 * Shows a drop zone, processes the document, and displays extracted data.
 */
export function DocumentScannerModal({ open, onOpenChange, onSkipToManual }: DocumentScannerModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<ModalStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Extraction mutation
  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      // Read file as base64
      const base64 = await fileToBase64(file)
      // Store base64 for later attachment upload
      setFileBase64(base64)
      
      return api.documents.extract({
        fileName: file.name,
        mimeType: file.type,
        content: base64,
      })
    },
    onSuccess: (result) => {
      setExtractionResult(result)
      if (result.success) {
        setStep('preview')
      } else {
        setErrorMessage(result.error || 'Nie udało się wyodrębnić danych')
        setStep('error')
      }
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Błąd przetwarzania dokumentu')
      setStep('error')
    },
  })

  // Reset state when modal closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset state after animation
      setTimeout(() => {
        setStep('upload')
        setUploadedFile(null)
        setFileDataUrl(null)
        setFileBase64(null)
        setExtractionResult(null)
        setErrorMessage(null)
        extractMutation.reset()
      }, 200)
    }
    onOpenChange(newOpen)
  }, [onOpenChange, extractMutation])

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return `Nieobsługiwany typ pliku: ${file.type}. Obsługiwane: PDF, JPEG, PNG, WebP, GIF`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Plik zbyt duży (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksymalnie: 10 MB`
    }
    return null
  }, [])

  // Process file
  const processFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast({ title: 'Błąd', description: error, variant: 'destructive' })
      return
    }

    setUploadedFile(file)
    setStep('processing')

    // Create data URL for preview (both images and PDFs)
    const reader = new FileReader()
    reader.onload = (e) => setFileDataUrl(e.target?.result as string)
    reader.readAsDataURL(file)

    // Start extraction
    extractMutation.mutate(file)
  }, [validateFile, toast, extractMutation])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFile(files[0])
    }
    // Reset input
    e.target.value = ''
  }, [processFile])

  // Handle retry
  const handleRetry = useCallback(() => {
    setStep('upload')
    setErrorMessage(null)
    setExtractionResult(null)
  }, [])

  // Handle success (invoice created)
  const handleInvoiceCreated = useCallback(() => {
    toast({
      title: 'Sukces',
      description: 'Faktura została utworzona na podstawie dokumentu',
    })
    handleOpenChange(false)
  }, [toast, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-7xl w-[98vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            {step === 'upload' && 'Skanuj fakturę'}
            {step === 'processing' && 'Analizuję dokument...'}
            {step === 'preview' && 'Podgląd wyodrębnionych danych'}
            {step === 'error' && 'Błąd ekstrakcji'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Przeciągnij plik PDF lub zdjęcie faktury'}
            {step === 'processing' && 'Proszę czekać, AI analizuje dokument'}
            {step === 'preview' && 'Sprawdź i popraw dane przed utworzeniem faktury'}
            {step === 'error' && 'Nie udało się przetworzyć dokumentu'}
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
                <h3 className="text-lg font-medium mb-2">
                  Przeciągnij plik tutaj
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  lub kliknij aby wybrać
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" /> PDF
                  </span>
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> JPEG, PNG, WebP
                  </span>
                  <span>max 10 MB</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label="Wybierz plik do importu"
                />
              </div>
              
              {/* Skip import option */}
              {onSkipToManual && (
                <div className="text-center pt-2 border-t">
                  <Button
                    variant="link"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSkipToManual()
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Pomiń import — wprowadź fakturę ręcznie
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
                Analizuję {uploadedFile?.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {uploadedFile?.type === 'application/pdf' 
                  ? 'Wyodrębniam tekst i analizuję strukturę...'
                  : 'Rozpoznaję tekst i dane z obrazu...'}
              </p>
              <Progress value={undefined} className="w-64 mx-auto h-2" />
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && extractionResult?.data && uploadedFile && (
            <ExtractionPreview
              data={extractionResult.data}
              confidence={extractionResult.confidence}
              sourceType={extractionResult.sourceType}
              fileDataUrl={fileDataUrl}
              fileName={uploadedFile.name}
              fileMimeType={uploadedFile.type}
              fileBase64={fileBase64}
              onCreateInvoice={handleInvoiceCreated}
              onCancel={() => handleOpenChange(false)}
              onRetry={handleRetry}
            />
          )}

          {/* Error step */}
          {step === 'error' && (
            <div className="py-12 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nie udało się przetworzyć dokumentu
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {errorMessage}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleRetry}>
                  Spróbuj ponownie
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Convert file to base64 string (without data URL prefix)
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
