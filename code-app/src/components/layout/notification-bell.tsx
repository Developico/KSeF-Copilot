import { useState, useRef, useEffect, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { Bell, Check, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  useNotifications,
  useNotificationsUnreadCount,
  useMarkNotificationRead,
  useDismissNotification,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import type { AppNotification, NotificationType } from '@/lib/types'

const typeIcons: Record<NotificationType, string> = {
  ApprovalRequested: '📋',
  SlaExceeded: '⏰',
  BudgetWarning80: '⚠️',
  BudgetExceeded: '🚨',
  ApprovalDecided: '✅',
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: AppNotification
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const date = new Date(notification.createdOn)
  const timeAgo = getTimeAgo(date)

  return (
    <div
      className={`px-3 py-2 border-b last:border-0 hover:bg-accent/50 transition-colors ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">{typeIcons[notification.type]}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {notification.invoiceId && (
              <Link
                to={`/invoices/${notification.invoiceId}`}
                className="text-xs text-primary hover:underline"
              >
                View invoice →
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {!notification.isRead && (
            <button
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent"
              title="Mark as read"
              onClick={() => onMarkRead(notification.id)}
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <button
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
            title="Dismiss"
            onClick={() => onDismiss(notification.id)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

export function NotificationBell() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const settingId = selectedCompany?.id ?? ''

  const { data: countData } = useNotificationsUnreadCount(settingId)
  const {
    data: notifData,
    isLoading,
  } = useNotifications(settingId, { top: 20 }, { enabled: !!settingId })
  const markRead = useMarkNotificationRead()
  const dismiss = useDismissNotification()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = countData?.count ?? 0
  const notifications = notifData?.data ?? []

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  if (!settingId) return null

  return (
    <div className="relative" ref={ref}>
      <button
        className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent relative"
        onClick={() => setOpen(!open)}
        title={intl.formatMessage({ id: 'notifications.title' })}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 rounded-md border bg-popover shadow-lg z-50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">
              {intl.formatMessage({ id: 'notifications.title' })}
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} {intl.formatMessage({ id: 'notifications.unread' })}
              </Badge>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'notifications.empty' })}
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onDismiss={(id) => dismiss.mutate(id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
