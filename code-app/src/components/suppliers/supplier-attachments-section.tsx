import { useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  FileUp,
  FileText,
  Eye,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  useSupplierAttachments,
  useUploadSupplierAttachment,
  useDeleteSupplierAttachment,
} from '@/hooks/use-api'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Attachment } from '@/lib/types'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function fileToBase64(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    if (onProgress) {
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        onProgress(Math.min(progress, 90))
        if (progress >= 90) clearInterval(interval)
      }, 100)
    }
    reader.readAsDataURL(file)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
}

interface SupplierAttachmentsSectionProps {
  supplierId: string
  defaultExpanded?: boolean
}

export function SupplierAttachmentsSection({
  supplierId,
  defaultExpanded = false,
}: SupplierAttachmentsSectionProps) {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const { data, isLoading } = useSupplierAttachments(supplierId, {
    enabled: isExpanded,
  })

  const uploadMutation = useUploadSupplierAttachment()
  const deleteMutation = useDeleteSupplierAttachment()

  const attachments = data?.attachments ?? []
  const hasAttachments = attachments.length > 0

  const ALLOWED_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.csv', '.txt', '.zip', '.tar', '.7z',
  ]
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  const validateFile = useCallback((file: File): boolean => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(t('suppliers.attachments.unsupportedFormat', { ext }))
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('suppliers.attachments.fileTooLarge', { name: file.name }))
      return false
    }
    return true
  }, [t])

  const handleUpload = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file, setUploadProgress)
    uploadMutation.mutate(
      {
        supplierId,
        data: { fileName: file.name, mimeType: file.type, content: base64 },
      },
      {
        onSuccess: () => {
          setUploadProgress(0)
          toast.success(t('suppliers.attachments.uploaded'))
        },
        onError: (err) => toast.error(err.message || t('suppliers.attachments.uploadError')),
      },
    )
  }, [supplierId, uploadMutation, t])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    Array.from(e.dataTransfer.files).forEach(file => {
      if (validateFile(file)) handleUpload(file)
    })
  }, [validateFile, handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      if (validateFile(file)) handleUpload(file)
    })
    e.target.value = ''
  }, [validateFile, handleUpload])

  const handlePreview = useCallback(async (attachment: Attachment) => {
    const previewableTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!previewableTypes.includes(attachment.mimeType)) {
      toast.info(t('suppliers.attachments.previewUnavailable'))
      return
    }
    setPreviewAttachment(attachment)
    setPreviewLoading(true)
    setPreviewContent(null)
    try {
      const result = await api.invoices.downloadAttachment(attachment.id)
      setPreviewContent(`data:${attachment.mimeType};base64,${result.content}`)
    } catch {
      toast.error(t('suppliers.attachments.previewError'))
      setPreviewAttachment(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [t])

  const handleDownload = useCallback(async (attachment: Attachment) => {
    try {
      const { content } = await api.invoices.downloadAttachment(attachment.id)
      const blob = base64ToBlob(content, attachment.mimeType)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('suppliers.attachments.downloadError'))
    }
  }, [t])

  const handleDelete = useCallback((attachmentId: string) => {
    deleteMutation.mutate(
      { attachmentId, supplierId },
      {
        onSuccess: () => toast.success(t('suppliers.attachments.deleted')),
        onError: (err) => toast.error(err.message),
      },
    )
  }, [deleteMutation, supplierId, t])

  return (
    <>
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('suppliers.attachments.title')}
            {hasAttachments && (
              <Badge variant="secondary" className="h-5 text-xs">
                {attachments.length}
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary',
                uploadMutation.isPending && 'opacity-50 pointer-events-none'
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('supplier-att-input')?.click()}
            >
              <FileUp className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">
                {t('suppliers.attachments.dropOrSelect')}{' '}
                <span className="text-primary">{t('suppliers.attachments.selectFiles')}</span>
              </p>
              <input
                id="supplier-att-input"
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png,image/gif,image/webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.tar,.7z"
                className="hidden"
                onChange={handleFileSelect}
                aria-label={t('suppliers.attachments.selectFiles')}
              />
            </div>

            {/* Upload progress */}
            {uploadMutation.isPending && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1" />
                <p className="text-xs text-muted-foreground text-center">{t('suppliers.attachments.uploading')}</p>
              </div>
            )}

            {/* List */}
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : hasAttachments ? (
              <div className="space-y-1">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{attachment.fileName}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => handlePreview(attachment)}
                      title={t('suppliers.attachments.preview')}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => handleDownload(attachment)}
                      title={t('suppliers.attachments.download')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => handleDelete(attachment.id)}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t('suppliers.attachments.noAttachments')}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.fileName}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center h-64">
              <Skeleton className="h-full w-full" />
            </div>
          ) : previewContent && previewAttachment?.mimeType === 'application/pdf' ? (
            <iframe src={previewContent} className="w-full h-[70vh]" title={previewAttachment?.fileName} />
          ) : previewContent ? (
            <img src={previewContent} alt={previewAttachment?.fileName} className="max-w-full max-h-[70vh] mx-auto" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
