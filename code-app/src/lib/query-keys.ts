/**
 * React Query key factories.
 *
 * Centralised query key definitions to ensure consistent
 * cache invalidation across the app.
 */

import type { InvoiceListParams, ForecastParams, AnomalyParams } from './types'

export const queryKeys = {
  // Health
  health: ['health'] as const,
  healthDetailed: ['health', 'detailed'] as const,

  // KSeF
  ksefStatus: ['ksef', 'status'] as const,
  ksefSession: ['ksef', 'session'] as const,

  // Sync preview
  syncPreview: (params?: {
    nip?: string
    dateFrom?: string
    dateTo?: string
  }) => ['sync', 'preview', params] as const,

  // Dashboard
  dashboardStats: (params?: {
    fromDate?: string
    toDate?: string
    settingId?: string
  }) => ['dashboard', 'stats', params] as const,

  // Invoices
  invoices: (params?: InvoiceListParams) => ['invoices', params] as const,
  invoice: (id: string) => ['invoices', id] as const,
  invoiceAttachments: (id: string) =>
    ['invoices', id, 'attachments'] as const,
  invoiceNotes: (id: string) => ['invoices', id, 'notes'] as const,
  invoiceDocument: (id: string) => ['invoices', id, 'document'] as const,
  invoiceThumbnail: (id: string) =>
    ['invoices', id, 'document', 'thumbnail'] as const,
  documentConfig: ['documents', 'config'] as const,

  // Settings
  companies: ['settings', 'companies'] as const,
  company: (id: string) => ['settings', 'companies', id] as const,
  costCenters: ['settings', 'costCenters'] as const,

  // Forecast
  forecastMonthly: (params?: ForecastParams) =>
    ['forecast', 'monthly', params] as const,
  forecastByMpk: (params?: ForecastParams) =>
    ['forecast', 'by-mpk', params] as const,
  forecastByCategory: (params?: ForecastParams) =>
    ['forecast', 'by-category', params] as const,
  forecastBySupplier: (params?: ForecastParams) =>
    ['forecast', 'by-supplier', params] as const,
  forecastAlgorithms: ['forecast', 'algorithms'] as const,

  // Anomalies
  anomalies: (params?: AnomalyParams) => ['anomalies', params] as const,
  anomaliesSummary: (params?: AnomalyParams) =>
    ['anomalies', 'summary', params] as const,
  anomalyRules: ['anomalies', 'rules'] as const,

  // VAT White List
  vatLookup: (identifier: string) => ['vat', 'lookup', identifier] as const,

  // Recent suppliers
  recentSuppliers: (tenantNip?: string) =>
    ['suppliers', 'recent', tenantNip] as const,

  // Dataverse
  dvSettings: (activeOnly?: boolean) =>
    ['dv', 'settings', { activeOnly }] as const,
  dvSetting: (id: string) => ['dv', 'settings', id] as const,
  dvSessions: (settingId: string, activeOnly?: boolean) =>
    ['dv', 'sessions', { settingId, activeOnly }] as const,
  dvSessionActive: (nip: string) =>
    ['dv', 'sessions', 'active', nip] as const,
  dvSession: (id: string) => ['dv', 'sessions', id] as const,
  dvSyncLogs: (settingId?: string, limit?: number) =>
    ['dv', 'sync', 'logs', { settingId, limit }] as const,
  dvSyncLog: (id: string) => ['dv', 'sync', 'logs', id] as const,
  dvSyncStats: (settingId: string) =>
    ['dv', 'sync', 'stats', settingId] as const,

  // Exchange rates
  exchangeRate: (currency: string, date?: string) =>
    ['exchange-rates', currency, date] as const,

  // KSeF Testdata
  ksefTestdataEnvironments: ['ksef', 'testdata', 'environments'] as const,
  ksefTestdataPermissions: (nip: string) =>
    ['ksef', 'testdata', 'permissions', nip] as const,
  ksefTestdataCleanupPreview: (nip: string) =>
    ['ksef', 'testdata', 'cleanup', 'preview', nip] as const,

  // MPK Centers
  mpkCenters: (settingId: string) => ['mpk-centers', settingId] as const,
  mpkCenter: (id: string) => ['mpk-centers', 'detail', id] as const,
  mpkApprovers: (id: string) => ['mpk-centers', id, 'approvers'] as const,
  mpkBudgetStatus: (id: string) =>
    ['mpk-centers', id, 'budget-status'] as const,
  dvUsers: (settingId: string) => ['users', settingId] as const,

  // Approvals
  pendingApprovals: (settingId: string) =>
    ['approvals', 'pending', settingId] as const,

  // Budget
  budgetSummary: (settingId: string) =>
    ['budget', 'summary', settingId] as const,

  // Notifications
  notifications: (settingId: string) =>
    ['notifications', settingId] as const,
  notificationsUnreadCount: (settingId: string) =>
    ['notifications', 'unread-count', settingId] as const,

  // Reports
  reportBudgetUtilization: (settingId: string, mpkCenterId?: string) =>
    ['reports', 'budget-utilization', settingId, mpkCenterId] as const,
  reportApprovalHistory: (
    settingId: string,
    filters?: Record<string, string | undefined>
  ) => ['reports', 'approval-history', settingId, filters] as const,
  reportApproverPerformance: (settingId: string) =>
    ['reports', 'approver-performance', settingId] as const,
  reportInvoiceProcessing: (settingId: string) =>
    ['reports', 'invoice-processing', settingId] as const,
}
