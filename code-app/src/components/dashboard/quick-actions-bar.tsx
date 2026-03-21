import { motion } from 'framer-motion'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  CheckCircle,
  FileStack,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHasRole } from '@/components/auth/auth-provider'

const actions = [
  { key: 'sync', href: '/sync', icon: RefreshCw, color: 'text-emerald-600', adminOnly: true },
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
  const intl = useIntl()
  const isAdmin = useHasRole('Admin')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="col-span-12"
    >
      <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
        {actions.map((action) => {
          if ('adminOnly' in action && action.adminOnly && !isAdmin) return null
          const Icon = action.icon
          return (
            <Button
              key={action.key}
              variant="outline"
              size="sm"
              className="w-full gap-2"
              asChild
            >
              <Link to={action.href}>
                <Icon className={`h-4 w-4 ${action.color}`} />
                {intl.formatMessage({ id: `dashboard.quickActions.${action.key}` })}
              </Link>
            </Button>
          )
        })}
      </div>
    </motion.div>
  )
}
