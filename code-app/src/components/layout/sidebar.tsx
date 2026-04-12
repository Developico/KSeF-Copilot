import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { cn } from '@/lib/utils'
import { useAuth, type UserRole } from '@/components/auth/auth-provider'
import { usePendingApprovals, useSelfBillingInvoices } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import {
  FileText,
  RefreshCw,
  Settings,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  PanelLeftClose,
  PanelRightClose,
  ShieldCheck,
  Building2,
  Receipt,
  Wallet,
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

type NavigationItem = {
  nameKey: string
  icon: React.ElementType
  href: string
  disabled?: boolean
  /** When set, only users with one of these roles (or Admin) can see the item */
  allowedRoles?: UserRole[]
}

type NavigationSection = {
  labelKey: string
  items: NavigationItem[]
}

const navigationSections: NavigationSection[] = [
  {
    labelKey: 'navigation.sectionMain',
    items: [
      { nameKey: 'navigation.dashboard', icon: LayoutDashboard, href: '/' },
      { nameKey: 'navigation.invoices', icon: FileText, href: '/invoices', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'navigation.costs', icon: Wallet, href: '/costs', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'navigation.approvals', icon: ShieldCheck, href: '/approvals' },
    ],
  },
  {
    labelKey: 'navigation.sectionAnalysis',
    items: [
      { nameKey: 'navigation.reports', icon: BarChart3, href: '/reports', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'navigation.forecast', icon: TrendingUp, href: '/forecast', allowedRoles: ['User', 'Admin'] },
    ],
  },
  {
    labelKey: 'navigation.sectionSuppliers',
    items: [
      { nameKey: 'navigation.suppliers', icon: Building2, href: '/suppliers', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'navigation.selfBilling', icon: Receipt, href: '/self-billing' },
    ],
  },
  {
    labelKey: 'navigation.sectionAdmin',
    items: [
      { nameKey: 'navigation.sync', icon: RefreshCw, href: '/sync', allowedRoles: ['Admin'] },
      { nameKey: 'navigation.settings', icon: Settings, href: '/settings', allowedRoles: ['Admin'] },
    ],
  },
]

export function Sidebar({ className }: SidebarProps) {
  const intl = useIntl()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { pathname } = useLocation()

  const { isAdmin, user, isConfigured } = useAuth()
  const { selectedCompany } = useCompanyContext()
  const { data: pendingApprovals } = usePendingApprovals(selectedCompany?.id ?? '')
  const { data: sbPendingData } = useSelfBillingInvoices(
    selectedCompany?.id ? { settingId: selectedCompany.id, status: 'PendingSeller' } : undefined,
    { enabled: !!selectedCompany?.id }
  )
  const totalPendingCount =
    (pendingApprovals?.approvals?.length ?? 0) + (sbPendingData?.invoices?.length ?? 0)

  // Filter sections: remove items the user cannot see, then remove empty sections
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.allowedRoles) return true
        if (!isConfigured || isAdmin) return true
        if (!user) return false
        return item.allowedRoles.some((role) => user.roles.includes(role))
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside
      className={cn(
        'relative flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        'hidden md:flex',
        isCollapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      <nav className="flex-1 p-2 pt-4">
        <div className="space-y-4">
          {visibleSections.map((section, sectionIdx) => {
            const sectionLabel = intl.formatMessage({ id: section.labelKey })
            return (
              <div key={section.labelKey}>
                {/* Section header */}
                {isCollapsed ? (
                  sectionIdx > 0 && <div className="border-t mx-2 mb-2" />
                ) : (
                  <div className="px-3 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {sectionLabel}
                    </span>
                  </div>
                )}
                {/* Section items */}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href + '/'))
                    const name = intl.formatMessage({ id: item.nameKey })

                    if (item.disabled) {
                      return (
                        <li key={item.nameKey}>
                          <button
                            className={cn(
                              'flex items-center w-full rounded-md px-3 h-10 text-sm opacity-50 cursor-not-allowed',
                              isCollapsed && 'px-2 justify-center'
                            )}
                            title={
                              isCollapsed
                                ? `${name} (${intl.formatMessage({ id: 'common.comingSoon' })})`
                                : undefined
                            }
                            disabled
                          >
                            <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                            {!isCollapsed && <span>{name}</span>}
                            {!isCollapsed && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {intl.formatMessage({ id: 'common.comingSoon' })}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    }

                    return (
                      <li key={item.nameKey}>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center w-full rounded-md px-3 h-10 text-sm border-l-4 border-l-transparent transition-colors',
                            isCollapsed && 'px-2 justify-center',
                            isActive &&
                              'border-l-primary bg-[#174372] text-white hover:bg-[#174372]/90',
                            !isActive &&
                              'hover:bg-accent hover:text-accent-foreground'
                          )}
                          title={isCollapsed ? name : undefined}
                        >
                          <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                          {!isCollapsed && <span>{name}</span>}
                          {item.href === '/approvals' && totalPendingCount > 0 && (
                            <span className={cn(
                              'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white',
                              isCollapsed && 'absolute -top-1 -right-1 h-4 min-w-4 text-[9px]'
                            )}>
                              {totalPendingCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Separator */}
        <div className="pt-2">
          <div className="border-t mx-2" />
        </div>

        {/* Collapse toggle */}
        <div className="pt-2">
          <button
            className={cn(
              'flex items-center w-full rounded-md px-3 h-10 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
              isCollapsed && 'px-2 justify-center'
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={
              isCollapsed
                ? intl.formatMessage({ id: 'navigation.expandMenu' })
                : intl.formatMessage({ id: 'navigation.collapseMenu' })
            }
          >
            {isCollapsed ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-3" />
                <span>
                  {intl.formatMessage({ id: 'navigation.collapseMenu' })}
                </span>
              </>
            )}
          </button>
        </div>
      </nav>
    </aside>
  )
}
