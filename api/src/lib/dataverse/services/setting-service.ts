/**
 * Setting Service
 * 
 * CRUD operations for KSeF settings (company configuration per NIP).
 */

import { dataverseClient } from '../client'
import { DV, KSEF_ENVIRONMENT, SYNC_STATUS } from '../config'
import { mapDvSettingToApp, mapAppSettingToDv, type AppSetting } from '../mappers'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvSetting } from '../../../types/dataverse'
import { getSecret } from '../../keyvault/secrets'

/**
 * DTO for creating a new setting
 */
export interface SettingCreate {
  nip: string
  companyName: string
  environment: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  keyVaultSecretName?: string
  invoicePrefix?: string
}

/**
 * DTO for updating a setting
 */
export interface SettingUpdate {
  companyName?: string
  environment?: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  isActive?: boolean
  invoicePrefix?: string
}

/**
 * Setting Service class
 */
export class SettingService {
  private entitySet = DV.setting.entitySet

  /**
   * Check token status for a setting
   */
  private async checkTokenStatus(setting: AppSetting): Promise<'valid' | 'expiring' | 'expired' | 'missing'> {
    try {
      const secretName = setting.keyVaultSecretName || `ksef-token-${setting.nip}`
      const token = await getSecret(secretName)
      
      if (!token) {
        return 'missing'
      }
      
      // Check expiration
      if (setting.tokenExpiresAt) {
        const now = new Date()
        const expiresAt = new Date(setting.tokenExpiresAt)
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilExpiry < 0) {
          return 'expired'
        } else if (daysUntilExpiry <= 7) {
          return 'expiring'
        }
      }
      
      return 'valid'
    } catch (error) {
      logDataverseError('SettingService.checkTokenStatus', error)
      return 'missing'
    }
  }

  /**
   * Get all settings
   */
  async getAll(activeOnly = true): Promise<AppSetting[]> {
    const s = DV.setting
    let query = `$orderby=${s.companyName} asc`
    
    if (activeOnly) {
      query = `$filter=${s.isActive} eq true and ${s.stateCode} eq 0&${query}`
    }

    logDataverseInfo('SettingService.getAll', 'Fetching all settings', { activeOnly })

    try {
      const records = await dataverseClient.listAll<DvSetting>(this.entitySet, query)
      const settings = records.map(mapDvSettingToApp)
      
      // Check token status for each setting
      const settingsWithTokenStatus = await Promise.all(
        settings.map(async (setting) => ({
          ...setting,
          tokenStatus: await this.checkTokenStatus(setting)
        }))
      )
      
      return settingsWithTokenStatus
    } catch (error) {
      logDataverseError('SettingService.getAll', error)
      throw error
    }
  }

  /**
   * Get setting by ID
   */
  async getById(id: string): Promise<AppSetting | null> {
    logDataverseInfo('SettingService.getById', 'Fetching setting', { id })

    try {
      const record = await dataverseClient.getById<DvSetting>(this.entitySet, id)
      if (!record) return null
      
      const setting = mapDvSettingToApp(record)
      setting.tokenStatus = await this.checkTokenStatus(setting)
      
      return setting
    } catch (error) {
      logDataverseError('SettingService.getById', error)
      throw error
    }
  }

  /**
   * Get setting by NIP
   */
  async getByNip(nip: string): Promise<AppSetting | null> {
    const s = DV.setting
    const filter = `${s.nip} eq '${escapeOData(nip)}'`
    logDataverseInfo('SettingService.getByNip', 'Fetching setting by NIP', { nip })

    try {
      const response = await dataverseClient.list<DvSetting>(this.entitySet, `$filter=${filter}&$top=1`)
      if (response.value.length === 0) return null
      return mapDvSettingToApp(response.value[0])
    } catch (error) {
      logDataverseError('SettingService.getByNip', error)
      throw error
    }
  }

  /**
   * Get setting by NIP and environment combination (unique key)
   */
  async getByNipAndEnvironment(nip: string, environment: number): Promise<AppSetting | null> {
    const s = DV.setting
    const filter = `${s.nip} eq '${escapeOData(nip)}' and ${s.environment} eq ${environment}`
    logDataverseInfo('SettingService.getByNipAndEnvironment', 'Fetching setting by NIP and environment', { nip, environment })

    try {
      const response = await dataverseClient.list<DvSetting>(this.entitySet, `$filter=${filter}&$top=1`)
      if (response.value.length === 0) return null
      return mapDvSettingToApp(response.value[0])
    } catch (error) {
      logDataverseError('SettingService.getByNipAndEnvironment', error)
      throw error
    }
  }

  /**
   * Create new setting
   */
  async create(data: SettingCreate): Promise<AppSetting> {
    logDataverseInfo('SettingService.create', 'Creating setting', { nip: data.nip, companyName: data.companyName })

    try {
      // Check if NIP + environment combination already exists
      const envKey = data.environment.toUpperCase() as keyof typeof KSEF_ENVIRONMENT
      const environmentValue = KSEF_ENVIRONMENT[envKey]
      const existing = await this.getByNipAndEnvironment(data.nip, environmentValue)
      if (existing) {
        throw new Error(`Setting for NIP ${data.nip} in this environment already exists`)
      }

      const s = DV.setting
      const payload = mapAppSettingToDv(data as Partial<AppSetting>)
      
      // Set defaults
      payload[s.isActive] = true
      if (data.keyVaultSecretName === undefined) {
        payload[s.keyVaultSecretName] = `ksef-token-${data.nip}`
      }

      const result = await dataverseClient.create<DvSetting>(this.entitySet, payload)
      
      // Fetch the created record
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      // Fallback: return by NIP
      const created = await this.getByNip(data.nip)
      if (created) return created

      throw new Error('Failed to retrieve created setting')
    } catch (error) {
      logDataverseError('SettingService.create', error)
      throw error
    }
  }

  /**
   * Update existing setting
   */
  async update(id: string, data: SettingUpdate): Promise<AppSetting | null> {
    logDataverseInfo('SettingService.update', 'Updating setting', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppSettingToDv(data as Partial<AppSetting>)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('SettingService.update', error)
      throw error
    }
  }

  /**
   * Update last sync status
   */
  async updateLastSync(id: string, status: 'success' | 'error'): Promise<void> {
    const s = DV.setting
    const payload: Record<string, unknown> = {
      [s.lastSyncAt]: new Date().toISOString(),
      [s.lastSyncStatus]: status === 'success' ? SYNC_STATUS.COMPLETED : SYNC_STATUS.FAILED,
    }

    logDataverseInfo('SettingService.updateLastSync', 'Updating last sync status', { id, status })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SettingService.updateLastSync', error)
      throw error
    }
  }

  /**
   * Update token expiration
   */
  async updateTokenExpiration(id: string, expiresAt: string): Promise<void> {
    const s = DV.setting
    const payload: Record<string, unknown> = {
      [s.tokenExpiresAt]: expiresAt,
    }

    logDataverseInfo('SettingService.updateTokenExpiration', 'Updating token expiration', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SettingService.updateTokenExpiration', error)
      throw error
    }
  }

  /**
   * Deactivate setting
   */
  async deactivate(id: string): Promise<void> {
    const s = DV.setting
    const payload: Record<string, unknown> = {
      [s.isActive]: false,
    }

    logDataverseInfo('SettingService.deactivate', 'Deactivating setting', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SettingService.deactivate', error)
      throw error
    }
  }

  /**
   * Activate setting
   */
  async activate(id: string): Promise<void> {
    const s = DV.setting
    const payload: Record<string, unknown> = {
      [s.isActive]: true,
    }

    logDataverseInfo('SettingService.activate', 'Activating setting', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SettingService.activate', error)
      throw error
    }
  }

  /**
   * Get settings requiring sync (auto-sync enabled, not synced recently)
   */
  async getRequiringSync(): Promise<AppSetting[]> {
    const s = DV.setting
    const filter = `${s.isActive} eq true and ${s.autoSync} eq true and ${s.stateCode} eq 0`
    
    logDataverseInfo('SettingService.getRequiringSync', 'Fetching settings requiring sync')

    try {
      const records = await dataverseClient.listAll<DvSetting>(this.entitySet, `$filter=${filter}`)
      const settings = records.map(mapDvSettingToApp)
      
      // Filter by sync interval
      const now = new Date()
      return settings.filter(setting => {
        if (!setting.lastSyncAt) return true // Never synced
        if (!setting.syncIntervalMinutes) return false // No interval set
        
        const lastSync = new Date(setting.lastSyncAt)
        const nextSync = new Date(lastSync.getTime() + setting.syncIntervalMinutes * 60 * 1000)
        return now >= nextSync
      })
    } catch (error) {
      logDataverseError('SettingService.getRequiringSync', error)
      throw error
    }
  }

  /**
   * Get settings with expiring tokens (within next 24 hours)
   */
  async getWithExpiringTokens(): Promise<AppSetting[]> {
    logDataverseInfo('SettingService.getWithExpiringTokens', 'Fetching settings with expiring tokens')

    try {
      const allSettings = await this.getAll(true)
      const now = new Date()
      const threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
      
      return allSettings.filter(setting => {
        if (!setting.tokenExpiresAt) return false
        const expires = new Date(setting.tokenExpiresAt)
        return expires <= threshold
      })
    } catch (error) {
      logDataverseError('SettingService.getWithExpiringTokens', error)
      throw error
    }
  }
}

// Export singleton instance
export const settingService = new SettingService()
