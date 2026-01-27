import { getMsalInstance, apiScopes, isAuthConfigured } from './auth-config'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  error: string
  details?: unknown
}

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
  name: string
  environment: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncInterval?: number
  lastSync?: string
  lastSyncStatus?: 'success' | 'error'
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  tokenStatus?: 'valid' | 'expiring' | 'expired' | 'missing'
  isActive: boolean
}

export interface CostCenter {
  id: string
  code: string
  name: string
  isActive: boolean
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
    list: (params?: {
      tenantNip?: string
      paymentStatus?: 'pending' | 'paid'
      mpk?: string
      category?: string
      fromDate?: string
      toDate?: string
      top?: number
      skip?: number
    }) => {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value))
          }
        })
      }
      return apiFetch<InvoiceListResponse>(`/api/invoices?${searchParams}`)
    },

    get: (id: string) => apiFetch<Invoice>(`/api/invoices/${id}`),

    update: (id: string, data: {
      mpk?: string
      category?: string
      project?: string
      tags?: string[]
      paymentStatus?: 'pending' | 'paid'
      paymentDate?: string
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
  },

  // Settings
  settings: {
    // KSeF Settings (companies)
    listCompanies: () => apiFetch<{ settings: KsefSetting[] }>('/api/settings/ksef'),
    
    getCompany: (id: string) => apiFetch<KsefSetting>(`/api/settings/ksef/${id}`),
    
    createCompany: (data: {
      nip: string
      name: string
      environment: 'test' | 'demo' | 'production'
      isActive?: boolean
      autoSync?: boolean
      syncInterval?: number
    }) =>
      apiFetch<KsefSetting>('/api/settings/ksef', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    updateCompany: (id: string, data: Partial<KsefSetting>) =>
      apiFetch<KsefSetting>(`/api/settings/ksef/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    deleteCompany: (id: string) =>
      apiFetch<void>(`/api/settings/ksef/${id}`, {
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
  invoices: (params?: Record<string, unknown>) => ['invoices', params] as const,
  invoice: (id: string) => ['invoices', id] as const,
  companies: ['settings', 'companies'] as const,
  company: (id: string) => ['settings', 'companies', id] as const,
  costCenters: ['settings', 'costCenters'] as const,
}
