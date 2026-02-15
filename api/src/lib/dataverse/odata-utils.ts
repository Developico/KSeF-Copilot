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
