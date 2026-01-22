/**
 * Role definitions for RBAC
 */
export const Roles = {
  Admin: 'Admin',
  Reader: 'Reader',
} as const

export type Role = (typeof Roles)[keyof typeof Roles]

/**
 * Permission definitions
 */
export const Permissions = {
  // Invoice permissions
  'invoices.read': ['Admin', 'Reader'],
  'invoices.write': ['Admin'],
  'invoices.delete': ['Admin'],

  // KSeF permissions
  'ksef.sync': ['Admin'],
  'ksef.import': ['Admin'],
  'ksef.status': ['Admin'],

  // Settings permissions
  'settings.read': ['Admin'],
  'settings.write': ['Admin'],

  // Tenant permissions (Extended)
  'tenants.read': ['Admin'],
  'tenants.write': ['Admin'],
} as const

export type Permission = keyof typeof Permissions

/**
 * Check if role has permission
 */
export function hasPermission(roles: string[], permission: Permission): boolean {
  const allowedRoles = Permissions[permission]
  return roles.some((role) => allowedRoles.includes(role as Role))
}
