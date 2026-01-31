'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  FileText, 
  RefreshCw, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { CompanySelector } from './company-selector'

interface SidebarProps {
  className?: string
}

type NavigationItem = {
  name: string
  icon: React.ElementType
  href: string
  disabled?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    name: 'Faktury',
    icon: FileText,
    href: '/invoices',
  },
  {
    name: 'Raporty',
    icon: BarChart3,
    href: '/reports',
  },
  {
    name: 'Synchronizacja',
    icon: RefreshCw,
    href: '/sync',
  },
  {
    name: 'Ustawienia',
    icon: Settings,
    href: '/settings',
  },
]

export function Sidebar({ className }: SidebarProps) {
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
            const isActive = pathname === item.href

            if (item.disabled) {
              return (
                <li key={item.name}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-10 opacity-50 cursor-not-allowed',
                      isCollapsed && 'px-2 justify-center'
                    )}
                    title={isCollapsed ? `${item.name} (wkrótce)` : undefined}
                    disabled
                  >
                    <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                    {!isCollapsed && <span>{item.name}</span>}
                    {!isCollapsed && (
                      <span className="ml-auto text-xs text-muted-foreground">wkrótce</span>
                    )}
                  </Button>
                </li>
              )
            }

            return (
              <li key={item.name}>
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    'w-full justify-start h-10 relative border-l-4 border-l-transparent',
                    isCollapsed && 'px-2 justify-center',
                    isActive && 'border-l-primary bg-[#174372] text-white hover:bg-[#174372]/90 hover:text-white',
                    !isActive && 'hover:bg-accent hover:text-accent-foreground'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Link href={item.href}>
                    <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                    {!isCollapsed && <span>{item.name}</span>}
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
              title={isCollapsed ? 'Rozwiń menu' : 'Zwiń menu'}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 mr-3" />
                  <span>Zwiń menu</span>
                </>
              )}
            </Button>
          </li>
        </ul>
      </nav>

      {/* Footer with Company Selector */}
      <div className="border-t p-2">
        <CompanySelector collapsed={isCollapsed} />
      </div>
    </aside>
  )
}
