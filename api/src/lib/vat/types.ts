/**
 * White List VAT (Biała Lista) API Types
 *
 * REST API from KAS (Krajowa Administracja Skarbowa)
 * - Production: https://wl-api.mf.gov.pl
 * - Test:       https://wl-test.mf.gov.pl
 * - No API key required, no registration needed
 * - Limits: 100 search queries/day, 5000 check queries/day
 */

// ─── API Response Models ─────────────────────────────────────────

/**
 * Person reference (representative, authorized clerk, or partner)
 */
export interface VatPerson {
  firstName: string
  lastName: string
  nip: string
  companyName: string
}

/**
 * Subject (company / sole proprietor) from the White List
 */
export interface VatSubject {
  name: string
  nip: string
  regon: string
  pesel: string | null
  krs: string
  residenceAddress: string
  workingAddress: string
  statusVat: string // "Czynny" | "Zwolniony" | "Niezarejestrowany"
  accountNumbers: string[]
  registrationLegalDate: string | null
  registrationDenialDate: string | null
  registrationDenialBasis: string | null
  restorationDate: string | null
  restorationBasis: string | null
  removalDate: string | null
  removalBasis: string | null
  hasVirtualAccounts: boolean
  representatives: VatPerson[]
  authorizedClerks: VatPerson[]
  partners: VatPerson[]
}

/**
 * Raw response from GET /api/search/nip/{nip} or /api/search/regon/{regon}
 */
export interface VatSearchApiResponse {
  result: {
    subject: VatSubject | null
    requestDateTime: string
    requestId: string
  }
}

/**
 * Raw response from GET /api/search/nips/{nips} (comma-separated, max 30)
 */
export interface VatSearchMultiApiResponse {
  result: {
    subjects: VatSubject[]
    requestDateTime: string
    requestId: string
  }
}

/**
 * Raw response from GET /api/check/nip/{nip}/bank-account/{account}
 */
export interface VatCheckApiResponse {
  result: {
    accountAssigned: string // "TAK" | "NIE"
    requestDateTime: string
    requestId: string
  }
}

// ─── Application-level DTOs (returned by Azure Functions) ─────────

/**
 * Lookup response returned to the frontend
 */
export interface VatLookupResponse {
  success: boolean
  data?: {
    name: string
    nip: string
    regon: string
    krs: string
    statusVat: string
    residenceAddress: string
    workingAddress: string
    accountNumbers: string[]
    registrationLegalDate: string | null
    hasVirtualAccounts: boolean
  }
  error?: string
}

/**
 * NIP validation response
 */
export interface VatValidateResponse {
  valid: boolean
  nip?: string
  error?: string
}

/**
 * Bank account verification response
 */
export interface VatCheckResponse {
  accountAssigned: boolean
  nip: string
  account: string
  requestId?: string
  error?: string
}
