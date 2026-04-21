/**
 * API adapter for Power Apps Code App context.
 *
 * When running inside Power Apps, routes API calls through the
 * DVLP-KSeF-PP-Connector (Power Platform custom connector) via SDK.
 * When running standalone, falls back to direct fetch (MSAL auth).
 *
 * The connector covers ~45 core operations. Operations without a
 * connector match throw a descriptive error.
 */

console.log('[api-connector] Module loading...')

import { DVLP_KSeF_PP_ConnectorService } from '@/generated'
import type {
  SupplierCreate,
  SbAgreementCreate,
  SbTemplateCreate,
  SelfBillingInvoiceCreate,
  SelfBillingGenerateRequest,
  MpkCenterCreate,
  MpkCenterUpdate,
} from '@/generated/models/DVLP_KSeF_PP_ConnectorModel'

console.log('[api-connector] Service class imported OK, type:', typeof DVLP_KSeF_PP_ConnectorService)

import type { IOperationResult } from '@microsoft/power-apps/data'

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Unwrap Power Apps SDK IOperationResult to plain data.
 * The SDK wraps responses in { data, error } — we extract data
 * or throw on error.
 */
function unwrap<T>(result: IOperationResult<T>, operationName?: string): T {
  console.log(`[Connector] ${operationName ?? 'op'} result:`, JSON.stringify(result).substring(0, 500))
  if (result.error) {
    console.error(`[Connector] ${operationName ?? 'op'} ERROR:`, result.error)
    throw new Error(
      `Connector error: ${result.error.message || JSON.stringify(result.error)}`
    )
  }
  return result.data as T
}

/**
 * Wrapper that catches SDK-level errors (rejected promises) before
 * they reach unwrap. Logs the error and re-throws so React Query
 * can handle it.
 */
async function safeCall<T>(
  operationName: string,
  fn: () => Promise<IOperationResult<T>>
): Promise<T> {
  console.log(`[Connector] calling ${operationName}...`)
  try {
    const result = await fn()
    return unwrap(result, operationName)
  } catch (err) {
    console.error(`[Connector] ${operationName} THREW:`, err)
    throw err
  }
}

/**
 * Placeholder for connector operations that are not yet available.
 * Throws an error with the operation name so it's clear what's missing.
 */
function notAvailable(operationName: string): never {
  throw new Error(
    `Operation "${operationName}" is not available through the Power Platform connector. ` +
    `This feature requires connector expansion or a standalone deployment.`
  )
}

// ── Connector-based API ─────────────────────────────────────────

