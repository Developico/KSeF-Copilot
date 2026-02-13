import { ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MsalProvider } from '@azure/msal-react'
import { ThemeProvider } from 'next-themes'
import { useLocaleStore, getMessages } from '@/i18n'
import { getMsalInstance, isAuthConfigured } from '@/lib/auth-config'
import { AuthGate } from '@/components/auth/auth-gate'
import { CompanyProvider } from '@/contexts/company-context'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

/**
 * Application providers stack.
 *
 * Providers:
 * - MsalProvider — Azure Entra ID authentication (when configured)
 * - ThemeProvider (next-themes) — light/dark mode
 * - QueryClientProvider (TanStack Query) — data fetching cache
 * - IntlProvider (react-intl) — i18n translations
 */
export function Providers({ children }: ProvidersProps) {
  const { locale } = useLocaleStore()
  const messages = getMessages(locale)

  const inner = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <IntlProvider
          locale={locale}
          messages={messages}
          defaultLocale="pl"
          onError={(err) => {
            // Suppress missing translation warnings in dev
            if (err.code === 'MISSING_TRANSLATION') return
            console.error(err)
          }}
        >
          <AuthGate>
            <CompanyProvider>
              {children}
            </CompanyProvider>
          </AuthGate>
        </IntlProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )

  // Wrap with MSAL only when auth is configured (env vars present)
  if (isAuthConfigured()) {
    return (
      <MsalProvider instance={getMsalInstance()}>
        {inner}
      </MsalProvider>
    )
  }

  return inner
}
