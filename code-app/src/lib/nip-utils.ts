/**
 * Polish NIP (Tax Identification Number) utilities.
 *
 * NIP consists of 10 digits with a checksum (modulo 11).
 * Weights: [6, 5, 7, 2, 3, 4, 5, 6, 7]
 */

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const

/**
 * Strip all non-digit characters from a NIP string
 */
export function stripNip(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Format NIP as XXX-XXX-XX-XX
 */
export function formatNip(nip: string): string {
  const digits = stripNip(nip)
  if (digits.length !== 10) return nip
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
}

/**
 * Validate NIP checksum (modulo 11 algorithm).
 * Returns `true` if the NIP is valid, `false` otherwise.
 */
export function validateNipChecksum(nip: string): boolean {
  const digits = stripNip(nip)
  if (digits.length !== 10) return false

  const nums = digits.split('').map(Number)
  const sum = NIP_WEIGHTS.reduce((acc, w, i) => acc + w * nums[i], 0)
  const checkDigit = sum % 11

  // checkDigit === 10 means invalid NIP
  return checkDigit !== 10 && checkDigit === nums[9]
}

/**
 * Full NIP validation returning a specific error key or null if valid.
 * - `invalidNip` — wrong length or non-numeric
 * - `nipChecksumError` — correct length but failed checksum
 */
export function validateNip(nip: string): 'invalidNip' | 'nipChecksumError' | null {
  const digits = stripNip(nip)
  if (digits.length === 0) return null // empty is not an error (field may be optional)
  if (digits.length !== 10 || !/^\d{10}$/.test(digits)) return 'invalidNip'
  if (!validateNipChecksum(digits)) return 'nipChecksumError'
  return null
}
