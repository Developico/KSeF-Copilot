import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock modules ────────────────────────────────────────────────

// Mock auth-config to simulate dev mode (no auth configured)
vi.mock('@/lib/auth-config', () => ({
  isAuthConfigured: vi.fn(() => false),
  getMsalInstance: vi.fn(),
  loginRequest: { scopes: [] },
  apiScopes: { scopes: [] },
  groupConfig: { admin: 'admin-group-id', user: 'user-group-id' },
  msalConfig: { auth: { clientId: '' } },
}))

// Mock company context
vi.mock('@/contexts/company-context', () => ({
  useCompanyContext: vi.fn(() => ({
    companies: [],
    selectedCompany: null,
    setSelectedCompany: vi.fn(),
    isLoading: false,
  })),
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// Minimal messages for tests
const messages: Record<string, string> = {
  'navigation.dashboard': 'Dashboard',
  'navigation.invoices': 'Invoices',
  'navigation.approvals': 'Approvals',
  'navigation.reports': 'Reports',
  'navigation.forecast': 'Forecast',
  'navigation.sync': 'Synchronization',
  'navigation.settings': 'Settings',
  'navigation.collapseMenu': 'Collapse menu',
  'navigation.expandMenu': 'Expand menu',
  'navigation.openMenu': 'Open menu',
  'header.title': 'KSeF Copilot',
  'header.subtitle': 'Cost analysis',
  'header.openMenu': 'Open menu',
  'header.selectCompany': 'Select company',
  'header.lightMode': 'Light mode',
  'header.darkMode': 'Dark mode',
  'header.toggleTheme': 'Toggle theme',
  'header.userMenu': 'User menu',
  'common.comingSoon': 'coming soon',
  'common.accessDenied': 'Access Denied',
  'common.adminRequired': 'Admin required',
  'auth.signIn': 'Sign in',
  'auth.signOut': 'Sign out',
  'auth.signingIn': 'Signing in...',
  'auth.unauthorizedDesc': 'Sign in to continue',
  'language.select': 'Select language',
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

describe('auth-provider', () => {
  it('provides mock admin user when auth is not configured', async () => {
    // Import dynamically so mocks are applied
    const { useAuth } = await import('@/components/auth/auth-provider')
    const { AuthProvider } = await import('@/components/auth/auth-provider')

    const Wrapper = createWrapper()

    function TestComponent() {
      const auth = useAuth()
      return (
        <div>
          <span data-testid="name">{auth.user?.name}</span>
          <span data-testid="admin">{auth.isAdmin ? 'yes' : 'no'}</span>
          <span data-testid="authenticated">
            {auth.isAuthenticated ? 'yes' : 'no'}
          </span>
        </div>
      )
    }

    render(
      <Wrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </Wrapper>
    )

    expect(screen.getByTestId('name').textContent).toBe('Development User')
    expect(screen.getByTestId('admin').textContent).toBe('yes')
    expect(screen.getByTestId('authenticated').textContent).toBe('yes')
  })

  it('useHasRole returns true for all roles in dev mode', async () => {
    const { useHasRole } = await import('@/components/auth/auth-provider')
    const { AuthProvider } = await import('@/components/auth/auth-provider')

    const Wrapper = createWrapper()

    function InnerWrapper({ children }: { children: ReactNode }) {
      return (
        <Wrapper>
          <AuthProvider>{children}</AuthProvider>
        </Wrapper>
      )
    }

    const { result } = renderHook(() => useHasRole('Admin'), {
      wrapper: InnerWrapper,
    })

    expect(result.current).toBe(true)
  })

  it('RequireRole renders children in dev mode', async () => {
    const { RequireRole } = await import('@/components/auth/auth-provider')
    const { AuthProvider } = await import('@/components/auth/auth-provider')

    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <RequireRole role="Admin">
            <span data-testid="protected">Protected content</span>
          </RequireRole>
        </AuthProvider>
      </Wrapper>
    )

    expect(screen.getByTestId('protected').textContent).toBe(
      'Protected content'
    )
  })
})

describe('sidebar admin filtering', () => {
  it('shows all nav items in dev mode (admin by default)', async () => {
    const { AuthProvider } = await import('@/components/auth/auth-provider')
    const { Sidebar } = await import('@/components/layout/sidebar')

    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </Wrapper>
    )

    // All 7 items should be visible (admin in dev mode)
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Invoices')).toBeDefined()
    expect(screen.getByText('Approvals')).toBeDefined()
    expect(screen.getByText('Reports')).toBeDefined()
    expect(screen.getByText('Forecast')).toBeDefined()
    expect(screen.getByText('Synchronization')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
  })
})
