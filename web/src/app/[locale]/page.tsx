'use client'

import { LayoutDashboard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function HomePage() {
  const t = useTranslations('dashboard')

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <DashboardContent />
    </div>
  )
}
