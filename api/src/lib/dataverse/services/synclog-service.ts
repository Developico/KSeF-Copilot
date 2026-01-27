/**
 * SyncLog Service
 * 
 * CRUD operations for sync logs in Dataverse.
 * Tracks synchronization history for each setting.
 */

import { dataverseClient } from '../client'
import { DV, SYNC_STATUS, SYNC_DIRECTION } from '../config'
import { mapDvSyncLogToApp, type AppSyncLog } from '../mappers'
import { logDataverseInfo, logDataverseError } from '../logger'
import type { DvSyncLog } from '../../../types/dataverse'

/**
 * DTO for creating a new sync log
 */
export interface SyncLogCreate {
  settingId: string
  direction: 'incoming' | 'outgoing' | 'both'
  pageFrom?: number
  pageTo?: number
}

/**
 * SyncLog Service class
 */
export class SyncLogService {
  private entitySet = DV.syncLog.entitySet

  /**
   * Get all sync logs for a setting
   */
  async getBySettingId(settingId: string, limit = 50): Promise<AppSyncLog[]> {
    const s = DV.syncLog
    const filter = `${s.settingLookup} eq ${settingId}`
    const query = `$filter=${filter}&$orderby=${s.startedAt} desc&$top=${limit}`

    logDataverseInfo('SyncLogService.getBySettingId', 'Fetching sync logs', { settingId, limit })

    try {
      const response = await dataverseClient.list<DvSyncLog>(this.entitySet, query)
      return response.value.map(mapDvSyncLogToApp)
    } catch (error) {
      logDataverseError('SyncLogService.getBySettingId', error)
      throw error
    }
  }

  /**
   * Get sync log by ID
   */
  async getById(id: string): Promise<AppSyncLog | null> {
    logDataverseInfo('SyncLogService.getById', 'Fetching sync log', { id })

    try {
      const record = await dataverseClient.getById<DvSyncLog>(this.entitySet, id)
      return record ? mapDvSyncLogToApp(record) : null
    } catch (error) {
      logDataverseError('SyncLogService.getById', error)
      throw error
    }
  }

  /**
   * Get recent sync logs across all settings
   */
  async getRecent(limit = 100): Promise<AppSyncLog[]> {
    const s = DV.syncLog
    const query = `$orderby=${s.startedAt} desc&$top=${limit}`

    logDataverseInfo('SyncLogService.getRecent', 'Fetching recent sync logs', { limit })

    try {
      const response = await dataverseClient.list<DvSyncLog>(this.entitySet, query)
      return response.value.map(mapDvSyncLogToApp)
    } catch (error) {
      logDataverseError('SyncLogService.getRecent', error)
      throw error
    }
  }

  /**
   * Get failed sync logs (for retry/investigation)
   */
  async getFailed(limit = 50): Promise<AppSyncLog[]> {
    const s = DV.syncLog
    const filter = `${s.status} eq ${SYNC_STATUS.FAILED}`
    const query = `$filter=${filter}&$orderby=${s.startedAt} desc&$top=${limit}`

    logDataverseInfo('SyncLogService.getFailed', 'Fetching failed sync logs', { limit })

    try {
      const response = await dataverseClient.list<DvSyncLog>(this.entitySet, query)
      return response.value.map(mapDvSyncLogToApp)
    } catch (error) {
      logDataverseError('SyncLogService.getFailed', error)
      throw error
    }
  }

  /**
   * Get in-progress sync logs (to detect stuck syncs)
   */
  async getInProgress(): Promise<AppSyncLog[]> {
    const s = DV.syncLog
    const filter = `${s.status} eq ${SYNC_STATUS.IN_PROGRESS}`
    const query = `$filter=${filter}&$orderby=${s.startedAt} asc`

    logDataverseInfo('SyncLogService.getInProgress', 'Fetching in-progress sync logs')

    try {
      const response = await dataverseClient.list<DvSyncLog>(this.entitySet, query)
      return response.value.map(mapDvSyncLogToApp)
    } catch (error) {
      logDataverseError('SyncLogService.getInProgress', error)
      throw error
    }
  }

  /**
   * Create new sync log entry
   */
  async create(data: SyncLogCreate): Promise<AppSyncLog> {
    logDataverseInfo('SyncLogService.create', 'Creating sync log', { 
      settingId: data.settingId, 
      direction: data.direction 
    })

    try {
      const s = DV.syncLog
      
      // Map direction to option set value
      let directionValue: number
      switch (data.direction) {
        case 'incoming':
          directionValue = SYNC_DIRECTION.INCOMING
          break
        case 'outgoing':
          directionValue = SYNC_DIRECTION.OUTGOING
          break
        default:
          directionValue = SYNC_DIRECTION.BOTH
      }

      const payload: Record<string, unknown> = {
        [`${s.settingLookup.replace('_value', '')}@odata.bind`]: `/dvlp_ksefsettings(${data.settingId})`,
        [s.direction]: directionValue,
        [s.startedAt]: new Date().toISOString(),
        [s.status]: SYNC_STATUS.IN_PROGRESS,
        [s.invoicesCreated]: 0,
        [s.invoicesUpdated]: 0,
        [s.invoicesFailed]: 0,
      }

      if (data.pageFrom !== undefined) {
        payload[s.pageFrom] = data.pageFrom
      }

      if (data.pageTo !== undefined) {
        payload[s.pageTo] = data.pageTo
      }

      const result = await dataverseClient.create<DvSyncLog>(this.entitySet, payload)
      
      // Fetch the created record
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      // If create returns the ID in OData-EntityId header, parse it
      throw new Error('Failed to retrieve created sync log - implement ID extraction from response')
    } catch (error) {
      logDataverseError('SyncLogService.create', error)
      throw error
    }
  }

