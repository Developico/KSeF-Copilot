import { z } from 'zod'

// ============================================================
// SB Agreement Status
// ============================================================

export const SbAgreementStatus = {
  Active: 'Active',
  Expired: 'Expired',
  Terminated: 'Terminated',
} as const

export type SbAgreementStatus = (typeof SbAgreementStatus)[keyof typeof SbAgreementStatus]

// ============================================================
// Self-Billing Invoice Status
// ============================================================

export const SelfBillingInvoiceStatus = {
  Draft: 'Draft',
  PendingSeller: 'PendingSeller',
  SellerApproved: 'SellerApproved',
  SellerRejected: 'SellerRejected',
  SentToKsef: 'SentToKsef',
} as const

export type SelfBillingInvoiceStatus = (typeof SelfBillingInvoiceStatus)[keyof typeof SelfBillingInvoiceStatus]

// ============================================================
// SB Agreement (application-level entity)
// ============================================================

export interface SbAgreement {
  id: string
  name: string
  supplierId: string
  agreementDate: string
  validFrom: string
  validTo?: string | null
  renewalDate?: string | null
  approvalProcedure?: string | null
  status: SbAgreementStatus
  credentialReference?: string | null
  notes?: string | null
  hasDocument: boolean
  documentFilename?: string | null
  autoApprove: boolean
  settingId: string
  // Metadata
  createdOn: string
  modifiedOn: string
}

// ============================================================
// SB Template (application-level entity)
// ============================================================

export interface SbTemplate {
  id: string
  supplierId: string
  settingId: string
  name: string
  description?: string | null
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  currency: string
  isActive: boolean
  sortOrder: number
  paymentTermDays?: number | null
  // Metadata
  createdOn: string
  modifiedOn: string
}

// ============================================================
// Self-Billing Generate Request
// ============================================================

const PreviewItemSchema = z.object({
  templateId: z.string().uuid(),
  templateName: z.string(),
  itemDescription: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  unitPrice: z.number(),
  vatRate: z.number(),
  netAmount: z.number(),
  vatAmount: z.number(),
  grossAmount: z.number(),
  paymentTermDays: z.number().int().min(0).max(365).nullable().optional(),
})

const PreviewSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  supplierNip: z.string(),
  agreementId: z.string().uuid(),
  items: z.array(PreviewItemSchema).min(1),
  totals: z.object({
    netAmount: z.number(),
    vatAmount: z.number(),
    grossAmount: z.number(),
  }),
})

export const SelfBillingGenerateRequestSchema = z.object({
  settingId: z.string().uuid(),
  period: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
  }),
  supplierIds: z.array(z.string().uuid()).max(200).optional(),
  templateIds: z.array(z.string().uuid()).max(500).optional(),
  previews: z.array(PreviewSchema).max(200).optional(),
})

export type SelfBillingGenerateRequest = z.infer<typeof SelfBillingGenerateRequestSchema>

// ============================================================
// Self-Billing Generate Preview (per-supplier)
// ============================================================

export interface SelfBillingGeneratePreview {
  supplierId: string
  supplierName: string
  supplierNip: string
  agreementId: string
  items: Array<{
    templateId: string
    templateName: string
    itemDescription: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    netAmount: number
    vatAmount: number
    grossAmount: number
    paymentTermDays?: number | null
  }>
  totals: {
    netAmount: number
    vatAmount: number
    grossAmount: number
  }
}

// ============================================================
// Zod Schemas — SB Agreement
// ============================================================

export const SbAgreementCreateSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().min(1).max(255),
  agreementDate: z.string().date(),
  validFrom: z.string().date(),
  validTo: z.string().date().optional(),
  renewalDate: z.string().date().optional(),
  approvalProcedure: z.string().max(4000).optional(),
  credentialReference: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
  autoApprove: z.boolean().optional(),
  settingId: z.string().uuid(),
}).refine(
  (data) => !data.validTo || data.validTo > data.validFrom,
  { message: 'validTo must be after validFrom', path: ['validTo'] }
)

export type SbAgreementCreate = z.infer<typeof SbAgreementCreateSchema>

