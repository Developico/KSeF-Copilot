'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { api, Note, NoteCreate, NoteUpdate } from '@/lib/api'
import { NoteEditorDialog } from '@/components/invoices/note-editor-dialog'
import { NoteTimeline } from '@/components/invoices/note-timeline'

interface SupplierNotesSectionProps {
  supplierId: string
  defaultExpanded?: boolean
  isReadOnly?: boolean
}

export function SupplierNotesSection({
  supplierId,
  defaultExpanded = false,
  isReadOnly = false,
}: SupplierNotesSectionProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('invoices.notes')
  const tCommon = useTranslations('common')

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)

  const {
    data: notesData,
    isLoading: notesLoading,
    error: notesError,
  } = useQuery({
    queryKey: ['supplier-notes', supplierId],
    queryFn: () => api.suppliers.listNotes(supplierId),
    enabled: isExpanded,
  })

  const createNoteMutation = useMutation({
    mutationFn: (data: NoteCreate) => api.suppliers.createNote(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] })
      toast({ title: tCommon('success'), description: t('noteAdded') })
    },
    onError: (error: Error) => {
      toast({ title: tCommon('error'), description: error.message || t('addError'), variant: 'destructive' })
      throw error
    },
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: NoteUpdate }) =>
      api.invoices.updateNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] })
      toast({ title: tCommon('success'), description: t('noteUpdated') })
    },
    onError: (error: Error) => {
      toast({ title: tCommon('error'), description: error.message || t('updateError'), variant: 'destructive' })
      throw error
    },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.invoices.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] })
      setDeletingNote(null)
      toast({ title: tCommon('success'), description: t('noteDeleted') })
    },
    onError: (error: Error) => {
      toast({ title: tCommon('error'), description: error.message || t('deleteError'), variant: 'destructive' })
    },
  })

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

  const handleSaveNote = useCallback(async (data: NoteCreate | NoteUpdate) => {
    if (editingNote) {
      await updateNoteMutation.mutateAsync({ noteId: editingNote.id, data: data as NoteUpdate })
    } else {
      await createNoteMutation.mutateAsync(data as NoteCreate)
    }
  }, [editingNote, createNoteMutation, updateNoteMutation])

  const handleConfirmDelete = useCallback(() => {
    if (deletingNote) {
      deleteNoteMutation.mutate(deletingNote.id)
    }
  }, [deletingNote, deleteNoteMutation])

  const notes = notesData?.notes ?? []
  const noteCount = notes.length

  return (
    <>
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {t('title')}
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
            {!isReadOnly && (
              <Button variant="outline" size="sm" className="w-full" onClick={handleAddNote}>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                {t('addNote')}
              </Button>
            )}

            {notesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : notesError ? (
              <div className="text-sm text-destructive text-center py-4">
                {t('fetchError')}
              </div>
            ) : (
              <NoteTimeline
                notes={notes}
                onEdit={isReadOnly ? undefined : handleEditNote}
                onDelete={isReadOnly ? undefined : handleDeleteNote}
                isDeleting={deleteNoteMutation.isPending ? deletingNote?.id : undefined}
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
        isPending={createNoteMutation.isPending || updateNoteMutation.isPending}
      />

      <AlertDialog open={!!deletingNote} onOpenChange={() => setDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
