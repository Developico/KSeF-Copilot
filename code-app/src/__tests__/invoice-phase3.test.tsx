import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

// ── Sample invoice data ─────────────────────────────────────────

const sampleInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'FV/2024/001',
    supplierNip: '1111111111',
    supplierName: 'Supplier Alpha',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-15',
    netAmount: 1000,
    vatAmount: 230,
    grossAmount: 1230,
    currency: 'PLN',
    paymentStatus: 'pending' as const,
    mpk: 'MPK-100',
    category: 'Office',
    description: 'Test invoice 1',
    source: 'KSeF',
    tenantNip: '0000000000',
    tenantName: 'My Company',
    importedAt: '2024-01-16',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'FV/2024/002',
    supplierNip: '2222222222',
    supplierName: 'Supplier Beta',
    invoiceDate: '2024-02-10',
    dueDate: '2024-03-10',
    netAmount: 2000,
    vatAmount: 460,
    grossAmount: 2460,
    currency: 'PLN',
    paymentStatus: 'paid' as const,
    mpk: 'MPK-200',
    category: 'IT',
    description: 'Test invoice 2',
    source: 'Manual',
    tenantNip: '0000000000',
    tenantName: 'My Company',
    importedAt: '2024-02-11',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'FV/2024/003',
    supplierNip: '3333333333',
    supplierName: 'Supplier Gamma',
    invoiceDate: '2024-01-20',
    dueDate: '2024-02-20',
    netAmount: 500,
    vatAmount: 115,
    grossAmount: 615,
    currency: 'PLN',
    paymentStatus: 'pending' as const,
    mpk: 'MPK-100',
    category: undefined,
    description: undefined,
    source: 'KSeF',
    tenantNip: '0000000000',
    tenantName: 'My Company',
    importedAt: '2024-01-21',
  },
]

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

const mockMutate = vi.fn()
const mockRefetch = vi.fn()
const mockMutation = {
  mutate: mockMutate,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  data: undefined,
  reset: vi.fn(),
}

vi.mock('@/hooks/use-api', () => ({
  useInvoices: vi.fn(() => ({
    data: { invoices: sampleInvoices, count: sampleInvoices.length },
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useMarkInvoiceAsPaid: vi.fn(() => mockMutation),
  useUpdateInvoice: vi.fn(() => mockMutation),
  useDeleteInvoice: vi.fn(() => mockMutation),
  useExtractDocument: vi.fn(() => mockMutation),
  useCreateManualInvoice: vi.fn(() => mockMutation),
  useMpkCenters: vi.fn(() => ({
    data: { mpkCenters: [{ id: 'mc-1', name: 'MPK-100' }, { id: 'mc-2', name: 'MPK-200' }], count: 2 },
    isLoading: false,
    error: null,
  })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// ── Mock export utility ────────────────────────────────────────
vi.mock('@/lib/export', () => ({
  exportInvoicesToCsv: vi.fn(),
  invoicesToCsv: vi.fn(() => 'csv-content'),
  downloadFile: vi.fn(),
  createExportFilename: vi.fn(() => 'invoices_2024-01-15.csv'),
}))

// Provide URL.createObjectURL stub for jsdom
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
}

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

describe('InvoicesPage — Phase 3 features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders invoice list with all invoices', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    expect(screen.getAllByText('Supplier Alpha').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Supplier Beta').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Supplier Gamma').length).toBeGreaterThan(0)
  })

  it('shows "Scan document" button', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Scan document')).toBeInTheDocument()
  })

  it('shows "Export CSV" button', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Export CSV')).toBeInTheDocument()
  })

  it('calls export when Export CSV is clicked', async () => {
    const exportModule = await import('@/lib/export')
    const spy = vi.spyOn(exportModule, 'exportInvoicesToCsv')
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    const btn = screen.getByText('Export CSV').closest('button')!
    expect(btn).not.toBeDisabled()
    await userEvent.click(btn)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('renders filter panel with payment status buttons', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    // Payment filter buttons from InvoiceFilters
    const allButtons = screen.getAllByRole('button', { name: 'All' })
    expect(allButtons.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Paid' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
  })

  it('renders grouping dropdown', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    // Grouping Select component — find by combobox role
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('shows advanced filters when Filters button is clicked', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    const filtersBtn = screen.getByRole('button', { name: /Filters/i })
    await user.click(filtersBtn)

    // After expanding, date inputs should appear
    const dateInputs = screen.getAllByDisplayValue('')
    expect(dateInputs.length).toBeGreaterThan(0)
  })

  it('renders inline action menus for each invoice row', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    // Each row has a MoreHorizontal button (actions dropdown)
    const actionButtons = screen.getAllByRole('button')
    // At least 3 action dropdown trigger buttons (one per invoice row, in desktop view)
    const moreButtons = actionButtons.filter((btn) => {
      return btn.querySelector('svg')?.classList.contains('lucide-ellipsis')
    })
    expect(moreButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('shows Actions column header in the table', async () => {
    const { InvoicesPage } = await import('@/pages/invoices')
    render(<InvoicesPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Actions')).toBeInTheDocument()
  })
})

describe('DocumentScannerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload dropzone when opened', async () => {
    const { DocumentScannerModal } = await import('@/components/invoices/document-scanner-modal')
    render(
      <DocumentScannerModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Document Scanner')).toBeInTheDocument()
    expect(screen.getByText(/Drop a file here or click/i)).toBeInTheDocument()
    expect(screen.getByText('PDF, JPEG, PNG, WebP')).toBeInTheDocument()
  })

  it('does not render when closed', async () => {
    const { DocumentScannerModal } = await import('@/components/invoices/document-scanner-modal')
    render(
      <DocumentScannerModal open={false} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText('Document Scanner')).not.toBeInTheDocument()
  })
})

describe('InvoiceFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input', async () => {
    const { InvoiceFilters, DEFAULT_FILTERS } = await import('@/components/invoices/invoice-filters')
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        mpkOptions={['MPK-100', 'MPK-200']}
        categoryOptions={['Office', 'IT']}
      />,
      { wrapper: createWrapper() }
    )

    const searchInput = screen.getByPlaceholderText('Search...')
    expect(searchInput).toBeInTheDocument()
  })

  it('calls onChange when search is typed', async () => {
    const onChange = vi.fn()
    const { InvoiceFilters, DEFAULT_FILTERS } = await import('@/components/invoices/invoice-filters')
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onChange={onChange}
        mpkOptions={[]}
        categoryOptions={[]}
      />,
      { wrapper: createWrapper() }
    )
    const user = userEvent.setup()

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'test')

    expect(onChange).toHaveBeenCalled()
  })

  it('shows active filter count badge when filters are applied', async () => {
    const { InvoiceFilters, DEFAULT_FILTERS } = await import('@/components/invoices/invoice-filters')
    const filtersWithDate = { ...DEFAULT_FILTERS, fromDate: '2024-01-01' }
    render(
      <InvoiceFilters
        filters={filtersWithDate}
        onChange={vi.fn()}
        mpkOptions={[]}
        categoryOptions={[]}
      />,
      { wrapper: createWrapper() }
    )

    // Badge with count "1"
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('expands advanced panel on click', async () => {
    const { InvoiceFilters, DEFAULT_FILTERS } = await import('@/components/invoices/invoice-filters')
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        mpkOptions={[]}
        categoryOptions={[]}
      />,
      { wrapper: createWrapper() }
    )
    const user = userEvent.setup()

    const filtersBtn = screen.getByRole('button', { name: /Filters/i })
    await user.click(filtersBtn)

    // Should now show date inputs
    expect(screen.getByText('Invoice date')).toBeInTheDocument()
    expect(screen.getByText('Due date')).toBeInTheDocument()
    expect(screen.getByText('Gross amount')).toBeInTheDocument()
    expect(screen.getByText('Supplier')).toBeInTheDocument()
  })
})

