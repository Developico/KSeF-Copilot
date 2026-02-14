import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

// ── Mock data ───────────────────────────────────────────────────

const manualInvoice = {
  id: 'inv-manual',
  invoiceNumber: 'MAN/2024/001',
  supplierNip: '5555555555',
  supplierName: 'Manual Supplier',
  supplierAddress: 'Ręczna 1',
  supplierCity: 'Kraków',
  supplierPostalCode: '30-001',
  invoiceDate: '2024-03-10',
  dueDate: '2024-04-10',
  netAmount: 2000,
  vatAmount: 460,
  grossAmount: 2460,
  currency: 'PLN',
  paymentStatus: 'pending',
  mpk: 'MPK-100',
  category: 'Office',
  description: 'Manual test invoice',
  importedAt: '2024-03-11',
  tenantNip: '0987654321',
  tenantName: 'My Company',
  referenceNumber: 'REF-MAN-001',
  source: 'Manual',
  items: [],
}

const ksefInvoice = {
  ...manualInvoice,
  id: 'inv-ksef',
  invoiceNumber: 'KSEF/2024/001',
  source: 'KSeF',
}

// ── Mock hooks ──────────────────────────────────────────────────

const mockUpdateMutate = vi.fn()
const mockMarkAsPaidMutate = vi.fn()
let currentInvoice = manualInvoice

vi.mock('@/hooks/use-api', () => ({
  useInvoice: vi.fn(() => ({
    data: currentInvoice,
    isLoading: false,
    error: null,
  })),
  useMarkInvoiceAsPaid: vi.fn(() => ({
    mutate: mockMarkAsPaidMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useUpdateInvoice: vi.fn(() => ({
    mutate: mockUpdateMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useInvoiceAttachments: vi.fn(() => ({
    data: { attachments: [], count: 0 },
    isLoading: false,
  })),
  useUploadAttachment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteAttachment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useInvoiceNotes: vi.fn(() => ({
    data: { notes: [], count: 0 },
    isLoading: false,
  })),
  useCreateNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useGusLookup: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useExchangeRate: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// ── Wrapper ─────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en" messages={messages}>
          <MemoryRouter>{children}</MemoryRouter>
        </IntlProvider>
      </QueryClientProvider>
    )
  }
}

// ─────────────────────────────────────────────────────────────────
//  Invoice Detail – Manual Invoice Edit Mode
// ─────────────────────────────────────────────────────────────────

/** Find the manual‐invoice edit button (the one that is NOT a dialog trigger). */
function getManualEditButton(): HTMLElement {
  const editButtons = screen.getAllByText(messages['common.edit'])
  const btn = editButtons.find((el) => !el.hasAttribute('data-slot'))
  if (!btn) throw new Error('Manual edit button not found')
  return btn
}

describe('InvoiceDetailPage – Manual Invoice Edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentInvoice = manualInvoice
  })

  it('shows edit button for manual invoices', async () => {
    const { InvoiceDetailPage } = await import('@/pages/invoice-detail')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <InvoiceDetailPage />
        </AuthProvider>
      </Wrapper>,
    )

    expect(getManualEditButton()).toBeInTheDocument()
  })

  it('does not show edit button for KSeF invoices', async () => {
    currentInvoice = ksefInvoice
    const { InvoiceDetailPage } = await import('@/pages/invoice-detail')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <InvoiceDetailPage />
        </AuthProvider>
      </Wrapper>,
    )

    // Only the classification dialog "Edit" button should exist, no manual edit
    const editButtons = screen.getAllByText(messages['common.edit'])
    expect(editButtons).toHaveLength(1)
    expect(editButtons[0]).toHaveAttribute('data-slot', 'dialog-trigger')
  })

  it('shows edit form when edit button is clicked', async () => {
    const { InvoiceDetailPage } = await import('@/pages/invoice-detail')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      <Wrapper>
        <AuthProvider>
          <InvoiceDetailPage />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(getManualEditButton())

    // Edit form should show pre-filled values
    expect(screen.getByDisplayValue('Manual Supplier')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5555555555')).toBeInTheDocument()
    expect(screen.getByDisplayValue('MAN/2024/001')).toBeInTheDocument()
  })

  it('populates edit form with invoice data', async () => {
    const { InvoiceDetailPage } = await import('@/pages/invoice-detail')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      <Wrapper>
        <AuthProvider>
          <InvoiceDetailPage />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(getManualEditButton())

    // Check date and amount fields
    expect(screen.getByDisplayValue('2024-03-10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-04-10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('460')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2460')).toBeInTheDocument()
  })

  it('cancels edit mode', async () => {
    const { InvoiceDetailPage } = await import('@/pages/invoice-detail')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      <Wrapper>
        <AuthProvider>
          <InvoiceDetailPage />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(getManualEditButton())

    // Edit form should be visible
    expect(screen.getByDisplayValue('Manual Supplier')).toBeInTheDocument()

    // Click cancel button
    await user.click(screen.getByText(messages['common.cancel']))

    // Edit form should be gone, manual edit button should be back
    expect(screen.queryByDisplayValue('Manual Supplier')).not.toBeInTheDocument()
    expect(getManualEditButton()).toBeInTheDocument()
  })

  it('calls updateInvoice.mutate when save is clicked', async () => {
    const { InvoiceDetailPage } = await import('@/pages/invoice-detail')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      <Wrapper>
        <AuthProvider>
          <InvoiceDetailPage />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(getManualEditButton())

    // Change supplier name
    const nameInput = screen.getByDisplayValue('Manual Supplier')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Supplier')

    // Click save
    await user.click(screen.getByText(messages['common.save']))

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1)
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inv-manual',
        data: expect.objectContaining({
          supplierName: 'Updated Supplier',
          supplierNip: '5555555555',
          invoiceNumber: 'MAN/2024/001',
        }),
      }),
      expect.any(Object),
    )
  })
})
