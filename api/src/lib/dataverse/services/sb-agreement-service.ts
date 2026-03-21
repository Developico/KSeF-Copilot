/**
 * Self-Billing Agreement Service
 * 
 * CRUD operations for Self-Billing Agreements.
 */

import { dataverseClient } from '../client'
import { DV, SB_AGREEMENT_STATUS } from '../config'
import { logDataverseInfo, logDataverseError } from '../logger'
import { escapeOData } from '../odata-utils'
import type { DvSbAgreement } from '../../../types/dataverse'
import type {
  SbAgreement,
  SbAgreementCreate,
  SbAgreementUpdate,
  SbAgreementStatus,
} from '../../../types/self-billing'

// ============================================================
// SbAgreement OptionSet Mappers
// ============================================================

function mapDvSbAgreementStatusToApp(value: number): SbAgreementStatus {
  switch (value) {
    case SB_AGREEMENT_STATUS.EXPIRED: return 'Expired'
    case SB_AGREEMENT_STATUS.TERMINATED: return 'Terminated'
    case SB_AGREEMENT_STATUS.ACTIVE:
    default: return 'Active'
  }
}

function mapAppSbAgreementStatusToDv(status: SbAgreementStatus): number {
  switch (status) {
    case 'Expired': return SB_AGREEMENT_STATUS.EXPIRED
    case 'Terminated': return SB_AGREEMENT_STATUS.TERMINATED
    case 'Active':
    default: return SB_AGREEMENT_STATUS.ACTIVE
  }
}

// ============================================================
// SbAgreement Mappers
// ============================================================

function mapDvSbAgreementToApp(raw: DvSbAgreement): SbAgreement {
  const s = DV.sbAgreement

  return {
    id: raw[s.id as keyof DvSbAgreement] as string,
    name: raw[s.name as keyof DvSbAgreement] as string,
    supplierId: raw[s.supplierLookup as keyof DvSbAgreement] as string,
    agreementDate: raw[s.agreementDate as keyof DvSbAgreement] as string,
    validFrom: raw[s.validFrom as keyof DvSbAgreement] as string,
    validTo: raw[s.validTo as keyof DvSbAgreement] as string | undefined,
    renewalDate: raw[s.renewalDate as keyof DvSbAgreement] as string | undefined,
    approvalProcedure: raw[s.approvalProcedure as keyof DvSbAgreement] as string | undefined,
    status: mapDvSbAgreementStatusToApp(raw[s.status as keyof DvSbAgreement] as number),
    credentialReference: raw[s.credentialReference as keyof DvSbAgreement] as string | undefined,
    notes: raw[s.notes as keyof DvSbAgreement] as string | undefined,
    hasDocument: (raw[s.hasDocument as keyof DvSbAgreement] as boolean) ?? false,
    documentFilename: raw[s.documentFilename as keyof DvSbAgreement] as string | undefined,
    autoApprove: (raw[s.autoApprove as keyof DvSbAgreement] as boolean) ?? false,
    settingId: raw[s.settingLookup as keyof DvSbAgreement] as string,
    createdOn: raw[s.createdOn as keyof DvSbAgreement] as string,
    modifiedOn: raw[s.modifiedOn as keyof DvSbAgreement] as string,
  }
}

function mapAppSbAgreementToDv(data: SbAgreementCreate | SbAgreementUpdate, isCreate: boolean): Record<string, unknown> {
  const s = DV.sbAgreement
  const payload: Record<string, unknown> = {}

  if ('name' in data && data.name !== undefined) payload[s.name] = data.name
  if ('agreementDate' in data && data.agreementDate !== undefined) payload[s.agreementDate] = data.agreementDate
  if ('validFrom' in data && data.validFrom !== undefined) payload[s.validFrom] = data.validFrom
  if ('validTo' in data && data.validTo !== undefined) payload[s.validTo] = data.validTo ?? null
  if ('renewalDate' in data && data.renewalDate !== undefined) payload[s.renewalDate] = data.renewalDate ?? null
  if ('approvalProcedure' in data && data.approvalProcedure !== undefined) payload[s.approvalProcedure] = data.approvalProcedure ?? null
  if ('credentialReference' in data && data.credentialReference !== undefined) payload[s.credentialReference] = data.credentialReference ?? null
  if ('notes' in data && data.notes !== undefined) payload[s.notes] = data.notes ?? null
  if ('status' in data && data.status !== undefined) payload[s.status] = mapAppSbAgreementStatusToDv(data.status)
  if ('hasDocument' in data && data.hasDocument !== undefined) payload[s.hasDocument] = data.hasDocument
  if ('documentFilename' in data && data.documentFilename !== undefined) payload[s.documentFilename] = data.documentFilename ?? null
  if ('autoApprove' in data && data.autoApprove !== undefined) payload[s.autoApprove] = data.autoApprove

  // Supplier lookup (only on create)
  if (isCreate && 'supplierId' in data && data.supplierId) {
    payload[s.supplierBind] = `/dvlp_ksefsuppliers(${data.supplierId})`
  }

  // Setting lookup (only on create)
  if (isCreate && 'settingId' in data && data.settingId) {
    payload[s.settingBind] = `/dvlp_ksefsettings(${data.settingId})`
  }

  return payload
}

// ============================================================
// SB Agreement Service Class
// ============================================================

export class SbAgreementService {
  private entitySet = DV.sbAgreement.entitySet

