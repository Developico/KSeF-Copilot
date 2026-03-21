import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button, Input, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, Textarea,
} from '@/components/ui'
import {
  ArrowLeft, Building2, Calendar, CreditCard, FileText,
  HandCoins, Loader2, ShieldCheck, ShieldX, RotateCcw, Send,
  StickyNote, MessageSquarePlus, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import {
  useSelfBillingInvoice,
  useApproveSelfBillingInvoice,
  useRejectSelfBillingInvoice,
  useSendSelfBillingToKsef,
  useRevertSelfBillingToDraft,
  useSubmitSelfBillingForReview,
  useSbInvoiceNotes,
  useCreateSbInvoiceNote,
  useUpdateSbInvoiceNote,
  useDeleteSbInvoiceNote,
} from '@/hooks/use-api'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { NoteTimeline } from '@/components/invoices/note-timeline'
import { NoteEditorDialog } from '@/components/invoices/note-editor-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Note, NoteCreate, NoteUpdate } from '@/lib/types'

// ── Status badge ─────────────────────────────────────────────────

function SbStatusBadge({ status }: { status: string }) {
  const intl = useIntl()
  const colors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-800',
    PendingSeller: 'bg-blue-100 text-blue-800',
    SellerApproved: 'bg-green-100 text-green-800',
    SellerRejected: 'bg-red-100 text-red-800',
    SentToKsef: 'bg-indigo-100 text-indigo-800',
    Cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <Badge className={colors[status] ?? colors.Draft}>
      {intl.formatMessage({ id: `selfBilling.status.${status}` })}
    </Badge>
  )
}

// ── Notes section (inline) ───────────────────────────────────────

function SbNotesSection({ sbInvoiceId }: { sbInvoiceId: string }) {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)

  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)

  const { data, isLoading } = useSbInvoiceNotes(sbInvoiceId, {
    enabled: isExpanded,
  })
  const createNote = useCreateSbInvoiceNote()
  const updateNote = useUpdateSbInvoiceNote()
  const deleteNote = useDeleteSbInvoiceNote()

  const notes = data?.notes ?? []

  const handleAddNote = useCallback(() => {
    setEditingNote(null)
    setIsEditorOpen(true)
  }, [])

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note)
    setIsEditorOpen(true)
  }, [])

  const handleDeleteNote = useCallback((note: Note) => {
    setDeletingNote(note)
  }, [])

  const handleSaveNote = useCallback(
    async (data: NoteCreate | NoteUpdate) => {
      if (editingNote) {
        await updateNote.mutateAsync(
          { noteId: editingNote.id, data: data as NoteUpdate, sbInvoiceId },
          {
            onSuccess: () => toast.success(t('sbDetail.notes.noteUpdated')),
            onError: (err) => toast.error(err.message || t('sbDetail.notes.updateError')),
          },
        )
      } else {
        await createNote.mutateAsync(
          { sbInvoiceId, data: data as NoteCreate },
          {
            onSuccess: () => toast.success(t('sbDetail.notes.noteAdded')),
            onError: (err) => toast.error(err.message || t('sbDetail.notes.addError')),
          },
        )
      }
    },
    [editingNote, createNote, updateNote, sbInvoiceId, t],
  )

  const handleConfirmDelete = useCallback(() => {
    if (!deletingNote) return
    deleteNote.mutate(
      { noteId: deletingNote.id, sbInvoiceId },
      {
        onSuccess: () => {
          setDeletingNote(null)
          toast.success(t('sbDetail.notes.noteDeleted'))
        },
        onError: (err) => toast.error(err.message || t('sbDetail.notes.deleteError')),
      },
    )
  }, [deletingNote, deleteNote, sbInvoiceId, t])

  return (
    <>
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {t('sbDetail.notes.title')}
            {notes.length > 0 && (
              <Badge variant="secondary" className="h-5 text-xs">
                {notes.length}
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            <Button variant="outline" size="sm" className="w-full" onClick={handleAddNote}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {t('sbDetail.notes.addNote')}
            </Button>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <NoteTimeline
                notes={notes}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                isDeleting={deleteNote.isPending ? deletingNote?.id : undefined}
              />
            )}
          </div>
        )}
      </Card>

      <NoteEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        isPending={createNote.isPending || updateNote.isPending}
      />

      <AlertDialog open={!!deletingNote} onOpenChange={() => setDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sbDetail.notes.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sbDetail.notes.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNote.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('common.deleting')}</>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Detail Page ──────────────────────────────────────────────────

