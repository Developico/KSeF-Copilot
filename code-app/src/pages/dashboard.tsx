import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Calendar,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { HeroChartTile } from '@/components/dashboard/hero-chart-tile'
import { KpiMiniTiles } from '@/components/dashboard/kpi-mini-tiles'
import { ApprovalsTile } from '@/components/dashboard/approvals-tile'
import { SbPipelineTile } from '@/components/dashboard/sb-pipeline-tile'
import { BudgetTile } from '@/components/dashboard/budget-tile'
import { SuppliersTile } from '@/components/dashboard/suppliers-tile'
import { ForecastTile } from '@/components/dashboard/forecast-tile'
import { ActivityFeedTile } from '@/components/dashboard/activity-feed-tile'
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar'

// ─── Helpers ─────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────

export function DashboardPage() {
  const intl = useIntl()
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  // Date range — default: last year
  const defaultPreset: PresetKey = 'lastYear'
  const defaultDates = useMemo(() => getPresetDates(defaultPreset), [])

  const [fromDate, setFromDate] = useState(() => defaultDates.from)
  const [toDate, setToDate] = useState(() => defaultDates.to)
  const [activePreset, setActivePreset] = useState<PresetKey | 'custom'>(defaultPreset)

  const { data: stats, isLoading, isFetching, error, refetch } = useDashboardStats(
    { fromDate, toDate, settingId: selectedCompany?.id },
    { enabled: !companyLoading && Boolean(selectedCompany?.id) },
  )

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

  // ── Loading ──────────────────────────────────────────────────
  if ((isLoading && !stats) || companyLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" />
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {intl.formatMessage({ id: 'dashboard.subtitle' })}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" />
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── No company ───────────────────────────────────────────────
  if (!selectedCompany) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" />
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'settings.noCompanies' })}
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center mt-2 text-sm text-primary hover:underline"
            >
              {intl.formatMessage({ id: 'dashboard.syncPanel' })} →
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── No data ──────────────────────────────────────────────────
  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {intl.formatMessage({ id: 'dashboard.noData' })}
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" />
            {intl.formatMessage({ id: 'dashboard.title' })}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {intl.formatMessage({ id: 'dashboard.subtitle' })}
            {selectedCompany && (
              <span className="ml-2 font-medium text-foreground">
                — {selectedCompany.companyName}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Date range filter with presets ─────────────────────── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {intl.formatMessage({ id: 'dashboard.period' })}:
              </span>
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
                    {intl.formatMessage({ id: `dashboard.presets.${key}` })}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  {intl.formatMessage({ id: 'dashboard.presets.custom' })}
                </SelectItem>
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
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {intl.formatMessage({ id: 'dashboard.refresh' })}
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
