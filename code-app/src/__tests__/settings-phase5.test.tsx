import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── ResizeObserver polyfill (Radix Slider needs it in jsdom) ───
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

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

// ── Mock companies data ─────────────────────────────────────────

const mockCompanies = [
  {
    id: 'c1',
    nip: '1234567890',
    companyName: 'Test Company',
    environment: 'test' as const,
    isActive: true,
    tokenStatus: 'valid' as const,
    invoicePrefix: 'TC',
    lastSyncAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'c2',
    nip: '9876543210',
    companyName: 'Another Corp',
    environment: 'production' as const,
    isActive: false,
    tokenStatus: 'expired' as const,
    invoicePrefix: '',
    lastSyncAt: null,
  },
]

const mockCostCenters = [
  { id: 'cc1', code: 'CC-001', name: 'Marketing', isActive: true },
  { id: 'cc2', code: 'CC-002', name: 'Engineering', isActive: true },
  { id: 'cc3', code: 'CC-003', name: 'Sales', isActive: false },
]

const mockHealthData = {
  status: 'healthy' as const,
  timestamp: '2024-03-15T10:00:00Z',
  summary: { healthy: 3, degraded: 1, unhealthy: 0 },
  services: [
    { name: 'Azure Functions', status: 'healthy' as const, responseTime: 120 },
    { name: 'Cosmos DB', status: 'healthy' as const, responseTime: 45 },
    { name: 'KSeF API', status: 'degraded' as const, responseTime: 2500 },
    { name: 'Blob Storage', status: 'healthy' as const, responseTime: 30 },
  ],
}

const mockGenerateResult = {
  summary: { created: 10, paid: 5, ksef: 7 },
}

const mockCleanupPreviewData = {
  total: 15,
  bySource: { Manual: 5, KSeF: 10 },
  warning: 'This will delete test data',
}

// ── Mock hooks ──────────────────────────────────────────────────

const mockCreateMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const mockTestTokenMutate = vi.fn()
const mockCreateCcMutate = vi.fn()
const mockUpdateCcMutate = vi.fn()
const mockDeleteCcMutate = vi.fn()
const mockGenerateMutate = vi.fn()
const mockCleanupMutate = vi.fn()
const mockFetchCleanup = vi.fn()
const mockRefetchHealth = vi.fn()

