import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportsPage from '@/app/[locale]/reports/page'

const mockInvoices = [
  {
    id: '1',
    tenantNip: '1234567890',
    tenantName: 'Test Tenant',
    referenceNumber: 'KSEF-001',
    invoiceNumber: 'FV/2024/001',
    supplierNip: '9876543210',
    supplierName: 'Supplier A',
    invoiceDate: '2024-01-15',
    netAmount: 1000,
    vatAmount: 230,
    grossAmount: 1230,
    currency: 'PLN',
    paymentStatus: 'paid' as const,
    importedAt: '2024-01-16T10:00:00Z',
    category: 'IT Services',
  },
  {
    id: '2',
    tenantNip: '1234567890',
    tenantName: 'Test Tenant',
    referenceNumber: 'KSEF-002',
    invoiceNumber: 'FV/2024/002',
    supplierNip: '1111222233',
    supplierName: 'Supplier B',
    invoiceDate: '2024-02-20',
    netAmount: 2000,
    vatAmount: 460,
    grossAmount: 2460,
    currency: 'PLN',
    paymentStatus: 'pending' as const,
    importedAt: '2024-02-21T10:00:00Z',
    category: 'Marketing',
  },
]

vi.mock('@/hooks/use-api', () => ({
  useContextInvoices: () => ({
    data: { invoices: mockInvoices, count: mockInvoices.length },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
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

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<ReportsPage />)
    // With mocked useTranslations, keys are returned instead of translated text
    expect(screen.getByText('title')).toBeInTheDocument()
  })

  it('shows summary cards', () => {
    renderWithProviders(<ReportsPage />)
    // Summary cards render - check for card elements
    const cards = screen.getAllByRole('heading', { level: 3 })
    expect(cards.length).toBeGreaterThan(0)
  })

  it('shows tabs for different report views', () => {
    renderWithProviders(<ReportsPage />)
    expect(screen.getByRole('tab', { name: /tabs.monthly/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /tabs.suppliers/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /tabs.categories/i })).toBeInTheDocument()
  })

  it('displays refresh button', () => {
    renderWithProviders(<ReportsPage />)
    // Button has aria-label with translation key
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('shows month selector', () => {
    renderWithProviders(<ReportsPage />)
    // Month selector is a combobox
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })
})
