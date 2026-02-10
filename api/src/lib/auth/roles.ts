/**
 * Role definitions for RBAC
 */
export const Roles = {
  Admin: 'Admin',
  Reader: 'Reader',
} as const

export type Role = (typeof Roles)[keyof typeof Roles]
