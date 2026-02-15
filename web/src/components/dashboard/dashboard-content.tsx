'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { api, queryKeys, DashboardStats } from '@/lib/api'
import { DashboardSkeleton } from '@/components/skeletons'
import { useCompanyContext } from '@/contexts/company-context'
import { AnimatedKpiCard, AnimatedCardGrid, AnimatedCardWrapper } from './animated-kpi-card'

// Colors for charts
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`
}

export function DashboardContent() {
  // Get selected company context
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  
  // Date range - default last 12 months
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear() - 1, today.getMonth(), 1)
  
  const [fromDate, setFromDate] = useState(defaultFrom.toISOString().split('T')[0])
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0])

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: queryKeys.dashboardStats({ fromDate, toDate, settingId: selectedCompany?.id }),
    queryFn: () => api.dashboard.stats({ fromDate, toDate, settingId: selectedCompany?.id }),
    enabled: !companyLoading && Boolean(selectedCompany?.id),
  })

  if (companyLoading || isLoading) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Brak danych do wyświetlenia
      </div>
    )
  }

  // Prepare chart data
  const monthlyData = stats.monthly.map(m => ({
    ...m,
    name: formatMonth(m.month),
  }))

  const mpkData = stats.byMpk.map(m => ({
    ...m,
    name: m.mpk,
  }))

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Okres:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Odśwież
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <AnimatedCardGrid className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          title="Liczba faktur"
          value={stats.totals.invoiceCount}
          format="number"
          icon={FileText}
          iconColor="#64748b"
          borderColor="#64748b"
          subtitle="w wybranym okresie"
          delay={0}
        />

        <AnimatedKpiCard
          title="Suma brutto"
          value={stats.totals.grossAmount}
          format="currency"
          icon={DollarSign}
          iconColor="#3b82f6"
          borderColor="#3b82f6"
          subtitle={`netto: ${formatCurrency(stats.totals.netAmount)}`}
          delay={0.1}
        />

        <AnimatedKpiCard
          title="Nieopłacone"
          value={stats.payments.pending.grossAmount}
          format="currency"
          icon={Clock}
          iconColor="#f59e0b"
          valueColor="#ca8a04"
          borderColor="#f59e0b"
          subtitle={`${stats.payments.pending.count} faktur oczekujących`}
          delay={0.2}
        />

        <AnimatedKpiCard
          title="Przeterminowane"
          value={stats.payments.overdue.grossAmount}
          format="currency"
          icon={AlertTriangle}
          iconColor="#ef4444"
          valueColor="#dc2626"
          borderColor="#ef4444"
          subtitle={`${stats.payments.overdue.count} faktur po terminie`}
          delay={0.3}
        />
      </AnimatedCardGrid>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly expenses chart */}
        <AnimatedCardWrapper delay={0.4}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Wydatki miesięczne
              </CardTitle>
              <CardDescription>Suma brutto w poszczególnych miesiącach</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value as number), 'Brutto']}
                      labelClassName="font-medium"
                    />
                    <Bar dataKey="grossAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>

        {/* MPK distribution pie chart */}
        <AnimatedCardWrapper delay={0.5}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Wydatki per MPK
              </CardTitle>
              <CardDescription>Rozkład kosztów według centrów kosztów</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mpkData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="grossAmount"
                    >
                      {mpkData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>
      </div>

      {/* Top suppliers table */}
      <AnimatedCardWrapper delay={0.6}>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top 10 dostawców
            </CardTitle>
            <CardDescription>Dostawcy z największą sumą faktur</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Dostawca</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">NIP</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Liczba faktur</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Suma brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topSuppliers.map((supplier, index) => (
                    <tr key={supplier.supplierNip} className="border-b last:border-0">
                      <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-2 font-medium">{supplier.supplierName}</td>
                      <td className="py-3 px-2 text-muted-foreground">{supplier.supplierNip}</td>
                      <td className="py-3 px-2 text-right">{supplier.invoiceCount}</td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(supplier.grossAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </AnimatedCardWrapper>

      {/* Payment status summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <AnimatedCardWrapper delay={0.7}>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: '#10b981' }}>
            <CardHeader className="pb-2 py-2 px-4">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Opłacone
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3">
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(stats.payments.paid.grossAmount)}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {stats.payments.paid.count} faktur
              </p>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>

        <AnimatedCardWrapper delay={0.8}>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
            <CardHeader className="pb-2 py-2 px-4">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Oczekujące
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3">
              <div className="text-2xl font-bold text-yellow-700">
                {formatCurrency(stats.payments.pending.grossAmount)}
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                {stats.payments.pending.count} faktur
              </p>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>

        <AnimatedCardWrapper delay={0.9}>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: '#ef4444' }}>
            <CardHeader className="pb-2 py-2 px-4">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Przeterminowane
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3">
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(stats.payments.overdue.grossAmount)}
              </div>
              <p className="text-xs text-red-600 mt-1">
                {stats.payments.overdue.count} faktur
              </p>
            </CardContent>
          </Card>
        </AnimatedCardWrapper>
      </div>
    </div>
  )
}
