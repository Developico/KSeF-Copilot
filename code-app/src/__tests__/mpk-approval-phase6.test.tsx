import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'
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

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: vi.fn(() => ({
    companies: [{ id: 'c1', nip: '1234567890', companyName: 'Test Company', environment: 'test', isActive: true }],
    selectedCompany: { id: 'c1', nip: '1234567890', companyName: 'Test Company', environment: 'test', isActive: true },
    setSelectedCompany: vi.fn(),
    isLoading: false,
  })),
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// ── Mock hooks (configurable) ───────────────────────────────────

const mockApproveMutate = vi.fn()
const mockRejectMutate = vi.fn()
const mockCancelMutate = vi.fn()
const mockRefreshMutate = vi.fn()
const mockCreateMpkMutate = vi.fn()
const mockDeactivateMpkMutate = vi.fn()
const mockMarkReadMutate = vi.fn()
const mockDismissMutate = vi.fn()
const mockSetApproversMutate = vi.fn()

let mockMpkCenters: unknown = undefined
let mockPendingApprovals: unknown[] = []
let mockBudgetSummary: unknown = undefined
let mockNotifications: unknown = undefined
let mockUnreadCount: unknown = undefined
let mockDvUsers: unknown[] = []
let mockApprovers: unknown[] = []
let mockBudgetStatus: unknown = undefined

vi.mock('@/hooks/use-api', () => ({
  useMpkCenters: vi.fn(() => ({ data: mockMpkCenters, isLoading: false })),
  useMpkCenter: vi.fn(() => ({ data: null, isLoading: false })),
  useCreateMpkCenter: vi.fn(() => ({ mutateAsync: mockCreateMpkMutate, isPending: false })),
  useUpdateMpkCenter: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeactivateMpkCenter: vi.fn(() => ({ mutate: mockDeactivateMpkMutate, isPending: false })),
  useMpkApprovers: vi.fn(() => ({ data: mockApprovers, isLoading: false })),
  useSetMpkApprovers: vi.fn(() => ({ mutateAsync: mockSetApproversMutate, isPending: false })),
  useMpkBudgetStatus: vi.fn(() => ({ data: mockBudgetStatus, isLoading: false })),
  useDvUsers: vi.fn(() => ({ data: mockDvUsers, isLoading: false })),
  usePendingApprovals: vi.fn(() => ({ data: mockPendingApprovals, isLoading: false })),
  useApproveInvoice: vi.fn(() => ({ mutate: mockApproveMutate, mutateAsync: mockApproveMutate, isPending: false })),
  useRejectInvoice: vi.fn(() => ({ mutate: mockRejectMutate, mutateAsync: mockRejectMutate, isPending: false })),
  useCancelApproval: vi.fn(() => ({ mutate: mockCancelMutate, isPending: false })),
  useRefreshApprovers: vi.fn(() => ({ mutate: mockRefreshMutate, isPending: false })),
  useBulkApprove: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useBudgetSummary: vi.fn(() => ({ data: mockBudgetSummary, isLoading: false })),
  useNotifications: vi.fn(() => ({ data: mockNotifications, isLoading: false })),
  useNotificationsUnreadCount: vi.fn(() => ({ data: mockUnreadCount })),
  useMarkNotificationRead: vi.fn(() => ({ mutate: mockMarkReadMutate })),
  useDismissNotification: vi.fn(() => ({ mutate: mockDismissMutate })),
  useReportBudgetUtilization: vi.fn(() => ({ data: null, isLoading: false })),
  useReportApprovalHistory: vi.fn(() => ({ data: null, isLoading: false })),
}))

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Test User', oid: 'user-oid-1' },
    isAuthenticated: true,
    isAdmin: true,
    logout: vi.fn(),
  })),
  useHasRole: vi.fn(() => true),
}))

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

import { ApprovalStatusBadge } from '@/components/invoices/approval-status-badge'
import { InvoiceApprovalSection } from '@/components/invoices/invoice-approval-section'
import { BudgetSummaryCards } from '@/components/dashboard/budget-summary-cards'
import { NotificationBell } from '@/components/layout/notification-bell'
import { MpkCentersTab } from '@/components/settings/mpk-centers-tab'

// ─────────────────────────────────────────────────────────────────
//  ApprovalStatusBadge
// ─────────────────────────────────────────────────────────────────

