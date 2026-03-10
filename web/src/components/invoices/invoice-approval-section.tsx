'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ShieldCheck, ShieldX, ShieldAlert, ShieldMinus, RefreshCw, Undo2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  useApproveInvoice,
  useRejectInvoice,
  useCancelApproval,
  useRefreshApprovers,
} from '@/hooks/use-api'
import type { Invoice, ApprovalStatus } from '@/lib/api'

// ---------------------------------------------------------------------------
// Approval Status Badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<ApprovalStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; icon: typeof ShieldCheck }> = {
  Draft: { variant: 'outline', className: '', icon: ShieldCheck },
  Pending: { variant: 'secondary', className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800', icon: ShieldAlert },
  Approved: { variant: 'default', className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800', icon: ShieldCheck },
  Rejected: { variant: 'destructive', className: '', icon: ShieldX },
  Cancelled: { variant: 'outline', className: '', icon: ShieldX },
}

export function ApprovalStatusBadge({ status }: { status?: ApprovalStatus }) {
  const t = useTranslations('invoices.approval')

  if (!status || status === 'Draft') {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <ShieldMinus className="h-3 w-3" />
        {t('notRequired')}
      </Badge>
    )
  }

  const style = STATUS_STYLES[status]
  const Icon = style.icon

  return (
    <Badge variant={style.variant} className={`gap-1 ${style.className}`}>
      <Icon className="h-3 w-3" />
      {t(status.toLowerCase() as 'pending' | 'approved' | 'rejected')}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Approval Actions
// ---------------------------------------------------------------------------

interface InvoiceApprovalActionsProps {
  invoice: Invoice
  isAdmin: boolean
}

export function InvoiceApprovalActions({ invoice, isAdmin }: InvoiceApprovalActionsProps) {
  const t = useTranslations('invoices.approval')
  const { toast } = useToast()

  const approveMutation = useApproveInvoice()
  const rejectMutation = useRejectInvoice()
  const cancelMutation = useCancelApproval()
  const refreshMutation = useRefreshApprovers()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [comment, setComment] = useState('')

  const isPending = invoice.approvalStatus === 'Pending'
  const isDecided = invoice.approvalStatus === 'Approved' || invoice.approvalStatus === 'Rejected'

  async function handleApprove() {
    try {
      await approveMutation.mutateAsync({ invoiceId: invoice.id, comment: comment || undefined })
      toast({ title: t('approvedSuccess') })
      setApproveOpen(false)
      setComment('')
    } catch {
      toast({ title: t('approveError'), variant: 'destructive' })
    }
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync({ invoiceId: invoice.id, comment: comment || undefined })
      toast({ title: t('rejectedSuccess') })
      setRejectOpen(false)
      setComment('')
    } catch {
      toast({ title: t('rejectError'), variant: 'destructive' })
    }
  }

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(invoice.id)
      toast({ title: t('cancelledSuccess') })
    } catch {
      toast({ title: t('cancelError'), variant: 'destructive' })
    }
  }

  async function handleRefresh() {
    try {
      await refreshMutation.mutateAsync(invoice.id)
      toast({ title: t('refreshedSuccess') })
    } catch {
      toast({ title: t('refreshError'), variant: 'destructive' })
    }
  }

  if (!invoice.approvalStatus || invoice.approvalStatus === 'Draft') return null

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Refresh approvers — left of action buttons */}
        {isPending && isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refreshApprovers')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Approve / Reject buttons for pending invoices */}
        {isPending && isAdmin && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => setApproveOpen(true)}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              {t('approve')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => setRejectOpen(true)}
            >
              <ShieldX className="h-4 w-4 mr-1" />
              {t('reject')}
            </Button>
          </>
        )}

        {/* Cancel approval for decided invoices */}
        {isDecided && isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cancelApproval')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Approval info for decided invoices */}
      {isDecided && invoice.approvedBy && (
        <p className="text-xs text-muted-foreground">
          {t('decidedBy', { name: invoice.approvedBy })}
          {invoice.approvedAt && ` · ${new Date(invoice.approvedAt).toLocaleDateString()}`}
          {invoice.approvalComment && ` · "${invoice.approvalComment}"`}
        </p>
      )}

      {/* Approve dialog */}
      <CommentDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={t('approveTitle')}
        description={t('approveDesc')}
        comment={comment}
        onCommentChange={setComment}
        onConfirm={handleApprove}
        isPending={approveMutation.isPending}
        confirmLabel={t('approve')}
        confirmClassName=""
        t={t}
      />

      {/* Reject dialog */}
      <CommentDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t('rejectTitle')}
        description={t('rejectDesc')}
        comment={comment}
        onCommentChange={setComment}
        onConfirm={handleReject}
        isPending={rejectMutation.isPending}
        confirmLabel={t('reject')}
        confirmClassName="bg-destructive hover:bg-destructive/90"
        t={t}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Comment Dialog (shared between approve and reject)
// ---------------------------------------------------------------------------

function CommentDialog({
  open,
  onOpenChange,
  title,
  description,
  comment,
  onCommentChange,
  onConfirm,
  isPending,
  confirmLabel,
  confirmClassName,
  t,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  comment: string
  onCommentChange: (v: string) => void
  onConfirm: () => void
  isPending: boolean
  confirmLabel: string
  confirmClassName: string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t('commentLabel')}</Label>
          <Input
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={t('commentPlaceholder')}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isPending} className={confirmClassName}>
            {isPending ? t('processing') : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
