'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  FileImage,
  Download,
  Trash2,
  Maximize2,
  Loader2,
  FileText,
  Eye,
  RefreshCw,
  Upload,
  Plus,
  AlertCircle,
  X,
} from 'lucide-react'
import { api, DocumentDownload } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { generatePdfThumbnail, isPdfFile } from '@/lib/pdf-thumbnail'

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const MAX_SIZE_MB = 128
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

interface InvoiceDocumentSidebarProps {
  invoiceId: string
  hasDocument?: boolean
  documentFileName?: string
  isReadOnly?: boolean
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function inferIsImage(fileName?: string): boolean {
  if (!fileName) return false
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(ext || '')
}

function inferIsPdf(fileName?: string): boolean {
  return !!fileName?.toLowerCase().endsWith('.pdf')
}

/**
 * InvoiceDocumentSidebar - Compact document viewer for the right sidebar
 * 
 * Features:
 * - Thumbnail preview for PDFs (lightweight, no full download)
 * - Full image preview for image documents (images are small)
 * - Lazy-load full document only for fullscreen/download
 * - Upload via compact button with auto-thumbnail for PDFs
 */
export function InvoiceDocumentSidebar({
  invoiceId,
  hasDocument = false,
  documentFileName,
  isReadOnly = false,
  className,
}: InvoiceDocumentSidebarProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('invoices.invoiceDocument')
  const inputRef = useRef<HTMLInputElement>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Local override: null = use prop, true = just uploaded, false = just deleted
  const [localHasDocument, setLocalHasDocument] = useState<boolean | null>(null)

  // When server confirms the state (prop changes), clear the local override
  const prevHasDocument = useRef(hasDocument)
  if (prevHasDocument.current !== hasDocument) {
    prevHasDocument.current = hasDocument
    setLocalHasDocument(null)
  }

  // Local override takes priority over prop (optimistic UI)
  const effectiveHasDocument = localHasDocument !== null ? localHasDocument : hasDocument

  // Determine document type from filename
  const isPdfDoc = inferIsPdf(documentFileName)

  // For PDFs: fetch lightweight thumbnail instead of full document
  const {
    data: thumbnailData,
    isLoading: isLoadingThumbnail,
  } = useQuery({
    queryKey: ['invoice-document-thumbnail', invoiceId],
    queryFn: () => api.invoices.downloadThumbnail(invoiceId),
    enabled: effectiveHasDocument && isPdfDoc,
    retry: false, // 404 = no thumbnail, don't retry
    staleTime: 10 * 60 * 1000,
  })

  // For images: fetch full document (images are typically small)
  // For PDFs: only fetch when fullscreen is opened
  const {
    data: documentData,
    isLoading: isLoadingDocument,
    error: documentError,
    refetch: refetchDocument,
  } = useQuery({
    queryKey: ['invoice-document', invoiceId],
    queryFn: () => api.invoices.downloadDocument(invoiceId),
    enabled: effectiveHasDocument && (!isPdfDoc || isFullscreen),
    staleTime: 5 * 60 * 1000,
  })

  // Derived state
  const isLoading = isPdfDoc ? isLoadingThumbnail : isLoadingDocument
  const isImage = documentData?.mimeType.startsWith('image/') || (!isPdfDoc && inferIsImage(documentData?.fileName || documentFileName))
  const isPdf = documentData?.mimeType === 'application/pdf' || isPdfDoc

  // Upload mutation with auto-thumbnail generation for PDFs
  const uploadMutation = useMutation({
    mutationFn: async ({ file, base64Content }: { file: File; base64Content: string }) => {
      setUploadProgress(10)
      
      // Generate thumbnail for PDFs
      let thumbnail: string | undefined
      if (isPdfFile(file)) {
        try {
          const thumbResult = await generatePdfThumbnail(file)
          thumbnail = thumbResult.base64
          setUploadProgress(30)
        } catch (err) {
          console.error('[pdf-thumbnail] Failed to generate PDF thumbnail:', err)
        }
      }

      const result = await api.invoices.uploadDocument(invoiceId, {
        fileName: file.name,
        mimeType: file.type,
        content: base64Content,
        thumbnail,
      })
      setUploadProgress(100)
      return result
    },
    onSuccess: () => {
      setLocalHasDocument(true) // Immediately show document (optimistic)
      queryClient.invalidateQueries({ queryKey: ['invoice-document', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice-document-thumbnail', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setUploadProgress(0)
      toast({ title: t('success'), description: t('uploadSuccess') })
    },
    onError: (error: Error) => {
      setUploadProgress(0)
      toast({
        title: t('error'),
        description: error.message || t('uploadError'),
        variant: 'destructive',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.invoices.deleteDocument(invoiceId),
    onSuccess: () => {
      setLocalHasDocument(false) // Immediately hide document (optimistic)
      queryClient.removeQueries({ queryKey: ['invoice-document', invoiceId] })
      queryClient.removeQueries({ queryKey: ['invoice-document-thumbnail', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({ title: t('success'), description: t('deleteSuccess') })
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('deleteError'),
        variant: 'destructive',
      })
    },
  })

  const handleDownload = useCallback(async () => {
    // If we already have full document data, use it
    let data = documentData
    
    // If not loaded yet (PDF with thumbnail-only), fetch now
    if (!data) {
      try {
        data = await api.invoices.downloadDocument(invoiceId)
      } catch {
        toast({
          title: t('error'),
          description: t('loadError'),
          variant: 'destructive',
        })
        return
      }
    }

    const byteCharacters = atob(data.content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: data.mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = data.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [documentData, invoiceId, toast, t])

  const getPreviewUrl = useCallback((data: DocumentDownload): string => {
    return `data:${data.mimeType};base64,${data.content}`
  }, [])

  const getThumbnailUrl = useCallback((): string | null => {
    if (!thumbnailData) return null
    return `data:${thumbnailData.mimeType};base64,${thumbnailData.content}`
  }, [thumbnailData])

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(`Niedozwolony typ pliku. Dozwolone: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`Plik zbyt duży. Maksymalny rozmiar: ${MAX_SIZE_MB} MB`)
      return
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    await uploadMutation.mutateAsync({ file, base64Content: base64 })
  }, [uploadMutation])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
    e.target.value = ''
  }, [handleFileSelect])

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileImage className="h-4 w-4 text-primary" />
              {t('title')}
            </CardTitle>
            {effectiveHasDocument && !isLoading && (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  refetchDocument()
                  queryClient.invalidateQueries({ queryKey: ['invoice-document-thumbnail', invoiceId] })
                }} disabled={isLoading}>
                  <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {!isReadOnly && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('deleteCancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('deleteConfirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0">
          {/* Loading */}
          {isLoading && (
            <Skeleton className="h-40 w-full rounded-lg" />
          )}

          {/* Error (only for images — PDF thumbnail 404 is expected) */}
          {documentError && !isPdfDoc && !isLoading && (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-1 opacity-50" />
              <p className="text-xs">{t('loadError')}</p>
              <Button variant="ghost" size="sm" onClick={() => refetchDocument()} className="mt-1 h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('retry')}
              </Button>
            </div>
          )}

          {/* Document preview thumbnail */}
          {effectiveHasDocument && !isLoading && !(!isPdfDoc && documentError) && (
            <div className="space-y-2">
              <div
                className="relative bg-muted rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setIsFullscreen(true)}
              >
                {/* Image inline preview (full content — images are small) */}
                {isImage && documentData && (
                  <img
                    src={getPreviewUrl(documentData)}
                    alt={documentData.fileName}
                    className="w-full h-40 object-contain"
                  />
                )}

                {/* PDF inline preview — use lightweight thumbnail */}
                {isPdf && thumbnailData && (
                  <img
                    src={getThumbnailUrl()!}
                    alt={documentFileName || 'PDF'}
                    className="w-full h-40 object-contain bg-white"
                  />
                )}

                {/* PDF fallback when no thumbnail available */}
                {isPdf && !thumbnailData && (
                  <div className="h-40 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                    <FileText className="h-16 w-16 text-red-500" />
                    <p className="text-sm font-medium mt-2 text-red-700 dark:text-red-400">PDF</p>
                    <p className="text-xs text-muted-foreground mt-1 px-4 truncate max-w-full">{documentFileName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Kliknij aby otworzyć</p>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 rounded-full p-1.5">
                    <Maximize2 className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* File info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[160px]" title={documentData?.fileName || documentFileName}>
                  {documentData?.fileName || documentFileName}
                </span>
                {documentData && (
                  <span>{formatFileSize(documentData.fileSize)}</span>
                )}
              </div>

              {/* Replace button */}
              {!isReadOnly && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={uploadMutation.isPending}
                    aria-label="Upload document file"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Przesyłanie...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1.5" />
                        Zamień dokument
                      </>
                    )}
                  </Button>
                  {uploadMutation.isPending && uploadProgress > 0 && (
                    <Progress value={uploadProgress} className="h-1" />
                  )}
                </>
              )}
            </div>
          )}

          {/* No document - compact upload */}
          {!effectiveHasDocument && !isLoading && (
            <div className="space-y-2">
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleInputChange}
                className="hidden"
                disabled={isReadOnly || uploadMutation.isPending}
                aria-label="Upload document file"
              />
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                  isReadOnly
                    ? 'opacity-50 cursor-not-allowed border-muted'
                    : 'cursor-pointer border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                )}
                onClick={() => !isReadOnly && !uploadMutation.isPending && inputRef.current?.click()}
              >
                {uploadMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs">Przesyłanie...</p>
                    {uploadProgress > 0 && (
                      <Progress value={uploadProgress} className="h-1 w-full" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full p-2 bg-muted">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dodaj skan faktury
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="flex items-center gap-1.5 mt-2 text-destructive text-xs">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span className="flex-1">{uploadError}</span>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => setUploadError(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen dialog — loads full document on demand */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="!max-w-6xl w-[95vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              {documentData?.fileName || documentFileName || t('document')}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isLoadingDocument && (
              <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Ładowanie dokumentu...</p>
              </div>
            )}

            {documentData && isImage && (
              <img
                src={getPreviewUrl(documentData)}
                alt={documentData.fileName}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
            {documentData && isPdf && (
              <iframe
                src={getPreviewUrl(documentData)}
                className="w-full h-[80vh] rounded-lg border"
                title={documentData.fileName}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {documentData && formatFileSize(documentData.fileSize)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                {t('download')}
              </Button>
              <Button variant="outline" onClick={() => setIsFullscreen(false)}>
                {t('close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