describe('ApprovalStatusBadge', () => {
  it('renders N/A badge for Draft status', () => {
    render(<ApprovalStatusBadge status="Draft" />, { wrapper: Wrapper })
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders N/A badge when status is undefined', () => {
    render(<ApprovalStatusBadge status={undefined} />, { wrapper: Wrapper })
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders Pending badge', () => {
    render(<ApprovalStatusBadge status="Pending" />, { wrapper: Wrapper })
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders Approved badge with green styling', () => {
    render(<ApprovalStatusBadge status="Approved" />, { wrapper: Wrapper })
    const badge = screen.getByText('Approved')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100')
  })

  it('renders Rejected badge with red styling', () => {
    render(<ApprovalStatusBadge status="Rejected" />, { wrapper: Wrapper })
    const badge = screen.getByText('Rejected')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-100')
  })

  it('renders Cancelled badge', () => {
    render(<ApprovalStatusBadge status="Cancelled" />, { wrapper: Wrapper })
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  InvoiceApprovalSection
// ─────────────────────────────────────────────────────────────────

describe('InvoiceApprovalSection', () => {
  const baseInvoice = {
    id: 'inv-1',
    ksefNumber: 'FV/2024/001',
    invoiceNumber: 'FV/001',
    settingId: 'c1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders approval title', () => {
    render(
      <InvoiceApprovalSection invoice={{ ...baseInvoice, approvalStatus: 'Pending' } as never} isAdmin={true} onRefresh={vi.fn()} />,
      { wrapper: Wrapper },
    )

    expect(screen.getByText('Approval')).toBeInTheDocument()
  })

  it('shows approve and reject buttons for pending invoices', () => {
    render(
      <InvoiceApprovalSection invoice={{ ...baseInvoice, approvalStatus: 'Pending' } as never} isAdmin={true} onRefresh={vi.fn()} />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('shows cancel button for approved invoices', () => {
    render(
      <InvoiceApprovalSection
        invoice={{ ...baseInvoice, approvalStatus: 'Approved', approvedBy: 'Admin' } as never}
        isAdmin={true}
        onRefresh={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('Cancel approval')).toBeInTheDocument()
  })

  it('shows decided by info for non-pending statuses', () => {
    render(
      <InvoiceApprovalSection
        invoice={{
          ...baseInvoice,
          approvalStatus: 'Approved',
          approvedBy: 'John Doe',
          approvedAt: '2024-03-15T10:00:00Z',
        } as never}
        isAdmin={true}
        onRefresh={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('Decided by')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('calls approve mutation when approve is clicked', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceApprovalSection invoice={{ ...baseInvoice, approvalStatus: 'Pending' } as never} isAdmin={true} onRefresh={vi.fn()} />,
      { wrapper: Wrapper },
    )

    await user.click(screen.getByText('Approve'))
    await waitFor(() => expect(mockApproveMutate).toHaveBeenCalledTimes(1))
  })

  it('calls reject mutation when reject is clicked', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceApprovalSection invoice={{ ...baseInvoice, approvalStatus: 'Pending' } as never} isAdmin={true} onRefresh={vi.fn()} />,
      { wrapper: Wrapper },
    )

    await user.click(screen.getByText('Reject'))
    await waitFor(() => expect(mockRejectMutate).toHaveBeenCalledTimes(1))
  })
})

// ─────────────────────────────────────────────────────────────────
//  BudgetSummaryCards
// ─────────────────────────────────────────────────────────────────

describe('BudgetSummaryCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBudgetSummary = undefined
  })

  it('renders nothing when no budget data is available', () => {
    mockBudgetSummary = undefined
    const { container } = render(<BudgetSummaryCards settingId="c1" />, { wrapper: Wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('renders budget summary title when data is available', () => {
    mockBudgetSummary = {
      data: [
        { mpkCenterId: 'mpk1', mpkCenterName: 'Marketing', budgetAmount: 10000, utilized: 4000, remaining: 6000, utilizationPercent: 40, isWarning: false, isExceeded: false, invoiceCount: 5, budgetPeriod: 'Monthly', budgetStartDate: '2024-01-01', periodStart: '2024-03-01', periodEnd: '2024-03-31' },
      ],
      count: 1,
    }
    render(<BudgetSummaryCards settingId="c1" />, { wrapper: Wrapper })
    expect(screen.getByText('Budget Summary')).toBeInTheDocument()
  })

  it('renders MPK center utilization bars', () => {
    mockBudgetSummary = {
      data: [
        { mpkCenterId: 'mpk1', mpkCenterName: 'Marketing', budgetAmount: 10000, utilized: 8000, remaining: 2000, utilizationPercent: 80, isWarning: true, isExceeded: false, invoiceCount: 10, budgetPeriod: 'Monthly', budgetStartDate: '2024-01-01', periodStart: '2024-03-01', periodEnd: '2024-03-31' },
        { mpkCenterId: 'mpk2', mpkCenterName: 'IT', budgetAmount: 20000, utilized: 5000, remaining: 15000, utilizationPercent: 25, isWarning: false, isExceeded: false, invoiceCount: 3, budgetPeriod: 'Monthly', budgetStartDate: '2024-01-01', periodStart: '2024-03-01', periodEnd: '2024-03-31' },
      ],
      count: 2,
    }
    render(<BudgetSummaryCards settingId="c1" />, { wrapper: Wrapper })
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('IT')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  NotificationBell
// ─────────────────────────────────────────────────────────────────

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifications = undefined
    mockUnreadCount = undefined
  })

  it('renders bell button', () => {
    render(<NotificationBell />, { wrapper: Wrapper })
    expect(screen.getByTitle('Notifications')).toBeInTheDocument()
  })

  it('shows unread count badge when there are unread notifications', () => {
    mockUnreadCount = { count: 3 }
    render(<NotificationBell />, { wrapper: Wrapper })
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides badge when count is zero', () => {
    mockUnreadCount = { count: 0 }
    render(<NotificationBell />, { wrapper: Wrapper })
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    mockNotifications = {
      data: [
        { id: 'n1', type: 'ApprovalRequested', title: 'New approval', message: 'Invoice needs approval', isRead: false, createdOn: '2024-03-15T10:00:00Z' },
      ],
      count: 1,
    }
    mockUnreadCount = { count: 1 }
    render(<NotificationBell />, { wrapper: Wrapper })

    await user.click(screen.getByTitle('Notifications'))
    expect(screen.getByText('Invoice needs approval')).toBeInTheDocument()
  })

  it('shows empty state when no notifications', async () => {
    const user = userEvent.setup()
    mockNotifications = { data: [], count: 0 }
    render(<NotificationBell />, { wrapper: Wrapper })

    await user.click(screen.getByTitle('Notifications'))
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  MpkCentersTab
// ─────────────────────────────────────────────────────────────────

describe('MpkCentersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMpkCenters = undefined
    mockDvUsers = []
    mockApprovers = []
    mockBudgetStatus = undefined
  })

  it('renders title and subtitle', () => {
    mockMpkCenters = { mpkCenters: [], count: 0 }
    render(<MpkCentersTab />, { wrapper: Wrapper })
    expect(screen.getByText('Cost Centers')).toBeInTheDocument()
    expect(screen.getByText('Manage cost centers, approval workflows and budgets')).toBeInTheDocument()
  })

  it('shows empty state when no MPK centers', () => {
    mockMpkCenters = { mpkCenters: [], count: 0 }
    render(<MpkCentersTab />, { wrapper: Wrapper })
    expect(screen.getByText('No cost centers yet')).toBeInTheDocument()
  })

  it('renders MPK center cards', () => {
    mockMpkCenters = {
      mpkCenters: [
        { id: 'mpk1', name: 'Marketing', description: 'Marketing dept', isActive: true, approvalRequired: true, slaHours: 24, budgetAmount: 10000, budgetPeriod: 'Monthly' },
        { id: 'mpk2', name: 'IT', description: 'IT dept', isActive: true, approvalRequired: false },
      ],
      count: 2,
    }
    render(<MpkCentersTab />, { wrapper: Wrapper })
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('IT')).toBeInTheDocument()
  })

  it('shows inactive badge for inactive centers', () => {
    mockMpkCenters = {
      mpkCenters: [
        { id: 'mpk1', name: 'Old Center', description: '', isActive: false },
      ],
      count: 1,
    }
    render(<MpkCentersTab />, { wrapper: Wrapper })
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows approval required badge', () => {
    mockMpkCenters = {
      mpkCenters: [
        { id: 'mpk1', name: 'Center', description: '', isActive: true, approvalRequired: true },
      ],
      count: 1,
    }
    render(<MpkCentersTab />, { wrapper: Wrapper })
    expect(screen.getByText('Approval required')).toBeInTheDocument()
  })

  it('shows add button', () => {
    mockMpkCenters = { mpkCenters: [], count: 0 }
    render(<MpkCentersTab />, { wrapper: Wrapper })
    expect(screen.getByText('Add Cost Center')).toBeInTheDocument()
  })
})
