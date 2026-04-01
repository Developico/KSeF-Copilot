/**
 * OData Utilities
 * 
 * Helpers for safely building OData queries,
 * preventing injection attacks via user-supplied values.
 */

/**
 * Escape a string value for use inside OData $filter expressions.
 * 
 * In OData, single quotes inside string literals must be doubled ('').
 * This prevents injection via values like: `') or 1 eq 1 or contains(x,'`
 * 
 * @example
 *   escapeOData("O'Brien")   // "O''Brien"
 *   escapeOData("normal")    // "normal"
 *   escapeOData("a]'[b")     // "a]''[b"
 */
export function escapeOData(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Validate that a string is a valid GUID/UUID format.
 * Prevents OData injection when interpolating IDs into $filter expressions.
 *
 * @example
 *   isValidGuid("a1b2c3d4-e5f6-7890-abcd-ef1234567890") // true
 *   isValidGuid("abc or 1 eq 1")                          // false
 */
export function isValidGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
