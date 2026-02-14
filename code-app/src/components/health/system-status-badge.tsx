import { useIntl } from 'react-intl'
import { CircleDot } from 'lucide-react'
import { useHealthDetailed } from '@/hooks/use-api'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const statusColors: Record<string, string> = {
  healthy: 'text-green-500',
  degraded: 'text-amber-500',
  unhealthy: 'text-red-500',
}

/**
 * Small status badge in the header showing overall system health.
 * 8px colored dot with tooltip.
 */
export function SystemStatusBadge() {
  const intl = useIntl()
  const { data: health } = useHealthDetailed(undefined, {
    refetchInterval: 60_000, // refresh every minute
  })

  if (!health) return null

  const color = statusColors[health.status] ?? 'text-muted-foreground'
  const { healthy, degraded, unhealthy } = health.summary

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"
          title={intl.formatMessage({ id: 'settings.systemStatus' })}
        >
          <CircleDot className={`h-4 w-4 ${color}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium capitalize mb-1">
          {intl.formatMessage({ id: 'settings.systemStatus' })}: {health.status}
        </p>
        <p className="text-xs">
          {healthy} healthy, {degraded} degraded, {unhealthy} unhealthy
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
