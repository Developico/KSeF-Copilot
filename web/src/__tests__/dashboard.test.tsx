import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Must mock recharts BEFORE importing the component
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}))

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: () => ({
    selectedCompany: {
      id: 'company-1',
      companyName: 'Test Company',
      nip: '1234567890',
      environment: 'test' as const,
    },
    isLoading: false,
  }),
}))

vi.mock('@/lib/api', () => ({
  api: {
    dashboard: {
      stats: vi.fn().mockResolvedValue({
        period: { from: '2025-03-01', to: '2026-03-01' },
        totals: {
          invoiceCount: 42,
          netAmount: 100000,
          vatAmount: 23000,
          grossAmount: 123000,
        },
        monthly: [
          { month: '2026-01', netAmount: 10000, vatAmount: 2300, grossAmount: 12300, invoiceCount: 5 },
          { month: '2026-02', netAmount: 15000, vatAmount: 3450, grossAmount: 18450, invoiceCount: 8 },
        ],
        byMpk: [
          { mpk: 'IT', netAmount: 50000, grossAmount: 61500, invoiceCount: 20, percentage: 50 },
          { mpk: 'Marketing', netAmount: 30000, grossAmount: 36900, invoiceCount: 12, percentage: 30 },
        ],
        topSuppliers: [
          { supplierNip: '1234567890', supplierName: 'Acme Corp', grossAmount: 50000, invoiceCount: 10 },
          { supplierNip: '9876543210', supplierName: 'Tech Services', grossAmount: 30000, invoiceCount: 8 },
        ],
        payments: {
          pending: { count: 5, grossAmount: 25000 },
          paid: { count: 30, grossAmount: 80000 },
          overdue: { count: 7, grossAmount: 18000 },
        },
      }),
    },
  },
  queryKeys: {
    dashboardStats: (params: Record<string, unknown>) => ['dashboard', 'stats', params],
  },
}))

vi.mock('@/components/skeletons', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading...</div>,
}))

vi.mock('@/components/dashboard/budget-summary-cards', () => ({
  BudgetSummaryCards: () => <div data-testid="budget-summary-cards" />,
}))

import { DashboardContent } from '@/components/dashboard/dashboard-content'

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

describe('DashboardContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders KPI cards with correct values', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getAllByText('Liczba faktur').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Suma brutto').length).toBeGreaterThan(0)
      expect(screen.getByText('Nieopłacone')).toBeInTheDocument()
    })
  })

  it('shows date range filter with inputs', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
      expect(dateInputs.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows refresh button', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('Odśwież')).toBeInTheDocument()
    })
  })

  it('renders chart sections', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('Wydatki miesięczne')).toBeInTheDocument()
      expect(screen.getByText('Wydatki per MPK')).toBeInTheDocument()
    })
  })

  it('renders top suppliers table', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('Top 10 dostawców')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Tech Services')).toBeInTheDocument()
    })
  })

  it('renders payment status cards', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('Opłacone')).toBeInTheDocument()
      expect(screen.getByText('Oczekujące')).toBeInTheDocument()
      expect(screen.getAllByText(/Przeterminowane/).length).toBeGreaterThan(0)
    })
  })

  it('shows supplier NIP in table', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('1234567890')).toBeInTheDocument()
      expect(screen.getByText('9876543210')).toBeInTheDocument()
    })
  })
})
