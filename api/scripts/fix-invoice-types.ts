/**
 * Fix invoice types — patch 2 invoices wrongly stored as Corrective
 *
 * Problem: Code commit b6b93d0 introduced writing dvlp_invoicetype to Dataverse
 * but used wrong OptionSet values:
 *   Buggy code: VAT=100000001, Corrective=100000002
 *   Actual DV:  VAT=100000000, Corrective=100000001, Advance=100000002
 *
 * Result: 2 regular VAT invoices synced after that commit were stored as 100000001,
 * which Dataverse displays as "koryguj\u0105ca" (Corrective).
 *
 * This script:
 *   1. Finds all invoices with dvlp_invoicetype = 100000001 (buggy "VAT")
 *   2. Patches them to dvlp_invoicetype = 100000000 (correct VAT value)
 *
 * Usage:
 *   pnpm tsx scripts/fix-invoice-types.ts              # dry-run: show affected count
 *   pnpm tsx scripts/fix-invoice-types.ts --execute    # patch invoices in Dataverse
 *   pnpm tsx scripts/fix-invoice-types.ts --nip=xxx    # limit to specific NIP
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
let accessToken: string

const execute = process.argv.includes('--execute')
const nipArg = process.argv.find(a => a.startsWith('--nip='))?.split('=')[1]

// Dataverse OptionSet values (correct, verified)
// 100000000=VAT, 100000001=korygująca, 100000002=zaliczkowa
const INVOICE_TYPE_VAT = 100000000        // correct VAT value
const INVOICE_TYPE_CORRECTIVE_BUGGY = 100000001  // buggy code stored VAT as this

async function getToken() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  })
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: [`${dataverseUrl}/.default`],
  })
  if (!tokenResponse?.accessToken) throw new Error('Failed to acquire token')
  accessToken = tokenResponse.accessToken
}

async function dvFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${dataverseUrl}/api/data/v9.2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Dataverse error ${response.status}: ${error.substring(0, 500)}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function fetchPage(url: string): Promise<{ value: Record<string, unknown>[]; nextLink?: string }> {
  const result = await dvFetch(url)
  return {
    value: result?.value || [],
    nextLink: result?.['@odata.nextLink'],
  }
}

async function main() {
  console.log('\n🔧 Fix Invoice Types — Backfill dvlp_invoicetype\n')
  console.log('='.repeat(60))
  console.log(`📌 Mode: ${execute ? '🔴 EXECUTE (will PATCH Dataverse)' : '🟢 DRY-RUN (read-only)'}`)
  if (nipArg) console.log(`📌 NIP filter: ${nipArg}`)
  console.log()

  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')

  // First: check what distinct invoiceType values actually exist in Dataverse
  console.log('🔍 Checking distinct invoiceType values in Dataverse...')
  const sampleResult = await dvFetch(
    `/dvlp_ksefinvoices?$select=dvlp_invoicetype,dvlp_name&$top=200`,
    { headers: { Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' } }
  )
  const sampleInvoices: Record<string, unknown>[] = sampleResult?.value || []
  const valueCounts: Record<string, { count: number; label: string }> = {}
  for (const inv of sampleInvoices) {
    const val = String(inv.dvlp_invoicetype ?? 'null')
    const label = String(inv['dvlp_invoicetype@OData.Community.Display.V1.FormattedValue'] ?? '')
    if (!valueCounts[val]) valueCounts[val] = { count: 0, label }
    valueCounts[val].count++
  }
  console.log('   Distinct dvlp_invoicetype values (from first 200 invoices):')
  for (const [val, { count, label }] of Object.entries(valueCounts).sort()) {
    console.log(`   value=${val.padEnd(15)} label="${label}"  → ${count} invoice(s)`)
  }
  console.log()

  // Build filter: invoiceType = 100000001 (buggy code's "VAT" value, now means Corrective)
  // These are the invoices that were supposed to be VAT but got the wrong numeric value
  const nipFilter = nipArg ? ` and dvlp_buyernip eq '${nipArg}'` : ''
  const baseFilter = `dvlp_invoicetype eq ${INVOICE_TYPE_CORRECTIVE_BUGGY}${nipFilter}`

  const selectFields = 'dvlp_ksefinvoiceid,dvlp_name,dvlp_invoicenumber,dvlp_invoicetype,dvlp_buyernip'

  let url = `/dvlp_ksefinvoices?$filter=${encodeURIComponent(baseFilter)}&$select=${selectFields}&$top=100`

  const affected: Record<string, unknown>[] = []

  console.log('🔍 Querying affected invoices (dvlp_invoicetype=100000001)...')

  let pageCount = 0
  while (url) {
    const page = await fetchPage(url)
    affected.push(...page.value)
    pageCount++
    process.stdout.write(`   Fetched page ${pageCount}: ${affected.length} invoices so far...\r`)

    if (page.nextLink) {
      // nextLink is absolute URL, extract path+query
      url = page.nextLink.replace(`${dataverseUrl}/api/data/v9.2`, '')
    } else {
      url = ''
    }
  }

  console.log()
  console.log(`\n📊 Found ${affected.length} invoices with type=100000001 (wrongly stored VAT, should be 100000000)\n`)

  if (affected.length === 0) {
    console.log('✅ No invoices to fix. All looks good!')
    return
  }

  // Show sample
  const sample = affected.slice(0, 10)
  console.log('Sample of affected invoices:')
  console.log('─'.repeat(60))
  for (const inv of sample) {
    const id = inv.dvlp_ksefinvoiceid as string
    const num = inv.dvlp_invoicenumber as string || inv.dvlp_name as string || '(no number)'
    const nip = inv.dvlp_buyernip as string || ''
    // Heuristic: real corrections usually start with KOR
    const looksLikeCorrection = /^KOR[/\-_]/i.test(num)
    const flag = looksLikeCorrection ? '⚠️  (looks like correction)' : '✅ will fix'
    console.log(`  ${num.padEnd(35)} NIP: ${nip}  ${flag}`)
  }
  if (affected.length > 10) {
    console.log(`  ... and ${affected.length - 10} more`)
  }
  console.log('─'.repeat(60))

  // KOR invoices at 100000001 are already CORRECT (100000001 = Corrective in DV after fix)
  // Only patch non-KOR invoices (wrongly stored as 100000001 when they should be VAT)
  const toFix = affected.filter(inv => {
    const num = inv.dvlp_invoicenumber as string || inv.dvlp_name as string || ''
    return !/^KOR[/\-_]/i.test(num)
  })
  const alreadyCorrect = affected.length - toFix.length

  if (alreadyCorrect > 0) {
    console.log(`ℹ️  ${alreadyCorrect} KOR invoice(s) skipped — already correct (100000001 = Corrective ✅)`)
  }

  if (!execute) {
    console.log(`\n⚠️  DRY-RUN: No changes made.`)
    console.log(`   Run with --execute to patch ${toFix.length} invoice(s) to VAT.\n`)
    return
  }

  // Patch only non-KOR invoices to VAT
  console.log(`\n🔄 Patching ${toFix.length} invoice(s) to invoiceType = VAT (${INVOICE_TYPE_VAT})...\n`)

  let patched = 0
  let failed = 0
  const errors: string[] = []

  for (const inv of toFix) {
    const id = inv.dvlp_ksefinvoiceid as string
    const num = inv.dvlp_invoicenumber as string || inv.dvlp_name as string || id

    try {
      await dvFetch(`/dvlp_ksefinvoices(${id})`, {
        method: 'PATCH',
        body: JSON.stringify({ dvlp_invoicetype: INVOICE_TYPE_VAT }),
      })
      patched++

      if (patched % 10 === 0 || patched === toFix.length) {
        process.stdout.write(`   Progress: ${patched}/${toFix.length} patched\r`)
      }
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${num}: ${msg}`)
      console.error(`   ❌ Failed: ${num} — ${msg.substring(0, 100)}`)
    }
  }

  console.log()
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Done!`)
  console.log(`   Patched:  ${patched}`)
  console.log(`   Failed:   ${failed}`)

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    errors.slice(0, 20).forEach(e => console.log(`   ${e}`))
  }
  console.log()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
