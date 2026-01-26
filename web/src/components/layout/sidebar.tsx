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
  Building2,
  BarChart3
} from 'lucide-react'

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
    name: 'Firmy',
    icon: Building2,
    href: '/companies',
    disabled: true,
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
        'relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      {/* Collapse toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

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
        </ul>
      </nav>

      {/* Footer with version */}
      {!isCollapsed && (
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">Developico KSeF v0.1.0</p>
        </div>
      )}
    </aside>
  )
}
