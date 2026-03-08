import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-intl/navigation (uses next/navigation internally, breaks ESM resolution)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ children, ...props }: { children: React.ReactNode; href: string }) => children,
    redirect: vi.fn(),
    usePathname: () => '/',
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    }),
    getPathname: vi.fn(),
  }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; href: string }) => children,
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  getPathname: vi.fn(),
}))

// Mock @azure/msal-react
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      getAllAccounts: () => [],
      acquireTokenSilent: vi.fn(),
    },
    accounts: [],
    inProgress: 'none',
  }),
  useIsAuthenticated: () => false,
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock auth-config
vi.mock('@/lib/auth-config', () => ({
  isAuthConfigured: () => false,
  getMsalInstance: vi.fn(),
  apiScopes: [],
  loginRequest: {},
}))