vi.mock('@/hooks/use-api', () => ({
  useCompanies: vi.fn(() => ({
    data: { settings: mockCompanies },
    isLoading: false,
  })),
  useCreateCompany: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
  useDeleteCompany: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
  useUpdateCompany: vi.fn(() => ({
    mutate: mockUpdateMutate,
    isPending: false,
  })),
  useTestToken: vi.fn(() => ({
    mutate: mockTestTokenMutate,
    isPending: false,
  })),
  useCostCenters: vi.fn(() => ({
    data: { costCenters: mockCostCenters },
    isLoading: false,
  })),
  useCreateCostCenter: vi.fn(() => ({
    mutate: mockCreateCcMutate,
    isPending: false,
    isError: false,
    error: null,
  })),
  useUpdateCostCenter: vi.fn(() => ({
    mutate: mockUpdateCcMutate,
    isPending: false,
  })),
  useDeleteCostCenter: vi.fn(() => ({
    mutate: mockDeleteCcMutate,
    isPending: false,
  })),
  useGenerateTestData: vi.fn(() => ({
    mutate: mockGenerateMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
  })),
  useKsefCleanupPreview: vi.fn(() => ({
    data: null,
    refetch: mockFetchCleanup,
  })),
  useKsefCleanup: vi.fn(() => ({
    mutate: mockCleanupMutate,
    isPending: false,
    isSuccess: false,
    data: null,
  })),
  useHealthDetailed: vi.fn(() => ({
    data: mockHealthData,
    isLoading: false,
    refetch: mockRefetchHealth,
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

import { SettingsPage } from '@/pages/settings'

// ─────────────────────────────────────────────────────────────────
//  Settings Page – Page-level & Tab Navigation
// ─────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and subtitle', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    expect(screen.getByText(messages['settings.title'])).toBeInTheDocument()
    expect(screen.getByText(messages['settings.subtitle'])).toBeInTheDocument()
  })

  it('renders all four tabs', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    // "Companies" appears in both tab trigger and card title (default tab), so use getAllByText
    expect(screen.getAllByText(messages['settings.companies']).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(messages['settings.costCenters'])).toBeInTheDocument()
    expect(screen.getByText(messages['settings.testData'])).toBeInTheDocument()
    expect(screen.getByText(messages['settings.systemStatus'])).toBeInTheDocument()
  })

  it('shows companies tab by default', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    // Company names from mock data should be visible
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('Another Corp')).toBeInTheDocument()
  })

  it('switches to cost centers tab', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    await user.click(screen.getByText(messages['settings.costCenters']))
    expect(screen.getByText('CC-001')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('switches to test data tab', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    await user.click(screen.getByText(messages['settings.testData']))
    expect(screen.getByText(messages['settings.testDataDescription'])).toBeInTheDocument()
    expect(screen.getByText(messages['settings.generateTestData'])).toBeInTheDocument()
  })

  it('switches to system status tab', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    await user.click(screen.getByText(messages['settings.systemStatus']))
    // Health data should be visible
    expect(screen.getByText('Azure Functions')).toBeInTheDocument()
    expect(screen.getByText('Cosmos DB')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  Companies Tab
// ─────────────────────────────────────────────────────────────────

describe('SettingsPage – Companies Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders company NIP values', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    expect(screen.getByText(/1234567890/)).toBeInTheDocument()
    expect(screen.getByText(/9876543210/)).toBeInTheDocument()
  })

  it('renders environment badges', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
  })

  it('renders token status badges', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Token OK')).toBeInTheDocument()
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('renders Active badge for active companies', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders invoice prefix badge', () => {
    render(<SettingsPage />, { wrapper: Wrapper })
    expect(screen.getByText('TC')).toBeInTheDocument()
  })

  it('shows add company form when button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    await user.click(screen.getByText(messages['settings.addCompany']))
    // Form inputs should appear
    expect(screen.getByPlaceholderText('ACME Sp. z o.o.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('1234567890')).toBeInTheDocument()
  })

  it('calls createCompany when form is submitted', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    await user.click(screen.getByText(messages['settings.addCompany']))

    await user.type(screen.getByPlaceholderText('ACME Sp. z o.o.'), 'New Corp')
    await user.type(screen.getByPlaceholderText('1234567890'), '5555555555')

    // Click save button (within the form)
    const saveButtons = screen.getAllByText(messages['common.save'])
    await user.click(saveButtons[0])

    expect(mockCreateMutate).toHaveBeenCalledTimes(1)
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        nip: '5555555555',
        companyName: 'New Corp',
        environment: 'production',
      }),
      expect.any(Object),
    )
  })

  it('calls deleteCompany when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    const deleteButtons = screen.getAllByTitle(messages['common.delete'])
    await user.click(deleteButtons[0])

    expect(mockDeleteMutate).toHaveBeenCalledTimes(1)
    expect(mockDeleteMutate).toHaveBeenCalledWith('c1', expect.any(Object))
  })

  it('enters edit mode on edit button click', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    const editButtons = screen.getAllByTitle(messages['settings.editCompany'])
    await user.click(editButtons[0])

    // Edit inputs should appear (company name pre-filled)
    const inputs = screen.getAllByDisplayValue('Test Company')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('calls updateCompany on save in edit mode', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    const editButtons = screen.getAllByTitle(messages['settings.editCompany'])
    await user.click(editButtons[0])

    // Change name
    const nameInput = screen.getByDisplayValue('Test Company')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    // Click save
    const saveButtons = screen.getAllByText(messages['common.save'])
    await user.click(saveButtons[0])

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1)
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c1',
        data: expect.objectContaining({
          companyName: 'Updated Name',
        }),
      }),
      expect.any(Object),
    )
  })

  it('calls testToken when test button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })

    const testButtons = screen.getAllByText('Test')
    await user.click(testButtons[0])

    expect(mockTestTokenMutate).toHaveBeenCalledTimes(1)
    expect(mockTestTokenMutate).toHaveBeenCalledWith('c1', expect.any(Object))
  })
})

// ─────────────────────────────────────────────────────────────────
//  Cost Centers Tab
// ─────────────────────────────────────────────────────────────────

describe('SettingsPage – Cost Centers Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function openCostCentersTab() {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })
    await user.click(screen.getByText(messages['settings.costCenters']))
    return user
  }

  it('renders all cost centers', async () => {
    await openCostCentersTab()
    expect(screen.getByText('CC-001')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('CC-002')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('CC-003')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
  })

  it('shows Active/Inactive badges', async () => {
    await openCostCentersTab()
    const activeBadges = screen.getAllByText('Active')
    const inactiveBadges = screen.getAllByText('Inactive')
    expect(activeBadges.length).toBe(2)
    expect(inactiveBadges.length).toBe(1)
  })

  it('shows add cost center form when button is clicked', async () => {
    const user = await openCostCentersTab()
    await user.click(screen.getByText(messages['settings.addCostCenter']))
    expect(screen.getByPlaceholderText('CC-001')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Marketing')).toBeInTheDocument()
  })

  it('calls createCostCenter when form is submitted', async () => {
    const user = await openCostCentersTab()
    await user.click(screen.getByText(messages['settings.addCostCenter']))

    await user.type(screen.getByPlaceholderText('CC-001'), 'CC-NEW')
    await user.type(screen.getByPlaceholderText('Marketing'), 'New Center')

    const saveButtons = screen.getAllByText(messages['common.save'])
    await user.click(saveButtons[0])

    expect(mockCreateCcMutate).toHaveBeenCalledTimes(1)
    expect(mockCreateCcMutate).toHaveBeenCalledWith(
      { code: 'CC-NEW', name: 'New Center' },
      expect.any(Object),
    )
  })

  it('calls deleteCostCenter when delete button is clicked', async () => {
    const user = await openCostCentersTab()

    // There should be delete buttons for each cost center
    // Find all Trash2 icon buttons (destructive style)
    const deleteButtons = screen.getAllByRole('button').filter(
      (btn) => btn.classList.contains('text-destructive')
    )
    expect(deleteButtons.length).toBe(3)

    await user.click(deleteButtons[0])
    expect(mockDeleteCcMutate).toHaveBeenCalledTimes(1)
    expect(mockDeleteCcMutate).toHaveBeenCalledWith('cc1', expect.any(Object))
  })
})

