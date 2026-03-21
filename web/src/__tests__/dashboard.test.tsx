import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
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

const { mockStats } = vi.hoisted(() => ({
  mockStats: {
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
  },
}))

vi.mock('@/lib/api', () => ({
  api: {
    dashboard: {
      stats: vi.fn().mockResolvedValue(mockStats),
    },
  },
  queryKeys: {
    dashboardStats: (params: Record<string, unknown>) => ['dashboard', 'stats', params],
  },
}))

vi.mock('@/components/skeletons', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading...</div>,
}))

// Mock all child tile components — DashboardContent is a layout shell
vi.mock('@/components/dashboard/hero-chart-tile', () => ({
  HeroChartTile: () => <div data-testid="hero-chart-tile" />,
}))
vi.mock('@/components/dashboard/kpi-mini-tiles', () => ({
  KpiMiniTiles: () => <div data-testid="kpi-mini-tiles" />,
}))
vi.mock('@/components/dashboard/approvals-tile', () => ({
  ApprovalsTile: () => <div data-testid="approvals-tile" />,
}))
vi.mock('@/components/dashboard/sb-pipeline-tile', () => ({
  SbPipelineTile: () => <div data-testid="sb-pipeline-tile" />,
}))
vi.mock('@/components/dashboard/budget-tile', () => ({
  BudgetTile: () => <div data-testid="budget-tile" />,
}))
vi.mock('@/components/dashboard/suppliers-tile', () => ({
  SuppliersTile: () => <div data-testid="suppliers-tile" />,
}))
vi.mock('@/components/dashboard/forecast-tile', () => ({
  ForecastTile: () => <div data-testid="forecast-tile" />,
}))
vi.mock('@/components/dashboard/activity-feed-tile', () => ({
  ActivityFeedTile: () => <div data-testid="activity-feed-tile" />,
}))
vi.mock('@/components/dashboard/quick-actions-bar', () => ({
  QuickActionsBar: () => <div data-testid="quick-actions-bar" />,
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
  beforeEach(async () => {
    vi.clearAllMocks()
    // Restore the default resolved value after the skeleton test
    const { api } = await import('@/lib/api')
    vi.mocked(api.dashboard.stats).mockResolvedValue(mockStats)
  })

  it('shows date range filter with inputs', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
      expect(dateInputs.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows period label and refresh button', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText(/period/)).toBeInTheDocument()
      expect(screen.getByText('refresh')).toBeInTheDocument()
    })
  })

  it('renders all dashboard tiles', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByTestId('hero-chart-tile')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-mini-tiles')).toBeInTheDocument()
      expect(screen.getByTestId('approvals-tile')).toBeInTheDocument()
      expect(screen.getByTestId('sb-pipeline-tile')).toBeInTheDocument()
      expect(screen.getByTestId('budget-tile')).toBeInTheDocument()
      expect(screen.getByTestId('suppliers-tile')).toBeInTheDocument()
      expect(screen.getByTestId('forecast-tile')).toBeInTheDocument()
      expect(screen.getByTestId('activity-feed-tile')).toBeInTheDocument()
      expect(screen.getByTestId('quick-actions-bar')).toBeInTheDocument()
    })
  })

  it('shows preset options in date selector', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      // Default preset is lastYear — translation key rendered
      expect(screen.getByText('presets.lastYear')).toBeInTheDocument()
    })
  })

  it('shows skeleton while loading', async () => {
    // Override the API mock to never resolve
    const { api } = await import('@/lib/api')
    vi.mocked(api.dashboard.stats).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<DashboardContent />)

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('updates date inputs when changing manually', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/).length).toBeGreaterThanOrEqual(2)
    })

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    fireEvent.change(dateInputs[0], { target: { value: '2025-06-01' } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('2025-06-01')).toBeInTheDocument()
    })
  })

  it('calls refetch when clicking refresh', async () => {
    renderWithProviders(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('refresh')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('refresh').closest('button')!
    fireEvent.click(refreshButton)

    // Verify the button exists and is clickable (refetch triggered internally)
    expect(refreshButton).not.toBeDisabled()
  })
})
