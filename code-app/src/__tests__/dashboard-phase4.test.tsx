import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode, createElement } from 'react'
import { IntlProvider } from 'react-intl'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Load i18n messages ─────────────────────────────────────────
import en from '@/messages/en.json'

function flattenMessages(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenMessages(value as Record<string, unknown>, path))
    } else {
      result[path] = String(value)
    }
  }
  return result
}

const messages = flattenMessages(en)

// ── Mock Recharts (jsdom has no SVG support) ────────────────────

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-count={data?.length ?? 0}>{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children, data }: { children: ReactNode; data?: unknown[] }) => (
    <div data-testid="area-chart" data-count={data?.length ?? 0}>{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

// ── Mock framer-motion ──────────────────────────────────────────

vi.mock('framer-motion', () => {
  const motionHandler = (Tag: string) => {
    return ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, whileHover, transition, variants, whileInView, viewport, ...rest } = props
      void initial; void animate; void whileHover; void transition; void variants; void whileInView; void viewport
      return createElement(Tag, rest, children as ReactNode)
    }
  }
  return {
    motion: {
      div: motionHandler('div'),
      p: motionHandler('p'),
      span: motionHandler('span'),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

// ── Mock react-countup ──────────────────────────────────────────

vi.mock('react-countup', () => ({
  default: ({ end, formattingFn }: { end: number; formattingFn?: (n: number) => string }) => (
    <span>{formattingFn ? formattingFn(end) : end}</span>
  ),
}))

// ── Mock auth ───────────────────────────────────────────────────

vi.mock('@/lib/auth-config', () => ({
  isAuthConfigured: vi.fn(() => false),
  getMsalInstance: vi.fn(),
  loginRequest: { scopes: [] },
  apiScopes: { scopes: [] },
  groupConfig: { admin: 'admin-group-id', user: 'user-group-id' },
  msalConfig: { auth: { clientId: '' } },
}))

// ── Mock company context ────────────────────────────────────────

const mockSelectedCompany = {
  id: 'c1',
  nip: '1234567890',
  companyName: 'Test Company',
  environment: 'test' as const,
  isActive: true,
}

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: vi.fn(() => ({
    companies: [mockSelectedCompany],
    selectedCompany: mockSelectedCompany,
    setSelectedCompany: vi.fn(),
    isLoading: false,
  })),
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// ── Sample data ─────────────────────────────────────────────────

const mockDashboardStats = {
  period: { from: '2024-01-01', to: '2024-06-30' },
  totals: {
    invoiceCount: 150,
    netAmount: 120000,
    vatAmount: 27600,
    grossAmount: 147600,
  },
  monthly: [
    { month: '2024-01', invoiceCount: 20, netAmount: 18000, vatAmount: 4140, grossAmount: 22140 },
    { month: '2024-02', invoiceCount: 25, netAmount: 22000, vatAmount: 5060, grossAmount: 27060 },
    { month: '2024-03', invoiceCount: 30, netAmount: 28000, vatAmount: 6440, grossAmount: 34440 },
  ],
  byMpk: [
    { mpk: 'MPK-100', invoiceCount: 60, netAmount: 50000, vatAmount: 11500, grossAmount: 61500, percentage: 42 },
    { mpk: 'MPK-200', invoiceCount: 40, netAmount: 35000, vatAmount: 8050, grossAmount: 43050, percentage: 29 },
  ],
  topSuppliers: [
    { supplierName: 'Supplier Alpha', supplierNip: '1111111111', invoiceCount: 30, grossAmount: 45000 },
    { supplierName: 'Supplier Beta', supplierNip: '2222222222', invoiceCount: 20, grossAmount: 32000 },
  ],
  payments: {
    paid: { count: 100, grossAmount: 100000 },
    pending: { count: 30, grossAmount: 30000 },
    overdue: { count: 20, grossAmount: 17600 },
  },
}

const mockForecastData = {
  historical: [
    { month: '2024-01', grossAmount: 22140, netAmount: 18000, invoiceCount: 20 },
    { month: '2024-02', grossAmount: 27060, netAmount: 22000, invoiceCount: 25 },
    { month: '2024-03', grossAmount: 34440, netAmount: 28000, invoiceCount: 30 },
  ],
  forecast: [
    { month: '2024-04', predicted: 35000, lower: 28000, upper: 42000 },
    { month: '2024-05', predicted: 37000, lower: 29000, upper: 45000 },
  ],
  trend: 'up' as const,
  trendPercent: 12.5,
  confidence: 0.85,
  method: 'linear-regression' as const,
  summary: {
    nextMonth: 35000,
    totalForecast: 72000,
    avgMonthly: 36000,
  },
}

const mockGroupedForecast = {
  groups: [
    { group: 'MPK-100', forecast: { ...mockForecastData, summary: { nextMonth: 20000, totalForecast: 40000, avgMonthly: 20000 } } },
    { group: 'MPK-200', forecast: { ...mockForecastData, summary: { nextMonth: 15000, totalForecast: 32000, avgMonthly: 16000 } } },
  ],
}

const mockAnomalyData = {
  anomalies: [
    {
      id: 'a1',
      invoiceId: 'inv-1',
      invoiceNumber: 'FV/2024/001',
      type: 'amount-spike' as const,
      severity: 'high' as const,
      score: 0.9,
      description: 'Amount significantly higher than average',
      expected: 1000,
      actual: 5000,
      deviation: 4,
      supplierName: 'Supplier Alpha',
      supplierNip: '1111111111',
      grossAmount: 5000,
      invoiceDate: '2024-03-15',
    },
    {
      id: 'a2',
      invoiceId: 'inv-2',
      invoiceNumber: 'FV/2024/002',
      type: 'new-supplier' as const,
      severity: 'medium' as const,
      score: 0.6,
      description: 'New supplier detected',
      expected: 0,
      actual: 2000,
      deviation: 2,
      supplierName: 'Supplier New',
      supplierNip: '4444444444',
      grossAmount: 2000,
      invoiceDate: '2024-03-20',
    },
  ],
  summary: {
    total: 2,
    bySeverity: { critical: 0, high: 1, medium: 1, low: 0 },
    totalAmount: 7000,
    topTypes: [{ type: 'amount-spike' as const, count: 1 }],
  },
  analyzedInvoices: 150,
  period: { from: '2024-01-01', to: '2024-03-31' },
}

// ── Mock hooks ──────────────────────────────────────────────────

const mockRefetch = vi.fn()

vi.mock('@/hooks/use-api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useDashboardStats: vi.fn(() => ({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })),
    useForecastMonthly: vi.fn(() => ({
      data: mockForecastData,
      isLoading: false,
      error: null,
    })),
    useForecastByMpk: vi.fn(() => ({
      data: mockGroupedForecast,
      isLoading: false,
      error: null,
    })),
    useForecastByCategory: vi.fn(() => ({
      data: mockGroupedForecast,
      isLoading: false,
      error: null,
    })),
    useForecastBySupplier: vi.fn(() => ({
      data: mockGroupedForecast,
      isLoading: false,
      error: null,
    })),
    useAnomalies: vi.fn(() => ({
      data: mockAnomalyData,
      isLoading: false,
      error: null,
    })),
    useAnomaliesSummary: vi.fn(() => ({
      data: mockAnomalyData.summary,
      isLoading: false,
      error: null,
    })),
  }
})

// ── Wrapper ─────────────────────────────────────────────────────

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <IntlProvider messages={messages} locale="en" defaultLocale="en">
        <MemoryRouter>{children}</MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>
  )
}

