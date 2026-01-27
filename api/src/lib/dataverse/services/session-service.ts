/**
 * Session Service
 * 
 * CRUD operations for KSeF sessions in Dataverse.
 */

import { dataverseClient } from '../client'
import { DV, SESSION_STATUS, SESSION_TYPE } from '../config'
import { mapDvSessionToApp, type AppSession } from '../mappers'
import { logDataverseInfo, logDataverseError } from '../logger'
import type { DvSession } from '../../../types/dataverse'

/**
 * DTO for creating a new session
 */
export interface SessionCreate {
  sessionReference: string
  settingId: string
  nip: string
  sessionType: 'interactive' | 'batch'
  sessionToken?: string
  expiresAt?: string
}

/**
 * Session Service class
 */
export class SessionService {
  private entitySet = DV.session.entitySet

  /**
   * Get all sessions for a setting
   */
  async getBySettingId(settingId: string, activeOnly = false): Promise<AppSession[]> {
    const s = DV.session
    let filter = `${s.settingLookup} eq ${settingId}`
    
    if (activeOnly) {
      filter += ` and ${s.status} eq ${SESSION_STATUS.ACTIVE}`
    }
    
    const query = `$filter=${filter}&$orderby=${s.startedAt} desc`

    logDataverseInfo('SessionService.getBySettingId', 'Fetching sessions', { settingId, activeOnly })

    try {
      const records = await dataverseClient.listAll<DvSession>(this.entitySet, query)
      return records.map(mapDvSessionToApp)
    } catch (error) {
      logDataverseError('SessionService.getBySettingId', error)
      throw error
    }
  }

  /**
   * Get active session for a NIP
   */
  async getActiveByNip(nip: string): Promise<AppSession | null> {
    const s = DV.session
    const filter = `${s.nip} eq '${nip}' and ${s.status} eq ${SESSION_STATUS.ACTIVE}`
    const query = `$filter=${filter}&$orderby=${s.startedAt} desc&$top=1`

    logDataverseInfo('SessionService.getActiveByNip', 'Fetching active session', { nip })

    try {
      const response = await dataverseClient.list<DvSession>(this.entitySet, query)
      if (response.value.length === 0) return null
      return mapDvSessionToApp(response.value[0])
    } catch (error) {
      logDataverseError('SessionService.getActiveByNip', error)
      throw error
    }
  }

  /**
   * Get session by ID
   */
  async getById(id: string): Promise<AppSession | null> {
    logDataverseInfo('SessionService.getById', 'Fetching session', { id })

    try {
      const record = await dataverseClient.getById<DvSession>(this.entitySet, id)
      return record ? mapDvSessionToApp(record) : null
    } catch (error) {
      logDataverseError('SessionService.getById', error)
      throw error
    }
  }

  /**
   * Get session by KSeF session reference
   */
  async getByReference(sessionReference: string): Promise<AppSession | null> {
    const s = DV.session
    const filter = `${s.sessionReference} eq '${sessionReference}'`

    logDataverseInfo('SessionService.getByReference', 'Fetching session by reference', { sessionReference })

    try {
      const response = await dataverseClient.list<DvSession>(this.entitySet, `$filter=${filter}&$top=1`)
      if (response.value.length === 0) return null
      return mapDvSessionToApp(response.value[0])
    } catch (error) {
      logDataverseError('SessionService.getByReference', error)
      throw error
    }
  }

  /**
   * Create new session
   */
  async create(data: SessionCreate): Promise<AppSession> {
    logDataverseInfo('SessionService.create', 'Creating session', { 
      nip: data.nip, 
      sessionReference: data.sessionReference 
    })

    try {
      const s = DV.session
      const payload: Record<string, unknown> = {
        [s.sessionReference]: data.sessionReference,
        [`${s.settingLookup.replace('_value', '')}@odata.bind`]: `/dvlp_ksefsettings(${data.settingId})`,
        [s.nip]: data.nip,
        [s.sessionType]: data.sessionType === 'batch' ? SESSION_TYPE.BATCH : SESSION_TYPE.INTERACTIVE,
        [s.startedAt]: new Date().toISOString(),
        [s.status]: SESSION_STATUS.ACTIVE,
        [s.invoicesProcessed]: 0,
      }

      if (data.sessionToken) {
        payload[s.sessionToken] = data.sessionToken
      }

      if (data.expiresAt) {
        payload[s.expiresAt] = data.expiresAt
      }

      const result = await dataverseClient.create<DvSession>(this.entitySet, payload)
      
      // Fetch the created record
      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      // Fallback: return by reference
      const created = await this.getByReference(data.sessionReference)
      if (created) return created

      throw new Error('Failed to retrieve created session')
    } catch (error) {
      logDataverseError('SessionService.create', error)
      throw error
    }
  }

  /**
   * Terminate session
   */
  async terminate(id: string): Promise<void> {
    const s = DV.session
    const payload: Record<string, unknown> = {
      [s.status]: SESSION_STATUS.TERMINATED,
      [s.terminatedAt]: new Date().toISOString(),
    }

    logDataverseInfo('SessionService.terminate', 'Terminating session', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SessionService.terminate', error)
      throw error
    }
  }

  /**
   * Mark session as expired
   */
  async markExpired(id: string): Promise<void> {
    const s = DV.session
    const payload: Record<string, unknown> = {
      [s.status]: SESSION_STATUS.EXPIRED,
    }

    logDataverseInfo('SessionService.markExpired', 'Marking session as expired', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SessionService.markExpired', error)
      throw error
    }
  }

  /**
   * Mark session as error
   */
  async markError(id: string, errorMessage: string): Promise<void> {
    const s = DV.session
    const payload: Record<string, unknown> = {
      [s.status]: SESSION_STATUS.ERROR,
      [s.errorMessage]: errorMessage,
    }

    logDataverseInfo('SessionService.markError', 'Marking session as error', { id })

    try {
      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SessionService.markError', error)
      throw error
    }
  }

  /**
   * Increment invoices processed counter
   */
  async incrementInvoicesProcessed(id: string, count = 1): Promise<void> {
    logDataverseInfo('SessionService.incrementInvoicesProcessed', 'Incrementing counter', { id, count })

    try {
      // First get current count
      const session = await this.getById(id)
      if (!session) {
        throw new Error(`Session ${id} not found`)
      }

      const s = DV.session
      const payload: Record<string, unknown> = {
        [s.invoicesProcessed]: session.invoicesProcessed + count,
      }

      await dataverseClient.update(this.entitySet, id, payload)
    } catch (error) {
      logDataverseError('SessionService.incrementInvoicesProcessed', error)
      throw error
    }
  }

  /**
   * Cleanup expired sessions (mark as expired if past expiresAt)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const s = DV.session
    const now = new Date().toISOString()
    const filter = `${s.status} eq ${SESSION_STATUS.ACTIVE} and ${s.expiresAt} lt ${now}`

    logDataverseInfo('SessionService.cleanupExpiredSessions', 'Cleaning up expired sessions')

    try {
      const response = await dataverseClient.list<DvSession>(this.entitySet, `$filter=${filter}`)
      const sessions = response.value

      for (const session of sessions) {
        await this.markExpired(session.dvlp_ksefsessionid)
      }

      logDataverseInfo('SessionService.cleanupExpiredSessions', `Cleaned up ${sessions.length} sessions`)
      return sessions.length
    } catch (error) {
      logDataverseError('SessionService.cleanupExpiredSessions', error)
      throw error
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService()
