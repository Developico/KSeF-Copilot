'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Building2,
  Copy,
  CheckCircle,
  Code,
  Receipt,
  CreditCard,
  RefreshCw,
  Tag,
} from 'lucide-react'
import { useInvoice, useUpdateInvoice, useMarkAsPaid } from '@/hooks/use-api'
import { Invoice } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

function formatCurrency(amount: number, currency: string = 'PLN') {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

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

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  const { toast } = useToast()
  
  const { data: invoice, isLoading, error } = useInvoice(invoiceId)
  const updateMutation = useUpdateInvoice()
  const markAsPaidMutation = useMarkAsPaid()
  
  const [copied, setCopied] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  async function copyKsefReference() {
    if (invoice) {
      await navigator.clipboard.writeText(invoice.referenceNumber)
      setCopied(true)
      toast({
        title: 'Skopiowano',
        description: 'Numer referencyjny KSeF skopiowany do schowka',
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleMarkAsPaid() {
    if (invoice) {
      try {
        await markAsPaidMutation.mutateAsync({ id: invoice.id })
        toast({
          variant: 'success',
          title: 'Sukces',
          description: `Faktura ${invoice.invoiceNumber} oznaczona jako opłacona`,
        })
      } catch (error) {
        console.error('Failed to mark as paid:', error)
        toast({
          variant: 'destructive',
          title: 'Błąd',
          description: 'Nie udało się oznaczyć faktury jako opłaconej',
        })
      }
    }
  }

  async function handleCategoryChange(category: string) {
    if (invoice) {
      setSelectedCategory(category)
      try {
        await updateMutation.mutateAsync({ 
          id: invoice.id, 
          data: { category } 
        })
        toast({
          variant: 'success',
          title: 'Kategoria zmieniona',
          description: `Przypisano kategorię: ${category}`,
        })
      } catch (error) {
        console.error('Failed to update category:', error)
        toast({
          variant: 'destructive',
          title: 'Błąd',
          description: 'Nie udało się zmienić kategorii',
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Nie znaleziono faktury</h2>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Faktura o podanym ID nie istnieje.'}
        </p>
        <Button asChild className="mt-4">
          <Link href="/invoices">Wróć do listy</Link>
        </Button>
      </div>
    )
  }

  const categories = ['IT Services', 'Office', 'Marketing', 'Travel', 'Equipment', 'Other']

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
              {getPaymentStatusBadge(invoice.paymentStatus)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {invoice.referenceNumber}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyKsefReference}>
                {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.xmlContent && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Pobierz XML
            </Button>
          )}
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
                <p className="font-semibold">{invoice.supplierName}</p>
                <p className="text-sm text-muted-foreground">NIP: {invoice.supplierNip}</p>
                {invoice.supplierAddress && (
                  <p className="text-sm text-muted-foreground">{invoice.supplierAddress}</p>
                )}
                {invoice.supplierPostalCode && invoice.supplierCity && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.supplierPostalCode} {invoice.supplierCity}
                  </p>
                )}
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
                <p className="font-semibold">{invoice.buyerName || invoice.tenantName}</p>
                <p className="text-sm text-muted-foreground">NIP: {invoice.buyerNip || invoice.tenantNip}</p>
                {invoice.buyerAddress && (
                  <p className="text-sm text-muted-foreground">{invoice.buyerAddress}</p>
                )}
                {invoice.buyerPostalCode && invoice.buyerCity && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.buyerPostalCode} {invoice.buyerCity}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          {invoice.items && invoice.items.length > 0 && (
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
          )}

          {/* XML Preview */}
          {invoice.xmlContent && (
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
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96">
                      {invoice.xmlContent}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
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
                <span>{new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Termin płatności</span>
                  <span>{new Date(invoice.dueDate).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zaimportowano</span>
                <span>{new Date(invoice.importedAt).toLocaleDateString('pl-PL')}</span>
              </div>
              {invoice.paymentDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opłacono</span>
                  <span>{new Date(invoice.paymentDate).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
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
              {invoice.paymentStatus === 'pending' && (
                <Button 
                  className="w-full" 
                  onClick={handleMarkAsPaid}
                  disabled={markAsPaidMutation.isPending}
                >
                  {markAsPaidMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Oznacz jako opłacone
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Kategoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select 
                value={selectedCategory || invoice.category || ''} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updateMutation.isPending && (
                <p className="text-xs text-muted-foreground">Zapisywanie...</p>
              )}
            </CardContent>
          </Card>

          {/* MPK */}
          {invoice.mpk && (
            <Card>
              <CardHeader>
                <CardTitle>MPK</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{invoice.mpk}</Badge>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {invoice.tags && invoice.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tagi</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {invoice.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
