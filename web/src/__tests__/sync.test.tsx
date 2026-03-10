import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SyncPage from '@/app/[locale]/sync/page'

const mockSelectedCompany = {
  id: 'company-1',
  companyName: 'Test Company',
  nip: '1234567890',
  environment: 'test' as const,
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
}))

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: () => ({
    selectedCompany: mockSelectedCompany,
    isLoading: false,
  }),
  useSelectedCompany: () => ({
    selectedCompany: mockSelectedCompany,
    isLoading: false,
  }),
}))

vi.mock('@/components/auth/auth-provider', () => ({
  RequireRole: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/hooks/use-api', () => ({
  useKsefStatus: () => ({
    data: {
      isConnected: true,
      environment: 'test',
      nip: '1234567890',
      tokenExpiry: '2026-06-01',
      tokenExpiringSoon: false,
      daysUntilExpiry: 85,
      hasActiveSession: false,
    },
    isLoading: false,
  }),
  useKsefSession: () => ({
    data: null,
    isLoading: false,
  }),
  useStartSession: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useEndSession: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSyncPreview: () => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useRunSync: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useImportInvoices: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBatchCategorize: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('SyncPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<SyncPage />)
    expect(screen.getByText('title')).toBeInTheDocument()
  })

  it('renders KSeF connection status', () => {
    renderWithProviders(<SyncPage />)
    expect(screen.getByText('connectionStatus')).toBeInTheDocument()
  })

  it('shows date range inputs', () => {
    renderWithProviders(<SyncPage />)
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    expect(dateInputs.length).toBeGreaterThanOrEqual(2)
  })

  it('sync log section hidden when empty', () => {
    renderWithProviders(<SyncPage />)
    // Sync log is conditionally rendered only when entries exist
    expect(screen.queryByText('syncLog')).not.toBeInTheDocument()
  })

  it('shows environment information', () => {
    renderWithProviders(<SyncPage />)
    expect(screen.getByText('test')).toBeInTheDocument()
  })
})
