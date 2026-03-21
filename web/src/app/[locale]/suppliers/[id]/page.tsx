'use client'

import { use, useState, useMemo, useCallback, useRef, Fragment } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft, Building2, RefreshCw, Loader2, ShieldCheck, FileText,
  ArrowDownToLine, ArrowUp, ArrowDown, Calendar, CheckCircle,
  Sparkles, FileQuestion, FileCheck, Eye, CornerDownRight,
  ChevronDown, ChevronUp, ChevronRight, Plus, Pencil, Trash2, Upload, Folder, Tag,
  ChevronsUpDown, UserCheck, X, Power,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  useSupplier,
  useSupplierStats,
  useSupplierInvoices,
  useRefreshSupplierVat,
  useContextSbAgreements,
  useCreateSbAgreement,
  useUpdateSbAgreement,
  useTerminateSbAgreement,
  useUpdateInvoice,
  useUpdateSupplier,
  useContextDvUsers,
} from '@/hooks/use-api'
import { useHasRole } from '@/components/auth/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { Invoice, api } from '@/lib/api'
import { Checkbox } from '@/components/ui/checkbox'
import { InvoiceAmountCell } from '@/components/invoices/currency-amount'
import { ApprovalStatusBadge } from '@/components/invoices/invoice-approval-section'
import { SupplierSbTemplates } from '@/components/suppliers'
import { SupplierAttachmentsSection } from '@/components/suppliers/supplier-attachments-section'
import { SupplierNotesSection } from '@/components/suppliers/supplier-notes-section'

// ---------------------------------------------------------------------------
// Invoice helpers (mirrored from invoices page)
// ---------------------------------------------------------------------------

type DescriptionStatus = 'not_described' | 'ai_suggested' | 'described'

function getDescriptionStatus(invoice: Invoice): DescriptionStatus {
  const hasDescription = !!(invoice.mpkCenterName || invoice.mpkCenterId || invoice.mpk || invoice.category)
  const hasAiSuggestion = !!(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion)
  if (hasDescription) return 'described'
  if (hasAiSuggestion) return 'ai_suggested'
  return 'not_described'
}

function isCorrectiveInvoice(inv: Invoice): boolean {
  return inv.invoiceType === 'Corrective' || /^KOR[/\-]/i.test(inv.invoiceNumber ?? '')
}

interface NestedInvoice { invoice: Invoice; isCorrection: boolean }

function nestCorrections(invoices: Invoice[]): NestedInvoice[] {
  const correctionsByParent = new Map<string, Invoice[]>()
  for (const inv of invoices) {
    if (isCorrectiveInvoice(inv) && inv.parentInvoiceId) {
      const list = correctionsByParent.get(inv.parentInvoiceId) ?? []
      list.push(inv)
      correctionsByParent.set(inv.parentInvoiceId, list)
    }
  }
  if (correctionsByParent.size === 0) {
    return invoices.map(inv => ({ invoice: inv, isCorrection: false }))
  }
  const nestedIds = new Set<string>()
  for (const [parentId, corrs] of correctionsByParent) {
    if (invoices.some(i => i.id === parentId)) {
      for (const c of corrs) nestedIds.add(c.id)
    }
  }
  const result: NestedInvoice[] = []
  for (const inv of invoices) {
    if (nestedIds.has(inv.id)) continue
    result.push({ invoice: inv, isCorrection: false })
    const corrections = correctionsByParent.get(inv.id)
    if (corrections) {
      corrections.sort((a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''))
      for (const corr of corrections) result.push({ invoice: corr, isCorrection: true })
    }
  }
  return result
}

