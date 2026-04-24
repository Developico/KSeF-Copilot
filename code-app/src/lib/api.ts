/**
 * API client for direct communication with Azure Functions backend.
 *
 * Acquires Bearer tokens via MSAL (@azure/msal-browser) and calls the
 * same Azure Functions API as the web project.
 *
 * Environment variables (Vite):
 *   VITE_API_BASE_URL  — Azure Functions base URL (e.g. https://ksef-api.azurewebsites.net)
 *   VITE_AZURE_CLIENT_ID — Entra ID App Registration client ID
 *   VITE_AZURE_TENANT_ID — Entra ID tenant ID
 *   VITE_API_SCOPE — API scope (e.g. api://your-client-id-.../access_as_user)
 */

import { getMsalInstance, apiScopes, isAuthConfigured } from './auth-config'
import { isPowerAppsHost } from './power-apps-host'
import type {
  // Dashboard
  DashboardStats,
  // Forecast
  ForecastResult,
  ForecastParams,
  GroupedForecastResponse,
  ForecastAlgorithmsResponse,
  // Anomalies
  AnomalyResult,
  AnomalySummary,
  AnomalyParams,
  AnomalyRulesResponse,
  // Invoices
  Invoice,
  InvoiceListResponse,
  InvoiceListParams,
  InvoiceUpdateData,
  ManualInvoiceCreate,
  // KSeF
  KsefStatus,
  KsefSession,
  // Sync
  SyncPreviewResponse,
  SyncResult,
  // Settings
  KsefSetting,
  CostCenter,
  TokenTestResult,
  // Health
  DetailedHealthResponse,
  // VAT White List
  VatLookupResponse,
  VatValidateResponse,
  VatCheckResponse,
  // Attachments
  Attachment,
  AttachmentUpload,
  // Notes
  Note,
  NoteCreate,
  NoteUpdate,
  // Documents
  DocumentInfo,
  DocumentUpload,
  DocumentDownload,
  DocumentConfig,
  // AI
  AiCategorizationResult,
  AiBatchCategorizationResult,
  // Exchange
  ExchangeRateResponse,
  ConversionResponse,
  // Dataverse
  DvSetting,
  DvSettingCreate,
  DvSettingUpdate,
  DvSession,
  DvSyncLog,
  DvSyncStart,
  DvSyncResult,
  DvSyncStats,
  // Document extraction
  DocumentExtractRequest,
  ExtractionResult,
  CostDocumentExtractionResult,
  // KSeF Testdata
  KsefTestdataEnvironmentsResponse,
  KsefTestdataPermissionsResponse,
  KsefGrantPermissionsRequest,
  KsefGrantPermissionsResponse,
  KsefCreateTestPersonRequest,
  KsefCreateTestPersonResponse,
  KsefGenerateTestDataRequest,
  KsefGenerateTestDataResponse,
  KsefGenerateCostDocsRequest,
  KsefGenerateCostDocsResponse,
  KsefCleanupPreviewResponse,
  KsefCleanupRequest,
  KsefCleanupResponse,
  // MPK / Budget / Approval / Notifications
  MpkCenter,
  MpkCenterCreate,
  MpkCenterUpdate,
  MpkApprover,
  DvSystemUser,
  BudgetStatus,
  BudgetUtilizationReport,
  PendingApproval,
  ApprovalHistoryReport,
  ApproverPerformanceReport,
  ProcessingPipelineReport,
  CostDistributionReport,
  AppNotification,
  // Self-Billing
  Supplier,
  SupplierListParams,
  SupplierListResponse,
  SupplierDetailStats,
  SbAgreement,
  SbAgreementListResponse,
  SbTemplate,
  SbTemplateListResponse,
  SelfBillingInvoice,
  SelfBillingInvoiceListParams,
  SelfBillingInvoiceListResponse,
  SelfBillingGenerateRequest,
  SelfBillingGeneratePreview,
  SelfBillingGenerateResponse,
  SelfBillingConfirmRequest,
  SelfBillingBatchResult,
  BatchActionResult,
  SelfBillingImportResult,
  SelfBillingImportConfirmResult,
  SbImportEnrichedRow,
  SupplierImportResult,
  SupplierImportConfirmResult,
  SupplierImportEnrichedRow,
  // Cost Documents
  CostDocument,
  CostDocumentCreate,
  CostDocumentUpdate,
  CostDocumentListParams,
  CostDocumentListResponse,
} from './types'

// Re-export all types so consumers can import from '@/lib/api'
export type * from './types'

// ─── Config ──────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// ─── Token acquisition ──────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  // In Power Apps host, auth is managed by the platform — no MSAL token needed.
  // API calls from Code Apps are proxied through the host session.
  if (isPowerAppsHost()) return null

  if (!isAuthConfigured()) return null
  if (apiScopes.scopes.length === 0) return null

  try {
    const msalInstance = getMsalInstance()
    const accounts = msalInstance.getAllAccounts()
    if (accounts.length === 0) return null

    const response = await msalInstance.acquireTokenSilent({
      ...apiScopes,
      account: accounts[0],
    })
    return response.accessToken
  } catch (error) {
    console.error('Failed to acquire token:', error)
    return null
  }
}

