import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

async function testInvoiceCreate() {
  const { dataverseRequest } = await import('../src/lib/dataverse/client')
  
  const settingId = 'YOUR_SETTING_ID' // Developico Demo
  
  console.log('Testing invoice creation with settingId binding...')
  console.log('SettingId:', settingId)
  
  // Create a test invoice with settingId binding - using correct field names from Dataverse
  const testInvoice = {
    dvlp_buyernip: '5272926470',          // tenantNip (my company = buyer)
    dvlp_buyername: 'Developico Test',    // tenantName
    dvlp_sellernip: '1234567890',         // supplierNip (supplier = seller)
    dvlp_sellername: 'Test Supplier',     // supplierName
    dvlp_ksefreferencenumber: `TEST-BINDING-${Date.now()}`,
    dvlp_name: 'TEST/001',                // invoiceNumber (primary name)
    dvlp_invoicenumber: 'TEST/001',       // invoiceNumber field
    dvlp_invoicedate: new Date().toISOString().split('T')[0],
    dvlp_duedate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    dvlp_netamount: 100,
    dvlp_vatamount: 23,
    dvlp_grossamount: 123,
    dvlp_paymentstatus: 100000000, // pending
    dvlp_source: 100000001, // Manual
    'dvlp_settingid@odata.bind': `/dvlp_ksefsettings(${settingId})`,
  }
  
  console.log('\nPayload being sent:')
  console.log(JSON.stringify(testInvoice, null, 2))
  
  try {
    const result = await dataverseRequest<{ dvlp_ksefinvoiceid: string; _dvlp_settingid_value: string }>('dvlp_ksefinvoices', {
      method: 'POST',
      body: testInvoice,
    })
    
    console.log('\n✅ Invoice created successfully!')
    console.log('Invoice ID:', result.dvlp_ksefinvoiceid)
    console.log('SettingId value:', result._dvlp_settingid_value)
    
    // Verify by reading it back
    const verify = await dataverseRequest<{ _dvlp_settingid_value: string }>(
      `dvlp_ksefinvoices(${result.dvlp_ksefinvoiceid})?$select=_dvlp_settingid_value`
    )
    console.log('\nVerification - _dvlp_settingid_value:', verify._dvlp_settingid_value)
    
    if (verify._dvlp_settingid_value === settingId) {
      console.log('✅ SettingId binding WORKS!')
    } else {
      console.log('❌ SettingId binding FAILED - value is', verify._dvlp_settingid_value)
    }
    
    // Cleanup - delete the test invoice
    await dataverseRequest(`dvlp_ksefinvoices(${result.dvlp_ksefinvoiceid})`, {
      method: 'DELETE',
    })
    console.log('\n🧹 Test invoice deleted')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

testInvoiceCreate()
