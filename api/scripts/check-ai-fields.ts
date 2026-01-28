/**
 * Check AI Fields in Dataverse
 * 
 * Verifies that AI categorization fields exist in dvlp_ksefinvoice table.
 */

import { DefaultAzureCredential } from '@azure/identity'

const DATAVERSE_URL = process.env.DATAVERSE_URL || 'https://developico-tt.api.crm4.dynamics.com'

async function checkAIFields() {
  console.log('Checking AI fields in Dataverse...')
  console.log('Dataverse URL:', DATAVERSE_URL)
  console.log('')

  try {
    const credential = new DefaultAzureCredential()
    const scope = DATAVERSE_URL.replace('/api/data/v9.2', '').replace(/\/$/, '') + '/.default'
    const token = await credential.getToken(scope)

    // Query for all fields (filter client-side since startswith not supported)
    const metadataUrl = `${DATAVERSE_URL.replace(/\/$/, '')}/api/data/v9.2/EntityDefinitions(LogicalName='dvlp_ksefinvoice')/Attributes?$select=LogicalName,DisplayName,AttributeType,AttributeTypeName`

    const response = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error querying Dataverse metadata:', response.status)
      console.error(errorText)
      return
    }

    const data = await response.json()
    // Filter for AI fields client-side
    const allFields = data.value || []
    const fields = allFields.filter((f: { LogicalName: string }) => f.LogicalName.startsWith('dvlp_ai'))

    console.log('========================================')
    console.log('  AI Fields in dvlp_ksefinvoice')
    console.log('========================================')

    if (fields.length === 0) {
      console.log('❌ No AI fields found!')
      console.log('')
      console.log('Expected fields:')
      console.log('  - dvlp_aimpksuggestion')
      console.log('  - dvlp_aicategorysuggestion')
      console.log('  - dvlp_aidescription')
      console.log('  - dvlp_aiconfidence')
      console.log('  - dvlp_aiprocessedat')
      return
    }

    // Expected fields
    const expectedFields = [
      'dvlp_aimpksuggestion',
      'dvlp_aicategorysuggestion', 
      'dvlp_aidescription',
      'dvlp_aiconfidence',
      'dvlp_aiprocessedat',
    ]

    const foundFields = new Set(fields.map((f: { LogicalName: string }) => f.LogicalName))

    fields.forEach((attr: { LogicalName: string; AttributeTypeName?: { Value: string }; DisplayName?: { UserLocalizedLabel?: { Label: string } } }) => {
      const displayName = attr.DisplayName?.UserLocalizedLabel?.Label || '(no label)'
      const typeName = attr.AttributeTypeName?.Value || 'Unknown'
      console.log(`✅ ${attr.LogicalName}`)
      console.log(`   Type: ${typeName}`)
      console.log(`   Display: ${displayName}`)
      console.log('')
    })

    console.log('========================================')
    console.log(`Found: ${fields.length} / ${expectedFields.length} expected fields`)
    console.log('')

    // Check for missing fields
    const missingFields = expectedFields.filter(f => !foundFields.has(f))
    if (missingFields.length > 0) {
      console.log('⚠️  Missing fields:')
      missingFields.forEach(f => console.log(`   - ${f}`))
    } else {
      console.log('🎉 All AI fields are present!')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkAIFields()
