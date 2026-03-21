import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InvoicesPage from '@/app/[locale]/invoices/page'

const mockInvoices = [
  {
    id: '1',
    tenantNip: '1234567890',
    tenantName: 'Test Tenant',
    referenceNumber: 'KSEF-001',
    invoiceNumber: 'FV/2024/001',
    supplierNip: '9876543210',
    supplierName: 'Supplier Alpha',
    invoiceDate: '2024-01-15',
    netAmount: 1000,
    vatAmount: 230,
    grossAmount: 1230,
    currency: 'PLN',
    paymentStatus: 'pending' as const,
    importedAt: '2024-01-16T10:00:00Z',
  },
  {
    id: '2',
    tenantNip: '1234567890',
    tenantName: 'Test Tenant',
    referenceNumber: 'KSEF-002',
    invoiceNumber: 'FV/2024/002',
    supplierNip: '1111222233',
    supplierName: 'Supplier Beta',
    invoiceDate: '2024-02-20',
    netAmount: 2000,
    vatAmount: 460,
    grossAmount: 2460,
    currency: 'PLN',
    paymentStatus: 'paid' as const,
    importedAt: '2024-02-21T10:00:00Z',
  },
]

vi.mock('@/hooks/use-api', () => ({
  useInvoices: () => ({
    data: { invoices: mockInvoices, count: mockInvoices.length },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMarkAsPaid: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteInvoice: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateInvoice: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useContextMpkCenters: () => ({
    data: { data: [], count: 0 },
    isLoading: false,
  }),
  useBatchMarkPaidInvoices: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBatchMarkUnpaidInvoices: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBatchApproveInvoices: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBatchRejectInvoices: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBatchDeleteInvoices: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: () => ({
    selectedCompany: { id: '1', nip: '1234567890', companyName: 'Test Company', environment: 'test' },
    isLoading: false,
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
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

describe('InvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByText('title')).toBeInTheDocument()
  })

  it('displays invoice list', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByText('FV/2024/001')).toBeInTheDocument()
    expect(screen.getByText('FV/2024/002')).toBeInTheDocument()
  })

  it('shows supplier names', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByText('Supplier Alpha')).toBeInTheDocument()
    expect(screen.getByText('Supplier Beta')).toBeInTheDocument()
  })

  it('shows filter cards', () => {
    renderWithProviders(<InvoicesPage />)
    // With mocked translations, the "all" filter renders the key "all"
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
  })

  it('has refresh button', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('has export button', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('displays page description', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByText('subtitle')).toBeInTheDocument()
  })
})
