'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Download,
  Eye,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
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
  Filter,
  Folder,
  Tag,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useInvoices, useMarkAsPaid, useDeleteInvoice, useUpdateInvoice } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceListParams } from '@/lib/api'
import { exportInvoicesToCsv } from '@/lib/export'
import { InvoiceFilters, GroupBy, SortColumn, SortDirection } from '@/components/invoices/invoice-filters'
import { InvoiceMobileCard } from '@/components/invoices/invoice-mobile-card'
import { DocumentScannerModal } from '@/components/documents'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
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

// ============================================================================
// Grouping Types
// ============================================================================

interface InvoiceGroup {
  key: string
  label: string
  invoices: Invoice[]
  totalGross: number
}

const MONTH_NAMES_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Mobile detection - use sm breakpoint (640px) for card/table switch
  const [isMobile, setIsMobile] = useState(false)
  // Tablet detection - between sm and lg (640px - 1024px) for filters layout
  const [isTablet, setIsTablet] = useState(false)
  
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth
      setIsMobile(width < 640) // sm breakpoint
      setIsTablet(width >= 640 && width < 1024) // between sm and lg
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])
  
  const [filters, setFilters] = useState<InvoiceListParams>({
    orderBy: 'invoiceDate',
    orderDirection: 'desc',
    top: 100,
  })
  
  // Description status filter (client-side)
  const [descriptionFilter, setDescriptionFilter] = useState<DescriptionStatus | null>(null)
  
  // Document scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false)
  
  // Mobile filters drawer state
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  
  // Grouping and sorting state
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const [sortColumn, setSortColumn] = useState<SortColumn>('invoiceDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  
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

  // Extract unique MPKs and categories for filter dropdowns
  const availableMpks = useMemo(() => {
    const mpks = new Set<string>()
    allInvoices.forEach(inv => {
      if (inv.mpk) mpks.add(inv.mpk)
      if (inv.aiMpkSuggestion) mpks.add(inv.aiMpkSuggestion)
    })
    return Array.from(mpks).sort((a, b) => a.localeCompare(b, 'pl'))
  }, [allInvoices])

  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    allInvoices.forEach(inv => {
      if (inv.category) categories.add(inv.category)
      if (inv.aiCategorySuggestion) categories.add(inv.aiCategorySuggestion)
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'pl'))
  }, [allInvoices])

  // Sort invoices
  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices]
    const dirMultiplier = sortDirection === 'desc' ? -1 : 1
    
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'invoiceNumber':
          comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', 'pl', { numeric: true })
          break
        case 'invoiceDate':
          const dateA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0
          const dateB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
          comparison = dateA - dateB
          break
        case 'dueDate':
          const dueA = a.dueDate ? new Date(a.dueDate).getTime() : 0
          const dueB = b.dueDate ? new Date(b.dueDate).getTime() : 0
          comparison = dueA - dueB
          break
        case 'grossAmount':
          comparison = (a.grossAmount || 0) - (b.grossAmount || 0)
          break
        case 'supplierName':
          comparison = (a.supplierName || '').localeCompare(b.supplierName || '', 'pl')
          break
        default:
          comparison = 0
      }
      return comparison * dirMultiplier
    })
    
    return sorted
  }, [invoices, sortColumn, sortDirection])

  // Group invoices
  const groupedInvoices = useMemo<InvoiceGroup[]>(() => {
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: 'Wszystkie faktury',
        invoices: sortedInvoices,
        totalGross: sortedInvoices.reduce((sum, i) => sum + i.grossAmount, 0),
      }]
    }

    const groups: Record<string, InvoiceGroup> = {}

    for (const invoice of sortedInvoices) {
      let key: string
      let label: string

      switch (groupBy) {
        case 'date': {
          const date = invoice.invoiceDate ? new Date(invoice.invoiceDate) : null
          if (date) {
            const year = date.getFullYear()
            const month = date.getMonth()
            key = `${year}-${String(month + 1).padStart(2, '0')}`
            label = `${MONTH_NAMES_PL[month]} ${year}`
          } else {
            key = 'unknown'
            label = 'Brak daty'
          }
          break
        }
        case 'mpk':
          key = invoice.mpk || 'brak'
          label = invoice.mpk || 'Brak MPK'
          break
        case 'category':
          key = invoice.category || 'brak'
          label = invoice.category || 'Brak kategorii'
          break
        default:
          key = 'all'
          label = 'Wszystkie'
      }

      if (!groups[key]) {
        groups[key] = { key, label, invoices: [], totalGross: 0 }
      }
      groups[key].invoices.push(invoice)
      groups[key].totalGross += invoice.grossAmount
    }

    // Sort groups - for date descending, for others alphabetically
    const sortedGroups = Object.values(groups)
    if (groupBy === 'date') {
      sortedGroups.sort((a, b) => b.key.localeCompare(a.key)) // Newest first
    } else {
      sortedGroups.sort((a, b) => {
        // 'brak' always at the end
        if (a.key === 'brak') return 1
        if (b.key === 'brak') return -1
        return a.label.localeCompare(b.label, 'pl')
      })
    }

    return sortedGroups
  }, [sortedInvoices, groupBy])

  // Toggle group collapse
  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 md:h-7 md:w-7" />
            Faktury
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Przeglądaj i zarządzaj fakturami kosztowymi z KSeF
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile: Filters button */}
          {isMobile && (
            <Sheet open={filtersDrawerOpen} onOpenChange={setFiltersDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtry
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtry</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  {/* Quick filters in drawer */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Status płatności</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={!filters.paymentStatus && !filters.overdue ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setFilters(f => ({ ...f, paymentStatus: undefined, overdue: undefined })); setFiltersDrawerOpen(false) }}
                      >
                        Wszystkie <Badge variant="secondary" className="ml-1">{data?.count || 0}</Badge>
                      </Button>
                      <Button
                        variant={filters.paymentStatus === 'pending' && !filters.overdue ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setFilters(f => ({ ...f, paymentStatus: 'pending', overdue: undefined })); setFiltersDrawerOpen(false) }}
                      >
                        Do opłacenia <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
                      </Button>
                      <Button
                        variant={filters.overdue ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setFilters(f => ({ ...f, overdue: true, paymentStatus: undefined })); setFiltersDrawerOpen(false) }}
                      >
                        Zaległe <Badge variant="destructive" className="ml-1">{overdueCount}</Badge>
                      </Button>
                      <Button
                        variant={filters.paymentStatus === 'paid' ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setFilters(f => ({ ...f, paymentStatus: 'paid', overdue: undefined })); setFiltersDrawerOpen(false) }}
                      >
                        Opłacone <Badge className="ml-1 bg-green-100 text-green-800">{paidCount}</Badge>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Status opisu</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={descriptionFilter === 'not_described' ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setDescriptionFilter(f => f === 'not_described' ? null : 'not_described'); setFiltersDrawerOpen(false) }}
                      >
                        <FileQuestion className="h-3.5 w-3.5 mr-1" />
                        Bez opisu <Badge variant="destructive" className="ml-1">{notDescribedCount}</Badge>
                      </Button>
                      <Button
                        variant={descriptionFilter === 'ai_suggested' ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setDescriptionFilter(f => f === 'ai_suggested' ? null : 'ai_suggested'); setFiltersDrawerOpen(false) }}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Propozycja AI <Badge className="ml-1 bg-purple-100 text-purple-800">{aiSuggestedCount}</Badge>
                      </Button>
                      <Button
                        variant={descriptionFilter === 'described' ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setDescriptionFilter(f => f === 'described' ? null : 'described'); setFiltersDrawerOpen(false) }}
                      >
                        <FileCheck className="h-3.5 w-3.5 mr-1" />
                        Opisane <Badge className="ml-1 bg-green-100 text-green-800">{describedCount}</Badge>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Grouping & Sorting in mobile drawer */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Grupowanie</p>
                      <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Data (miesiąc)</SelectItem>
                          <SelectItem value="mpk">MPK</SelectItem>
                          <SelectItem value="category">Kategoria</SelectItem>
                          <SelectItem value="none">Brak grupowania</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Sortowanie</p>
                      <div className="flex gap-2">
                        <Select value={sortColumn} onValueChange={(v) => setSortColumn(v as SortColumn)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invoiceDate">Data faktury</SelectItem>
                            <SelectItem value="dueDate">Termin płatności</SelectItem>
                            <SelectItem value="grossAmount">Kwota brutto</SelectItem>
                            <SelectItem value="supplierName">Dostawca</SelectItem>
                            <SelectItem value="invoiceNumber">Numer faktury</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as SortDirection)}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Malejąco</SelectItem>
                            <SelectItem value="asc">Rosnąco</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Advanced filters */}
                  <div className="pt-4 border-t">
                    <InvoiceFilters 
                      filters={filters} 
                      onChange={handleFiltersChange}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <Button onClick={() => setScannerOpen(true)} size={isMobile ? "sm" : "default"}>
            <Plus className="mr-2 h-4 w-4" />
            {!isMobile && "Dodaj fakturę"}
          </Button>
          <Button variant="outline" onClick={() => refetch()} size={isMobile ? "sm" : "default"}>
            <RefreshCw className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Odśwież</span>}
          </Button>
          {!isMobile && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Eksportuj
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters - Show on tablet and desktop */}
      {!isMobile && (
      <Card>
        <CardContent className="py-3 px-4">
          {/* Tablet: 2 rows with wrapping / Desktop: single row */}
          <div className={`flex items-center gap-2 ${isTablet ? 'flex-wrap justify-start' : 'justify-between'}`}>
            {/* Payment status filters */}
            <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
              <Button
                variant={!filters.paymentStatus && !filters.overdue ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1 lg:gap-1.5"
                onClick={() => setFilters(f => ({ ...f, paymentStatus: undefined, overdue: undefined }))}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Wszystkie</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{data?.count || 0}</Badge>
              </Button>
              <Button
                variant={filters.paymentStatus === 'pending' && !filters.overdue ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1 lg:gap-1.5"
                onClick={() => setFilters(f => ({ ...f, paymentStatus: 'pending', overdue: undefined }))}
              >
                <ArrowDownToLine className="h-3.5 w-3.5 text-orange-500" />
                <span className="hidden md:inline">Do opłacenia</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
              </Button>
              <Button
                variant={filters.overdue ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1 lg:gap-1.5"
                onClick={() => setFilters(f => ({ ...f, overdue: true, paymentStatus: undefined }))}
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="hidden md:inline">Zaległe</span>
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{overdueCount}</Badge>
              </Button>
              <Button
                variant={filters.paymentStatus === 'paid' ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1 lg:gap-1.5"
                onClick={() => setFilters(f => ({ ...f, paymentStatus: 'paid', overdue: undefined }))}
              >
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="hidden md:inline">Opłacone</span>
                <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800">{paidCount}</Badge>
              </Button>
            </div>
            
            {/* Separator - hidden on tablet */}
            <div className="h-6 w-px bg-border hidden lg:block" />
            
            {/* Description status filters */}
            <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
              <Button
                variant={descriptionFilter === 'not_described' ? "default" : "ghost"}
                size="sm"
                className={descriptionFilter === 'not_described' ? "h-8 gap-1 lg:gap-1.5" : "h-8 gap-1 lg:gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"}
                onClick={() => setDescriptionFilter(f => f === 'not_described' ? null : 'not_described')}
              >
                <FileQuestion className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Bez opisu</span>
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{notDescribedCount}</Badge>
              </Button>
              <Button
                variant={descriptionFilter === 'ai_suggested' ? "default" : "ghost"}
                size="sm"
                className={descriptionFilter === 'ai_suggested' ? "h-8 gap-1 lg:gap-1.5" : "h-8 gap-1 lg:gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50"}
                onClick={() => setDescriptionFilter(f => f === 'ai_suggested' ? null : 'ai_suggested')}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Propozycja AI</span>
                <Badge className="ml-1 h-5 px-1.5 bg-purple-100 text-purple-800">{aiSuggestedCount}</Badge>
              </Button>
              <Button
                variant={descriptionFilter === 'described' ? "default" : "ghost"}
                size="sm"
                className={descriptionFilter === 'described' ? "h-8 gap-1 lg:gap-1.5" : "h-8 gap-1 lg:gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"}
                onClick={() => setDescriptionFilter(f => f === 'described' ? null : 'described')}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Opisane</span>
                <Badge className="ml-1 h-5 px-1.5 bg-green-100 text-green-800">{describedCount}</Badge>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Search, Advanced Filters & Grouping - Desktop only */}
      {!isMobile && (
        <InvoiceFilters 
          filters={filters} 
          onChange={handleFiltersChange}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          availableMpks={availableMpks}
          availableCategories={availableCategories}
        />
      )}

      {/* Mobile: Card view / Desktop: Table */}
      {isMobile ? (
        // Mobile card view with grouping
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Brak faktur</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Uruchom synchronizację, aby pobrać faktury z KSeF
                </p>
                <Button asChild className="mt-4">
                  <Link href="/sync">Przejdź do synchronizacji</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            groupedInvoices.map((group) => (
              <div key={group.key} className="space-y-2">
                {/* Group header */}
                {groupBy !== 'none' && (
                  <button
                    onClick={() => toggleGroupCollapse(group.key)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {collapsedGroups.has(group.key) ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-medium text-sm">{group.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.invoices.length}
                      </Badge>
                    </div>
                    <span className="font-medium text-sm">
                      {formatCurrency(group.totalGross)}
                    </span>
                  </button>
                )}
                {/* Invoices in group */}
                {!collapsedGroups.has(group.key) && (
                  <div className="space-y-2">
                    {group.invoices.map((invoice) => (
                      <InvoiceMobileCard
                        key={invoice.id}
                        invoice={invoice}
                        onTogglePaymentStatus={handleTogglePaymentStatus}
                        onDelete={invoice.source === 'Manual' ? handleDeleteInvoice : undefined}
                        isUpdating={updateInvoiceMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
      // Desktop table view
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
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortColumn === 'invoiceNumber') {
                        setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortColumn('invoiceNumber')
                        setSortDirection('asc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Numer faktury
                      {sortColumn === 'invoiceNumber' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3.5 w-3.5" />
                          : <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="hidden lg:table-cell cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortColumn === 'invoiceDate') {
                        setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortColumn('invoiceDate')
                        setSortDirection('desc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Data wystawienia
                      {sortColumn === 'invoiceDate' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3.5 w-3.5" />
                          : <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortColumn === 'supplierName') {
                        setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortColumn('supplierName')
                        setSortDirection('asc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Dostawca
                      {sortColumn === 'supplierName' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3.5 w-3.5" />
                          : <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => {
                      if (sortColumn === 'grossAmount') {
                        setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortColumn('grossAmount')
                        setSortDirection('desc')
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Kwota brutto
                      {sortColumn === 'grossAmount' && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3.5 w-3.5" />
                          : <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">MPK</TableHead>
                  <TableHead className="hidden xl:table-cell">Kategoria</TableHead>
                  <TableHead className="hidden md:table-cell">Status opisu</TableHead>
                  <TableHead className="w-[100px] lg:w-[120px] text-center">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedInvoices.map((group) => (
                  <>
                    {/* Group header row */}
                    {groupBy !== 'none' && (
                      <TableRow 
                        key={`group-${group.key}`}
                        className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                        onClick={() => toggleGroupCollapse(group.key)}
                      >
                        <TableCell colSpan={8}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {collapsedGroups.has(group.key) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">{group.label}</span>
                              <Badge variant="secondary">
                                {group.invoices.length} {group.invoices.length === 1 ? 'faktura' : group.invoices.length < 5 ? 'faktury' : 'faktur'}
                              </Badge>
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(group.totalGross)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Invoice rows in group */}
                    {!collapsedGroups.has(group.key) && group.invoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onDoubleClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-blue-500 hidden sm:block" />
                        <div>
                          <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                            {invoice.referenceNumber?.slice(0, 20) || '-'}
                          </div>
                          {/* Show date on tablet when column is hidden */}
                          <div className="text-xs text-muted-foreground lg:hidden">
                            {new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground hidden md:block" />
                        <div>
                          <div className="font-medium text-sm truncate max-w-[120px] md:max-w-[200px]">{invoice.supplierName}</div>
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            NIP: {invoice.supplierNip}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(invoice.grossAmount)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {invoice.mpk ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {invoice.mpk}
                        </Badge>
                      ) : invoice.aiMpkSuggestion ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                          <Sparkles className="h-3 w-3" />
                          {invoice.aiMpkSuggestion}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {invoice.category ? (
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                          {invoice.category}
                        </Badge>
                      ) : invoice.aiCategorySuggestion ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                          <Sparkles className="h-3 w-3" />
                          {invoice.aiCategorySuggestion}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
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
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

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
