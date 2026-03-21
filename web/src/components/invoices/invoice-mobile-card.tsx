'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  MoreVertical, 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  Eye,
  CheckCircle,
  Trash2,
  Sparkles,
  FileQuestion,
  FileCheck,
  ArrowDownToLine,
  Paperclip,
  StickyNote,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Invoice } from '@/lib/api'
import { InvoiceAmountCell } from '@/components/invoices/currency-amount'

interface InvoiceMobileCardProps {
  invoice: Invoice
  onTogglePaymentStatus?: (id: string, invoiceNumber: string, currentStatus: 'pending' | 'paid') => void
  onDelete?: (id: string, invoiceNumber: string) => void
  isUpdating?: boolean
}

// Description status types
type DescriptionStatus = 'not_described' | 'ai_suggested' | 'described'

function getDescriptionStatus(invoice: Invoice): DescriptionStatus {
  const hasDescription = !!(invoice.mpk || invoice.category)
  const hasAiSuggestion = !!(invoice.aiMpkSuggestion || invoice.aiCategorySuggestion)
  
  if (hasDescription) return 'described'
  if (hasAiSuggestion) return 'ai_suggested'
  return 'not_described'
}

export function InvoiceMobileCard({
  invoice,
  onTogglePaymentStatus,
  onDelete,
  isUpdating = false,
}: InvoiceMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const descriptionStatus = getDescriptionStatus(invoice)
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.paymentStatus === 'pending'

  // Payment status badge
  const getPaymentBadge = () => {
    if (invoice.paymentStatus === 'paid') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Opłacona</Badge>
    }
    if (isOverdue) {
      return <Badge variant="destructive">Zaległe</Badge>
    }
    return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Oczekuje</Badge>
  }

  // Description status badge
  const getDescriptionBadge = () => {
    switch (descriptionStatus) {
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

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      {/* Main content - always visible */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header: Invoice number + Payment status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowDownToLine className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {invoice.invoiceNumber}
              </h3>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {invoice.referenceNumber?.slice(0, 20) || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getPaymentBadge()}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Supplier */}
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{invoice.supplierName}</p>
            <p className="text-xs text-muted-foreground">NIP: {invoice.supplierNip}</p>
          </div>
        </div>

        {/* Date + Amount row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(invoice.invoiceDate).toLocaleDateString('pl-PL')}
          </div>
          <p className="text-lg font-bold">
            <InvoiceAmountCell
              amount={invoice.grossAmount}
              currency={invoice.currency}
              grossAmountPln={invoice.grossAmountPln}
              className={invoice.grossAmount < 0 ? 'text-red-600 dark:text-red-400' : undefined}
            />
          </p>
        </div>
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
          {/* MPK & Category */}
          <div className="flex flex-wrap gap-2">
            {/* MPK */}
            {invoice.mpk ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                MPK: {invoice.mpk}
              </Badge>
            ) : invoice.aiMpkSuggestion ? (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                <Sparkles className="h-3 w-3" />
                MPK: {invoice.aiMpkSuggestion}
              </Badge>
            ) : null}
            
            {/* Category */}
            {invoice.category ? (
              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                {invoice.category}
              </Badge>
            ) : invoice.aiCategorySuggestion ? (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                <Sparkles className="h-3 w-3" />
                {invoice.aiCategorySuggestion}
              </Badge>
            ) : null}
            
            {/* Description status */}
            {getDescriptionBadge()}

            {/* Self-billing indicator */}
            {invoice.isSelfBilling && (
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 gap-1">
                SB
              </Badge>
            )}

            {/* Attachments indicator */}
            {invoice.hasAttachments && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                <Paperclip className="h-3 w-3" />
                {invoice.attachmentCount || 1}
              </Badge>
            )}

            {/* Notes indicator */}
            {invoice.hasNotes && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                <StickyNote className="h-3 w-3" />
                {invoice.noteCount || 1}
              </Badge>
            )}
          </div>

          {/* Due date if present */}
          {invoice.dueDate && (
            <div className="text-sm">
              <span className="text-muted-foreground">Termin płatności: </span>
              <span className={cn(isOverdue && 'text-destructive font-medium')}>
                {new Date(invoice.dueDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {onTogglePaymentStatus && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePaymentStatus(invoice.id, invoice.invoiceNumber, invoice.paymentStatus)
                }}
                disabled={isUpdating}
              >
                <CheckCircle className={cn(
                  "h-4 w-4 mr-2",
                  invoice.paymentStatus === 'paid' ? 'text-green-500' : 'text-muted-foreground'
                )} />
                {invoice.paymentStatus === 'paid' ? 'Cofnij opłatę' : 'Oznacz opłaconą'}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/invoices/${invoice.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Szczegóły
              </Link>
            </Button>

            {onDelete && (
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(invoice.id, invoice.invoiceNumber)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
