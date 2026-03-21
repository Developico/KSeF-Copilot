/**
 * Shared formatting utilities.
 *
 * Centralised currency / date / number formatting so all pages
 * show data consistently.
 *
 * Uses `formatToParts()` to work around an ICU/CLDR bug where
 * `Intl.NumberFormat('pl-PL')` omits the thousands-group separator
 * for 4-digit integers (1 000 – 9 999).
 */

const NBSP = '\u00A0'

/**
 * Reconstruct formatted string from parts, forcing proper grouping
 * on integer segments that the runtime left ungrouped.
 */
function formatParts(fmt: Intl.NumberFormat, value: number): string {
  return fmt
    .formatToParts(value)
    .map((p) =>
      p.type === 'integer' && p.value.length >= 4
        ? p.value.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
        : p.value,
    )
    .join('')
}

/**
 * Format a number as PLN currency (Polish locale, 2 decimal places).
 */
export function formatCurrency(
  amount: number,
  currency = 'PLN',
  locale = 'pl-PL'
): string {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatParts(fmt, amount)
}

/**
 * Format a number as compact PLN (no decimals, for cards/summaries).
 */
export function formatCurrencyCompact(
  amount: number,
  currency = 'PLN',
  locale = 'pl-PL'
): string {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return formatParts(fmt, amount)
}

/**
 * Format a date string as locale date.
 */
export function formatDate(date: string, locale = 'pl-PL'): string {
  return new Date(date).toLocaleDateString(locale)
}

/**
 * Format a date string as relative time (e.g. "2 days ago").
 */
export function formatRelativeDate(date: string, locale = 'pl-PL'): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return rtf.format(-minutes, 'minute')
    }
    return rtf.format(-hours, 'hour')
  }
  if (days < 30) return rtf.format(-days, 'day')
  if (days < 365) return rtf.format(-Math.floor(days / 30), 'month')
  return rtf.format(-Math.floor(days / 365), 'year')
}

/**
 * Format a number with Polish locale.
 */
export function formatNumber(n: number, locale = 'pl-PL', options?: Intl.NumberFormatOptions): string {
  const fmt = new Intl.NumberFormat(locale, options)
  return formatParts(fmt, n)
}
