/**
 * Test Dataverse Connection
 * 
 * Run with: npx ts-node --esm scripts/test-dataverse.ts
 * Or: pnpm tsx scripts/test-dataverse.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from root
config({ path: resolve(__dirname, '../../.env.local') })

import { ConfidentialClientApplication } from '@azure/msal-node'

async function testDataverseConnection() {
  console.log('\n🔍 Testing Dataverse Connection\n')
  console.log('='.repeat(50))

  // 1. Check environment variables
  console.log('\n📋 Checking environment variables...\n')
  
  const required = {
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET ? '***configured***' : undefined,
    DATAVERSE_URL: process.env.DATAVERSE_URL,
  }

  let allSet = true
  for (const [key, value] of Object.entries(required)) {
    const status = value ? '✅' : '❌'
    console.log(`  ${status} ${key}: ${value || 'NOT SET'}`)
    if (!value) allSet = false
  }

  if (!allSet) {
    console.error('\n❌ Missing required environment variables!')
    process.exit(1)
  }

  // 2. Get access token
  console.log('\n🔐 Acquiring access token...\n')

  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
    },
  }

  const cca = new ConfidentialClientApplication(msalConfig)
  const dataverseUrl = process.env.DATAVERSE_URL!.replace(/\/$/, '')

  try {
    const tokenResponse = await cca.acquireTokenByClientCredential({
      scopes: [`${dataverseUrl}/.default`],
    })

    if (!tokenResponse?.accessToken) {
      throw new Error('No access token received')
    }

    console.log('  ✅ Access token acquired successfully!')
    console.log(`  📅 Expires: ${tokenResponse.expiresOn?.toISOString()}`)

    // 3. Test Dataverse API call
    console.log('\n📡 Testing Dataverse API...\n')

    // Try to get WhoAmI (standard endpoint)
    const whoAmIResponse = await fetch(`${dataverseUrl}/api/data/v9.2/WhoAmI`, {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
      },
    })

    if (!whoAmIResponse.ok) {
      const error = await whoAmIResponse.text()
      throw new Error(`WhoAmI failed: ${whoAmIResponse.status} - ${error}`)
    }

    const whoAmI = await whoAmIResponse.json()
    console.log('  ✅ WhoAmI successful!')
    console.log(`  👤 User ID: ${whoAmI.UserId}`)
    console.log(`  🏢 Organization ID: ${whoAmI.OrganizationId}`)

    // 4. Check if our entities exist
    console.log('\n📊 Checking KSeF entities...\n')

    const entities = [
      { name: 'dvlp_ksefinvoices', label: 'KSeF Invoices' },
      { name: 'dvlp_ksefsettings', label: 'KSeF Settings' },
      { name: 'dvlp_ksefsessions', label: 'KSeF Sessions' },
      { name: 'dvlp_ksefsynclogs', label: 'KSeF Sync Log' },
    ]

    for (const entity of entities) {
      try {
        const response = await fetch(
          `${dataverseUrl}/api/data/v9.2/${entity.name}?$top=1`,
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.accessToken}`,
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              Accept: 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          console.log(`  ✅ ${entity.label} (${entity.name}) - exists, ${data.value?.length || 0} records returned`)
        } else if (response.status === 404) {
          console.log(`  ⚠️  ${entity.label} (${entity.name}) - NOT FOUND (need to create in Dataverse)`)
        } else {
          const errorText = await response.text()
          console.log(`  ❌ ${entity.label} (${entity.name}) - error ${response.status}: ${errorText.substring(0, 200)}`)
        }
      } catch (err) {
        console.log(`  ❌ ${entity.label} (${entity.name}) - error: ${err}`)
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(50))
    console.log('\n✅ Dataverse connection test completed!\n')

  } catch (error) {
    console.error('\n❌ Connection test failed:', error)
    process.exit(1)
  }
}

testDataverseConnection()
