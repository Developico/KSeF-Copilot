'use client'

import { useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentScannerModal } from './document-scanner-modal'

interface FloatingScannerButtonProps {
  className?: string
}

/**
 * Floating Action Button for document scanning/extraction.
 * Appears in the bottom-right corner and opens the document scanner modal.
 */
export function FloatingScannerButton({ className }: FloatingScannerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'flex items-center gap-2',
          'h-14 rounded-full bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-300 ease-out',
          'hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
          'active:scale-95',
          // Width changes on hover - icon centered when collapsed
          isHovered ? 'w-auto px-5 justify-start' : 'w-14 justify-center',
          className
        )}
        aria-label="Skanuj dokument"
        title="Skanuj fakturę i wyodrębnij dane"
      >
        <FileUp className="h-6 w-6 flex-shrink-0" />
        <span
          className={cn(
            'whitespace-nowrap font-medium text-sm transition-all duration-300',
            isHovered ? 'opacity-100 max-w-40' : 'opacity-0 max-w-0 overflow-hidden'
          )}
        >
          Skanuj fakturę
        </span>
      </button>

      {/* Scanner Modal */}
      <DocumentScannerModal 
        open={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  )
}
