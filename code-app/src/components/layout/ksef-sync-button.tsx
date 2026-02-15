import { useIntl } from 'react-intl'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useRunSync } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Small icon button in the header that triggers a quick KSeF sync
 * for the last 30 days.
 */
export function KsefSyncButton() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const runSync = useRunSync()

  if (!selectedCompany) return null

  function handleSync() {
    if (!selectedCompany) return
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
    runSync.mutate({
      settingId: selectedCompany.id,
      nip: selectedCompany.nip,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-50"
          onClick={handleSync}
          disabled={runSync.isPending}
          title={intl.formatMessage({ id: 'common.ksefSync' })}
        >
          {runSync.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{intl.formatMessage({ id: 'common.ksefSync' })}</p>
      </TooltipContent>
    </Tooltip>
  )
}
