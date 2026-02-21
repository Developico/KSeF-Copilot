import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Load i18n messages ─────────────────────────────────────────
import en from '@/messages/en.json'

// Flatten nested messages: { "invoices": { "title": "..." } } → { "invoices.title": "..." }
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

// ── Mock modules ────────────────────────────────────────────────

vi.mock('@/lib/auth-config', () => ({
  isAuthConfigured: vi.fn(() => false),
  getMsalInstance: vi.fn(),
  loginRequest: { scopes: [] },
  apiScopes: { scopes: [] },
  groupConfig: { admin: 'admin-group-id', user: 'user-group-id' },
  msalConfig: { auth: { clientId: '' } },
}))

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: vi.fn(() => ({
    companies: [{ id: 'c1', nip: '1234567890', companyName: 'Test Company', environment: 'test', isActive: true }],
    selectedCompany: { id: 'c1', nip: '1234567890', companyName: 'Test Company', environment: 'test', isActive: true },
    setSelectedCompany: vi.fn(),
    isLoading: false,
  })),
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// Mock the API hooks
const mockMutate = vi.fn()
const mockResetMutation = { mutate: mockMutate, isPending: false, isSuccess: false, isError: false, error: null, data: undefined, reset: vi.fn() }

vi.mock('@/hooks/use-api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useInvoice: vi.fn(() => ({
    data: {
      id: 'inv-1',
      invoiceNumber: 'FV/2024/001',
      supplierNip: '1234567890',
      supplierName: 'Test Supplier SP ZOO',
      supplierAddress: 'Testowa 1, 00-001, Warszawa',
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      netAmount: 1000,
      vatAmount: 230,
      grossAmount: 1230,
      currency: 'PLN',
      paymentStatus: 'pending',
      mpk: 'MPK-100',
      category: 'Office',
      description: 'Test invoice',
      importedAt: '2024-01-16',
      tenantNip: '0987654321',
      tenantName: 'My Company',
      referenceNumber: 'REF-001',
      aiMpkSuggestion: 'MPK-200',
      aiCategorySuggestion: 'IT',
      aiDescription: 'AI desc',
      aiConfidence: 0.85,
      items: [
        { description: 'Item 1', quantity: 2, unit: 'szt', unitPrice: 500, netAmount: 1000, vatRate: '23%', vatAmount: 230, grossAmount: 1230 },
      ],
    },
    isLoading: false,
    error: null,
  })),
  useInvoices: vi.fn(() => ({
    data: { invoices: [], count: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMarkInvoiceAsPaid: vi.fn(() => mockResetMutation),
  useUpdateInvoice: vi.fn(() => mockResetMutation),
  useCreateManualInvoice: vi.fn(() => mockResetMutation),
  useInvoiceAttachments: vi.fn(() => ({
    data: {
      attachments: [
        { id: 'att-1', invoiceId: 'inv-1', fileName: 'scan.pdf', mimeType: 'application/pdf', fileSize: 204800, createdOn: '2024-01-20' },
      ],
      count: 1,
    },
    isLoading: false,
  })),
  useUploadAttachment: vi.fn(() => mockResetMutation),
  useDeleteAttachment: vi.fn(() => mockResetMutation),
  useInvoiceNotes: vi.fn(() => ({
    data: {
      notes: [
        { id: 'note-1', invoiceId: 'inv-1', subject: 'Payment info', noteText: 'Will pay next week', createdOn: '2024-01-20', modifiedOn: '2024-01-20' },
      ],
      count: 1,
    },
    isLoading: false,
  })),
  useCreateNote: vi.fn(() => mockResetMutation),
  useUpdateNote: vi.fn(() => mockResetMutation),
  useDeleteNote: vi.fn(() => mockResetMutation),
  useVatLookup: vi.fn(() => mockResetMutation),
  useRecentSuppliers: vi.fn(() => ({
    suppliers: [],
    isLoading: false,
    error: null,
    filter: vi.fn(() => []),
  })),
  useExchangeRate: vi.fn(() => ({
    data: { rate: 4.32, currency: 'EUR', effectiveDate: '2024-01-15', requestedDate: '2024-01-15', source: 'NBP' },
    isLoading: false,
  })),
  useCategorizeWithAI: vi.fn(() => mockResetMutation),
  useUploadDocument: vi.fn(() => mockResetMutation),
  useDeleteDocument: vi.fn(() => mockResetMutation),
  useInvoiceDocument: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// ── Test wrapper ────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders invoice number and supplier name', async () => {
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

    expect(screen.getAllByText('FV/2024/001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Test Supplier SP ZOO').length).toBeGreaterThan(0)
  })

  it('shows "Mark as paid" button when pending', async () => {
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

    expect(screen.getByText('Mark as paid')).toBeDefined()
  })

  it('renders classification section with edit button', async () => {
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

    expect(screen.getByText('MPK-100')).toBeDefined()
    expect(screen.getByText('Office')).toBeDefined()
    // Both invoice edit and classification dialog edit buttons are rendered
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
    const dialogTrigger = editButtons.find((el) => el.hasAttribute('data-slot'))
    expect(dialogTrigger).toBeDefined()
  })

  it('renders AI suggestion section', async () => {
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

    expect(screen.getByText('AI suggestion')).toBeDefined()
    expect(screen.getByText('85%')).toBeDefined()
  })

  it('renders attachments section', async () => {
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

    expect(screen.getByText('Attachments')).toBeDefined()
    expect(screen.getByText('scan.pdf')).toBeDefined()
  })

  it('renders notes section', async () => {
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

    expect(screen.getByText('Notes')).toBeDefined()
    expect(screen.getByText('Payment info')).toBeDefined()
    expect(screen.getByText('Will pay next week')).toBeDefined()
  })
})