export function SelfBillingDetailPage() {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { isAdmin } = useAuth()

  const { data, isLoading, error, refetch } = useSelfBillingInvoice(id ?? '')
  const invoice = data?.data

  // Dialogs
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [approveInvoiceNumber, setApproveInvoiceNumber] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [revertOpen, setRevertOpen] = useState(false)
  const [revertReason, setRevertReason] = useState('')

  const submitMutation = useSubmitSelfBillingForReview()
  const approveMutation = useApproveSelfBillingInvoice()
  const rejectMutation = useRejectSelfBillingInvoice()
  const sendToKsefMutation = useSendSelfBillingToKsef()
  const revertMutation = useRevertSelfBillingToDraft()

  function handleSubmit() {
    if (!id) return
    submitMutation.mutate(id, {
      onSuccess: () => { toast.success(t('selfBilling.submitted')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleApproveConfirm() {
    if (!id) return
    const trimmedNumber = approveInvoiceNumber.trim()
    if (!trimmedNumber) return
    approveMutation.mutate(
      {
        id,
        comment: approveComment.trim() || undefined,
        invoiceNumber: trimmedNumber !== invoice?.invoiceNumber ? trimmedNumber : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('selfBilling.approved'))
          setApproveOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleRejectConfirm() {
    if (!id) return
    rejectMutation.mutate(
      { id, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success(t('selfBilling.rejected'))
          setRejectOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleSendToKsef() {
    if (!id) return
    sendToKsefMutation.mutate(id, {
      onSuccess: () => { toast.success(t('selfBilling.sentToKsef')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleRevertConfirm() {
    if (!id || !revertReason.trim()) return
    revertMutation.mutate(
      { id, reason: revertReason.trim() },
      {
        onSuccess: () => {
          toast.success(t('sbDetail.reverted'))
          setRevertOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function fmtDate(dateStr: string | undefined): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  // Loading
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Error / not found
  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/self-billing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{t('sbDetail.notFound')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canSubmit = invoice.status === 'Draft'
  const canApprove = invoice.status === 'PendingSeller'
  const canSendToKsef = invoice.status === 'SellerApproved' && isAdmin
  const canRevert = isAdmin && invoice.status !== 'Draft' && invoice.status !== 'SentToKsef'

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/self-billing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-emerald-500" />
            <h1 className="text-xl font-bold">{invoice.invoiceNumber}</h1>
          </div>
          <SbStatusBadge status={invoice.status} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {t('selfBilling.submitForReview')}
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                size="sm" variant="outline"
                className="text-green-700 border-green-200 hover:bg-green-50"
                onClick={() => { setApproveComment(''); setApproveInvoiceNumber(invoice?.invoiceNumber || ''); setApproveOpen(true) }}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                {t('selfBilling.approve')}
              </Button>
              <Button
                size="sm" variant="outline"
                className="text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => { setRejectReason(''); setRejectOpen(true) }}
              >
                <ShieldX className="h-4 w-4 mr-1" />
                {t('selfBilling.reject')}
              </Button>
            </>
          )}
          {canSendToKsef && (
            <Button size="sm" onClick={handleSendToKsef} disabled={sendToKsefMutation.isPending}>
              {sendToKsefMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {t('selfBilling.sendToKsef')}
            </Button>
          )}
          {canRevert && (
            <Button
              size="sm" variant="outline"
              className="text-orange-700 border-orange-200 hover:bg-orange-50"
              onClick={() => { setRevertReason(''); setRevertOpen(true) }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('sbDetail.revertButton')}
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('sbDetail.invoiceInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('sbDetail.invoiceDate')}:</span>
                <span className="font-medium">{fmtDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('sbDetail.dueDate')}:</span>
                <span className="font-medium">{fmtDate(invoice.dueDate)}</span>
              </div>
              {invoice.ksefReferenceNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('sbDetail.ksefRef')}:</span>
                  <span className="font-medium font-mono text-xs">{invoice.ksefReferenceNumber}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('sbDetail.supplier')}:</span>
                <span className="font-medium">{invoice.supplierName || '—'}</span>
              </div>
              {invoice.supplierNip && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground ml-6">NIP:</span>
                  <span className="font-medium">{invoice.supplierNip}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t my-4" />

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{t('sbDetail.netAmount')}</p>
              <p className="font-semibold text-lg">{formatCurrency(invoice.netAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('sbDetail.vatAmount')}</p>
              <p className="font-semibold text-lg">{formatCurrency(invoice.vatAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('sbDetail.grossAmount')}</p>
              <p className="font-semibold text-lg text-primary">{formatCurrency(invoice.grossAmount)}</p>
            </div>
          </div>

          {/* Rejection reason */}
          {invoice.rejectionReason && (
            <>
              <div className="border-t my-4" />
              <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-1">{t('sbDetail.rejectionReason')}</p>
                <p className="text-red-700 dark:text-red-300">{invoice.rejectionReason}</p>
              </div>
            </>
          )}

          {/* Approval info */}
          {invoice.approvedAt && (
            <>
              <div className="border-t my-4" />
              <div className="text-sm text-muted-foreground">
                <span>{t('sbDetail.decisionAt')}: </span>
                <span className="font-medium">{fmtDate(invoice.approvedAt)}</span>
                {invoice.status === 'SellerApproved' && !invoice.approvedByUserId && (
                  <Badge className="ml-2 bg-amber-100 text-amber-800">{t('sbDetail.autoApproved')}</Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('sbDetail.lineItems')}
              <Badge variant="secondary" className="h-5 text-xs">{invoice.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">{t('sbDetail.itemDescription')}</th>
                    <th className="p-3 text-right font-medium">{t('sbDetail.quantity')}</th>
                    <th className="p-3 text-left font-medium">{t('sbDetail.unit')}</th>
                    <th className="p-3 text-right font-medium">{t('sbDetail.unitPrice')}</th>
                    <th className="p-3 text-right font-medium">{t('sbDetail.vatRate')}</th>
                    <th className="p-3 text-right font-medium">{t('sbDetail.netAmountItem')}</th>
                    <th className="p-3 text-right font-medium">{t('sbDetail.grossAmountItem')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3 max-w-[200px] truncate" title={item.itemDescription}>{item.itemDescription}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3">{item.unit}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right">{item.vatRate}%</td>
                      <td className="p-3 text-right">{formatCurrency(item.netAmount ?? 0)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.grossAmount ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <SbNotesSection sbInvoiceId={id!} />

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('sbDetail.approveTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('sbDetail.approveConfirm', { number: invoice.invoiceNumber })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="approve-invoice-number">{t('sbDetail.invoiceNumberLabel')}</Label>
            <Input
              id="approve-invoice-number"
              value={approveInvoiceNumber}
              onChange={(e) => setApproveInvoiceNumber(e.target.value)}
              maxLength={256}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-comment">{t('sbDetail.commentOptional')}</Label>
            <Textarea
              id="approve-comment"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder={t('sbDetail.commentPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>{t('common.cancel')}</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending || !approveInvoiceNumber.trim()}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              {t('selfBilling.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('selfBilling.rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t('sbDetail.rejectReasonLabel')}</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('selfBilling.rejectReasonPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-1" />}
              {t('selfBilling.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Dialog */}
      <Dialog open={revertOpen} onOpenChange={setRevertOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('sbDetail.revertTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('sbDetail.revertConfirm', { number: invoice.invoiceNumber })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="revert-reason">{t('sbDetail.revertReasonLabel')}</Label>
            <Textarea
              id="revert-reason"
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              placeholder={t('sbDetail.revertReasonPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertOpen(false)}>{t('common.cancel')}</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleRevertConfirm}
              disabled={revertMutation.isPending || !revertReason.trim()}
            >
              {revertMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              {t('sbDetail.revertButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
