import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Shield,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import {
  useApproveInvoice,
  useRejectInvoice,
  useCancelApproval,
  useRefreshApprovers,
} from '@/hooks/use-api'
import { ApprovalStatusBadge } from './approval-status-badge'
import { formatDate } from '@/lib/format'
import type { Invoice, ApprovalStatus } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  invoice: Invoice
  isAdmin: boolean
  onRefresh: () => void
}

export function InvoiceApprovalSection({ invoice, isAdmin, onRefresh }: Props) {
  const intl = useIntl()
  const [comment, setComment] = useState('')

  const approve = useApproveInvoice()
  const reject = useRejectInvoice()
  const cancel = useCancelApproval()
  const refresh = useRefreshApprovers()

  const status = invoice.approvalStatus as ApprovalStatus | undefined
  if (!status || status === 'Draft') return null

  const isPending = status === 'Pending'
  const canApprove = isAdmin && isPending
  const canCancel = isAdmin && (status === 'Pending' || status === 'Approved' || status === 'Rejected')
  const isActionPending = approve.isPending || reject.isPending || cancel.isPending || refresh.isPending

  const handleApprove = () => {
    approve.mutate(
      { invoiceId: invoice.id, comment: comment || undefined },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'approval.approved' }))
          setComment('')
          onRefresh()
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const handleReject = () => {
    reject.mutate(
      { invoiceId: invoice.id, comment: comment || undefined },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'approval.rejected' }))
          setComment('')
          onRefresh()
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const handleCancel = () => {
    cancel.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: 'approval.cancelled' }))
        onRefresh()
      },
      onError: (err) => toast.error(err.message),
    })
  }

  const handleRefresh = () => {
    refresh.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: 'approval.refreshed' }))
        onRefresh()
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          {intl.formatMessage({ id: 'approval.title' })}
          <ApprovalStatusBadge status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status info */}
        <div className="space-y-1 text-sm">
          {invoice.approvedBy && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {intl.formatMessage({ id: 'approval.decidedBy' })}
              </span>
              <span className="font-medium">{invoice.approvedBy}</span>
            </div>
          )}
          {invoice.approvedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {intl.formatMessage({ id: 'approval.decidedAt' })}
              </span>
              <span>{formatDate(invoice.approvedAt)}</span>
            </div>
          )}
          {invoice.approvalComment && (
            <div className="mt-2 text-sm bg-muted/50 rounded p-2">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              {invoice.approvalComment}
            </div>
          )}
        </div>

        {/* Actions */}
        {isAdmin && (
          <>
            <Separator />

            {canApprove && (
              <div className="space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'approval.commentPlaceholder' })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={isActionPending}
                  >
                    {approve.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    {intl.formatMessage({ id: 'approval.approve' })}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isActionPending}
                  >
                    {reject.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    {intl.formatMessage({ id: 'approval.reject' })}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isActionPending}
                >
                  {cancel.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4 mr-1" />
                  )}
                  {intl.formatMessage({ id: 'approval.cancel' })}
                </Button>
              )}
              {isPending && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isActionPending}
                >
                  {refresh.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  {intl.formatMessage({ id: 'approval.refreshApprovers' })}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
