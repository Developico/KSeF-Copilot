'use client'

import { motion } from 'framer-motion'
import {
  RefreshCw,
  CheckCircle,
  FileStack,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

const actions = [
  { key: 'sync', href: '/sync', icon: RefreshCw, color: 'text-emerald-600' },
  { key: 'approvals', href: '/approvals', icon: CheckCircle, color: 'text-purple-600' },
  { key: 'newSb', href: '/self-billing', icon: FileStack, color: 'text-indigo-600' },
  { key: 'invoices', href: '/invoices', icon: FileText, color: 'text-blue-600' },
  { key: 'reports', href: '/reports', icon: BarChart3, color: 'text-amber-600' },
  { key: 'forecast', href: '/forecast', icon: TrendingUp, color: 'text-violet-600' },
] as const

interface QuickActionsBarProps {
  delay?: number
}

export function QuickActionsBar({ delay = 0 }: QuickActionsBarProps) {
  const t = useTranslations('dashboard.quickActions')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12"
    >
      <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.key}
              variant="outline"
              size="sm"
              className="w-full gap-2"
              asChild
            >
              <Link href={action.href}>
                <Icon className={`h-4 w-4 ${action.color}`} />
                {t(action.key)}
              </Link>
            </Button>
          )
        })}
      </div>
    </motion.div>
  )
}
