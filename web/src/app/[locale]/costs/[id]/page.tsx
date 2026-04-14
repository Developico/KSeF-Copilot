'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { formatCurrency } from '@/lib/format'
import { api } from '@/lib/api'
import type { VatCheckResponse } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import {
  ArrowLeft,
  Calendar,
  Building2,
  Check,
  Clock,
  CreditCard,
  ChevronUp,
  ChevronDown,
  Download,
  Eye,
  FileText,
  FileUp,
  Paperclip,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
  Loader2,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { CostTypeIcon } from '@/components/costs/cost-type-icon'
import { CostNotesSection } from '@/components/costs/cost-notes-section'
import { CurrencyDisplay } from '@/components/invoices/currency-amount'
import { ApprovalStatusBadge } from '@/components/invoices/invoice-approval-section'
import {
  useCostDocument,
  useUpdateCostDocument,
  useDeleteCostDocument,
  useAICategorize,
  useCostDocumentAttachments,
  useContextMpkCenters,
} from '@/hooks/use-api'
import { useHasRole } from '@/components/auth/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600'
  if (confidence >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

function formatDateTime(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CostDocumentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const id = resolvedParams.id

  const router = useRouter()
  const t = useTranslations('costs')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { toast } = useToast()

  const { data: doc, isLoading } = useCostDocument(id)
  const updateMutation = useUpdateCostDocument()
  const deleteMutation = useDeleteCostDocument()
  const aiCategorizeMutation = useAICategorize()
  const { data: attachmentsData } = useCostDocumentAttachments(id)
  const { data: mpkData } = useContextMpkCenters()
  const mpkOptions = mpkData?.mpkCenters ?? []

  const isAdmin = useHasRole('Admin')
  const [vatResult, setVatResult] = useState<VatCheckResponse | null>(null)
  const [vatLoading, setVatLoading] = useState(false)

  // Edit states — 3 top cards
  const [isEditingDocument, setIsEditingDocument] = useState(false)
  const [editDocNumber, setEditDocNumber] = useState('')
  const [editDocDate, setEditDocDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDocType, setEditDocType] = useState('')

  const [isEditingSupplier, setIsEditingSupplier] = useState(false)
  const [editIssuerName, setEditIssuerName] = useState('')
  const [editIssuerNip, setEditIssuerNip] = useState('')
  const [editIssuerAddress, setEditIssuerAddress] = useState('')

  const [isEditingAmounts, setIsEditingAmounts] = useState(false)
  const [editNetAmount, setEditNetAmount] = useState('')
  const [editVatAmount, setEditVatAmount] = useState('')
  const [editGrossAmount, setEditGrossAmount] = useState('')
  const [editCurrency, setEditCurrency] = useState('')

  // Edit state — classification
  const [isEditingClassification, setIsEditingClassification] = useState(false)
  const [editMpk, setEditMpk] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Collapsible sections
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false)

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString(locale)
  }, [locale])

  const isOverdue = doc?.dueDate && doc.paymentStatus !== 'paid' && new Date(doc.dueDate) < new Date()

  // --- Handlers ---

  const handleAICategorize = async () => {
    try {
      await aiCategorizeMutation.mutateAsync({ costDocumentId: id })
      toast({ description: t('aiCategorized') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const handleApplyAiSuggestions = async () => {
    if (!doc?.aiMpkSuggestion && !doc?.aiCategorySuggestion) return
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          costCenter: doc.aiMpkSuggestion,
          category: doc.aiCategorySuggestion,
          ...(doc.aiDescription ? { description: doc.aiDescription } : {}),
        },
      })
      toast({ description: t('aiApplied') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const handleApplyAiToEdit = () => {
    if (!doc) return
    const aiCenter = doc.aiMpkSuggestion
      ? mpkOptions.find(o => o.name === doc.aiMpkSuggestion)
      : undefined
    setEditMpk(aiCenter?.id || editMpk)
    setEditCategory(doc.aiCategorySuggestion || editCategory)
    if (doc.aiDescription) setEditDescription(doc.aiDescription)
    if (!isEditingClassification) setIsEditingClassification(true)
  }

  const handleVatCheck = async () => {
    if (!doc?.issuerNip) return
    setVatLoading(true)
    try {
      const result = await api.vat.checkAccount(doc.issuerNip, '')
      setVatResult(result)
    } catch {
      toast({ description: t('vatCheckError'), variant: 'destructive' })
    } finally {
      setVatLoading(false)
    }
  }

  const handleTogglePayment = async () => {
    if (!doc) return
    const newStatus = doc.paymentStatus === 'paid' ? 'pending' : 'paid'
    try {
      await updateMutation.mutateAsync({ id, data: { paymentStatus: newStatus } })
      toast({ description: newStatus === 'paid' ? t('markAsPaid') : t('markAsUnpaid') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id)
      toast({ description: t('deleted') })
      router.push('/costs')
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  // --- Edit: start/save/cancel for 3 top cards ---

  const startEditingDocumentCard = () => {
    if (!doc) return
    setEditDocNumber(doc.documentNumber)
    setEditDocDate(doc.documentDate?.split('T')[0] || '')
    setEditDueDate(doc.dueDate?.split('T')[0] || '')
    setEditDocType(doc.documentType)
    setIsEditingDocument(true)
  }

  const saveDocumentCard = async () => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          documentNumber: editDocNumber,
          documentDate: editDocDate,
          dueDate: editDueDate || undefined,
          documentType: editDocType as typeof doc.documentType,
        },
      })
      setIsEditingDocument(false)
      toast({ description: tCommon('success') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const startEditingSupplierCard = () => {
    if (!doc) return
    setEditIssuerName(doc.issuerName)
    setEditIssuerNip(doc.issuerNip || '')
    setEditIssuerAddress([doc.issuerAddress, doc.issuerPostalCode, doc.issuerCity].filter(Boolean).join(', '))
    setIsEditingSupplier(true)
  }

  const saveSupplierCard = async () => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { issuerName: editIssuerName, issuerNip: editIssuerNip || undefined },
      })
      setIsEditingSupplier(false)
      toast({ description: tCommon('success') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  const startEditingAmountsCard = () => {
    if (!doc) return
    setEditNetAmount(String(doc.netAmount ?? ''))
    setEditVatAmount(String(doc.vatAmount ?? ''))
    setEditGrossAmount(String(doc.grossAmount ?? ''))
    setEditCurrency(doc.currency || 'PLN')
    setIsEditingAmounts(true)
  }

  const saveAmountsCard = async () => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          grossAmount: parseFloat(editGrossAmount) || undefined,
          currency: editCurrency || undefined,
        },
      })
      setIsEditingAmounts(false)
      toast({ description: tCommon('success') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  // --- Edit: classification ---

  const startEditingClassification = () => {
    if (!doc) return
    const currentCenter = mpkOptions.find(o => o.name === doc.costCenter)
    setEditMpk(currentCenter?.id || '')
    setEditCategory(doc.category || '')
    setEditDescription(doc.description || '')
    setIsEditingClassification(true)
  }

  const saveClassification = async () => {
    const mpkCenter = mpkOptions.find(o => o.id === editMpk)
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          costCenter: mpkCenter?.name,
          category: editCategory || undefined,
          description: editDescription || undefined,
          mpkCenterId: editMpk || undefined,
        },
      })
      setIsEditingClassification(false)
      toast({ description: tCommon('success') })
    } catch {
      toast({ description: tCommon('error'), variant: 'destructive' })
    }
  }

  // --- Loading / Not found ---

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="lg:w-80 shrink-0 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" asChild>
          <Link href="/costs"><ArrowLeft className="h-4 w-4 mr-2" />{t('backToList')}</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('noDocuments')}
          </CardContent>
        </Card>
      </div>
    )
  }

  const attachments = attachmentsData?.attachments ?? []

  return (
    <div className="space-y-4">
      {/* ========== HEADER ========== */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link href="/costs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CostTypeIcon type={doc.documentType} className="h-5 w-5" />
            <h1 className="text-xl sm:text-2xl font-bold truncate">{doc.documentNumber}</h1>
            <Badge variant="outline">{t(`docType.${doc.documentType}`)}</Badge>
          </div>
          <p className="text-muted-foreground text-sm truncate">{doc.issuerName}</p>
        </div>
      </div>

      {/* ========== ACTION TOOLBAR ========== */}
      <div className="rounded-lg border bg-muted/40 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Approval */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('colApproval')}</span>
          <ApprovalStatusBadge status={doc.approvalStatus} />
          {doc.approvedBy && (
            <span className="text-xs text-muted-foreground">
              {doc.approvedBy}{doc.approvedAt ? ` · ${formatDate(doc.approvedAt)}` : ''}
              {doc.approvalComment ? ` · "${doc.approvalComment}"` : ''}
            </span>
          )}
        </div>

        <Separator orientation="vertical" className="hidden sm:block h-6" />
        <Separator orientation="horizontal" className="sm:hidden" />

        {/* Payment */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('colPayment')}</span>
          <Badge className={doc.paymentStatus === 'paid'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
          }>
            {doc.paymentStatus === 'paid' ? (
              <><Check className="h-3 w-3 mr-1" />{t('paid')}</>
            ) : (
              <>{t('pending')}</>
            )}
          </Badge>
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-7 text-xs"
              onClick={handleTogglePayment} disabled={updateMutation.isPending}>
              {doc.paymentStatus === 'paid' ? t('markAsUnpaid') : t('markAsPaid')}
            </Button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Delete */}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteConfirmDesc', { number: doc.documentNumber })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {tCommon('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* ========== 2-COLUMN LAYOUT (flex) ========== */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT COLUMN */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* ---- 3 CARDS TOP ROW ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Card 1: Document Data */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  {t('detailTitle')}
                </div>
                {isAdmin && !isEditingDocument && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingDocumentCard}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {isEditingDocument && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingDocument(false)}><X className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={saveDocumentCard} disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
              {isEditingDocument ? (
                <div className="space-y-2">
                  <div><label className="text-xs text-muted-foreground">{t('colNumber')}</label><Input value={editDocNumber} onChange={e => setEditDocNumber(e.target.value)} className="h-8 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('colDate')}</label><Input type="date" value={editDocDate} onChange={e => setEditDocDate(e.target.value)} className="h-8 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('dueDate')}</label><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="h-8 text-sm" /></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('colNumber')}</p>
                    <p className="font-medium">{doc.documentNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('colDate')}</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(doc.documentDate)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dueDate')}</p>
                    <div className={cn('flex items-center gap-1', isOverdue && 'text-red-600')}>
                      <Clock className="h-3 w-3" />
                      {doc.dueDate ? formatDate(doc.dueDate) : '—'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('source')}</p>
                    <Badge variant="secondary" className="text-xs">{doc.source}</Badge>
                  </div>
                </div>
              )}
            </Card>

            {/* Card 2: Supplier */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4" />
                  {t('supplierSection')}
                </div>
                {isAdmin && !isEditingSupplier && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingSupplierCard}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {isEditingSupplier && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingSupplier(false)}><X className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={saveSupplierCard} disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
              {isEditingSupplier ? (
                <div className="space-y-2">
                  <div><label className="text-xs text-muted-foreground">{t('colIssuer')}</label><Input value={editIssuerName} onChange={e => setEditIssuerName(e.target.value)} className="h-8 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('issuerNip')}</label><Input value={editIssuerNip} onChange={e => setEditIssuerNip(e.target.value)} className="h-8 text-sm" /></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">{doc.issuerName}</p>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('issuerNip')}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{doc.issuerNip || '—'}</p>
                      {doc.issuerNip && !vatResult && (
                        <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleVatCheck} disabled={vatLoading}>
                          {vatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t('checkVat')}
                        </Button>
                      )}
                      {vatResult && (
                        vatResult.accountAssigned ? (
                          <Badge className="bg-green-100 text-green-800 gap-1 text-xs"><ShieldCheck className="h-3 w-3" />{t('vatRegistered')}</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 gap-1 text-xs"><ShieldAlert className="h-3 w-3" />{t('vatNotRegistered')}</Badge>
                        )
                      )}
                    </div>
                  </div>
                  {(doc.issuerAddress || doc.issuerCity) && (
                    <p className="text-muted-foreground text-xs">{[doc.issuerAddress, doc.issuerPostalCode, doc.issuerCity].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              )}
            </Card>

            {/* Card 3: Amounts */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4" />
                  {t('amountsSection')}
                </div>
                {isAdmin && !isEditingAmounts && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingAmountsCard}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {isEditingAmounts && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingAmounts(false)}><X className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={saveAmountsCard} disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
              {isEditingAmounts ? (
                <div className="space-y-2">
                  <div><label className="text-xs text-muted-foreground">{t('netAmount')}</label><Input type="number" step="0.01" value={editNetAmount} onChange={e => setEditNetAmount(e.target.value)} className="h-8 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('vatAmount')}</label><Input type="number" step="0.01" value={editVatAmount} onChange={e => setEditVatAmount(e.target.value)} className="h-8 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('colAmount')}</label><Input type="number" step="0.01" value={editGrossAmount} onChange={e => setEditGrossAmount(e.target.value)} className="h-8 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('currency')}</label>
                    <Select value={editCurrency} onValueChange={setEditCurrency}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLN">PLN</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('netAmount')}</p>
                    <p>{formatCurrency(doc.netAmount, doc.currency || 'PLN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('vatAmount')}</p>
                    <p>{doc.vatAmount ? formatCurrency(doc.vatAmount, doc.currency || 'PLN') : '—'}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('colAmount')}</p>
                    <p className="text-base font-bold">{formatCurrency(doc.grossAmount, doc.currency || 'PLN')}</p>
                  </div>
                  {doc.currency && doc.currency !== 'PLN' && doc.grossAmountPln && (
                    <div className="text-xs text-muted-foreground">
                      <p>{t('grossAmountPln')}: {formatCurrency(doc.grossAmountPln, 'PLN')}</p>
                      {doc.exchangeRate && <p>Kurs: {doc.exchangeRate.toFixed(4)}</p>}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* ---- CLASSIFICATION ---- */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4" />
                {t('classificationSection')}
              </div>
              {isAdmin && !isEditingClassification && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingClassification}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {isEditingClassification && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingClassification(false)}><X className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={saveClassification} disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
            {isEditingClassification ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">MPK</label>
                  <Select value={editMpk} onValueChange={setEditMpk}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {mpkOptions.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('category')}</label>
                  <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">{t('description')}</label>
                  <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">MPK</p>
                    {doc.costCenter ? (
                      <p className="text-sm font-medium">{doc.costCenter}</p>
                    ) : doc.aiMpkSuggestion ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                        <Sparkles className="h-3 w-3" />{doc.aiMpkSuggestion}
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">{t('category')}</p>
                    {doc.category ? (
                      <p className="text-sm font-medium truncate">{doc.category}</p>
                    ) : doc.aiCategorySuggestion ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                        <Sparkles className="h-3 w-3" />{doc.aiCategorySuggestion}
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('project')}</p>
                    <p className="text-sm">{doc.project || '—'}</p>
                  </div>
                </div>
                {doc.description && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{t('description')}</p>
                    <p className="text-sm">{doc.description}</p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* ---- ATTACHMENTS (in left column, collapsible) ---- */}
          <Card className="p-4">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Upload className="h-4 w-4" />
                {t('attachments')}
                {attachments.length > 0 && <Badge variant="secondary">{attachments.length}</Badge>}
              </div>
              {attachmentsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {attachmentsExpanded && (
              <div className="mt-3 space-y-2">
                {attachments.length > 0 ? (
                  attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{att.fileName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(att.fileSize / 1024).toFixed(0)} KB</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><Download className="h-3 w-3" /></Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0"><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noAttachments')}</p>
                )}
                {isAdmin && (
                  <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                    <FileUp className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">{t('scanner.dropHere')}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ---- NOTES ---- */}
          <CostNotesSection costDocumentId={id} isReadOnly={!isAdmin} />
        </div>

        {/* ========== RIGHT COLUMN ========== */}
        <div className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-4 flex flex-col gap-4">

            {/* ---- AI ASSISTANT ---- */}
            <Card className="order-last lg:order-first border-purple-200 dark:border-purple-900 bg-linear-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    {t('aiCategorization')}
                  </CardTitle>
                  {doc.aiConfidence !== undefined && (
                    <Badge variant="outline" className={cn('text-xs', getConfidenceColor(doc.aiConfidence))}>
                      {Math.round(doc.aiConfidence * 100)}%
                    </Badge>
                  )}
                </div>
                {doc.aiProcessedAt && (
                  <CardDescription className="text-xs">
                    Analiza: {formatDateTime(doc.aiProcessedAt)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {(doc.aiMpkSuggestion || doc.aiCategorySuggestion || doc.aiDescription) ? (
                  <>
                    <div className="space-y-2">
                      {/* MPK Comparison */}
                      {doc.aiMpkSuggestion && (
                        <div className={cn(
                          'p-3 rounded-lg border transition-colors',
                          doc.costCenter === doc.aiMpkSuggestion
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                            : 'bg-white dark:bg-background border-orange-200 dark:border-orange-800'
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">MPK</span>
                            {doc.costCenter === doc.aiMpkSuggestion ? (
                              <Badge variant="outline" className="text-[10px] h-4 bg-green-100 text-green-700 border-green-300">
                                <Check className="h-2.5 w-2.5 mr-0.5" />zgodne
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4 bg-orange-100 text-orange-700 border-orange-300">
                                różne
                              </Badge>
                            )}
                          </div>
                          {doc.costCenter !== doc.aiMpkSuggestion && doc.costCenter && (
                            <p className="text-xs text-muted-foreground line-through mb-0.5">{doc.costCenter}</p>
                          )}
                          <p className="font-medium text-purple-700 dark:text-purple-400">{doc.aiMpkSuggestion}</p>
                        </div>
                      )}

                      {/* Category Comparison */}
                      {doc.aiCategorySuggestion && (
                        <div className={cn(
                          'p-3 rounded-lg border transition-colors',
                          doc.category === doc.aiCategorySuggestion
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                            : 'bg-white dark:bg-background border-orange-200 dark:border-orange-800'
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{t('category')}</span>
                            {doc.category === doc.aiCategorySuggestion ? (
                              <Badge variant="outline" className="text-[10px] h-4 bg-green-100 text-green-700 border-green-300">
                                <Check className="h-2.5 w-2.5 mr-0.5" />zgodne
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4 bg-orange-100 text-orange-700 border-orange-300">
                                różne
                              </Badge>
                            )}
                          </div>
                          {doc.category !== doc.aiCategorySuggestion && doc.category && (
                            <p className="text-xs text-muted-foreground line-through mb-0.5">{doc.category}</p>
                          )}
                          <p className="font-medium text-purple-700 dark:text-purple-400">{doc.aiCategorySuggestion}</p>
                        </div>
                      )}

                      {/* Description Comparison */}
                      {doc.aiDescription && (
                        <div className={cn(
                          'p-3 rounded-lg border transition-colors',
                          doc.description === doc.aiDescription
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                            : 'bg-white dark:bg-background border-orange-200 dark:border-orange-800'
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{t('description')}</span>
                            {doc.description === doc.aiDescription ? (
                              <Badge variant="outline" className="text-[10px] h-4 bg-green-100 text-green-700 border-green-300">
                                <Check className="h-2.5 w-2.5 mr-0.5" />zgodne
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4 bg-orange-100 text-orange-700 border-orange-300">
                                różne
                              </Badge>
                            )}
                          </div>
                          {doc.description !== doc.aiDescription && doc.description && (
                            <p className="text-xs text-muted-foreground line-through mb-0.5">{doc.description}</p>
                          )}
                          <p className="text-sm text-purple-700 dark:text-purple-400">{doc.aiDescription}</p>
                        </div>
                      )}
                    </div>

                    {/* Apply button */}
                    {isAdmin && (doc.costCenter !== doc.aiMpkSuggestion ||
                      doc.category !== doc.aiCategorySuggestion ||
                      doc.description !== doc.aiDescription) && (
                      <Button className="w-full text-white" variant="default" size="sm"
                        onClick={isEditingClassification ? handleApplyAiToEdit : handleApplyAiSuggestions}
                        disabled={updateMutation.isPending}>
                        <Check className="h-4 w-4 mr-2" />
                        {isEditingClassification ? t('applyToForm') : t('applyAiSuggestions')}
                      </Button>
                    )}

                    {/* All matched */}
                    {doc.costCenter === doc.aiMpkSuggestion &&
                     doc.category === doc.aiCategorySuggestion &&
                     doc.description === doc.aiDescription && (
                      <div className="text-center py-2">
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          {t('allSuggestionsApplied')}
                        </p>
                      </div>
                    )}

                    {/* Re-analyze */}
                    {isAdmin && (
                      <Button className="w-full" variant="outline" size="sm"
                        onClick={handleAICategorize} disabled={aiCategorizeMutation.isPending}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {aiCategorizeMutation.isPending ? t('analyzing') : t('reAnalyze')}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t('aiEmptyState')}</p>
                    {isAdmin && (
                      <Button className="w-full" variant="default"
                        onClick={handleAICategorize} disabled={aiCategorizeMutation.isPending}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {aiCategorizeMutation.isPending ? t('analyzing') : t('runAiCategorize')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ---- DOCUMENT SCAN ---- */}
            <Card className="order-first lg:order-last">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('documentScan')}
                  </CardTitle>
                  {doc.documentFileName && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6"><RefreshCw className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {doc.documentFileName ? (
                  <div className="rounded-md border bg-muted/50 p-4 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{doc.documentFileName}</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('noScan')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
