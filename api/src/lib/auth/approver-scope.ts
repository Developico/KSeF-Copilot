/**
 * Approver Scope Resolution
 *
 * Resolves which data an Approver-role user is allowed to access,
 * based on their MPK center assignments and supplier sbContactUserId.
 */

import { supplierService } from '../dataverse/services/supplier-service'
import { mpkCenterService } from '../dataverse/services/mpk-center-service'
import type { AuthUser } from '../../types/api'

export interface ApproverScope {
  /** MPK center IDs where user is an assigned approver */
  mpkCenterIds: string[]
  /** Supplier IDs where user is the sbContactUser */
  supplierIds: string[]
}

/**
 * Resolve the data scope for an Approver-role user.
 *
 * - Finds MPK centers where the user is in the approvers list
 * - Finds suppliers where sbContactUserId matches the user's Dataverse systemUserId
 *
 * @param dvSystemUserId  The Dataverse systemuserid (resolved from Azure OID)
 * @param settingId       Company/setting ID to scope queries
 */
export async function resolveApproverScope(
  dvSystemUserId: string,
  settingId: string,
): Promise<ApproverScope> {
  const [mpkCenterIds, supplierIds] = await Promise.all([
    getApproverMpkCenterIds(dvSystemUserId, settingId),
    getApproverSupplierIds(dvSystemUserId, settingId),
  ])

  return { mpkCenterIds, supplierIds }
}

/**
 * Get MPK center IDs where the user is assigned as an approver.
 */
async function getApproverMpkCenterIds(
  dvSystemUserId: string,
  settingId: string,
): Promise<string[]> {
  const allMpks = await mpkCenterService.getAll({ settingId, activeOnly: true })
  const approverMpkIds: string[] = []

  for (const mpk of allMpks) {
    const approvers = await mpkCenterService.getApprovers(mpk.id)
    if (approvers.some((a) => a.systemUserId === dvSystemUserId)) {
      approverMpkIds.push(mpk.id)
    }
  }

  return approverMpkIds
}

/**
 * Get supplier IDs where user is the sbContactUser.
 */
async function getApproverSupplierIds(
  dvSystemUserId: string,
  settingId: string,
): Promise<string[]> {
  const suppliers = await supplierService.getAll({ settingId })
  return suppliers
    .filter((s) => s.sbContactUserId === dvSystemUserId)
    .map((s) => s.id)
}

/**
 * Check if the user is an Approver-only (has Approver role but NOT Admin/Reader).
 */
export function isApproverOnly(user: AuthUser): boolean {
  return (
    user.roles.includes('Approver') &&
    !user.roles.includes('Admin') &&
    !user.roles.includes('Reader')
  )
}
