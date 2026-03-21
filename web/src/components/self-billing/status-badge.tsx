'use client'

import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  PendingSeller: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SellerApproved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SellerRejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  SentToKsef: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
}

export function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? STATUS_COLORS.Draft}>
      {t(`status_${status}`)}
    </Badge>
  )
}