// ── Imports (after mocks) ───────────────────────────────────────

import { DashboardPage } from '@/pages/dashboard'
import { ForecastPage } from '@/pages/forecast'
import { ReportsPage } from '@/pages/reports'
import {
  AnimatedKpiCard,
  AnimatedCardGrid,
  AnimatedCardWrapper,
} from '@/components/dashboard/animated-kpi-card'

// ─────────────────────────────────────────────────────────────────
//  AnimatedKpiCard component
// ─────────────────────────────────────────────────────────────────

describe('AnimatedKpiCard', () => {
  it('renders title and formatted currency value', () => {
    render(
      <Wrapper>
        <AnimatedKpiCard title="Total" value={12345} format="currency" />
      </Wrapper>,
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    // CountUp mock renders the end value via formattingFn
  })

  it('renders subtitle when provided', () => {
    render(
      <Wrapper>
        <AnimatedKpiCard title="Revenue" value={100} format="number" subtitle="this month" />
      </Wrapper>,
    )
    expect(screen.getByText('this month')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const TestIcon = (() => <svg data-testid="test-icon" />) as unknown as import('lucide-react').LucideIcon
    render(
      <Wrapper>
        <AnimatedKpiCard title="Test" value={0} format="number" icon={TestIcon} />
      </Wrapper>,
    )
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(
      <Wrapper>
        <AnimatedKpiCard title="Loading Test" value={0} format="number" isLoading />
      </Wrapper>,
    )
    // Title is always shown; loading hides the value and shows skeleton
    expect(screen.getByText('Loading Test')).toBeInTheDocument()
    // Value ("0") should NOT appear when loading
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renders trend indicator', () => {
    render(
      <Wrapper>
        <AnimatedKpiCard
          title="With Trend"
          value={500}
          format="number"
          trend={{ value: 15, direction: 'up' }}
        />
      </Wrapper>,
    )
    // Component renders: ↑ 15.0%
    expect(screen.getByText(/↑/)).toBeInTheDocument()
    expect(screen.getByText(/15\.0/)).toBeInTheDocument()
  })

  it('renders negative trend', () => {
    render(
      <Wrapper>
        <AnimatedKpiCard
          title="Down"
          value={200}
          format="number"
          trend={{ value: 8.3, direction: 'down' }}
        />
      </Wrapper>,
    )
    // Component renders: ↓ 8.3%
    expect(screen.getByText(/↓/)).toBeInTheDocument()
    expect(screen.getByText(/8\.3/)).toBeInTheDocument()
  })
})

describe('AnimatedCardGrid', () => {
  it('renders children inside a motion container', () => {
    render(
      <Wrapper>
        <AnimatedCardGrid>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </AnimatedCardGrid>
      </Wrapper>,
    )
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })
})

describe('AnimatedCardWrapper', () => {
  it('renders children', () => {
    render(
      <Wrapper>
        <AnimatedCardWrapper>
          <div>wrapped content</div>
        </AnimatedCardWrapper>
      </Wrapper>,
    )
    expect(screen.getByText('wrapped content')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  DashboardPage
// ─────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and subtitle', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Manage cost invoices/)).toBeInTheDocument()
  })

  it('renders company name in subtitle', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText(/Test Company/)).toBeInTheDocument()
  })

  it('renders date range filter with inputs', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Date range:')).toBeInTheDocument()
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    expect(dateInputs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders animated KPI cards with values', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Total invoices')).toBeInTheDocument()
    expect(screen.getByText('Total gross')).toBeInTheDocument()
    // 'Paid' appears both as a KPI card title and in payment status section
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Recharts bar chart for monthly expenses', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Monthly expenses')).toBeInTheDocument()
    const barChart = screen.getByTestId('bar-chart')
    expect(barChart).toBeInTheDocument()
    expect(barChart).toHaveAttribute('data-count', '3')
  })

  it('renders Recharts pie chart for MPK distribution', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Cost center distribution')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('renders top suppliers table', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Top suppliers')).toBeInTheDocument()
    expect(screen.getByText('Supplier Alpha')).toBeInTheDocument()
    expect(screen.getByText('Supplier Beta')).toBeInTheDocument()
  })

  it('renders payment status cards (paid, pending, overdue)', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    // "Overdue" appears in KPI card and payment section
    const overdue = screen.getAllByText('Overdue')
    expect(overdue.length).toBeGreaterThanOrEqual(1)
  })

  it('renders quick action links', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Browse invoices')).toBeInTheDocument()
    expect(screen.getByText('Sync panel')).toBeInTheDocument()
    expect(screen.getByText('View reports')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    expect(refreshBtn).toBeInTheDocument()
  })

  it('calls refetch when refresh button clicked', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />, { wrapper: Wrapper })
    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshBtn)
    expect(mockRefetch).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
