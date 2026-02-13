import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// ── Mock API ────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  api: {
    health: vi.fn().mockResolvedValue({ status: 'ok' }),
    healthDetailed: vi.fn().mockResolvedValue({ status: 'ok', services: {} }),
    gus: {
      lookup: vi.fn().mockResolvedValue({ found: true }),
      search: vi.fn().mockResolvedValue({ results: [] }),
      validate: vi.fn().mockResolvedValue({ valid: true }),
    },
    dashboard: {
      stats: vi.fn().mockResolvedValue({
        period: { from: '2024-01-01', to: '2024-12-31' },
        totals: { invoiceCount: 10, netAmount: 1000, vatAmount: 230, grossAmount: 1230 },
        monthly: [],
        byMpk: [],
        topSuppliers: [],
        payments: { paid: 0, pending: 0 },
      }),
    },
    forecast: {
      monthly: vi.fn().mockResolvedValue({ historical: [], forecast: [] }),
      byMpk: vi.fn().mockResolvedValue({ groups: [] }),
      byCategory: vi.fn().mockResolvedValue({ groups: [] }),
      bySupplier: vi.fn().mockResolvedValue({ groups: [] }),
    },
    anomalies: {
      list: vi.fn().mockResolvedValue({ anomalies: [] }),
      summary: vi.fn().mockResolvedValue({ total: 0 }),
    },
    ksef: {
      status: vi.fn().mockResolvedValue({ isConnected: true }),
      startSession: vi.fn().mockResolvedValue({ success: true }),
      getSession: vi.fn().mockResolvedValue({ session: null }),
      endSession: vi.fn().mockResolvedValue({ success: true }),
    },
    sync: {
      preview: vi.fn().mockResolvedValue({ count: 5 }),
      run: vi.fn().mockResolvedValue({ synced: 5 }),
    },
    invoices: {
      list: vi.fn().mockResolvedValue({
        invoices: [{ id: '1', invoiceNumber: 'FV/001' }],
        count: 1,
      }),
      get: vi.fn().mockResolvedValue({ id: '1', invoiceNumber: 'FV/001' }),
      update: vi.fn().mockResolvedValue({ id: '1' }),
      delete: vi.fn().mockResolvedValue(undefined),
      markAsPaid: vi.fn().mockResolvedValue({ id: '1' }),
      createManual: vi.fn().mockResolvedValue({ id: '2' }),
      listAttachments: vi.fn().mockResolvedValue({ attachments: [], count: 0 }),
      uploadAttachment: vi.fn().mockResolvedValue({ id: 'att-1' }),
      deleteAttachment: vi.fn().mockResolvedValue(undefined),
      listNotes: vi.fn().mockResolvedValue({ notes: [], count: 0 }),
      createNote: vi.fn().mockResolvedValue({ id: 'note-1' }),
      updateNote: vi.fn().mockResolvedValue({ id: 'note-1' }),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      uploadDocument: vi.fn().mockResolvedValue({ success: true }),
      downloadDocument: vi.fn().mockResolvedValue({ content: '' }),
      deleteDocument: vi.fn().mockResolvedValue({ success: true }),
      getDocumentConfig: vi.fn().mockResolvedValue({ maxSize: 10 }),
      categorizeWithAI: vi.fn().mockResolvedValue({ category: 'IT' }),
    },
    settings: {
      listCompanies: vi.fn().mockResolvedValue({ settings: [] }),
      getCompany: vi.fn().mockResolvedValue({ id: '1' }),
      createCompany: vi.fn().mockResolvedValue({ id: '2' }),
      updateCompany: vi.fn().mockResolvedValue({ id: '1' }),
      deleteCompany: vi.fn().mockResolvedValue(undefined),
      testToken: vi.fn().mockResolvedValue({ valid: true }),
      listCostCenters: vi.fn().mockResolvedValue({ costCenters: [] }),
      createCostCenter: vi.fn().mockResolvedValue({ id: '1' }),
      updateCostCenter: vi.fn().mockResolvedValue({ id: '1' }),
      deleteCostCenter: vi.fn().mockResolvedValue(undefined),
    },
    dvSettings: {
      list: vi.fn().mockResolvedValue({ settings: [], count: 0 }),
      get: vi.fn().mockResolvedValue({ id: '1' }),
      create: vi.fn().mockResolvedValue({ id: '2' }),
      update: vi.fn().mockResolvedValue({ id: '1' }),
      delete: vi.fn().mockResolvedValue({ message: 'ok', id: '1' }),
    },
    dvSessions: {
      list: vi.fn().mockResolvedValue({ sessions: [], count: 0 }),
      getActive: vi.fn().mockResolvedValue({ active: false }),
      terminate: vi.fn().mockResolvedValue({ message: 'ok' }),
      cleanup: vi.fn().mockResolvedValue({ message: 'ok', expiredCount: 0 }),
    },
    dvSync: {
      start: vi.fn().mockResolvedValue({ synced: 0 }),
      getLogs: vi.fn().mockResolvedValue({ logs: [], count: 0 }),
      getLog: vi.fn().mockResolvedValue({ id: '1' }),
      getStats: vi.fn().mockResolvedValue({ total: 0 }),
    },
    documents: {
      extract: vi.fn().mockResolvedValue({ fields: {} }),
    },
    ksefTestdata: {
      getEnvironments: vi.fn().mockResolvedValue({ environments: [] }),
      checkPermissions: vi.fn().mockResolvedValue({ permissions: [] }),
      grantPermissions: vi.fn().mockResolvedValue({ success: true }),
      createTestPerson: vi.fn().mockResolvedValue({ id: '1' }),
      generate: vi.fn().mockResolvedValue({ generated: 0 }),
      cleanupPreview: vi.fn().mockResolvedValue({ count: 0 }),
      cleanup: vi.fn().mockResolvedValue({ deleted: 0 }),
    },
    exchangeRates: {
      get: vi.fn().mockResolvedValue({ rate: 4.3 }),
      convert: vi.fn().mockResolvedValue({ amount: 430 }),
    },
  },
}))

