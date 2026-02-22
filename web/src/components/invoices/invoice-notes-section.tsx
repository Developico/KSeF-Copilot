'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { 
  MessageSquarePlus, 
  ChevronDown, 
  ChevronUp, 
  StickyNote,
  Loader2,
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
import { NoteEditorDialog } from './note-editor-dialog'
import { NoteTimeline } from './note-timeline'

interface InvoiceNotesSectionProps {
  invoiceId: string
  defaultExpanded?: boolean
  isReadOnly?: boolean
}

export function InvoiceNotesSection({ 
  invoiceId, 
  defaultExpanded = false,
  isReadOnly = false,
}: InvoiceNotesSectionProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('invoices.notes')
  const tCommon = useTranslations('common')
  
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)

  // Fetch notes
  const {
    data: notesData,
    isLoading: notesLoading,
    error: notesError,
  } = useQuery({
    queryKey: ['notes', invoiceId],
    queryFn: () => api.invoices.listNotes(invoiceId),
    enabled: isExpanded,  // Only fetch when expanded
  })

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: (data: NoteCreate) => api.invoices.createNote(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', invoiceId] })
      toast({
        title: tCommon('success'),
        description: t('noteAdded'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('addError'),
        variant: 'destructive',
      })
      throw error  // Re-throw to be caught in dialog
    },
  })

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: NoteUpdate }) =>
      api.invoices.updateNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', invoiceId] })
      toast({
        title: tCommon('success'),
        description: t('noteUpdated'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('updateError'),
        variant: 'destructive',
      })
      throw error
    },
  })

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.invoices.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', invoiceId] })
      setDeletingNote(null)
      toast({
        title: tCommon('success'),
        description: t('noteDeleted'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('deleteError'),
        variant: 'destructive',
      })
    },
  })

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

  const handleSaveNote = useCallback(async (data: NoteCreate | NoteUpdate) => {
    if (editingNote) {
      await updateNoteMutation.mutateAsync({
        noteId: editingNote.id,
        data: data as NoteUpdate,
      })
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
            {/* Add note button - Admin only */}
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddNote}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                {t('addNote')}
              </Button>
            )}

            {/* Notes content */}
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

      {/* Note Editor Dialog */}
      <NoteEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        isPending={createNoteMutation.isPending || updateNoteMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingNote} onOpenChange={() => setDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingNote?.subject ? (
                <>
                  {t('confirmDeleteWithSubject', { subject: deletingNote.subject })}
                </>
              ) : (
                <>{t('confirmDelete')}</>
              )}
              <br />
              {t('irreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNoteMutation.isPending}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNoteMutation.isPending}
            >
              {deleteNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
