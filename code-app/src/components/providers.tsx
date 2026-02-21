import { ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useLocaleStore, getMessages } from '@/i18n'
import { AuthProvider } from '@/components/auth/auth-provider'
import { AuthGate } from '@/components/auth/auth-gate'
import { CompanyProvider } from '@/contexts/company-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

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
 * - AuthProvider — Azure Entra ID authentication + RBAC (handles MSAL internally)
 * - ThemeProvider (next-themes) — light/dark mode
 * - QueryClientProvider (TanStack Query) — data fetching cache
 * - IntlProvider (react-intl) — i18n translations
 * - TooltipProvider — Radix tooltip context
 * - Toaster (sonner) — toast notifications
 */
export function Providers({ children }: ProvidersProps) {
  const { locale } = useLocaleStore()
  const messages = getMessages(locale)

  return (
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
          <AuthProvider>
            <AuthGate>
              <CompanyProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </CompanyProvider>
            </AuthGate>
          </AuthProvider>
        </IntlProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
