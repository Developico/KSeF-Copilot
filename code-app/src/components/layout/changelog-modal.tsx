import { useState, useEffect, useRef } from 'react'
import { useIntl } from 'react-intl'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Modal that shows changelog content (`/changelog.md`).
 * Triggered by triple-clicking the logo in the header (Easter egg).
 */
export function ChangelogModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const intl = useIntl()
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && content === null) {
      setLoading(true)
      fetch('/changelog.md')
        .then((r) => {
          if (!r.ok) throw new Error('not found')
          return r.text()
        })
        .then(setContent)
        .catch(() => setContent('# Changelog\n\nNo changelog available.'))
        .finally(() => setLoading(false))
    }
  }, [open, content])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: 'changelog.title' })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'changelog.description' })}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none py-2">
            <ReactMarkdown>{content ?? ''}</ReactMarkdown>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to track triple-click on an element.
 * Returns [ref, isTriggered, reset].
 */
export function useTripleClick(): [
  React.RefObject<HTMLDivElement | null>,
  boolean,
  () => void,
] {
  const ref = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)
  const clickCount = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function handleClick() {
      clickCount.current++
      if (timer.current) clearTimeout(timer.current)
      if (clickCount.current >= 3) {
        clickCount.current = 0
        setTriggered(true)
      } else {
        timer.current = setTimeout(() => {
          clickCount.current = 0
        }, 600)
      }
    }

    el.addEventListener('click', handleClick)
    return () => {
      el.removeEventListener('click', handleClick)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return [ref, triggered, () => setTriggered(false)]
}
