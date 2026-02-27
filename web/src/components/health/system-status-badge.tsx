'use client'

import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useHealthDetailed } from '@/hooks/use-api'
import { useSelectedCompany } from '@/contexts/company-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function SystemStatusBadge() {
  const { selectedCompany } = useSelectedCompany()
  const environment = selectedCompany?.environment
  const { data: health, isLoading } = useHealthDetailed(environment)
  const t = useTranslations('systemStatus')

  if (isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-default"
              disabled
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('checking')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (!health) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900"
            >
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('cannotConnect')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      buttonClass: 'border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-900 dark:bg-green-950 dark:hover:bg-green-900',
      iconClass: 'text-green-600 dark:text-green-400',
      tooltip: t('allOperational'),
    },
    degraded: {
      icon: AlertCircle,
      buttonClass: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950 dark:hover:bg-yellow-900',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
      tooltip: t('servicesDegraded', { count: health.summary.degraded }),
    },
    unhealthy: {
      icon: XCircle,
      buttonClass: 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900',
      iconClass: 'text-red-600 dark:text-red-400',
      tooltip: t('servicesUnavailable', { count: health.summary.unhealthy }),
    },
  }

  const config = statusConfig[health.status]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn('h-8 w-8', config.buttonClass)}
          >
            <Icon className={cn('h-4 w-4', config.iconClass)} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.tooltip}</p>
            <p className="text-xs text-muted-foreground">
              {t('servicesHealthy', { healthy: health.summary.healthy, total: health.summary.total })}
            </p>
            {health.services.length > 0 && (
              <div className="pt-2 mt-2 border-t space-y-1">
                {health.services.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : service.status === 'degraded' ? (
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>{service.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
