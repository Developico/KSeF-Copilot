import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { X, Save, Plus, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Note, NoteCreate, NoteUpdate } from '@/lib/types'

interface NoteEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: Note | null
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
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })

  const [subject, setSubject] = useState('')
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!note

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

    if (!noteText.trim()) {
      setError(t('invoices.notes.noteTextRequired'))
      return
    }

    try {
      await onSave({
        subject: subject.trim() || undefined,
        noteText: noteText.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
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
                {t('invoices.editNote')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t('invoices.notes.newNote')}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('invoices.editNote')
              : t('invoices.notes.addFirstNote')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-subject">
              {t('invoices.notes.subjectLabel')}
            </Label>
            <Input
              id="note-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('invoices.notes.subjectPlaceholder')}
              maxLength={500}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-text">
              {t('invoices.notes.noteTextLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t('invoices.notes.noteTextPlaceholder')}
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-1" />
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !noteText.trim()}>
              <Save className="h-4 w-4 mr-1" />
              {isPending ? t('invoices.notes.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
