import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Card, CardContent, Badge, Button, Input, Skeleton, Separator } from '@/components/ui'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui'
import {
  ArrowLeft, Calendar, Building2, Check, Clock, CreditCard,
  FileText, Pencil, Save, Sparkles, Tag, Trash2, X, Loader2,
  CheckCircle, ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { CostTypeIcon } from '@/components/costs/cost-type-icon'
import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import {
  useCostDocument,
  useUpdateCostDocument,
  useDeleteCostDocument,
  useAICostDocCategorize,
  useMpkCenters,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { useHasRole } from '@/components/auth/auth-provider'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import type { CostDocumentType } from '@/lib/types'

const COST_DOCUMENT_TYPES: CostDocumentType[] = [
  'Receipt', 'Acknowledgment', 'ProForma', 'DebitNote', 'Bill', 'ContractInvoice', 'Other',
]

function formatDateTime(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function CostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const intl = useIntl()
  const t = (key: string) => intl.formatMessage({ id: key })
  const { selectedCompany } = useCompanyContext()
  const isAdmin = useHasRole('Admin')

  const { data: doc, isLoading } = useCostDocument(id ?? '')
  const updateMutation = useUpdateCostDocument()
  const deleteMutation = useDeleteCostDocument()
  const aiCategorizeMutation = useAICostDocCategorize()
  const { data: mpkData } = useMpkCenters(selectedCompany?.id ?? '')
  const mpkOptions = mpkData?.mpkCenters ?? []

  // Edit states — Document card
  const [isEditingDocument, setIsEditingDocument] = useState(false)
  const [editDocNumber, setEditDocNumber] = useState('')
  const [editDocDate, setEditDocDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDocType, setEditDocType] = useState('')

  // Edit states — Supplier card
  const [isEditingSupplier, setIsEditingSupplier] = useState(false)
  const [editIssuerName, setEditIssuerName] = useState('')
  const [editIssuerNip, setEditIssuerNip] = useState('')

  // Edit states — Amounts card
  const [isEditingAmounts, setIsEditingAmounts] = useState(false)
  const [editNetAmount, setEditNetAmount] = useState('')
  const [editVatAmount, setEditVatAmount] = useState('')
  const [editGrossAmount, setEditGrossAmount] = useState('')
  const [editCurrency, setEditCurrency] = useState('')

  // Edit states — Classification
  const [isEditingClassification, setIsEditingClassification] = useState(false)
  const [editMpk, setEditMpk] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const isOverdue = doc?.dueDate && doc.paymentStatus !== 'paid' && new Date(doc.dueDate) < new Date()

  // --- Handlers ---

  const handleTogglePayment = async () => {
    if (!doc || !id) return
    const newStatus = doc.paymentStatus === 'paid' ? 'pending' : 'paid'
    try {
      await updateMutation.mutateAsync({ id, data: { paymentStatus: newStatus } })
      toast.success(newStatus === 'paid' ? t('costs.markAsPaid') : t('costs.markAsUnpaid'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t('costs.deleted'))
      navigate('/costs')
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleAICategorize = async () => {
    if (!id) return
    try {
      await aiCategorizeMutation.mutateAsync({ costDocumentId: id })
      toast.success(t('costs.aiCategorized'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleApplyAiSuggestions = async () => {
    if (!doc?.aiMpkSuggestion && !doc?.aiCategorySuggestion) return
    try {
      await updateMutation.mutateAsync({
        id: id!,
        data: {
          ...(doc.aiMpkSuggestion ? { costCenter: doc.aiMpkSuggestion } : {}),
          ...(doc.aiCategorySuggestion ? { category: doc.aiCategorySuggestion } : {}),
          ...(doc.aiDescription ? { description: doc.aiDescription } : {}),
        },
      })
      toast.success(t('costs.aiApplied'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // --- Edit: Document Card ---
  const startEditingDocument = () => {
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
        id: id!,
        data: {
          documentNumber: editDocNumber,
          documentDate: editDocDate,
          dueDate: editDueDate || undefined,
          documentType: editDocType as CostDocumentType,
        },
      })
      setIsEditingDocument(false)
      toast.success(t('common.saved'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // --- Edit: Supplier Card ---
  const startEditingSupplier = () => {
    if (!doc) return
    setEditIssuerName(doc.issuerName)
    setEditIssuerNip(doc.issuerNip || '')
    setIsEditingSupplier(true)
  }

  const saveSupplierCard = async () => {
    try {
      await updateMutation.mutateAsync({
        id: id!,
        data: { issuerName: editIssuerName, issuerNip: editIssuerNip || undefined },
      })
      setIsEditingSupplier(false)
      toast.success(t('common.saved'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // --- Edit: Amounts Card ---
  const startEditingAmounts = () => {
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
        id: id!,
        data: {
          grossAmount: parseFloat(editGrossAmount) || undefined,
          netAmount: parseFloat(editNetAmount) || undefined,
          vatAmount: parseFloat(editVatAmount) || undefined,
          currency: editCurrency || undefined,
        },
      })
      setIsEditingAmounts(false)
      toast.success(t('common.saved'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // --- Edit: Classification ---
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
        id: id!,
        data: {
          category: editCategory || undefined,
          description: editDescription || undefined,
        },
      })
      setIsEditingClassification(false)
      toast.success(t('common.saved'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // --- Loading / Not found ---

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" asChild>
          <Link to="/costs"><ArrowLeft className="h-4 w-4 mr-2" />{t('costs.backToList')}</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('costs.noDocuments')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* ========== HEADER ========== */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to="/costs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CostTypeIcon type={doc.documentType} className="h-5 w-5" />
            <h1 className="text-xl sm:text-2xl font-bold truncate">{doc.documentNumber}</h1>
            <Badge variant="outline">{t(`costs.docType.${doc.documentType}`)}</Badge>
          </div>
          <p className="text-muted-foreground text-sm truncate">{doc.issuerName}</p>
        </div>
      </div>

      {/* ========== ACTION TOOLBAR ========== */}
      <div className="rounded-lg border bg-muted/40 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Approval */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('costs.colApproval')}</span>
          <ApprovalStatusBadge status={doc.approvalStatus} />
          {doc.approvedBy && (
            <span className="text-xs text-muted-foreground">
              {doc.approvedBy}{doc.approvedAt ? ` · ${formatDate(doc.approvedAt)}` : ''}
            </span>
          )}
        </div>

        <Separator orientation="vertical" className="hidden sm:block h-6" />
        <Separator orientation="horizontal" className="sm:hidden" />

        {/* Payment */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('costs.colPayment')}</span>
          <Badge className={doc.paymentStatus === 'paid'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
          }>
            {doc.paymentStatus === 'paid' ? (
              <><Check className="h-3 w-3 mr-1" />{t('costs.paid')}</>
            ) : (
              <>{t('costs.pending')}</>
            )}
          </Badge>
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-7 text-xs"
              onClick={handleTogglePayment} disabled={updateMutation.isPending}>
              {doc.paymentStatus === 'paid' ? t('costs.markAsUnpaid') : t('costs.markAsPaid')}
            </Button>
          )}
        </div>

        <div className="flex-1" />

        {/* AI Categorize */}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
          onClick={handleAICategorize}
          disabled={aiCategorizeMutation.isPending}>
          {aiCategorizeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {t('costs.aiCategorize')}
        </Button>

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
                <AlertDialogTitle>{t('costs.deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('costs.deleteConfirmDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* ========== 3 CARDS TOP ROW ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Document Data */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" />
              {t('costs.detailTitle')}
            </div>
            {isAdmin && !isEditingDocument && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingDocument}>
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
              <div><label className="text-xs text-muted-foreground">{t('costs.colNumber')}</label><Input value={editDocNumber} onChange={e => setEditDocNumber(e.target.value)} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('costs.colType')}</label>
                <Select value={editDocType} onValueChange={setEditDocType}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COST_DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{t(`costs.docType.${type}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">{t('costs.colDate')}</label><Input type="date" value={editDocDate} onChange={e => setEditDocDate(e.target.value)} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('costs.dueDate')}</label><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="h-8 text-sm" /></div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.colNumber')}</p>
                <p className="font-medium">{doc.documentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.colDate')}</p>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {formatDate(doc.documentDate)}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.dueDate')}</p>
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                  <Clock className="h-3 w-3" />
                  {doc.dueDate ? formatDate(doc.dueDate) : '—'}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.source')}</p>
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
              {t('costs.supplierSection')}
            </div>
            {isAdmin && !isEditingSupplier && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingSupplier}>
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
              <div><label className="text-xs text-muted-foreground">{t('costs.colIssuer')}</label><Input value={editIssuerName} onChange={e => setEditIssuerName(e.target.value)} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('costs.issuerNip')}</label><Input value={editIssuerNip} onChange={e => setEditIssuerNip(e.target.value)} className="h-8 text-sm" /></div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{doc.issuerName}</p>
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.issuerNip')}</p>
                <p className="font-mono text-sm">{doc.issuerNip || '—'}</p>
              </div>
              {doc.issuerAddress && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('costs.address')}</p>
                  <p className="text-sm">{[doc.issuerAddress, doc.issuerPostalCode, doc.issuerCity].filter(Boolean).join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Card 3: Amounts */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4" />
              {t('costs.amountsSection')}
            </div>
            {isAdmin && !isEditingAmounts && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingAmounts}>
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
              <div><label className="text-xs text-muted-foreground">{t('costs.netAmount')}</label><Input type="number" step="0.01" value={editNetAmount} onChange={e => setEditNetAmount(e.target.value)} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('costs.vatAmount')}</label><Input type="number" step="0.01" value={editVatAmount} onChange={e => setEditVatAmount(e.target.value)} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('costs.colAmount')}</label><Input type="number" step="0.01" value={editGrossAmount} onChange={e => setEditGrossAmount(e.target.value)} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('costs.currency')}</label>
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
                <p className="text-xs text-muted-foreground">{t('costs.netAmount')}</p>
                <p className="font-medium">{formatCurrency(doc.netAmount, doc.currency || 'PLN')}</p>
              </div>
              {doc.vatAmount != null && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('costs.vatAmount')}</p>
                  <p className="font-medium">{formatCurrency(doc.vatAmount, doc.currency || 'PLN')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.colAmount')}</p>
                <p className={`text-lg font-bold ${doc.grossAmount < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(doc.grossAmount, doc.currency || 'PLN')}
                </p>
              </div>
              {doc.currency !== 'PLN' && doc.grossAmountPln && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('costs.amountPln')}</p>
                  <p className="font-medium">{formatCurrency(doc.grossAmountPln, 'PLN')}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ========== CLASSIFICATION CARD ========== */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4" />
            {t('costs.classificationSection')}
          </div>
          <div className="flex items-center gap-1">
            {(doc.aiMpkSuggestion || doc.aiCategorySuggestion) && !isEditingClassification && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleApplyAiSuggestions}
                disabled={updateMutation.isPending}>
                <Sparkles className="h-3 w-3" />
                {t('costs.applyAiSuggestions')}
              </Button>
            )}
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
        </div>
        {isEditingClassification ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('costs.colMpk')}</label>
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
              <label className="text-xs text-muted-foreground">{t('costs.colCategory')}</label>
              <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('costs.description')}</label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('costs.colMpk')}</p>
              {doc.costCenter ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mt-1">
                  {doc.costCenter}
                </Badge>
              ) : doc.aiMpkSuggestion ? (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 mt-1">
                  <Sparkles className="h-3 w-3" />
                  {doc.aiMpkSuggestion}
                </Badge>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('costs.colCategory')}</p>
              {doc.category ? (
                <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 mt-1">
                  {doc.category}
                </Badge>
              ) : doc.aiCategorySuggestion ? (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 mt-1">
                  <Sparkles className="h-3 w-3" />
                  {doc.aiCategorySuggestion}
                </Badge>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('costs.description')}</p>
              <p className="font-medium">{doc.description || '—'}</p>
            </div>
          </div>
        )}
      </Card>

      {/* ========== AI INSIGHTS ========== */}
      {(doc.aiDescription || doc.aiConfidence) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Sparkles className="h-4 w-4 text-purple-500" />
            {t('costs.aiInsights')}
          </div>
          <div className="space-y-2 text-sm">
            {doc.aiDescription && (
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.aiDescription')}</p>
                <p>{doc.aiDescription}</p>
              </div>
            )}
            {doc.aiConfidence != null && (
              <div>
                <p className="text-xs text-muted-foreground">{t('costs.aiConfidence')}</p>
                <p className={`font-medium ${
                  doc.aiConfidence >= 0.8 ? 'text-green-600'
                    : doc.aiConfidence >= 0.5 ? 'text-yellow-600'
                      : 'text-red-600'
                }`}>{Math.round(doc.aiConfidence * 100)}%</p>
              </div>
            )}
            {doc.aiProcessedAt && (
              <p className="text-xs text-muted-foreground">
                {t('costs.aiProcessedAt')}: {formatDateTime(doc.aiProcessedAt)}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ========== METADATA ========== */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <FileText className="h-4 w-4" />
          {t('costs.metadata')}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t('costs.source')}</p>
            <Badge variant="secondary" className="text-xs">{doc.source}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('costs.project')}</p>
            <p className="font-medium">{doc.project || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('costs.createdOn')}</p>
            <p>{formatDateTime(doc.createdOn)}</p>
          </div>
          {doc.modifiedOn && (
            <div>
              <p className="text-xs text-muted-foreground">{t('costs.modifiedOn')}</p>
              <p>{formatDateTime(doc.modifiedOn)}</p>
            </div>
          )}
        </div>
        {doc.notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">{t('costs.notes')}</p>
            <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
