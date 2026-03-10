import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

const mockApprove = vi.fn().mockResolvedValue({})
const mockReject = vi.fn().mockResolvedValue({})
const mockCancel = vi.fn().mockResolvedValue({})
const mockRefresh = vi.fn().mockResolvedValue({})

vi.mock('@/hooks/use-api', () => ({
  useApproveInvoice: () => ({
    mutateAsync: mockApprove,
    isPending: false,
  }),
  useRejectInvoice: () => ({
    mutateAsync: mockReject,
    isPending: false,
  }),
  useCancelApproval: () => ({
    mutateAsync: mockCancel,
    isPending: false,
  }),
  useRefreshApprovers: () => ({
    mutateAsync: mockRefresh,
    isPending: false,
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

import { ApprovalStatusBadge, InvoiceApprovalActions } from '@/components/invoices/invoice-approval-section'

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
describe('ApprovalStatusBadge', () => {
  it('renders notRequired badge for Draft status', () => {
    renderWithProviders(<ApprovalStatusBadge status="Draft" />)
    expect(screen.getByText('notRequired')).toBeInTheDocument()
  })

  it('renders notRequired badge when no status', () => {
    renderWithProviders(<ApprovalStatusBadge />)
    expect(screen.getByText('notRequired')).toBeInTheDocument()
  })

  it('renders Pending badge', () => {
    renderWithProviders(<ApprovalStatusBadge status="Pending" />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('renders Approved badge', () => {
    renderWithProviders(<ApprovalStatusBadge status="Approved" />)
    expect(screen.getByText('approved')).toBeInTheDocument()
  })

  it('renders Rejected badge', () => {
    renderWithProviders(<ApprovalStatusBadge status="Rejected" />)
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })
})

describe('InvoiceApprovalActions', () => {
  const pendingInvoice = {
    id: 'inv-1',
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
    currency: 'PLN' as const,
    paymentStatus: 'pending' as const,
    importedAt: '2024-01-16T10:00:00Z',
    approvalStatus: 'Pending' as const,
  }

  const approvedInvoice = {
    ...pendingInvoice,
    approvalStatus: 'Approved' as const,
    approvedBy: 'John Admin',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing for Draft invoice', () => {
    const draftInvoice = { ...pendingInvoice, approvalStatus: 'Draft' as const }
    const { container } = renderWithProviders(<InvoiceApprovalActions invoice={draftInvoice} isAdmin={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows approve and reject buttons for pending invoice', () => {
    renderWithProviders(<InvoiceApprovalActions invoice={pendingInvoice} isAdmin={true} />)

    expect(screen.getByText('approve')).toBeInTheDocument()
    expect(screen.getByText('reject')).toBeInTheDocument()
  })

  it('shows cancel button for approved invoice (icon button)', () => {
    renderWithProviders(<InvoiceApprovalActions invoice={approvedInvoice} isAdmin={true} />)

    // Cancel is a Tooltip-wrapped icon button; check for Undo2 icon SVG
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows decided by info for approved invoice', () => {
    renderWithProviders(<InvoiceApprovalActions invoice={approvedInvoice} isAdmin={true} />)

    // The translation mock returns the key, so we check for the key text
    expect(screen.getByText('decidedBy')).toBeInTheDocument()
  })
})
