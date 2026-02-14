import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

// ── Mock react-markdown ─────────────────────────────────────────

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}))

// ── Mock company context (configurable) ─────────────────────────

let mockEnv: string | undefined = 'test'

vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: vi.fn(() => ({
    companies: mockEnv
      ? [{ id: 'c1', nip: '1234567890', companyName: 'Test Company', environment: mockEnv, isActive: true }]
      : [],
    selectedCompany: mockEnv
      ? { id: 'c1', nip: '1234567890', companyName: 'Test Company', environment: mockEnv, isActive: true }
      : null,
    setSelectedCompany: vi.fn(),
    isLoading: false,
  })),
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// ── Mock hooks ──────────────────────────────────────────────────

const mockRunSyncMutate = vi.fn()
let mockHealthData: unknown = {
  status: 'healthy',
  timestamp: '2024-03-15T10:00:00Z',
  summary: { healthy: 3, degraded: 1, unhealthy: 0 },
  services: [],
}

vi.mock('@/hooks/use-api', () => ({
  useRunSync: vi.fn(() => ({
    mutate: mockRunSyncMutate,
    isPending: false,
  })),
  useHealthDetailed: vi.fn(() => ({
    data: mockHealthData,
    isLoading: false,
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

// ── Imports (after mocks) ───────────────────────────────────────

import { EnvironmentBanner } from '@/components/layout/environment-banner'
import { KsefSyncButton } from '@/components/layout/ksef-sync-button'
import { SystemStatusBadge } from '@/components/health/system-status-badge'
import { ChangelogModal, useTripleClick } from '@/components/layout/changelog-modal'
import { TooltipProvider } from '@/components/ui/tooltip'

// ─────────────────────────────────────────────────────────────────
//  EnvironmentBanner
// ─────────────────────────────────────────────────────────────────

describe('EnvironmentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders orange bar for test environment', () => {
    mockEnv = 'test'
    render(<EnvironmentBanner />, { wrapper: Wrapper })
    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('bg-orange-500')
    expect(banner).toHaveAttribute('aria-label', 'Environment: TEST')
  })

  it('renders teal bar for production environment', () => {
    mockEnv = 'production'
    render(<EnvironmentBanner />, { wrapper: Wrapper })
    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('bg-teal-500')
    expect(banner).toHaveAttribute('aria-label', 'Environment: PRODUCTION')
  })

  it('renders navy bar for demo environment', () => {
    mockEnv = 'demo'
    render(<EnvironmentBanner />, { wrapper: Wrapper })
    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('bg-blue-800')
    expect(banner).toHaveAttribute('aria-label', 'Environment: DEMO')
  })

  it('returns null when no company is selected', () => {
    mockEnv = undefined
    const { container } = render(<EnvironmentBanner />, { wrapper: Wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('has correct dimensions (h-1 w-full)', () => {
    mockEnv = 'test'
    render(<EnvironmentBanner />, { wrapper: Wrapper })
    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('h-1', 'w-full')
  })
})

// ─────────────────────────────────────────────────────────────────
//  KsefSyncButton
// ─────────────────────────────────────────────────────────────────

describe('KsefSyncButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv = 'test'
  })

  it('renders sync button when company is selected', () => {
    render(<TooltipProvider><KsefSyncButton /></TooltipProvider>, { wrapper: Wrapper })
    const btn = screen.getByTitle(messages['common.ksefSync'])
    expect(btn).toBeInTheDocument()
  })

  it('returns null when no company is selected', () => {
    mockEnv = undefined
    const { container } = render(<TooltipProvider><KsefSyncButton /></TooltipProvider>, { wrapper: Wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('calls runSync.mutate with last 30 days when clicked', async () => {
    const user = userEvent.setup()
    render(<TooltipProvider><KsefSyncButton /></TooltipProvider>, { wrapper: Wrapper })

    const btn = screen.getByTitle(messages['common.ksefSync'])
    await user.click(btn)

    expect(mockRunSyncMutate).toHaveBeenCalledTimes(1)
    expect(mockRunSyncMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        settingId: 'c1',
        nip: '1234567890',
        dateFrom: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
  })

  it('has correct button styling', () => {
    render(<TooltipProvider><KsefSyncButton /></TooltipProvider>, { wrapper: Wrapper })
    const btn = screen.getByTitle(messages['common.ksefSync'])
    expect(btn).toHaveClass('h-8', 'w-8')
  })
})

// ─────────────────────────────────────────────────────────────────
//  SystemStatusBadge
// ─────────────────────────────────────────────────────────────────

describe('SystemStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv = 'test'
    mockHealthData = {
      status: 'healthy',
      timestamp: '2024-03-15T10:00:00Z',
      summary: { healthy: 3, degraded: 1, unhealthy: 0 },
      services: [],
    }
  })

  it('renders status badge when health data is available', () => {
    render(<TooltipProvider><SystemStatusBadge /></TooltipProvider>, { wrapper: Wrapper })
    const btn = screen.getByTitle(messages['settings.systemStatus'])
    expect(btn).toBeInTheDocument()
  })

  it('returns null when no health data', () => {
    mockHealthData = null
    const { container } = render(<TooltipProvider><SystemStatusBadge /></TooltipProvider>, { wrapper: Wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('uses green color for healthy status', () => {
    render(<TooltipProvider><SystemStatusBadge /></TooltipProvider>, { wrapper: Wrapper })
    const btn = screen.getByTitle(messages['settings.systemStatus'])
    // The CircleDot SVG inside should have text-green-500
    const svg = btn.querySelector('svg')
    expect(svg).toHaveClass('text-green-500')
  })

  it('uses amber color for degraded status', () => {
    mockHealthData = {
      status: 'degraded',
      timestamp: '2024-03-15T10:00:00Z',
      summary: { healthy: 2, degraded: 2, unhealthy: 0 },
      services: [],
    }
    render(<TooltipProvider><SystemStatusBadge /></TooltipProvider>, { wrapper: Wrapper })
    const btn = screen.getByTitle(messages['settings.systemStatus'])
    const svg = btn.querySelector('svg')
    expect(svg).toHaveClass('text-amber-500')
  })

  it('uses red color for unhealthy status', () => {
    mockHealthData = {
      status: 'unhealthy',
      timestamp: '2024-03-15T10:00:00Z',
      summary: { healthy: 0, degraded: 0, unhealthy: 4 },
      services: [],
    }
    render(<TooltipProvider><SystemStatusBadge /></TooltipProvider>, { wrapper: Wrapper })
    const btn = screen.getByTitle(messages['settings.systemStatus'])
    const svg = btn.querySelector('svg')
    expect(svg).toHaveClass('text-red-500')
  })
})

// ─────────────────────────────────────────────────────────────────
//  ChangelogModal
// ─────────────────────────────────────────────────────────────────

describe('ChangelogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for changelog.md
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('# Changelog\n\n## v2.0.0\n\n- Feature A\n- Feature B'),
        }),
      ),
    )
  })

  it('renders dialog when open', () => {
    render(<ChangelogModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper })
    expect(screen.getByText(messages['changelog.title'])).toBeInTheDocument()
    expect(screen.getByText(messages['changelog.description'])).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ChangelogModal open={false} onOpenChange={vi.fn()} />, { wrapper: Wrapper })
    expect(screen.queryByText(messages['changelog.title'])).not.toBeInTheDocument()
  })

  it('fetches and renders markdown content', async () => {
    render(<ChangelogModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper })

    await waitFor(() => {
      const markdown = screen.getByTestId('markdown')
      expect(markdown).toHaveTextContent('Changelog')
      expect(markdown).toHaveTextContent('Feature A')
    })
  })

  it('fetches from /changelog.md', async () => {
    render(<ChangelogModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/changelog.md')
    })
  })

  it('shows fallback content when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve(''),
        }),
      ),
    )

    render(<ChangelogModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('markdown')).toHaveTextContent('No changelog available')
    })
  })
})

