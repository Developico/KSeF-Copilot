/**
 * Check if address and AI fields are saved in Dataverse
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')

async function main() {
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

  const url = `${dataverseUrl}/api/data/v9.2/dvlp_ksefinvoices?$top=3&$select=dvlp_name,dvlp_sellername,dvlp_selleraddress,dvlp_aimpksuggestion,dvlp_aicategorysuggestion,dvlp_aidescription,dvlp_costcenter,dvlp_category,dvlp_description&$orderby=createdon desc`
  
  console.log('Fetching invoices from Dataverse...')
  
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
    }
  })
  
  if (!resp.ok) {
    console.error('Error:', resp.status, await resp.text())
    return
  }
  
  const data = await resp.json()
  
  console.log('\nLatest 3 invoices with AI fields:')
  for (const inv of data.value) {
    console.log('---')
    console.log('Invoice:', inv.dvlp_name)
    console.log('Seller:', inv.dvlp_sellername)
    console.log('Address:', inv.dvlp_selleraddress || '(empty)')
    console.log('MPK (current):', inv.dvlp_costcenter)
    console.log('Category (current):', inv.dvlp_category || '(empty)')
    console.log('Description (current):', inv.dvlp_description || '(empty)')
    console.log('AI MPK Suggestion:', inv.dvlp_aimpksuggestion || '(empty)')
    console.log('AI Category Suggestion:', inv.dvlp_aicategorysuggestion || '(empty)')
    console.log('AI Description:', inv.dvlp_aidescription || '(empty)')
  }
}

main().catch(console.error)
