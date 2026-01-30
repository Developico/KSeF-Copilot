import { getMsalInstance, apiScopes, isAuthConfigured } from './auth-config'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  error: string
  details?: unknown
}

// Dashboard Statistics Types
export interface MonthlyStats {
  month: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  invoiceCount: number
}

export interface MpkStats {
  mpk: string
  netAmount: number
  grossAmount: number
  invoiceCount: number
  percentage: number
}

export interface SupplierStats {
  supplierNip: string
  supplierName: string
  grossAmount: number
  invoiceCount: number
}

export interface PaymentStats {
  pending: { count: number; grossAmount: number }
  paid: { count: number; grossAmount: number }
  overdue: { count: number; grossAmount: number }
}

export interface DashboardStats {
  period: { from: string; to: string }
  totals: {
    invoiceCount: number
    netAmount: number
    vatAmount: number
    grossAmount: number
  }
  monthly: MonthlyStats[]
  byMpk: MpkStats[]
  topSuppliers: SupplierStats[]
  payments: PaymentStats
}

// Invoice Types
export interface Invoice {
  id: string
  tenantNip: string
  tenantName: string
  referenceNumber: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  buyerNip?: string
  buyerName?: string
  buyerAddress?: string
  buyerCity?: string
  buyerPostalCode?: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  currency?: string
  paymentStatus: 'pending' | 'paid'
  paymentDate?: string
  mpk?: string
  category?: string
  project?: string
  tags?: string[]
  importedAt: string
  ksefAcceptedAt?: string
  xmlContent?: string
  items?: InvoiceItem[]
  source?: 'KSeF' | 'Manual'
  description?: string
  // AI Suggestions
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiRationale?: string
  aiConfidence?: number
  aiProcessedAt?: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  netAmount: number
  vatRate: string
  vatAmount: number
  grossAmount: number
}

export interface InvoiceListResponse {
  invoices: Invoice[]
  count: number
}

export interface KsefStatus {
  isConnected: boolean
  environment: string
  nip: string
  tokenExpiry?: string
  tokenExpiringSoon: boolean
  daysUntilExpiry?: number
  hasActiveSession: boolean
  lastSync?: string
  error?: string
}

export interface KsefSession {
  sessionId: string
  referenceNumber: string
  nip: string
  createdAt: string
  expiresAt?: string
  status: 'active' | 'expired' | 'terminated' | 'error'
  invoicesProcessed: number
}

export interface SyncPreviewInvoice {
  ksefReferenceNumber: string
  invoiceNumber: string
  invoiceDate: string
  supplierNip: string
  supplierName: string
  grossAmount: number
  alreadyImported: boolean
}

export interface SyncPreviewResponse {
  total: number
  new: number
  existing: number
  invoices: SyncPreviewInvoice[]
  dateRange: { from: string; to: string }
}

export interface SyncResult {
  success: boolean
  total: number
  imported: number
  skipped: number
  failed: number
  invoices: {
    ksefReferenceNumber: string
    invoiceNumber: string
    supplierName: string
    grossAmount: number
    status: 'imported' | 'skipped' | 'failed'
  }[]
  errors: {
    ksefReferenceNumber: string
    error: string
  }[]
}

export interface KsefSetting {
  id: string
  nip: string
  companyName: string
  environment: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  tokenStatus?: 'valid' | 'expiring' | 'expired' | 'missing'
  isActive: boolean
  invoicePrefix?: string
  // Computed property for backward compatibility
  name?: string
}

export interface CostCenter {
  id: string
  code: string
  name: string
  isActive: boolean
}

// Invoice List Parameters (extended with advanced filters)
export interface InvoiceListParams {
  tenantNip?: string
  paymentStatus?: 'pending' | 'paid'
  mpk?: string
  mpkList?: string[]
  category?: string
  fromDate?: string
  toDate?: string
  dueDateFrom?: string
  dueDateTo?: string
  minAmount?: number
  maxAmount?: number
  supplierNip?: string
  supplierName?: string
  source?: 'KSeF' | 'Manual'
  overdue?: boolean
  search?: string
  top?: number
  skip?: number
  orderBy?: 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate'
  orderDirection?: 'asc' | 'desc'
}

export interface ManualInvoiceCreate {
  tenantNip: string
  tenantName: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  description?: string
  mpk?: string
  category?: string
  // AI suggestion fields (from document extraction)
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
}

// ============================================================================
// GUS/REGON Types
// ============================================================================

export interface GusCompanyData {
  nip: string
  regon: string
  nazwa: string
  adres: string
  miejscowosc: string
  kodPocztowy: string
  ulica: string
  nrBudynku: string
  nrLokalu?: string
  email?: string
  telefon?: string
  www?: string
  pkd?: string
  pkdNazwa?: string
  typ: string
  aktywny: boolean
}

