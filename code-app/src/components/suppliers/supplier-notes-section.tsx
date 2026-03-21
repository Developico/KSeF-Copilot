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
  useSupplierNotes,
  useCreateSupplierNote,
  useUpdateSupplierNote,
  useDeleteSupplierNote,
} from '@/hooks/use-api'
import { toast } from 'sonner'
import type { Note, NoteCreate, NoteUpdate } from '@/lib/types'
import { NoteTimeline } from '@/components/invoices/note-timeline'
import { NoteEditorDialog } from '@/components/invoices/note-editor-dialog'

interface SupplierNotesSectionProps {
  supplierId: string
  defaultExpanded?: boolean
}

export function SupplierNotesSection({
  supplierId,
  defaultExpanded = false,
}: SupplierNotesSectionProps) {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)

  const { data, isLoading } = useSupplierNotes(supplierId, {
    enabled: isExpanded,
  })

  const createNote = useCreateSupplierNote()
  const updateNote = useUpdateSupplierNote()
  const deleteNote = useDeleteSupplierNote()

  const notes = data?.notes ?? []
  const noteCount = notes.length

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
          { noteId: editingNote.id, data: data as NoteUpdate, supplierId },
          {
            onSuccess: () => toast.success(t('invoices.notes.noteUpdated')),
            onError: (err) => toast.error(err.message || t('invoices.notes.updateError')),
          },
        )
      } else {
        await createNote.mutateAsync(
          { supplierId, data: data as NoteCreate },
          {
            onSuccess: () => toast.success(t('invoices.notes.noteAdded')),
            onError: (err) => toast.error(err.message || t('invoices.notes.addError')),
          },
        )
      }
    },
    [editingNote, createNote, updateNote, supplierId, t],
  )

  const handleConfirmDelete = useCallback(() => {
    if (!deletingNote) return
    deleteNote.mutate(
      { noteId: deletingNote.id, supplierId },
      {
        onSuccess: () => {
          setDeletingNote(null)
          toast.success(t('invoices.notes.noteDeleted'))
        },
        onError: (err) => toast.error(err.message || t('invoices.notes.deleteError')),
      },
    )
  }, [deletingNote, deleteNote, supplierId, t])

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
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            <Button variant="outline" size="sm" className="w-full" onClick={handleAddNote}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {t('invoices.notes.addNote')}
            </Button>

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
                isDeleting={deleteNote.isPending ? deletingNote?.id : undefined}
              />
            )}
          </div>
        )}
      </Card>

      <NoteEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        isPending={createNote.isPending || updateNote.isPending}
      />

      <AlertDialog open={!!deletingNote} onOpenChange={() => setDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoices.notes.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.notes.confirmDelete')}
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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('common.deleting')}</>
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
