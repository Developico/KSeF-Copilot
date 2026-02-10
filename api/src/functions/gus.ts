import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { lookupByNip, searchByCompanyName, validateNip } from '../lib/gus'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

// Validation schemas
const LookupSchema = z.object({
  nip: z.string().regex(/^\d{10}$/, 'NIP musi mieć 10 cyfr'),
})

const SearchSchema = z.object({
  query: z.string().min(3, 'Szukana fraza musi mieć co najmniej 3 znaki').max(100),
  type: z.enum(['nip', 'regon', 'krs', 'name']).optional().default('name'),
})

/**
 * POST /api/gus/lookup - Lookup company by NIP
 * 
 * Fetches company data from GUS REGON registry by NIP.
 */
export async function gusLookupHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Require at least Reader role (reject users without AD group)
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: roleCheck.error || 'Forbidden' } }
    }

    const body = await request.json()
    const parseResult = LookupSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Invalid request body', 
          details: parseResult.error.flatten() 
        },
      }
    }

    const { nip } = parseResult.data

    // Validate NIP checksum
    if (!validateNip(nip)) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Nieprawidłowy NIP',
          details: 'Suma kontrolna NIP jest nieprawidłowa'
        },
      }
    }

    context.log(`GUS lookup for NIP: ${nip}`)

    const result = await lookupByNip(nip)

    if (!result.success) {
      return {
        status: result.errorCode === '4' ? 404 : 500,
        jsonBody: { 
          error: result.error || 'Lookup failed',
          errorCode: result.errorCode
        },
      }
    }

    // Format response for frontend
    const data = result.data!
    const address = result.address!

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          nip: data.nip,
          regon: data.regon,
          nazwa: data.nazwa,
          adres: address.fullAddress,
          miejscowosc: data.miejscowosc,
          kodPocztowy: data.kodPocztowy,
          ulica: data.ulica,
          nrBudynku: data.nrNieruchomosci,
          nrLokalu: data.nrLokalu || undefined,
          email: data.email,
          telefon: data.telefon,
          www: data.www,
          pkd: data.pkd,
          pkdNazwa: data.pkdNazwa,
          typ: data.typ === 'F' ? 'Osoba fizyczna' : data.typ === 'LP' ? 'Jednostka lokalna' : 'Osoba prawna',
          aktywny: !data.dataZakonczenia && !data.dataZawieszenia,
        },
      },
    }
  } catch (error) {
    context.error('GUS lookup error:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

app.http('gus-lookup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'gus/lookup',
  handler: gusLookupHandler,
})

/**
 * POST /api/gus/search - Search companies by name
 * 
 * Searches GUS REGON registry by company name.
 * Returns list of matching companies (max 100).
 */
export async function gusSearchHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    // Require at least Reader role (reject users without AD group)
    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: roleCheck.error || 'Forbidden' } }
    }

    const body = await request.json()
    const parseResult = SearchSchema.safeParse(body)
    
    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Invalid request body', 
          details: parseResult.error.flatten() 
        },
      }
    }

    const { query, type } = parseResult.data

    context.log(`GUS search: "${query}" (type: ${type})`)

    // If searching by NIP, use lookup instead
    if (type === 'nip' || /^\d{10}$/.test(query.replace(/\D/g, ''))) {
      const cleanNip = query.replace(/\D/g, '')
      if (cleanNip.length === 10) {
        const lookupResult = await lookupByNip(cleanNip)
        
        if (lookupResult.success && lookupResult.data) {
          const data = lookupResult.data
          return {
            status: 200,
            jsonBody: {
              success: true,
              results: [{
                nip: data.nip,
                regon: data.regon,
                nazwa: data.nazwa,
                adres: lookupResult.address?.fullAddress || '',
                miejscowosc: data.miejscowosc,
              }],
              totalCount: 1,
            },
          }
        }
        
        return {
          status: 200,
          jsonBody: {
            success: true,
            results: [],
            totalCount: 0,
          },
        }
      }
    }

    // Search by name
    const result = await searchByCompanyName(query)

    if (!result.success) {
      return {
        status: 500,
        jsonBody: { 
          error: result.error || 'Search failed',
        },
      }
    }

    // Format results
    const formattedResults = result.results.map(item => ({
      nip: item.nip,
      regon: item.regon,
      nazwa: item.nazwa,
      adres: item.ulica ? `${item.ulica}, ${item.miejscowosc}` : item.miejscowosc,
      miejscowosc: item.miejscowosc,
    }))

    return {
      status: 200,
      jsonBody: {
        success: true,
        results: formattedResults,
        totalCount: result.totalCount,
      },
    }
  } catch (error) {
    context.error('GUS search error:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

app.http('gus-search', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'gus/search',
  handler: gusSearchHandler,
})

/**
 * GET /api/gus/validate/:nip - Validate NIP checksum
 * 
 * Quick validation of NIP without calling GUS API.
 */
export async function gusValidateHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const nip = request.params.nip

    if (!nip) {
      return {
        status: 400,
        jsonBody: { error: 'NIP is required' },
      }
    }

    const cleanNip = nip.replace(/\D/g, '')
    
    if (cleanNip.length !== 10) {
      return {
        status: 200,
        jsonBody: { 
          valid: false, 
          error: 'NIP musi mieć 10 cyfr' 
        },
      }
    }

    const isValid = validateNip(cleanNip)

    return {
      status: 200,
      jsonBody: { 
        valid: isValid,
        nip: cleanNip,
        error: isValid ? undefined : 'Nieprawidłowa suma kontrolna NIP',
      },
    }
  } catch (error) {
    context.error('NIP validation error:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

app.http('gus-validate', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'gus/validate/{nip}',
  handler: gusValidateHandler,
})
