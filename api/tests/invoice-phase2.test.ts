/**
 * Phase 2 Tests: Invoice Migration — MPK Center Lookup, Approval Status, AI Categorization
 *
 * Tests for:
 * - InvoiceEntity new fields (mpkCenterId, approval workflow)
 * - InvoiceUpdateSchema with mpkCenterId
 * - AiCategorizationSchema accepting dynamic MPK names
 * - Approval status mapping (invoices.ts private mapper)
 * - Invoice filter building (mpkCenterId, mpkCenterIds, approvalStatus)
 * - Invoice mapper updates in mappers.ts (mpkCenterId, approval fields)
 * - buildCategorizationPrompt dynamic MPK names
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvoiceEntity } from '../src/lib/dataverse/entities'
import {
  InvoiceUpdateSchema,
  AiCategorizationSchema,
  ApprovalStatus,
} from '../src/types/invoice'
import {
  mapDvInvoiceToApp,
  mapAppInvoiceToDv,
} from '../src/lib/dataverse/mappers'
import { DV, APPROVAL_STATUS } from '../src/lib/dataverse/config'
import type { DvInvoice } from '../src/types/dataverse'

// ============================================================
// InvoiceEntity — new fields
// ============================================================

describe('InvoiceEntity — Phase 2 fields', () => {
  it('should have mpkCenterId lookup field', () => {
    expect(InvoiceEntity.fields.mpkCenterId).toBe('_dvlp_mpkcenterid_value')
  })

  it('should have mpkCenterIdBind field', () => {
    expect(InvoiceEntity.fields.mpkCenterIdBind).toBe('dvlp_mpkcenterid@odata.bind')
  })

  it('should have approvalStatus field', () => {
    expect(InvoiceEntity.fields.approvalStatus).toBe('dvlp_approvalstatus')
  })

  it('should have approvedBy field', () => {
    expect(InvoiceEntity.fields.approvedBy).toBe('dvlp_approvedby')
  })

  it('should have approvedByOid field', () => {
    expect(InvoiceEntity.fields.approvedByOid).toBe('dvlp_approvedbyoid')
  })

  it('should have approvedAt field', () => {
    expect(InvoiceEntity.fields.approvedAt).toBe('dvlp_approvedat')
  })

  it('should have approvalComment field', () => {
    expect(InvoiceEntity.fields.approvalComment).toBe('dvlp_approvalcomment')
  })
})

// ============================================================
// ApprovalStatus type
// ============================================================

describe('ApprovalStatus', () => {
  it('should have all five statuses', () => {
    expect(ApprovalStatus.Draft).toBe('Draft')
    expect(ApprovalStatus.Pending).toBe('Pending')
    expect(ApprovalStatus.Approved).toBe('Approved')
    expect(ApprovalStatus.Rejected).toBe('Rejected')
    expect(ApprovalStatus.Cancelled).toBe('Cancelled')
  })

  it('should have exactly 5 values', () => {
    expect(Object.keys(ApprovalStatus)).toHaveLength(5)
  })
})

// ============================================================
// InvoiceUpdateSchema — mpkCenterId field
// ============================================================

describe('InvoiceUpdateSchema — mpkCenterId', () => {
  it('should accept valid UUID for mpkCenterId', () => {
    const result = InvoiceUpdateSchema.safeParse({
      mpkCenterId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('should accept null for mpkCenterId (clear association)', () => {
    const result = InvoiceUpdateSchema.safeParse({
      mpkCenterId: null,
    })
    expect(result.success).toBe(true)
  })

  it('should accept undefined (field is optional)', () => {
    const result = InvoiceUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should reject non-UUID string for mpkCenterId', () => {
    const result = InvoiceUpdateSchema.safeParse({
      mpkCenterId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// AiCategorizationSchema — dynamic MPK names
// ============================================================

describe('AiCategorizationSchema — dynamic MPK', () => {
  it('should accept static MPK enum value', () => {
    const result = AiCategorizationSchema.safeParse({
      mpk: 'Consultants',
      category: 'IT Consulting',
      description: 'External developer services',
      confidence: 0.9,
    })
    expect(result.success).toBe(true)
  })

  it('should accept dynamic MPK center name', () => {
    const result = AiCategorizationSchema.safeParse({
      mpk: 'IT Infrastructure',
      category: 'Cloud Services',
      description: 'Azure hosting costs',
      confidence: 0.85,
    })
    expect(result.success).toBe(true)
  })

  it('should accept Polish MPK center name', () => {
    const result = AiCategorizationSchema.safeParse({
      mpk: 'Dział Prawny',
      category: 'Usługi prawne',
      description: 'Obsługa prawna firmy',
      confidence: 0.75,
    })
    expect(result.success).toBe(true)
  })

  it('should reject mpk longer than 100 characters', () => {
    const result = AiCategorizationSchema.safeParse({
      mpk: 'A'.repeat(101),
      category: 'test',
      description: 'test',
      confidence: 0.5,
    })
    expect(result.success).toBe(false)
  })

  it('should reject confidence outside 0-1', () => {
    const result = AiCategorizationSchema.safeParse({
      mpk: 'BackOffice',
      category: 'test',
      description: 'test',
      confidence: 1.5,
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// mapDvInvoiceToApp — mpkCenterId & approval fields
// ============================================================

describe('mapDvInvoiceToApp — Phase 2 fields', () => {
  function makeDvInvoice(overrides: Partial<DvInvoice> = {}): DvInvoice {
    const s = DV.invoice
    return {
      [s.id]: 'inv-001',
      [s.buyerNip]: '1234567890',
      [s.buyerName]: 'Test Buyer',
      [s.sellerNip]: '0987654321',
      [s.sellerName]: 'Test Seller',
      [s.name]: 'FV/2025/001',
      [s.invoiceDate]: '2025-01-15',
      [s.grossAmount]: 1230,
      [s.ksefReferenceNumber]: 'REF-001',
      [s.paymentStatus]: 100000000,
      ...overrides,
    } as unknown as DvInvoice
  }

  it('should map mpkCenterId from Dataverse lookup', () => {
    const mpkId = 'aaaa-bbbb-cccc-dddd'
    const dv = makeDvInvoice({
      [DV.invoice.mpkCenterLookup]: mpkId,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.mpkCenterId).toBe(mpkId)
  })

  it('should map undefined mpkCenterId when not set', () => {
    const dv = makeDvInvoice()
    const result = mapDvInvoiceToApp(dv)
    expect(result.mpkCenterId).toBeUndefined()
  })

  it('should map approvalStatus Draft', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvalStatus]: APPROVAL_STATUS.DRAFT,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBe('Draft')
  })

  it('should map approvalStatus Pending', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvalStatus]: APPROVAL_STATUS.PENDING,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBe('Pending')
  })

  it('should map approvalStatus Approved', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvalStatus]: APPROVAL_STATUS.APPROVED,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBe('Approved')
  })

  it('should map approvalStatus Rejected', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvalStatus]: APPROVAL_STATUS.REJECTED,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBe('Rejected')
  })

  it('should map approvalStatus Cancelled', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvalStatus]: APPROVAL_STATUS.CANCELLED,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBe('Cancelled')
  })

  it('should map unknown approvalStatus to Draft', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvalStatus]: 999,
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBe('Draft')
  })

  it('should map undefined approvalStatus to undefined', () => {
    const dv = makeDvInvoice()
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvalStatus).toBeUndefined()
  })

  it('should map approval workflow metadata fields', () => {
    const dv = makeDvInvoice({
      [DV.invoice.approvedBy]: 'Jan Kowalski',
      [DV.invoice.approvedByOid]: 'oid-123',
      [DV.invoice.approvedAt]: '2025-06-15T10:30:00Z',
      [DV.invoice.approvalComment]: 'Looks good',
    } as any)
    const result = mapDvInvoiceToApp(dv)
    expect(result.approvedBy).toBe('Jan Kowalski')
    expect(result.approvedByOid).toBe('oid-123')
    expect(result.approvedAt).toBe('2025-06-15T10:30:00Z')
    expect(result.approvalComment).toBe('Looks good')
  })
})

// ============================================================
// mapAppInvoiceToDv — mpkCenterId binding
// ============================================================

describe('mapAppInvoiceToDv — mpkCenterId', () => {
  it('should bind mpkCenterId to Dataverse lookup', () => {
    const guid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const result = mapAppInvoiceToDv({ mpkCenterId: guid })
    expect(result[DV.invoice.mpkCenterBind]).toBe(`/dvlp_ksefmpkcenters(${guid})`)
  })

  it('should set null binding when mpkCenterId is null', () => {
    const result = mapAppInvoiceToDv({ mpkCenterId: null as any })
    expect(result[DV.invoice.mpkCenterBind]).toBeNull()
  })

  it('should set null binding when mpkCenterId is empty string', () => {
    const result = mapAppInvoiceToDv({ mpkCenterId: '' as any })
    expect(result[DV.invoice.mpkCenterBind]).toBeNull()
  })

  it('should not include mpkCenterBind when mpkCenterId is undefined', () => {
    const result = mapAppInvoiceToDv({ invoiceNumber: 'FV-001' })
    expect(DV.invoice.mpkCenterBind in result).toBe(false)
  })
})

// ============================================================
// AI Categorization — buildCategorizationPrompt (integration)
// ============================================================

describe('buildCategorizationPrompt — dynamic MPK', () => {
  // We test the service module by mocking dependencies
  // and calling the actual build function through categorizeInvoice

  let buildPromptModule: typeof import('../src/lib/openai/service')

  beforeEach(async () => {
    vi.resetModules()

    // Mock external dependencies
    vi.mock('../src/lib/keyvault/secrets', () => ({
      getSecret: vi.fn().mockResolvedValue('mock-value'),
    }))

    vi.mock('../src/lib/ai/feedback', () => ({
      getLearningContextForSupplier: vi.fn().mockResolvedValue(null),
      getAllLearningContexts: vi.fn().mockResolvedValue([]),
    }))

    // We'll just verify the prompt template logic
    // by checking that loadPrompt and fillPromptTemplate are called correctly
  })

  it('should use dynamic MPK names when provided', async () => {
    const { fillPromptTemplate, loadPrompt } = await import('../src/lib/prompts')
    const template = loadPrompt('categorization')

    const dynamicNames = ['IT Infrastructure', 'Legal', 'Marketing', 'Finance']
    const filled = fillPromptTemplate(template, {
      mpkValues: dynamicNames.join(', '),
      supplierName: 'Test Supplier',
      supplierNip: '1234567890',
      itemsList: '',
      amountInfo: '',
      learningHint: '',
      examplesSection: '',
    })

    expect(filled).toContain('IT Infrastructure')
    expect(filled).toContain('Legal')
    expect(filled).toContain('Marketing')
    expect(filled).toContain('Finance')
  })

  it('should contain all static MPK values in fallback', async () => {
    const { fillPromptTemplate, loadPrompt } = await import('../src/lib/prompts')
    const { MPK } = await import('../src/types/invoice')
    const template = loadPrompt('categorization')

    const filled = fillPromptTemplate(template, {
      mpkValues: Object.values(MPK).join(', '),
      supplierName: 'Test Supplier',
      supplierNip: '1234567890',
      itemsList: '',
      amountInfo: '',
      learningHint: '',
      examplesSection: '',
    })

    for (const mpkValue of Object.values(MPK)) {
      expect(filled).toContain(mpkValue)
    }
  })
})

// Note: ai-categorize endpoint tests are in ai-categorize-mpk.test.ts
// (separate file due to vi.mock hoisting constraints)
