import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

async function getSchema() {
  const { dataverseRequest } = await import('../src/lib/dataverse/client')
  
  // Get ALL invoice entity fields
  try {
    const allAttrs = await dataverseRequest<{ value: Array<{ LogicalName: string; AttributeType: string }> }>(
      "EntityDefinitions(LogicalName='dvlp_ksefinvoice')/Attributes?$select=LogicalName,AttributeType"
    )
    
    // Filter to custom fields only (dvlp_)
    const customFields = allAttrs.value
      .filter(attr => attr.LogicalName.startsWith('dvlp_'))
      .sort((a, b) => a.LogicalName.localeCompare(b.LogicalName))
    
    console.log('Custom fields on Invoice entity (dvlp_*):')
    customFields.forEach(attr => {
      console.log(`  ${attr.LogicalName} (${attr.AttributeType})`)
    })
  } catch (error) {
    console.error('Error:', error)
  }
}

getSchema()
