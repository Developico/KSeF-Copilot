import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { lookupByNip, lookupByRegon, checkBankAccount, validateNip } from '../lib/vat'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { z } from 'zod'

// ─── Validation Schemas ──────────────────────────────────────────

const LookupSchema = z.object({
  nip: z
    .string()
    .regex(/^\d{10}$/, 'NIP must be 10 digits')
    .optional(),
  regon: z
    .string()
    .regex(/^\d{9}(\d{5})?$/, 'REGON must be 9 or 14 digits')
    .optional(),
}).refine((data) => data.nip || data.regon, {
  message: 'Either nip or regon is required',
})

const CheckAccountSchema = z.object({
  nip: z.string().regex(/^\d{10}$/, 'NIP must be 10 digits'),
  account: z
    .string()
    .min(20, 'Bank account number is too short')
    .max(32, 'Bank account number is too long'),
})

// ─── POST /api/vat/lookup ────────────────────────────────────────

/**
 * Lookup subject in the White List VAT registry by NIP or REGON.
 *
 * Body: { nip?: string, regon?: string }
 * Exactly one of nip / regon must be provided.
 */
export async function vatLookupHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

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
          details: parseResult.error.flatten(),
        },
      }
    }

    const { nip, regon } = parseResult.data

    // Validate NIP checksum (if NIP provided)
    if (nip && !validateNip(nip)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid NIP checksum' },
      }
    }

    const identifier = nip ? `NIP ${nip}` : `REGON ${regon}`
    context.log(`VAT lookup for ${identifier}`)

    const subject = nip
      ? await lookupByNip(nip)
      : await lookupByRegon(regon!)

    if (!subject) {
      return {
        status: 404,
        jsonBody: { success: false, error: 'Subject not found in White List' },
      }
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          name: subject.name,
          nip: subject.nip,
          regon: subject.regon,
          krs: subject.krs,
          statusVat: subject.statusVat,
          residenceAddress: subject.residenceAddress,
          workingAddress: subject.workingAddress,
          accountNumbers: subject.accountNumbers,
          registrationLegalDate: subject.registrationLegalDate,
          hasVirtualAccounts: subject.hasVirtualAccounts,
        },
      },
    }
  } catch (error) {
    context.error('VAT lookup error:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

app.http('vat-lookup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'vat/lookup',
  handler: vatLookupHandler,
})

// ─── GET /api/vat/validate/{nip} ────────────────────────────────

/**
 * Offline NIP validation (checksum only, no API call).
 */
export async function vatValidateHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  const nip = request.params.nip
  if (!nip) {
    return { status: 400, jsonBody: { error: 'NIP is required' } }
  }

  const cleanNip = nip.replace(/\D/g, '')
  if (cleanNip.length !== 10) {
    return {
      status: 200,
      jsonBody: { valid: false, error: 'NIP must be 10 digits' },
    }
  }

  const isValid = validateNip(cleanNip)
  return {
    status: 200,
    jsonBody: {
      valid: isValid,
      nip: cleanNip,
      error: isValid ? undefined : 'Invalid NIP checksum',
    },
  }
}

app.http('vat-validate', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'vat/validate/{nip}',
  handler: vatValidateHandler,
})

// ─── POST /api/vat/check-account ─────────────────────────────────

/**
 * Verify if a bank account number is registered for a given NIP
 * in the White List.
 *
 * Body: { nip: string, account: string }
 */
export async function vatCheckAccountHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } }
    }

    const roleCheck = requireRole(authResult.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: roleCheck.error || 'Forbidden' } }
    }

    const body = await request.json()
    const parseResult = CheckAccountSchema.safeParse(body)

    if (!parseResult.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
      }
    }

    const { nip, account } = parseResult.data

    if (!validateNip(nip)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid NIP checksum' },
      }
    }

    context.log(`VAT check-account: NIP ${nip}, account ending ...${account.slice(-4)}`)

    const result = await checkBankAccount(nip, account)

    return {
      status: 200,
      jsonBody: {
        accountAssigned: result.assigned,
        nip,
        account: account.replace(/\s/g, ''),
        requestId: result.requestId,
      },
    }
  } catch (error) {
    context.error('VAT check-account error:', error)
    return {
      status: 500,
      jsonBody: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

app.http('vat-check-account', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'vat/check-account',
  handler: vatCheckAccountHandler,
})
