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
  useInvoices: () => ({
    data: { invoices: mockInvoices, count: mockInvoices.length },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
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

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<ReportsPage />)
    expect(screen.getByText('Raporty')).toBeInTheDocument()
    expect(screen.getByText('Analizy i statystyki faktur kosztowych')).toBeInTheDocument()
  })

  it('shows summary cards', () => {
    renderWithProviders(<ReportsPage />)
    expect(screen.getByText('Wszystkie faktury')).toBeInTheDocument()
    expect(screen.getByText('Suma brutto')).toBeInTheDocument()
    // Use getAllByText since there might be multiple matching elements
    expect(screen.getAllByText(/Opłacone|opłacone/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Do zapłaty')).toBeInTheDocument()
  })

  it('shows tabs for different report views', () => {
    renderWithProviders(<ReportsPage />)
    expect(screen.getByRole('tab', { name: /Miesięcznie/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Dostawcy/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Kategorie/i })).toBeInTheDocument()
  })

  it('displays refresh button', () => {
    renderWithProviders(<ReportsPage />)
    expect(screen.getByRole('button', { name: /Odśwież/i })).toBeInTheDocument()
  })

  it('shows month selector with "Cały rok" option', () => {
    renderWithProviders(<ReportsPage />)
    expect(screen.getByText('Cały rok')).toBeInTheDocument()
  })
})
