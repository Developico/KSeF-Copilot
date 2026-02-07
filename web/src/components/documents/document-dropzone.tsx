'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileImage, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

/**
 * Allowed file types for invoice documents
 */
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']

const MAX_SIZE_MB = 128
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

interface DocumentDropzoneProps {
  onUpload: (file: File, base64Content: string) => Promise<void>
  isUploading?: boolean
  uploadProgress?: number
  className?: string
  compact?: boolean
  disabled?: boolean
}

/**
 * DocumentDropzone - Drag & drop zone for invoice documents
 * 
 * Supports PDF and images with validation and base64 conversion
 */
export function DocumentDropzone({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
  className,
  compact = false,
  disabled = false,
}: DocumentDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Niedozwolony typ pliku. Dozwolone: ${ALLOWED_EXTENSIONS.join(', ')}`
    }

    // Check size
    if (file.size > MAX_SIZE_BYTES) {
      return `Plik zbyt duży. Maksymalny rozmiar: ${MAX_SIZE_MB} MB`
    }

    return null
  }, [])

  /**
   * Convert file to base64
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  /**
   * Handle file selection
   */
  const handleFile = useCallback(async (file: File) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      const base64 = await fileToBase64(file)
      await onUpload(file, base64)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas przesyłania pliku')
    }
  }, [validateFile, fileToBase64, onUpload])

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }, [disabled, isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isUploading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [disabled, isUploading, handleFile])

  /**
   * Handle click to browse
   */
  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }, [disabled, isUploading])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    // Reset input
    e.target.value = ''
  }, [handleFile])

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
        aria-label="Upload document file"
      />

      {/* Dropzone area */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all cursor-pointer',
          compact ? 'p-4' : 'p-8',
          isDragging && !disabled && 'border-primary bg-primary/5 scale-[1.02]',
          !isDragging && !disabled && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed border-muted',
          isUploading && 'pointer-events-none'
        )}
      >
        {/* Upload in progress */}
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Przesyłanie dokumentu...</p>
              {uploadProgress > 0 && (
                <div className="mt-2 w-48">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className={cn(
              'rounded-full p-3 transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}>
              {isDragging ? (
                <FileImage className="h-6 w-6 text-primary animate-pulse" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="text-center">
              {isDragging ? (
                <p className="text-sm font-medium text-primary">
                  Upuść plik tutaj
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Przeciągnij i upuść plik lub{' '}
                    <span className="text-primary underline underline-offset-2">
                      kliknij, aby wybrać
                    </span>
                  </p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPEG, PNG, GIF, WebP • max {MAX_SIZE_MB} MB
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 ml-auto"
            onClick={() => setError(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