// ─────────────────────────────────────────────────────────────────
//  Test Data Generator Tab
// ─────────────────────────────────────────────────────────────────

describe('SettingsPage – Test Data Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function openTestDataTab() {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })
    await user.click(screen.getByText(messages['settings.testData']))
    return user
  }

  it('renders test data tab title and description', async () => {
    await openTestDataTab()
    expect(screen.getByText(messages['settings.testDataDescription'])).toBeInTheDocument()
  })

  it('renders count slider with default value', async () => {
    await openTestDataTab()
    expect(screen.getByText(messages['settings.testDataCount'])).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // default count
  })

  it('renders paid percentage slider', async () => {
    await openTestDataTab()
    expect(screen.getByText(messages['settings.paidPercentage'])).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument() // default
  })

  it('renders KSeF percentage slider', async () => {
    await openTestDataTab()
    expect(screen.getByText(messages['settings.ksefPercentage'])).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument() // default
  })

  it('renders generate, cleanup preview, and cleanup buttons', async () => {
    await openTestDataTab()
    expect(screen.getByText(messages['settings.generateTestData'])).toBeInTheDocument()
    expect(screen.getByText(messages['settings.cleanupPreview'])).toBeInTheDocument()
    expect(screen.getByText(messages['settings.cleanupData'])).toBeInTheDocument()
  })

  it('calls generateTestData when generate button is clicked', async () => {
    const user = await openTestDataTab()

    await user.click(screen.getByText(messages['settings.generateTestData']))

    expect(mockGenerateMutate).toHaveBeenCalledTimes(1)
    expect(mockGenerateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        nip: '1234567890',
        companyId: 'c1',
        count: 10,
        paidPercentage: 50,
        ksefPercentage: 70,
      }),
    )
  })

  it('calls cleanupMutation when cleanup button is clicked', async () => {
    const user = await openTestDataTab()

    await user.click(screen.getByText(messages['settings.cleanupData']))

    expect(mockCleanupMutate).toHaveBeenCalledTimes(1)
    expect(mockCleanupMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        nip: '1234567890',
        companyId: 'c1',
      }),
    )
  })

  it('renders date range inputs', async () => {
    await openTestDataTab()
    expect(screen.getByText(messages['sync.dateFrom'])).toBeInTheDocument()
    expect(screen.getByText(messages['sync.dateTo'])).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
//  System Status Tab
// ─────────────────────────────────────────────────────────────────

describe('SettingsPage – System Status Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function openStatusTab() {
    const user = userEvent.setup()
    render(<SettingsPage />, { wrapper: Wrapper })
    await user.click(screen.getAllByText(messages['settings.systemStatus'])[0])
    return user
  }

  it('renders health status', async () => {
    await openStatusTab()
    // "healthy" appears in overall status and per-service badges
    const healthyTexts = screen.getAllByText('healthy')
    expect(healthyTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('renders summary counts', async () => {
    await openStatusTab()
    // Summary grid: 3 healthy, 1 degraded, 0 unhealthy
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('Degraded')).toBeInTheDocument()
    expect(screen.getByText('Unhealthy')).toBeInTheDocument()
  })

  it('renders all service names', async () => {
    await openStatusTab()
    expect(screen.getByText('Azure Functions')).toBeInTheDocument()
    expect(screen.getByText('Cosmos DB')).toBeInTheDocument()
    expect(screen.getByText('KSeF API')).toBeInTheDocument()
    expect(screen.getByText('Blob Storage')).toBeInTheDocument()
  })

  it('renders service response times', async () => {
    await openStatusTab()
    expect(screen.getByText('120ms')).toBeInTheDocument()
    expect(screen.getByText('45ms')).toBeInTheDocument()
    expect(screen.getByText('2500ms')).toBeInTheDocument()
    expect(screen.getByText('30ms')).toBeInTheDocument()
  })

  it('renders degraded badge for KSeF API', async () => {
    await openStatusTab()
    // KSeF API has degraded status, should have a 'degraded' badge
    const degradedBadges = screen.getAllByText('degraded')
    expect(degradedBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders refresh button', async () => {
    await openStatusTab()
    expect(screen.getByText(messages['common.refresh'])).toBeInTheDocument()
  })

  it('calls refetch when refresh button is clicked', async () => {
    const user = await openStatusTab()
    await user.click(screen.getByText(messages['common.refresh']))
    expect(mockRefetchHealth).toHaveBeenCalledTimes(1)
  })
})
