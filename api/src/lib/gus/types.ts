/**
 * GUS/REGON API Types
 * 
 * Types for interacting with the Polish Central Statistical Office (GUS)
 * REGON registry API (BIR1).
 */

/**
 * Company data returned from GUS API
 */
export interface GusCompanyData {
  regon: string
  nip: string
  nazwa: string
  wojewodztwo: string
  powiat: string
  gmina: string
  miejscowosc: string
  kodPocztowy: string
  ulica: string
  nrNieruchomosci: string
  nrLokalu: string
  typ: 'F' | 'P' | 'LP'  // F=osoba fizyczna, P=prawna, LP=jednostka lokalna
  silosId: string
  dataZawieszenia?: string
  dataZakonczenia?: string
  statusNip?: string
  formaWlasnosci?: string
  podstawowaFormaPrawna?: string
  szczegolnaFormaPrawna?: string
  dataWpisuDoRegon?: string
  dataPowstania?: string
  email?: string
  telefon?: string
  fax?: string
  www?: string
  pkd?: string
  pkdNazwa?: string
}

/**
 * Formatted address from GUS data
 */
export interface GusAddress {
  street: string
  buildingNumber: string
  apartmentNumber?: string
  postalCode: string
  city: string
  province: string
  county: string
  municipality: string
  fullAddress: string
}

/**
 * Lookup result from GUS API
 */
export interface GusLookupResult {
  success: boolean
  data?: GusCompanyData
  address?: GusAddress
  error?: string
  errorCode?: string
}

/**
 * Search result item (for name-based search)
 */
export interface GusSearchResultItem {
  regon: string
  nip: string
  nazwa: string
  miejscowosc: string
  ulica: string
  typ: string
}

/**
 * Search results from GUS API
 */
export interface GusSearchResult {
  success: boolean
  results: GusSearchResultItem[]
  totalCount: number
  error?: string
}

/**
 * GUS API session info
 */
export interface GusSession {
  sessionId: string
  createdAt: Date
  expiresAt: Date
}

/**
 * Error codes from GUS API
 */
export const GUS_ERROR_CODES = {
  '0': 'Brak błędów',
  '1': 'Brak sesji (sesja wygasła)',
  '2': 'Niepoprawny identyfikator sesji',
  '4': 'Nie znaleziono podmiotu dla podanych kryteriów',
  '5': 'Zbyt wiele wyników (max 100)',
  '7': 'Błąd wewnętrzny usługi',
} as const

/**
 * Request body for NIP lookup
 */
export interface GusLookupRequest {
  nip: string
}

/**
 * Request body for company search
 */
export interface GusSearchRequest {
  query: string
  type?: 'nip' | 'regon' | 'krs' | 'name'
}

/**
 * API response for lookup endpoint
 */
export interface GusLookupResponse {
  success: boolean
  data?: {
    nip: string
    regon: string
    nazwa: string
    adres: string
    miejscowosc: string
    kodPocztowy: string
    ulica: string
    nrBudynku: string
    nrLokalu?: string
    email?: string
    telefon?: string
    www?: string
    pkd?: string
    pkdNazwa?: string
    typ: string
    aktywny: boolean
  }
  error?: string
  errorCode?: string
}

/**
 * API response for search endpoint
 */
export interface GusSearchResponse {
  success: boolean
  results: Array<{
    nip: string
    regon: string
    nazwa: string
    adres: string
    miejscowosc: string
  }>
  totalCount: number
  error?: string
}