// ─────────────────────────────────────────────────────────────────
//  useTripleClick hook
// ─────────────────────────────────────────────────────────────────

describe('useTripleClick', () => {
  function TripleClickTest() {
    const [ref, triggered, reset] = useTripleClick()
    return (
      <div>
        <div ref={ref} data-testid="click-target">
          Click me
        </div>
        <span data-testid="triggered">{triggered ? 'yes' : 'no'}</span>
        <button data-testid="reset" onClick={reset}>
          Reset
        </button>
      </div>
    )
  }

  it('starts with triggered = false', () => {
    render(<TripleClickTest />, { wrapper: Wrapper })
    expect(screen.getByTestId('triggered')).toHaveTextContent('no')
  })

  it('triggers after three rapid clicks', async () => {
    const user = userEvent.setup()
    render(<TripleClickTest />, { wrapper: Wrapper })

    const target = screen.getByTestId('click-target')
    await user.click(target)
    await user.click(target)
    await user.click(target)

    expect(screen.getByTestId('triggered')).toHaveTextContent('yes')
  })

  it('does not trigger after only two clicks', async () => {
    const user = userEvent.setup()
    render(<TripleClickTest />, { wrapper: Wrapper })

    const target = screen.getByTestId('click-target')
    await user.click(target)
    await user.click(target)

    expect(screen.getByTestId('triggered')).toHaveTextContent('no')
  })

  it('resets triggered state', async () => {
    const user = userEvent.setup()
    render(<TripleClickTest />, { wrapper: Wrapper })

    const target = screen.getByTestId('click-target')
    await user.click(target)
    await user.click(target)
    await user.click(target)

    expect(screen.getByTestId('triggered')).toHaveTextContent('yes')

    await user.click(screen.getByTestId('reset'))
    expect(screen.getByTestId('triggered')).toHaveTextContent('no')
  })
})
