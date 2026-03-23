import { z } from 'zod'

// ============================================================
// Supplier Status
// ============================================================

export const SupplierStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
  Blocked: 'Blocked',
} as const

export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus]

// ============================================================
// Supplier Source
// ============================================================

export const SupplierSource = {
  KSeF: 'KSeF',
  Manual: 'Manual',
  VatApi: 'VatApi',
} as const

export type SupplierSource = (typeof SupplierSource)[keyof typeof SupplierSource]

// ============================================================
// Supplier (application-level entity)
// ============================================================

export interface Supplier {
  id: string
  nip: string
  name: string
  shortName?: string | null
  regon?: string | null
  krs?: string | null
  // Address
  street?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  // Contact
  email?: string | null
  phone?: string | null
  bankAccount?: string | null
  // VAT API
  vatStatus?: string | null
  vatStatusDate?: string | null
  // Business
  paymentTermsDays?: number | null
  defaultMpkId?: string | null
  defaultCategory?: string | null
  notes?: string | null
  tags?: string | null
  // Self-billing flags
  hasSelfBillingAgreement: boolean
  selfBillingAgreementDate?: string | null
  selfBillingAgreementExpiry?: string | null
  sbContactUserId?: string | null
  sbInvoiceNumberTemplate?: string | null
  // Cached statistics
  firstInvoiceDate?: string | null
  lastInvoiceDate?: string | null
  totalInvoiceCount: number
  totalGrossAmount: number
  // Status
  status: SupplierStatus
  source: SupplierSource
  settingId: string
  // Metadata
  createdOn: string
  modifiedOn: string
}

// ============================================================
// Supplier Stats (computed in endpoint)
// ============================================================

export interface SupplierStats {
  invoiceCount: number
  totalGross: number
  avgInvoiceAmount: number
  lastInvoiceDate: string | null
  pendingPayments: number
  overduePayments: number
  selfBillingInvoiceCount: number
  selfBillingPendingCount: number
}

// ============================================================
// NIP Checksum Validation
// ============================================================

function isValidNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const digits = nip.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0)
  return sum % 11 === digits[9]
}

// ============================================================
// Zod Schemas
// ============================================================

export const SupplierCreateSchema = z.object({
  nip: z.string().regex(/^\d{10}$/, 'NIP must be 10 digits').refine(isValidNip, 'Invalid NIP checksum'),
  name: z.string().min(1).max(255),
  shortName: z.string().max(100).optional(),
  regon: z.string().max(14).optional(),
  krs: z.string().max(20).optional(),
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).default('PL'),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  bankAccount: z.string().max(50).optional(),
  vatStatus: z.string().max(50).optional(),
  vatStatusDate: z.string().datetime().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  defaultMpkId: z.string().uuid().optional(),
  defaultCategory: z.string().max(100).optional(),
  notes: z.string().max(4000).optional(),
  tags: z.string().max(1000).optional(),
  hasSelfBillingAgreement: z.boolean().default(false),
  selfBillingAgreementDate: z.string().datetime().optional(),
  selfBillingAgreementExpiry: z.string().datetime().optional(),
  sbContactUserId: z.string().uuid().optional(),
  sbInvoiceNumberTemplate: z.string().max(200).optional(),
  status: z.nativeEnum(SupplierStatus).default(SupplierStatus.Active),
  source: z.nativeEnum(SupplierSource).default(SupplierSource.Manual),
  settingId: z.string().uuid(),
})

export type SupplierCreate = z.infer<typeof SupplierCreateSchema>

export const SupplierUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  shortName: z.string().max(100).nullable().optional(),
  regon: z.string().max(14).nullable().optional(),
  krs: z.string().max(20).nullable().optional(),
  street: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  bankAccount: z.string().max(50).nullable().optional(),
  vatStatus: z.string().max(50).nullable().optional(),
  vatStatusDate: z.string().datetime().nullable().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).nullable().optional(),
  defaultMpkId: z.string().uuid().nullable().optional(),
  defaultCategory: z.string().max(100).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  tags: z.string().max(1000).nullable().optional(),
  hasSelfBillingAgreement: z.boolean().optional(),
  selfBillingAgreementDate: z.string().datetime().nullable().optional(),
  selfBillingAgreementExpiry: z.string().datetime().nullable().optional(),
  sbContactUserId: z.string().uuid().nullable().optional(),
  sbInvoiceNumberTemplate: z.string().max(200).nullable().optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
  source: z.nativeEnum(SupplierSource).optional(),
})

export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>

// ============================================================
// Supplier List Params
// ============================================================

export interface SupplierListParams {
  settingId: string
  status?: SupplierStatus
  search?: string
  hasSelfBillingAgreement?: boolean
  top?: number
  skip?: number
}
