/**
 * PDF Parser Service
 * 
 * Extracts text content from PDF documents using pdf-parse v2.x.
 * For invoice processing, extracts raw text which is then
 * analyzed by the AI service.
 */

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
