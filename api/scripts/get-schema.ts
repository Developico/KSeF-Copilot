/**
 * Get entity schema from Dataverse
 * 
 * Run with: pnpm tsx scripts/get-schema.ts <entity_name>
 * Example: pnpm tsx scripts/get-schema.ts dvlp_ksefinvoice
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

async function getEntitySchema(entityName: string) {
  console.log(`\n📋 Getting schema for: ${entityName}\n`)
  console.log('='.repeat(80))

  const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')

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

  const response = await fetch(
    `${dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes?$select=LogicalName,AttributeType,DisplayName,RequiredLevel`,
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
    console.error('Failed:', await response.text())
    return
  }

  const data = await response.json()

  // Filter only custom attributes (dvlp_)
  const customAttrs = data.value.filter((a: { LogicalName: string }) => 
    a.LogicalName.startsWith('dvlp_')
  )

  console.log('\n📋 Custom Attributes (dvlp_*):\n')
  console.log('| LogicalName'.padEnd(40) + '| Type'.padEnd(20) + '| Required')
  console.log('-'.repeat(80))

  for (const attr of customAttrs.sort((a: { LogicalName: string }, b: { LogicalName: string }) => 
    a.LogicalName.localeCompare(b.LogicalName)
  )) {
    const required = attr.RequiredLevel?.Value === 'ApplicationRequired' ? 'Yes' : 'No'
    console.log(`| ${attr.LogicalName.padEnd(38)}| ${(attr.AttributeType || '').padEnd(18)}| ${required}`)
  }

  console.log('-'.repeat(80))
  console.log(`\nTotal: ${customAttrs.length} custom attributes`)

  // Also show standard attributes that might be useful
  const standardAttrs = ['statecode', 'statuscode', 'createdon', 'modifiedon', 'createdby', 'modifiedby']
  console.log('\n📋 Standard Attributes:\n')
  for (const attr of data.value.filter((a: { LogicalName: string }) => 
    standardAttrs.includes(a.LogicalName)
  )) {
    console.log(`| ${attr.LogicalName.padEnd(38)}| ${(attr.AttributeType || '').padEnd(18)}`)
  }
}

const entityName = process.argv[2] || 'dvlp_ksefinvoice'
getEntitySchema(entityName).catch(console.error)
