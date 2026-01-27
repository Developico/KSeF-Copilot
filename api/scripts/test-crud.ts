/**
 * Test CRUD operations on Dataverse
 * 
 * Run with: pnpm tsx scripts/test-crud.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')

let accessToken: string

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

async function testSettingsCRUD() {
  console.log('\n🧪 Testing Settings CRUD Operations\n')
  console.log('='.repeat(60))

  await getToken()
  console.log('✅ Token acquired\n')

  // 1. CREATE - Utwórz testowy Setting
  console.log('1️⃣  CREATE: Creating test setting...')
  
  const testSetting = {
    dvlp_nip: '1234567890',
    dvlp_companyname: 'Test Company Sp. z o.o.',
    dvlp_environment: 100000001, // TEST
    dvlp_autosync: false,
    dvlp_syncinterval: 60,
    dvlp_isactive: true,
    dvlp_invoiceprefix: 'TEST-',
  }

  const created = await dvFetch('/dvlp_ksefsettings', {
    method: 'POST',
    body: JSON.stringify(testSetting),
  })

  const settingId = created.dvlp_ksefsettingid
  console.log(`   ✅ Created setting with ID: ${settingId}`)
  console.log(`   📋 Company: ${created.dvlp_companyname}`)
  console.log(`   📋 NIP: ${created.dvlp_nip}`)

  // 2. READ - Odczytaj Setting
  console.log('\n2️⃣  READ: Reading setting...')
  
  const read = await dvFetch(`/dvlp_ksefsettings(${settingId})`)
  console.log(`   ✅ Read setting: ${read.dvlp_companyname}`)
  console.log(`   📋 Environment: ${read.dvlp_environment}`)
  console.log(`   📋 Auto Sync: ${read.dvlp_autosync}`)
  console.log(`   📋 Created On: ${read.createdon}`)

  // 3. UPDATE - Zaktualizuj Setting
  console.log('\n3️⃣  UPDATE: Updating setting...')
  
  await dvFetch(`/dvlp_ksefsettings(${settingId})`, {
    method: 'PATCH',
    body: JSON.stringify({
      dvlp_companyname: 'Test Company Updated Sp. z o.o.',
      dvlp_autosync: true,
      dvlp_syncinterval: 30,
    }),
  })

  const updated = await dvFetch(`/dvlp_ksefsettings(${settingId})`)
  console.log(`   ✅ Updated setting: ${updated.dvlp_companyname}`)
  console.log(`   📋 Auto Sync: ${updated.dvlp_autosync}`)
  console.log(`   📋 Sync Interval: ${updated.dvlp_syncinterval} min`)

  // 4. LIST - Lista wszystkich Settings
  console.log('\n4️⃣  LIST: Listing all settings...')
  
  const list = await dvFetch('/dvlp_ksefsettings?$orderby=createdon desc')
  console.log(`   ✅ Found ${list.value.length} setting(s)`)
  for (const s of list.value) {
    console.log(`   📋 ${s.dvlp_nip} - ${s.dvlp_companyname} (${s.dvlp_isactive ? 'active' : 'inactive'})`)
  }

  // 5. DELETE - Usuń testowy Setting (opcjonalne)
  console.log('\n5️⃣  DELETE: Deleting test setting...')
  
  await dvFetch(`/dvlp_ksefsettings(${settingId})`, {
    method: 'DELETE',
  })
  console.log(`   ✅ Deleted setting: ${settingId}`)

  // Verify deletion
  const afterDelete = await dvFetch('/dvlp_ksefsettings')
  console.log(`   📋 Remaining settings: ${afterDelete.value.length}`)

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ All CRUD operations completed successfully!\n')
}

async function testInvoiceCRUD() {
  console.log('\n🧪 Testing Invoice CRUD Operations\n')
  console.log('='.repeat(60))

  await getToken()

  // 1. CREATE - Utwórz testową fakturę
  console.log('1️⃣  CREATE: Creating test invoice...')
  
  const testInvoice = {
    dvlp_name: 'FV/2026/01/001',
    dvlp_invoicedate: '2026-01-15',
    dvlp_duedate: '2026-02-15',
    dvlp_sellernip: '9876543210',
    dvlp_sellername: 'Dostawca Testowy Sp. z o.o.',
    dvlp_buyernip: '1234567890',
    dvlp_buyername: 'Nabywca Testowy Sp. z o.o.',
    dvlp_netamount: 1000.00,
    dvlp_vatamount: 230.00,
    dvlp_grossamount: 1230.00,
    dvlp_currency: 100000001, // PLN
    dvlp_paymentstatus: 100000001, // PENDING
    dvlp_direction: 100000001, // INCOMING
    dvlp_invoicestatus: 'Zaakceptowana',
    dvlp_ksefreferencenumber: 'TEST-KSEF-REF-001',
    dvlp_description: 'Testowa faktura za usługi IT',
  }

  const created = await dvFetch('/dvlp_ksefinvoices', {
    method: 'POST',
    body: JSON.stringify(testInvoice),
  })

  const invoiceId = created.dvlp_ksefinvoiceid
  console.log(`   ✅ Created invoice with ID: ${invoiceId}`)
  console.log(`   📋 Number: ${created.dvlp_name}`)
  console.log(`   📋 Supplier: ${created.dvlp_sellername}`)
  console.log(`   📋 Amount: ${created.dvlp_grossamount} PLN`)

  // 2. READ
  console.log('\n2️⃣  READ: Reading invoice...')
  const read = await dvFetch(`/dvlp_ksefinvoices(${invoiceId})`)
  console.log(`   ✅ Read invoice: ${read.dvlp_name}`)

  // 3. UPDATE - Mark as paid
  console.log('\n3️⃣  UPDATE: Marking as paid...')
  
  await dvFetch(`/dvlp_ksefinvoices(${invoiceId})`, {
    method: 'PATCH',
    body: JSON.stringify({
      dvlp_paymentstatus: 100000002, // PAID
      dvlp_paidat: new Date().toISOString(),
    }),
  })

  const updated = await dvFetch(`/dvlp_ksefinvoices(${invoiceId})`)
  console.log(`   ✅ Updated payment status: ${updated.dvlp_paymentstatus === 100000002 ? 'PAID' : 'PENDING'}`)

  // 4. LIST
  console.log('\n4️⃣  LIST: Listing all invoices...')
  const list = await dvFetch('/dvlp_ksefinvoices?$orderby=createdon desc&$top=5')
  console.log(`   ✅ Found ${list.value.length} invoice(s)`)
  for (const inv of list.value) {
    console.log(`   📋 ${inv.dvlp_name} - ${inv.dvlp_sellername} - ${inv.dvlp_grossamount} PLN`)
  }

  // 5. Keep or delete?
  const keepData = process.argv.includes('--keep')
  
  if (keepData) {
    console.log('\n5️⃣  KEEP: Keeping test data (--keep flag used)')
    console.log(`   📋 Invoice ID: ${invoiceId}`)
  } else {
    console.log('\n5️⃣  DELETE: Deleting test invoice...')
    await dvFetch(`/dvlp_ksefinvoices(${invoiceId})`, { method: 'DELETE' })
    console.log(`   ✅ Deleted invoice: ${invoiceId}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Invoice CRUD operations completed!\n')
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--invoice') || args.includes('-i')) {
    await testInvoiceCRUD()
  } else if (args.includes('--setting') || args.includes('-s')) {
    await testSettingsCRUD()
  } else {
    // Run both
    await testSettingsCRUD()
    await testInvoiceCRUD()
  }
}

main().catch(console.error)
