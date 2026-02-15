/**
 * Shared formatting utilities.
 *
 * Centralised currency / date / number formatting so all pages
 * show data consistently.
 */

/**
 * Format a number as PLN currency (Polish locale, no decimals for large).
 */
export function formatCurrency(
  amount: number,
  currency = 'PLN',
  locale = 'pl-PL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number as compact PLN (no decimals, for cards/summaries).
 */
export function formatCurrencyCompact(
  amount: number,
  currency = 'PLN',
  locale = 'pl-PL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
export function formatNumber(n: number, locale = 'pl-PL'): string {
  return new Intl.NumberFormat(locale).format(n)
}
