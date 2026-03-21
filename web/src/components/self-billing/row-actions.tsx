'use client'

import { Button } from '@/components/ui/button'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Pencil, Trash2, Send, CheckCircle, XCircle, Upload, RotateCcw } from 'lucide-react'
import type { SelfBillingInvoice } from '@/lib/api'

export function RowActions({
  invoice,
  t,
  tCommon,
  isAdmin,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onSendToKsef,
  onRevert,
}: {
  invoice: SelfBillingInvoice
  t: (key: string, values?: Record<string, string>) => string
  tCommon: (key: string) => string
  isAdmin?: boolean
  onEdit: (invoice: SelfBillingInvoice) => void
  onDelete: (id: string) => void
  onSubmit: (id: string) => void
  onApprove: (invoice: SelfBillingInvoice) => void
  onReject: (id: string) => void
  onSendToKsef: (id: string) => void
  onRevert?: (id: string) => void
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        {invoice.status === 'Draft' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(invoice)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tCommon('edit')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSubmit(invoice.id)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('submitForReview')}</TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>{tCommon('delete')}</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteConfirmDesc', { number: invoice.invoiceNumber })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(invoice.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {tCommon('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {invoice.status === 'PendingSeller' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onApprove(invoice)}
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('approve')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onReject(invoice.id)}
              >
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('reject')}</TooltipContent>
          </Tooltip>
        </>
      )}

      {invoice.status === 'SellerApproved' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onSendToKsef(invoice.id)}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('sendToKsef')}</TooltipContent>
        </Tooltip>
      )}

      {invoice.status === 'SellerRejected' && isAdmin && (
        <>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>{tCommon('delete')}</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteConfirmDesc', { number: invoice.invoiceNumber })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(invoice.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {tCommon('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {isAdmin && onRevert && invoice.status !== 'Draft' && invoice.status !== 'SentToKsef' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRevert(invoice.id)}
            >
              <RotateCcw className="h-4 w-4 text-orange-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('detail.revertButton')}</TooltipContent>
        </Tooltip>
      )}
      </div>
    </TooltipProvider>
  )
}
