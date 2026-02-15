import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

async function check() {
  const { dataverseRequest } = await import('../src/lib/dataverse/client')
  
  const nip = '0000000000'
  
  console.log('Checking invoices for NIP:', nip)
  
  const result = await dataverseRequest<{ value: Array<{
    dvlp_ksefreferencenumber: string
    _dvlp_settingid_value: string | null
    dvlp_source: number
  }> }>(`dvlp_ksefinvoices?$filter=dvlp_sellernip eq '${nip}'&$select=dvlp_ksefreferencenumber,_dvlp_settingid_value,dvlp_source&$top=30`)
  
  console.log('\nInvoices found:', result.value.length)
  
  const withSetting = result.value.filter(i => i._dvlp_settingid_value)
  const withoutSetting = result.value.filter(i => !i._dvlp_settingid_value)
  
  console.log('With settingId:', withSetting.length)
  console.log('Without settingId:', withoutSetting.length)
  
  console.log('\nSample invoices:')
  result.value.forEach((inv, i) => {
    const source = inv.dvlp_source === 330240001 ? 'Manual' : inv.dvlp_source === 330240000 ? 'KSeF' : `Unknown(${inv.dvlp_source})`
    console.log(`  ${i+1}. ${inv.dvlp_ksefreferencenumber?.substring(0,20) || 'N/A'}... | settingId: ${inv._dvlp_settingid_value || 'NULL'} | source: ${source}`)
  })
}

check().catch(console.error)
