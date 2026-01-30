'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon,
  Building2,
  Calendar,
  DollarSign,
  Edit2,
  RotateCcw,
  Loader2,
  MapPin,
  CreditCard,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api, queryKeys, type ExtractedInvoiceData, type ManualInvoiceCreate } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useSelectedCompany } from '@/contexts/company-context'

// MPK options (values from Dataverse option set)
const MPK_OPTIONS = [
  'Consultants',
  'BackOffice',
  'Management',
  'Cars',
  'Legal',
  'Marketing',
  'Sales',
  'Delivery',
  'Finance',
  'Other',
]

interface ExtractionPreviewProps {
  data: ExtractedInvoiceData
  confidence: number
  sourceType: 'pdf' | 'image'
  fileDataUrl: string | null
  fileName: string
  fileMimeType: string
  fileBase64: string | null
  onCreateInvoice: () => void
  onCancel: () => void
  onRetry: () => void
}

/**
 * Preview and edit extracted invoice data before creating invoice.
 * Shows document preview on the left and editable form on the right.
 */
export function ExtractionPreview({
  data,
  confidence,
  sourceType,
  fileDataUrl,
  fileName,
  fileMimeType,
  fileBase64,
  onCreateInvoice,
  onCancel,
  onRetry,
}: ExtractionPreviewProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { selectedCompany } = useSelectedCompany()

  // Editable form state (initialized from extracted data)
  const [formData, setFormData] = useState({
    invoiceNumber: data.invoiceNumber || '',
    issueDate: data.issueDate || '',
    dueDate: data.dueDate || '',
    supplierName: data.supplierName || '',
    supplierNip: data.supplierNip || '',
    supplierStreet: data.supplierAddress?.street || '',
    supplierBuildingNumber: data.supplierAddress?.buildingNumber || '',
    supplierPostalCode: data.supplierAddress?.postalCode || '',
    supplierCity: data.supplierAddress?.city || '',
    netAmount: data.netAmount?.toString() || '',
    vatAmount: data.vatAmount?.toString() || '',
    grossAmount: data.grossAmount?.toString() || '',
    mpk: data.suggestedMpk || '',
    category: data.suggestedCategory || '',
    description: data.suggestedDescription || '',
  })

  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompany) {
        throw new Error('Nie wybrano firmy')
      }

      // Validate required fields
      if (!formData.invoiceNumber.trim()) {
        throw new Error('Numer faktury jest wymagany')
      }
      if (!formData.supplierNip.trim()) {
        throw new Error('NIP dostawcy jest wymagany')
      }
      if (!formData.supplierName.trim()) {
        throw new Error('Nazwa dostawcy jest wymagana')
      }

      const invoiceData: ManualInvoiceCreate = {
        tenantNip: selectedCompany.nip,
        tenantName: selectedCompany.companyName,
        invoiceNumber: formData.invoiceNumber.trim(),
        supplierNip: formData.supplierNip.replace(/\D/g, ''),
        supplierName: formData.supplierName.trim(),
        invoiceDate: formData.issueDate || new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate || undefined,
        netAmount: parseFloat(formData.netAmount) || 0,
        vatAmount: parseFloat(formData.vatAmount) || 0,
        grossAmount: parseFloat(formData.grossAmount) || 0,
        mpk: formData.mpk || undefined,
        category: formData.category || undefined,
        description: formData.description || undefined,
        // AI suggestion fields - original values from extraction
        aiMpkSuggestion: data.suggestedMpk || undefined,
        aiCategorySuggestion: data.suggestedCategory || undefined,
        aiDescription: data.suggestedDescription || undefined,
        aiConfidence: confidence,
      }

      // Create the invoice first
      const invoice = await api.invoices.createManual(invoiceData)
      
      // Then upload the source document as attachment
      if (fileBase64 && fileName) {
        try {
          await api.invoices.uploadAttachment(invoice.id, {
            fileName: fileName,
            mimeType: fileMimeType,
            content: fileBase64,
          })
        } catch (attachError) {
          console.error('Failed to upload attachment:', attachError)
          // Don't fail the whole operation - invoice was created
        }
      }
      
      return invoice
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() })
      toast({
        title: 'Sukces',
        description: `Faktura ${invoice.invoiceNumber} została utworzona`,
      })
      onCreateInvoice()
      // Navigate to invoice detail
      router.push(`/invoices/${invoice.id}`)
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update field handler
  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Recalculate amounts
  const recalculateFromNet = useCallback(() => {
    const net = parseFloat(formData.netAmount) || 0
    const vatRate = 0.23 // Default 23%
    const vat = net * vatRate
    const gross = net + vat
    setFormData(prev => ({
      ...prev,
      vatAmount: vat.toFixed(2),
      grossAmount: gross.toFixed(2),
    }))
  }, [formData.netAmount])

  // Confidence badge color
  const confidenceColor = 
    confidence >= 0.8 ? 'bg-green-100 text-green-800' :
    confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'

  // Format address for display
  const formatAddress = () => {
    const parts = [
      formData.supplierStreet,
      formData.supplierBuildingNumber,
      formData.supplierPostalCode,
      formData.supplierCity,
    ].filter(Boolean)
    return parts.join(', ') || 'Brak adresu'
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[500px]">
      {/* Left: Document preview */}
      <div className="lg:w-1/2 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            {sourceType === 'pdf' ? (
              <FileText className="h-4 w-4" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {fileName || 'Dokument'}
          </h3>
          <Badge className={cn('text-xs', confidenceColor)}>
            Pewność: {Math.round(confidence * 100)}%
          </Badge>
        </div>
        
        <div className="flex-1 border rounded-lg bg-muted/50 overflow-hidden min-h-[400px]">
          {fileDataUrl && sourceType === 'image' ? (
            <img
              src={fileDataUrl}
              alt="Podgląd dokumentu"
              className="w-full h-full object-contain"
            />
          ) : fileDataUrl && sourceType === 'pdf' ? (
            <iframe
              src={fileDataUrl}
              title="Podgląd PDF"
              className="w-full h-full min-h-[400px]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <FileText className="h-16 w-16 mb-4" />
              <p className="text-sm">Podgląd dokumentu niedostępny</p>
              <p className="text-xs mt-1">Dane zostały wyodrębnione z dokumentu</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Editable form */}
      <div className="lg:w-1/2 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Invoice info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dane faktury
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Numer faktury *</Label>
                    <Input
                      value={formData.invoiceNumber}
                      onChange={(e) => updateField('invoiceNumber', e.target.value)}
                      placeholder="FV/2024/001"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data wystawienia</Label>
                    <Input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => updateField('issueDate', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Termin płatności</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => updateField('dueDate', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Supplier info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Sprzedawca
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">NIP *</Label>
                    <Input
                      value={formData.supplierNip}
                      onChange={(e) => updateField('supplierNip', e.target.value)}
                      placeholder="0000000000"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nazwa *</Label>
                    <Input
                      value={formData.supplierName}
                      onChange={(e) => updateField('supplierName', e.target.value)}
                      placeholder="Nazwa firmy"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Ulica</Label>
                    <Input
                      value={formData.supplierStreet}
                      onChange={(e) => updateField('supplierStreet', e.target.value)}
                      placeholder="ul. Przykładowa"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nr budynku</Label>
                    <Input
                      value={formData.supplierBuildingNumber}
                      onChange={(e) => updateField('supplierBuildingNumber', e.target.value)}
                      placeholder="1A"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Kod pocztowy</Label>
                    <Input
                      value={formData.supplierPostalCode}
                      onChange={(e) => updateField('supplierPostalCode', e.target.value)}
                      placeholder="00-000"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Miasto</Label>
                    <Input
                      value={formData.supplierCity}
                      onChange={(e) => updateField('supplierCity', e.target.value)}
                      placeholder="Warszawa"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amounts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Kwoty
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Netto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.netAmount}
                      onChange={(e) => updateField('netAmount', e.target.value)}
                      onBlur={recalculateFromNet}
                      placeholder="0.00"
                      className="h-8 text-sm text-right"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">VAT</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.vatAmount}
                      onChange={(e) => updateField('vatAmount', e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm text-right"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Brutto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.grossAmount}
                      onChange={(e) => updateField('grossAmount', e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm text-right font-semibold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Klasyfikacja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">MPK</Label>
                    <Select
                      value={formData.mpk}
                      onValueChange={(v) => updateField('mpk', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MPK_OPTIONS.map(mpk => (
                          <SelectItem key={mpk} value={mpk}>
                            {mpk}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Kategoria</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      placeholder="np. IT / Oprogramowanie"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Opis</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Krótki opis faktury"
                    className="h-8 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items preview (read-only) */}
            {data.items && data.items.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Pozycje ({data.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    {data.items.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                        <span className="truncate flex-1 mr-2">{item.description}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {item.grossAmount?.toFixed(2) || item.netAmount?.toFixed(2) || '—'} PLN
                        </span>
                      </div>
                    ))}
                    {data.items.length > 5 && (
                      <p className="text-muted-foreground pt-1">
                        ...i {data.items.length - 5} więcej
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <Separator className="my-4" />
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Inny dokument
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tworzę...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Utwórz fakturę
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
