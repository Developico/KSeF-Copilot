/**
 * Invoice Document Sidebar
 *
 * Shows a document thumbnail/preview, upload, download, fullscreen view,
 * and delete actions for the source document attached to an invoice.
 */

import { useState, useRef, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui'
import {
  FileText, Upload, Download, Trash2, Maximize2,
  Loader2, ImageIcon, AlertCircle,
} from 'lucide-react'
import {
  useUploadDocument,
  useDeleteDocument,
  useInvoiceDocument,
} from '@/hooks/use-api'
import type { DocumentUpload } from '@/lib/types'
import { toast } from 'sonner'

const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_DOC_SIZE = 10 * 1024 * 1024 // 10 MB

interface InvoiceDocumentSidebarProps {
  invoiceId: string
  hasDocument?: boolean
}

export function InvoiceDocumentSidebar({
  invoiceId,
  hasDocument: initialHasDocument,
}: InvoiceDocumentSidebarProps) {
  const intl = useIntl()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Optimistic local state
  const [localHasDocument, setLocalHasDocument] = useState(initialHasDocument ?? false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMimeType, setPreviewMimeType] = useState<string>('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const uploadDocument = useUploadDocument()
  const deleteDocument = useDeleteDocument()
  const {
    refetch: fetchDocument,
    isFetching: isDownloading,
  } = useInvoiceDocument(invoiceId, { enabled: false })

  // Load document for preview / download
  const loadDocument = useCallback(async () => {
    const { data } = await fetchDocument()
    if (data) {
      const blob = base64ToBlob(data.content, data.mimeType)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewMimeType(data.mimeType)
      return { url, mimeType: data.mimeType, fileName: data.fileName }
    }
    return null
  }, [fetchDocument])

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
      toast.error(intl.formatMessage({ id: 'scanner.invalidFileType' }))
      return
    }
    if (file.size > MAX_DOC_SIZE) {
      toast.error(intl.formatMessage({ id: 'scanner.fileTooLarge' }))
      return
    }

    setUploading(true)
    try {
      const base64 = await fileToBase64(file)
      const payload: DocumentUpload = {
        fileName: file.name,
        mimeType: file.type,
        content: base64,
      }

      uploadDocument.mutate(
        { invoiceId, data: payload },
        {
          onSuccess: () => {
            setLocalHasDocument(true)
            // Create local preview from the uploaded file
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setPreviewMimeType(file.type)
            toast.success(intl.formatMessage({ id: 'invoices.documentUploaded' }))
          },
          onError: (err) => toast.error(err.message),
          onSettled: () => setUploading(false),
        },
      )
    } catch {
      setUploading(false)
      toast.error(intl.formatMessage({ id: 'errors.generic' }))
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  // Download document as file
  const handleDownload = async () => {
    const result = await loadDocument()
    if (result) {
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.fileName
      a.click()
    }
  }

  // View fullscreen
  const handleFullscreen = async () => {
    if (!previewUrl) {
      await loadDocument()
    }
    setFullscreenOpen(true)
  }

  // Delete document
  const handleDelete = () => {
    deleteDocument.mutate(invoiceId, {
      onSuccess: () => {
        setLocalHasDocument(false)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
        setDeleteConfirmOpen(false)
        toast.success(intl.formatMessage({ id: 'invoices.documentDeleted' }))
      },
      onError: (err) => toast.error(err.message),
    })
  }

  // Load thumbnail / preview on mount if document exists
  const handleLoadPreview = useCallback(async () => {
    if (localHasDocument && !previewUrl) {
      await loadDocument()
    }
  }, [localHasDocument, previewUrl, loadDocument])

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {intl.formatMessage({ id: 'invoices.sourceDocument' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {localHasDocument ? (
            <div className="space-y-3">
              {/* Preview area */}
              <div
                className="relative rounded-md border bg-muted/30 overflow-hidden cursor-pointer group min-h-[120px]"
                onClick={handleFullscreen}
              >
                {previewUrl ? (
                  previewMimeType.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mb-2" />
                      <span className="text-xs">PDF</span>
                    </div>
                  )
                ) : isDownloading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <button
                    className="flex flex-col items-center justify-center py-8 w-full text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); void handleLoadPreview() }}
                  >
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <span className="text-xs">
                      {intl.formatMessage({ id: 'invoices.documentPreview' })}
                    </span>
                  </button>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Maximize2 className="h-6 w-6 text-white drop-shadow-lg" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {intl.formatMessage({ id: 'invoices.download' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Re-upload */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1" />
                )}
                {intl.formatMessage({ id: 'invoices.uploadDocument' })}
              </Button>
            </div>
          ) : (
            /* No document — upload prompt */
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-2" />
              ) : (
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              )}
              <p className="text-sm font-medium">
                {intl.formatMessage({ id: 'invoices.uploadDocument' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {intl.formatMessage({ id: 'invoices.uploadDocumentDesc' })}
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_DOC_TYPES.join(',')}
            className="hidden"
            aria-label={intl.formatMessage({ id: 'invoices.uploadDocument' })}
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({ id: 'invoices.documentPreview' })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'invoices.sourceDocument' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 rounded-md">
            {previewUrl && previewMimeType.startsWith('image/') ? (
              <img
                src={previewUrl}
                alt="Document"
                className="w-full h-auto object-contain"
              />
            ) : previewUrl && previewMimeType === 'application/pdf' ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh]"
                title="PDF preview"
              />
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-6 w-6 mr-2" />
                {intl.formatMessage({ id: 'invoices.noDocument' })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'common.delete' })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'invoices.deleteDocumentConfirm' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {intl.formatMessage({ id: 'common.delete' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mimeType })
}
