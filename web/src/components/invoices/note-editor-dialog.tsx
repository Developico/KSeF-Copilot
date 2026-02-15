'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Save, Plus, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Note, NoteCreate, NoteUpdate } from '@/lib/api'

interface NoteEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: Note | null  // If provided, we're editing; otherwise creating
  onSave: (data: NoteCreate | NoteUpdate) => Promise<void>
  isPending?: boolean
}

export function NoteEditorDialog({
  open,
  onOpenChange,
  note,
  onSave,
  isPending = false,
}: NoteEditorDialogProps) {
  const t = useTranslations('invoices.notes')
  const tCommon = useTranslations('common')
  
  const [subject, setSubject] = useState('')
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!note

  // Reset form when dialog opens or note changes
  useEffect(() => {
    if (open) {
      setSubject(note?.subject || '')
      setNoteText(note?.noteText || '')
      setError(null)
    }
  }, [open, note])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!noteText.trim()) {
      setError(t('noteTextRequired'))
      return
    }

    try {
      await onSave({
        subject: subject.trim() || undefined,
        noteText: noteText.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-4 w-4" />
                {t('editNote')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t('newNote')}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('editNote')
              : t('addFirstNote')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-subject">{t('subjectLabel')}</Label>
            <Input
              id="note-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('subjectPlaceholder')}
              maxLength={500}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-text">
              {t('noteTextLabel')} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t('noteTextPlaceholder')}
              rows={5}
              maxLength={10000}
              required
              disabled={isPending}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {noteText.length} / 10000
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-1" />
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !noteText.trim()}>
              <Save className="h-4 w-4 mr-1" />
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