// ─── Generic fetch wrapper ──────────────────────────────────────

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | string[]>
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options

  let url = `${API_BASE_URL}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value))
      }
    })
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  const token = await getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }))
    const details = (errorBody as { details?: unknown }).details
    const detailsText = details
      ? typeof details === 'string'
        ? details
        : JSON.stringify(details)
      : ''
    throw new Error(
      detailsText
        ? `${(errorBody as { error?: string }).error || `API error: ${response.status}`}: ${detailsText}`
        : (errorBody as { error?: string }).error || `API error: ${response.status}`
    )
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

// ─── Dual-mode API ──────────────────────────────────────────────
// In Power Apps host → connector-based API (SDK calls through custom connector)
// In standalone mode → direct fetch API (MSAL tokens + HTTP)

// Lazy-load connector API to avoid static class initialization errors
// at module parse time. The generated DVLP_KSeF_PP_ConnectorService has
// `static readonly client = getClient(...)` which runs immediately on import.
let _connectorApi: typeof _directApi | null = null
let _connectorLoadAttempted = false

async function getConnectorApi(): Promise<typeof _directApi> {
  if (_connectorApi) return _connectorApi
  if (_connectorLoadAttempted) {
    throw new Error('[KSeF] Connector API failed to load previously')
  }
  _connectorLoadAttempted = true
  try {
    console.log('[KSeF] Loading connector API module...')
    const mod = await import('./api-connector')
    _connectorApi = mod.connectorApi as unknown as typeof _directApi
    console.log('[KSeF] Connector API loaded successfully', _connectorApi ? 'OK' : 'UNDEFINED')
    return _connectorApi
  } catch (err) {
    console.error('[KSeF] FAILED to load connector API module:', err)
    throw err
  }
}

const _directApi = {
  // ── Health ──
  health: () => apiFetch<{ status: string }>('/api/health'),

  healthDetailed: (environment?: string) =>
    apiFetch<DetailedHealthResponse>('/api/health/detailed', {
      params: environment ? { environment } : undefined,
    }),

  // ── VAT White List ──
  vat: {
    lookup: (params: { nip?: string; regon?: string }) =>
      apiFetch<VatLookupResponse>('/api/vat/lookup', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    validate: (nip: string) =>
      apiFetch<VatValidateResponse>(`/api/vat/validate/${nip}`),

    checkAccount: (nip: string, account: string) =>
      apiFetch<VatCheckResponse>('/api/vat/check-account', {
        method: 'POST',
        body: JSON.stringify({ nip, account }),
      }),
  },

  // ── Dashboard ──
  dashboard: {
    stats: (params?: {
      fromDate?: string
      toDate?: string
      tenantNip?: string
      settingId?: string
    }) => apiFetch<DashboardStats>('/api/dashboard/stats', { params }),
  },

  // ── Forecast ──
  forecast: {
    monthly: (params?: ForecastParams) =>
      apiFetch<ForecastResult>('/api/forecast/monthly', {
        params: params as FetchOptions['params'],
      }),

    byMpk: (params?: ForecastParams) =>
      apiFetch<GroupedForecastResponse>('/api/forecast/by-mpk', {
        params: params as FetchOptions['params'],
      }),

    byCategory: (params?: ForecastParams) =>
      apiFetch<GroupedForecastResponse>('/api/forecast/by-category', {
        params: params as FetchOptions['params'],
      }),

    bySupplier: (params?: ForecastParams & { top?: number }) =>
      apiFetch<GroupedForecastResponse>('/api/forecast/by-supplier', {
        params: params as FetchOptions['params'],
      }),

    algorithms: () =>
      apiFetch<ForecastAlgorithmsResponse>('/api/forecast/algorithms'),
  },

  // ── Anomalies ──
  anomalies: {
    list: (params?: AnomalyParams) =>
      apiFetch<AnomalyResult>('/api/anomalies', {
        params: params as FetchOptions['params'],
      }),

    summary: (params?: AnomalyParams) =>
      apiFetch<AnomalySummary>('/api/anomalies/summary', {
        params: params as FetchOptions['params'],
      }),

    rules: () =>
      apiFetch<AnomalyRulesResponse>('/api/anomalies/rules'),
  },

  // ── KSeF ──
  ksef: {
    status: (params?: {
      companyId?: string
      nip?: string
      environment?: string
    }) => apiFetch<KsefStatus>('/api/ksef/status', { params }),

    startSession: (nip?: string) =>
      apiFetch<{ success: boolean; session: KsefSession }>(
        '/api/ksef/session',
        { method: 'POST', body: JSON.stringify({ nip }) }
      ),

    getSession: () =>
      apiFetch<{ session: KsefSession | null }>('/api/ksef/session'),

    endSession: () =>
      apiFetch<{ success: boolean }>('/api/ksef/session', {
        method: 'DELETE',
      }),
  },

  // ── Sync (KSeF) ──
  sync: {
    preview: (params?: {
      nip?: string
      settingId?: string
      dateFrom?: string
      dateTo?: string
    }) => apiFetch<SyncPreviewResponse>('/api/ksef/sync/preview', { params }),

    run: (params?: {
      nip?: string
      settingId?: string
      dateFrom?: string
      dateTo?: string
    }) =>
      apiFetch<SyncResult>('/api/ksef/sync', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    import: (
      referenceNumbers: string[],
      nip?: string,
      settingId?: string
    ) =>
      apiFetch<SyncResult>('/api/ksef/sync/import', {
        method: 'POST',
        body: JSON.stringify({ referenceNumbers, nip, settingId }),
      }),
  },

  // ── Invoices ──
  invoices: {
    list: (params?: InvoiceListParams) =>
      apiFetch<InvoiceListResponse>('/api/invoices', {
        params: params as Record<
          string,
          string | number | boolean | undefined
        >,
      }),

    get: (id: string) => apiFetch<Invoice>(`/api/invoices/${id}`),

    update: (id: string, data: InvoiceUpdateData) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/api/invoices/${id}`, { method: 'DELETE' }),

    markAsPaid: (id: string, paymentDate?: string) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentDate:
            paymentDate || new Date().toISOString().split('T')[0],
        }),
      }),

    createManual: (data: ManualInvoiceCreate) =>
      apiFetch<Invoice>('/api/invoices/manual', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // ── Attachments ──
    listAttachments: (invoiceId: string) =>
      apiFetch<{ attachments: Attachment[]; count: number }>(
        `/api/invoices/${invoiceId}/attachments`
      ),

    uploadAttachment: (invoiceId: string, data: AttachmentUpload) =>
      apiFetch<Attachment>(`/api/invoices/${invoiceId}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    downloadAttachment: (attachmentId: string) =>
      apiFetch<{ content: string }>(
        `/api/attachments/${attachmentId}/download`
      ),

    deleteAttachment: (attachmentId: string) =>
      apiFetch<void>(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      }),

    // ── Notes ──
    listNotes: (invoiceId: string) =>
      apiFetch<{ notes: Note[]; count: number }>(
        `/api/invoices/${invoiceId}/notes`
      ),

    createNote: (invoiceId: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/invoices/${invoiceId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getNote: (noteId: string) => apiFetch<Note>(`/api/notes/${noteId}`),

    updateNote: (noteId: string, data: NoteUpdate) =>
      apiFetch<Note>(`/api/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteNote: (noteId: string) =>
      apiFetch<void>(`/api/notes/${noteId}`, { method: 'DELETE' }),

    // ── Document (invoice scan/PDF) ──
    uploadDocument: (invoiceId: string, data: DocumentUpload) =>
      apiFetch<{ success: boolean; document: DocumentInfo }>(
        `/api/invoices/${invoiceId}/document`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),

    downloadDocument: (invoiceId: string) =>
      apiFetch<DocumentDownload>(`/api/invoices/${invoiceId}/document`),

    getDocumentStreamUrl: (invoiceId: string) =>
      `${API_BASE_URL}/api/invoices/${invoiceId}/document/stream`,

    deleteDocument: (invoiceId: string) =>
      apiFetch<{ success: boolean }>(
        `/api/invoices/${invoiceId}/document`,
        { method: 'DELETE' }
      ),

    downloadThumbnail: (invoiceId: string) =>
      apiFetch<{ content: string; mimeType: string }>(
        `/api/invoices/${invoiceId}/document/thumbnail`
      ),

    uploadThumbnail: (
      invoiceId: string,
      data: { content: string; mimeType?: string }
    ) =>
      apiFetch<{ success: boolean }>(
        `/api/invoices/${invoiceId}/document/thumbnail`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),

    getDocumentConfig: () =>
      apiFetch<DocumentConfig>('/api/documents/config'),

    // ── AI Categorization ──
    categorizeWithAI: (invoiceId: string) =>
      apiFetch<AiCategorizationResult>('/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      }),

    batchCategorizeWithAI: (invoiceIds: string[], autoApply = false) =>
      apiFetch<AiBatchCategorizationResult>('/api/ai/batch-categorize', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds, autoApply }),
      }),
    batchMarkPaid: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds }),
      }),
    batchMarkUnpaid: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/mark-unpaid', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds }),
      }),
    batchApprove: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/approve', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds }),
      }),
    batchReject: (invoiceIds: string[], comment: string) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/reject', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds, comment }),
      }),
    batchDelete: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/delete', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds }),
      }),
  },

  // ── Settings ──
  settings: {
    listCompanies: () =>
      apiFetch<{ settings: KsefSetting[] }>('/api/settings'),

    getCompany: (id: string) =>
      apiFetch<KsefSetting>(`/api/settings/${id}`),

    createCompany: (data: {
      nip: string
      companyName: string
      environment: 'test' | 'demo' | 'production'
      isActive?: boolean
      autoSync?: boolean
      syncInterval?: number
    }) =>
      apiFetch<KsefSetting>('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateCompany: (id: string, data: Partial<KsefSetting>) =>
      apiFetch<KsefSetting>(`/api/settings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteCompany: (id: string) =>
      apiFetch<void>(`/api/settings/${id}`, { method: 'DELETE' }),

    testToken: (id: string) =>
      apiFetch<TokenTestResult>(`/api/settings/${id}/test-token`, {
        method: 'POST',
      }),

    listCostCenters: () =>
      apiFetch<{ costCenters: CostCenter[] }>(
        '/api/settings/costcenters'
      ),

    createCostCenter: (data: { code: string; name: string }) =>
      apiFetch<CostCenter>('/api/settings/costcenters', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateCostCenter: (id: string, data: Partial<CostCenter>) =>
      apiFetch<CostCenter>(`/api/settings/costcenters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteCostCenter: (id: string) =>
      apiFetch<void>(`/api/settings/costcenters/${id}`, {
        method: 'DELETE',
      }),
  },

  // ── Dataverse Settings ──
  dvSettings: {
    list: (activeOnly?: boolean) =>
      apiFetch<{ settings: DvSetting[]; count: number }>('/api/settings', {
        params: activeOnly ? { activeOnly: true } : undefined,
      }),

    get: (id: string) => apiFetch<DvSetting>(`/api/settings/${id}`),

    create: (data: DvSettingCreate) =>
      apiFetch<DvSetting>('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: DvSettingUpdate) =>
      apiFetch<DvSetting>(`/api/settings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<{ message: string; id: string }>(`/api/settings/${id}`, {
        method: 'DELETE',
      }),
  },

  // ── Dataverse Sessions ──
  dvSessions: {
    list: (settingId: string, activeOnly?: boolean) =>
      apiFetch<{ sessions: DvSession[]; count: number }>('/api/sessions', {
        params: {
          settingId,
          ...(activeOnly ? { activeOnly: true } : {}),
        },
      }),

    getActive: (nip: string) =>
      apiFetch<{ active: boolean; session: DvSession | null }>(
        `/api/sessions/active/${nip}`
      ),

    get: (id: string) => apiFetch<DvSession>(`/api/sessions/${id}`),

    terminate: (id: string) =>
      apiFetch<{ message: string; id: string }>(
        `/api/sessions/${id}/terminate`,
        { method: 'POST' }
      ),

    cleanup: () =>
      apiFetch<{ message: string; expiredCount: number }>(
        '/api/sessions/cleanup',
        { method: 'POST' }
      ),
  },

  // ── Dataverse Sync ──
  dvSync: {
    start: (data: DvSyncStart) =>
      apiFetch<DvSyncResult>('/api/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getLogs: (settingId?: string, limit?: number) =>
      apiFetch<{ logs: DvSyncLog[]; count: number }>('/api/sync/logs', {
        params: { settingId, limit } as Record<
          string,
          string | number | boolean | undefined
        >,
      }),

    getLog: (id: string) => apiFetch<DvSyncLog>(`/api/sync/logs/${id}`),

    getStats: (settingId: string) =>
      apiFetch<DvSyncStats>(`/api/sync/stats/${settingId}`),
  },

  // ── Document Extraction ──
  documents: {
    extract: (data: DocumentExtractRequest) =>
      apiFetch<ExtractionResult>('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    extractCost: (data: DocumentExtractRequest) =>
      apiFetch<CostDocumentExtractionResult>('/api/documents/extract-cost', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── KSeF Testdata ──
  ksefTestdata: {
    getEnvironments: () =>
      apiFetch<KsefTestdataEnvironmentsResponse>(
        '/api/ksef/testdata/environments'
      ),

    checkPermissions: (nip: string) =>
      apiFetch<KsefTestdataPermissionsResponse>(
        '/api/ksef/testdata/permissions',
        { params: { nip } }
      ),

    grantPermissions: (data: KsefGrantPermissionsRequest) =>
      apiFetch<KsefGrantPermissionsResponse>(
        '/api/ksef/testdata/permissions',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    createTestPerson: (data: KsefCreateTestPersonRequest) =>
      apiFetch<KsefCreateTestPersonResponse>(
        '/api/ksef/testdata/person',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    generate: (data: KsefGenerateTestDataRequest) =>
      apiFetch<KsefGenerateTestDataResponse>(
        '/api/ksef/testdata/generate',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    generateCosts: (data: KsefGenerateCostDocsRequest) =>
      apiFetch<KsefGenerateCostDocsResponse>(
        '/api/ksef/testdata/generate-costs',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    cleanupPreview: (
      nip: string,
      params?: {
        fromDate?: string
        toDate?: string
        source?: 'KSeF' | 'Manual'
      }
    ) =>
      apiFetch<KsefCleanupPreviewResponse>(
        '/api/ksef/testdata/cleanup/preview',
        { params: { nip, ...params } }
      ),

    cleanup: (data: KsefCleanupRequest) =>
      apiFetch<KsefCleanupResponse>('/api/ksef/testdata/cleanup', {
        method: 'DELETE',
        body: JSON.stringify(data),
      }),
  },

  // ── Exchange Rates (NBP) ──
  exchangeRates: {
    get: (currency: 'EUR' | 'USD', date?: string) =>
      apiFetch<ExchangeRateResponse>('/api/exchange-rates', {
        params: { currency, date },
      }),

    convert: (amount: number, currency: 'EUR' | 'USD', date?: string) =>
      apiFetch<ConversionResponse>('/api/exchange-rates/convert', {
        method: 'POST',
        body: JSON.stringify({ amount, currency, date }),
      }),
  },

  // ── MPK Centers ──
  mpkCenters: {
    list: (settingId: string) =>
      apiFetch<{ mpkCenters: MpkCenter[]; count: number }>(
        `/api/mpk-centers?settingId=${settingId}`
      ),

    get: (id: string) =>
      apiFetch<{ mpkCenter: MpkCenter }>(`/api/mpk-centers/${id}`),

    create: (data: MpkCenterCreate) =>
      apiFetch<{ mpkCenter: MpkCenter }>('/api/mpk-centers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: MpkCenterUpdate) =>
      apiFetch<{ mpkCenter: MpkCenter }>(`/api/mpk-centers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deactivate: (id: string) =>
      apiFetch<{ message: string }>(`/api/mpk-centers/${id}`, {
        method: 'DELETE',
      }),

    getApprovers: (id: string) =>
      apiFetch<{ approvers: MpkApprover[]; count: number }>(
        `/api/mpk-centers/${id}/approvers`
      ),

    setApprovers: (id: string, systemUserIds: string[]) =>
      apiFetch<{ approvers: MpkApprover[]; count: number }>(
        `/api/mpk-centers/${id}/approvers`,
        { method: 'PUT', body: JSON.stringify({ systemUserIds }) }
      ),

    getBudgetStatus: (id: string) =>
      apiFetch<{ data: BudgetStatus }>(`/api/mpk-centers/${id}/budget-status`),

    applyApproval: (id: string, scope: 'unprocessed' | 'decided' | 'all', dryRun?: boolean) =>
      apiFetch<{ updated: number; skipped: number; autoApproved: number; total: number; dryRun: boolean }>(
        `/api/mpk-centers/${id}/apply-approval`,
        { method: 'POST', body: JSON.stringify({ scope, dryRun }) }
      ),

    revokeApproval: (id: string, scope: 'pending' | 'decided' | 'all', dryRun?: boolean) =>
      apiFetch<{ updated: number; skipped: number; autoApproved: number; total: number; dryRun: boolean }>(
        `/api/mpk-centers/${id}/revoke-approval`,
        { method: 'POST', body: JSON.stringify({ scope, dryRun }) }
      ),
  },

  // ── Users ──
  users: {
    list: (settingId: string) =>
      apiFetch<{ users: DvSystemUser[]; count: number }>(
        `/api/users?settingId=${settingId}`
      ),
  },

  // ── Approver Overview ──
  approverOverview: {
    get: (settingId: string) =>
      apiFetch<{
        members: Array<{
          id: string
          displayName: string
          email: string
          hasDataverseAccount: boolean
          mpkCenterNames: string[]
          supplierCount: number
        }>
        configured: boolean
        count: number
      }>(`/api/approvers/overview?settingId=${settingId}`),
  },

  // ── Approvals ──
  approvals: {
    pending: (settingId: string) => {
      const params = new URLSearchParams({ settingId })
      return apiFetch<{ approvals: PendingApproval[]; count: number }>(
        `/api/approvals/pending?${params}`
      )
    },

    approve: (invoiceId: string, comment?: string) =>
      apiFetch<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),

    reject: (invoiceId: string, comment?: string) =>
      apiFetch<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),

    cancelApproval: (invoiceId: string) =>
      apiFetch<{ invoice: Invoice }>(
        `/api/invoices/${invoiceId}/cancel-approval`,
        { method: 'POST' }
      ),

    bulkApprove: (invoiceIds: string[], comment?: string) =>
      apiFetch<{
        results: Array<{ invoiceId: string; success: boolean; error?: string }>
      }>('/api/invoices/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds, comment }),
      }),

    refreshApprovers: (invoiceId: string) =>
      apiFetch<{ message: string }>(
        `/api/invoices/${invoiceId}/refresh-approvers`,
        { method: 'POST' }
      ),
  },

  // ── Budget ──
  budget: {
    summary: (settingId: string) =>
      apiFetch<{ data: BudgetStatus[]; count: number }>(
        `/api/budget/summary?settingId=${settingId}`
      ),
  },

  // ── Notifications ──
  notifications: {
    list: (
      settingId: string,
      options?: { unreadOnly?: boolean; top?: number }
    ) => {
      const params = new URLSearchParams({ settingId })
      if (options?.unreadOnly) params.append('unreadOnly', 'true')
      if (options?.top) params.append('top', String(options.top))
      return apiFetch<{ data: AppNotification[]; count: number }>(
        `/api/notifications?${params}`
      )
    },

    markRead: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    dismiss: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/notifications/${id}/dismiss`, {
        method: 'POST',
      }),

    markAllRead: (settingId: string) =>
      apiFetch<{ success: boolean; marked: number }>(
        `/api/notifications/mark-all-read?settingId=${encodeURIComponent(settingId)}`,
        { method: 'POST' }
      ),

    unreadCount: (settingId: string) =>
      apiFetch<{ count: number }>(
        `/api/notifications/unread-count?settingId=${settingId}`
      ),
  },

  // ── Reports ──
  reports: {
    budgetUtilization: (settingId: string, mpkCenterId?: string) => {
      const params = new URLSearchParams({ settingId })
      if (mpkCenterId) params.append('mpkCenterId', mpkCenterId)
      return apiFetch<{ data: BudgetUtilizationReport }>(
        `/api/reports/budget-utilization?${params}`
      )
    },

    approvalHistory: (
      settingId: string,
      filters?: {
        dateFrom?: string
        dateTo?: string
        mpkCenterId?: string
        status?: string
      }
    ) => {
      const params = new URLSearchParams({ settingId })
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.append('dateTo', filters.dateTo)
      if (filters?.mpkCenterId)
        params.append('mpkCenterId', filters.mpkCenterId)
      if (filters?.status) params.append('status', filters.status)
      return apiFetch<{ data: ApprovalHistoryReport }>(
        `/api/reports/approval-history?${params}`
      )
    },

    approverPerformance: (settingId: string) =>
      apiFetch<{ data: ApproverPerformanceReport }>(
        `/api/reports/approver-performance?settingId=${settingId}`
      ),

    invoiceProcessing: (settingId: string) =>
      apiFetch<{ data: ProcessingPipelineReport }>(
        `/api/reports/invoice-processing?settingId=${settingId}`
      ),

    costDistribution: (settingId: string) =>
      apiFetch<{ data: CostDistributionReport }>(
        `/api/reports/cost-distribution?settingId=${settingId}`
      ),
  },

  // ── Suppliers ──
  suppliers: {
    list: (params?: SupplierListParams) => {
      const qs = new URLSearchParams()
      if (params?.settingId) qs.append('settingId', params.settingId)
      if (params?.status) qs.append('status', params.status)
      if (params?.search) qs.append('search', params.search)
      if (params?.top) qs.append('top', String(params.top))
      if (params?.skip) qs.append('skip', String(params.skip))
      return apiFetch<SupplierListResponse>(`/api/suppliers?${qs}`)
    },

    get: (id: string) => apiFetch<{ supplier: Supplier }>(`/api/suppliers/${id}`),

    create: (data: Partial<Supplier>) =>
      apiFetch<{ supplier: Supplier }>('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Supplier>) =>
      apiFetch<{ supplier: Supplier }>(`/api/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/suppliers/${id}`, {
        method: 'DELETE',
      }),

    stats: (id: string) =>
      apiFetch<{ stats: SupplierDetailStats }>(`/api/suppliers/${id}/stats`),

    refreshStats: (id: string) =>
      apiFetch<{ message: string }>(
        `/api/suppliers/${id}/stats/refresh`,
        { method: 'POST' }
      ),

    invoices: (id: string) =>
      apiFetch<{ invoices: SelfBillingInvoice[]; count: number }>(
        `/api/suppliers/${id}/invoices`
      ),

    refreshVat: (id: string) =>
      apiFetch<{ supplier: Supplier; vatStatus?: string }>(`/api/suppliers/${id}/refresh-vat`, {
        method: 'POST',
      }),

    createFromVat: (nip: string) =>
      apiFetch<{ supplier: Supplier }>('/api/suppliers/from-vat', {
        method: 'POST',
        body: JSON.stringify({ nip }),
      }),

    // Supplier bulk import
    import: (file: File, settingId: string) => {
      const contentType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      return apiFetch<SupplierImportResult>(
        `/api/suppliers/import?settingId=${encodeURIComponent(settingId)}`,
        { method: 'POST', body: file, headers: { 'Content-Type': contentType } },
      )
    },

    confirmImport: (settingId: string, rows: SupplierImportEnrichedRow[]) =>
      apiFetch<SupplierImportConfirmResult>('/api/suppliers/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ settingId, rows }),
      }),

    // ── Supplier Notes ──
    listNotes: (supplierId: string) =>
      apiFetch<{ notes: Note[]; count: number }>(
        `/api/suppliers/${supplierId}/notes`
      ),

    createNote: (supplierId: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/suppliers/${supplierId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateNote: (noteId: string, data: NoteUpdate) =>
      apiFetch<Note>(`/api/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteNote: (noteId: string) =>
      apiFetch<{ success: boolean }>(`/api/notes/${noteId}`, {
        method: 'DELETE',
      }),

    // ── Supplier Attachments ──
    listAttachments: (supplierId: string) =>
      apiFetch<{ attachments: Attachment[]; count: number }>(
        `/api/suppliers/${supplierId}/attachments`
      ),

    uploadAttachment: (supplierId: string, data: AttachmentUpload) =>
      apiFetch<Attachment>(`/api/suppliers/${supplierId}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteAttachment: (attachmentId: string) =>
      apiFetch<{ success: boolean }>(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      }),
    batchDeactivate: (supplierIds: string[]) =>
      apiFetch<BatchActionResult>('/api/supplier-batch/deactivate', {
        method: 'POST',
        body: JSON.stringify({ supplierIds }),
      }),
    batchReactivate: (supplierIds: string[]) =>
      apiFetch<BatchActionResult>('/api/supplier-batch/reactivate', {
        method: 'POST',
        body: JSON.stringify({ supplierIds }),
      }),
  },

  // ── Self-Billing Agreements ──
  sbAgreements: {
    list: (params?: { settingId?: string; supplierId?: string; status?: string }) => {
      const qs = new URLSearchParams()
      if (params?.settingId) qs.append('settingId', params.settingId)
      if (params?.supplierId) qs.append('supplierId', params.supplierId)
      if (params?.status) qs.append('status', params.status)
      return apiFetch<SbAgreementListResponse>(`/api/sb-agreements?${qs}`)
    },

    get: (id: string) =>
      apiFetch<{ data: SbAgreement }>(`/api/sb-agreements/${id}`),

    create: (data: Partial<SbAgreement>) =>
      apiFetch<{ data: SbAgreement }>('/api/sb-agreements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<SbAgreement>) =>
      apiFetch<{ data: SbAgreement }>(`/api/sb-agreements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    terminate: (id: string) =>
      apiFetch<{ data: SbAgreement }>(`/api/sb-agreements/${id}/terminate`, {
        method: 'POST',
      }),

    listAttachments: (id: string) =>
      apiFetch<{ data: Attachment[] }>(
        `/api/sb-agreements/${id}/attachments`
      ),

    uploadAttachment: (id: string, data: { fileName: string; content: string; contentType: string }) =>
      apiFetch<{ data: Attachment }>(
        `/api/sb-agreements/${id}/attachments`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
  },

  // ── Self-Billing Templates ──
  sbTemplates: {
    list: (params?: { settingId?: string; agreementId?: string }) => {
      const qs = new URLSearchParams()
      if (params?.settingId) qs.append('settingId', params.settingId)
      if (params?.agreementId) qs.append('agreementId', params.agreementId)
      return apiFetch<SbTemplateListResponse>(`/api/sb-templates?${qs}`)
    },

    get: (id: string) =>
      apiFetch<{ data: SbTemplate }>(`/api/sb-templates/${id}`),

    create: (data: Partial<SbTemplate>) =>
      apiFetch<{ data: SbTemplate }>('/api/sb-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<SbTemplate>) =>
      apiFetch<{ data: SbTemplate }>(`/api/sb-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/sb-templates/${id}`, {
        method: 'DELETE',
      }),

    duplicate: (id: string) =>
      apiFetch<{ data: SbTemplate }>(`/api/sb-templates/${id}/duplicate`, {
        method: 'POST',
      }),
  },

  // ── Self-Billing Invoices ──
  selfBillingInvoices: {
    list: (params?: SelfBillingInvoiceListParams) => {
      const qs = new URLSearchParams()
      if (params?.settingId) qs.append('settingId', params.settingId)
      if (params?.supplierId) qs.append('supplierId', params.supplierId)
      if (params?.status) qs.append('selfBillingStatus', params.status)
      if (params?.dateFrom) qs.append('dateFrom', params.dateFrom)
      if (params?.dateTo) qs.append('dateTo', params.dateTo)
      if (params?.top) qs.append('top', String(params.top))
      if (params?.skip) qs.append('skip', String(params.skip))
      return apiFetch<SelfBillingInvoiceListResponse>(
        `/api/self-billing/invoices?${qs}`
      )
    },

    get: (id: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}`
      ),

    create: (data: Partial<SelfBillingInvoice>) =>
      apiFetch<{ data: SelfBillingInvoice }>('/api/self-billing/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    preview: (data: Partial<SelfBillingInvoice>) =>
      apiFetch<{ data: SelfBillingGeneratePreview }>(
        '/api/self-billing/invoices/preview',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    generate: (request: SelfBillingGenerateRequest) =>
      apiFetch<{ data: SelfBillingGenerateResponse }>(
        '/api/self-billing/invoices/generate',
        { method: 'POST', body: JSON.stringify(request) }
      ),

    confirmGenerated: (request: SelfBillingConfirmRequest) =>
      apiFetch<{ data: SelfBillingBatchResult }>(
        '/api/self-billing/invoices/generate/confirm',
        { method: 'POST', body: JSON.stringify(request) }
      ),

    batch: (invoiceIds: string[]) =>
      apiFetch<{ data: SelfBillingBatchResult }>(
        '/api/self-billing/invoices/batch',
        { method: 'POST', body: JSON.stringify({ invoiceIds }) }
      ),

    batchSubmit: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>(
        '/api/self-billing/batch/submit',
        { method: 'POST', body: JSON.stringify({ invoiceIds }) }
      ),

    batchApprove: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>(
        '/api/self-billing/batch/approve',
        { method: 'POST', body: JSON.stringify({ invoiceIds }) }
      ),

    batchReject: (invoiceIds: string[], reason: string) =>
      apiFetch<BatchActionResult>(
        '/api/self-billing/batch/reject',
        { method: 'POST', body: JSON.stringify({ invoiceIds, reason }) }
      ),

    batchSendToKsef: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>(
        '/api/self-billing/batch/send-ksef',
        { method: 'POST', body: JSON.stringify({ invoiceIds }) }
      ),

    batchDelete: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>(
        '/api/self-billing/batch/delete',
        { method: 'POST', body: JSON.stringify({ invoiceIds }) }
      ),

    updateStatus: (id: string, status: string, reason?: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}/status`,
        { method: 'POST', body: JSON.stringify({ status, reason }) }
      ),

    submit: (id: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}/submit`,
        { method: 'POST' }
      ),

    approve: (id: string, comment?: string, invoiceNumber?: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}/approve`,
        { method: 'POST', body: JSON.stringify({ comment, invoiceNumber }) }
      ),

    reject: (id: string, reason: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}/reject`,
        { method: 'POST', body: JSON.stringify({ reason }) }
      ),

    sendToKsef: (id: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}/send-to-ksef`,
        { method: 'POST' }
      ),

    revertToDraft: (id: string, reason: string) =>
      apiFetch<{ data: SelfBillingInvoice }>(
        `/api/self-billing/invoices/${id}/revert`,
        { method: 'POST', body: JSON.stringify({ reason }) }
      ),

    // ── SB Invoice Notes ──
    listNotes: (sbInvoiceId: string) =>
      apiFetch<{ notes: Note[]; count: number }>(
        `/api/self-billing/invoices/${sbInvoiceId}/notes`
      ),

    createNote: (sbInvoiceId: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/self-billing/invoices/${sbInvoiceId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateNote: (noteId: string, data: NoteUpdate) =>
      apiFetch<Note>(`/api/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteNote: (noteId: string) =>
      apiFetch<{ success: boolean }>(`/api/notes/${noteId}`, {
        method: 'DELETE',
      }),
  },

  // ── Self-Billing Import ──
  sbImport: {
    import: (file: File, settingId: string) => {
      const contentType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      return apiFetch<SelfBillingImportResult>(
        `/api/self-billing/invoices/import?settingId=${encodeURIComponent(settingId)}`,
        { method: 'POST', body: file, headers: { 'Content-Type': contentType } },
      )
    },

    confirm: (settingId: string, rows: SbImportEnrichedRow[]) =>
      apiFetch<SelfBillingImportConfirmResult>(
        '/api/self-billing/invoices/import/confirm',
        { method: 'POST', body: JSON.stringify({ settingId, rows }) },
      ),
  },

  // ── Cost Documents ──
  costDocuments: {
    list: (params?: CostDocumentListParams) => {
      const qs = new URLSearchParams()
      if (params?.settingId) qs.append('settingId', params.settingId)
      if (params?.status) qs.append('status', params.status)
      if (params?.documentType) qs.append('documentType', params.documentType)
      if (params?.paymentStatus) qs.append('paymentStatus', params.paymentStatus)
      if (params?.approvalStatus) qs.append('approvalStatus', params.approvalStatus)
      if (params?.from) qs.append('from', params.from)
      if (params?.to) qs.append('to', params.to)
      const query = qs.toString()
      return apiFetch<CostDocumentListResponse>(
        `/api/cost-documents${query ? `?${query}` : ''}`,
      )
    },
    get: (id: string) =>
      apiFetch<CostDocument>(`/api/cost-documents/${id}`),
    create: (data: CostDocumentCreate) =>
      apiFetch<CostDocument>('/api/cost-documents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: CostDocumentUpdate) =>
      apiFetch<CostDocument>(`/api/cost-documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/api/cost-documents/${id}`, { method: 'DELETE' }),
    batchApprove: (ids: string[]) =>
      apiFetch<BatchActionResult>('/api/cost-documents/batch/approve', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    batchReject: (ids: string[]) =>
      apiFetch<BatchActionResult>('/api/cost-documents/batch/reject', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    batchMarkPaid: (ids: string[]) =>
      apiFetch<BatchActionResult>('/api/cost-documents/batch/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    aiCategorize: (data: { costDocumentId: string }) =>
      apiFetch<CostDocument>('/api/cost-documents/ai-categorize', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}

/**
 * The exported `api` object automatically routes calls:
 * - Power Apps host  → connector-based API (Power Platform SDK)
 * - Standalone mode  → direct fetch API (MSAL + HTTP)
 *
 * The connector API covers ~45 core operations (dashboard, invoices,
 * settings, sync, exchange rates, AI, test data). Missing operations
 * throw descriptive errors — those features need connector expansion
 * or standalone deployment.
 *
 * In Power Apps mode we use a Proxy that lazily loads the connector
 * module on first call. This avoids:
 *  1) static class initialisation errors from the SDK service
 *  2) race conditions where React Query fires before the module loads
 */
const _inPA = isPowerAppsHost()
console.log(`[KSeF API] mode=${_inPA ? 'connector' : 'direct-fetch'}`)

/**
 * Creates a Proxy that lazily loads `api-connector.ts` on first use
 * and forwards every call through it.
 *
 * `api.settings.listCompanies()` →
 *   get('settings') → nested proxy
 *   get('listCompanies') → nested proxy
 *   apply → getConnectorApi().then(c => c.settings.listCompanies())
 */
function createConnectorProxy(): typeof _directApi {
  function createNestedProxy(path: string[]): unknown {
    // Wrapping a function so the Proxy is both get-able and apply-able
    return new Proxy(function () {} as unknown as Record<string, unknown>, {
      get(_target, prop: string | symbol) {
        if (typeof prop === 'symbol') return undefined
        return createNestedProxy([...path, prop])
      },
      apply(_target, _thisArg, args: unknown[]) {
        const fullPath = path.join('.')
        console.log(`[KSeF Proxy] calling ${fullPath}(...)`)
        return getConnectorApi().then(cApi => {
          // Navigate to the nested method
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let current: any = cApi
          for (const key of path) {
            current = current[key]
          }
          if (typeof current !== 'function') {
            throw new Error(`[KSeF] ${fullPath} is not a function on connectorApi`)
          }
          return current(...args)
        })
      },
    })
  }

  return createNestedProxy([]) as typeof _directApi
}

export const api: typeof _directApi = _inPA
  ? createConnectorProxy()
  : _directApi
