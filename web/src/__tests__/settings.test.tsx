import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingsPage from '@/app/settings/page'

// Mock use-api hooks
const mockCompanies = [
  {
    id: '1',
    name: 'Test Company',
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
  useDeleteCompany: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateCostCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteCostCenter: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
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
    expect(screen.getByText('Ustawienia')).toBeInTheDocument()
  })

  it('shows tabs for settings sections', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByRole('tab', { name: /Firmy/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Centra kosztów/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Bezpieczeństwo/i })).toBeInTheDocument()
  })

  it('displays company list', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('1234567890')).toBeInTheDocument()
  })

  it('opens add company dialog', async () => {
    renderWithProviders(<SettingsPage />)
    
    const addButton = screen.getByRole('button', { name: /Dodaj firmę/i })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('Dodaj nową firmę')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('np. Moja Firma Sp. z o.o.')).toBeInTheDocument()
    })
  })

  it('displays configuration description', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('Konfiguracja integracji z KSeF')).toBeInTheDocument()
  })
})
