'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  HandCoins,
  Loader2,
  ShieldCheck,
  ShieldX,
  RotateCcw,
  Send,
} from 'lucide-react'
import Link from 'next/link'

import {
  useSelfBillingInvoice,
  useApproveSelfBillingInvoice,
  useRejectSelfBillingInvoice,
  useSendSelfBillingToKsef,
  useRevertSelfBillingToDraft,
  useSubmitSelfBillingForReview,
} from '@/hooks/use-api'
import { useHasRole } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { StatusBadge } from './status-badge'
import { SbInvoiceNotesSection } from './sb-invoice-notes-section'
import { formatCurrency } from '@/lib/format'

interface SbInvoiceDetailContentProps {
  sbInvoiceId: string
}

export function SbInvoiceDetailContent({ sbInvoiceId }: SbInvoiceDetailContentProps) {
  const router = useRouter()
  const locale = useLocale()
  const dateLocale = locale === 'pl' ? pl : enUS
  const t = useTranslations('selfBilling')
  const tCommon = useTranslations('common')

  const isAdmin = useHasRole('Admin')

  const { data: invoice, isLoading, error, refetch } = useSelfBillingInvoice(sbInvoiceId)

  // Revert to draft
  const [revertOpen, setRevertOpen] = useState(false)
  const [revertReason, setRevertReason] = useState('')
  const revertMutation = useRevertSelfBillingToDraft()

  // Approve with optional comment and invoice number override
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [approveInvoiceNumber, setApproveInvoiceNumber] = useState('')
  const approveMutation = useApproveSelfBillingInvoice()

  // Reject
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const rejectMutation = useRejectSelfBillingInvoice()

  // Send to KSeF
  const sendToKsefMutation = useSendSelfBillingToKsef()

  // Submit for review
  const submitMutation = useSubmitSelfBillingForReview()

  function handleSubmitForReview() {
    submitMutation.mutate(sbInvoiceId, {
      onSuccess: () => { toast.success(t('submitted')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleApproveOpen() {
    setApproveComment('')
    setApproveInvoiceNumber(invoice?.invoiceNumber || '')
    setApproveOpen(true)
  }

  function handleApproveConfirm() {
    const trimmedNumber = approveInvoiceNumber.trim()
    if (!trimmedNumber) return
    approveMutation.mutate(
      {
        id: sbInvoiceId,
        comment: approveComment.trim() || undefined,
        invoiceNumber: trimmedNumber !== invoice?.invoiceNumber ? trimmedNumber : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('approved'))
          setApproveOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleRejectOpen() {
    setRejectReason('')
    setRejectOpen(true)
  }

  function handleRejectConfirm() {
    rejectMutation.mutate(
      { id: sbInvoiceId, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success(t('rejected'))
          setRejectOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleSendToKsef() {
    sendToKsefMutation.mutate(sbInvoiceId, {
      onSuccess: () => { toast.success(t('sentToKsef')); refetch() },
      onError: (err) => toast.error(err.message),
    })
  }

  function handleRevertOpen() {
    setRevertReason('')
    setRevertOpen(true)
  }

  function handleRevertConfirm() {
    if (!revertReason.trim()) return
    revertMutation.mutate(
      { id: sbInvoiceId, reason: revertReason.trim() },
      {
        onSuccess: () => {
          toast.success(t('detail.reverted'))
          setRevertOpen(false)
          refetch()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function fmtDate(dateStr: string | undefined): string {
    if (!dateStr) return '—'
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: dateLocale })
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
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon('back')}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{t('detail.notFound')}</p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/self-billing`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon('back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-emerald-500" />
            <h1 className="text-xl font-bold">{invoice.invoiceNumber}</h1>
          </div>
          <StatusBadge status={invoice.status} t={t} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canSubmit && (
            <Button
              size="sm"
              onClick={handleSubmitForReview}
              disabled={submitMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {t('submitForReview')}
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 border-green-200 hover:bg-green-50"
                onClick={handleApproveOpen}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                {t('approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-200 hover:bg-red-50"
                onClick={handleRejectOpen}
              >
                <ShieldX className="h-4 w-4 mr-1" />
                {t('reject')}
              </Button>
            </>
          )}
          {canSendToKsef && (
            <Button
              size="sm"
              onClick={handleSendToKsef}
              disabled={sendToKsefMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {t('sendToKsef')}
            </Button>
          )}
          {canRevert && (
            <Button
              size="sm"
              variant="outline"
              className="text-orange-700 border-orange-200 hover:bg-orange-50"
              onClick={handleRevertOpen}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('detail.revertButton')}
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('detail.invoiceInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('detail.invoiceDate')}:</span>
                <span className="font-medium">{fmtDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('detail.dueDate')}:</span>
                <span className="font-medium">{fmtDate(invoice.dueDate)}</span>
              </div>
              {invoice.ksefReferenceNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('detail.ksefRef')}:</span>
                  <span className="font-medium font-mono text-xs">{invoice.ksefReferenceNumber}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('detail.supplier')}:</span>
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

          <Separator className="my-4" />

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{t('detail.netAmount')}</p>
              <p className="font-semibold text-lg">{formatCurrency(invoice.netAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('detail.vatAmount')}</p>
              <p className="font-semibold text-lg">{formatCurrency(invoice.vatAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('detail.grossAmount')}</p>
              <p className="font-semibold text-lg text-primary">{formatCurrency(invoice.grossAmount)}</p>
            </div>
          </div>

          {/* Rejection reason */}
          {invoice.sellerRejectionReason && (
            <>
              <Separator className="my-4" />
              <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-1">{t('detail.rejectionReason')}</p>
                <p className="text-red-700 dark:text-red-300">{invoice.sellerRejectionReason}</p>
              </div>
            </>
          )}

          {/* Approval info */}
          {invoice.approvedAt && (
            <>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">
                <span>{t('detail.decisionAt')}: </span>
                <span className="font-medium">{fmtDate(invoice.approvedAt)}</span>
                {invoice.status === 'SellerApproved' && !invoice.approvedByUserId && (
                  <Badge className="ml-2 bg-amber-100 text-amber-800">{t('detail.autoApproved')}</Badge>
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
              {t('detail.lineItems')}
              <Badge variant="secondary" className="h-5 text-xs">{invoice.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.itemDescription')}</TableHead>
                  <TableHead className="text-right">{t('detail.quantity')}</TableHead>
                  <TableHead>{t('detail.unit')}</TableHead>
                  <TableHead className="text-right">{t('detail.unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('detail.vatRate')}</TableHead>
                  <TableHead className="text-right">{t('detail.netAmountItem')}</TableHead>
                  <TableHead className="text-right">{t('detail.grossAmountItem')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell className="max-w-[200px] truncate" title={item.itemDescription}>{item.itemDescription}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice ?? 0)}</TableCell>
                    <TableCell className="text-right">{item.vatRate}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.netAmount ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.grossAmount ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      <SbInvoiceNotesSection
        sbInvoiceId={sbInvoiceId}
        defaultExpanded
      />

      {/* Approve Dialog with optional comment */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('detail.approveTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('detail.approveConfirm', { number: invoice.invoiceNumber })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="approve-invoice-number">{t('detail.invoiceNumberLabel')}</Label>
            <Input
              id="approve-invoice-number"
              value={approveInvoiceNumber}
              onChange={(e) => setApproveInvoiceNumber(e.target.value)}
              maxLength={256}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-comment">{t('detail.commentOptional')}</Label>
            <Textarea
              id="approve-comment"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder={t('detail.commentPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending || !approveInvoiceNumber.trim()}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              {t('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to Draft Dialog */}
      <Dialog open={revertOpen} onOpenChange={setRevertOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('detail.revertTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('detail.revertConfirm', { number: invoice.invoiceNumber })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="revert-reason">{t('detail.revertReasonLabel')}</Label>
            <Textarea
              id="revert-reason"
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              placeholder={t('detail.revertReasonPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleRevertConfirm}
              disabled={revertMutation.isPending || !revertReason.trim()}
            >
              {revertMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              {t('detail.revertButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t('detail.rejectReasonLabel')}</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectReasonPlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldX className="h-4 w-4 mr-1" />
              )}
              {t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
