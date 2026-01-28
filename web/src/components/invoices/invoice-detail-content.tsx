'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  Upload,
  Check,
  Clock,
  AlertCircle,
  Sparkles,
  Building2,
  Calendar,
  CreditCard,
  Tag,
} from 'lucide-react'
import Link from 'next/link'

import { api, Invoice, Attachment } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy', { locale: pl })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600'
  if (confidence >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Wysoka'
  if (confidence >= 0.5) return 'Średnia'
  return 'Niska'
}

// ============================================================================
// Types
// ============================================================================

interface InvoiceDetailContentProps {
  invoiceId: string
}

// ============================================================================
// Main Component
// ============================================================================

export function InvoiceDetailContent({ invoiceId }: InvoiceDetailContentProps) {
  const queryClient = useQueryClient()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Fetch invoice details
  const {
    data: invoice,
    isLoading: invoiceLoading,
    error: invoiceError,
  } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.invoices.get(invoiceId),
  })

  // Fetch attachments
  const {
    data: attachmentsData,
    isLoading: attachmentsLoading,
  } = useQuery({
    queryKey: ['attachments', invoiceId],
    queryFn: () => api.invoices.listAttachments(invoiceId),
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file)
      return api.invoices.uploadAttachment(invoiceId, {
        fileName: file.name,
        mimeType: file.type,
        content: base64,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', invoiceId] })
      setUploadDialogOpen(false)
      setSelectedFile(null)
      setUploadProgress(0)
    },
  })

  // Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => api.invoices.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', invoiceId] })
    },
  })

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: () => api.invoices.markAsPaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    },
  })

  // Apply AI suggestion mutation
  const applyAiMutation = useMutation({
    mutationFn: () => {
      if (!invoice?.aiMpkSuggestion && !invoice?.aiCategorySuggestion) {
        throw new Error('Brak sugestii AI do zastosowania')
      }
      return api.invoices.update(invoiceId, {
        mpk: invoice.aiMpkSuggestion,
        category: invoice.aiCategorySuggestion,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    },
  })

  // Helper: File to Base64
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      // Simulate progress
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setUploadProgress(Math.min(progress, 90))
        if (progress >= 90) clearInterval(interval)
      }, 100)
      reader.readAsDataURL(file)
    })
  }

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // Handle upload
  function handleUpload() {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  // Handle download
  async function handleDownload(attachment: Attachment) {
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
  }

  // Helper: Base64 to Blob
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // Loading state
  if (invoiceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    )
  }

  // Error state
  if (invoiceError || !invoice) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nie udało się pobrać szczegółów faktury. Spróbuj odświeżyć stronę.
        </AlertDescription>
      </Alert>
    )
  }

  const isOverdue = invoice.dueDate && 
    new Date(invoice.dueDate) < new Date() && 
    invoice.paymentStatus === 'pending'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do listy
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">{invoice.supplierName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.paymentStatus === 'pending' && (
            <Button
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Oznacz jako opłacone
            </Button>
          )}
          <Badge
            variant={invoice.paymentStatus === 'paid' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {invoice.paymentStatus === 'paid' ? 'Opłacona' : isOverdue ? 'Zaległe' : 'Oczekuje'}
          </Badge>
        </div>
      </div>

      {/* AI Suggestions Card */}
      {(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion) && (
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Sugestie AI</CardTitle>
              </div>
              {invoice.aiConfidence !== undefined && (
                <Badge variant="outline" className={getConfidenceColor(invoice.aiConfidence)}>
                  Pewność: {getConfidenceLabel(invoice.aiConfidence)} ({Math.round(invoice.aiConfidence * 100)}%)
                </Badge>
              )}
            </div>
            {invoice.aiRationale && (
              <CardDescription className="text-purple-700 dark:text-purple-300">
                {invoice.aiRationale}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {invoice.aiMpkSuggestion && (
                <div>
                  <Label className="text-xs text-muted-foreground">Sugerowane MPK</Label>
                  <p className="font-medium">{invoice.aiMpkSuggestion}</p>
                </div>
              )}
              {invoice.aiCategorySuggestion && (
                <div>
                  <Label className="text-xs text-muted-foreground">Sugerowana kategoria</Label>
                  <p className="font-medium">{invoice.aiCategorySuggestion}</p>
                </div>
              )}
            </div>
            {(!invoice.mpk || !invoice.category) && (
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => applyAiMutation.mutate()}
                disabled={applyAiMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Zastosuj sugestie AI
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dane faktury
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Numer faktury</Label>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Źródło</Label>
                <Badge variant="outline">
                  {invoice.source === 'KSeF' ? 'KSeF' : 'Ręczna'}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data wystawienia</Label>
                <p className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Termin płatności</Label>
                <p className={cn('flex items-center gap-1', isOverdue && 'text-red-600')}>
                  <Clock className="h-4 w-4" />
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Numer referencyjny KSeF</Label>
              <p className="font-mono text-sm">{invoice.referenceNumber || '-'}</p>
            </div>
            {invoice.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Opis</Label>
                <p className="text-sm">{invoice.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dostawca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nazwa</Label>
              <p className="font-medium">{invoice.supplierName}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">NIP</Label>
              <p className="font-mono">{invoice.supplierNip}</p>
            </div>
            {invoice.supplierAddress && (
              <div>
                <Label className="text-xs text-muted-foreground">Adres</Label>
                <p className="text-sm">
                  {invoice.supplierAddress}
                  {invoice.supplierPostalCode && `, ${invoice.supplierPostalCode}`}
                  {invoice.supplierCity && ` ${invoice.supplierCity}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Kwoty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Netto</span>
                <span>{formatCurrency(invoice.netAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Brutto</span>
                <span>{formatCurrency(invoice.grossAmount, invoice.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Klasyfikacja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">MPK</Label>
                <p className="font-medium">{invoice.mpk || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kategoria</Label>
                <p className="font-medium">{invoice.category || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Projekt</Label>
                <p className="font-medium">{invoice.project || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tagi</Label>
                <div className="flex flex-wrap gap-1">
                  {invoice.tags?.length ? (
                    invoice.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pozycje faktury</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opis</TableHead>
                  <TableHead className="text-right">Ilość</TableHead>
                  <TableHead>Jedn.</TableHead>
                  <TableHead className="text-right">Cena jedn.</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Brutto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.netAmount)}</TableCell>
                    <TableCell className="text-right">{item.vatRate}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.grossAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Załączniki</CardTitle>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Dodaj załącznik
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dodaj załącznik</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file">Wybierz plik</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Dozwolone formaty: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (max 10 MB)
                    </p>
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  )}
                  {uploadMutation.isPending && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-muted-foreground text-center">
                        Przesyłanie...
                      </p>
                    </div>
                  )}
                  {uploadMutation.isError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {(uploadMutation.error as Error).message}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? 'Przesyłanie...' : 'Prześlij'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {attachmentsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : attachmentsData?.attachments?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa pliku</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Rozmiar</TableHead>
                  <TableHead>Data dodania</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attachmentsData.attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {attachment.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{attachment.mimeType.split('/')[1]?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(attachment.fileSize)}</TableCell>
                    <TableCell>{formatDate(attachment.createdOn)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(attachment.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Brak załączników</p>
              <p className="text-sm">Kliknij &quot;Dodaj załącznik&quot; aby przesłać plik</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
