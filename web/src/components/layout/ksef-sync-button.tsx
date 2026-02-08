'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRunSync } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface KsefSyncButtonProps {
  /** Use smaller size on mobile */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Shared button component that triggers KSeF sync directly.
 * Syncs invoices from the last 30 days for the selected company.
 */
export function KsefSyncButton({ className }: Omit<KsefSyncButtonProps, 'compact'>) {
  const t = useTranslations('common')
  const tDashboard = useTranslations('dashboard')
  const { toast } = useToast()
  const { selectedCompany } = useCompanyContext()
  const queryClient = useQueryClient()
  const syncMutation = useRunSync()

  const isSyncing = syncMutation.isPending

  async function handleSync() {
    if (!selectedCompany?.nip) {
      toast({
        title: t('error'),
        description: 'No company selected',
        variant: 'destructive',
      })
      return
    }

    // Calculate date range: last 30 days
    const dateTo = new Date().toISOString().split('T')[0]
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const result = await syncMutation.mutateAsync({
        nip: selectedCompany.nip,
        settingId: selectedCompany.id,
        dateFrom,
        dateTo,
      })
      
      // Invalidate invoices to refresh the list
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      
      toast({
        title: tDashboard('syncCompleted'),
        description: tDashboard('syncCompletedDesc', { count: result.imported }),
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: tDashboard('syncError'),
        description: error instanceof Error ? error.message : t('error'),
        variant: 'destructive',
      })
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleSync}
      disabled={isSyncing || !selectedCompany}
      className={cn('h-8 w-8', className)}
      title={isSyncing ? tDashboard('syncing') : t('ksefSync')}
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
    </Button>
  )
}
