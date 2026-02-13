'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  FileImage,
  Download,
  Trash2,
  Maximize2,
  X,
  Loader2,
  FileText,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { api, DocumentDownload } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { DocumentDropzone } from './document-dropzone'
import { generatePdfThumbnail, isPdfFile } from '@/lib/pdf-thumbnail'

interface InvoiceDocumentViewerProps {
  invoiceId: string
  hasDocument?: boolean
  documentFileName?: string
  isReadOnly?: boolean
  className?: string
}

/**
 * Format file size for display
 */
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
 * InvoiceDocumentViewer - Display and manage invoice document (image/scan)
 * 
 * Features:
 * - Thumbnail preview for PDFs (lightweight, no full download)
 * - Full image preview for image documents
 * - Lazy-load full document only for fullscreen/download
 * - Upload new document with auto-thumbnail generation for PDFs
 * - Download / delete document
 */
export function InvoiceDocumentViewer({
  invoiceId,
  hasDocument = false,
  documentFileName,
  isReadOnly = false,
  className,
}: InvoiceDocumentViewerProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('invoices.invoiceDocument')
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Determine document type from filename
  const isPdfDoc = inferIsPdf(documentFileName)

  // For PDFs: fetch lightweight thumbnail instead of full document
  const {
    data: thumbnailData,
    isLoading: isLoadingThumbnail,
  } = useQuery({
    queryKey: ['invoice-document-thumbnail', invoiceId],
    queryFn: () => api.invoices.downloadThumbnail(invoiceId),
    enabled: hasDocument && isPdfDoc,
    retry: false, // 404 = no thumbnail, don't retry
    staleTime: 10 * 60 * 1000, // Cache thumbnails for 10 minutes
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
    enabled: hasDocument && (!isPdfDoc || isFullscreen),
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
      queryClient.invalidateQueries({ queryKey: ['invoice-document', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice-document-thumbnail', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setUploadProgress(0)
      toast({
        title: t('success'),
        description: t('uploadSuccess'),
      })
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
      queryClient.invalidateQueries({ queryKey: ['invoice-document', invoiceId] })
      queryClient.removeQueries({ queryKey: ['invoice-document-thumbnail', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({
        title: t('success'),
        description: t('deleteSuccess'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('deleteError'),
        variant: 'destructive',
      })
    },
  })

  /**
   * Handle file upload
   */
  const handleUpload = useCallback(async (file: File, base64Content: string) => {
    await uploadMutation.mutateAsync({ file, base64Content })
  }, [uploadMutation])

  /**
   * Open fullscreen - this triggers full document fetch for PDFs
   */
  const handleFullscreen = useCallback(() => {
    setIsFullscreen(true)
  }, [])

  /**
   * Handle document download
   */
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

    // Create blob and download
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

  /**
   * Get data URL for preview
   */
  const getPreviewUrl = useCallback((data: DocumentDownload): string => {
    return `data:${data.mimeType};base64,${data.content}`
  }, [])

  /**
   * Get thumbnail URL for inline PDF preview
   */
  const getThumbnailUrl = useCallback((): string | null => {
    if (!thumbnailData) return null
    return `data:${thumbnailData.mimeType};base64,${thumbnailData.content}`
  }, [thumbnailData])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileImage className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
          
          {hasDocument && !isLoading && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetchDocument()
                  queryClient.invalidateQueries({ queryKey: ['invoice-document-thumbnail', invoiceId] })
                }}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              {!isReadOnly && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteDescription')}
                      </AlertDialogDescription>
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

      <CardContent>
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        )}

        {/* Error state (only for images — PDF thumbnail 404 is expected) */}
        {documentError && !isPdfDoc && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('loadError')}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchDocument()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('retry')}
            </Button>
          </div>
        )}

        {/* Document preview */}
        {hasDocument && !isLoading && !(!isPdfDoc && documentError) && (
          <div className="space-y-3">
            {/* Preview area */}
            <div
              className="relative bg-muted rounded-lg overflow-hidden cursor-pointer group"
              onClick={handleFullscreen}
            >
              {/* Image inline preview (full content — images are small) */}
              {isImage && documentData && (
                <img
                  src={getPreviewUrl(documentData)}
                  alt={documentData.fileName}
                  className="w-full h-48 object-contain"
                />
              )}
              
              {/* PDF inline preview — use lightweight thumbnail */}
              {isPdf && thumbnailData && (
                <img
                  src={getThumbnailUrl()!}
                  alt={documentFileName || 'PDF'}
                  className="w-full h-48 object-contain bg-white"
                />
              )}

              {/* PDF fallback when no thumbnail available */}
              {isPdf && !thumbnailData && (
                <div className="h-48 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-red-500" />
                    <p className="text-sm font-medium mt-2">PDF</p>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 rounded-full p-2">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* File info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[200px]" title={documentData?.fileName || documentFileName}>
                {documentData?.fileName || documentFileName}
              </span>
              {documentData && (
                <span className="text-muted-foreground">
                  {formatFileSize(documentData.fileSize)}
                </span>
              )}
            </div>

            {/* Replace document */}
            {!isReadOnly && (
              <div className="pt-2 border-t">
                <DocumentDropzone
                  onUpload={handleUpload}
                  isUploading={uploadMutation.isPending}
                  uploadProgress={uploadProgress}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {/* No document - show upload */}
        {!hasDocument && !isLoading && (
          <DocumentDropzone
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
            uploadProgress={uploadProgress}
            disabled={isReadOnly}
          />
        )}
      </CardContent>

      {/* Fullscreen dialog — loads full document on demand */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
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
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}

            {documentData && isPdf && (
              <iframe
                src={getPreviewUrl(documentData)}
                className="w-full h-[70vh] rounded-lg border"
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
    </Card>
  )
}
