import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { getExchangeRate, convertToPln, type SupportedCurrency } from '../lib/nbp'

/**
 * GET /api/exchange-rates - Get NBP exchange rate for a currency
 * 
 * Query parameters:
 * - currency: EUR | USD (required)
 * - date: YYYY-MM-DD (optional, defaults to today)
 * 
 * Response:
 * {
 *   rate: number,
 *   currency: 'EUR' | 'USD',
 *   effectiveDate: string,
 *   requestedDate: string,
 *   source: 'NBP API',
 *   previousRate?: number,
 *   changePercent?: number,
 *   warningThreshold?: boolean
 * }
 */
export async function getExchangeRateHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const url = new URL(request.url)
    const currency = url.searchParams.get('currency')?.toUpperCase() as SupportedCurrency | null
    const date = url.searchParams.get('date') || undefined

    if (!currency) {
      return {
        status: 400,
        jsonBody: { error: 'Currency parameter is required (EUR or USD)' },
      }
    }

    if (currency !== 'EUR' && currency !== 'USD') {
      return {
        status: 400,
        jsonBody: { error: 'Unsupported currency. Use EUR or USD' },
      }
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid date format. Use YYYY-MM-DD' },
      }
    }

    const result = await getExchangeRate(currency, date)

    return {
      status: 200,
      jsonBody: result,
    }
  } catch (error) {
    context.error('Failed to get exchange rate:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch exchange rate',
        details: message,
      },
    }
  }
}

/**
 * POST /api/exchange-rates/convert - Convert amount to PLN
 * 
 * Body:
 * {
 *   amount: number,
 *   currency: 'EUR' | 'USD',
 *   date?: string (YYYY-MM-DD, optional)
 * }
 * 
 * Response:
 * {
 *   originalAmount: number,
 *   currency: 'EUR' | 'USD',
 *   plnAmount: number,
 *   rate: number,
 *   effectiveDate: string
 * }
 */
export async function convertToPlnHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const body = await request.json() as {
      amount?: number
      currency?: string
      date?: string
    }

    if (typeof body.amount !== 'number' || body.amount < 0) {
      return {
        status: 400,
        jsonBody: { error: 'Amount must be a positive number' },
      }
    }

    const currency = body.currency?.toUpperCase() as SupportedCurrency | undefined
    if (!currency || (currency !== 'EUR' && currency !== 'USD')) {
      return {
        status: 400,
        jsonBody: { error: 'Currency must be EUR or USD' },
      }
    }

    const date = body.date
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid date format. Use YYYY-MM-DD' },
      }
    }

    // Get the exchange rate
    const rateResult = await getExchangeRate(currency, date)
    const plnAmount = convertToPln(body.amount, rateResult.rate)

    return {
      status: 200,
      jsonBody: {
        originalAmount: body.amount,
        currency,
        plnAmount,
        rate: rateResult.rate,
        effectiveDate: rateResult.effectiveDate,
        requestedDate: rateResult.requestedDate,
      },
    }
  } catch (error) {
    context.error('Failed to convert to PLN:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to convert amount',
        details: message,
      },
    }
  }
}

// Register the functions
app.http('exchange-rates-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'exchange-rates',
  handler: getExchangeRateHandler,
})

app.http('exchange-rates-convert', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'exchange-rates/convert',
  handler: convertToPlnHandler,
})
