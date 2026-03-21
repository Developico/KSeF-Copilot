'use client'

import { useMemo, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { formatCurrency as formatCurrencyUtil } from '@/lib/format'
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
  Folder,
  Wallet,
  Users,
  Workflow,
} from 'lucide-react'
import { useContextInvoices } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { Invoice } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedKpiCard, AnimatedCardGrid } from '@/components/dashboard/animated-kpi-card'
import { BudgetUtilizationTab } from '@/components/reports/budget-utilization-tab'
import { ApproverPerformanceTab } from '@/components/reports/approver-performance-tab'
import { InvoiceProcessingTab } from '@/components/reports/invoice-processing-tab'

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

interface MpkData {
  mpk: string
  invoiceCount: number
  totalGross: number
  percentage: number
}

export default function ReportsPage() {
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading, error, refetch } = useContextInvoices()
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  
  const invoices = data?.invoices ?? []

  // Locale-aware formatting
  const formatCurrency = useCallback((amount: number, currency: string = 'PLN') => {
    return formatCurrencyUtil(amount, currency, locale)
  }, [locale])

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
    const getShortMonth = (monthIndex: number) => {
      const date = new Date(2024, monthIndex, 1)
      return date.toLocaleDateString(locale, { month: 'short' })
    }
    
    // Initialize all months
    for (let i = 1; i <= 12; i++) {
      const key = i.toString().padStart(2, '0')
      months[key] = {
        month: getShortMonth(i - 1),
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
  }, [invoices, selectedYear, locale])

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
  const uncategorizedLabel = t('uncategorized')
  const categoryData = useMemo<CategoryData[]>(() => {
    const categories: Record<string, { count: number; total: number }> = {}
    let grandTotal = 0
    
    filteredInvoices.forEach(inv => {
      const cat = inv.category || uncategorizedLabel
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
  }, [filteredInvoices, uncategorizedLabel])

  // MPK breakdown
  const unassignedLabel = t('unassigned')
  const mpkData = useMemo<MpkData[]>(() => {
    const mpks: Record<string, { count: number; total: number }> = {}
    let grandTotal = 0
    
    filteredInvoices.forEach(inv => {
      const mpk = inv.mpk || unassignedLabel
      if (!mpks[mpk]) {
        mpks[mpk] = { count: 0, total: 0 }
      }
      mpks[mpk].count++
      mpks[mpk].total += inv.grossAmount
      grandTotal += inv.grossAmount
    })
    
    return Object.entries(mpks)
      .map(([mpk, data]) => ({
        mpk,
        invoiceCount: data.count,
        totalGross: data.total,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalGross - a.totalGross)
  }, [filteredInvoices, unassignedLabel])

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
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        {/* KPI cards skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">{t('loadingError')}</h2>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : t('loadingErrorDesc')}
        </p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('tryAgain')}
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
            {t('title')}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('subtitle')}
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
              <SelectValue placeholder={t('monthSelector.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('monthSelector.all')}</SelectItem>
              <SelectItem value="1">{t('monthSelector.january')}</SelectItem>
              <SelectItem value="2">{t('monthSelector.february')}</SelectItem>
              <SelectItem value="3">{t('monthSelector.march')}</SelectItem>
              <SelectItem value="4">{t('monthSelector.april')}</SelectItem>
              <SelectItem value="5">{t('monthSelector.may')}</SelectItem>
              <SelectItem value="6">{t('monthSelector.june')}</SelectItem>
              <SelectItem value="7">{t('monthSelector.july')}</SelectItem>
              <SelectItem value="8">{t('monthSelector.august')}</SelectItem>
              <SelectItem value="9">{t('monthSelector.september')}</SelectItem>
              <SelectItem value="10">{t('monthSelector.october')}</SelectItem>
              <SelectItem value="11">{t('monthSelector.november')}</SelectItem>
              <SelectItem value="12">{t('monthSelector.december')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="md:size-default">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{tCommon('refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <AnimatedCardGrid className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title={t('allInvoices')}
          value={summary.count}
          format="number"
          icon={FileText}
          iconColor="#64748b"
          borderColor="#64748b"
          subtitle={`${summary.uniqueSuppliers} ${t('suppliers')}`}
          delay={0}
        />
        <AnimatedKpiCard
          title={t('totalGross')}
          value={summary.total}
          format="currency"
          icon={TrendingUp}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`${t('average')} ${formatCurrency(summary.avgInvoice)} ${t('perInvoice')}`}
          delay={0.1}
        />
        <AnimatedKpiCard
          title={t('paidAmount')}
          value={summary.paid}
          format="currency"
          icon={CreditCard}
          iconColor="#10b981"
          valueColor="#16a34a"
          borderColor="#10b981"
          subtitle={`${summary.count > 0 ? ((summary.paid / summary.total) * 100).toFixed(1) : 0}% ${t('ofTotal')}`}
          delay={0.2}
        />
        <AnimatedKpiCard
          title={t('pendingAmount')}
          value={summary.pending}
          format="currency"
          icon={CreditCard}
          iconColor="#ef4444"
          valueColor="#dc2626"
          borderColor="#ef4444"
          subtitle={`${summary.count > 0 ? ((summary.pending / summary.total) * 100).toFixed(1) : 0}% ${t('ofTotal')}`}
          delay={0.3}
        />
      </AnimatedCardGrid>

      <Tabs defaultValue="monthly">
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger value="monthly">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t('tabs.monthly')}
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Building2 className="mr-2 h-4 w-4" />
            {t('tabs.suppliers')}
          </TabsTrigger>
          <TabsTrigger value="mpk">
            <Folder className="mr-2 h-4 w-4" />
            {t('tabs.mpk')}
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="mr-2 h-4 w-4" />
            {t('tabs.categories')}
          </TabsTrigger>
          <TabsTrigger value="budget">
            <Wallet className="mr-2 h-4 w-4" />
            {t('tabs.budget')}
          </TabsTrigger>
          <TabsTrigger value="approvers">
            <Users className="mr-2 h-4 w-4" />
            {t('tabs.approvers')}
          </TabsTrigger>
          <TabsTrigger value="processing">
            <Workflow className="mr-2 h-4 w-4" />
            {t('tabs.processing')}
          </TabsTrigger>
        </TabsList>

        {/* Monthly Chart */}
        <TabsContent value="monthly" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('monthly.title', { year: selectedYear })}</CardTitle>
              <CardDescription className="text-sm">
                {t('monthly.description')}
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
                    <span>{t('monthly.grossValue')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('monthly.detailsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.month')}</TableHead>
                      <TableHead className="text-right">{t('table.invoices')}</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">{t('table.net')}</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">{t('table.vat')}</TableHead>
                      <TableHead className="text-right">{t('table.gross')}</TableHead>
                      <TableHead className="text-right hidden md:table-cell">{t('table.paidCount')}</TableHead>
                      <TableHead className="text-right hidden md:table-cell">{t('table.pendingCount')}</TableHead>
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
                        {t('monthly.noInvoices')}
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
              <CardTitle className="text-lg md:text-xl">{t('suppliersTab.title')}</CardTitle>
              <CardDescription className="text-sm">
                {t('suppliersTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('table.supplier')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('table.nip')}</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">{t('table.invoices')}</TableHead>
                      <TableHead className="text-right">{t('table.totalGross')}</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">{t('table.avgInvoice')}</TableHead>
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
                          {t('suppliersTab.noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MPK Tab */}
        <TabsContent value="mpk" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('mpkTab.title')}</CardTitle>
              <CardDescription className="text-sm">
                {t('mpkTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {mpkData.map((item, idx) => (
                  <div key={item.mpk} className="space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge variant={item.mpk === unassignedLabel ? 'outline' : 'default'} className="shrink-0">
                          {item.mpk}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{t('mpkTab.invoicesCount', { count: item.invoiceCount })}</span>
                      </div>
                      <span className="font-medium text-sm shrink-0">{formatCurrency(item.totalGross)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${item.mpk === unassignedLabel ? 'bg-muted-foreground/50' : 'bg-blue-500'}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {item.percentage.toFixed(1)}% {t('ofTotal')}
                    </div>
                  </div>
                ))}
                {mpkData.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {t('mpkTab.noData')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* MPK Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('mpkTab.detailsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.mpk')}</TableHead>
                      <TableHead className="text-right">{t('table.invoices')}</TableHead>
                      <TableHead className="text-right">{t('table.totalGross')}</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">{t('table.avgInvoice')}</TableHead>
                      <TableHead className="text-right">{t('table.share')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mpkData.map((item) => (
                      <TableRow key={item.mpk}>
                        <TableCell>
                          <Badge variant={item.mpk === unassignedLabel ? 'outline' : 'secondary'}>
                            {item.mpk}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.invoiceCount}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalGross)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {formatCurrency(item.totalGross / item.invoiceCount)}
                        </TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                    {mpkData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t('mpkTab.noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Utilization Tab */}
        <TabsContent value="budget" className="mt-4 md:mt-6">
          <BudgetUtilizationTab />
        </TabsContent>

        {/* Approver Performance Tab */}
        <TabsContent value="approvers" className="mt-4 md:mt-6">
          <ApproverPerformanceTab />
        </TabsContent>

        {/* Invoice Processing Tab */}
        <TabsContent value="processing" className="mt-4 md:mt-6">
          <InvoiceProcessingTab />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('categoriesTab.title')}</CardTitle>
              <CardDescription className="text-sm">
                {t('categoriesTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {categoryData.map((cat) => (
                  <div key={cat.category} className="space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-medium text-sm truncate">{cat.category}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{t('categoriesTab.invoicesCount', { count: cat.invoiceCount })}</Badge>
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
                      {cat.percentage.toFixed(1)}% {t('ofTotal')}
                    </div>
                  </div>
                ))}
                {categoryData.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {t('categoriesTab.noData')}
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
