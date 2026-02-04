/**
 * Check settings for a NIP
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')
const nip = process.argv[2] || '5272926470'

async function main() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  })

  const token = await cca.acquireTokenByClientCredential({ scopes: [`${dataverseUrl}/.default`] })
  if (!token?.accessToken) throw new Error('Failed to get token')

  const res = await fetch(
    `${dataverseUrl}/api/data/v9.2/dvlp_ksefsettings?$filter=dvlp_nip eq '${nip}'`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: 'application/json',
      },
    }
  )

  const data = await res.json()
  
  const envMap: Record<number, string> = {
    100000000: 'production',
    100000001: 'test',
    100000002: 'demo',
  }
  
  console.log(`\nSettings for NIP: ${nip}\n`)
  console.log('='.repeat(60))
  
  for (const s of data.value || []) {
    console.log(`ID:          ${s.dvlp_ksefsettingid}`)
    console.log(`Name:        ${s.dvlp_companyname || s.dvlp_name}`)
    console.log(`Environment: ${envMap[s.dvlp_environment] || s.dvlp_environment}`)
    console.log(`NIP:         ${s.dvlp_nip}`)
    console.log('-'.repeat(60))
  }
  
  console.log(`\nTotal: ${data.value?.length || 0} settings found`)
}

main().catch(console.error)
