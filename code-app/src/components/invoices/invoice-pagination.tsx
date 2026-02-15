/**
 * Pagination controls for invoice list.
 */

import { useIntl } from 'react-intl'
import { Button } from '@/components/ui'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface InvoicePaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function InvoicePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: InvoicePaginationProps) {
  const intl = useIntl()
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const from = Math.min(currentPage * pageSize + 1, totalItems)
  const to = Math.min((currentPage + 1) * pageSize, totalItems)

  if (totalItems <= pageSize) return null

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {intl.formatMessage(
          { id: 'pagination.showing' },
          { from, to, total: totalItems }
        )}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage === 0}
          onClick={() => onPageChange(0)}
          aria-label={intl.formatMessage({ id: 'pagination.first' })}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={intl.formatMessage({ id: 'common.back' })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 text-sm font-medium">
          {currentPage + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={intl.formatMessage({ id: 'common.next' })}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          aria-label={intl.formatMessage({ id: 'pagination.last' })}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
