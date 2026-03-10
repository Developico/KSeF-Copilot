import { useIntl } from 'react-intl'
import { Badge } from '@/components/ui/badge'
import { ShieldMinus } from 'lucide-react'
import type { ApprovalStatus } from '@/lib/types'

const statusStyles: Record<ApprovalStatus, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function ApprovalStatusBadge({ status }: { status?: ApprovalStatus }) {
  const intl = useIntl()

  if (!status || status === 'Draft') {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <ShieldMinus className="h-3 w-3" />
        {intl.formatMessage({ id: 'approval.status.notRequired' })}
      </Badge>
    )
  }

  return (
    <Badge className={statusStyles[status]}>
      {intl.formatMessage({ id: `approval.status.${status}` })}
    </Badge>
  )
}
