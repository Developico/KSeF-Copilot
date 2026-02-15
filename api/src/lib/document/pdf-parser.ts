/**
 * PDF Parser Service
 * 
 * Extracts text content from PDF documents using pdf-parse v2.x.
 * For invoice processing, extracts raw text which is then
 * analyzed by the AI service.
 */

// Polyfill DOMMatrix for Node.js (required by pdfjs-dist v5.x used internally by pdf-parse v2.x).
// DOMMatrix is a browser API not available in Azure Functions / Node.js runtime.
// Only text extraction is needed — no actual matrix transforms — so a minimal stub suffices.
const g = globalThis as Record<string, unknown>
if (typeof g['DOMMatrix'] === 'undefined') {
  g['DOMMatrix'] = class DOMMatrix {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0
    m21 = 0; m22 = 1; m23 = 0; m24 = 0
    m31 = 0; m32 = 0; m33 = 1; m34 = 0
    m41 = 0; m42 = 0; m43 = 0; m44 = 1
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    is2D = true
    isIdentity = true
    constructor(_init?: string | number[]) { /* stub */ }
    multiply() { return new DOMMatrix() }
    translate() { return new DOMMatrix() }
    scale() { return new DOMMatrix() }
    rotate() { return new DOMMatrix() }
    inverse() { return new DOMMatrix() }
    transformPoint(p?: any) { return p ?? { x: 0, y: 0, z: 0, w: 1 } }
    toFloat64Array() { return new Float64Array(16) }
    toFloat32Array() { return new Float32Array(16) }
    toString() { return 'matrix(1, 0, 0, 1, 0, 0)' }
    static fromMatrix() { return new DOMMatrix() }
    static fromFloat64Array() { return new DOMMatrix() }
    static fromFloat32Array() { return new DOMMatrix() }
  } as any
}

/**
 * Result of PDF text extraction
 */
export interface PdfParseResult {
  success: boolean
  text: string
  pageCount: number
  error?: string
}

/**
 * Extract text content from a PDF buffer
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<PdfParseResult> {
  try {
    // pdf-parse v2.x exports PDFParse class
    const { PDFParse } = await import('pdf-parse')
    
    // Create parser instance with data buffer
    // v2.x accepts { data: Uint8Array } in constructor
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) })
    
    // Get text from all pages
    // TextResult has: pages (array), text (concatenated), total (page count)
    const result = await parser.getText()
    
    // Cleanup
    await parser.destroy()

    return {
      success: true,
      text: result.text || '',
      pageCount: result.total || 1,
    }
  } catch (error) {
    console.error('[PDF Parser] Error extracting text:', error)
    
    // Check if it's a missing dependency error
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: 'PDF parser not available. Install pdf-parse package.',
      }
    }

    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown PDF parsing error',
    }
  }
}

/**
 * Check if buffer is a valid PDF
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  // PDF files start with "%PDF-"
  if (buffer.length < 5) return false
  const header = buffer.slice(0, 5).toString('ascii')
  return header === '%PDF-'
}

/**
 * Extract text from base64-encoded PDF
 */
export async function extractTextFromPdfBase64(base64Content: string): Promise<PdfParseResult> {
  try {
    const buffer = Buffer.from(base64Content, 'base64')
    
    if (!isPdfBuffer(buffer)) {
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: 'Invalid PDF format',
      }
    }

    return extractTextFromPdf(buffer)
  } catch (error) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Failed to decode base64',
    }
  }
}