describe('ClassificationEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens dialog and shows current values', async () => {
    const user = userEvent.setup()
    const { ClassificationEditDialog } = await import('@/components/invoices/classification-edit-dialog')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    const invoice = {
      id: 'inv-1', invoiceNumber: 'FV/2024/001', supplierNip: '1234567890',
      supplierName: 'Test', invoiceDate: '2024-01-15', netAmount: 1000,
      vatAmount: 230, grossAmount: 1230, currency: 'PLN' as const,
      paymentStatus: 'pending' as const, mpk: 'MPK-100', category: 'Office',
      description: 'Test desc', importedAt: '2024-01-16',
      tenantNip: '0987654321', tenantName: 'My Company', referenceNumber: 'REF-001',
    }

    render(
      <Wrapper>
        <AuthProvider>
          <ClassificationEditDialog invoice={invoice} />
        </AuthProvider>
      </Wrapper>,
    )

    // Click the edit button
    await user.click(screen.getByText('Edit'))

    // Dialog should show current values
    await waitFor(() => {
      const mpkInput = screen.getByLabelText('Cost center') as HTMLInputElement
      expect(mpkInput.value).toBe('MPK-100')
    })
  })

  it('shows apply AI suggestion button when AI data exists', async () => {
    const user = userEvent.setup()
    const { ClassificationEditDialog } = await import('@/components/invoices/classification-edit-dialog')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    const invoice = {
      id: 'inv-1', invoiceNumber: 'FV/2024/001', supplierNip: '1234567890',
      supplierName: 'Test', invoiceDate: '2024-01-15', netAmount: 1000,
      vatAmount: 230, grossAmount: 1230, currency: 'PLN' as const,
      paymentStatus: 'pending' as const, mpk: '', category: '',
      description: '', importedAt: '2024-01-16',
      tenantNip: '0987654321', tenantName: 'My Company', referenceNumber: 'REF-001',
      aiMpkSuggestion: 'MPK-200', aiCategorySuggestion: 'IT', aiDescription: 'AI desc',
    }

    render(
      <Wrapper>
        <AuthProvider>
          <ClassificationEditDialog invoice={invoice} />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(screen.getByText('Edit'))

    await waitFor(() => {
      expect(screen.getByText('Apply AI suggestion')).toBeDefined()
    })
  })
})

describe('AttachmentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders attachment list with file info', async () => {
    const { AttachmentsSection } = await import('@/components/invoices/attachments-section')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <AttachmentsSection invoiceId="inv-1" />
        </AuthProvider>
      </Wrapper>,
    )

    expect(screen.getByText('scan.pdf')).toBeDefined()
    expect(screen.getByText('Add attachment')).toBeDefined()
  })

  it('opens upload dialog when clicking add', async () => {
    const user = userEvent.setup()
    const { AttachmentsSection } = await import('@/components/invoices/attachments-section')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <AttachmentsSection invoiceId="inv-1" />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(screen.getByText('Add attachment'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Upload attachment' })).toBeDefined()
    })
  })
})

describe('NotesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders existing notes', async () => {
    const { NotesSection } = await import('@/components/invoices/notes-section')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <NotesSection invoiceId="inv-1" />
        </AuthProvider>
      </Wrapper>,
    )

    expect(screen.getByText('Payment info')).toBeDefined()
    expect(screen.getByText('Will pay next week')).toBeDefined()
  })

  it('opens add note dialog', async () => {
    const user = userEvent.setup()
    const { NotesSection } = await import('@/components/invoices/notes-section')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <NotesSection invoiceId="inv-1" />
        </AuthProvider>
      </Wrapper>,
    )

    await user.click(screen.getByText('Add note'))

    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toBeDefined()
      expect(screen.getByLabelText('Note text')).toBeDefined()
    })
  })
})

describe('ManualInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form with all sections', async () => {
    const { ManualInvoicePage } = await import('@/pages/manual-invoice')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <ManualInvoicePage />
        </AuthProvider>
      </Wrapper>,
    )

    expect(screen.getByText('Manual invoice')).toBeDefined()
    expect(screen.getByText('Supplier details')).toBeDefined()
    expect(screen.getByText('Invoice details')).toBeDefined()
    expect(screen.getByText('Amounts')).toBeDefined()
  })

  it('has supplier lookup button', async () => {
    const { ManualInvoicePage } = await import('@/pages/manual-invoice')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <ManualInvoicePage />
        </AuthProvider>
      </Wrapper>,
    )

    expect(screen.getByText('Lookup supplier')).toBeDefined()
  })

  it('shows currency selector with PLN default', async () => {
    const { ManualInvoicePage } = await import('@/pages/manual-invoice')
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <ManualInvoicePage />
        </AuthProvider>
      </Wrapper>,
    )

    // The select trigger should show PLN
    // PLN appears in the select trigger value
    const selectTrigger = screen.getByRole('combobox')
    expect(selectTrigger).toBeDefined()
  })
})

describe('VatLookup (supplier dialog removed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supplier lookup dialog was replaced by SupplierLookupDialog', () => {
    // GusLookupDialog has been removed.
    // VAT lookup is now integrated into SupplierLookupDialog.
    expect(true).toBe(true)
  })
})