  /**
   * Get all agreements, optionally filtered by supplier or setting
   */
  async getAll(params: { settingId: string; supplierId?: string; status?: SbAgreementStatus }): Promise<SbAgreement[]> {
    const s = DV.sbAgreement
    const conditions: string[] = []

    conditions.push(`${s.settingLookup} eq ${escapeOData(params.settingId)}`)

    if (params.supplierId) {
      conditions.push(`${s.supplierLookup} eq ${escapeOData(params.supplierId)}`)
    }

    if (params.status) {
      conditions.push(`${s.status} eq ${mapAppSbAgreementStatusToDv(params.status)}`)
    }

    const filter = `$filter=${conditions.join(' and ')}`
    const query = `${filter}&$orderby=${s.name} asc`

    logDataverseInfo('SbAgreementService.getAll', 'Fetching SB agreements', { params })

    try {
      const records = await dataverseClient.listAll<DvSbAgreement>(this.entitySet, query)
      return records.map(mapDvSbAgreementToApp)
    } catch (error) {
      logDataverseError('SbAgreementService.getAll', error)
      throw error
    }
  }

  /**
   * Get agreement by ID
   */
  async getById(id: string): Promise<SbAgreement | null> {
    logDataverseInfo('SbAgreementService.getById', 'Fetching SB agreement', { id })

    try {
      const record = await dataverseClient.getById<DvSbAgreement>(this.entitySet, id)
      return record ? mapDvSbAgreementToApp(record) : null
    } catch (error) {
      logDataverseError('SbAgreementService.getById', error)
      throw error
    }
  }

  /**
   * Get active agreement for a supplier
   */
  async getActiveForSupplier(supplierId: string, settingId: string): Promise<SbAgreement | null> {
    const s = DV.sbAgreement
    const filter = `$filter=${s.supplierLookup} eq ${escapeOData(supplierId)} and ${s.settingLookup} eq ${escapeOData(settingId)} and ${s.status} eq ${SB_AGREEMENT_STATUS.ACTIVE}`
    const query = `${filter}&$top=1&$orderby=${s.createdOn} desc`

    try {
      const records = await dataverseClient.listAll<DvSbAgreement>(this.entitySet, query)
      return records.length > 0 ? mapDvSbAgreementToApp(records[0]) : null
    } catch (error) {
      logDataverseError('SbAgreementService.getActiveForSupplier', error)
      throw error
    }
  }

  /**
   * Create new agreement
   */
  async create(data: SbAgreementCreate): Promise<SbAgreement> {
    logDataverseInfo('SbAgreementService.create', 'Creating SB agreement', { name: data.name })

    try {
      const payload = mapAppSbAgreementToDv(data, true)
      // Set default status to Active on create
      if (!payload[DV.sbAgreement.status]) {
        payload[DV.sbAgreement.status] = SB_AGREEMENT_STATUS.ACTIVE
      }

      const result = await dataverseClient.create<DvSbAgreement>(this.entitySet, payload)

      // Dataverse may return full entity body (with Prefer: return=representation)
      // or just { id: "..." } from OData-EntityId header (204 response)
      const dvIdField = DV.sbAgreement.id
      if (result && dvIdField in (result as unknown as Record<string, unknown>)) {
        return mapDvSbAgreementToApp(result as unknown as DvSbAgreement)
      }

      if (result && 'id' in result) {
        const created = await this.getById((result as { id: string }).id)
        if (created) return created
      }

      throw new Error('Failed to fetch created SB agreement')
    } catch (error) {
      logDataverseError('SbAgreementService.create', error)
      throw error
    }
  }

  /**
   * Update existing agreement
   */
  async update(id: string, data: SbAgreementUpdate): Promise<SbAgreement | null> {
    logDataverseInfo('SbAgreementService.update', 'Updating SB agreement', { id, fields: Object.keys(data) })

    try {
      const payload = mapAppSbAgreementToDv(data, false)
      await dataverseClient.update(this.entitySet, id, payload)
      return this.getById(id)
    } catch (error) {
      logDataverseError('SbAgreementService.update', error)
      throw error
    }
  }

  /**
   * Terminate an agreement
   */
  async terminate(id: string): Promise<void> {
    logDataverseInfo('SbAgreementService.terminate', 'Terminating SB agreement', { id })

    try {
      await dataverseClient.update(this.entitySet, id, {
        [DV.sbAgreement.status]: SB_AGREEMENT_STATUS.TERMINATED,
      })
    } catch (error) {
      logDataverseError('SbAgreementService.terminate', error)
      throw error
    }
  }

  /**
   * Find expired agreements that need status update
   */
  async findExpired(): Promise<SbAgreement[]> {
    const s = DV.sbAgreement
    const today = new Date().toISOString().split('T')[0]
    const filter = `$filter=${s.status} eq ${SB_AGREEMENT_STATUS.ACTIVE} and ${s.validTo} lt ${today}`

    try {
      const records = await dataverseClient.listAll<DvSbAgreement>(this.entitySet, filter)
      return records.map(mapDvSbAgreementToApp)
    } catch (error) {
      logDataverseError('SbAgreementService.findExpired', error)
      throw error
    }
  }

  /**
   * Find active agreements expiring within the given number of days
   */
  async findExpiringSoon(days: number): Promise<SbAgreement[]> {
    const s = DV.sbAgreement
    const today = new Date().toISOString().split('T')[0]
    const threshold = new Date()
    threshold.setDate(threshold.getDate() + days)
    const thresholdDate = threshold.toISOString().split('T')[0]
    const filter = `$filter=${s.status} eq ${SB_AGREEMENT_STATUS.ACTIVE} and ${s.validTo} ge ${today} and ${s.validTo} le ${thresholdDate}`

    try {
      const records = await dataverseClient.listAll<DvSbAgreement>(this.entitySet, filter)
      return records.map(mapDvSbAgreementToApp)
    } catch (error) {
      logDataverseError('SbAgreementService.findExpiringSoon', error)
      throw error
    }
  }
}

export const sbAgreementService = new SbAgreementService()