export const connectorApi = {
  // ── Health ──
  health: () => notAvailable('health'),

  healthDetailed: (environment?: string) =>
    safeCall('HealthCheck', () =>
      DVLP_KSeF_PP_ConnectorService.HealthCheck(environment)
    ),

  // ── VAT / White List (through connector → Azure Functions → WL API) ──
  vat: {
    lookup: (params: { nip?: string; regon?: string }) =>
      safeCall('VatLookup', () =>
        DVLP_KSeF_PP_ConnectorService.VatLookup(params as Record<string, unknown>)
      ),
    validate: (nip: string) =>
      safeCall('VatValidate', () =>
        DVLP_KSeF_PP_ConnectorService.VatValidate(nip)
      ),
    checkAccount: (params: { nip: string; account: string }) =>
      safeCall('VatCheckAccount', () =>
        DVLP_KSeF_PP_ConnectorService.VatCheckAccount(params as Record<string, unknown>)
      ),
  },

  // ── Dashboard ──
  dashboard: {
    stats: (params?: {
      fromDate?: string
      toDate?: string
      tenantNip?: string
      settingId?: string
    }) =>
      safeCall('GetDashboardStats', () =>
        DVLP_KSeF_PP_ConnectorService.GetDashboardStats(
          params?.fromDate,
          params?.toDate,
          params?.settingId,
          params?.tenantNip
        )
      ),
  },

  // ── Forecast ──
  forecast: {
    monthly: (params?: {
      horizon?: number
      historyMonths?: number
      settingId?: string
      tenantNip?: string
    }) =>
      safeCall('GetForecastMonthly', () =>
        DVLP_KSeF_PP_ConnectorService.GetForecastMonthly(
          params?.horizon,
          params?.historyMonths,
          params?.settingId,
          params?.tenantNip
        )
      ),

    byMpk: (params?: {
      horizon?: number
      historyMonths?: number
      settingId?: string
      tenantNip?: string
    }) =>
      safeCall('GetForecastByMpk', () =>
        DVLP_KSeF_PP_ConnectorService.GetForecastByMpk(
          params?.horizon,
          params?.historyMonths,
          params?.settingId,
          params?.tenantNip
        )
      ),

    byCategory: (params?: {
      horizon?: number
      historyMonths?: number
      settingId?: string
      tenantNip?: string
    }) =>
      safeCall('GetForecastByCategory', () =>
        DVLP_KSeF_PP_ConnectorService.GetForecastByCategory(
          params?.horizon,
          params?.historyMonths,
          params?.settingId,
          params?.tenantNip
        )
      ),

    bySupplier: (params?: {
      horizon?: number
      historyMonths?: number
      settingId?: string
      tenantNip?: string
      top?: number
    }) =>
      safeCall('GetForecastBySupplier', () =>
        DVLP_KSeF_PP_ConnectorService.GetForecastBySupplier(
          params?.horizon,
          params?.historyMonths,
          params?.settingId,
          params?.tenantNip,
          params?.top
        )
      ),
  },

  // ── Anomalies (not in connector) ──
  anomalies: {
    list: (_params?: unknown) => notAvailable('anomalies.list'),
    summary: (_params?: unknown) => notAvailable('anomalies.summary'),
  },

  // ── KSeF ──
  ksef: {
    status: (params?: { companyId?: string; nip?: string; environment?: string }) =>
      safeCall('GetKsefStatus', () =>
        DVLP_KSeF_PP_ConnectorService.GetKsefStatus(
          params?.companyId,
          params?.nip,
          params?.environment
        )
      ),
    startSession: (nip?: string) =>
      safeCall('StartKsefSession', () =>
        DVLP_KSeF_PP_ConnectorService.StartKsefSession(
          { nip } as Record<string, unknown>
        )
      ),
    getSession: () =>
      safeCall('GetKsefSession', () =>
        DVLP_KSeF_PP_ConnectorService.GetKsefSession()
      ),
    endSession: () =>
      safeCall('EndKsefSession', () =>
        DVLP_KSeF_PP_ConnectorService.EndKsefSession()
      ),
  },

  // ── Sync ──
  sync: {
    preview: (params?: { nip?: string; dateFrom?: string; dateTo?: string }) =>
      safeCall('GetSyncPreview', () =>
        DVLP_KSeF_PP_ConnectorService.GetSyncPreview(
          params?.nip,
          params?.dateFrom,
          params?.dateTo
        )
      ),

    run: (params?: {
      nip?: string
      settingId?: string
      dateFrom?: string
      dateTo?: string
    }) =>
      safeCall('StartSync', () =>
        DVLP_KSeF_PP_ConnectorService.StartSync(
          params as Record<string, unknown>
        )
      ),

    import: (refNums: string[], nip?: string, settingId?: string) =>
      safeCall('ImportSync', () =>
        DVLP_KSeF_PP_ConnectorService.ImportSync(
          { referenceNumbers: refNums, nip, settingId } as Record<string, unknown>
        )
      ),
  },

  // ── Invoices ──
  invoices: {
    list: async (params?: {
      settingId?: string
      tenantNip?: string
      page?: number
      pageSize?: number
      search?: string
      direction?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const data = await safeCall('ListInvoices', () =>
        DVLP_KSeF_PP_ConnectorService.ListInvoices(
          params?.settingId,
          params?.tenantNip,
          params?.page,
          params?.pageSize,
          params?.search,
          params?.direction,
          params?.status,
          params?.dateFrom,
          params?.dateTo
        )
      ) as unknown
      // UI expects { invoices: Invoice[], count: number }
      if (data && typeof data === 'object' && 'invoices' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { invoices: data, count: data.length }
      }
      console.warn('[Connector] ListInvoices unexpected shape:', data)
      return { invoices: [], count: 0 }
    },

    get: (id: string) =>
      safeCall('GetInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.GetInvoice(id)
      ),

    update: (id: string, data: Record<string, unknown>) =>
      safeCall('UpdateInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateInvoice(id, data)
      ),

    delete: (_id: string) => notAvailable('invoices.delete'),

    markAsPaid: (id: string, paymentDate?: string) =>
      safeCall('UpdateInvoice→markAsPaid', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateInvoice(id, {
          paymentStatus: 'paid',
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        })
      ),

    createManual: async (data: Record<string, unknown>) => {
      const result = await safeCall('CreateManualInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.CreateManualInvoice(data)
      )
      return result as unknown
    },

    // Attachments (not in connector)
    listAttachments: (_id: string) => notAvailable('invoices.listAttachments'),
    uploadAttachment: (_id: string, _data: unknown) =>
      notAvailable('invoices.uploadAttachment'),
    downloadAttachment: (_id: string) =>
      notAvailable('invoices.downloadAttachment'),
    deleteAttachment: (_id: string) =>
      notAvailable('invoices.deleteAttachment'),

    // Notes (not in connector)
    listNotes: (_id: string) => notAvailable('invoices.listNotes'),
    createNote: (_id: string, _data: unknown) =>
      notAvailable('invoices.createNote'),
    getNote: (_id: string) => notAvailable('invoices.getNote'),
    updateNote: (_id: string, _data: unknown) =>
      notAvailable('invoices.updateNote'),
    deleteNote: (_id: string) => notAvailable('invoices.deleteNote'),

    // Documents (not in connector)
    uploadDocument: (_id: string, _data: unknown) =>
      notAvailable('invoices.uploadDocument'),
    downloadDocument: (_id: string) =>
      notAvailable('invoices.downloadDocument'),
    getDocumentStreamUrl: (_id: string) => '',
    deleteDocument: (_id: string) =>
      notAvailable('invoices.deleteDocument'),
    downloadThumbnail: (_id: string) =>
      notAvailable('invoices.downloadThumbnail'),
    uploadThumbnail: (_id: string, _data: unknown) =>
      notAvailable('invoices.uploadThumbnail'),
    getDocumentConfig: () => notAvailable('invoices.getDocumentConfig'),

    // AI Categorization
    categorizeWithAI: (invoiceId: string) =>
      safeCall('AICategorize', () =>
        DVLP_KSeF_PP_ConnectorService.AICategorize({ invoiceId })
      ),
  },

  // ── Settings ──
  settings: {
    listCompanies: async () => {
      // UI expects { settings: KsefSetting[] } — use ListSettings
      const data = await safeCall('ListSettings→listCompanies', () =>
        DVLP_KSeF_PP_ConnectorService.ListSettings()
      )
      // Ensure the response has the { settings: [...] } shape the UI expects
      if (data && typeof data === 'object' && 'settings' in data) {
        return data
      }
      if (Array.isArray(data)) {
        return { settings: data }
      }
      console.warn('[Connector] ListSettings unexpected shape:', data)
      return { settings: [] }
    },

    getCompany: (_id: string) => notAvailable('settings.getCompany'),
    createCompany: (_data: unknown) => notAvailable('settings.createCompany'),
    updateCompany: (_id: string, _data: unknown) =>
      notAvailable('settings.updateCompany'),
    deleteCompany: (_id: string) => notAvailable('settings.deleteCompany'),
    testToken: (_id: string) => notAvailable('settings.testToken'),
    listCostCenters: () => notAvailable('settings.listCostCenters'),
    createCostCenter: (_data: unknown) =>
      notAvailable('settings.createCostCenter'),
    updateCostCenter: (_id: string, _data: unknown) =>
      notAvailable('settings.updateCostCenter'),
    deleteCostCenter: (_id: string) =>
      notAvailable('settings.deleteCostCenter'),
  },

  // ── Dataverse Settings ──
  dvSettings: {
    list: (activeOnly?: boolean) =>
      safeCall('ListSettings→dvSettings', () =>
        DVLP_KSeF_PP_ConnectorService.ListSettings(
          activeOnly ? 'true' : undefined
        )
      ),

    get: (_id: string) => notAvailable('dvSettings.get'),
    create: (_data: unknown) => notAvailable('dvSettings.create'),
    update: (_id: string, _data: unknown) => notAvailable('dvSettings.update'),
    delete: (_id: string) => notAvailable('dvSettings.delete'),
  },

  // ── Dataverse Sessions (not in connector) ──
  dvSessions: {
    list: (_settingId: string, _activeOnly?: boolean) =>
      notAvailable('dvSessions.list'),
    getActive: (_nip: string) => notAvailable('dvSessions.getActive'),
    get: (_id: string) => notAvailable('dvSessions.get'),
    terminate: (_id: string) => notAvailable('dvSessions.terminate'),
    cleanup: () => notAvailable('dvSessions.cleanup'),
  },

  // ── MPK Centers / Approvers / Budget ──
  mpkCenters: {
    list: async (settingId: string) => {
      const data = await safeCall('ListMpkCenters', () =>
        DVLP_KSeF_PP_ConnectorService.ListMpkCenters(settingId)
      ) as unknown
      if (data && typeof data === 'object' && 'mpkCenters' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { mpkCenters: data, count: data.length }
      }
      return { mpkCenters: [], count: 0 }
    },

    get: async (id: string) => {
      const data = await safeCall('GetMpkCenter', () =>
        DVLP_KSeF_PP_ConnectorService.GetMpkCenter(id)
      ) as unknown
      if (data && typeof data === 'object' && 'mpkCenter' in (data as Record<string, unknown>)) {
        return data
      }
      return { mpkCenter: data }
    },

    create: async (data: Record<string, unknown>) => {
      const res = await safeCall('CreateMpkCenter', () =>
        DVLP_KSeF_PP_ConnectorService.CreateMpkCenter(data as unknown as MpkCenterCreate)
      ) as unknown
      if (res && typeof res === 'object' && 'mpkCenter' in (res as Record<string, unknown>)) {
        return res
      }
      return { mpkCenter: res }
    },

    update: async (id: string, data: Record<string, unknown>) => {
      const res = await safeCall('UpdateMpkCenter', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateMpkCenter(id, data as unknown as MpkCenterUpdate)
      ) as unknown
      if (res && typeof res === 'object' && 'mpkCenter' in (res as Record<string, unknown>)) {
        return res
      }
      return { mpkCenter: res }
    },

    deactivate: (id: string) =>
      safeCall('DeactivateMpkCenter', () =>
        DVLP_KSeF_PP_ConnectorService.DeactivateMpkCenter(id)
      ),

    getApprovers: async (id: string) => {
      const data = await safeCall('ListMpkApprovers', () =>
        DVLP_KSeF_PP_ConnectorService.ListMpkApprovers(id)
      ) as unknown
      if (data && typeof data === 'object' && 'approvers' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { approvers: data, count: data.length }
      }
      return { approvers: [], count: 0 }
    },

    setApprovers: async (id: string, systemUserIds: string[]) => {
      const data = await safeCall('SetMpkApprovers', () =>
        DVLP_KSeF_PP_ConnectorService.SetMpkApprovers(id, { systemUserIds })
      ) as unknown
      if (data && typeof data === 'object' && 'approvers' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { approvers: data, count: data.length }
      }
      return { approvers: [], count: 0 }
    },

    getBudgetStatus: async (id: string) => {
      const data = await safeCall('GetMpkBudgetStatus', () =>
        DVLP_KSeF_PP_ConnectorService.GetMpkBudgetStatus(id)
      ) as unknown
      if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
        return data
      }
      return { data }
    },

    applyApproval: (id: string, scope: 'unprocessed' | 'decided' | 'all', dryRun?: boolean) =>
      safeCall('ApplyApprovalToMpk', () =>
        DVLP_KSeF_PP_ConnectorService.ApplyApprovalToMpk(id, { scope, dryRun })
      ),

    revokeApproval: (id: string, scope: 'pending' | 'decided' | 'all', dryRun?: boolean) =>
      safeCall('RevokeApprovalFromMpk', () =>
        DVLP_KSeF_PP_ConnectorService.RevokeApprovalFromMpk(id, { scope, dryRun })
      ),
  },

  // ── Users ──
  users: {
    list: async (_settingId: string) => {
      const data = await safeCall('ListSystemUsers', () =>
        DVLP_KSeF_PP_ConnectorService.ListSystemUsers()
      ) as unknown
      if (data && typeof data === 'object' && 'users' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { users: data, count: data.length }
      }
      return { users: [], count: 0 }
    },
  },

  // ── Approver Overview ──
  approverOverview: {
    get: (settingId: string) =>
      safeCall('GetApproversOverview', () =>
        DVLP_KSeF_PP_ConnectorService.GetApproversOverview(settingId)
      ),
  },

  // ── Budget ──
  budget: {
    summary: async (settingId: string) => {
      const data = await safeCall('GetBudgetSummary', () =>
        DVLP_KSeF_PP_ConnectorService.GetBudgetSummary(settingId)
      ) as unknown
      if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { data, count: data.length }
      }
      return { data: [], count: 0 }
    },
  },

  // ── Notifications ──
  notifications: {
    list: async (settingId: string, options?: { unreadOnly?: boolean; top?: number }) => {
      const data = await safeCall('GetNotifications', () =>
        DVLP_KSeF_PP_ConnectorService.GetNotifications(settingId, options?.unreadOnly, options?.top)
      ) as unknown
      if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { data, count: data.length }
      }
      return { data: [], count: 0 }
    },

    markRead: (id: string) =>
      safeCall('MarkNotificationRead', () =>
        DVLP_KSeF_PP_ConnectorService.MarkNotificationRead(id)
      ),

    dismiss: (id: string) =>
      safeCall('DismissNotification', () =>
        DVLP_KSeF_PP_ConnectorService.DismissNotification(id)
      ),

    markAllRead: (settingId: string) =>
      safeCall('MarkAllNotificationsRead', () =>
        DVLP_KSeF_PP_ConnectorService.MarkAllNotificationsRead(settingId)
      ),

    unreadCount: async (settingId: string) => {
      const data = await safeCall('GetUnreadNotificationCount', () =>
        DVLP_KSeF_PP_ConnectorService.GetUnreadNotificationCount(settingId)
      ) as unknown
      if (data && typeof data === 'object' && 'count' in (data as Record<string, unknown>)) {
        return data
      }
      if (typeof data === 'number') {
        return { count: data }
      }
      return { count: 0 }
    },
  },

  // ── Dataverse Sync ──
  dvSync: {
    start: (data: Record<string, unknown>) =>
      safeCall('StartSync', () =>
        DVLP_KSeF_PP_ConnectorService.StartSync(data)
      ),

    getLogs: (settingId?: string, limit?: number) =>
      safeCall('GetSyncLogs', () =>
        DVLP_KSeF_PP_ConnectorService.GetSyncLogs(settingId, limit)
      ),

    getLog: (_id: string) => notAvailable('dvSync.getLog'),
    getStats: (_settingId: string) => notAvailable('dvSync.getStats'),
  },

  // ── Document Extraction ──
  documents: {
    extract: (data: Record<string, unknown>) =>
      safeCall('ExtractDocument', () =>
        DVLP_KSeF_PP_ConnectorService.ExtractDocument(data)
      ),
  },

  // ── Cost Documents ──
  costDocuments: {
    list: async (params?: {
      settingId?: string
      documentType?: string
      paymentStatus?: string
      approvalStatus?: string
      status?: string
      source?: string
      mpkCenterId?: string
      mpkCenterIds?: string
      category?: string
      fromDate?: string
      toDate?: string
      dueDateFrom?: string
      dueDateTo?: string
      minAmount?: number
      maxAmount?: number
      issuerName?: string
      issuerNip?: string
      search?: string
      top?: number
      skip?: number
      orderBy?: string
      orderDirection?: string
    }) => {
      const data = await safeCall('ListCostDocuments', () =>
        DVLP_KSeF_PP_ConnectorService.ListCostDocuments(
          params?.settingId, params?.documentType, params?.paymentStatus,
          params?.approvalStatus, params?.status, params?.source,
          params?.mpkCenterId, params?.mpkCenterIds, params?.category,
          params?.fromDate, params?.toDate, params?.dueDateFrom, params?.dueDateTo,
          params?.minAmount, params?.maxAmount, params?.issuerName, params?.issuerNip,
          params?.search, params?.top, params?.skip, params?.orderBy, params?.orderDirection
        )
      ) as unknown
      if (data && typeof data === 'object' && 'items' in (data as Record<string, unknown>)) {
        return data
      }
      if (Array.isArray(data)) {
        return { items: data, count: data.length }
      }
      return { items: [], count: 0 }
    },

    get: (id: string) =>
      safeCall('GetCostDocument', () =>
        DVLP_KSeF_PP_ConnectorService.GetCostDocument(id)
      ),

    create: (data: Record<string, unknown>) =>
      safeCall('CreateCostDocument', () =>
        DVLP_KSeF_PP_ConnectorService.CreateCostDocument(data)
      ),

    update: (id: string, data: Record<string, unknown>) =>
      safeCall('UpdateCostDocument', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateCostDocument(id, data)
      ),

    delete: (id: string) =>
      safeCall('DeleteCostDocument', () =>
        DVLP_KSeF_PP_ConnectorService.DeleteCostDocument(id)
      ),

    summary: (settingId: string) =>
      safeCall('GetCostDocumentsSummary', () =>
        DVLP_KSeF_PP_ConnectorService.GetCostDocumentsSummary(settingId)
      ),

    aiCategorize: (data: Record<string, unknown>) =>
      safeCall('AiCategorizeCostDocument', () =>
        DVLP_KSeF_PP_ConnectorService.AiCategorizeCostDocument(data)
      ),

    batchApprove: (ids: string[]) =>
      safeCall('BatchApproveCostDocuments', () =>
        DVLP_KSeF_PP_ConnectorService.BatchApproveCostDocuments({ ids })
      ),

    batchReject: (ids: string[]) =>
      safeCall('BatchRejectCostDocuments', () =>
        DVLP_KSeF_PP_ConnectorService.BatchRejectCostDocuments({ ids })
      ),

    batchMarkPaid: (ids: string[]) =>
      safeCall('BatchMarkPaidCostDocuments', () =>
        DVLP_KSeF_PP_ConnectorService.BatchMarkPaidCostDocuments({ ids })
      ),
  },

  // ── KSeF Testdata ──
  ksefTestdata: {
    getEnvironments: () =>
      safeCall('GetTestdataEnvironments', () =>
        DVLP_KSeF_PP_ConnectorService.GetTestdataEnvironments()
      ),

    checkPermissions: (_nip: string) =>
      notAvailable('ksefTestdata.checkPermissions'),
    grantPermissions: (_data: unknown) =>
      notAvailable('ksefTestdata.grantPermissions'),
    createTestPerson: (_data: unknown) =>
      notAvailable('ksefTestdata.createTestPerson'),

    generate: (data: Record<string, unknown>) =>
      safeCall('GenerateTestData', () =>
        DVLP_KSeF_PP_ConnectorService.GenerateTestData(data)
      ),

    cleanupPreview: (_nip: string, _params?: unknown) =>
      notAvailable('ksefTestdata.cleanupPreview'),
    cleanup: (_data: unknown) => notAvailable('ksefTestdata.cleanup'),
  },

  // ── Exchange Rates ──
  exchangeRates: {
    get: (currency: 'EUR' | 'USD', date?: string) =>
      safeCall('GetExchangeRate', () =>
        DVLP_KSeF_PP_ConnectorService.GetExchangeRate(currency, date)
      ),

    convert: (_amount: number, _currency: string, _date?: string) =>
      notAvailable('exchangeRates.convert'),
  },

  // ── Suppliers ──
  suppliers: {
    list: (params: {
      settingId: string
      status?: string
      search?: string
      hasSelfBillingAgreement?: boolean
      top?: number
      skip?: number
    }) =>
      safeCall('ListSuppliers', () =>
        DVLP_KSeF_PP_ConnectorService.ListSuppliers(
          params.settingId,
          params.status,
          params.search,
          params.hasSelfBillingAgreement,
          params.top,
          params.skip
        )
      ),

    get: (id: string) =>
      safeCall('GetSupplier', () =>
        DVLP_KSeF_PP_ConnectorService.GetSupplier(id)
      ),

    create: (data: Record<string, unknown>) =>
      safeCall('CreateSupplier', () =>
        DVLP_KSeF_PP_ConnectorService.CreateSupplier(data as unknown as SupplierCreate)
      ),

    update: (id: string, data: Record<string, unknown>) =>
      safeCall('UpdateSupplier', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateSupplier(id, data)
      ),

    delete: (id: string) =>
      safeCall('DeleteSupplier', () =>
        DVLP_KSeF_PP_ConnectorService.DeleteSupplier(id)
      ),

    stats: (id: string) =>
      safeCall('GetSupplierStats', () =>
        DVLP_KSeF_PP_ConnectorService.GetSupplierStats(id)
      ),

    refreshStats: (id: string) =>
      safeCall('RefreshSupplierStats', () =>
        DVLP_KSeF_PP_ConnectorService.RefreshSupplierStats(id)
      ),

    invoices: (id: string) =>
      safeCall('GetSupplierInvoices', () =>
        DVLP_KSeF_PP_ConnectorService.GetSupplierInvoices(id)
      ),

    refreshVat: (id: string) =>
      safeCall('RefreshSupplierVat', () =>
        DVLP_KSeF_PP_ConnectorService.RefreshSupplierVat(id)
      ),

    createFromVat: (data: { nip: string; settingId: string }) =>
      safeCall('CreateSupplierFromVat', () =>
        DVLP_KSeF_PP_ConnectorService.CreateSupplierFromVat(data)
      ),
  },

  // ── Self-Billing Agreements ──
  sbAgreements: {
    list: (params?: {
      settingId?: string
      supplierId?: string
      status?: string
      top?: number
      skip?: number
    }) =>
      safeCall('ListSbAgreements', () =>
        DVLP_KSeF_PP_ConnectorService.ListSbAgreements(
          params?.settingId,
          params?.supplierId,
          params?.status,
          params?.top,
          params?.skip
        )
      ),

    get: (id: string) =>
      safeCall('GetSbAgreement', () =>
        DVLP_KSeF_PP_ConnectorService.GetSbAgreement(id)
      ),

    create: (data: Record<string, unknown>) =>
      safeCall('CreateSbAgreement', () =>
        DVLP_KSeF_PP_ConnectorService.CreateSbAgreement(data as unknown as SbAgreementCreate)
      ),

    update: (id: string, data: Record<string, unknown>) =>
      safeCall('UpdateSbAgreement', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateSbAgreement(id, data)
      ),

    terminate: (id: string) =>
      safeCall('TerminateSbAgreement', () =>
        DVLP_KSeF_PP_ConnectorService.TerminateSbAgreement(id)
      ),

    listAttachments: (id: string) =>
      safeCall('ListSbAgreementAttachments', () =>
        DVLP_KSeF_PP_ConnectorService.ListSbAgreementAttachments(id)
      ),

    uploadAttachment: (id: string, data: Record<string, unknown>) =>
      safeCall('UploadSbAgreementAttachment', () =>
        DVLP_KSeF_PP_ConnectorService.UploadSbAgreementAttachment(id, data)
      ),
  },

  // ── Self-Billing Templates ──
  sbTemplates: {
    list: (params: {
      settingId: string
      supplierId?: string
      isActive?: boolean
    }) =>
      safeCall('ListSbTemplates', () =>
        DVLP_KSeF_PP_ConnectorService.ListSbTemplates(
          params.settingId,
          params.supplierId,
          params.isActive
        )
      ),

    get: (id: string) =>
      safeCall('GetSbTemplate', () =>
        DVLP_KSeF_PP_ConnectorService.GetSbTemplate(id)
      ),

    create: (data: Record<string, unknown>) =>
      safeCall('CreateSbTemplate', () =>
        DVLP_KSeF_PP_ConnectorService.CreateSbTemplate(data as unknown as SbTemplateCreate)
      ),

    update: (id: string, data: Record<string, unknown>) =>
      safeCall('UpdateSbTemplate', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateSbTemplate(id, data)
      ),

    delete: (id: string) =>
      safeCall('DeleteSbTemplate', () =>
        DVLP_KSeF_PP_ConnectorService.DeleteSbTemplate(id)
      ),

    duplicate: (data: { templateId: string; targetSupplierId: string }) =>
      safeCall('DuplicateSbTemplate', () =>
        DVLP_KSeF_PP_ConnectorService.DuplicateSbTemplate(data)
      ),
  },

  // ── Self-Billing Invoices ──
  selfBillingInvoices: {
    list: (params?: {
      settingId?: string
      supplierId?: string
      status?: string
      dateFrom?: string
      dateTo?: string
      top?: number
      skip?: number
    }) =>
      safeCall('ListSelfBillingInvoices', () =>
        DVLP_KSeF_PP_ConnectorService.ListSelfBillingInvoices(
          params?.settingId,
          params?.supplierId,
          params?.status,
          params?.dateFrom,
          params?.dateTo,
          params?.top,
          params?.skip
        )
      ),

    create: (data: Record<string, unknown>) =>
      safeCall('CreateSelfBillingInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.CreateSelfBillingInvoice(data as unknown as SelfBillingInvoiceCreate)
      ),

    preview: (data: Record<string, unknown>) =>
      safeCall('PreviewSelfBillingInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.PreviewSelfBillingInvoice(data as unknown as SelfBillingInvoiceCreate)
      ),

    generate: (data: Record<string, unknown>) =>
      safeCall('GenerateSelfBillingInvoices', () =>
        DVLP_KSeF_PP_ConnectorService.GenerateSelfBillingInvoices(data as unknown as SelfBillingGenerateRequest)
      ),

    confirmGenerated: (data: Record<string, unknown>) =>
      safeCall('ConfirmGeneratedSelfBilling', () =>
        DVLP_KSeF_PP_ConnectorService.ConfirmGeneratedSelfBilling(data)
      ),

    batch: (data: Record<string, unknown>) =>
      safeCall('BatchCreateSelfBillingInvoices', () =>
        DVLP_KSeF_PP_ConnectorService.BatchCreateSelfBillingInvoices(data)
      ),

    updateStatus: (id: string, data: { status: string }) =>
      safeCall('UpdateSelfBillingStatus', () =>
        DVLP_KSeF_PP_ConnectorService.UpdateSelfBillingStatus(id, data)
      ),

    submit: (id: string) =>
      safeCall('SubmitForSellerReview', () =>
        DVLP_KSeF_PP_ConnectorService.SubmitForSellerReview(id)
      ),

    approve: (id: string) =>
      safeCall('SellerApproveInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.SellerApproveInvoice(id)
      ),

    reject: (id: string, data: { reason: string }) =>
      safeCall('SellerRejectInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.SellerRejectInvoice(id, data)
      ),

    sendToKsef: (id: string) =>
      safeCall('SendSelfBillingToKsef', () =>
        DVLP_KSeF_PP_ConnectorService.SendSelfBillingToKsef(id)
      ),

    get: (id: string) =>
      safeCall('GetSelfBillingInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.GetSelfBillingInvoice(id)
      ),

    revertToDraft: (id: string, reason: string) =>
      safeCall('RevertSelfBillingInvoice', () =>
        DVLP_KSeF_PP_ConnectorService.RevertSelfBillingInvoice(id, { reason })
      ),

    batchSubmit: (invoiceIds: string[]) =>
      safeCall('SbBatchSubmit', () =>
        DVLP_KSeF_PP_ConnectorService.SbBatchSubmit({ invoiceIds })
      ),

    batchApprove: (invoiceIds: string[]) =>
      safeCall('SbBatchApprove', () =>
        DVLP_KSeF_PP_ConnectorService.SbBatchApprove({ invoiceIds })
      ),

    batchReject: (invoiceIds: string[], reason: string) =>
      safeCall('SbBatchReject', () =>
        DVLP_KSeF_PP_ConnectorService.SbBatchReject({ invoiceIds, reason })
      ),

    batchSendToKsef: (invoiceIds: string[]) =>
      safeCall('SbBatchSendKsef', () =>
        DVLP_KSeF_PP_ConnectorService.SbBatchSendKsef({ invoiceIds })
      ),

    batchDelete: (invoiceIds: string[]) =>
      safeCall('SbBatchDelete', () =>
        DVLP_KSeF_PP_ConnectorService.SbBatchDelete({ invoiceIds })
      ),

    listNotes: (sbInvoiceId: string) =>
      safeCall('ListSbInvoiceNotes', () =>
        DVLP_KSeF_PP_ConnectorService.ListSbInvoiceNotes(sbInvoiceId)
      ),

    createNote: (sbInvoiceId: string, data: Record<string, unknown>) =>
      safeCall('CreateSbInvoiceNote', () =>
        DVLP_KSeF_PP_ConnectorService.CreateSbInvoiceNote(sbInvoiceId, data)
      ),

    updateNote: (_noteId: string, _data: Record<string, unknown>) =>
      notAvailable('updateNote (self-billing)'),

    deleteNote: (_noteId: string) =>
      notAvailable('deleteNote (self-billing)'),
  },

  // ── Self-Billing Import ──
  sbImport: {
    import: (settingId: string, data: Record<string, unknown>) =>
      safeCall('ImportSelfBillingFile', () =>
        DVLP_KSeF_PP_ConnectorService.ImportSelfBillingFile(settingId, data)
      ),

    confirm: (data: { importId: string }) =>
      safeCall('ConfirmSelfBillingImport', () =>
        DVLP_KSeF_PP_ConnectorService.ConfirmSelfBillingImport(data)
      ),

    downloadTemplate: (format?: string) =>
      safeCall('DownloadSelfBillingTemplate', () =>
        DVLP_KSeF_PP_ConnectorService.DownloadSelfBillingTemplate(format)
      ),
  },
}
