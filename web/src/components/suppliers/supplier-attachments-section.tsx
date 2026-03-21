'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
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
import { useToast } from '@/hooks/use-toast'
import { api, Attachment } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  isReadOnly?: boolean
}

export function SupplierAttachmentsSection({
  supplierId,
  defaultExpanded = false,
  isReadOnly = false,
}: SupplierAttachmentsSectionProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('invoices.attachments')
  const tCommon = useTranslations('common')

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const { data: attachmentsData, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['supplier-attachments', supplierId],
    queryFn: () => api.suppliers.listAttachments(supplierId),
    enabled: isExpanded,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file, setUploadProgress)
      return api.suppliers.uploadAttachment(supplierId, {
        fileName: file.name,
        mimeType: file.type,
        content: base64,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-attachments', supplierId] })
      setUploadProgress(0)
      toast({ title: tCommon('success'), description: t('uploaded') })
    },
    onError: (error: Error) => {
      toast({ title: tCommon('error'), description: error.message || t('uploadError'), variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => api.invoices.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-attachments', supplierId] })
    },
  })

  const validateFile = useCallback((file: File): boolean => {
    const allowedExtensions = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.csv', '.txt', '.zip', '.tar', '.7z',
    ]
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!allowedExtensions.includes(ext)) {
      toast({
        title: tCommon('error'),
        description: `Nieobsługiwany format pliku: ${ext}`,
        variant: 'destructive',
      })
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: tCommon('error'),
        description: `Plik "${file.name}" przekracza 10 MB`,
        variant: 'destructive',
      })
      return false
    }
    return true
  }, [toast, tCommon])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      if (validateFile(file)) uploadMutation.mutate(file)
    })
  }, [validateFile, uploadMutation])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (validateFile(file)) uploadMutation.mutate(file)
    })
    e.target.value = ''
  }, [validateFile, uploadMutation])

  const handlePreview = useCallback(async (attachment: Attachment) => {
    const previewableTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!previewableTypes.includes(attachment.mimeType)) {
      toast({ title: 'Info', description: 'Podgląd niedostępny dla tego typu pliku. Użyj pobierania.' })
      return
    }
    setPreviewAttachment(attachment)
    setPreviewLoading(true)
    setPreviewContent(null)
    try {
      const result = await api.invoices.downloadAttachment(attachment.id)
      setPreviewContent(`data:${attachment.mimeType};base64,${result.content}`)
    } catch {
      toast({ title: tCommon('error'), description: 'Nie udało się pobrać podglądu', variant: 'destructive' })
      setPreviewAttachment(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [toast, tCommon])

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
    } catch (err) {
      console.error('Download failed:', err)
    }
  }, [])

  const attachments = attachmentsData?.attachments ?? []
  const hasAttachments = attachments.length > 0

  return (
    <>
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('title')}
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
            {/* Drop zone - writable only */}
            {!isReadOnly && (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
                  isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary',
                  uploadMutation.isPending && 'opacity-50 pointer-events-none'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('supplier-file-input')?.click()}
              >
                <FileUp className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  {t('dropOrSelect')} <span className="text-primary">{t('selectFiles')}</span>
                </p>
                <input
                  id="supplier-file-input"
                  type="file"
                  multiple
                  accept=".pdf,image/jpeg,image/png,image/gif,image/webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.tar,.7z"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label={t('selectFiles')}
                />
              </div>
            )}

            {/* Upload progress */}
            {uploadMutation.isPending && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1" />
                <p className="text-xs text-muted-foreground text-center">{t('uploading')}</p>
              </div>
            )}

            {/* List */}
            {attachmentsLoading ? (
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
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePreview(attachment)} title={t('preview')}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(attachment)} title={t('download')}>
                      <Download className="h-3 w-3" />
                    </Button>
                    {!isReadOnly && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(attachment.id)} title={t('delete')}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">{t('noAttachments')}</p>
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
