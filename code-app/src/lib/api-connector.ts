/**
 * API adapter for Power Apps Code App context.
 *
 * When running inside Power Apps, routes API calls through the
 * DVLP-KSeF-PP-Connector (Power Platform custom connector) via SDK.
 * When running standalone, falls back to direct fetch (MSAL auth).
 *
 * The connector covers ~15 core operations. Operations without a
 * connector match throw a descriptive error.
 */

console.log('[api-connector] Module loading...')

import { DVLP_KSeF_PP_ConnectorService } from '@/generated'

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

  // ── Forecast (not in connector) ──
  forecast: {
    monthly: (_params?: unknown) => notAvailable('forecast.monthly'),
    byMpk: (_params?: unknown) => notAvailable('forecast.byMpk'),
    byCategory: (_params?: unknown) => notAvailable('forecast.byCategory'),
    bySupplier: (_params?: unknown) => notAvailable('forecast.bySupplier'),
  },

  // ── Anomalies (not in connector) ──
  anomalies: {
    list: (_params?: unknown) => notAvailable('anomalies.list'),
    summary: (_params?: unknown) => notAvailable('anomalies.summary'),
  },

  // ── KSeF (not in connector) ──
  ksef: {
    status: (_params?: unknown) => notAvailable('ksef.status'),
    startSession: (_nip?: string) => notAvailable('ksef.startSession'),
    getSession: () => notAvailable('ksef.getSession'),
    endSession: () => notAvailable('ksef.endSession'),
  },

  // ── Sync ──
  sync: {
    preview: (_params?: unknown) => notAvailable('sync.preview'),

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

    import: (_refNums: string[], _nip?: string, _settingId?: string) =>
      notAvailable('sync.import'),
  },

  // ── Invoices ──
  invoices: {
    list: async (params?: {
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
}
