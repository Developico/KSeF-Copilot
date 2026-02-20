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
  sessionId?: string
  pageFrom?: number
  pageTo?: number
}

/**
 * SyncLog Service class
 * 
 * Gracefully degrades if the dvlp_ksefsynclog entity or expected columns
 * are missing from Dataverse (e.g. schema not yet deployed).
 * After the first failure, all subsequent operations become no-ops for the
 * lifetime of the process so we don't spam logs with repeated errors.
 */
export class SyncLogService {
  private entitySet = DV.syncLog.entitySet
  private _disabled = false
  private _disableReason: string | null = null

  /**
   * Check whether the service has been disabled due to a schema/entity error.
   * When disabled, all write operations silently return null / void.
   */
  get isDisabled(): boolean {
    return this._disabled
  }

  /**
   * Detect if an error is caused by a missing entity or missing column
   * (Dataverse returns 400 with ODataException for unknown properties,
   *  or 404 for unknown entity sets).
   */
  private isSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message
    return (
      msg.includes('does not exist on type') ||   // missing column
      msg.includes('resource not found') ||        // missing entity (404)
      msg.includes('Could not find a property') || // OData property error
      (msg.includes('400') && msg.includes('property')) // 400 + property
    )
  }

  /**
   * Mark the service as disabled to prevent further failed calls.
   */
  private disable(error: unknown): void {
    if (this._disabled) return
    this._disabled = true
    this._disableReason = error instanceof Error ? error.message : String(error)
    logDataverseInfo(
      'SyncLogService',
      `Sync log tracking disabled — entity schema mismatch. Sync operations will continue without logging. Reason: ${this._disableReason}`,
    )
  }

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
   * Create new sync log entry.
   * Returns null (instead of throwing) when the service is disabled due to schema mismatch.
   */
  async create(data: SyncLogCreate): Promise<AppSyncLog | null> {
    if (this._disabled) return null

    logDataverseInfo('SyncLogService.create', 'Creating sync log', { 
      settingId: data.settingId, 
      direction: data.direction 
    })

    try {
      const s = DV.syncLog
      
      // Map direction to option set value (Dataverse only has incoming/outgoing)
      const directionValue = data.direction === 'outgoing'
        ? SYNC_DIRECTION.OUTGOING
        : SYNC_DIRECTION.INCOMING

      const payload: Record<string, unknown> = {
        // Convert lookup field name from read format (_dvlp_ksefsettingid_value) to binding format (dvlp_ksefsettingid)
        [`${s.settingLookup.replace(/^_/, '').replace(/_value$/, '')}@odata.bind`]: `/dvlp_ksefsettings(${data.settingId})`,
        [s.direction]: directionValue,
        [s.startedAt]: new Date().toISOString(),
        [s.status]: SYNC_STATUS.IN_PROGRESS,
        [s.invoicesProcessed]: 0,
        [s.invoicesCreated]: 0,
        [s.invoicesUpdated]: 0,
        [s.invoicesFailed]: 0,
      }

      // Bind session lookup if sessionId is provided
      if (data.sessionId) {
        payload[`${s.sessionLookup.replace(/^_/, '').replace(/_value$/, '')}@odata.bind`] = `/${DV.session.entitySet}(${data.sessionId})`
      }

      if (data.pageFrom !== undefined) {
        payload[s.pageFrom] = data.pageFrom
      }

      if (data.pageTo !== undefined) {
        payload[s.pageTo] = data.pageTo
      }

      const result = await dataverseClient.create<DvSyncLog>(this.entitySet, payload)
      
      if (!result) {
        logDataverseInfo('SyncLogService.create', 'Create returned no result (204 without OData-EntityId)')
        return null
      }

      // Case 1: 204 response — client extracted ID from OData-EntityId header → { id: '...' }
      if ('id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      // Case 2: return=representation honoured — full DvSyncLog record returned (201)
      const primaryKey = s.id as keyof DvSyncLog          // e.g. dvlp_ksefsynclogid
      const recordId = (result as unknown as Record<string, unknown>)[primaryKey] as string | undefined
      if (recordId) {
        return mapDvSyncLogToApp(result)
      }

      logDataverseInfo('SyncLogService.create', 'Could not extract sync log ID from Dataverse response', { resultKeys: Object.keys(result) })
      return null
    } catch (error) {
      // Detect schema mismatch (missing entity/column) and disable gracefully
      if (this.isSchemaError(error)) {
        this.disable(error)
        return null
      }
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
    if (this._disabled) return

    const s = DV.syncLog
    const payload: Record<string, unknown> = {
      [s.status]: SYNC_STATUS.COMPLETED,
      [s.completedAt]: new Date().toISOString(),
      [s.invoicesProcessed]: stats.created + stats.updated + stats.failed,
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
    if (this._disabled) return

    const s = DV.syncLog
    const payload: Record<string, unknown> = {
      [s.status]: SYNC_STATUS.FAILED,
      [s.completedAt]: new Date().toISOString(),
      [s.errorMessage]: errorMessage,
    }

    if (stats) {
      payload[s.invoicesProcessed] = stats.created + stats.updated + stats.failed
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
    if (this._disabled) return

    const s = DV.syncLog
    const payload: Record<string, unknown> = {
      [s.invoicesProcessed]: stats.created + stats.updated + stats.failed,
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

  /**
   * Cleanup orphaned in-progress sync logs.
   * Marks all IN_PROGRESS logs older than `maxAgeMinutes` as FAILED.
   * Returns the number of updated records.
   */
  async cleanupStale(maxAgeMinutes = 60): Promise<{ updated: number; ids: string[] }> {
    if (this._disabled) return { updated: 0, ids: [] }

    const s = DV.syncLog
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()
    const filter = `${s.status} eq ${SYNC_STATUS.IN_PROGRESS} and ${s.startedAt} lt ${cutoff}`
    const query = `$filter=${filter}&$orderby=${s.startedAt} asc`

    logDataverseInfo('SyncLogService.cleanupStale', 'Cleaning up stale in-progress sync logs', { maxAgeMinutes, cutoff })

    try {
      const response = await dataverseClient.list<DvSyncLog>(this.entitySet, query)
      const stale = response.value
      const updatedIds: string[] = []

      for (const record of stale) {
        const id = record[s.id as keyof DvSyncLog] as string
        try {
          await dataverseClient.update(this.entitySet, id, {
            [s.status]: SYNC_STATUS.FAILED,
            [s.completedAt]: new Date().toISOString(),
            [s.errorMessage]: `Automatically marked as failed — sync log was stuck in-progress for more than ${maxAgeMinutes} minutes`,
          })
          updatedIds.push(id)
        } catch (err) {
          logDataverseError('SyncLogService.cleanupStale', err)
        }
      }

      logDataverseInfo('SyncLogService.cleanupStale', `Cleaned up ${updatedIds.length} stale sync logs`)
      return { updated: updatedIds.length, ids: updatedIds }
    } catch (error) {
      logDataverseError('SyncLogService.cleanupStale', error)
      throw error
    }
  }
}

// Export singleton instance
export const syncLogService = new SyncLogService()
