import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
}))

import SettingsPage from '@/app/[locale]/settings/page'

// Mock company context
const mockSelectedCompany = {
  id: '1',
  companyName: 'Test Company',
  nip: '1234567890',
  isActive: true,
  environment: 'test' as const,
  tokenStatus: 'valid' as const,
}

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: () => ({
    selectedCompany: mockSelectedCompany,
    setSelectedCompany: vi.fn(),
    companies: [mockSelectedCompany],
    isLoading: false,
    hasCompanies: true,
  }),
  useSelectedCompany: () => ({
    selectedCompany: mockSelectedCompany,
    isLoading: false,
  }),
}))

// Mock use-api hooks
const mockCompanies = [
  {
    id: '1',
    companyName: 'Test Company',
    nip: '1234567890',
    isActive: true,
    environment: 'test' as const,
    tokenStatus: 'valid' as const,
  },
]

const mockCostCenters = [
  { id: '1', code: 'IT', name: 'IT Department', isActive: true },
  { id: '2', code: 'FIN', name: 'Finance', isActive: true },
]

vi.mock('@/hooks/use-api', () => ({
  useCompanies: () => ({
    data: mockCompanies,
    isLoading: false,
    error: null,
  }),
  useCostCenters: () => ({
    data: mockCostCenters,
    isLoading: false,
    error: null,
  }),
  useCreateCompany: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateCompany: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteCompany: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateCostCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateCostCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteCostCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGenerateTestData: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCleanupTestData: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCleanupTestDataPreview: () => ({
    data: null,
    isLoading: false,
  }),
  useContextMpkCenters: () => ({
    data: { data: [], count: 0 },
    isLoading: false,
  }),
  useCreateMpkCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateMpkCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeactivateMpkCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMpkApprovers: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useSetMpkApprovers: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMpkBudgetStatus: () => ({
    data: null,
    isLoading: false,
  }),
  useContextDvUsers: () => ({
    data: { data: [], count: 0 },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('title')).toBeInTheDocument()
  })

  it('shows tabs for settings sections', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByRole('tab', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /costCenters/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /testData/i })).toBeInTheDocument()
  })

  it('displays company list', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getAllByText('1234567890').length).toBeGreaterThan(0)
  })

  it('opens add company dialog', async () => {
    renderWithProviders(<SettingsPage />)
    
    const addButton = screen.getByRole('button', { name: /addCompany/i })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('addNewCompany')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('companyNamePlaceholder')).toBeInTheDocument()
    })
  })

  it('displays configuration description', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('subtitle')).toBeInTheDocument()
  })
})
