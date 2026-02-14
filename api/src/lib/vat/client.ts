/**
 * White List VAT (Biała Lista) REST Client
 *
 * Calls the KAS API at https://wl-api.mf.gov.pl
 * No API key required.
 */

import type {
  VatSearchApiResponse,
  VatCheckApiResponse,
  VatSubject,
} from './types'

const BASE_URL = process.env.WL_VAT_API_URL || 'https://wl-api.mf.gov.pl'

function todayDate(): string {
  return new Date().toISOString().split('T')[0] // YYYY-MM-DD
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WL-VAT API HTTP ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Lookup a subject by NIP.
 *
 * GET /api/search/nip/{nip}?date=YYYY-MM-DD
 */
export async function lookupByNip(nip: string): Promise<VatSubject | null> {
  const url = `${BASE_URL}/api/search/nip/${nip}?date=${todayDate()}`
  const response = await fetchJson<VatSearchApiResponse>(url)
  return response.result.subject
}

/**
 * Lookup a subject by REGON.
 *
 * GET /api/search/regon/{regon}?date=YYYY-MM-DD
 */
export async function lookupByRegon(regon: string): Promise<VatSubject | null> {
  const url = `${BASE_URL}/api/search/regon/${regon}?date=${todayDate()}`
  const response = await fetchJson<VatSearchApiResponse>(url)
  return response.result.subject
}

/**
 * Verify whether a bank account number belongs to a given NIP.
 *
 * GET /api/check/nip/{nip}/bank-account/{account}?date=YYYY-MM-DD
 *
 * @returns "TAK" | "NIE"
 */
export async function checkBankAccount(
  nip: string,
  account: string,
): Promise<{ assigned: boolean; requestId: string }> {
  const cleanAccount = account.replace(/\s/g, '')
  const url = `${BASE_URL}/api/check/nip/${nip}/bank-account/${cleanAccount}?date=${todayDate()}`
  const response = await fetchJson<VatCheckApiResponse>(url)
  return {
    assigned: response.result.accountAssigned === 'TAK',
    requestId: response.result.requestId,
  }
}

/**
 * Validate NIP checksum (offline, no API call).
 */
export function validateNip(nip: string): boolean {
  const clean = nip.replace(/\D/g, '')
  if (clean.length !== 10) return false

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * weights[i]
  }

  const checksum = sum % 11
  return checksum !== 10 && checksum === parseInt(clean[9], 10)
}