describe('InvoicePagination', () => {
  it('renders pagination when items exceed page size', async () => {
    const { InvoicePagination } = await import('@/components/invoices/invoice-pagination')
    render(
      <InvoicePagination
        currentPage={0}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('1 / 4')).toBeInTheDocument()
    expect(screen.getByText(/Showing 1–25 of 100/)).toBeInTheDocument()
  })

  it('does not render when items fit in one page', async () => {
    const { InvoicePagination } = await import('@/components/invoices/invoice-pagination')
    const { container } = render(
      <InvoicePagination
        currentPage={0}
        totalItems={10}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(container.innerHTML).toBe('')
  })

  it('disables prev buttons on first page', async () => {
    const { InvoicePagination } = await import('@/components/invoices/invoice-pagination')
    render(
      <InvoicePagination
        currentPage={0}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    const firstBtn = screen.getByLabelText('First page')
    const backBtn = screen.getByLabelText('Back')
    expect(firstBtn).toBeDisabled()
    expect(backBtn).toBeDisabled()
  })

  it('calls onPageChange when next is clicked', async () => {
    const onPageChange = vi.fn()
    const { InvoicePagination } = await import('@/components/invoices/invoice-pagination')
    render(
      <InvoicePagination
        currentPage={0}
        totalItems={100}
        pageSize={25}
        onPageChange={onPageChange}
      />,
      { wrapper: createWrapper() }
    )
    const user = userEvent.setup()

    const nextBtn = screen.getByLabelText('Next')
    await user.click(nextBtn)

    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})

describe('CSV Export utility', () => {
  it('generates CSV with correct headers', async () => {
    const { invoicesToCsv } = await import('@/lib/export')
    // Unmock for this test
    vi.unmock('@/lib/export')
    const { invoicesToCsv: realFn } = await vi.importActual<typeof import('@/lib/export')>('@/lib/export')

    const csv = realFn(sampleInvoices as never[])
    expect(csv).toContain('Invoice Number')
    expect(csv).toContain('Supplier')
    expect(csv).toContain('Gross Amount')
    expect(csv).toContain('FV/2024/001')
    expect(csv).toContain('Supplier Alpha')
  })
})
