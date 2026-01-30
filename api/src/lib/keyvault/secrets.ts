import { SecretClient } from '@azure/keyvault-secrets'
import { DefaultAzureCredential, AzureCliCredential, ChainedTokenCredential } from '@azure/identity'

let secretClient: SecretClient | null = null

/**
 * Get or create Key Vault SecretClient
 * Uses Azure CLI credentials first (for local dev), then DefaultAzureCredential
 */
function getSecretClient(): SecretClient {
  if (!secretClient) {
    const vaultUrl = process.env.AZURE_KEYVAULT_URL

    if (!vaultUrl) {
      throw new Error('AZURE_KEYVAULT_URL environment variable is required')
    }

    // For local development: prefer Azure CLI credentials over environment variables
    // This allows using personal account which has Key Vault access
    const credential = new ChainedTokenCredential(
      new AzureCliCredential(),
      new DefaultAzureCredential()
    )
    secretClient = new SecretClient(vaultUrl, credential)
  }

  return secretClient
}

/**
 * Get secret value from Key Vault
 */
export async function getSecret(name: string): Promise<string | undefined> {
  const client = getSecretClient()

  try {
    const secret = await client.getSecret(name)
    return secret.value
  } catch (error) {
    if (error instanceof Error && error.message.includes('SecretNotFound')) {
      return undefined
    }
    throw error
  }
}

/**
 * Set secret value in Key Vault
 */
export async function setSecret(name: string, value: string): Promise<void> {
  const client = getSecretClient()
  await client.setSecret(name, value)
}

/**
 * Delete secret from Key Vault
 */
export async function deleteSecret(name: string): Promise<void> {
  const client = getSecretClient()
  const poller = await client.beginDeleteSecret(name)
  await poller.pollUntilDone()
}

/**
 * List all secret names (not values)
 */
export async function listSecretNames(): Promise<string[]> {
  const client = getSecretClient()
  const names: string[] = []

  for await (const secretProperties of client.listPropertiesOfSecrets()) {
    names.push(secretProperties.name)
  }

  return names
}
