import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InvoicesPage from '@/app/invoices/page'

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
    expect(screen.getByText('Faktury')).toBeInTheDocument()
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
    // Check for filter card titles
    expect(screen.getAllByText('Wszystkie').length).toBeGreaterThan(0)
  })

  it('has refresh button', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByRole('button', { name: /Odśwież/i })).toBeInTheDocument()
  })

  it('has export button', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByRole('button', { name: /Eksportuj/i })).toBeInTheDocument()
  })

  it('displays page description', () => {
    renderWithProviders(<InvoicesPage />)
    expect(screen.getByText('Przeglądaj i zarządzaj fakturami kosztowymi z KSeF')).toBeInTheDocument()
  })
})
