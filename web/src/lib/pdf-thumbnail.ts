/**
 * PDF Thumbnail Generator
 * 
 * Uses pdfjs-dist (bundled with react-pdf) to render the first page
 * of a PDF to a canvas, then exports as a small PNG thumbnail.
 * Runs entirely client-side in the browser.
 * 
 * IMPORTANT: pdfjs is imported lazily (dynamic import) to avoid
 * "Object.defineProperty called on non-object" errors when Next.js
 * evaluates this module during SSR / webpack bundling.
 */

/** Thumbnail configuration */
const THUMBNAIL_MAX_WIDTH = 400
const THUMBNAIL_MAX_HEIGHT = 566 // ~A4 aspect ratio
const THUMBNAIL_QUALITY = 0.85 // PNG doesn't use quality, but JPEG does
const THUMBNAIL_FORMAT = 'image/png'

let pdfjsModule: typeof import('react-pdf')['pdfjs'] | null = null
let workerConfigured = false

/**
 * Lazily load and configure pdfjs (browser-only).
 * 
 * Worker strategy:
 * 1. Try local /pdf.worker.min.mjs (copied from pdfjs-dist)
 * 2. If file not accessible → pdfjs uses inline "fake worker" (main-thread, slower but works)
 */
async function getPdfjs() {
  if (pdfjsModule) return pdfjsModule

  const { pdfjs } = await import('react-pdf')

  if (!workerConfigured) {
    // Verify worker file is accessible before setting it
    try {
      const resp = await fetch('/pdf.worker.min.mjs', { method: 'HEAD' })
      if (resp.ok) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        console.log('[pdf-thumbnail] Worker loaded from /pdf.worker.min.mjs')
      } else {
        console.warn(`[pdf-thumbnail] Worker file returned ${resp.status}, using inline mode`)
      }
    } catch (e) {
      console.warn('[pdf-thumbnail] Worker file not accessible, using inline mode:', e)
    }
    workerConfigured = true
  }

  pdfjsModule = pdfjs
  return pdfjs
}

export interface ThumbnailResult {
  /** Base64-encoded PNG thumbnail (without data: prefix) */
  base64: string
  /** MIME type of the thumbnail */
  mimeType: string
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
}

/**
 * Generate a thumbnail from a PDF file's first page.
 * 
 * @param pdfSource - Can be a File, Blob, ArrayBuffer, or base64 string (without prefix)
 * @returns ThumbnailResult with base64 PNG data
 */
export async function generatePdfThumbnail(
  pdfSource: File | Blob | ArrayBuffer | string
): Promise<ThumbnailResult> {
  // Convert source to typed array for pdfjs
  let data: ArrayBuffer

  if (pdfSource instanceof File || pdfSource instanceof Blob) {
    data = await pdfSource.arrayBuffer()
  } else if (pdfSource instanceof ArrayBuffer) {
    data = pdfSource
  } else if (typeof pdfSource === 'string') {
    // Assume base64 string
    const binary = atob(pdfSource)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    data = bytes.buffer
  } else {
    throw new Error('Unsupported PDF source type')
  }

  // Lazily load pdfjs (browser-only)
  const pdfjs = await getPdfjs()

  // Load PDF document
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) })
  const pdf = await loadingTask.promise

  try {
    // Get first page
    const page = await pdf.getPage(1)

    // Calculate scale to fit within max dimensions
    const viewport = page.getViewport({ scale: 1 })
    const scaleX = THUMBNAIL_MAX_WIDTH / viewport.width
    const scaleY = THUMBNAIL_MAX_HEIGHT / viewport.height
    const scale = Math.min(scaleX, scaleY, 1) // Don't upscale small PDFs

    const scaledViewport = page.getViewport({ scale })

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(scaledViewport.width)
    canvas.height = Math.floor(scaledViewport.height)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context')
    }

    // Render page to canvas
    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
      canvas,
    }).promise

    // Export as PNG base64
    const dataUrl = canvas.toDataURL(THUMBNAIL_FORMAT, THUMBNAIL_QUALITY)
    const base64 = dataUrl.split(',')[1]

    // Clean up
    canvas.width = 0
    canvas.height = 0

    console.log(`[pdf-thumbnail] Generated ${Math.floor(scaledViewport.width)}x${Math.floor(scaledViewport.height)} thumbnail (${(base64.length / 1024).toFixed(1)} KB base64)`)

    return {
      base64,
      mimeType: THUMBNAIL_FORMAT,
      width: Math.floor(scaledViewport.width),
      height: Math.floor(scaledViewport.height),
    }
  } finally {
    await pdf.destroy()
  }
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Check if a MIME type is PDF
 */
export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
