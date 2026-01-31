'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  PieChart, 
  Building2,
  RefreshCw,
  FileText,
  CreditCard,
} from 'lucide-react'
import { useInvoices } from '@/hooks/use-api'
import { Invoice } from '@/lib/api'

function formatCurrency(amount: number, currency: string = 'PLN') {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

interface MonthlyData {
  month: string
  monthKey: string
  invoiceCount: number
  totalNet: number
  totalGross: number
  totalVat: number
  paidCount: number
  pendingCount: number
}

interface SupplierData {
  nip: string
  name: string
  invoiceCount: number
  totalGross: number
  avgInvoice: number
}

interface CategoryData {
  category: string
  invoiceCount: number
  totalGross: number
  percentage: number
}

export default function ReportsPage() {
  const { data, isLoading, error, refetch } = useInvoices()
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  
  const invoices = data?.invoices ?? []

  // Calculate available years from invoices
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    invoices.forEach(inv => {
      const year = new Date(inv.invoiceDate).getFullYear().toString()
      years.add(year)
    })
    return Array.from(years).sort().reverse()
  }, [invoices])

  // Filter invoices by selected period
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const date = new Date(inv.invoiceDate)
      if (date.getFullYear().toString() !== selectedYear) return false
      if (selectedMonth !== 'all' && (date.getMonth() + 1).toString() !== selectedMonth) return false
      return true
    })
  }, [invoices, selectedYear, selectedMonth])

  // Monthly aggregation
  const monthlyData = useMemo<MonthlyData[]>(() => {
    const months: Record<string, MonthlyData> = {}
    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    
    // Initialize all months
    for (let i = 1; i <= 12; i++) {
      const key = i.toString().padStart(2, '0')
      months[key] = {
        month: monthNames[i - 1],
        monthKey: key,
        invoiceCount: 0,
        totalNet: 0,
        totalGross: 0,
        totalVat: 0,
        paidCount: 0,
        pendingCount: 0,
      }
    }
    
    // Aggregate data
    invoices.forEach(inv => {
      const date = new Date(inv.invoiceDate)
      if (date.getFullYear().toString() !== selectedYear) return
      
      const monthKey = (date.getMonth() + 1).toString().padStart(2, '0')
      const m = months[monthKey]
      m.invoiceCount++
      m.totalNet += inv.netAmount
      m.totalGross += inv.grossAmount
      m.totalVat += inv.vatAmount
      if (inv.paymentStatus === 'paid') m.paidCount++
      else m.pendingCount++
    })
    
    return Object.values(months)
  }, [invoices, selectedYear])

  // Top suppliers
  const topSuppliers = useMemo<SupplierData[]>(() => {
    const suppliers: Record<string, SupplierData> = {}
    
    filteredInvoices.forEach(inv => {
      if (!suppliers[inv.supplierNip]) {
        suppliers[inv.supplierNip] = {
          nip: inv.supplierNip,
          name: inv.supplierName,
          invoiceCount: 0,
          totalGross: 0,
          avgInvoice: 0,
        }
      }
      suppliers[inv.supplierNip].invoiceCount++
      suppliers[inv.supplierNip].totalGross += inv.grossAmount
    })
    
    return Object.values(suppliers)
      .map(s => ({ ...s, avgInvoice: s.totalGross / s.invoiceCount }))
      .sort((a, b) => b.totalGross - a.totalGross)
      .slice(0, 10)
  }, [filteredInvoices])

  // Category breakdown
  const categoryData = useMemo<CategoryData[]>(() => {
    const categories: Record<string, { count: number; total: number }> = {}
    let grandTotal = 0
    
    filteredInvoices.forEach(inv => {
      const cat = inv.category || 'Nieskategoryzowane'
      if (!categories[cat]) {
        categories[cat] = { count: 0, total: 0 }
      }
      categories[cat].count++
      categories[cat].total += inv.grossAmount
      grandTotal += inv.grossAmount
    })
    
    return Object.entries(categories)
      .map(([category, data]) => ({
        category,
        invoiceCount: data.count,
        totalGross: data.total,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalGross - a.totalGross)
  }, [filteredInvoices])

  // Summary stats
  const summary = useMemo(() => {
    const total = filteredInvoices.reduce((acc, inv) => acc + inv.grossAmount, 0)
    const paid = filteredInvoices.filter(i => i.paymentStatus === 'paid').reduce((acc, inv) => acc + inv.grossAmount, 0)
    const pending = filteredInvoices.filter(i => i.paymentStatus === 'pending').reduce((acc, inv) => acc + inv.grossAmount, 0)
    const avgInvoice = filteredInvoices.length > 0 ? total / filteredInvoices.length : 0
    
    return {
      count: filteredInvoices.length,
      total,
      paid,
      pending,
      avgInvoice,
      uniqueSuppliers: new Set(filteredInvoices.map(i => i.supplierNip)).size,
    }
  }, [filteredInvoices])

  // Find max value for chart bars
  const maxMonthlyGross = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.totalGross), 1)
  }, [monthlyData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Błąd ładowania danych</h2>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Nie udało się załadować raportów'}
        </p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Spróbuj ponownie
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 md:h-7 md:w-7" />
            Raporty
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Analizy i statystyki faktur kosztowych
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] md:w-[120px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))
              ) : (
                <SelectItem value={new Date().getFullYear().toString()}>
                  {new Date().getFullYear()}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[120px] md:w-[140px]">
              <SelectValue placeholder="Miesiąc" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cały rok</SelectItem>
              <SelectItem value="1">Styczeń</SelectItem>
              <SelectItem value="2">Luty</SelectItem>
              <SelectItem value="3">Marzec</SelectItem>
              <SelectItem value="4">Kwiecień</SelectItem>
              <SelectItem value="5">Maj</SelectItem>
              <SelectItem value="6">Czerwiec</SelectItem>
              <SelectItem value="7">Lipiec</SelectItem>
              <SelectItem value="8">Sierpień</SelectItem>
              <SelectItem value="9">Wrzesień</SelectItem>
              <SelectItem value="10">Październik</SelectItem>
              <SelectItem value="11">Listopad</SelectItem>
              <SelectItem value="12">Grudzień</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="md:size-default">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Odśwież</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Wszystkie faktury</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{summary.count}</div>
            <p className="text-xs text-muted-foreground">
              {summary.uniqueSuppliers} dostawców
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Suma brutto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{formatCurrency(summary.total)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">Średnio</span> {formatCurrency(summary.avgInvoice)}<span className="hidden sm:inline"> / faktura</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Opłacone</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(summary.paid)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.count > 0 ? ((summary.paid / summary.total) * 100).toFixed(1) : 0}% całości
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Do zapłaty</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-red-600">{formatCurrency(summary.pending)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.count > 0 ? ((summary.pending / summary.total) * 100).toFixed(1) : 0}% całości
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger value="monthly">
            <BarChart3 className="mr-2 h-4 w-4" />
            Miesięcznie
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Building2 className="mr-2 h-4 w-4" />
            Dostawcy
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="mr-2 h-4 w-4" />
            Kategorie
          </TabsTrigger>
        </TabsList>

        {/* Monthly Chart */}
        <TabsContent value="monthly" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Koszty miesięczne - {selectedYear}</CardTitle>
              <CardDescription className="text-sm">
                Wartość brutto faktur w poszczególnych miesiącach
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simple Bar Chart */}
              <div className="space-y-4">
                <div className="flex items-end gap-1 md:gap-2 h-48 md:h-64">
                  {monthlyData.map((m) => (
                    <div key={m.monthKey} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end h-36 md:h-48">
                        <div 
                          className="w-full max-w-6 md:max-w-8 bg-primary rounded-t transition-all hover:bg-primary/80"
                          style={{ 
                            height: `${(m.totalGross / maxMonthlyGross) * 100}%`,
                            minHeight: m.totalGross > 0 ? '4px' : '0'
                          }}
                          title={formatCurrency(m.totalGross)}
                        />
                      </div>
                      <span className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">{m.month}</span>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded" />
                    <span>Wartość brutto</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Szczegóły miesięczne</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Miesiąc</TableHead>
                      <TableHead className="text-right">Faktury</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Netto</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">VAT</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Opłacone</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Oczekujące</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {monthlyData.filter(m => m.invoiceCount > 0).map((m) => (
                    <TableRow key={m.monthKey}>
                      <TableCell className="font-medium text-sm">{m.month} {selectedYear}</TableCell>
                      <TableCell className="text-right">{m.invoiceCount}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{formatCurrency(m.totalNet)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{formatCurrency(m.totalVat)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(m.totalGross)}</TableCell>
                      <TableCell className="text-right text-green-600 hidden md:table-cell">{m.paidCount}</TableCell>
                      <TableCell className="text-right text-red-600 hidden md:table-cell">{m.pendingCount}</TableCell>
                    </TableRow>
                  ))}
                  {monthlyData.filter(m => m.invoiceCount > 0).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Brak faktur w wybranym okresie
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Top 10 dostawców</CardTitle>
              <CardDescription className="text-sm">
                Dostawcy z największą wartością faktur w wybranym okresie
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Dostawca</TableHead>
                      <TableHead className="hidden md:table-cell">NIP</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Faktury</TableHead>
                      <TableHead className="text-right">Suma brutto</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Średnia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSuppliers.map((supplier, idx) => (
                      <TableRow key={supplier.nip}>
                        <TableCell>
                          <Badge variant={idx < 3 ? 'default' : 'outline'}>{idx + 1}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{supplier.name}</span>
                            <span className="text-xs text-muted-foreground md:hidden font-mono">{supplier.nip}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm hidden md:table-cell">{supplier.nip}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{supplier.invoiceCount}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{formatCurrency(supplier.totalGross)}</TableCell>
                        <TableCell className="text-right hidden lg:table-cell">{formatCurrency(supplier.avgInvoice)}</TableCell>
                      </TableRow>
                    ))}
                    {topSuppliers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Brak danych o dostawcach
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Podział wg kategorii</CardTitle>
              <CardDescription className="text-sm">
                Rozkład kosztów według kategorii faktur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {categoryData.map((cat) => (
                  <div key={cat.category} className="space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-medium text-sm truncate">{cat.category}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{cat.invoiceCount} faktur</Badge>
                      </div>
                      <span className="font-medium text-sm shrink-0">{formatCurrency(cat.totalGross)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {cat.percentage.toFixed(1)}% całości
                    </div>
                  </div>
                ))}
                {categoryData.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Brak danych o kategoriach
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
