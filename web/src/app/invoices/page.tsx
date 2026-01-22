'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  Building2,
  RefreshCw,
} from 'lucide-react'

interface Invoice {
  id: string
  ksefReferenceNumber: string
  invoiceNumber: string
  issueDate: string
  sellerName: string
  sellerNip: string
  buyerName: string
  buyerNip: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  currency: string
  direction: 'incoming' | 'outgoing'
  status: 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'error'
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  category?: string
}

// Mock data
const mockInvoices: Invoice[] = [
  {
    id: '1',
    ksefReferenceNumber: '1234567890-20240115-1234567890ABCDEF',
    invoiceNumber: 'FV/2024/01/001',
    issueDate: '2024-01-15',
    sellerName: 'Developico Sp. z o.o.',
    sellerNip: '1234567890',
    buyerName: 'ABC Sp. z o.o.',
    buyerNip: '0987654321',
    netAmount: 10000.00,
    vatAmount: 2300.00,
    grossAmount: 12300.00,
    currency: 'PLN',
    direction: 'outgoing',
    status: 'accepted',
    paymentStatus: 'paid',
  },
  {
    id: '2',
    ksefReferenceNumber: '0987654321-20240116-ABCDEF1234567890',
    invoiceNumber: 'FV/2024/01/123',
    issueDate: '2024-01-16',
    sellerName: 'XYZ Services S.A.',
    sellerNip: '1122334455',
    buyerName: 'Developico Sp. z o.o.',
    buyerNip: '1234567890',
    netAmount: 5000.00,
    vatAmount: 1150.00,
    grossAmount: 6150.00,
    currency: 'PLN',
    direction: 'incoming',
    status: 'accepted',
    paymentStatus: 'unpaid',
    category: 'IT Services',
  },
  {
    id: '3',
    ksefReferenceNumber: '5566778899-20240117-FEDCBA0987654321',
    invoiceNumber: 'FV/01/2024/456',
    issueDate: '2024-01-17',
    sellerName: 'Office Supplies Ltd.',
    sellerNip: '9988776655',
    buyerName: 'Developico Sp. z o.o.',
    buyerNip: '1234567890',
    netAmount: 1200.00,
    vatAmount: 276.00,
    grossAmount: 1476.00,
    currency: 'PLN',
    direction: 'incoming',
    status: 'accepted',
    paymentStatus: 'partial',
    category: 'Office',
  },
]

function getStatusBadgeVariant(status: Invoice['status']) {
  switch (status) {
    case 'draft': return 'secondary'
    case 'pending': return 'outline'
    case 'sent': return 'default'
    case 'accepted': return 'default'
    case 'rejected': return 'destructive'
    case 'error': return 'destructive'
    default: return 'secondary'
  }
}

function getStatusLabel(status: Invoice['status']) {
  switch (status) {
    case 'draft': return 'Szkic'
    case 'pending': return 'Oczekuje'
    case 'sent': return 'Wysłana'
    case 'accepted': return 'Zaakceptowana'
    case 'rejected': return 'Odrzucona'
    case 'error': return 'Błąd'
    default: return status
  }
}

function getPaymentStatusBadge(status: Invoice['paymentStatus']) {
  switch (status) {
    case 'paid':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Opłacona</Badge>
    case 'partial':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Częściowo</Badge>
    case 'unpaid':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Nieopłacona</Badge>
    default:
      return null
  }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export default function InvoicesPage() {
  const searchParams = useSearchParams()
  const initialDirection = searchParams.get('direction') || 'all'
  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState(initialDirection)

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    try {
      // TODO: Load from API
      // const response = await fetch('/api/invoices')
      // const data = await response.json()
      // setInvoices(data)
      
      // Mock data for now
      setInvoices(mockInvoices)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    // Direction filter
    if (activeTab !== 'all' && invoice.direction !== activeTab) {
      return false
    }
    
    // Status filter
    if (statusFilter !== 'all' && invoice.status !== statusFilter) {
      return false
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.sellerName.toLowerCase().includes(query) ||
        invoice.buyerName.toLowerCase().includes(query) ||
        invoice.ksefReferenceNumber.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const incomingCount = invoices.filter(i => i.direction === 'incoming').length
  const outgoingCount = invoices.filter(i => i.direction === 'outgoing').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faktury</h1>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj fakturami z KSeF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadInvoices}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odśwież
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Eksportuj
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze, nazwie kontrahenta lub numerze KSeF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie statusy</SelectItem>
                  <SelectItem value="draft">Szkic</SelectItem>
                  <SelectItem value="pending">Oczekuje</SelectItem>
                  <SelectItem value="sent">Wysłana</SelectItem>
                  <SelectItem value="accepted">Zaakceptowana</SelectItem>
                  <SelectItem value="rejected">Odrzucona</SelectItem>
                  <SelectItem value="error">Błąd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            <FileText className="mr-2 h-4 w-4" />
            Wszystkie ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="incoming">
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Przychodzące ({incomingCount})
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            <ArrowUpFromLine className="mr-2 h-4 w-4" />
            Wychodzące ({outgoingCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
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
                    {searchQuery || statusFilter !== 'all'
                      ? 'Brak faktur spełniających kryteria wyszukiwania'
                      : 'Uruchom synchronizację, aby pobrać faktury z KSeF'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numer faktury</TableHead>
                      <TableHead>Data wystawienia</TableHead>
                      <TableHead>Kontrahent</TableHead>
                      <TableHead className="text-right">Kwota brutto</TableHead>
                      <TableHead>Status KSeF</TableHead>
                      <TableHead>Płatność</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invoice.direction === 'incoming' ? (
                              <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                            ) : (
                              <ArrowUpFromLine className="h-4 w-4 text-green-500" />
                            )}
                            <div>
                              <div className="font-medium">{invoice.invoiceNumber}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {invoice.ksefReferenceNumber.slice(0, 20)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(invoice.issueDate).toLocaleDateString('pl-PL')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {invoice.direction === 'incoming' 
                                  ? invoice.sellerName 
                                  : invoice.buyerName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                NIP: {invoice.direction === 'incoming' 
                                  ? invoice.sellerNip 
                                  : invoice.buyerNip}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.grossAmount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {getStatusLabel(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(invoice.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/invoices/${invoice.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
