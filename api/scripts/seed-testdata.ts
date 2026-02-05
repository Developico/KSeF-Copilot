/**
 * Seed test data into Dataverse
 * 
 * Usage:
 *   pnpm seed:testdata                          # Generate 10 invoices for default NIP
 *   pnpm seed:testdata --nip=1234567890         # Generate for specific NIP
 *   pnpm seed:testdata --env=demo               # Generate for specific environment (demo, test, prod)
 *   pnpm seed:testdata --count=50               # Generate 50 invoices
 *   pnpm seed:testdata --from=2025-01-01        # Start date for invoices
 *   pnpm seed:testdata --to=2026-01-31          # End date for invoices
 *   pnpm seed:testdata --paid=50                # 50% of invoices marked as paid
 *   pnpm seed:testdata --source=KSeF            # Mark as imported from KSeF
 *   pnpm seed:testdata --cleanup                # Clean existing before generating
 * 
 * Run with: pnpm tsx scripts/seed-testdata.ts [options]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'
import { generateInvoices, calculateSummary, type GenerateInvoicesOptions } from '../src/lib/testdata'
import { InvoiceSource, PaymentStatus } from '../src/types/invoice'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const defaultNip = process.env.KSEF_NIP || ''

let accessToken: string

// Parse command line arguments
function parseArgs(): {
  nip: string
  settingName?: string
  environment?: 'demo' | 'test' | 'production'
  count: number
  fromDate?: Date
  toDate?: Date
  paidPercentage: number
  source: 'KSeF' | 'Manual'
  cleanup: boolean
} {
  const args = process.argv.slice(2)
  const result = {
    nip: defaultNip,
    settingName: undefined as string | undefined,
    environment: undefined as 'demo' | 'test' | 'production' | undefined,
    count: 10,
    fromDate: undefined as Date | undefined,
    toDate: undefined as Date | undefined,
    paidPercentage: 30,
    source: 'Manual' as 'KSeF' | 'Manual',
    cleanup: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--nip=')) {
      result.nip = arg.split('=')[1]
    } else if (arg.startsWith('--name=')) {
      result.settingName = arg.split('=')[1]
    } else if (arg.startsWith('--count=')) {
      result.count = Math.min(Math.max(parseInt(arg.split('=')[1]) || 10, 1), 100)
    } else if (arg.startsWith('--from=')) {
      result.fromDate = new Date(arg.split('=')[1])
    } else if (arg.startsWith('--to=')) {
      result.toDate = new Date(arg.split('=')[1])
    } else if (arg.startsWith('--paid=')) {
      result.paidPercentage = Math.min(Math.max(parseInt(arg.split('=')[1]) || 30, 0), 100)
    } else if (arg.startsWith('--source=')) {
      const src = arg.split('=')[1]
      result.source = src === 'KSeF' ? 'KSeF' : 'Manual'
    } else if (arg.startsWith('--env=')) {
      const env = arg.split('=')[1].toLowerCase()
      if (env === 'demo' || env === 'test' || env === 'production' || env === 'prod') {
        result.environment = env === 'prod' ? 'production' : env as 'demo' | 'test' | 'production'
      }
    } else if (arg === '--cleanup') {
      result.cleanup = true
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

// Get company setting by NIP and optional name/environment filter
async function getCompanySetting(nip: string, settingName?: string, targetEnv?: 'demo' | 'test' | 'production') {
  const result = await dvFetch(`/dvlp_ksefsettings?$filter=dvlp_nip eq '${nip}'`)
  if (!result.value || result.value.length === 0) {
    throw new Error(`Company with NIP ${nip} not found in settings`)
  }
  
  // Map environment value
  const envMap: Record<number, string> = {
    100000000: 'production',
    100000001: 'test',
    100000002: 'demo',
  }
  
  const reverseEnvMap: Record<string, number> = {
    'production': 100000000,
    'test': 100000001,
    'demo': 100000002,
  }
  
  // If environment is specified, filter by environment first
  let setting = result.value[0]
  if (targetEnv) {
    const envValue = reverseEnvMap[targetEnv]
    const envMatching = result.value.find((s: Record<string, unknown>) => s.dvlp_environment === envValue)
    if (envMatching) {
      setting = envMatching
    } else {
      console.log(`\n⚠️  No setting found for environment '${targetEnv}'. Available settings:`)
      for (const s of result.value) {
        console.log(`   - "${s.dvlp_companyname || s.dvlp_name}" (${envMap[s.dvlp_environment as number] || 'unknown'})`)
      }
      throw new Error(`Setting for environment '${targetEnv}' not found for NIP ${nip}`)
    }
  } else if (settingName && result.value.length > 1) {
    const searchName = settingName.toLowerCase().trim()
    
    // First try exact match
    let matching = result.value.find((s: Record<string, unknown>) => {
      const name = ((s.dvlp_companyname || s.dvlp_name) as string || '').toLowerCase().trim()
      return name === searchName
    })
    
    // If no exact match, try partial match (search term in name)
    if (!matching) {
      matching = result.value.find((s: Record<string, unknown>) => {
        const name = ((s.dvlp_companyname || s.dvlp_name) as string || '').toLowerCase().trim()
        return name.includes(searchName)
      })
    }
    
    if (matching) {
      setting = matching
    } else {
      // List available settings for user
      console.log('\n⚠️  Available settings for this NIP:')
      for (const s of result.value) {
        console.log(`   - "${s.dvlp_companyname || s.dvlp_name}" (${envMap[s.dvlp_environment as number] || 'unknown'})`)
      }
      throw new Error(`Setting "${settingName}" not found for NIP ${nip}`)
    }
  }
  
  return {
    id: setting.dvlp_ksefsettingid,
    nip: setting.dvlp_nip,
    companyName: setting.dvlp_companyname || setting.dvlp_name,
    environment: envMap[setting.dvlp_environment] || 'unknown',
  }
}

// Count invoices for NIP
async function countInvoices(nip: string) {
  // Use $select with minimal fields and count the array length
  // Dataverse $count with $filter can be tricky
  const result = await dvFetch(`/dvlp_ksefinvoices?$filter=dvlp_sellernip eq '${nip}'&$select=dvlp_ksefinvoiceid`)
  return result?.value?.length || 0
}

// Count invoices for a specific setting
async function countInvoicesForSetting(settingId: string, nip: string) {
  const result = await dvFetch(`/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${settingId}&$select=dvlp_ksefinvoiceid`)
  return result?.value?.length || 0
}

// Delete all invoices for a specific setting
async function deleteAllInvoicesForSetting(settingId: string, nip: string) {
  console.log('📋 Fetching existing invoices for this setting...')
  
  const result = await dvFetch(`/dvlp_ksefinvoices?$filter=_dvlp_settingid_value eq ${settingId}&$select=dvlp_ksefinvoiceid`)
  const invoices = result.value || []
  
  if (invoices.length === 0) {
    console.log('   No invoices to delete')
    return 0
  }
  
  console.log(`   Found ${invoices.length} invoices to delete`)
  
  let deleted = 0
  for (const inv of invoices) {
    try {
      await dvFetch(`/dvlp_ksefinvoices(${inv.dvlp_ksefinvoiceid})`, { method: 'DELETE' })
      deleted++
      if (deleted % 10 === 0) {
        process.stdout.write(`\r   Deleted ${deleted}/${invoices.length}`)
      }
    } catch (err) {
      console.error(`\n   Failed to delete ${inv.dvlp_ksefinvoiceid}:`, err)
    }
  }
  
  console.log(`\n   ✅ Deleted ${deleted} invoices`)
  return deleted
}

// Create invoice in Dataverse
async function createInvoice(data: Record<string, unknown>) {
  return dvFetch('/dvlp_ksefinvoices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Update invoice payment status
async function markAsPaid(id: string, paymentDate: string) {
  return dvFetch(`/dvlp_ksefinvoices(${id})`, {
    method: 'PATCH',
    body: JSON.stringify({
      dvlp_paymentstatus: 100000001, // paid
      dvlp_paidat: paymentDate,
    }),
  })
}

// MPK value mapping
const MpkValues: Record<string, number> = {
  Consultants: 100000000,
  BackOffice: 100000001,
  Management: 100000002,
  Cars: 100000003,
  Marketing: 100000005,
  Sales: 100000006,
  Delivery: 100000007,
  Finance: 100000008,
  Other: 100000009,
  Legal: 100000100,
}

// Source value mapping
const SourceValues = {
  KSeF: 100000000,
  Manual: 100000001,
}

async function main() {
  const options = parseArgs()
  
  console.log('\n🌱 Seed Test Data\n')
  console.log('='.repeat(60))
  
  if (!options.nip) {
    console.error('❌ Error: NIP is required. Set KSEF_NIP env var or use --nip=xxx')
    process.exit(1)
  }
  
  console.log(`📌 NIP: ${options.nip}`)
  if (options.environment) console.log(`📌 Target Environment: ${options.environment}`)
  if (options.settingName) console.log(`📌 Target Setting: ${options.settingName}`)
  console.log(`📌 Count: ${options.count}`)
  console.log(`📌 Source: ${options.source}`)
  console.log(`📌 Paid %: ${options.paidPercentage}%`)
  if (options.fromDate) console.log(`📌 From: ${options.fromDate.toISOString().split('T')[0]}`)
  if (options.toDate) console.log(`📌 To: ${options.toDate.toISOString().split('T')[0]}`)
  console.log(`📌 Cleanup: ${options.cleanup ? 'Yes' : 'No'}`)
  console.log()
  
  // Get token
  console.log('🔐 Authenticating...')
  await getToken()
  console.log('   ✅ Token acquired\n')
  
  // Get company setting (with preferred environment or name if specified)
  console.log('🏢 Getting company settings...')
  const company = await getCompanySetting(options.nip, options.settingName, options.environment)
  console.log(`   ✅ Found: ${company.companyName}`)
  console.log(`   📌 Setting ID: ${company.id}`)
  console.log(`   📌 Environment: ${company.environment}`)
  
  if (company.environment === 'production') {
    console.error('\n❌ Error: Cannot seed data in production environment!')
    process.exit(1)
  }
  console.log()
  
  // Cleanup if requested
  if (options.cleanup) {
    console.log('🧹 Cleanup existing invoices...')
    await deleteAllInvoicesForSetting(company.id, options.nip)
    console.log()
  }
  
  // Generate invoices
  console.log('⚙️  Generating invoices...')
  
  const generatorOptions: GenerateInvoicesOptions = {
    tenantNip: options.nip,
    tenantName: company.companyName,
    count: options.count,
    fromDate: options.fromDate,
    toDate: options.toDate,
    paidPercentage: options.paidPercentage,
    source: options.source === 'KSeF' ? InvoiceSource.KSeF : InvoiceSource.Manual,
  }
  
  const generatedInvoices = generateInvoices(generatorOptions)
  const summary = calculateSummary(generatedInvoices)
  
  console.log(`   ✅ Generated ${generatedInvoices.length} invoices`)
  console.log(`   💰 Total net: ${summary.totalNetAmount.toLocaleString('pl-PL')} PLN`)
  console.log(`   💰 Total gross: ${summary.totalGrossAmount.toLocaleString('pl-PL')} PLN`)
  console.log()
  
  // Create invoices in Dataverse
  console.log('📤 Creating invoices in Dataverse...')
  
  let created = 0
  let paid = 0
  let failed = 0
  
  for (const invoice of generatedInvoices) {
    try {
      const { shouldBePaid, suggestedPaymentDate, ...data } = invoice
      
      // Map to Dataverse format
      const dvData: Record<string, unknown> = {
        'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${company.id})`,
        dvlp_buyernip: data.tenantNip,
        dvlp_buyername: data.tenantName,
        dvlp_buyeraddress: data.buyerAddress,
        dvlp_buyercountry: data.buyerCountry,
        dvlp_ksefreferencenumber: data.referenceNumber,
        dvlp_name: data.invoiceNumber,
        dvlp_invoicenumber: data.invoiceNumber,
        dvlp_sellernip: data.supplierNip,
        dvlp_sellername: data.supplierName,
        dvlp_selleraddress: data.supplierAddress,
        dvlp_sellercountry: data.supplierCountry,
        dvlp_invoicedate: data.invoiceDate,
        dvlp_duedate: data.dueDate,
        dvlp_netamount: data.netAmount,
        dvlp_vatamount: data.vatAmount,
        dvlp_grossamount: data.grossAmount,
        dvlp_paymentstatus: 100000000, // pending
        dvlp_downloadedat: new Date().toISOString(),
        dvlp_source: SourceValues[data.source || 'Manual'],
        dvlp_description: data.description,
        dvlp_category: data.category,
      }
      
      if (data.mpk && data.mpk in MpkValues) {
        dvData.dvlp_costcenter = MpkValues[data.mpk]
      }
      
      const createdInvoice = await createInvoice(dvData)
      created++
      
      // Mark as paid if applicable
      if (shouldBePaid && suggestedPaymentDate) {
        try {
          await markAsPaid(createdInvoice.dvlp_ksefinvoiceid, suggestedPaymentDate)
          paid++
        } catch {
          // Invoice created but not marked as paid
        }
      }
      
      if (created % 5 === 0) {
        process.stdout.write(`\r   Progress: ${created}/${generatedInvoices.length}`)
      }
    } catch (err) {
      failed++
      console.error(`\n   Failed to create invoice:`, err instanceof Error ? err.message : err)
    }
  }
  
  console.log(`\n   ✅ Created ${created} invoices`)
  console.log(`   💳 Marked ${paid} as paid`)
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`)
  }
  
  // Final count
  console.log('\n📊 Final statistics:')
  const totalCount = await countInvoicesForSetting(company.id, options.nip)
  console.log(`   Total invoices for ${company.companyName} (${company.environment}): ${totalCount}`)
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Seed completed!\n')
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
