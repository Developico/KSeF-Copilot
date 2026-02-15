import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env.local') })

async function getSchema() {
  const { dataverseRequest } = await import('../src/lib/dataverse/client')
  
  // Get session entity fields by fetching one record
  try {
    const result = await dataverseRequest<{ value: Record<string, unknown>[] }>('dvlp_ksefsessions?$top=1')
    
    if (result.value.length > 0) {
      console.log('Session entity fields:')
      const fields = Object.keys(result.value[0]).sort()
      fields.forEach(f => console.log(' ', f))
    } else {
      console.log('No session records found. Trying entity definition...')
      // Try to get entity definition
      const def = await dataverseRequest<{ value: unknown[] }>('EntityDefinitions(LogicalName=\'dvlp_ksefsession\')/Attributes?$select=LogicalName,AttributeType')
      console.log('Entity attributes:')
      console.log(JSON.stringify(def.value.slice(0, 30), null, 2))
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

getSchema()