export interface GusLookupResponse {
  success: boolean
  data?: GusCompanyData
  error?: string
  errorCode?: string
}

export interface GusSearchResult {
  nip: string
  regon: string
  nazwa: string
  adres: string
  miejscowosc: string
}

export interface GusSearchResponse {
  success: boolean
  results: GusSearchResult[]
  totalCount: number
  error?: string
}

export interface GusValidateResponse {
  valid: boolean
  nip?: string
  error?: string
}

export interface Attachment {
  id: string
  invoiceId: string
  fileName: string
  mimeType: string
  fileSize: number
  createdOn: string
}

export interface AttachmentUpload {
  fileName: string
  mimeType: string
  content: string // base64
  description?: string
}

export interface AttachmentConfig {
  maxSizeBytes: number
  maxSizeMB: number
  allowedMimeTypes: string[]
}

// ============================================================================
// Auth helpers
// ============================================================================

async function getAccessToken(): Promise<string | null> {
  if (!isAuthConfigured()) {
    return null
  }

  // Skip token acquisition if API scope is not configured
  if (apiScopes.scopes.length === 0) {
    return null
  }

  try {
    const msalInstance = getMsalInstance()
    const accounts = msalInstance.getAllAccounts()
    
    if (accounts.length === 0) {
      return null
    }

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

// ============================================================================
// API fetch wrapper
// ============================================================================

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Add auth token if available
  const token = await getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// ============================================================================
// API client
// ============================================================================

export const api = {
  // Health
  health: () => apiFetch<{ status: string }>('/api/health'),

  // GUS/REGON API
  gus: {
    lookup: (nip: string) =>
      apiFetch<GusLookupResponse>('/api/gus/lookup', {
        method: 'POST',
        body: JSON.stringify({ nip: nip.replace(/\D/g, '') }),
      }),

    search: (query: string, type: 'nip' | 'regon' | 'krs' | 'name' = 'name') =>
      apiFetch<GusSearchResponse>('/api/gus/search', {
        method: 'POST',
        body: JSON.stringify({ query, type }),
      }),

    validate: (nip: string) =>
      apiFetch<GusValidateResponse>(`/api/gus/validate/${nip.replace(/\D/g, '')}`),
  },

  // Dashboard
  dashboard: {
    stats: (params?: { fromDate?: string; toDate?: string; tenantNip?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
      if (params?.toDate) searchParams.append('toDate', params.toDate)
      if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      return apiFetch<DashboardStats>(`/api/dashboard/stats?${searchParams}`)
    },
  },

  // KSeF Status & Session
  ksef: {
    status: () => apiFetch<KsefStatus>('/api/ksef/status'),
    
    startSession: (nip?: string) =>
      apiFetch<{ success: boolean; session: KsefSession }>('/api/ksef/session', {
        method: 'POST',
        body: JSON.stringify({ nip }),
      }),
    
    getSession: () =>
      apiFetch<{ session: KsefSession | null }>('/api/ksef/session'),
    
    endSession: () =>
      apiFetch<{ success: boolean }>('/api/ksef/session', {
        method: 'DELETE',
      }),
  },

  // Sync operations
  sync: {
    preview: (params?: { nip?: string; dateFrom?: string; dateTo?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.nip) searchParams.append('nip', params.nip)
      if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
      
      return apiFetch<SyncPreviewResponse>(`/api/ksef/sync/preview?${searchParams}`)
    },

    run: (params?: { nip?: string; dateFrom?: string; dateTo?: string }) =>
      apiFetch<SyncResult>('/api/ksef/sync', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    import: (referenceNumbers: string[], nip?: string) =>
      apiFetch<SyncResult>('/api/ksef/sync/import', {
        method: 'POST',
        body: JSON.stringify({ referenceNumbers, nip }),
      }),
  },

  // Invoices CRUD
  invoices: {
    list: (params?: InvoiceListParams) => {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'mpkList' && Array.isArray(value)) {
              searchParams.append(key, value.join(','))
            } else {
              searchParams.append(key, String(value))
            }
          }
        })
      }
      return apiFetch<InvoiceListResponse>(`/api/invoices?${searchParams}`)
    },

    get: (id: string) => apiFetch<Invoice>(`/api/invoices/${id}`),

    update: (id: string, data: {
      mpk?: string
      category?: string
      description?: string
      project?: string
      tags?: string[]
      paymentStatus?: 'pending' | 'paid'
      paymentDate?: string
      // Fields for manual invoices
      supplierName?: string
      supplierNip?: string
      invoiceNumber?: string
      invoiceDate?: string
      dueDate?: string
      netAmount?: number
      vatAmount?: number
      grossAmount?: number
    }) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/api/invoices/${id}`, {
        method: 'DELETE',
      }),

    markAsPaid: (id: string, paymentDate?: string) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        }),
      }),

    // Manual invoice creation
    createManual: (data: ManualInvoiceCreate) =>
      apiFetch<Invoice>('/api/invoices/manual', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Attachments
    listAttachments: (invoiceId: string) =>
      apiFetch<{ attachments: Attachment[]; count: number }>(`/api/invoices/${invoiceId}/attachments`),

    uploadAttachment: (invoiceId: string, data: AttachmentUpload) =>
      apiFetch<Attachment>(`/api/invoices/${invoiceId}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    downloadAttachment: (attachmentId: string) =>
      apiFetch<{ content: string }>(`/api/attachments/${attachmentId}/download`),

    deleteAttachment: (attachmentId: string) =>
      apiFetch<void>(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      }),

    // AI Categorization
    categorizeWithAI: (invoiceId: string) =>
      apiFetch<{
        invoiceId: string
        categorization: {
          mpk: string
          category: string
          description: string
          confidence: number
        }
        message: string
      }>('/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      }),
  },

  // Settings
  settings: {
    // KSeF Settings (companies)
    listCompanies: () => apiFetch<{ settings: KsefSetting[] }>('/api/settings'),
    
    getCompany: (id: string) => apiFetch<KsefSetting>(`/api/settings/${id}`),
    
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
      apiFetch<void>(`/api/settings/${id}`, {
        method: 'DELETE',
      }),

    // Cost Centers
    listCostCenters: () => apiFetch<{ costCenters: CostCenter[] }>('/api/settings/costcenters'),
    
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

  // ============================================================================
  // Dataverse-backed endpoints (new)
  // ============================================================================

  // Settings (Dataverse)
  dvSettings: {
    list: (activeOnly = false) => {
      const params = new URLSearchParams()
      if (activeOnly) params.append('activeOnly', 'true')
      return apiFetch<{ settings: DvSetting[]; count: number }>(`/api/settings?${params}`)
    },

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

  // Sessions (Dataverse)
  dvSessions: {
    list: (settingId: string, activeOnly = false) => {
      const params = new URLSearchParams()
      params.append('settingId', settingId)
      if (activeOnly) params.append('activeOnly', 'true')
      return apiFetch<{ sessions: DvSession[]; count: number }>(`/api/sessions?${params}`)
    },

    getActive: (nip: string) =>
      apiFetch<{ active: boolean; session: DvSession | null }>(`/api/sessions/active/${nip}`),

    get: (id: string) => apiFetch<DvSession>(`/api/sessions/${id}`),

    terminate: (id: string) =>
      apiFetch<{ message: string; id: string }>(`/api/sessions/${id}/terminate`, {
        method: 'POST',
      }),

    cleanup: () =>
      apiFetch<{ message: string; expiredCount: number }>('/api/sessions/cleanup', {
        method: 'POST',
      }),
  },

  // Sync (Dataverse)
  dvSync: {
    start: (data: DvSyncStart) =>
      apiFetch<DvSyncResult>('/api/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getLogs: (settingId?: string, limit = 50) => {
      const params = new URLSearchParams()
      if (settingId) params.append('settingId', settingId)
      params.append('limit', String(limit))
      return apiFetch<{ logs: DvSyncLog[]; count: number }>(`/api/sync/logs?${params}`)
    },

    getLog: (id: string) => apiFetch<DvSyncLog>(`/api/sync/logs/${id}`),

    getStats: (settingId: string) =>
      apiFetch<DvSyncStats>(`/api/sync/stats/${settingId}`),
  },

  // Document Extraction
  documents: {
    extract: (data: DocumentExtractRequest) =>
      apiFetch<ExtractionResult>('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}

// ============================================================================
// Dataverse Types
// ============================================================================

export interface DvSetting {
  id: string
  nip: string
  companyName: string
  environment: 'test' | 'demo' | 'production'
  autoSync: boolean
  syncIntervalMinutes?: number
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  isActive: boolean
  invoicePrefix?: string
  createdAt: string
  updatedAt: string
}

export interface DvSettingCreate {
  nip: string
  companyName: string
  environment?: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  keyVaultSecretName?: string
  invoicePrefix?: string
}

export interface DvSettingUpdate {
  companyName?: string
  environment?: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  keyVaultSecretName?: string
  invoicePrefix?: string
  isActive?: boolean
}

export interface DvSession {
  id: string
  sessionReference: string
  settingId: string
  nip: string
  sessionType: 'interactive' | 'batch'
  startedAt: string
  expiresAt?: string
  terminatedAt?: string
  status: 'active' | 'expired' | 'terminated' | 'error'
  invoicesProcessed: number
  errorMessage?: string
  createdAt: string
}

export interface DvSyncLog {
  id: string
  settingId: string
  sessionId?: string
  direction: 'incoming' | 'outgoing' | 'both'
  startedAt: string
  completedAt?: string
  status: 'in-progress' | 'completed' | 'failed' | 'partial'
  invoicesCreated: number
  invoicesUpdated: number
  invoicesFailed: number
  pageFrom?: number
  pageTo?: number
  errorMessage?: string
  createdAt: string
}

export interface DvSyncStart {
  settingId: string
  direction?: 'incoming' | 'outgoing' | 'both'
  dateFrom?: string
  dateTo?: string
}

export interface DvSyncResult {
  syncLogId: string
  status: 'completed' | 'failed'
  total: number
  processed: number
  created: number
  updated: number
  failed: number
  errors: Array<{ reference: string; error: string }>
}

export interface DvSyncStats {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  totalInvoicesCreated: number
  totalInvoicesUpdated: number
  lastSyncAt: string | null
}

// ============================================================================
// React Query hooks helpers
// ============================================================================

export const queryKeys = {
  health: ['health'] as const,
  ksefStatus: ['ksef', 'status'] as const,
  ksefSession: ['ksef', 'session'] as const,
  syncPreview: (params?: { dateFrom?: string; dateTo?: string }) =>
    ['sync', 'preview', params] as const,
  
  // Dashboard
  dashboardStats: (params?: { fromDate?: string; toDate?: string }) =>
    ['dashboard', 'stats', params] as const,
  
  invoices: (params?: InvoiceListParams) => ['invoices', params] as const,
  invoice: (id: string) => ['invoices', id] as const,
  invoiceAttachments: (id: string) => ['invoices', id, 'attachments'] as const,
  companies: ['settings', 'companies'] as const,
  company: (id: string) => ['settings', 'companies', id] as const,
  costCenters: ['settings', 'costCenters'] as const,

  // GUS/REGON query keys
  gusLookup: (nip: string) => ['gus', 'lookup', nip] as const,
  gusSearch: (query: string) => ['gus', 'search', query] as const,
  recentSuppliers: (tenantNip?: string) => ['suppliers', 'recent', tenantNip] as const,

  // Dataverse query keys
  dvSettings: (activeOnly?: boolean) => ['dv', 'settings', { activeOnly }] as const,
  dvSetting: (id: string) => ['dv', 'settings', id] as const,
  dvSessions: (settingId: string, activeOnly?: boolean) => 
    ['dv', 'sessions', { settingId, activeOnly }] as const,
  dvSessionActive: (nip: string) => ['dv', 'sessions', 'active', nip] as const,
  dvSession: (id: string) => ['dv', 'sessions', id] as const,
  dvSyncLogs: (settingId?: string, limit?: number) => 
    ['dv', 'sync', 'logs', { settingId, limit }] as const,
  dvSyncLog: (id: string) => ['dv', 'sync', 'logs', id] as const,
  dvSyncStats: (settingId: string) => ['dv', 'sync', 'stats', settingId] as const,
}

// ============================================================================
// Document Extraction Types
// ============================================================================

export interface ExtractedAddress {
  street?: string
  buildingNumber?: string
  apartmentNumber?: string
  postalCode?: string
  city?: string
  country?: string
}

export interface ExtractedItem {
  description: string
  quantity?: number
  unit?: string
  netPrice?: number
  vatRate?: number
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
}

export interface ExtractedInvoiceData {
  invoiceNumber?: string
  issueDate?: string
  dueDate?: string
  supplierName?: string
  supplierNip?: string
  supplierAddress?: ExtractedAddress
  supplierBankAccount?: string
  buyerName?: string
  buyerNip?: string
  buyerAddress?: ExtractedAddress
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
  currency?: string
  items?: ExtractedItem[]
  paymentMethod?: string
  bankAccountNumber?: string
  suggestedMpk?: string
  suggestedCategory?: string
  suggestedDescription?: string
}

export interface ExtractionResult {
  success: boolean
  data?: ExtractedInvoiceData
  confidence: number
  extractedAt: string
  sourceType: 'pdf' | 'image'
  processingTimeMs?: number
  rawText?: string
  error?: string
}

export interface DocumentExtractRequest {
  fileName: string
  mimeType: string
  content: string // base64
}
