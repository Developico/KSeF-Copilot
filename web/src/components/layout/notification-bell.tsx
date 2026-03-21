'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Bell, Check, CheckCheck, X, FileText, AlertTriangle, DollarSign, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useContextNotifications,
  useContextNotificationUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from '@/hooks/use-api'
import type { AppNotification, NotificationType } from '@/lib/api'
import { cn } from '@/lib/utils'

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

function timeAgo(dateStr: string, t: ReturnType<typeof useTranslations>): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('justNow')
  if (minutes < 60) return t('minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('daysAgo', { count: days })
}

/**
 * Parse the raw API notification message and return a localized string
 * based on notification type. Falls back to the raw message if parsing fails.
 *
 * API message formats:
 *  SlaExceeded:       "SLA exceeded: FV/001 pending 1.1h (SLA: 24h)"
 *  ApprovalRequested: "Invoice FV/001 requires approval" | "Faktura FV/001 wymaga akceptacji"
 *  BudgetExceeded:    "Budget exceeded: 105% utilized (52500/50000 PLN)"
 *  BudgetWarning80:   "Budget warning: 85% utilized (42500/50000 PLN)"
 */
function localizeMessage(
  type: NotificationType,
  message: string,
  t: ReturnType<typeof useTranslations>,
): string {
  try {
    switch (type) {
      case 'SlaExceeded': {
        // "SLA exceeded: FV/001 pending 1.1h (SLA: 24h)"
        const m = message.match(/:\s*(.+?)\s+pending\s+([\d.]+)h\s+\(SLA:\s*([\d.]+)h\)/)
        if (m) return t('messages.slaExceeded', { invoiceNumber: m[1], hoursOverdue: m[2], slaHours: m[3] })
        break
      }
      case 'ApprovalRequested': {
        // "Invoice FV/001 requires approval" or "Faktura FV/001 wymaga akceptacji"
        const m = message.match(/(?:Invoice|Faktura)\s+(.+?)\s+(?:requires approval|wymaga akceptacji)/)
        if (m) return t('messages.approvalRequested', { invoiceLabel: m[1] })
        break
      }
      case 'BudgetExceeded':
      case 'BudgetWarning80': {
        // "Budget exceeded: 105% utilized (52500/50000 PLN)"
        const m = message.match(/([\d.]+)%\s+utilized\s+\(([\d.]+)\/([\d.]+)\s+PLN\)/)
        if (m) {
          const key = type === 'BudgetExceeded' ? 'messages.budgetExceeded' : 'messages.budgetWarning'
          return t(key, { pct: m[1], utilized: m[2], budgetAmount: m[3] })
        }
        break
      }
      case 'ApprovalDecided': {
        // Generic — extract invoice label if possible
        const m = message.match(/(?:Invoice|Faktura)\s+(.+?)(?:\s|$)/)
        if (m) return t('messages.approvalDecided', { invoiceLabel: m[1] })
        break
      }
      case 'SbApprovalRequested': {
        // "Self-billing invoice SF/2024/01/001 submitted for your approval"
        const m = message.match(/invoice\s+(.+?)\s+submitted/i)
        if (m) return t('messages.sbApprovalRequested', { invoiceLabel: m[1] })
        break
      }
    }
  } catch {
    // fall through to raw message
  }
  return message
}

function getNotificationHref(notification: AppNotification): string | null {
  if (!notification.invoiceId) return null
  const isSb = notification.type === 'SbApprovalRequested'
  return isSb ? `/self-billing/${notification.invoiceId}` : `/invoices/${notification.invoiceId}`
}

type NotificationFilter = 'all' | 'unread'

export function NotificationBell() {
  const t = useTranslations('notifications')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const { data: notificationsData } = useContextNotifications()
  const { data: unreadData } = useContextNotificationUnreadCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const dismiss = useDismissNotification()

  const notifications = notificationsData?.data ?? []
  const unreadCount = unreadData?.count ?? 0

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead)
    return notifications
  }, [notifications, filter])

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  const handleDismiss = (id: string) => {
    dismiss.mutate(id)
  }

  const handleMarkAllRead = () => {
    markAllRead.mutate()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t('title')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 flex flex-col" align="end" style={{ maxHeight: 'min(70vh, 500px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
          <h4 className="text-sm font-semibold">{t('title')}</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('unread', { count: unreadCount })}
              </span>
            )}
          </div>
        </div>

        {/* Filter + Mark All */}
        <div className="flex items-center justify-between border-b px-4 py-1.5 shrink-0">
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilter('all')}
            >
              {t('filterAll')}
            </Button>
            <Button
              variant={filter === 'unread' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilter('unread')}
            >
              {t('filterUnread')}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              title={t('markAllRead')}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              {t('markAllRead')}
            </Button>
          )}
        </div>

        {/* Notification list */}
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="divide-y">
              {filteredNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  t={t}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                  onNavigate={(href) => {
                    if (!n.isRead) handleMarkRead(n.id)
                    setOpen(false)
                    router.push(href)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({
  notification,
  t,
  onMarkRead,
  onDismiss,
  onNavigate,
}: {
  notification: AppNotification
  t: ReturnType<typeof useTranslations>
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
  onNavigate: (href: string) => void
}) {
  const href = getNotificationHref(notification)

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
        !notification.isRead && 'bg-muted/30',
        href && 'cursor-pointer'
      )}
      onClick={() => href && onNavigate(href)}
      {...(href ? { role: 'link' as const } : {})}
    >
      <div className="mt-0.5 shrink-0">{notificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notification.isRead && 'font-medium')}>
          {localizeMessage(notification.type, notification.message, t)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo(notification.createdOn, t)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id) }}
            title={t('markRead')}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onDismiss(notification.id) }}
          title={t('dismiss')}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
