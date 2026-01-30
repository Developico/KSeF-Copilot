'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Eye,
  ArrowDownToLine,
  Calendar,
  Building2,
  RefreshCw,
  CheckCircle,
  Plus,
  AlertCircle,
  Sparkles,
  FileQuestion,
  FileCheck,
  Trash2,
} from 'lucide-react'
import { useInvoices, useMarkAsPaid, useDeleteInvoice, useUpdateInvoice } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceListParams } from '@/lib/api'
import { exportInvoicesToCsv } from '@/lib/export'
import { InvoiceFilters } from '@/components/invoices/invoice-filters'
import { DocumentScannerModal } from '@/components/documents'
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

// Description status types - simplified to 3 states
type DescriptionStatus = 'not_described' | 'ai_suggested' | 'described'

function getDescriptionStatus(invoice: Invoice): DescriptionStatus {
  const hasDescription = !!(invoice.mpk || invoice.category)
  const hasAiSuggestion = !!(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion)
  
  if (hasDescription) {
    return 'described' // Has MPK or category set
  }
  if (hasAiSuggestion) {
    return 'ai_suggested' // Has AI suggestions waiting
  }
  return 'not_described' // Nothing set, no AI suggestions
}

function getDescriptionStatusBadge(status: DescriptionStatus) {
  switch (status) {
    case 'not_described':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
          <FileQuestion className="h-3 w-3" />
          Brak opisu
        </Badge>
      )
    case 'ai_suggested':
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
          <Sparkles className="h-3 w-3" />
          Propozycja AI
        </Badge>
      )
    case 'described':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <FileCheck className="h-3 w-3" />
          Opisana
        </Badge>
      )
  }
}

function getPaymentStatusBadge(status: Invoice['paymentStatus'], dueDate?: string) {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status === 'pending'
  
  if (status === 'paid') {
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Opłacona</Badge>
  }
  if (isOverdue) {
    return <Badge variant="destructive">Zaległe</Badge>
  }
  return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Oczekuje</Badge>
}

