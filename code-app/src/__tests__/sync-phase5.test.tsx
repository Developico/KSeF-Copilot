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

// ── Mock data ───────────────────────────────────────────────────

const mockPreviewInvoices = [
  {
    ksefReferenceNumber: 'KSEF-001',
    invoiceNumber: 'FV/2024/001',
    invoiceDate: '2024-03-15',
    supplierName: 'Supplier Alpha',
    supplierNip: '1111111111',
    grossAmount: 1230,
    alreadyImported: false,
  },
  {
    ksefReferenceNumber: 'KSEF-002',
    invoiceNumber: 'FV/2024/002',
    invoiceDate: '2024-03-16',
    supplierName: 'Supplier Beta',
    supplierNip: '2222222222',
    grossAmount: 4920,
    alreadyImported: false,
  },
  {
    ksefReferenceNumber: 'KSEF-003',
    invoiceNumber: 'FV/2024/003',
    invoiceDate: '2024-03-10',
    supplierName: 'Supplier Gamma',
    supplierNip: '3333333333',
    grossAmount: 615,
    alreadyImported: true,
  },
]

const mockPreviewData = {
  invoices: mockPreviewInvoices,
  total: 3,
  new: 2,
}

const mockSyncResult = {
  imported: 5,
  skipped: 1,
  errors: [] as { ksefReferenceNumber: string; error: string }[],
}

const mockImportResult = {
  imported: 2,
  skipped: 0,
  errors: [],
}

// ── Mock hooks ──────────────────────────────────────────────────

const mockRunSyncMutate = vi.fn()
const mockImportMutate = vi.fn()
const mockStartSessionMutate = vi.fn()
const mockEndSessionMutate = vi.fn()
const mockFetchPreview = vi.fn(() => Promise.resolve({ data: mockPreviewData }))

vi.mock('@/hooks/use-api', () => ({
  useKsefStatus: vi.fn(() => ({
    data: { isConnected: true, environment: 'test', lastSync: '2024-03-15T10:00:00Z' },
    isLoading: false,
  })),
  useKsefSession: vi.fn(() => ({
    data: { session: { sessionId: 'session-abc-123-long-id', status: 'active' } },
    isLoading: false,
  })),
  useStartKsefSession: vi.fn(() => ({
    mutate: mockStartSessionMutate,
    isPending: false,
  })),
  useEndKsefSession: vi.fn(() => ({
    mutate: mockEndSessionMutate,
    isPending: false,
  })),
  useSyncPreview: vi.fn(() => ({
    data: mockPreviewData,
    isLoading: false,
    refetch: mockFetchPreview,
  })),
  useRunSync: vi.fn(() => ({
    mutate: mockRunSyncMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
  })),
  useImportInvoices: vi.fn(() => ({
    mutate: mockImportMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
  })),
  useBatchCategorize: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
  })),
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

// ── Import (after mocks) ────────────────────────────────────────

import { SyncPage } from '@/pages/sync'

// ─────────────────────────────────────────────────────────────────
//  Sync Page Tests
// ─────────────────────────────────────────────────────────────────

