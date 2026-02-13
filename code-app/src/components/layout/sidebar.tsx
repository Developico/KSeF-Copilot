import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
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
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

type NavigationItem = {
  nameKey: string
  icon: React.ElementType
  href: string
  disabled?: boolean
  adminOnly?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    nameKey: 'navigation.dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    nameKey: 'navigation.invoices',
    icon: FileText,
    href: '/invoices',
  },
  {
    nameKey: 'navigation.reports',
    icon: BarChart3,
    href: '/reports',
  },
  {
    nameKey: 'navigation.forecast',
    icon: TrendingUp,
    href: '/forecast',
  },
  {
    nameKey: 'navigation.sync',
    icon: RefreshCw,
    href: '/sync',
    adminOnly: true,
  },
  {
    nameKey: 'navigation.settings',
    icon: Settings,
    href: '/settings',
    adminOnly: true,
  },
]

export function Sidebar({ className }: SidebarProps) {
  const intl = useIntl()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { pathname } = useLocation()

  // In Power Apps Code Apps, roles are managed by the platform.
  // For now, show all items. Role-based filtering can be added
  // via Power Apps SDK user info later.
  const visibleItems = navigationItems

  return (
    <aside
      className={cn(
        'relative flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        'hidden md:flex',
        isCollapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      <nav className="flex-1 space-y-1 p-2 pt-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
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
                </Link>
              </li>
            )
          })}

          {/* Separator */}
          <li className="pt-2">
            <div className="border-t mx-2" />
          </li>

          {/* Collapse toggle */}
          <li className="pt-2">
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
          </li>
        </ul>
      </nav>
    </aside>
  )
}
