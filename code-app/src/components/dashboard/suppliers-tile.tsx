import { motion } from 'framer-motion'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Building2 } from 'lucide-react'
import type { SupplierStats } from '@/lib/types'
import { formatCurrencyCompact as formatCurrency } from '@/lib/format'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

interface SuppliersTileProps {
  topSuppliers: SupplierStats[]
  delay?: number
}

export function SuppliersTile({ topSuppliers, delay = 0 }: SuppliersTileProps) {
  const intl = useIntl()

  const top5 = topSuppliers.slice(0, 5).map((s) => ({
    ...s,
    name: s.supplierName.length > 30 ? s.supplierName.slice(0, 28) + '…' : s.supplierName,
    fullName: s.supplierName,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12 lg:col-span-7"
    >
      <Link to="/suppliers" className="block">
        <Card className="h-full hover:shadow-md transition-all cursor-pointer group">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {intl.formatMessage({ id: 'dashboard.tiles.topSuppliers' })}
              </span>
              <span className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                {intl.formatMessage({ id: 'dashboard.tiles.viewAll' })} →
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={180}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), intl.formatMessage({ id: 'invoices.grossAmount' })]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload as typeof top5[number] | undefined
                      return item?.fullName || label
                    }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="grossAmount" radius={[0, 4, 4, 0]} barSize={18}>
                    {top5.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
