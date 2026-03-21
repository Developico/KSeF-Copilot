'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useContextForecastMonthly } from '@/hooks/use-api'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
} as const

const trendColors = {
  up: 'text-red-500',
  down: 'text-green-500',
  stable: 'text-muted-foreground',
} as const

interface ForecastTileProps {
  delay?: number
}

export function ForecastTile({ delay = 0 }: ForecastTileProps) {
  const t = useTranslations('dashboard.tiles')
  const { data, isLoading } = useContextForecastMonthly({ horizon: 6 })

  if (isLoading) {
    return (
      <div className="col-span-12 lg:col-span-5">
        <Card className="h-full">
          <CardHeader className="pb-2 pt-4 px-5">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <Skeleton className="h-8 w-40 mb-3" />
            <Skeleton className="h-[90px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { trend, trendPercent, confidence, forecast, historical, summary } = data
  const TrendIcon = trendIcons[trend]

  // Chart data: last 6 historical + 6 forecast months
  // The last historical point carries both actual & predicted so the lines connect
  const histSlice = historical.slice(-6)
  const lastHist = histSlice.length > 0 ? histSlice[histSlice.length - 1] : null
  const sparkData = [
    ...histSlice.slice(0, -1).map((h) => ({
      month: h.month.slice(5),
      actual: h.grossAmount,
      predicted: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
    })),
    // Bridge point: last historical has both values so lines overlap
    ...(lastHist ? [{
      month: lastHist.month.slice(5),
      actual: lastHist.grossAmount,
      predicted: lastHist.grossAmount,
      upper: lastHist.grossAmount,
      lower: lastHist.grossAmount,
    }] : []),
    ...forecast.map((f) => ({
      month: f.month.slice(5),
      actual: null as number | null,
      predicted: f.predicted,
      upper: f.upper,
      lower: f.lower,
    })),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12 lg:col-span-5"
    >
      <Link href="/forecast" className="block">
        <Card className="h-full hover:shadow-md transition-all cursor-pointer group">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <TrendIcon className={`h-4 w-4 ${trendColors[trend]}`} />
                {t('forecast6Months')}
              </span>
              <span className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                {t('viewAll')} →
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(summary.nextMonth)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={trendColors[trend]}
                  >
                    {trend === 'up' ? '+' : trend === 'down' ? '' : ''}
                    {trendPercent.toFixed(1)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('confidence')}: {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="h-[110px]">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (value == null) return ['-', '']
                      const label = name === 'actual' ? 'Actual' : 'Forecast'
                      return [formatCurrency(value as number), label]
                    }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="url(#forecastBand)"
                    fillOpacity={1}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={0}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 3, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 1.5 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
