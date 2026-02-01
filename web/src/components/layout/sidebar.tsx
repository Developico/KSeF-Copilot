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
  PanelLeftClose,
  PanelRightClose
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

type NavigationItem = {
  nameKey: string
  icon: React.ElementType
  href: string
  disabled?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    nameKey: 'dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    nameKey: 'invoices',
    icon: FileText,
    href: '/invoices',
  },
  {
    nameKey: 'reports',
    icon: BarChart3,
    href: '/reports',
  },
  {
    nameKey: 'sync',
    icon: RefreshCw,
    href: '/sync',
  },
  {
    nameKey: 'settings',
    icon: Settings,
    href: '/settings',
  },
]

export function Sidebar({ className }: SidebarProps) {
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

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
      <nav className="flex-1 space-y-1 p-2 pt-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const name = t(item.nameKey as 'dashboard' | 'invoices' | 'reports' | 'sync' | 'settings')

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
                  </Link>
                </Button>
              </li>
            )
          })}

          {/* Separator */}
          <li className="pt-2">
            <div className="border-t mx-2" />
          </li>

          {/* Collapse toggle as menu item */}
          <li className="pt-2">
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
          </li>
        </ul>
      </nav>

    </aside>
  )
}
