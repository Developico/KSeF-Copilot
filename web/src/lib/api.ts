const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

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
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  paymentStatus: 'pending' | 'paid'
  paymentDate?: string
  mpk?: string
  category?: string
  project?: string
  tags?: string[]
  importedAt: string
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
  error?: string
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  return response.json()
}

/**
 * API client methods
 */
export const api = {
  // Health
  health: () => apiFetch<{ status: string }>('/api/health'),

  // KSeF
  ksef: {
    status: () => apiFetch<KsefStatus>('/api/ksef/status'),
    sync: (fromDate?: string, toDate?: string) =>
      apiFetch<{ invoices: unknown[]; count: number }>('/api/ksef/invoices', {
        method: 'GET',
      }),
    import: (referenceNumbers: string[]) =>
      apiFetch<{ imported: number }>('/api/ksef/import', {
        method: 'POST',
        body: JSON.stringify({ referenceNumbers }),
      }),
  },

  // Invoices
  invoices: {
    list: (params?: Record<string, string>) => {
      const searchParams = new URLSearchParams(params)
      return apiFetch<InvoiceListResponse>(`/api/invoices?${searchParams}`)
    },
    get: (id: string) => apiFetch<Invoice>(`/api/invoices/${id}`),
    update: (id: string, data: Partial<Invoice>) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/api/invoices/${id}`, {
        method: 'DELETE',
      }),
  },
}
