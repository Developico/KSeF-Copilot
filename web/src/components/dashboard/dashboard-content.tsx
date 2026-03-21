'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, RefreshCw } from 'lucide-react'
import { DashboardSkeleton } from '@/components/skeletons'
import { useContextDashboardStats } from '@/hooks/use-api'
import { useTranslations } from 'next-intl'
import { HeroChartTile } from './hero-chart-tile'
import { KpiMiniTiles } from './kpi-mini-tiles'
import { ApprovalsTile } from './approvals-tile'
import { SbPipelineTile } from './sb-pipeline-tile'
import { BudgetTile } from './budget-tile'
import { SuppliersTile } from './suppliers-tile'
import { ForecastTile } from './forecast-tile'
import { ActivityFeedTile } from './activity-feed-tile'
import { QuickActionsBar } from './quick-actions-bar'

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

type PresetKey = 'thisMonth' | 'thisQuarter' | 'thisYear' | 'lastMonth' | 'lastQuarter' | 'lastYear'

function getPresetDates(key: PresetKey): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (key) {
    case 'thisMonth':
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(now) }
    case 'lastMonth':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) }
    case 'thisQuarter': {
      const qStart = Math.floor(m / 3) * 3
      return { from: toISODate(new Date(y, qStart, 1)), to: toISODate(now) }
    }
    case 'lastQuarter': {
      const qStart = Math.floor(m / 3) * 3
      return { from: toISODate(new Date(y, qStart - 3, 1)), to: toISODate(new Date(y, qStart, 0)) }
    }
    case 'thisYear':
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(now) }
    case 'lastYear':
      return { from: toISODate(new Date(y - 1, 0, 1)), to: toISODate(new Date(y - 1, 11, 31)) }
  }
}

const PRESETS: PresetKey[] = ['thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter', 'thisYear', 'lastYear']

export function DashboardContent() {
  const t = useTranslations('dashboard')

  // Date range — default: last year
  const defaultPreset: PresetKey = 'lastYear'
  const defaultDates = useMemo(() => getPresetDates(defaultPreset), [])

  const [fromDate, setFromDate] = useState(() => defaultDates.from)
  const [toDate, setToDate] = useState(() => defaultDates.to)
  const [activePreset, setActivePreset] = useState<PresetKey | 'custom'>(defaultPreset)

  const { data: stats, isLoading, isFetching, refetch } = useContextDashboardStats({ fromDate, toDate })

  const applyPreset = (key: PresetKey) => {
    const dates = getPresetDates(key)
    setFromDate(dates.from)
    setToDate(dates.to)
    setActivePreset(key)
  }

  const handleFromChange = (val: string) => {
    setFromDate(val)
    setActivePreset('custom')
  }

  const handleToChange = (val: string) => {
    setToDate(val)
    setActivePreset('custom')
  }

  // Show full skeleton only on first load (no cached data yet)
  if (isLoading && !stats) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('noData')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('period')}:</span>
            </div>
            <Select
              value={activePreset}
              onValueChange={(val) => {
                if (val === 'custom') {
                  setActivePreset('custom')
                } else {
                  applyPreset(val as PresetKey)
                }
              }}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`presets.${key}`)}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t('presets.custom')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => handleFromChange(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => handleToChange(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-12 gap-3">
        {/* Row 1: Hero chart (7 cols) + 4 KPI mini-tiles (5 cols) — 2 rows tall */}
        <HeroChartTile monthly={stats.monthly} delay={0} />
        <KpiMiniTiles stats={stats} delay={0.1} />

        {/* Row 2: Three medium tiles — Approvals / Self-Billing / Budget */}
        <ApprovalsTile delay={0.2} />
        <SbPipelineTile delay={0.3} />
        <BudgetTile delay={0.4} />

        {/* Row 3: Suppliers chart (7 cols) + Forecast (5 cols) */}
        <SuppliersTile topSuppliers={stats.topSuppliers} delay={0.5} />
        <ForecastTile delay={0.6} />

        {/* Row 4: Activity feed — full width */}
        <ActivityFeedTile delay={0.7} />

        {/* Row 5: Quick actions — full width */}
        <QuickActionsBar delay={0.8} />
      </div>
    </div>
  )
}
