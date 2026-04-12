'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { useHasRole, useAuth, type UserRole } from '@/components/auth/auth-provider'
import { useContextPendingApprovals, useContextPendingSbApprovals } from '@/hooks/use-api'
import { Badge } from '@/components/ui/badge'

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
    labelKey: 'sectionMain',
    items: [
      { nameKey: 'dashboard', icon: LayoutDashboard, href: '/' },
      { nameKey: 'invoices', icon: FileText, href: '/invoices', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'costs', icon: Wallet, href: '/costs', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'approvals', icon: ShieldCheck, href: '/approvals' },
    ],
  },
  {
    labelKey: 'sectionAnalysis',
    items: [
      { nameKey: 'reports', icon: BarChart3, href: '/reports', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'forecast', icon: TrendingUp, href: '/forecast', allowedRoles: ['User', 'Admin'] },
    ],
  },
  {
    labelKey: 'sectionSuppliers',
    items: [
      { nameKey: 'suppliers', icon: Building2, href: '/suppliers', allowedRoles: ['User', 'Admin'] },
      { nameKey: 'selfBilling', icon: Receipt, href: '/self-billing' },
    ],
  },
  {
    labelKey: 'sectionAdmin',
    items: [
      { nameKey: 'sync', icon: RefreshCw, href: '/sync', allowedRoles: ['Admin'] },
      { nameKey: 'settings', icon: Settings, href: '/settings', allowedRoles: ['Admin'] },
    ],
  },
]

export function Sidebar({ className }: SidebarProps) {
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const isAdmin = useHasRole('Admin')
  const { user, isConfigured } = useAuth()
  const { data: approvalsData } = useContextPendingApprovals()
  const { data: sbApprovalsData } = useContextPendingSbApprovals()
  const pendingCount = (approvalsData?.count ?? 0) + (sbApprovalsData?.invoices?.length ?? 0)

  // Filter sections: remove items the user cannot see, then remove empty sections
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.allowedRoles) return true // no restriction
        if (!isConfigured || isAdmin) return true // dev mode or Admin sees everything
        if (!user) return false
        return item.allowedRoles.some((role) => user.roles.includes(role))
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside
      className={cn(
        'relative flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        'hidden md:flex', // Hide on mobile, show on md+
        isCollapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 p-2 pt-4">
        <div className="space-y-4">
          {visibleSections.map((section, sectionIdx) => {
            const sectionLabel = t(section.labelKey as 'sectionMain' | 'sectionAnalysis' | 'sectionSuppliers' | 'sectionAdmin')
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
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    const name = t(item.nameKey as 'dashboard' | 'invoices' | 'costs' | 'approvals' | 'reports' | 'forecast' | 'suppliers' | 'selfBilling' | 'sync' | 'settings')

                    if (item.disabled) {
                      return (
                        <li key={item.nameKey}>
                          <Button
                            variant="ghost"
                            className={cn(
                              'w-full justify-start h-10 opacity-50 cursor-not-allowed',
                              isCollapsed && 'px-2 justify-center'
                            )}
                            title={isCollapsed ? `${name} (${tCommon('comingSoon')})` : undefined}
                            disabled
                          >
                            <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                            {!isCollapsed && <span>{name}</span>}
                            {!isCollapsed && (
                              <span className="ml-auto text-xs text-muted-foreground">{tCommon('comingSoon')}</span>
                            )}
                          </Button>
                        </li>
                      )
                    }

                    return (
                      <li key={item.nameKey}>
                        <Button
                          variant="ghost"
                          asChild
                          className={cn(
                            'w-full justify-start h-10 relative border-l-4 border-l-transparent',
                            isCollapsed && 'px-2 justify-center',
                            isActive && 'border-l-primary bg-[#174372] text-white hover:bg-[#174372]/90 hover:text-white',
                            !isActive && 'hover:bg-accent hover:text-accent-foreground'
                          )}
                          title={isCollapsed ? name : undefined}
                        >
                          <Link href={item.href}>
                            <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                            {!isCollapsed && <span>{name}</span>}
                            {!isCollapsed && item.nameKey === 'approvals' && pendingCount > 0 && (
                              <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 px-1">
                                {pendingCount > 99 ? '99+' : pendingCount}
                              </Badge>
                            )}
                            {isCollapsed && item.nameKey === 'approvals' && pendingCount > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
                                {pendingCount > 99 ? '99+' : pendingCount}
                              </span>
                            )}
                          </Link>
                        </Button>
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
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start h-10 text-muted-foreground hover:text-foreground',
              isCollapsed && 'px-2 justify-center'
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? t('expandMenu') : t('collapseMenu')}
          >
            {isCollapsed ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-3" />
                <span>{t('collapseMenu')}</span>
              </>
            )}
          </Button>
        </div>
      </nav>

    </aside>
  )
}
