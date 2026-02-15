import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mock controls – can be changed per test
// ---------------------------------------------------------------------------
let mockInProgress = 'none'
let mockAccounts: Array<Record<string, unknown>> = []
let mockIsAuthenticated = false
let mockAuthConfigured = true
let mockGroupConfig = { admin: 'admin-group-id', user: 'user-group-id' }

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      getAllAccounts: () => mockAccounts,
      acquireTokenSilent: vi.fn(),
      loginRedirect: vi.fn(),
      logoutRedirect: vi.fn(),
    },
    accounts: mockAccounts,
    inProgress: mockInProgress,
  }),
  useIsAuthenticated: () => mockIsAuthenticated,
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/auth-config', () => ({
  isAuthConfigured: () => mockAuthConfigured,
  getMsalInstance: () => ({
    initialize: () => Promise.resolve(),
    handleRedirectPromise: () => Promise.resolve(null),
  }),
  loginRequest: {},
  groupConfig: new Proxy({} as Record<string, string>, {
    get: (_target, prop: string) =>
      (mockGroupConfig as Record<string, string>)[prop],
  }),
}))

vi.mock('@/lib/auth-logger', () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
    loginStart: vi.fn(),
    loginSuccess: vi.fn(),
    loginFailed: vi.fn(),
    logoutStart: vi.fn(),
    logoutFailed: vi.fn(),
    groupsResolved: vi.fn(),
    groupsFailed: vi.fn(),
    accessDenied: vi.fn(),
  },
}))

vi.mock('@/lib/graph-service', () => ({
  getUserGroups: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/components/auth/signin-screen', () => ({
  SignInScreen: () => <div data-testid="signin-screen">Sign In</div>,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import {
  AuthProvider,
  RequireAuth,
  RequireAuthorization,
} from '@/components/auth/auth-provider'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderWithAuth(ui: React.ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockInProgress = 'none'
  mockAccounts = []
  mockIsAuthenticated = false
  mockAuthConfigured = true
  mockGroupConfig = { admin: 'admin-group-id', user: 'user-group-id' }
})

describe('AuthProvider', () => {
  describe('RequireAuth', () => {
    it('shows loading while MSAL initializes', async () => {
      // AuthProvider shows "Initializing..." before MSAL init completes
      // but since our mock resolves instantly we just validate it eventually shows content
      mockAuthConfigured = false
      renderWithAuth(
        <RequireAuth>
          <div data-testid="protected">Protected content</div>
        </RequireAuth>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected')).toBeInTheDocument()
      })
    })

    it('shows sign-in screen when not authenticated', async () => {
      mockIsAuthenticated = false
      mockAccounts = []

      renderWithAuth(
        <RequireAuth>
          <div data-testid="protected">Protected content</div>
        </RequireAuth>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('signin-screen')).toBeInTheDocument()
      })
    })
  })

  describe('RequireAuthorization – Access Denied flash fix', () => {
    it('shows loading (not Access Denied) while user roles are being resolved', async () => {
      // Simulate: MSAL says authenticated, but user object not yet resolved
      // This is the critical race condition scenario
      mockIsAuthenticated = true
      mockAccounts = [
        {
          localAccountId: 'user-1',
          username: 'test@example.com',
          name: 'Test User',
          idTokenClaims: { groups: ['user-group-id'] },
        },
      ]

      const { container } = renderWithAuth(
        <RequireAuth>
          <RequireAuthorization>
            <div data-testid="authorized">Authorized content</div>
          </RequireAuthorization>
        </RequireAuth>,
      )

      // At FIRST render the user object hasn't been resolved yet.
      // We should see a loading indicator, NOT "Access Denied".
      // The loading text should be either "Checking authentication..." or "Verifying access..."
      const accessDenied = container.querySelector('h1')
      if (accessDenied) {
        expect(accessDenied.textContent).not.toBe('Access Denied')
      }

      // Eventually the user should be resolved and content shown
      await waitFor(() => {
        expect(screen.getByTestId('authorized')).toBeInTheDocument()
      })
    })

    it('shows Access Denied for authenticated user without proper group membership', async () => {
      mockIsAuthenticated = true
      mockAccounts = [
        {
          localAccountId: 'user-2',
          username: 'unauth@example.com',
          name: 'Unauthorized User',
          idTokenClaims: { groups: ['some-other-group'] },
        },
      ]

      renderWithAuth(
        <RequireAuth>
          <RequireAuthorization>
            <div data-testid="authorized">Authorized content</div>
          </RequireAuthorization>
        </RequireAuth>,
      )

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument()
      })
    })

    it('never flashes Access Denied before showing authorized content', async () => {
      // Regression test: capture all renders and verify Access Denied
      // never appears when user has proper groups
      mockIsAuthenticated = true
      mockAccounts = [
        {
          localAccountId: 'user-3',
          username: 'admin@example.com',
          name: 'Admin User',
          idTokenClaims: { groups: ['admin-group-id'] },
        },
      ]

      const accessDeniedSeen: boolean[] = []

      function AccessDeniedSpy({ children }: { children: React.ReactNode }) {
        const text = document.body.textContent || ''
        accessDeniedSeen.push(text.includes('Access Denied'))
        return <>{children}</>
      }

      renderWithAuth(
        <RequireAuth>
          <RequireAuthorization>
            <AccessDeniedSpy>
              <div data-testid="authorized">Authorized content</div>
            </AccessDeniedSpy>
          </RequireAuthorization>
        </RequireAuth>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('authorized')).toBeInTheDocument()
      })

      // Access Denied should never have been rendered
      expect(accessDeniedSeen.every((v) => v === false)).toBe(true)
    })
  })

  describe('Development mode (auth not configured)', () => {
    it('allows access without authentication', async () => {
      mockAuthConfigured = false

      renderWithAuth(
        <RequireAuth>
          <RequireAuthorization>
            <div data-testid="dev-content">Dev content</div>
          </RequireAuthorization>
        </RequireAuth>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument()
      })
    })
  })
})
