import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, X, Loader2, FileText, Clock, AlertTriangle, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useNotificationsUnreadCount,
  useMarkNotificationRead,
  useDismissNotification,
  useMarkAllNotificationsRead,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import type { AppNotification, NotificationType } from '@/lib/types'

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'ApprovalRequested':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'SlaExceeded':
      return <Clock className="h-4 w-4 text-orange-500" />
    case 'BudgetWarning80':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'BudgetExceeded':
      return <DollarSign className="h-4 w-4 text-red-500" />
    case 'ApprovalDecided':
      return <Check className="h-4 w-4 text-green-500" />
    case 'SbApprovalRequested':
      return <FileText className="h-4 w-4 text-emerald-500" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

function getNotificationHref(notification: AppNotification): string | null {
  if (!notification.invoiceId) return null
  return notification.type === 'SbApprovalRequested'
    ? `/self-billing/${notification.invoiceId}`
    : `/invoices/${notification.invoiceId}`
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onNavigate,
}: {
  notification: AppNotification
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
  onNavigate: (href: string) => void
}) {
  const date = new Date(notification.createdOn)
  const timeAgo = getTimeAgo(date)
  const href = getNotificationHref(notification)

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 border-b last:border-0 transition-colors hover:bg-accent/50',
        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
        href && 'cursor-pointer'
      )}
      onClick={() => href && onNavigate(href)}
      {...(href ? { role: 'button' as const, tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(href) } } } : {})}
    >
      <div className="mt-0.5 shrink-0">{notificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notification.isRead && 'font-medium')}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      <div className="flex gap-0.5 shrink-0">
        {!notification.isRead && (
          <button
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent"
            title="Mark as read"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id) }}
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        <button
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
          title="Dismiss"
          onClick={(e) => { e.stopPropagation(); onDismiss(notification.id) }}
        >
          <X className="h-3 w-3" />
        </button>
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
  const navigate = useNavigate()
  const { selectedCompany } = useCompanyContext()
  const settingId = selectedCompany?.id ?? ''

  const { data: countData } = useNotificationsUnreadCount(settingId)
  const {
    data: notifData,
    isLoading,
  } = useNotifications(settingId, { top: 20 }, { enabled: !!settingId })
  const markRead = useMarkNotificationRead()
  const dismiss = useDismissNotification()
  const markAllRead = useMarkAllNotificationsRead(settingId)

  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = countData?.count ?? 0
  const notifications = notifData?.data ?? []

  const filteredNotifications = useMemo(
    () => filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications,
    [notifications, filter]
  )

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const handleNavigate = useCallback((href: string, notification: AppNotification) => {
    if (!notification.isRead) markRead.mutate(notification.id)
    setOpen(false)
    navigate(href)
  }, [markRead, navigate])

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
        <div className="absolute right-0 top-full mt-1 w-96 max-h-[70vh] rounded-md border bg-popover shadow-lg z-50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: 'notifications.title' })}
              </span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} {intl.formatMessage({ id: 'notifications.unread' })}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full border transition-colors',
                  filter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
                onClick={() => setFilter('all')}
              >
                {intl.formatMessage({ id: 'notifications.filterAll' })}
              </button>
              <button
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full border transition-colors inline-flex items-center gap-1',
                  filter === 'unread' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
                onClick={() => setFilter('unread')}
              >
                {intl.formatMessage({ id: 'notifications.filterUnread' })}
                {unreadCount > 0 && (
                  <span className={cn(
                    'ml-0.5 h-4 min-w-4 inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1',
                    filter === 'unread' ? 'bg-primary-foreground text-primary' : 'bg-red-500 text-white'
                  )}>
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="flex-1" />
              {unreadCount > 0 && (
                <button
                  className="px-2 py-0.5 text-xs rounded-full border hover:bg-accent transition-colors inline-flex items-center gap-1 text-muted-foreground"
                  title={intl.formatMessage({ id: 'notifications.markAllRead' })}
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {intl.formatMessage({ id: 'notifications.markAllRead' })}
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'notifications.empty' })}
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onDismiss={(id) => dismiss.mutate(id)}
                  onNavigate={(href) => handleNavigate(href, n)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
