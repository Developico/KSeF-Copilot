'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  TrendingUp,
  RefreshCw, 
  Settings,
  ShieldCheck,
  Building2,
  Receipt,
} from 'lucide-react'
import { useAuth, useHasRole, type UserRole } from '@/components/auth/auth-provider'
import { CompanySelector } from './company-selector'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type NavigationItem = {
  nameKey: string
  icon: React.ElementType
  href: string
  disabled?: boolean
  requiredRole?: UserRole
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
      { nameKey: 'invoices', icon: FileText, href: '/invoices' },
      { nameKey: 'approvals', icon: ShieldCheck, href: '/approvals' },
    ],
  },
  {
    labelKey: 'sectionAnalysis',
    items: [
      { nameKey: 'reports', icon: BarChart3, href: '/reports' },
      { nameKey: 'forecast', icon: TrendingUp, href: '/forecast' },
    ],
  },
  {
    labelKey: 'sectionSuppliers',
    items: [
      { nameKey: 'suppliers', icon: Building2, href: '/suppliers' },
      { nameKey: 'selfBilling', icon: Receipt, href: '/self-billing' },
    ],
  },
  {
    labelKey: 'sectionAdmin',
    items: [
      { nameKey: 'sync', icon: RefreshCw, href: '/sync', requiredRole: 'Admin' },
      { nameKey: 'settings', icon: Settings, href: '/settings', requiredRole: 'Admin' },
    ],
  },
]

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const tHeader = useTranslations('header')
  const pathname = usePathname()
  const { user } = useAuth()
  const isAdmin = useHasRole('Admin')

  // Filter sections: remove items by role, then remove empty sections
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.requiredRole || (item.requiredRole === 'Admin' && isAdmin)
      ),
    }))
    .filter((section) => section.items.length > 0)

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
            <SheetTitle className="text-lg font-semibold text-left">{tHeader('title')}</SheetTitle>
            <p className="text-xs text-muted-foreground">{tHeader('subtitle')}</p>
          </div>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-4">
            {visibleSections.map((section) => {
              const sectionLabel = t(section.labelKey as 'sectionMain' | 'sectionAnalysis' | 'sectionSuppliers' | 'sectionAdmin')
              return (
                <div key={section.labelKey}>
                  <div className="px-3 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {sectionLabel}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                      const name = t(item.nameKey as 'dashboard' | 'invoices' | 'approvals' | 'reports' | 'forecast' | 'suppliers' | 'selfBilling' | 'sync' | 'settings')

                      if (item.disabled) {
                        return (
                          <li key={item.nameKey}>
                            <Button
                              variant="ghost"
                              className="w-full justify-start h-12 text-base opacity-50 cursor-not-allowed"
                              disabled
                            >
                              <Icon className="h-5 w-5 mr-3" />
                              <span className="flex-1 text-left">{name}</span>
                              <span className="text-xs text-muted-foreground">{tCommon('comingSoon')}</span>
                            </Button>
                          </li>
                        )
                      }

                      return (
                        <li key={item.nameKey}>
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
                              <span className="flex-1 text-left">{name}</span>
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
        </nav>

        {/* Company selector */}
        <div className="border-t p-3">
          <CompanySelector dropdownClassName="z-[70]" />
        </div>

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