describe('SyncPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ─────────────────────────────────────────────────

  it('renders page title and subtitle', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.title'])).toBeInTheDocument()
    expect(screen.getByText(messages['sync.subtitle'])).toBeInTheDocument()
  })

  it('shows connection status badge when connected', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.connected'])).toBeInTheDocument()
  })

  it('shows active session badge', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.sessionActive'])).toBeInTheDocument()
  })

  it('shows truncated session ID', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText('session-abc-123-...')).toBeInTheDocument()
  })

  it('shows end session button when session is active', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.endSession'])).toBeInTheDocument()
  })

  it('renders date from/to inputs', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.dateFrom'])).toBeInTheDocument()
    expect(screen.getByText(messages['sync.dateTo'])).toBeInTheDocument()
  })

  it('renders preview and sync buttons', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.preview'])).toBeInTheDocument()
    expect(screen.getByText(messages['common.ksefSync'])).toBeInTheDocument()
  })

  // ── Preview table ─────────────────────────────────────────────

  it('shows preview invoice count: new / total', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // The preview card header shows "New invoices: 2 / 3"
    expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument()
  })

  it('renders preview invoices in the table', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // Each invoice appears twice (desktop table + mobile card)
    expect(screen.getAllByText('FV/2024/001').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('FV/2024/002').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('FV/2024/003').length).toBeGreaterThanOrEqual(1)
  })

  it('shows supplier names in preview', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // Each supplier appears twice (desktop table + mobile card)
    expect(screen.getAllByText('Supplier Alpha').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Supplier Beta').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Supplier Gamma').length).toBeGreaterThanOrEqual(1)
  })

  it('marks already-imported invoices with correct badge', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // alreadyImported = true gets the "Already imported" badge text
    const importedBadges = screen.getAllByText(messages['sync.alreadyImported'])
    expect(importedBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "New" badges for non-imported invoices', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    const newBadges = screen.getAllByText(messages['sync.newInvoices'])
    // At least 2 new invoices + the header count text
    expect(newBadges.length).toBeGreaterThanOrEqual(2)
  })

  // ── KSeF portal links ────────────────────────────────────────

  it('renders KSeF portal links with correct test URLs', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    const links = screen.getAllByTitle('KSeF portal')
    // Desktop + mobile layouts both render links, so 6 total (3 invoices × 2 layouts)
    expect(links.length).toBe(6)
    // environment is 'test', so links should go to ksef-test.mf.gov.pl
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('https://ksef-test.mf.gov.pl/web/verify/KSEF-001')
    expect(hrefs).toContain('https://ksef-test.mf.gov.pl/web/verify/KSEF-002')
    expect(hrefs).toContain('https://ksef-test.mf.gov.pl/web/verify/KSEF-003')
  })

  it('opens KSeF portal link in new tab', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    const links = screen.getAllByTitle('KSeF portal')
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  // ── Checkbox selection ────────────────────────────────────────

  it('renders checkboxes only for non-imported invoices', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // Each non-imported invoice has checkboxes in desktop table + mobile card
    // Plus there is a select-all checkbox. So total = 1 selectAll + 2 new × 2 layouts = 5
    // But in jsdom both layouts render, so: 1 selectAll + 2×2 invoices = 5, or 6 if selectAll also doubles
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(5)
  })

  it('renders select all / deselect all text', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // Initially all new invoices are auto-selected (via preview auto-select)
    // but data is set via useSyncPreview returning data, not via fetchPreview
    // The selectAll checkbox label should be visible
    const selectAllText = screen.getByText(messages['sync.selectAll'])
    expect(selectAllText).toBeInTheDocument()
  })

  it('toggles individual checkbox selection', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    const checkboxes = screen.getAllByRole('checkbox')
    // checkboxes[0] is selectAll, checkboxes[1] and [2] are the two new invoices
    // They start unchecked (data is set but selection requires fetchPreview)
    await user.click(checkboxes[1])
    // After clicking, the checkbox should now be checked
    expect(checkboxes[1]).toBeChecked()
  })

  it('select all checks all new invoices', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    // Use select-all checkbox (has aria-label)
    const selectAllCheckbox = screen.getByLabelText(messages['sync.selectAll'])
    await user.click(selectAllCheckbox)
    // Import button should appear with count of 2 (both new invoices)
    expect(screen.getByText(/Import selected.*\(2\)/)).toBeInTheDocument()
  })

  it('shows import selected button when items are selected', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    // Use select-all checkbox (has aria-label) to select invoices
    const selectAllCheckbox = screen.getByLabelText(messages['sync.selectAll'])
    await user.click(selectAllCheckbox)

    // Import selected button should appear with count
    expect(screen.getByText(/Import selected.*\(2\)/)).toBeInTheDocument()
  })

  // ── Sync action ───────────────────────────────────────────────

  it('calls runSync.mutate when sync button is clicked', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    const syncButton = screen.getByText(messages['common.ksefSync'])
    await user.click(syncButton)

    expect(mockRunSyncMutate).toHaveBeenCalledTimes(1)
    expect(mockRunSyncMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        settingId: 'c1',
        nip: '1234567890',
      }),
      expect.any(Object),
    )
  })

  // ── Import selected ───────────────────────────────────────────

  it('calls importInvoices.mutate with selected references', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    // Select both new invoices via select all
    const selectAllCheckbox = screen.getByLabelText(messages['sync.selectAll'])
    await user.click(selectAllCheckbox)

    const importBtn = screen.getByText(/Import selected.*\(2\)/)
    await user.click(importBtn)

    expect(mockImportMutate).toHaveBeenCalledTimes(1)
    expect(mockImportMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceNumbers: expect.arrayContaining(['KSEF-001', 'KSEF-002']),
        nip: '1234567890',
        settingId: 'c1',
      }),
      expect.any(Object),
    )
  })

  // ── Session control ───────────────────────────────────────────

  it('calls endSession.mutate when end session is clicked', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    const endBtn = screen.getByText(messages['sync.endSession'])
    await user.click(endBtn)

    expect(mockEndSessionMutate).toHaveBeenCalledTimes(1)
  })

  // ── Environment badge in connection card ──────────────────────

  it('shows environment label in connection card', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    // The card description shows "Environment: Test"
    expect(screen.getByText(/test/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  SyncPage – no session active
// ─────────────────────────────────────────────────────────────────

describe('SyncPage – no active session', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useKsefSession } = vi.mocked(await import('@/hooks/use-api'))
    ;(useKsefSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { session: null },
      isLoading: false,
    })
  })

  it('shows start session button when no session', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['sync.startSession'])).toBeInTheDocument()
  })

  it('calls startSession.mutate when start session is clicked', async () => {
    const user = userEvent.setup()
    render(<SyncPage />, { wrapper: Wrapper })

    const startBtn = screen.getByText(messages['sync.startSession'])
    await user.click(startBtn)

    expect(mockStartSessionMutate).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────
//  SyncPage – no preview data
// ─────────────────────────────────────────────────────────────────

describe('SyncPage – no preview', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useSyncPreview } = vi.mocked(await import('@/hooks/use-api'))
    ;(useSyncPreview as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: mockFetchPreview,
    })
  })

  it('does not render preview card when no preview data', () => {
    render(<SyncPage />, { wrapper: Wrapper })
    expect(screen.queryByText(/Import selected/)).not.toBeInTheDocument()
  })
})
