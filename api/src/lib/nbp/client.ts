/**
 * NBP (Narodowy Bank Polski) Exchange Rate Client
 * 
 * Fetches exchange rates from the official NBP API.
 * Implements caching strategy to minimize API calls.
 * 
 * API Documentation: https://api.nbp.pl/
 */

export type SupportedCurrency = 'EUR' | 'USD'

export interface NBPApiResponse {
  table: string
  currency: string
  code: string
  rates: Array<{
    no: string
    effectiveDate: string
    mid: number
  }>
}

export interface ExchangeRateResult {
  rate: number
  currency: SupportedCurrency
  effectiveDate: string
  requestedDate: string
  source: 'NBP API'
  previousRate?: number
  changePercent?: number
  warningThreshold?: boolean
}

// In-memory cache for exchange rates
// Key: {currency}-{date}, Value: { rate, timestamp }
const rateCache = new Map<string, { rate: number; effectiveDate: string; timestamp: number }>()

// Cache TTL: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Warning threshold: 5% rate change
const RATE_CHANGE_WARNING_THRESHOLD = 5

/**
 * Fetch rate from NBP API for a specific currency and date
 */
async function fetchNBPRate(
  currency: SupportedCurrency,
  date: string
): Promise<{ rate: number; effectiveDate: string }> {
  const currencyCode = currency.toLowerCase()
  const url = `https://api.nbp.pl/api/exchangerates/rates/a/${currencyCode}/${date}/?format=json`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`No NBP rate available for ${currency} on ${date} (weekend/holiday)`)
    }
    throw new Error(`NBP API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as NBPApiResponse

  if (!data.rates || data.rates.length === 0) {
    throw new Error('No rates found in NBP response')
  }

  const firstRate = data.rates[0]
  if (!firstRate) {
    throw new Error('No rates found in NBP response')
  }

  return {
    rate: firstRate.mid,
    effectiveDate: firstRate.effectiveDate,
  }
}

/**
 * Find the most recent available rate by going back day by day
 * Skips weekends and handles cases where NBP hasn't published today's rate yet
 */
async function findLatestAvailableRate(
  currency: SupportedCurrency,
  startDate: Date,
  maxDaysBack: number = 7
): Promise<{ rate: number; effectiveDate: string }> {
  const currentDate = new Date(startDate)
  let attempts = 0

  while (attempts < maxDaysBack) {
    // Skip weekends
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek === 0) {
      // Sunday
      currentDate.setDate(currentDate.getDate() - 2)
      continue
    } else if (dayOfWeek === 6) {
      // Saturday
      currentDate.setDate(currentDate.getDate() - 1)
      continue
    }

    const dateStr = currentDate.toISOString().split('T')[0]
    if (!dateStr) {
      currentDate.setDate(currentDate.getDate() - 1)
      attempts++
      continue
    }

    try {
      console.log(`[NBP] Trying to fetch ${currency} rate for ${dateStr}...`)
      const result = await fetchNBPRate(currency, dateStr)
      console.log(`[NBP] Found ${currency} rate for ${result.effectiveDate}: ${result.rate}`)
      return result
    } catch {
      console.log(`[NBP] No ${currency} rate for ${dateStr}, trying previous day...`)
      currentDate.setDate(currentDate.getDate() - 1)
      attempts++
    }
  }

  throw new Error(`Could not find NBP ${currency} rate within last ${maxDaysBack} working days`)
}

/**
 * Get rate from cache or fetch from API
 */
async function getRate(
  currency: SupportedCurrency,
  requestedDate: string
): Promise<{ rate: number; effectiveDate: string }> {
  const cacheKey = `${currency}-${requestedDate}`

  // Check cache first
  const cached = rateCache.get(cacheKey)
  const now = Date.now()

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[NBP] Cache hit for ${cacheKey}: ${cached.rate}`)
    return { rate: cached.rate, effectiveDate: cached.effectiveDate }
  }

  // Fetch from API - find the latest available rate
  console.log(`[NBP] Fetching latest available ${currency} rate starting from ${requestedDate}...`)
  const result = await findLatestAvailableRate(currency, new Date(requestedDate))

  // Store in cache
  rateCache.set(cacheKey, {
    rate: result.rate,
    effectiveDate: result.effectiveDate,
    timestamp: now,
  })
  console.log(
    `[NBP] Cached ${currency} rate for ${requestedDate}: ${result.rate} (effective: ${result.effectiveDate})`
  )

  return result
}

/**
 * Get previous business day (skip weekends)
 */
function getPreviousBusinessDay(date: Date): string {
  const prev = new Date(date)
  prev.setDate(prev.getDate() - 1)

  // Skip weekend
  const dayOfWeek = prev.getDay()
  if (dayOfWeek === 0) {
    // Sunday
    prev.setDate(prev.getDate() - 2)
  } else if (dayOfWeek === 6) {
    // Saturday
    prev.setDate(prev.getDate() - 1)
  }

  const result = prev.toISOString().split('T')[0]
  return result || prev.toISOString().slice(0, 10)
}

/**
 * Calculate rate change percentage
 */
function calculateChange(current: number, previous: number): number {
  return ((current - previous) / previous) * 100
}

/**
 * Get exchange rate for a given currency and date
 * Returns the most recent available rate if the requested date is a weekend/holiday
 */
export async function getExchangeRate(
  currency: SupportedCurrency,
  date?: string
): Promise<ExchangeRateResult> {
  // Default to today if no date provided
  const requestedDate = date || new Date().toISOString().split('T')[0] || ''

  // Validate date format
  if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  // Validate currency
  if (currency !== 'EUR' && currency !== 'USD') {
    throw new Error(`Unsupported currency: ${currency}. Supported: EUR, USD`)
  }

  // Fetch the most recent available rate
  const { rate, effectiveDate } = await getRate(currency, requestedDate)

  // Try to fetch previous day's rate for comparison
  let previousRate: number | undefined
  let changePercent: number | undefined
  let warningThreshold = false

  try {
    const prevDate = getPreviousBusinessDay(new Date(effectiveDate))
    const prevResult = await getRate(currency, prevDate)
    previousRate = prevResult.rate

    if (previousRate) {
      changePercent = calculateChange(rate, previousRate)
      warningThreshold = Math.abs(changePercent) > RATE_CHANGE_WARNING_THRESHOLD

      if (warningThreshold) {
        console.warn(
          `[NBP] ${currency} rate change warning: ${changePercent.toFixed(2)}% ` +
            `(${previousRate} → ${rate})`
        )
      }
    }
  } catch {
    // Previous rate is optional - log but don't fail
    console.log(`[NBP] Could not fetch previous ${currency} rate for comparison`)
  }

  return {
    rate: parseFloat(rate.toFixed(4)),
    currency,
    effectiveDate,
    requestedDate,
    source: 'NBP API',
    ...(previousRate && { previousRate: parseFloat(previousRate.toFixed(4)) }),
    ...(changePercent !== undefined && {
      changePercent: parseFloat(changePercent.toFixed(2)),
    }),
    ...(warningThreshold && { warningThreshold }),
  }
}

/**
 * Convert amount from foreign currency to PLN
 */
export function convertToPln(amount: number, rate: number): number {
  return parseFloat((amount * rate).toFixed(2))
}

/**
 * Clear the rate cache (useful for testing)
 */
export function clearRateCache(): void {
  rateCache.clear()
}
