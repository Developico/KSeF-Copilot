/**
 * List available Dataverse entities with dvlp_ prefix
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

async function listEntities() {
  console.log('\n📋 Listing Dataverse entities with dvlp_ prefix...\n')

  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  }

  const cca = new ConfidentialClientApplication(msalConfig)
  const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')

  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: [`${dataverseUrl}/.default`],
  })

  // Get entity definitions
  const response = await fetch(
    `${dataverseUrl}/api/data/v9.2/EntityDefinitions?$select=LogicalName,EntitySetName,DisplayName`,
    {
      headers: {
        Authorization: `Bearer ${tokenResponse!.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    console.error('Failed to get entities:', await response.text())
    return
  }

  const data = await response.json()
  
  // Filter locally for dvlp_ prefix
  const dvlpEntities = data.value.filter((e: { LogicalName: string }) => 
    e.LogicalName.startsWith('dvlp_')
  )
  
  console.log('Found entities:')
  console.log('='.repeat(80))
  console.log('| LogicalName'.padEnd(35) + '| EntitySetName'.padEnd(35) + '| Display Name')
  console.log('='.repeat(80))
  
  for (const entity of dvlpEntities) {
    const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || ''
    console.log(`| ${entity.LogicalName.padEnd(33)}| ${(entity.EntitySetName || '').padEnd(33)}| ${displayName}`)
  }
  
  console.log('='.repeat(80))
  console.log(`\nTotal: ${dvlpEntities.length} entities with dvlp_ prefix`)
}

listEntities().catch(console.error)
