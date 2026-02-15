/**
 * Tenant (company) entity for multi-tenant support
 * Extended feature - not used in MVP
 */
export interface Tenant {
  id: string
  nip: string
  name: string
  tokenSecretName: string
  tokenExpiry?: string
  isActive: boolean
  createdAt: string
}

/**
 * Tenant create input
 */
export interface TenantCreate {
  nip: string
  name: string
  tokenSecretName: string
  tokenExpiry?: string
}

/**
 * Tenant update input
 */
export interface TenantUpdate {
  name?: string
  tokenSecretName?: string
  tokenExpiry?: string
  isActive?: boolean
}
