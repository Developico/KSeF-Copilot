/**
 * MPK Center Service
 * 
 * CRUD operations for MPK Centers (cost centers) and their approvers.
 */

import { dataverseClient } from '../client'
import { DV } from '../config'
import {
  mapDvMpkCenterToApp,
  mapAppMpkCenterToDv,
  mapDvMpkApproverToApp,
  mapDvSystemUserToApp,
} from '../mappers'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvMpkCenter, DvMpkApprover, DvSystemUser } from '../../../types/dataverse'
import type { MpkCenter, MpkCenterCreate, MpkCenterUpdate, MpkApprover, DataverseUser } from '../../../types/mpk'

/**
 * Filter options for listing MPK Centers
 */
export interface MpkCenterFilters {
  settingId?: string
  activeOnly?: boolean
}

/**
 * MPK Center Service class
 */
export class MpkCenterService {
  private entitySet = DV.mpkCenter.entitySet
  private approverEntitySet = DV.mpkApprover.entitySet

  // ========== MPK Center CRUD ==========

  /**
   * Get all MPK Centers for a setting
   */
  async getAll(filters: MpkCenterFilters = {}): Promise<MpkCenter[]> {
    const s = DV.mpkCenter
    const conditions: string[] = []

    if (filters.settingId) {
      conditions.push(`${s.settingLookup} eq ${escapeOData(filters.settingId)}`)
    }

    if (filters.activeOnly !== false) {
      conditions.push(`${s.isActive} eq true`)
    }

    const filter = conditions.length > 0 ? `$filter=${conditions.join(' and ')}` : ''
    const query = `${filter}&$orderby=${s.name} asc`

    logDataverseInfo('MpkCenterService.getAll', 'Fetching MPK centers', { filters })

    try {
      const records = await dataverseClient.listAll<DvMpkCenter>(this.entitySet, query)
      return records.map(mapDvMpkCenterToApp)
    } catch (error) {
      logDataverseError('MpkCenterService.getAll', error)
      throw error
    }
  }

  /**
   * Get MPK Center by ID
   */
  async getById(id: string): Promise<MpkCenter | null> {
    logDataverseInfo('MpkCenterService.getById', 'Fetching MPK center', { id })

    try {
      const record = await dataverseClient.getById<DvMpkCenter>(this.entitySet, id)
      return record ? mapDvMpkCenterToApp(record) : null
    } catch (error) {
      logDataverseError('MpkCenterService.getById', error)
      throw error
    }
  }

  /**
   * Create new MPK Center
   */
  async create(data: MpkCenterCreate): Promise<MpkCenter> {
    logDataverseInfo('MpkCenterService.create', 'Creating MPK center', { name: data.name })

    try {
      const payload = mapAppMpkCenterToDv(data as Partial<MpkCenter> & { settingId: string })
      const result = await dataverseClient.create<DvMpkCenter>(this.entitySet, payload)

      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      throw new Error('Failed to fetch created MPK center')
    } catch (error) {
      logDataverseError('MpkCenterService.create', error)
      throw error
    }
  }

  /**
   * Update existing MPK Center
   */
  async update(id: string, data: MpkCenterUpdate): Promise<MpkCenter | null> {
    logDataverseInfo('MpkCenterService.update', 'Updating MPK center', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppMpkCenterToDv(data as Partial<MpkCenter>)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('MpkCenterService.update', error)
      throw error
    }
  }

  /**
   * Deactivate (soft delete) MPK Center
   */
  async deactivate(id: string): Promise<void> {
    logDataverseInfo('MpkCenterService.deactivate', 'Deactivating MPK center', { id })

    try {
      await dataverseClient.update(this.entitySet, id, {
        [DV.mpkCenter.isActive]: false,
      })
    } catch (error) {
      logDataverseError('MpkCenterService.deactivate', error)
      throw error
    }
  }

  // ========== Approvers ==========

