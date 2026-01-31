'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  RefreshCw, 
  Settings,
  X
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Close drawer when route changes
  useEffect(() => {
    onOpenChange(false)
  }, [pathname, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b flex flex-row items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center shrink-0">
            <Image
              src="/developico-logo.png"
              alt="Developico"
              width={40}
              height={40}
              className="rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg font-semibold text-left">C-Level KSeF</SheetTitle>
            <p className="text-xs text-muted-foreground">Cost analysis</p>
          </div>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              if (item.disabled) {
                return (
                  <li key={item.name}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-base opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="flex-1 text-left">{item.name}</span>
                      <span className="text-xs text-muted-foreground">wkrótce</span>
                    </Button>
                  </li>
                )
              }

              return (
                <li key={item.name}>
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-12 text-base relative border-l-4 border-l-transparent',
                      isActive && 'border-l-primary bg-primary/10 text-primary hover:bg-primary/15',
                      !isActive && 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="flex-1 text-left">{item.name}</span>
                    </Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User info footer */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium">{user.name?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