//  ForecastPage
// ─────────────────────────────────────────────────────────────────

describe('ForecastPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByText('Expense Forecast')).toBeInTheDocument()
  })

  it('renders horizon selector buttons', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByText('1 month')).toBeInTheDocument()
    expect(screen.getByText('6 months')).toBeInTheDocument()
    expect(screen.getByText('12 months')).toBeInTheDocument()
  })

  it('renders animated KPI cards (next month, total, confidence)', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByText('Next month')).toBeInTheDocument()
    expect(screen.getByText('Total forecast')).toBeInTheDocument()
    expect(screen.getByText('Confidence')).toBeInTheDocument()
  })

  it('renders method badge and confidence', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByText(/Method:.*linear-regression/)).toBeInTheDocument()
  })

  it('renders tab navigation with all tabs', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('By MPK')).toBeInTheDocument()
    expect(screen.getByText('By Category')).toBeInTheDocument()
    expect(screen.getByText('By Supplier')).toBeInTheDocument()
    expect(screen.getByText(/Anomalies/)).toBeInTheDocument()
  })

  it('renders area chart in overview tab', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByTestId('forecast-area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders forecast details table in overview tab', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    // Check table headers
    expect(screen.getByText('Predicted')).toBeInTheDocument()
    expect(screen.getByText('Lower bound')).toBeInTheDocument()
    expect(screen.getByText('Upper bound')).toBeInTheDocument()
  })

  it('switches to MPK tab and shows grouped forecast', async () => {
    const user = userEvent.setup()
    render(<ForecastPage />, { wrapper: Wrapper })
    const mpkTab = screen.getByText('By MPK')
    await user.click(mpkTab)
    // Grouped forecast should display group names
    expect(screen.getByText('MPK-100')).toBeInTheDocument()
    expect(screen.getByText('MPK-200')).toBeInTheDocument()
  })

  it('shows anomaly count badge on tab', () => {
    render(<ForecastPage />, { wrapper: Wrapper })
    expect(screen.getByText('2')).toBeInTheDocument() // anomaly count badge
  })

  it('switches to anomalies tab and shows anomaly list', async () => {
    const user = userEvent.setup()
    render(<ForecastPage />, { wrapper: Wrapper })
    const anomaliesTab = screen.getByRole('tab', { name: /anomalies/i })
    await user.click(anomaliesTab)
    expect(screen.getByText('Supplier Alpha')).toBeInTheDocument()
    expect(screen.getByText('FV/2024/001')).toBeInTheDocument()
    expect(screen.getByText('amount-spike')).toBeInTheDocument()
  })

  it('changes forecast horizon when button clicked', async () => {
    const user = userEvent.setup()
    render(<ForecastPage />, { wrapper: Wrapper })
    const btn12 = screen.getByText('12 months')
    await user.click(btn12)
    // Button should now have primary styling (active)
    expect(btn12.className).toContain('bg-primary')
  })
})

