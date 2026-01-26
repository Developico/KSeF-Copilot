'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  ArrowDownToLine,
  Calendar,
  Building2,
  RefreshCw,
  CheckCircle,
} from 'lucide-react'
import { useInvoices, useMarkAsPaid } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import { Invoice } from '@/lib/api'
import { exportInvoicesToCsv } from '@/lib/export'

function getPaymentStatusBadge(status: Invoice['paymentStatus']) {
  switch (status) {
    case 'paid':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Opłacona</Badge>
    case 'pending':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Nieopłacona</Badge>
    default:
      return null
  }
}

function formatCurrency(amount: number, currency: string = 'PLN') {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export default function InvoicesPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const initialPaymentStatus = searchParams.get('paymentStatus') || 'all'
  
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<string>(initialPaymentStatus)
  
  const { data, isLoading, refetch } = useInvoices({
    paymentStatus: paymentFilter !== 'all' ? paymentFilter as 'pending' | 'paid' : undefined,
  })
  
  const markAsPaidMutation = useMarkAsPaid()

  const invoices = data?.invoices || []

  const filteredInvoices = invoices.filter(invoice => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.supplierName.toLowerCase().includes(query) ||
        invoice.referenceNumber.toLowerCase().includes(query) ||
        invoice.supplierNip.includes(query)
      )
    }
    return true
  })

  const pendingCount = invoices.filter(i => i.paymentStatus === 'pending').length
  const paidCount = invoices.filter(i => i.paymentStatus === 'paid').length

  function handleExport() {
    if (filteredInvoices.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma faktur do wyeksportowania',
        variant: 'destructive',
      })
      return
    }
    exportInvoicesToCsv(filteredInvoices)
    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${filteredInvoices.length} faktur do pliku CSV`,
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setPaymentFilter('all')}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Wszystkie</span>
            </div>
            <Badge variant="secondary">{invoices.length}</Badge>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setPaymentFilter('pending')}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Do opłacenia</span>
            </div>
            <Badge variant="destructive">{pendingCount}</Badge>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setPaymentFilter('paid')}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">Opłacone</span>
            </div>
            <Badge className="bg-green-100 text-green-800">{paidCount}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze, dostawcy lub numerze KSeF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Płatność" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="pending">Nieopłacone</SelectItem>
                  <SelectItem value="paid">Opłacone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Brak faktur</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || paymentFilter !== 'all'
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
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {invoice.referenceNumber.slice(0, 25)}...
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
                      {getPaymentStatusBadge(invoice.paymentStatus)}
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
      {filteredInvoices.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Wyświetlono {filteredInvoices.length} z {invoices.length} faktur
        </div>
      )}
    </div>
  )
}
