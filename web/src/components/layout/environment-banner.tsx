'use client'

import { cn } from '@/lib/utils'
import { useSelectedCompany } from '@/contexts/company-context'

export type KsefEnvironment = 'production' | 'test' | 'demo'

/**
 * Environment color configuration using Developico brand colors
 * - PROD: Teal (#23edd1) - production, safe
 * - TEST: Orange (#f59e0b) - warning, testing
 * - DEMO: Navy (#174372) - learning, demo
 */
export const environmentConfig: Record<KsefEnvironment, {
  label: string
  labelShort: string
  bgClass: string
  textClass: string
  badgeBg: string
  badgeText: string
  borderClass: string
}> = {
  production: {
    label: 'Produkcja',
    labelShort: 'PROD',
    bgClass: 'bg-[#23edd1]',
    textClass: 'text-[#0d4a42]',
    badgeBg: 'bg-[#23edd1]',
    badgeText: 'text-[#0d4a42]',
    borderClass: 'border-[#23edd1]',
  },
  test: {
    label: 'Test',
    labelShort: 'TEST',
    bgClass: 'bg-[#f59e0b]',
    textClass: 'text-[#78350f]',
    badgeBg: 'bg-[#f59e0b]',
    badgeText: 'text-[#78350f]',
    borderClass: 'border-[#f59e0b]',
  },
  demo: {
    label: 'Demo',
    labelShort: 'DEMO',
    bgClass: 'bg-[#174372]',
    textClass: 'text-white',
    badgeBg: 'bg-[#174372]',
    badgeText: 'text-white',
    borderClass: 'border-[#174372]',
  },
}

export function getEnvironmentConfig(env: string) {
  return environmentConfig[env as KsefEnvironment] || environmentConfig.demo
}

interface EnvironmentBannerProps {
  className?: string
}

/**
 * A thin colored banner at the top of the page indicating the current KSeF environment.
 * Provides immediate visual feedback about which environment the user is working in.
 */
export function EnvironmentBanner({ className }: EnvironmentBannerProps) {
  const { selectedCompany, isLoading } = useSelectedCompany()

  // Don't show banner if no company selected or still loading
  if (isLoading || !selectedCompany) {
    return null
  }

  const config = getEnvironmentConfig(selectedCompany.environment)

  return (
    <div
      className={cn(
        'h-1 w-full transition-colors duration-300',
        config.bgClass,
        className
      )}
      role="status"
      aria-label={`Środowisko KSeF: ${config.label}`}
    />
  )
}

interface EnvironmentBadgeProps {
  environment: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * A badge component showing the current KSeF environment with distinctive colors.
 */
export function EnvironmentBadge({ 
  environment, 
  size = 'md',
  className 
}: EnvironmentBadgeProps) {
  const config = getEnvironmentConfig(environment)

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        config.badgeBg,
        config.badgeText,
        sizeClasses[size],
        className
      )}
    >
      {config.labelShort}
    </span>
  )
}
