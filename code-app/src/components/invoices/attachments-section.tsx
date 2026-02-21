import { useState, useRef, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui'
import { Paperclip, Upload, Trash2, Download, FileIcon } from 'lucide-react'
import {
  useInvoiceAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '@/hooks/use-api'
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'

interface AttachmentsSectionProps {
  invoiceId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:*/*;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function AttachmentsSection({ invoiceId }: AttachmentsSectionProps) {
  const intl = useIntl()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useInvoiceAttachments(invoiceId)
  const uploadAttachment = useUploadAttachment()
  const deleteAttachment = useDeleteAttachment()

  const attachments = data?.attachments ?? []

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }, [])

  async function handleUpload() {
    if (!selectedFile) return
    const content = await fileToBase64(selectedFile)
    uploadAttachment.mutate(
      {
        invoiceId,
        data: {
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          content,
        },
      },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'invoices.attachmentUploaded' }))
          setSelectedFile(null)
          setUploadOpen(false)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  function handleDelete(attachmentId: string, fileName: string) {
    deleteAttachment.mutate(
      { attachmentId, invoiceId },
      {
        onSuccess: () => {
          toast.success(
            intl.formatMessage({ id: 'invoices.attachmentDeleted' }),
          )
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
    // suppress unused warning
    void fileName
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4" />
            {intl.formatMessage({ id: 'invoices.attachments' })}
            {attachments.length > 0 && (
              <span className="text-muted-foreground font-normal">({attachments.length})</span>
            )}
          </CardTitle>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'invoices.addAttachment' })}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{intl.formatMessage({ id: 'invoices.uploadAttachment' })}</DialogTitle>
                <DialogDescription>
                  {intl.formatMessage({ id: 'invoices.maxFileSize' }, { size: 10 })}
                </DialogDescription>
              </DialogHeader>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: 'invoices.dragOrClick' })}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  aria-label={intl.formatMessage({ id: 'invoices.uploadAttachment' })}
                  onChange={handleFileSelect}
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileIcon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  {intl.formatMessage({ id: 'common.cancel' })}
                </Button>
                <Button
                  onClick={() => void handleUpload()}
                  disabled={!selectedFile || uploadAttachment.isPending}
                >
                  {intl.formatMessage({ id: 'invoices.uploadAttachment' })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'common.loading' })}</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.noAttachments' })}</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 transition-colors"
              >
                <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{att.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.fileSize)} · {formatDate(att.createdOn)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`${import.meta.env.VITE_API_URL || ''}/api/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      title={intl.formatMessage({ id: 'invoices.download' })}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {intl.formatMessage({ id: 'invoices.deleteConfirmTitle' })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {intl.formatMessage({ id: 'invoices.deleteAttachmentConfirm' }, { name: att.fileName })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {intl.formatMessage({ id: 'common.cancel' })}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(att.id, att.fileName)}>
                          {intl.formatMessage({ id: 'common.delete' })}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