  /**
   * Complete sync log successfully
   */
  async complete(
    id: string, 
    stats: { created: number; updated: number; failed: number }
  ): Promise<void> {
    const s = DV.syncLog
    const payload: Record<string, unknown> = {
      [s.status]: SYNC_STATUS.COMPLETED,
      [s.completedAt]: new Date().toISOString(),
      [s.invoicesCreated]: stats.created,
      [s.invoicesUpdated]: stats.updated,
      [s.invoicesFailed]: stats.failed,
    }

    logDataverseInfo('SyncLogService.complete', 'Completing sync log', { id, stats })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SyncLogService.complete', error)
      throw error
    }
  }

  /**
   * Mark sync log as failed
   */
  async fail(id: string, errorMessage: string, stats?: { created: number; updated: number; failed: number }): Promise<void> {
    const s = DV.syncLog
    const payload: Record<string, unknown> = {
      [s.status]: SYNC_STATUS.FAILED,
      [s.completedAt]: new Date().toISOString(),
      [s.errorMessage]: errorMessage,
    }

    if (stats) {
      payload[s.invoicesCreated] = stats.created
      payload[s.invoicesUpdated] = stats.updated
      payload[s.invoicesFailed] = stats.failed
    }

    logDataverseInfo('SyncLogService.fail', 'Marking sync log as failed', { id, errorMessage })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SyncLogService.fail', error)
      throw error
    }
  }

  /**
   * Update sync progress (for long-running syncs)
   */
  async updateProgress(
    id: string, 
    stats: { created: number; updated: number; failed: number },
    pageTo?: number
  ): Promise<void> {
    const s = DV.syncLog
    const payload: Record<string, unknown> = {
      [s.invoicesCreated]: stats.created,
      [s.invoicesUpdated]: stats.updated,
      [s.invoicesFailed]: stats.failed,
    }

    if (pageTo !== undefined) {
      payload[s.pageTo] = pageTo
    }

    logDataverseInfo('SyncLogService.updateProgress', 'Updating sync progress', { id, stats })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SyncLogService.updateProgress', error)
      throw error
    }
  }

  /**
   * Get the last completed sync for a setting
   */
  async getLastCompleted(settingId: string): Promise<AppSyncLog | null> {
    const s = DV.syncLog
    const filter = `${s.settingLookup} eq ${settingId} and ${s.status} eq ${SYNC_STATUS.COMPLETED}`
    const query = `$filter=${filter}&$orderby=${s.completedAt} desc&$top=1`

    logDataverseInfo('SyncLogService.getLastCompleted', 'Fetching last completed sync', { settingId })

    try {
      const response = await dataverseClient.list<DvSyncLog>(this.entitySet, query)
      if (response.value.length === 0) return null
      return mapDvSyncLogToApp(response.value[0])
    } catch (error) {
      logDataverseError('SyncLogService.getLastCompleted', error)
      throw error
    }
  }

  /**
   * Get sync statistics for a setting
   */
  async getStats(settingId: string): Promise<{
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    totalInvoicesCreated: number
    totalInvoicesUpdated: number
    lastSyncAt: string | null
  }> {
    const s = DV.syncLog
    const filter = `${s.settingLookup} eq ${settingId}`

    logDataverseInfo('SyncLogService.getStats', 'Fetching sync stats', { settingId })

    try {
      const logs = await dataverseClient.listAll<DvSyncLog>(this.entitySet, `$filter=${filter}`)
      
      const stats = {
        totalSyncs: logs.length,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalInvoicesCreated: 0,
        totalInvoicesUpdated: 0,
        lastSyncAt: null as string | null,
      }

      for (const log of logs) {
        if (log[s.status as keyof DvSyncLog] === SYNC_STATUS.COMPLETED) {
          stats.successfulSyncs++
        } else if (log[s.status as keyof DvSyncLog] === SYNC_STATUS.FAILED) {
          stats.failedSyncs++
        }

        stats.totalInvoicesCreated += (log[s.invoicesCreated as keyof DvSyncLog] as number) || 0
        stats.totalInvoicesUpdated += (log[s.invoicesUpdated as keyof DvSyncLog] as number) || 0
      }

      // Get last sync time
      if (logs.length > 0) {
        const sorted = logs.sort((a, b) => {
          const aTime = a[s.startedAt as keyof DvSyncLog] as string
          const bTime = b[s.startedAt as keyof DvSyncLog] as string
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
        stats.lastSyncAt = sorted[0][s.startedAt as keyof DvSyncLog] as string
      }

      return stats
    } catch (error) {
      logDataverseError('SyncLogService.getStats', error)
      throw error
    }
  }
}

// Export singleton instance
export const syncLogService = new SyncLogService()