type SortColumn = 'invoiceNumber' | 'invoiceDate' | 'grossAmount'
type SortDirection = 'asc' | 'desc'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SupplierDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('suppliers')
  const tInv = useTranslations('invoices')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const isAdmin = useHasRole('Admin')
  const { toast } = useToast()

  const { data: supplier, isLoading } = useSupplier(id)
  const { data: stats } = useSupplierStats(id)
  const { data: invoicesData } = useSupplierInvoices(id)
  const { data: agreementsData, refetch: refetchAgreements } = useContextSbAgreements(id)
  const refreshVatMutation = useRefreshSupplierVat()
  const createAgreementMutation = useCreateSbAgreement()
  const updateAgreementMutation = useUpdateSbAgreement()
  const terminateAgreementMutation = useTerminateSbAgreement()
  const updateInvoiceMutation = useUpdateInvoice()
  const updateSupplierMutation = useUpdateSupplier()
  const { data: dvUsersData } = useContextDvUsers()
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  const agreements = agreementsData?.agreements ?? []
  const activeAgreement = agreements.find((a) => a.status === 'Active')

  // System users — sorted alphabetically, filtered by search
  const allUsers = useMemo(() => {
    const users = dvUsersData?.users ?? []
    return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [dvUsersData])

  const filteredUsers = useMemo(() => {
    if (!contactSearch.trim()) return allUsers
    const q = contactSearch.toLowerCase()
    return allUsers.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [allUsers, contactSearch])

  const currentContactUser = useMemo(() => {
    if (!supplier?.sbContactUserId) return null
    return allUsers.find(u => u.systemUserId === supplier.sbContactUserId) ?? null
  }, [supplier?.sbContactUserId, allUsers])

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString(locale)
  }, [locale])

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('invoiceDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [agreementExpanded, setAgreementExpanded] = useState(false)
  const [showAgreementForm, setShowAgreementForm] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState(false)
  const [agreementForm, setAgreementForm] = useState({
    name: '',
    agreementDate: new Date().toISOString().split('T')[0],
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    notes: '',
    autoApprove: false,
  })
  const [templatesExpanded, setTemplatesExpanded] = useState(false)
  const [uploadingScan, setUploadingScan] = useState(false)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)

  const invoices = invoicesData?.invoices ?? []

  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices]
    const dir = sortDirection === 'desc' ? -1 : 1
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case 'invoiceNumber':
          cmp = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', 'pl', { numeric: true })
          break
        case 'invoiceDate': {
          const dA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0
          const dB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
          cmp = dA - dB
          break
        }
        case 'grossAmount':
          cmp = (a.grossAmount || 0) - (b.grossAmount || 0)
          break
      }
      return cmp * dir
    })
    return sorted
  }, [invoices, sortColumn, sortDirection])

  // Grouping
  type GroupBy = 'date' | 'mpk' | 'category' | 'none'
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const MONTH_NAMES = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1)
      return date.toLocaleDateString(locale, { month: 'long' })
    })
  }, [locale])

  interface SupplierInvoiceGroup {
    key: string
    label: string
    invoices: Invoice[]
    totalGross: number
    isPartialPln: boolean
  }

  const groupedInvoices = useMemo<SupplierInvoiceGroup[]>(() => {
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: tInv('allInvoices'),
        invoices: sortedInvoices,
        totalGross: sortedInvoices.reduce((sum, i) => sum + (i.currency === 'PLN' ? i.grossAmount : (i.grossAmountPln ?? i.grossAmount)), 0),
        isPartialPln: sortedInvoices.some(i => i.currency !== 'PLN' && !i.grossAmountPln),
      }]
    }

    const groups: Record<string, SupplierInvoiceGroup> = {}

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
            label = `${MONTH_NAMES[month]} ${year}`
          } else {
            key = 'unknown'
            label = tInv('noDate')
          }
          break
        }
        case 'mpk':
          key = invoice.mpkCenterName || invoice.mpk || 'brak'
          label = invoice.mpkCenterName || invoice.mpk || tInv('noMpk')
          break
        case 'category':
          key = invoice.category || 'brak'
          label = invoice.category || tInv('noCategory')
          break
        default:
          key = 'all'
          label = tCommon('all')
      }

      if (!groups[key]) {
        groups[key] = { key, label, invoices: [], totalGross: 0, isPartialPln: false }
      }
      groups[key].invoices.push(invoice)
      const plnValue = invoice.currency === 'PLN' ? invoice.grossAmount : (invoice.grossAmountPln ?? invoice.grossAmount)
      groups[key].totalGross += plnValue
      if (invoice.currency !== 'PLN' && !invoice.grossAmountPln) groups[key].isPartialPln = true
    }

    const sortedGroups = Object.values(groups)
    if (groupBy === 'date') {
      sortedGroups.sort((a, b) => b.key.localeCompare(a.key))
    } else {
      sortedGroups.sort((a, b) => {
        if (a.key === 'brak') return 1
        if (b.key === 'brak') return -1
        return a.label.localeCompare(b.label, 'pl')
      })
    }

    return sortedGroups
  }, [sortedInvoices, groupBy, tInv, tCommon, MONTH_NAMES])

  // Translated description-status badges
  const getDescriptionStatusBadgeTranslated = useCallback((status: DescriptionStatus) => {
    switch (status) {
      case 'not_described':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
            <FileQuestion className="h-3 w-3" />
            {tInv('notDescribed')}
          </Badge>
        )
      case 'ai_suggested':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
            <Sparkles className="h-3 w-3" />
            {tInv('aiSuggestion')}
          </Badge>
        )
      case 'described':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <FileCheck className="h-3 w-3" />
            {tInv('described')}
          </Badge>
        )
    }
  }, [tInv])

  async function handleTogglePaymentStatus(invoiceId: string, invoiceNumber: string, currentStatus: 'pending' | 'paid') {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoiceId,
        data: {
          paymentStatus: newStatus,
          paymentDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        },
      })
      toast({
        title: newStatus === 'paid' ? tInv('invoicePaid') : tInv('statusChanged'),
        description: newStatus === 'paid'
          ? tInv('invoiceMarkedPaid', { number: invoiceNumber })
          : tInv('invoiceMarkedUnpaid', { number: invoiceNumber }),
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: tCommon('error'),
        description: error instanceof Error ? error.message : tInv('statusChangeError'),
        variant: 'destructive',
      })
    }
  }

  function startEditAgreement() {
    if (!activeAgreement) return
    setAgreementForm({
      name: activeAgreement.name,
      agreementDate: activeAgreement.agreementDate?.split('T')[0] ?? '',
      validFrom: activeAgreement.validFrom?.split('T')[0] ?? '',
      validTo: activeAgreement.validTo?.split('T')[0] ?? '',
      notes: activeAgreement.notes ?? '',
      autoApprove: activeAgreement.autoApprove ?? false,
    })
    setEditingAgreement(true)
  }

  async function handleScanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingScan(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await api.suppliers.uploadAttachment(id, {
        fileName: file.name,
        content: base64,
        mimeType: file.type,
        description: `${t('agreement.title')} - ${activeAgreement?.name ?? ''}`,
      })
      toast({ description: t('agreement.uploadScan') + ' ✓' })
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : tCommon('error'),
      })
    } finally {
      setUploadingScan(false)
      if (scanInputRef.current) scanInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">NIP: {supplier.nip}</p>
          {supplier.bankAccount && (
            <p className="text-sm text-muted-foreground font-mono">
              {t('bankAccount')}: {supplier.bankAccount}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshVatMutation.mutate(id, {
            onSuccess: () => {
              toast({
                title: t('refreshVatSuccess'),
                description: t('refreshVatSuccessDesc'),
                variant: 'success',
              })
            },
            onError: (error) => {
              toast({
                title: tCommon('error'),
                description: error instanceof Error ? error.message : t('refreshVatError'),
                variant: 'destructive',
              })
            },
          })}
          disabled={refreshVatMutation.isPending}
        >
          {refreshVatMutation.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <RefreshCw className="h-4 w-4 mr-2" />
          }
          {t('refreshVat')}
        </Button>
        {supplier.status !== 'Active' && (
          <Button
            size="sm"
            onClick={() => updateSupplierMutation.mutate(
              { id, data: { status: 'Active' } },
              {
                onSuccess: () => {
                  toast({
                    description: t('reactivated'),
                    variant: 'success',
                  })
                },
                onError: (error) => {
                  toast({
                    title: tCommon('error'),
                    description: error instanceof Error ? error.message : tCommon('error'),
                    variant: 'destructive',
                  })
                },
              }
            )}
            disabled={updateSupplierMutation.isPending}
          >
            <Power className="h-4 w-4 mr-2" />
            {t('reactivate')}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Supplier info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('name')}</dt>
                <dd className="font-medium">{supplier.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('nip')}</dt>
                <dd className="font-mono">{supplier.nip}</dd>
              </div>
              {supplier.street && (
                <div>
                  <dt className="text-muted-foreground">{t('address')}</dt>
                  <dd>{[supplier.street, supplier.postalCode, supplier.city].filter(Boolean).join(', ')}</dd>
                </div>
              )}
              {supplier.email && (
                <div>
                  <dt className="text-muted-foreground">{t('email')}</dt>
                  <dd>{supplier.email}</dd>
                </div>
              )}
              {supplier.phone && (
                <div>
                  <dt className="text-muted-foreground">{t('phone')}</dt>
                  <dd>{supplier.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">{t('statusLabel')}</dt>
                <dd>
                  <Badge className={
                    supplier.status === 'Active' ? 'bg-green-100 text-green-800' :
                    supplier.status === 'Blocked' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {t(`status${supplier.status ?? 'Active'}`)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('source')}</dt>
                <dd>{supplier.source}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('statistics')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('totalInvoices')}</span>
                  <span className="font-medium">{stats.invoiceCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('totalAmount')}</span>
                  <span className="font-medium">{formatCurrency(stats.totalGross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('avgAmount')}</span>
                  <span className="font-medium">{formatCurrency(stats.avgInvoiceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('pendingPayments')}</span>
                  <span className="font-medium">{stats.pendingPayments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('sbInvoiceCount')}</span>
                  <span className="font-medium">{stats.selfBillingInvoiceCount}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('invoiceCount')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{tInv('grouping')}:</span>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="w-30 lg:w-35 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{tInv('groupByDate')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mpk">
                    <div className="flex items-center gap-2">
                      <Folder className="h-3.5 w-3.5" />
                      <span>{tInv('groupByMpk')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="category">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{tInv('groupByCategory')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{tInv('noGrouping')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedInvoices.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('noInvoices')}
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
                      {tInv('invoiceNumber')}
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
                      {tInv('issueDate')}
                      {sortColumn === 'invoiceDate' && (
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
                      {tInv('grossAmount')}
                      {sortColumn === 'grossAmount' && (
                        sortDirection === 'asc'
                          ? <ArrowUp className="h-3.5 w-3.5" />
                          : <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">{tInv('mpk')}</TableHead>
                  <TableHead className="hidden xl:table-cell">{tInv('category')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{tInv('approvalColumn')}</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">{tInv('selfBillingColumn')}</TableHead>
                  <TableHead className="hidden md:table-cell">{tInv('descriptionStatus')}</TableHead>
                  <TableHead className="w-25 lg:w-30 text-center">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedInvoices.map((group) => (
                  <Fragment key={`group-${group.key}`}>
                    {groupBy !== 'none' && (
                      <TableRow
                        className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                        onClick={() => toggleGroupCollapse(group.key)}
                      >
                        <TableCell colSpan={9}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {collapsedGroups.has(group.key) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">{group.label}</span>
                              <Badge variant="secondary">
                                {tInv('invoicesCount', { count: group.invoices.length })}
                              </Badge>
                            </div>
                            <span className="font-semibold">
                              {group.isPartialPln ? '~ ' : ''}{formatCurrency(group.totalGross)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!collapsedGroups.has(group.key) && nestCorrections(group.invoices).map(({ invoice, isCorrection }) => (
                  <TableRow
                    key={invoice.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isCorrection ? 'bg-orange-50/40 dark:bg-orange-950/20 border-l-2 border-l-orange-300 dark:border-l-orange-700' : ''}`}
                    onDoubleClick={() => router.push(`/invoices/${invoice.id}?from=supplier&supplierId=${id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isCorrection ? (
                          <CornerDownRight className="h-4 w-4 text-orange-400 hidden sm:block" />
                        ) : (
                          <ArrowDownToLine className="h-4 w-4 text-blue-500 hidden sm:block" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-medium text-sm ${isCorrection ? 'text-orange-700 dark:text-orange-300' : ''}`}>{invoice.invoiceNumber}</span>
                            {isCorrectiveInvoice(invoice) && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-[10px] px-1 py-0 leading-tight">
                                {tInv('invoiceTypeCorrective')}
                              </Badge>
                            )}
                            {invoice.invoiceType === 'Advance' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px] px-1 py-0 leading-tight">
                                {tInv('invoiceTypeAdvance')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                            {invoice.referenceNumber?.slice(0, 20) || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground lg:hidden">
                            {formatDate(invoice.invoiceDate)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(invoice.invoiceDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      <InvoiceAmountCell
                        amount={invoice.grossAmount}
                        currency={invoice.currency}
                        grossAmountPln={invoice.grossAmountPln}
                        className={invoice.grossAmount < 0 ? 'text-red-600 dark:text-red-400' : undefined}
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {(invoice.mpkCenterName || invoice.mpk) ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {invoice.mpkCenterName || invoice.mpk}
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
                    <TableCell className="hidden lg:table-cell">
                      <ApprovalStatusBadge status={invoice.approvalStatus} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      {invoice.isSelfBilling && (
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800 text-[10px] px-1.5 py-0 leading-tight">
                          {tInv('selfBillingColumn')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getDescriptionStatusBadgeTranslated(getDescriptionStatus(invoice))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePaymentStatus(invoice.id, invoice.invoiceNumber, invoice.paymentStatus)}
                            disabled={updateInvoiceMutation.isPending}
                            title={invoice.paymentStatus === 'paid' ? tInv('markAsUnpaid') : tInv('markAsPaid')}
                          >
                            <CheckCircle
                              className={`h-5 w-5 transition-colors ${invoice.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                            />
                          </Button>
                        ) : (
                          <span className="inline-flex items-center justify-center h-8 w-8">
                            <CheckCircle
                              className={`h-5 w-5 ${invoice.paymentStatus === 'paid' ? 'text-green-500 fill-green-100' : 'text-gray-300'}`}
                            />
                          </span>
                        )}
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/invoices/${invoice.id}?from=supplier&supplierId=${id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Self-billing agreement — collapsible, default collapsed */}
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setAgreementExpanded(!agreementExpanded)}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t('agreement.title')}
          </div>
          {agreementExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {agreementExpanded && (
          <div className="mt-4">
            {activeAgreement && !editingAgreement ? (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('agreement.name')}</dt>
                    <dd className="font-medium">{activeAgreement.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('agreement.status')}</dt>
                    <dd>
                      <Badge className={
                        activeAgreement.status === 'Active' ? 'bg-green-100 text-green-800' :
                        activeAgreement.status === 'Terminated' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {t(`agreement.status${activeAgreement.status ?? 'Active'}`)}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('agreement.agreementDate')}</dt>
                    <dd>{activeAgreement.agreementDate ? formatDate(activeAgreement.agreementDate) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('agreement.validFrom')}</dt>
                    <dd>{formatDate(activeAgreement.validFrom)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('agreement.validTo')}</dt>
                    <dd>{activeAgreement.validTo ? formatDate(activeAgreement.validTo) : '—'}</dd>
                  </div>
                  {activeAgreement.notes && (
                    <div className="col-span-2 md:col-span-3">
                      <dt className="text-muted-foreground">{t('agreement.notes')}</dt>
                      <dd>{activeAgreement.notes}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">{t('agreement.autoApprove')}</dt>
                    <dd>
                      <Badge className={activeAgreement.autoApprove ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}>
                        {activeAgreement.autoApprove ? t('agreement.autoApproveOn') : t('agreement.autoApproveOff')}
                      </Badge>
                    </dd>
                  </div>
                </dl>
                {/* SB Contact User (Approver) Picker */}
                <div className="flex items-center gap-3 pt-2 border-t text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground whitespace-nowrap">{t('agreement.sbContact')}:</span>
                  {isAdmin ? (
                    <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={contactPickerOpen}
                          className="w-140 justify-between font-normal h-8 text-sm"
                        >
                          {currentContactUser
                            ? `${currentContactUser.fullName} (${currentContactUser.email})`
                            : t('agreement.sbContactSelect')}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-140 p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder={t('agreement.sbContactSearch')}
                            value={contactSearch}
                            onValueChange={setContactSearch}
                          />
                          <CommandList>
                            <CommandEmpty>{t('agreement.sbContactEmpty')}</CommandEmpty>
                            <CommandGroup>
                              {filteredUsers.map((user) => (
                                <CommandItem
                                  key={user.systemUserId}
                                  value={user.systemUserId}
                                  onSelect={() => {
                                    updateSupplierMutation.mutate(
                                      { id, data: { sbContactUserId: user.systemUserId } },
                                      {
                                        onSuccess: () => {
                                          toast({ description: t('agreement.sbContactUpdated') })
                                        },
                                        onError: (error) => {
                                          toast({
                                            variant: 'destructive',
                                            description: error instanceof Error ? error.message : t('agreement.sbContactError'),
                                          })
                                        },
                                      }
                                    )
                                    setContactPickerOpen(false)
                                    setContactSearch('')
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{user.fullName}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                  </div>
                                  {user.systemUserId === supplier?.sbContactUserId && (
                                    <CheckCircle className="ml-auto h-4 w-4 text-green-600" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="font-medium">
                      {currentContactUser
                        ? `${currentContactUser.fullName} (${currentContactUser.email})`
                        : '—'}
                    </span>
                  )}
                  {isAdmin && currentContactUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        updateSupplierMutation.mutate(
                          { id, data: { sbContactUserId: null } as Record<string, unknown> },
                          {
                            onSuccess: () => toast({ description: t('agreement.sbContactCleared') }),
                            onError: (error) => toast({ variant: 'destructive', description: error instanceof Error ? error.message : t('agreement.sbContactError') }),
                          }
                        )
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {updateSupplierMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={startEditAgreement}>
                      <Pencil className="h-4 w-4 mr-1" />
                      {t('agreement.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingScan}
                      onClick={() => scanInputRef.current?.click()}
                    >
                      {uploadingScan
                        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        : <Upload className="h-4 w-4 mr-1" />
                      }
                      {t('agreement.uploadScan')}
                    </Button>
                    <input
                      ref={scanInputRef}
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/*"
                      aria-label={t('agreement.uploadScan')}
                      onChange={handleScanUpload}
                    />
                    <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('agreement.terminate')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('agreement.terminate')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('agreement.terminateConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={terminateAgreementMutation.isPending}
                            onClick={(e) => {
                              e.preventDefault()
                              terminateAgreementMutation.mutate(activeAgreement.id, {
                                onSuccess: () => {
                                  setTerminateDialogOpen(false)
                                  refetchAgreements()
                                  toast({ description: t('agreement.terminated') })
                                },
                                onError: (error) => {
                                  setTerminateDialogOpen(false)
                                  toast({
                                    variant: 'destructive',
                                    description: error instanceof Error ? error.message : t('agreement.terminateError'),
                                  })
                                },
                              })
                            }}
                          >
                            {terminateAgreementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {t('agreement.terminate')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ) : (showAgreementForm || editingAgreement) ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('agreement.name')}</label>
                    <Input
                      value={agreementForm.name}
                      onChange={(e) => setAgreementForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t('agreement.namePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('agreement.agreementDate')}</label>
                    <Input
                      type="date"
                      value={agreementForm.agreementDate}
                      onChange={(e) => setAgreementForm(f => ({ ...f, agreementDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('agreement.validFrom')}</label>
                    <Input
                      type="date"
                      value={agreementForm.validFrom}
                      onChange={(e) => setAgreementForm(f => ({ ...f, validFrom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('agreement.validTo')}</label>
                    <Input
                      type="date"
                      value={agreementForm.validTo}
                      onChange={(e) => setAgreementForm(f => ({ ...f, validTo: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('agreement.notes')}</label>
                  <Input
                    value={agreementForm.notes}
                    onChange={(e) => setAgreementForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t('agreement.notesPlaceholder')}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoApprove"
                    checked={agreementForm.autoApprove}
                    onCheckedChange={(checked) => setAgreementForm(f => ({ ...f, autoApprove: checked === true }))}
                  />
                  <label htmlFor="autoApprove" className="text-sm font-medium cursor-pointer">
                    {t('agreement.autoApprove')}
                  </label>
                  <span className="text-xs text-muted-foreground">{t('agreement.autoApproveHint')}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowAgreementForm(false); setEditingAgreement(false) }}>
                    {tCommon('cancel')}
                  </Button>
                  {editingAgreement ? (
                    <Button
                      size="sm"
                      disabled={!agreementForm.name || !agreementForm.validFrom || updateAgreementMutation.isPending}
                      onClick={() => {
                        updateAgreementMutation.mutate(
                          {
                            id: activeAgreement!.id,
                            data: {
                              name: agreementForm.name,
                              agreementDate: agreementForm.agreementDate,
                              validFrom: agreementForm.validFrom,
                              validTo: agreementForm.validTo || undefined,
                              notes: agreementForm.notes || undefined,
                              autoApprove: agreementForm.autoApprove,
                            },
                          },
                          {
                            onSuccess: () => {
                              setEditingAgreement(false)
                              refetchAgreements()
                              toast({ description: t('agreement.updated') })
                            },
                            onError: (error) => {
                              toast({
                                variant: 'destructive',
                                description: error instanceof Error ? error.message : t('agreement.updateError'),
                              })
                            },
                          }
                        )
                      }}
                    >
                      {updateAgreementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {tCommon('save')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!agreementForm.name || !agreementForm.validFrom || createAgreementMutation.isPending}
                      onClick={() => {
                        createAgreementMutation.mutate(
                          {
                            supplierId: id,
                            settingId: supplier.settingId,
                            name: agreementForm.name,
                            agreementDate: agreementForm.agreementDate,
                            validFrom: agreementForm.validFrom,
                            validTo: agreementForm.validTo || undefined,
                            notes: agreementForm.notes || undefined,
                            autoApprove: agreementForm.autoApprove,
                          },
                          {
                            onSuccess: () => {
                              setShowAgreementForm(false)
                              refetchAgreements()
                              toast({ description: t('agreement.created') })
                            },
                            onError: (error) => {
                              toast({
                                variant: 'destructive',
                                description: error instanceof Error ? error.message : t('agreement.createError'),
                              })
                            },
                          }
                        )
                      }}
                    >
                      {createAgreementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {tCommon('save')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t('agreement.noAgreement')}
                </p>
                {isAdmin && (
                  <div className="flex gap-2 px-4 py-3 border-t mt-3">
                    <Button variant="outline" size="sm" onClick={() => setShowAgreementForm(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('agreement.add')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Self-billing templates — collapsible, default collapsed */}
      {templatesExpanded ? (
        <div className="relative">
          <button
            className="absolute right-4 top-4 z-10"
            onClick={() => setTemplatesExpanded(false)}
            aria-label={t('templates.collapse')}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <SupplierSbTemplates supplierId={id} settingId={supplier.settingId} />
        </div>
      ) : (
        <Card className="p-4">
          <button
            className="w-full flex items-center justify-between text-sm font-medium"
            onClick={() => setTemplatesExpanded(true)}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('templates.title')}
            </div>
            <ChevronDown className="h-4 w-4" />
          </button>
        </Card>
      )}

      {/* Attachments */}
      <SupplierAttachmentsSection supplierId={id} isReadOnly={!isAdmin} />

      {/* Notes */}
      <SupplierNotesSection supplierId={id} isReadOnly={!isAdmin} />
    </div>
  )
}
