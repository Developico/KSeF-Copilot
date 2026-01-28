'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import { useInvoices, useMarkAsPaid } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceListParams } from '@/lib/api'
import { exportInvoicesToCsv } from '@/lib/export'
import { InvoiceFilters } from '@/components/invoices/invoice-filters'

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
  const { toast } = useToast()
  
  const [filters, setFilters] = useState<InvoiceListParams>({
    orderBy: 'invoiceDate',
    orderDirection: 'desc',
    top: 100,
  })
  
  const { data, isLoading, refetch } = useInvoices(filters)
  
  const markAsPaidMutation = useMarkAsPaid()

  const invoices = data?.invoices || []

  const pendingCount = invoices.filter(i => i.paymentStatus === 'pending').length
  const paidCount = invoices.filter(i => i.paymentStatus === 'paid').length
  const overdueCount = invoices.filter(i => 
    i.paymentStatus === 'pending' && 
    i.dueDate && 
    new Date(i.dueDate) < new Date()
  ).length

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faktury</h1>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj fakturami kosztowymi z KSeF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj fakturę
            </Button>
          </Link>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className="cursor-pointer hover:bg-muted/50" 
          onClick={() => setFilters(f => ({ ...f, paymentStatus: undefined, overdue: undefined }))}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Wszystkie</span>
            </div>
            <Badge variant="secondary">{data?.count || 0}</Badge>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50" 
          onClick={() => setFilters(f => ({ ...f, paymentStatus: 'pending', overdue: undefined }))}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Do opłacenia</span>
            </div>
            <Badge variant="secondary">{pendingCount}</Badge>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50" 
          onClick={() => setFilters(f => ({ ...f, overdue: true, paymentStatus: undefined }))}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium">Zaległe</span>
            </div>
            <Badge variant="destructive">{overdueCount}</Badge>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50" 
          onClick={() => setFilters(f => ({ ...f, paymentStatus: 'paid', overdue: undefined }))}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">Opłacone</span>
            </div>
            <Badge className="bg-green-100 text-green-800">{paidCount}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <InvoiceFilters 
            filters={filters} 
            onChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

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
                  <TableHead>Płatność</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
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
                      {getPaymentStatusBadge(invoice.paymentStatus, invoice.dueDate)}
                    </TableCell>
                    <TableCell>
                      {invoice.category ? (
                        <Badge variant="outline">{invoice.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {invoice.paymentStatus === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMarkAsPaid(invoice.id, invoice.invoiceNumber)}
                            disabled={markAsPaidMutation.isPending}
                            title="Oznacz jako opłacone"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
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
    </div>
  )
}