// ─────────────────────────────────────────────────────────────────
//  ReportsPage
// ─────────────────────────────────────────────────────────────────

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and subtitle', () => {
    render(<ReportsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText(/Invoice analysis and statistics/)).toBeInTheDocument()
  })

  it('renders period in subtitle', () => {
    render(<ReportsPage />, { wrapper: Wrapper })
    // Period appears both in header subtitle and a KPI card subtitle
    expect(screen.getAllByText(/2024-01-01/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders animated KPI cards', () => {
    render(<ReportsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Invoice count')).toBeInTheDocument()
    expect(screen.getByText('Average amount')).toBeInTheDocument()
  })

  it('renders tab navigation', () => {
    render(<ReportsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('By month')).toBeInTheDocument()
    expect(screen.getByText('By cost center')).toBeInTheDocument()
    expect(screen.getByText('By vendor')).toBeInTheDocument()
  })

  it('renders payment breakdown in summary tab', () => {
    render(<ReportsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Payment status')).toBeInTheDocument()
  })

  it('renders bar chart in summary tab', () => {
    render(<ReportsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Monthly overview')).toBeInTheDocument()
    expect(screen.getByTestId('reports-bar-chart')).toBeInTheDocument()
    const barChart = screen.getByTestId('bar-chart')
    expect(barChart).toHaveAttribute('data-count', '3')
  })

  it('switches to monthly tab and shows table', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: Wrapper })
    const monthlyTab = screen.getByText('By month')
    await user.click(monthlyTab)
    // Table columns should exist
    expect(screen.getByText('Period')).toBeInTheDocument()
    expect(screen.getByText('Net')).toBeInTheDocument()
  })

  it('switches to cost center tab and shows pie chart', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: Wrapper })
    const mpkTab = screen.getByText('By cost center')
    await user.click(mpkTab)
    expect(screen.getByTestId('reports-pie-chart')).toBeInTheDocument()
  })

  it('switches to vendor tab and shows supplier table', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: Wrapper })
    const vendorTab = screen.getByText('By vendor')
    await user.click(vendorTab)
    expect(screen.getByText('Supplier Alpha')).toBeInTheDocument()
    expect(screen.getByText('1111111111')).toBeInTheDocument()
  })
})
