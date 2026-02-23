import { NextResponse } from 'next/server'
import { FALLBACK_FORECAST_META } from '@/lib/forecast-metadata'

const API_URL = process.env.API_URL || 'http://localhost:7071'

/**
 * GET /api/forecast/algorithms
 *
 * Tries to proxy to Azure Functions; if unreachable, returns local fallback
 * metadata so the browser never sees a 404 in the console.
 */
export async function GET(request: Request) {
  try {
    const res = await fetch(`${API_URL}/api/forecast/algorithms`, {
      headers: {
        Authorization: request.headers.get('Authorization') ?? '',
      },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch {
    // Azure Functions unreachable — fall through to fallback
  }

  return NextResponse.json(FALLBACK_FORECAST_META)
}
