import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockBudgetStatuses = [
  {
    mpkCenterId: 'mpk-1',
    mpkCenterName: 'IT Department',
    budgetAmount: 100000,
    utilized: 85000,
    remaining: 15000,
    utilizationPercent: 85,
    isWarning: true,
    isExceeded: false,
    period: 'Monthly' as const,
  },
  {
    mpkCenterId: 'mpk-2',
    mpkCenterName: 'Marketing',
    budgetAmount: 50000,
    utilized: 55000,
    remaining: -5000,
    utilizationPercent: 110,
    isWarning: false,
    isExceeded: true,
    period: 'Quarterly' as const,
  },
]

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
  useLocale: () => 'en',
}))

vi.mock('@/hooks/use-api', () => ({
  useContextBudgetSummary: vi.fn(() => ({
    data: { data: mockBudgetStatuses, count: mockBudgetStatuses.length },
    isLoading: false,
  })),
  useContextPendingApprovals: vi.fn(() => ({
    data: { count: 3 },
    isLoading: false,
  })),
}))

vi.mock('@/components/dashboard/animated-kpi-card', () => ({
  AnimatedKpiCard: ({ title, value, subtitle }: { title: string; value: number; subtitle?: string }) => (
    <div data-testid="kpi-card">
      <span data-testid="kpi-title">{title}</span>
      <span data-testid="kpi-value">{value}</span>
      {subtitle && <span data-testid="kpi-subtitle">{subtitle}</span>}
    </div>
  ),
  AnimatedCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AnimatedCardWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { BudgetSummaryCards } from '@/components/dashboard/budget-summary-cards'

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
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BudgetSummaryCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders pending approvals KPI card', () => {
    renderWithProviders(<BudgetSummaryCards />)

    const titles = screen.getAllByTestId('kpi-title')
    expect(titles.some((el) => el.textContent === 'pendingApprovals')).toBe(true)
  })

  it('renders total budget KPI card', () => {
    renderWithProviders(<BudgetSummaryCards />)

    const titles = screen.getAllByTestId('kpi-title')
    expect(titles.some((el) => el.textContent === 'totalBudget')).toBe(true)
  })

  it('renders exceeded count KPI card', () => {
    renderWithProviders(<BudgetSummaryCards />)

    const titles = screen.getAllByTestId('kpi-title')
    expect(titles.some((el) => el.textContent === 'exceeded')).toBe(true)
  })

  it('renders warning count KPI card', () => {
    renderWithProviders(<BudgetSummaryCards />)

    const titles = screen.getAllByTestId('kpi-title')
    expect(titles.some((el) => el.textContent === 'warnings')).toBe(true)
  })

  it('renders budget rows for each MPK', () => {
    renderWithProviders(<BudgetSummaryCards />)

    expect(screen.getByText('IT Department')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('shows exceeded badge for over-budget MPK', () => {
    renderWithProviders(<BudgetSummaryCards />)

    expect(screen.getByText('exceededBadge')).toBeInTheDocument()
  })

  it('shows warning badge for high-utilization MPK', () => {
    renderWithProviders(<BudgetSummaryCards />)

    expect(screen.getByText('warningBadge')).toBeInTheDocument()
  })

  it('returns null when no data and no pending', async () => {
    const { useContextBudgetSummary, useContextPendingApprovals } = await import('@/hooks/use-api')
    vi.mocked(useContextBudgetSummary).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useContextBudgetSummary>)
    vi.mocked(useContextPendingApprovals).mockReturnValue({
      data: { count: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useContextPendingApprovals>)

    const { container } = renderWithProviders(<BudgetSummaryCards />)
    expect(container.innerHTML).toBe('')
  })
})
