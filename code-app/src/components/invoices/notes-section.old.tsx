import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { MessageSquare, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useInvoiceNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '@/hooks/use-api'
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'
import type { Note } from '@/lib/types'

interface NotesSectionProps {
  invoiceId: string
}

interface NoteFormProps {
  invoiceId: string
  note?: Note
  onClose: () => void
}

function NoteForm({ invoiceId, note, onClose }: NoteFormProps) {
  const intl = useIntl()
  const [subject, setSubject] = useState(note?.subject ?? '')
  const [noteText, setNoteText] = useState(note?.noteText ?? '')

  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

  const isEdit = !!note

  function handleSubmit() {
    if (!noteText.trim()) return

    if (isEdit) {
      updateNote.mutate(
        { noteId: note.id, data: { subject: subject || undefined, noteText }, invoiceId },
        {
          onSuccess: () => {
            toast.success(intl.formatMessage({ id: 'invoices.noteUpdated' }))
            onClose()
          },
          onError: (err) => toast.error(err.message),
        },
      )
    } else {
      createNote.mutate(
        { invoiceId, data: { subject: subject || undefined, noteText } },
        {
          onSuccess: () => {
            toast.success(intl.formatMessage({ id: 'invoices.noteCreated' }))
            onClose()
          },
          onError: (err) => toast.error(err.message),
        },
      )
    }
  }

  const isPending = createNote.isPending || updateNote.isPending

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="note-subject">{intl.formatMessage({ id: 'invoices.subject' })}</Label>
          <Input
            id="note-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={intl.formatMessage({ id: 'invoices.subject' })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note-text">{intl.formatMessage({ id: 'invoices.noteText' })}</Label>
          <Textarea
            id="note-text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder={intl.formatMessage({ id: 'invoices.noteText' })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {intl.formatMessage({ id: 'common.cancel' })}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !noteText.trim()}>
          {intl.formatMessage({ id: 'common.save' })}
        </Button>
      </DialogFooter>
    </>
  )
}

export function NotesSection({ invoiceId }: NotesSectionProps) {
  const intl = useIntl()
  const [addOpen, setAddOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const { data, isLoading } = useInvoiceNotes(invoiceId)
  const deleteNote = useDeleteNote()

  const notes = data?.notes ?? []

  function handleDelete(noteId: string) {
    deleteNote.mutate(
      { noteId, invoiceId },
      {
        onSuccess: () => toast.success(intl.formatMessage({ id: 'invoices.noteDeleted' })),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            {intl.formatMessage({ id: 'invoices.notes' })}
            {notes.length > 0 && (
              <span className="text-muted-foreground font-normal">({notes.length})</span>
            )}
          </CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'invoices.addNote' })}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{intl.formatMessage({ id: 'invoices.addNote' })}</DialogTitle>
              </DialogHeader>
              <NoteForm invoiceId={invoiceId} onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'common.loading' })}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'invoices.noNotes' })}</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-3 rounded-md border">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    {note.subject && (
                      <p className="text-sm font-medium">{note.subject}</p>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                      {note.noteText}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.createdOn)}
                      {note.modifiedOn !== note.createdOn && (
                        <> · {intl.formatMessage({ id: 'common.edit' }).toLowerCase()} {formatDate(note.modifiedOn)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Dialog open={editingNote?.id === note.id} onOpenChange={(o) => !o && setEditingNote(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setEditingNote(note)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{intl.formatMessage({ id: 'invoices.editNote' })}</DialogTitle>
                        </DialogHeader>
                        {editingNote && (
                          <NoteForm
                            invoiceId={invoiceId}
                            note={editingNote}
                            onClose={() => setEditingNote(null)}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {intl.formatMessage({ id: 'invoices.deleteConfirmTitle' })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {intl.formatMessage({ id: 'invoices.deleteNoteConfirm' })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {intl.formatMessage({ id: 'common.cancel' })}
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(note.id)}>
                            {intl.formatMessage({ id: 'common.delete' })}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
