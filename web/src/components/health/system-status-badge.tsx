'use client'

import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { useHealthDetailed } from '@/hooks/use-api'
import { useSelectedCompany } from '@/contexts/company-context'
import { cn } from '@/lib/utils'
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

  if (isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Checking...
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Checking system status...</p>
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
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-xs font-medium text-red-700">
                Offline
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unable to connect to health endpoint</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      label: 'All Systems',
      className: 'bg-green-50 border-green-200 text-green-700',
      iconClassName: 'text-green-600',
      tooltip: 'All systems are operational',
    },
    degraded: {
      icon: AlertCircle,
      label: 'Degraded',
      className: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      iconClassName: 'text-yellow-600',
      tooltip: `${health.summary.degraded} service(s) degraded`,
    },
    unhealthy: {
      icon: XCircle,
      label: 'Issues',
      className: 'bg-red-50 border-red-200 text-red-700',
      iconClassName: 'text-red-600',
      tooltip: `${health.summary.unhealthy} service(s) unavailable`,
    },
  }

  const config = statusConfig[health.status]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-colors hover:opacity-80',
              config.className
            )}
          >
            <Icon className={cn('h-3 w-3', config.iconClassName)} />
            <span className="text-xs font-medium">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.tooltip}</p>
            <p className="text-xs text-muted-foreground">
              {health.summary.healthy}/{health.summary.total} services healthy
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
