/**
 * Cleanup test data from Dataverse
 * 
 * Usage:
 *   pnpm cleanup:testdata                       # Dry-run (show what would be deleted)
 *   pnpm cleanup:testdata --nip=1234567890      # Cleanup for specific NIP
 *   pnpm cleanup:testdata --confirm             # Actually delete (requires confirmation)
 *   pnpm cleanup:testdata --source=Manual       # Only delete Manual invoices
 *   pnpm cleanup:testdata --from=2025-01-01     # Only delete from this date
 *   pnpm cleanup:testdata --to=2026-01-31       # Only delete up to this date
 * 
 * Run with: pnpm tsx scripts/cleanup-testdata.ts [options]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''

let accessToken: string

// Parse command line arguments
function parseArgs(): {
  nip: string
  confirm: boolean
  source?: string
  fromDate?: string
  toDate?: string
} {
  const args = process.argv.slice(2)
  const result = {
    nip: defaultNip,
    confirm: false,
    source: undefined as string | undefined,
    fromDate: undefined as string | undefined,
    toDate: undefined as string | undefined,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) {
      result.nip = arg.split('=')[1]
    } else if (arg === '--confirm') {
      result.confirm = true
    } else if (arg.startsWith('--source=')) {
      result.source = arg.split('=')[1]
    } else if (arg.startsWith('--from=')) {
      result.fromDate = arg.split('=')[1]
    } else if (arg.startsWith('--to=')) {
      result.toDate = arg.split('=')[1]
    }
  }

  return result
}

async function getToken() {
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  }

  const cca = new ConfidentialClientApplication(msalConfig)
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: [`${dataverseUrl}/.default`],
  })

  if (!tokenResponse?.accessToken) {
    throw new Error('Failed to acquire token')
  }

  accessToken = tokenResponse.accessToken
  return accessToken
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
      Prefer: 'return=representation',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Dataverse error ${response.status}: ${error}`)
  }

  if (response.status === 204) return null
  return response.json()
}

// Get company setting by NIP
async function getCompanySetting(nip: string) {
  const result = await dvFetch(`/dvlp_ksefsettings?$filter=dvlp_nip eq '${nip}'`)
  if (!result.value || result.value.length === 0) {
    throw new Error(`Company with NIP ${nip} not found in settings`)
  }
  const setting = result.value[0]
  
  // Map environment value
  const envMap: Record<number, string> = {
    100000000: 'production',
    100000001: 'test',
    100000002: 'demo',
  }
  
  return {
    nip: setting.dvlp_nip,
    companyName: setting.dvlp_companyname || setting.dvlp_name,
    environment: envMap[setting.dvlp_environment] || 'test',
  }
}

// Source value mapping
const SourceValues: Record<string, number> = {
  KSeF: 100000000,
  Manual: 100000001,
}

// Build filter for invoices
function buildFilter(nip: string, options: { source?: string; fromDate?: string; toDate?: string }): string {
  const filters: string[] = [`dvlp_sellernip eq '${nip}'`]
  
  if (options.source && options.source in SourceValues) {
    filters.push(`dvlp_source eq ${SourceValues[options.source]}`)
  }
  
  if (options.fromDate) {
    filters.push(`dvlp_invoicedate ge ${options.fromDate}`)
  }
  
  if (options.toDate) {
    filters.push(`dvlp_invoicedate le ${options.toDate}`)
  }
  
  return filters.join(' and ')
}

// Get invoices matching filter
async function getInvoices(filter: string) {
  const result = await dvFetch(`/dvlp_ksefinvoices?$filter=${filter}&$select=dvlp_ksefinvoiceid,dvlp_name,dvlp_invoicedate,dvlp_grossamount,dvlp_source`)
  return result.value || []
}

// Get invoice statistics
async function getStats(invoices: Array<{ dvlp_source: number; dvlp_grossamount: number; dvlp_invoicedate: string }>) {
  const sourceMap: Record<number, string> = {
    100000000: 'KSeF',
    100000001: 'Manual',
  }
  
  const bySource: Record<string, number> = {}
  const byMonth: Record<string, number> = {}
  let totalAmount = 0
  
  for (const inv of invoices) {
    const source = sourceMap[inv.dvlp_source] || 'Unknown'
    bySource[source] = (bySource[source] || 0) + 1
    
    const month = inv.dvlp_invoicedate?.substring(0, 7) || 'Unknown'
    byMonth[month] = (byMonth[month] || 0) + 1
    
    totalAmount += inv.dvlp_grossamount || 0
  }
  
  return { bySource, byMonth, totalAmount }
}

// Delete invoices
async function deleteInvoices(invoices: Array<{ dvlp_ksefinvoiceid: string }>) {
  let deleted = 0
  let failed = 0
  
  for (const inv of invoices) {
    try {
      await dvFetch(`/dvlp_ksefinvoices(${inv.dvlp_ksefinvoiceid})`, { method: 'DELETE' })
      deleted++
      if (deleted % 10 === 0) {
        process.stdout.write(`\r   Deleted ${deleted}/${invoices.length}`)
      }
    } catch (err) {
      failed++
      console.error(`\n   Failed to delete ${inv.dvlp_ksefinvoiceid}:`, err)
    }
  }
  
  return { deleted, failed }
}

async function main() {
  const options = parseArgs()
  
  console.log('\n🧹 Cleanup Test Data\n')
  console.log('='.repeat(60))
  
  if (!options.nip) {
    console.error('❌ Error: NIP is required. Set KSEF_NIP env var or use --nip=xxx')
    process.exit(1)
  }
  
  console.log(`📌 NIP: ${options.nip}`)
  console.log(`📌 Mode: ${options.confirm ? 'DELETE' : 'DRY-RUN'}`)
  if (options.source) console.log(`📌 Source filter: ${options.source}`)
  if (options.fromDate) console.log(`📌 From: ${options.fromDate}`)
  if (options.toDate) console.log(`📌 To: ${options.toDate}`)
  console.log()
  
  // Get token
  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')
  
  // Get company setting
  console.log('🏢 Getting company settings...')
  const company = await getCompanySetting(options.nip)
  console.log(`   ✅ Found: ${company.companyName}`)
  console.log(`   📌 Environment: ${company.environment}`)
  
  if (company.environment === 'production') {
    console.error('\n❌ Error: Cannot cleanup data in production environment!')
    process.exit(1)
  }
  console.log()
  
  // Build filter and get invoices
  const filter = buildFilter(options.nip, options)
  console.log('📋 Fetching matching invoices...')
  const invoices = await getInvoices(filter)
  
  if (invoices.length === 0) {
    console.log('   No invoices found matching criteria')
    console.log('\n' + '='.repeat(60))
    console.log('✅ Nothing to cleanup!\n')
    return
  }
  
  // Show statistics
  const stats = await getStats(invoices)
  console.log(`   Found ${invoices.length} invoices`)
  console.log(`   💰 Total gross: ${stats.totalAmount.toLocaleString('pl-PL')} PLN`)
  console.log('\n   By source:')
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`      ${source}: ${count}`)
  }
  console.log('\n   By month (last 6):')
  const sortedMonths = Object.entries(stats.byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)
  for (const [month, count] of sortedMonths) {
    console.log(`      ${month}: ${count}`)
  }
  console.log()
  
  if (!options.confirm) {
    console.log('⚠️  DRY-RUN mode: No invoices were deleted')
    console.log('   Use --confirm flag to actually delete invoices')
    console.log('\n' + '='.repeat(60))
    console.log('✅ Dry-run completed!\n')
    return
  }
  
  // Actually delete
  console.log('🗑️  Deleting invoices...')
  const result = await deleteInvoices(invoices)
  
  console.log(`\n   ✅ Deleted: ${result.deleted}`)
  if (result.failed > 0) {
    console.log(`   ❌ Failed: ${result.failed}`)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Cleanup completed!\n')
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