vi.mock('@/lib/auth-config', () => ({
  getMsalInstance: vi.fn(),
  isAuthConfigured: vi.fn().mockReturnValue(false),
  apiScopes: { scopes: [] },
}))

// ── Helpers ─────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

// ── Tests ───────────────────────────────────────────────────────

describe('useHealth', () => {
  it('should fetch health status', async () => {
    const { useHealth } = await import('../hooks/use-api')
    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ status: 'ok' })
  })
})

describe('useDashboardStats', () => {
  it('should fetch dashboard stats', async () => {
    const { useDashboardStats } = await import('../hooks/use-api')
    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.totals.invoiceCount).toBe(10)
  })
})

describe('useInvoices', () => {
  it('should fetch invoices list', async () => {
    const { useInvoices } = await import('../hooks/use-api')
    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.invoices).toHaveLength(1)
    expect(result.current.data?.invoices[0].invoiceNumber).toBe('FV/001')
  })
})

describe('useInvoice', () => {
  it('should fetch single invoice', async () => {
    const { useInvoice } = await import('../hooks/use-api')
    const { result } = renderHook(() => useInvoice('1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('1')
  })

  it('should not fetch when id is empty', async () => {
    const { useInvoice } = await import('../hooks/use-api')
    const { result } = renderHook(() => useInvoice(''), {
      wrapper: createWrapper(),
    })

    // Should remain idle (not enabled)
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCompanies', () => {
  it('should fetch companies', async () => {
    const { useCompanies } = await import('../hooks/use-api')
    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.settings).toEqual([])
  })
})

describe('useForecastMonthly', () => {
  it('should fetch monthly forecast', async () => {
    const { useForecastMonthly } = await import('../hooks/use-api')
    const { result } = renderHook(() => useForecastMonthly(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.historical).toEqual([])
  })
})

describe('useKsefStatus', () => {
  it('should fetch KSeF status', async () => {
    const { useKsefStatus } = await import('../hooks/use-api')
    const { result } = renderHook(() => useKsefStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.isConnected).toBe(true)
  })
})

describe('useExchangeRate', () => {
  it('should fetch exchange rate', async () => {
    const { useExchangeRate } = await import('../hooks/use-api')
    const { result } = renderHook(() => useExchangeRate('EUR'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.rate).toBe(4.3)
  })
})

describe('mutations', () => {
  it('useUpdateInvoice should call api.invoices.update', async () => {
    const { useUpdateInvoice } = await import('../hooks/use-api')
    const { api } = await import('@/lib/api')

    const { result } = renderHook(() => useUpdateInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: '1', data: { mpk: 'IT' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.invoices.update).toHaveBeenCalledWith('1', { mpk: 'IT' })
  })

  it('useDeleteInvoice should call api.invoices.delete', async () => {
    const { useDeleteInvoice } = await import('../hooks/use-api')
    const { api } = await import('@/lib/api')

    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.invoices.delete).toHaveBeenCalledWith('1')
  })

  it('useCreateCompany should call api.settings.createCompany', async () => {
    const { useCreateCompany } = await import('../hooks/use-api')
    const { api } = await import('@/lib/api')

    const { result } = renderHook(() => useCreateCompany(), {
      wrapper: createWrapper(),
    })

    const newCompany = {
      nip: '1234567890',
      companyName: 'Test',
      environment: 'test' as const,
    }
    result.current.mutate(newCompany)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.settings.createCompany).toHaveBeenCalledWith(newCompany)
  })
})