  /**
   * Get approvers for an MPK Center (enriched with user details)
   */
  async getApprovers(mpkCenterId: string): Promise<MpkApprover[]> {
    const s = DV.mpkApprover
    const filter = `$filter=${s.mpkCenterLookup} eq ${escapeOData(mpkCenterId)}`

    logDataverseInfo('MpkCenterService.getApprovers', 'Fetching approvers', { mpkCenterId })

    try {
      const records = await dataverseClient.listAll<DvMpkApprover>(this.approverEntitySet, filter)
      const baseApprovers = records.map(mapDvMpkApproverToApp)

      // Enrich with user fullName and email
      const users = await this.listSystemUsers()
      const userMap = new Map(users.map((u) => [u.systemUserId, u]))

      return baseApprovers.map((a) => {
        const user = userMap.get(a.systemUserId)
        return {
          ...a,
          fullName: user?.fullName ?? a.name,
          email: user?.email ?? '',
          azureObjectId: user?.azureObjectId ?? '',
        }
      })
    } catch (error) {
      logDataverseError('MpkCenterService.getApprovers', error)
      throw error
    }
  }

  /**
   * Set approvers for an MPK Center (full replace)
   * Deletes existing approvers not in the new list, adds new ones.
   */
  async setApprovers(mpkCenterId: string, systemUserIds: string[]): Promise<MpkApprover[]> {
    logDataverseInfo('MpkCenterService.setApprovers', 'Setting approvers', {
      mpkCenterId,
      count: systemUserIds.length,
    })

    try {
      // Get current approvers
      const current = await this.getApprovers(mpkCenterId)
      const currentUserIds = new Set(current.map((a) => a.systemUserId))
      const desiredUserIds = new Set(systemUserIds)

      // Delete removed approvers
      for (const approver of current) {
        if (!desiredUserIds.has(approver.systemUserId)) {
          await dataverseClient.delete(this.approverEntitySet, approver.id)
        }
      }

      // Add new approvers
      for (const userId of systemUserIds) {
        if (!currentUserIds.has(userId)) {
          await dataverseClient.create(this.approverEntitySet, {
            [`${DV.mpkApprover.mpkCenterBind}`]: `/dvlp_ksefmpkcenters(${mpkCenterId})`,
            [`${DV.mpkApprover.systemUserBind}`]: `/systemusers(${userId})`,
            [DV.mpkApprover.name]: `Approver – ${mpkCenterId}`, // Will be overwritten by flow/plugin
          })
        }
      }

      return this.getApprovers(mpkCenterId)
    } catch (error) {
      logDataverseError('MpkCenterService.setApprovers', error)
      throw error
    }
  }

  // ========== Dataverse System Users ==========

  /**
   * List Dataverse system users (for approver assignment)
   * Filters out disabled users and service accounts (accessmode != 4)
   */
  async listSystemUsers(): Promise<DataverseUser[]> {
    const s = DV.systemUser
    const filter = `$filter=${s.isDisabled} eq false and ${s.accessMode} ne 4`
    const select = `$select=${s.id},${s.fullName},${s.email},${s.azureObjectId},${s.isDisabled}`
    const orderBy = `$orderby=${s.fullName} asc`
    const query = `${filter}&${select}&${orderBy}`

    logDataverseInfo('MpkCenterService.listSystemUsers', 'Fetching Dataverse system users')

    try {
      const records = await dataverseClient.listAll<DvSystemUser>(s.entitySet, query)
      return records.map(mapDvSystemUserToApp)
    } catch (error) {
      logDataverseError('MpkCenterService.listSystemUsers', error)
      throw error
    }
  }

  /**
   * Resolve Azure OID to Dataverse systemuserid
   */
  async resolveSystemUserByOid(oid: string): Promise<DataverseUser | null> {
    const s = DV.systemUser
    const filter = `$filter=${s.azureObjectId} eq ${escapeOData(oid)}`
    const select = `$select=${s.id},${s.fullName},${s.email},${s.azureObjectId},${s.isDisabled}`

    try {
      const response = await dataverseClient.list<DvSystemUser>(s.entitySet, `${filter}&${select}&$top=1`)
      if (response.value.length === 0) return null
      return mapDvSystemUserToApp(response.value[0])
    } catch (error) {
      logDataverseError('MpkCenterService.resolveSystemUserByOid', error)
      throw error
    }
  }
}

// Singleton export
export const mpkCenterService = new MpkCenterService()
