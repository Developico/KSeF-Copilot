'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Building2,
  Copy,
  CheckCircle,
  ExternalLink,
  Code,
  Receipt,
  CreditCard,
} from 'lucide-react'

interface InvoiceDetail {
  id: string
  ksefReferenceNumber: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  seller: {
    name: string
    nip: string
    address: string
    city: string
    postalCode: string
  }
  buyer: {
    name: string
    nip: string
    address: string
    city: string
    postalCode: string
  }
  items: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number
    netAmount: number
    vatRate: string
    vatAmount: number
    grossAmount: number
  }>
  netAmount: number
  vatAmount: number
  grossAmount: number
  currency: string
  direction: 'incoming' | 'outgoing'
  status: 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'error'
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  category?: string
  xmlContent?: string
  receivedAt: string
  processedAt?: string
}

// Mock data
const mockInvoice: InvoiceDetail = {
  id: '1',
  ksefReferenceNumber: '1234567890-20240115-1234567890ABCDEF',
  invoiceNumber: 'FV/2024/01/001',
  issueDate: '2024-01-15',
  dueDate: '2024-02-15',
  seller: {
    name: 'XYZ Services S.A.',
    nip: '1122334455',
    address: 'ul. Przykładowa 123',
    city: 'Warszawa',
    postalCode: '00-001',
  },
  buyer: {
    name: 'Developico Sp. z o.o.',
    nip: '1234567890',
    address: 'ul. Testowa 456',
    city: 'Kraków',
    postalCode: '30-001',
  },
  items: [
    {
      description: 'Usługi programistyczne - styczeń 2024',
      quantity: 160,
      unit: 'godz.',
      unitPrice: 150.00,
      netAmount: 24000.00,
      vatRate: '23%',
      vatAmount: 5520.00,
      grossAmount: 29520.00,
    },
    {
      description: 'Hosting serwerów - styczeń 2024',
      quantity: 1,
      unit: 'szt.',
      unitPrice: 500.00,
      netAmount: 500.00,
      vatRate: '23%',
      vatAmount: 115.00,
      grossAmount: 615.00,
    },
  ],
  netAmount: 24500.00,
  vatAmount: 5635.00,
  grossAmount: 30135.00,
  currency: 'PLN',
  direction: 'incoming',
  status: 'accepted',
  paymentStatus: 'unpaid',
  category: 'IT Services',
  receivedAt: '2024-01-16T10:30:00Z',
  processedAt: '2024-01-16T10:30:05Z',
  xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>2024-01-15T10:00:00</DataWytworzeniaFa>
    <SystemInfo>KSeF</SystemInfo>
  </Naglowek>
  <!-- ... more XML content ... -->
</Faktura>`,
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

function getStatusBadge(status: InvoiceDetail['status']) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    pending: 'outline',
    sent: 'default',
    accepted: 'default',
    rejected: 'destructive',
    error: 'destructive',
  }
  const labels: Record<string, string> = {
    draft: 'Szkic',
    pending: 'Oczekuje',
    sent: 'Wysłana',
    accepted: 'Zaakceptowana',
    rejected: 'Odrzucona',
    error: 'Błąd',
  }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

function getPaymentStatusBadge(status: InvoiceDetail['paymentStatus']) {
  switch (status) {
    case 'paid':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Opłacona</Badge>
    case 'partial':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Częściowo opłacona</Badge>
    case 'unpaid':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Nieopłacona</Badge>
    default:
      return null
  }
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [params.id])

  async function loadInvoice() {
    try {
      // TODO: Load from API
      // const response = await fetch(`/api/invoices/${params.id}`)
      // const data = await response.json()
      // setInvoice(data)
      
      // Mock data for now
      setInvoice(mockInvoice)
    } catch (error) {
      console.error('Failed to load invoice:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function copyKsefReference() {
    if (invoice) {
      await navigator.clipboard.writeText(invoice.ksefReferenceNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Nie znaleziono faktury</h2>
        <p className="text-muted-foreground mt-2">Faktura o podanym ID nie istnieje.</p>
        <Button asChild className="mt-4">
          <Link href="/invoices">Wróć do listy</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
              {getStatusBadge(invoice.status)}
              {getPaymentStatusBadge(invoice.paymentStatus)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {invoice.ksefReferenceNumber}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyKsefReference}>
                {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Pobierz XML
          </Button>
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Pobierz UPO
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parties */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Sprzedawca
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-semibold">{invoice.seller.name}</p>
                <p className="text-sm text-muted-foreground">NIP: {invoice.seller.nip}</p>
                <p className="text-sm text-muted-foreground">{invoice.seller.address}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.seller.postalCode} {invoice.seller.city}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Nabywca
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-semibold">{invoice.buyer.name}</p>
                <p className="text-sm text-muted-foreground">NIP: {invoice.buyer.nip}</p>
                <p className="text-sm text-muted-foreground">{invoice.buyer.address}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.buyer.postalCode} {invoice.buyer.city}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Pozycje faktury
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Opis</TableHead>
                    <TableHead className="text-right">Ilość</TableHead>
                    <TableHead className="text-right">Cena jedn.</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.netAmount, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-muted-foreground">{item.vatRate}</span>
                        <br />
                        {formatCurrency(item.vatAmount, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.grossAmount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">Razem:</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(invoice.netAmount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(invoice.vatAmount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(invoice.grossAmount, invoice.currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* XML Preview */}
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">
                <FileText className="mr-2 h-4 w-4" />
                Podgląd
              </TabsTrigger>
              <TabsTrigger value="xml">
                <Code className="mr-2 h-4 w-4" />
                XML
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Podgląd faktury w formacie graficznym będzie dostępny wkrótce.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="xml">
              <Card>
                <CardContent className="pt-6">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
                    {invoice.xmlContent}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Podsumowanie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Netto</span>
                <span>{formatCurrency(invoice.netAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="font-semibold">Do zapłaty</span>
                <span className="text-xl font-bold">
                  {formatCurrency(invoice.grossAmount, invoice.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data wystawienia</span>
                <span>{new Date(invoice.issueDate).toLocaleDateString('pl-PL')}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Termin płatności</span>
                  <span>{new Date(invoice.dueDate).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pobrano z KSeF</span>
                <span>{new Date(invoice.receivedAt).toLocaleDateString('pl-PL')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Płatność
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                {getPaymentStatusBadge(invoice.paymentStatus)}
              </div>
              {invoice.paymentStatus !== 'paid' && (
                <Button className="w-full">
                  Oznacz jako opłacone
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Category */}
          {invoice.category && (
            <Card>
              <CardHeader>
                <CardTitle>Kategoria</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{invoice.category}</Badge>
                <Button variant="link" className="ml-2 p-0 h-auto">
                  Zmień
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