export const SbAgreementUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  agreementDate: z.string().date().optional(),
  validFrom: z.string().date().optional(),
  validTo: z.string().date().nullable().optional(),
  renewalDate: z.string().date().nullable().optional(),
  approvalProcedure: z.string().max(4000).nullable().optional(),
  credentialReference: z.string().max(500).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  status: z.nativeEnum(SbAgreementStatus).optional(),
  hasDocument: z.boolean().optional(),
  documentFilename: z.string().max(255).nullable().optional(),
  autoApprove: z.boolean().optional(),
})

export type SbAgreementUpdate = z.infer<typeof SbAgreementUpdateSchema>

// ============================================================
// Zod Schemas — SB Template
// ============================================================

export const SbTemplateCreateSchema = z.object({
  supplierId: z.string().uuid(),
  settingId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  itemDescription: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(50),
  unitPrice: z.number().min(0),
  vatRate: z.number().int().min(-1).max(100),
  currency: z.string().max(10).default('PLN'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  paymentTermDays: z.number().int().min(0).max(365).nullable().optional(),
})

export type SbTemplateCreate = z.infer<typeof SbTemplateCreateSchema>

export const SbTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  itemDescription: z.string().min(1).max(500).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).max(50).optional(),
  unitPrice: z.number().min(0).optional(),
  vatRate: z.number().int().min(-1).max(100).optional(),
  currency: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  paymentTermDays: z.number().int().min(0).max(365).nullable().optional(),
})

export type SbTemplateUpdate = z.infer<typeof SbTemplateUpdateSchema>

// ============================================================
// Self-Billing Invoice (application-level entity)
// ============================================================

export interface SbInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string | null
  netAmount: number
  vatAmount: number
  grossAmount: number
  currency: string
  status: SelfBillingInvoiceStatus
  sellerRejectionReason?: string | null
  sentDate?: string | null
  ksefReferenceNumber?: string | null
  xmlContent?: string | null
  xmlHash?: string | null
  // Audit: submit & approve
  submittedByUserId?: string | null
  submittedAt?: string | null
  approvedByUserId?: string | null
  approvedAt?: string | null
  // Relations
  settingId: string
  supplierId: string
  supplierName?: string
  supplierNip?: string
  agreementId?: string | null
  ksefInvoiceId?: string | null
  mpkCenterId?: string | null
  // Line items (populated by service)
  items: SbLineItem[]
  // Metadata
  createdOn: string
  modifiedOn: string
}

// ============================================================
// Self-Billing Line Item (application-level entity)
// ============================================================

export interface SbLineItem {
  id: string
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  netAmount: number
  vatAmount: number
  grossAmount: number
  paymentTermDays?: number | null
  sortOrder?: number
  // Relations
  sbInvoiceId: string
  templateId?: string | null
  // Metadata
  createdOn: string
  modifiedOn: string
}

// ============================================================
// Zod Schemas — SB Invoice CRUD
// ============================================================

export const SelfBillingInvoiceCreateSchema = z.object({
  settingId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  agreementId: z.string().uuid().optional(),
  mpkId: z.string().uuid().optional(),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  items: z.array(z.object({
    templateId: z.string().uuid().optional(),
    itemDescription: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(50),
    unitPrice: z.number().min(0),
    vatRate: z.number().int().min(-1).max(100),
    paymentTermDays: z.number().int().min(0).max(365).nullable().optional(),
  })).min(1),
}).refine(d => d.supplierId || d.agreementId, {
  message: 'Either supplierId or agreementId is required',
})

export type SelfBillingInvoiceCreate = z.infer<typeof SelfBillingInvoiceCreateSchema>

export const SelfBillingInvoiceUpdateSchema = z.object({
  invoiceNumber: z.string().min(1).max(50).optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(z.object({
    templateId: z.string().uuid().optional(),
    itemDescription: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(50),
    unitPrice: z.number().min(0),
    vatRate: z.number().int().min(-1).max(100),
    paymentTermDays: z.number().int().min(0).max(365).nullable().optional(),
  })).min(1).optional(),
})

export type SelfBillingInvoiceUpdate = z.infer<typeof SelfBillingInvoiceUpdateSchema>
