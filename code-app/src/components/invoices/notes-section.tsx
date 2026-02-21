import { useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Loader2,
} from 'lucide-react'
import {
  useInvoiceNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '@/hooks/use-api'
import { toast } from 'sonner'
import type { Note, NoteCreate, NoteUpdate } from '@/lib/types'
import { NoteTimeline } from './note-timeline'
import { NoteEditorDialog } from './note-editor-dialog'

interface NotesSectionProps {
  invoiceId: string
  defaultExpanded?: boolean
}

export function NotesSection({
  invoiceId,
  defaultExpanded = false,
}: NotesSectionProps) {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)

  // Fetch notes only when expanded
  const { data, isLoading } = useInvoiceNotes(invoiceId, {
    enabled: isExpanded,
  })

  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const notes = data?.notes ?? []
  const noteCount = notes.length

  // Handlers
  const handleAddNote = useCallback(() => {
    setEditingNote(null)
    setIsEditorOpen(true)
  }, [])

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note)
    setIsEditorOpen(true)
  }, [])

  const handleDeleteNote = useCallback((note: Note) => {
    setDeletingNote(note)
  }, [])

  const handleSaveNote = useCallback(
    async (data: NoteCreate | NoteUpdate) => {
      if (editingNote) {
        await updateNote.mutateAsync(
          { noteId: editingNote.id, data: data as NoteUpdate, invoiceId },
          {
            onSuccess: () => toast.success(t('invoices.notes.noteUpdated')),
            onError: (err) =>
              toast.error(err.message || t('invoices.notes.updateError')),
          },
        )
      } else {
        await createNote.mutateAsync(
          { invoiceId, data: data as NoteCreate },
          {
            onSuccess: () => toast.success(t('invoices.notes.noteAdded')),
            onError: (err) =>
              toast.error(err.message || t('invoices.notes.addError')),
          },
        )
      }
    },
    [editingNote, createNote, updateNote, invoiceId, t],
  )

  const handleConfirmDelete = useCallback(() => {
    if (!deletingNote) return
    deleteNote.mutate(
      { noteId: deletingNote.id, invoiceId },
      {
        onSuccess: () => {
          setDeletingNote(null)
          toast.success(t('invoices.notes.noteDeleted'))
        },
        onError: (err) =>
          toast.error(err.message || t('invoices.notes.deleteError')),
      },
    )
  }, [deletingNote, deleteNote, invoiceId, t])

  return (
    <>
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {t('invoices.notes.title')}
            {noteCount > 0 && (
              <Badge variant="secondary" className="h-5 text-xs">
                {noteCount}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Add note button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddNote}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {t('invoices.addNote')}
            </Button>

            {/* Notes content */}
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <NoteTimeline
                notes={notes}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                isDeleting={
                  deleteNote.isPending ? deletingNote?.id : undefined
                }
              />
            )}
          </div>
        )}
      </Card>

      {/* Note Editor Dialog */}
      <NoteEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        isPending={createNote.isPending || updateNote.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingNote}
        onOpenChange={() => setDeletingNote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('invoices.notes.confirmDeleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingNote?.subject
                ? t('invoices.notes.confirmDeleteWithSubject', {
                    subject: deletingNote.subject,
                  })
                : t('invoices.notes.confirmDelete')}
              <br />
              {t('invoices.notes.irreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNote.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('invoices.notes.deleting')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
