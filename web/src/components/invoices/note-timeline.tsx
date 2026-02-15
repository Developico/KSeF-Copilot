'use client'

import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslations, useLocale } from 'next-intl'
import { StickyNote, Pencil, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Note } from '@/lib/api'

interface NoteTimelineProps {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
  isDeleting?: string  // ID of note being deleted
}

export function NoteTimeline({ notes, onEdit, onDelete, isDeleting }: NoteTimelineProps) {
  const t = useTranslations('invoices.notes')
  const locale = useLocale()
  const dateLocale = locale === 'pl' ? pl : enUS

  function formatDateTime(date: string): string {
    return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })
  }

  function formatRelativeTime(date: string): string {
    const now = new Date()
    const noteDate = new Date(date)
    const diffMs = now.getTime() - noteDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('daysAgo', { count: diffDays })
    
    return format(noteDate, 'dd MMM yyyy', { locale: dateLocale })
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <StickyNote className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">{t('noNotes')}</p>
        <p className="text-xs text-muted-foreground/70">
          {t('addFirstNote')}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />

      {/* Notes */}
      <div className="space-y-4">
        {notes.map((note, index) => {
          const isFirst = index === 0
          const isBeingDeleted = isDeleting === note.id

          return (
            <div
              key={note.id}
              className={cn(
                'relative pl-8 group',
                isBeingDeleted && 'opacity-50 pointer-events-none'
              )}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute left-0 top-2 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-background',
                  isFirst
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/30'
                )}
              >
                <StickyNote
                  className={cn(
                    'h-3 w-3',
                    isFirst ? 'text-primary' : 'text-muted-foreground/50'
                  )}
                />
              </div>

              {/* Note card */}
              <div
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isFirst
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/30 hover:bg-muted/50'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {note.subject && (
                      <h4 className="font-medium text-sm truncate" title={note.subject}>
                        {note.subject}
                      </h4>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span title={formatDateTime(note.createdOn)}>
                        {formatRelativeTime(note.createdOn)}
                      </span>
                      {note.modifiedOn !== note.createdOn && (
                        <span className="text-muted-foreground/60">
                          ({t('edited')})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(note)}
                      title={t('edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(note)}
                      title={t('delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {note.noteText}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
