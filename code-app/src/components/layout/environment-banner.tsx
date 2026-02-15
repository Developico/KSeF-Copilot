import { useCompanyContext } from '@/contexts/company-context'

const envColors: Record<string, string> = {
  production: 'bg-teal-500',
  test: 'bg-orange-500',
  demo: 'bg-blue-800',
}

const envLabels: Record<string, string> = {
  production: 'PRODUCTION',
  test: 'TEST',
  demo: 'DEMO',
}

/**
 * Thin colored banner at the very top of the app indicating which
 * KSeF environment the currently-selected company is connected to.
 * Production = teal, Test = orange, Demo = navy.
 */
export function EnvironmentBanner() {
  const { selectedCompany } = useCompanyContext()
  const env = selectedCompany?.environment

  if (!env) return null

  return (
    <div
      className={`h-1 w-full ${envColors[env] ?? 'bg-muted'}`}
      title={envLabels[env] ?? env}
      role="status"
      aria-label={`Environment: ${envLabels[env] ?? env}`}
    />
  )
}