function formatCurrency(amount: number, currency: string = 'PLN') {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [filters, setFilters] = useState<InvoiceListParams>({
    orderBy: 'invoiceDate',
    orderDirection: 'desc',
    top: 100,
  })
  
  // Description status filter (client-side)
  const [descriptionFilter, setDescriptionFilter] = useState<DescriptionStatus | null>(null)
  
  // Document scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false)
  
  const { data, isLoading, refetch } = useInvoices(filters)
  
  const markAsPaidMutation = useMarkAsPaid()
  const deleteInvoiceMutation = useDeleteInvoice()
  const updateInvoiceMutation = useUpdateInvoice()

  // Apply client-side description filter
  const allInvoices = data?.invoices || []
  const invoices = descriptionFilter
    ? allInvoices.filter(i => getDescriptionStatus(i) === descriptionFilter)
    : allInvoices

  // Counts based on allInvoices (before description filter) for KPI display
  const pendingCount = allInvoices.filter(i => i.paymentStatus === 'pending').length
  const paidCount = allInvoices.filter(i => i.paymentStatus === 'paid').length
  const overdueCount = allInvoices.filter(i => 
    i.paymentStatus === 'pending' && 
    i.dueDate && 
    new Date(i.dueDate) < new Date()
  ).length

  // Description status counts (based on allInvoices)
  const notDescribedCount = allInvoices.filter(i => getDescriptionStatus(i) === 'not_described').length
  const aiSuggestedCount = allInvoices.filter(i => getDescriptionStatus(i) === 'ai_suggested').length
  const describedCount = allInvoices.filter(i => getDescriptionStatus(i) === 'described').length

  const handleFiltersChange = useCallback((newFilters: InvoiceListParams) => {
    setFilters(prev => ({
      ...newFilters,
      top: prev.top,
    }))
  }, [])

  function handleExport() {
    if (invoices.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma faktur do wyeksportowania',
        variant: 'destructive',
      })
      return
    }
    exportInvoicesToCsv(invoices)
    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${invoices.length} faktur do pliku CSV`,
      variant: 'success',
    })
  }

  async function handleMarkAsPaid(id: string, invoiceNumber: string) {
    try {
      await markAsPaidMutation.mutateAsync({ id })
      toast({
        title: 'Faktura opłacona',
        description: `Faktura ${invoiceNumber} została oznaczona jako opłacona`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się oznaczyć faktury',
        variant: 'destructive',
      })
    }
  }

  async function handleTogglePaymentStatus(id: string, invoiceNumber: string, currentStatus: 'pending' | 'paid') {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    try {
      await updateInvoiceMutation.mutateAsync({
        id,
        data: {
          paymentStatus: newStatus,
          paymentDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        },
      })
      toast({
        title: newStatus === 'paid' ? 'Faktura opłacona' : 'Status zmieniony',
        description: newStatus === 'paid' 
          ? `Faktura ${invoiceNumber} została oznaczona jako opłacona`
          : `Faktura ${invoiceNumber} została oznaczona jako nieopłacona`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zmienić statusu',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteInvoice(id: string, invoiceNumber: string) {
    try {
      await deleteInvoiceMutation.mutateAsync(id)
      toast({
        title: 'Faktura usunięta',
        description: `Faktura ${invoiceNumber} została usunięta`,
        variant: 'success',
      })
      refetch()
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się usunąć faktury',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Faktury
          </h1>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj fakturami kosztowymi z KSeF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setScannerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj fakturę
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odśwież
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Eksportuj
          </Button>
        </div>
      </div>

      {/* Quick Filters - Compact Horizontal Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            {/* All filter buttons spread evenly */}
            <Button
              variant={!filters.paymentStatus && !filters.overdue ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setFilters(f => ({ ...f, paymentStatus: undefined, overdue: undefined }))}
            >
              <FileText className="h-3.5 w-3.5" />
              Wszystkie
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{data?.count || 0}</Badge>
            </Button>
            <Button
              variant={filters.paymentStatus === 'pending' && !filters.overdue ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setFilters(f => ({ ...f, paymentStatus: 'pending', overdue: undefined }))}
            >
              <ArrowDownToLine className="h-3.5 w-3.5 text-orange-500" />
              Do opłacenia
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
            </Button>
            <Button
              variant={filters.overdue ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setFilters(f => ({ ...f, overdue: true, paymentStatus: undefined }))}
            >
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              Zaległe
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{overdueCount}</Badge>
            </Button>
            <Button
              variant={filters.paymentStatus === 'paid' ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setFilters(f => ({ ...f, paymentStatus: 'paid', overdue: undefined }))}
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Opłacone
              <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800">{paidCount}</Badge>
            </Button>
            
            {/* Separator */}
            <div className="h-6 w-px bg-border" />
            
            <Button
              variant={descriptionFilter === 'not_described' ? "default" : "ghost"}
              size="sm"
              className={descriptionFilter === 'not_described' ? "h-8 gap-1.5" : "h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"}
              onClick={() => setDescriptionFilter(f => f === 'not_described' ? null : 'not_described')}
            >
              <FileQuestion className="h-3.5 w-3.5" />
              Bez opisu
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{notDescribedCount}</Badge>
            </Button>
            <Button
              variant={descriptionFilter === 'ai_suggested' ? "default" : "ghost"}
              size="sm"
              className={descriptionFilter === 'ai_suggested' ? "h-8 gap-1.5" : "h-8 gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50"}
              onClick={() => setDescriptionFilter(f => f === 'ai_suggested' ? null : 'ai_suggested')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Propozycja AI
              <Badge className="ml-1 h-5 px-1.5 bg-purple-100 text-purple-800">{aiSuggestedCount}</Badge>
            </Button>
            <Button
              variant={descriptionFilter === 'described' ? "default" : "ghost"}
              size="sm"
              className={descriptionFilter === 'described' ? "h-8 gap-1.5" : "h-8 gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"}
              onClick={() => setDescriptionFilter(f => f === 'described' ? null : 'described')}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Opisane
              <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800">{describedCount}</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search & Advanced Filters */}
      <InvoiceFilters 
        filters={filters} 
        onChange={handleFiltersChange}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Brak faktur</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {Object.keys(filters).length > 3
                  ? 'Brak faktur spełniających kryteria wyszukiwania'
                  : 'Uruchom synchronizację, aby pobrać faktury z KSeF'}
              </p>
              <Button asChild className="mt-4">
                <Link href="/sync">Przejdź do synchronizacji</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer faktury</TableHead>
                  <TableHead>Data wystawienia</TableHead>
                  <TableHead>Dostawca</TableHead>
                  <TableHead className="text-right">Kwota brutto</TableHead>
                  <TableHead>Status opisu</TableHead>
                  <TableHead className="w-[120px] text-center">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onDoubleClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {invoice.referenceNumber?.slice(0, 25) || '-'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{invoice.supplierName}</div>
                          <div className="text-xs text-muted-foreground">
                            NIP: {invoice.supplierNip}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.grossAmount)}
                    </TableCell>
                    <TableCell>
                      {getDescriptionStatusBadge(getDescriptionStatus(invoice))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleTogglePaymentStatus(invoice.id, invoice.invoiceNumber, invoice.paymentStatus)}
                          disabled={updateInvoiceMutation.isPending}
                          title={invoice.paymentStatus === 'paid' ? 'Oznacz jako nieopłacone' : 'Oznacz jako opłacone'}
                        >
                          <CheckCircle 
                            className={`h-5 w-5 transition-colors ${invoice.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`} 
                          />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {invoice.source === 'Manual' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                title="Usuń fakturę"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Faktura {invoice.invoiceNumber} zostanie trwale usunięta.
                                  Tej operacji nie można cofnąć.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Usuń
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination info */}
      {invoices.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Wyświetlono {invoices.length} faktur
        </div>
      )}

      {/* Document Scanner Modal */}
      <DocumentScannerModal
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open)
          if (!open) {
            // Refresh list after closing (in case invoice was created)
            refetch()
          }
        }}
        onSkipToManual={() => {
          setScannerOpen(false)
          router.push('/invoices/new')
        }}
      />
    </div>
  )
}
