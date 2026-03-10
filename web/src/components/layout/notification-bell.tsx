'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Check, X, FileText, AlertTriangle, DollarSign, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useContextNotifications,
  useContextNotificationUnreadCount,
  useMarkNotificationRead,
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

export function NotificationBell() {
  const t = useTranslations('notifications')
  const [open, setOpen] = useState(false)

  const { data: notificationsData } = useContextNotifications()
  const { data: unreadData } = useContextNotificationUnreadCount()
  const markRead = useMarkNotificationRead()
  const dismiss = useDismissNotification()

  const notifications = notificationsData?.data ?? []
  const unreadCount = unreadData?.count ?? 0

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  const handleDismiss = (id: string) => {
    dismiss.mutate(id)
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">{t('title')}</h4>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('unread', { count: unreadCount })}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  t={t}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </ScrollArea>
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
}: {
  notification: AppNotification
  t: ReturnType<typeof useTranslations>
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
        !notification.isRead && 'bg-muted/30'
      )}
    >
      <div className="mt-0.5 shrink-0">{notificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notification.isRead && 'font-medium')}>
          {notification.message}
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
            onClick={() => onMarkRead(notification.id)}
            title={t('markRead')}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onDismiss(notification.id)}
          title={t('dismiss')}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
