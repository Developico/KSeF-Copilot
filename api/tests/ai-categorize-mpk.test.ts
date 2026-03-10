/**
 * AI Categorize Endpoint Tests — Dynamic MPK Integration
 *
 * Verifies that:
 * - The endpoint fetches active MPK centers before categorizing
 * - Dynamic MPK names are passed through to categorizeInvoice
 * - Graceful fallback when MPK center lookup fails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted) ─────────────────────────────────────────

const { registeredHandlers } = vi.hoisted(() => {
  const registeredHandlers: Record<string, Function> = {}
  return { registeredHandlers }
})

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn((name: string, options: { handler: Function }) => {
      registeredHandlers[name] = options.handler
    }),
  },
}))

vi.mock('../src/lib/auth/middleware', () => ({
  verifyAuth: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('../src/lib/openai', () => ({
  categorizeInvoice: vi.fn(),
  categorizeInvoicesBatch: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('../src/lib/dataverse', () => ({
  invoiceService: {
    getById: vi.fn(),
    update: vi.fn(),
  },
  mpkCenterService: {
    getAll: vi.fn(),
  },
}))

import { verifyAuth, requireRole } from '../src/lib/auth/middleware'
import { categorizeInvoice } from '../src/lib/openai'
import { invoiceService, mpkCenterService } from '../src/lib/dataverse'

// Import to trigger handler registration
import '../src/functions/ai-categorize'

// ── Helpers ──────────────────────────────────────────────────

function mockRequest(body: Record<string, unknown>) {
  return { json: () => Promise.resolve(body) }
}

function mockContext() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
}

const UUID_1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

// ── Tests ────────────────────────────────────────────────────

describe('ai-categorize endpoint — dynamic MPK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register ai-categorize handler', () => {
    expect(registeredHandlers['ai-categorize']).toBeDefined()
  })

  it('should pass dynamic MPK names to categorizeInvoice', async () => {
    ;(verifyAuth as any).mockResolvedValue({ success: true, user: { oid: 'user-1' } })
    ;(requireRole as any).mockReturnValue({ success: true })
    ;(invoiceService.getById as any).mockResolvedValue({
      id: UUID_1,
      supplierName: 'Test Supplier',
      supplierNip: '1234567890',
      grossAmount: 1000,
    })
    ;(mpkCenterService.getAll as any).mockResolvedValue([
      { id: 'mpk-1', name: 'IT Infrastructure' },
      { id: 'mpk-2', name: 'Legal Department' },
    ])
    ;(categorizeInvoice as any).mockResolvedValue({
      mpk: 'IT Infrastructure',
      category: 'Cloud',
      description: 'Cloud hosting',
      confidence: 0.9,
    })
    ;(invoiceService.update as any).mockResolvedValue(undefined)

    const handler = registeredHandlers['ai-categorize']
    const req = mockRequest({ invoiceId: UUID_1 })
    const ctx = mockContext()
    const result = await handler(req, ctx)

    // Debug: check if the handler returned an error
    expect(result.status).not.toBe(500)
    expect(result.status).not.toBe(401)
    expect(result.status).not.toBe(403)
    expect(result.status).not.toBe(400)

    // Verify mpkCenterService was called with activeOnly
    expect(mpkCenterService.getAll).toHaveBeenCalledWith({ activeOnly: true })

    // Verify categorizeInvoice received dynamic MPK names
    expect(categorizeInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: UUID_1 }),
      undefined,
      ['IT Infrastructure', 'Legal Department']
    )

    expect(result.status).toBe(200)
  })

  it('should fallback gracefully when mpkCenterService fails', async () => {
    ;(verifyAuth as any).mockResolvedValue({ success: true, user: { oid: 'user-1' } })
    ;(requireRole as any).mockReturnValue({ success: true })
    ;(invoiceService.getById as any).mockResolvedValue({
      id: UUID_1,
      supplierName: 'Test',
      supplierNip: '1234567890',
      grossAmount: 500,
    })
    // MPK center fetch fails
    ;(mpkCenterService.getAll as any).mockRejectedValue(new Error('Dataverse unavailable'))
    ;(categorizeInvoice as any).mockResolvedValue({
      mpk: 'Consultants',
      category: 'IT',
      description: 'Dev services',
      confidence: 0.8,
    })
    ;(invoiceService.update as any).mockResolvedValue(undefined)

    const handler = registeredHandlers['ai-categorize']
    const result = await handler(mockRequest({ invoiceId: UUID_1 }), mockContext())

    // Should still succeed — categorizeInvoice called with undefined mpkNames
    expect(categorizeInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: UUID_1 }),
      undefined,
      undefined
    )
    expect(result.status).toBe(200)
  })

  it('should fallback when mpkCenterService returns empty list', async () => {
    ;(verifyAuth as any).mockResolvedValue({ success: true, user: { oid: 'user-1' } })
    ;(requireRole as any).mockReturnValue({ success: true })
    ;(invoiceService.getById as any).mockResolvedValue({
      id: UUID_2,
      supplierName: 'Supplier',
      supplierNip: '9876543210',
      grossAmount: 200,
    })
    ;(mpkCenterService.getAll as any).mockResolvedValue([])
    ;(categorizeInvoice as any).mockResolvedValue({
      mpk: 'Other',
      category: 'Misc',
      description: 'Other',
      confidence: 0.5,
    })
    ;(invoiceService.update as any).mockResolvedValue(undefined)

    const handler = registeredHandlers['ai-categorize']
    const result = await handler(mockRequest({ invoiceId: UUID_2 }), mockContext())

    // Empty MPK list → undefined (fallback to static enum)
    expect(categorizeInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: UUID_2 }),
      undefined,
      undefined
    )
    expect(result.status).toBe(200)
  })
})
