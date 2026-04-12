import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import developicoLogo from '@/assets/developico-logo.png'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Settings,
  Building2,
  ShieldCheck,
  Receipt,
  Wallet,
} from 'lucide-react'
import { useCompanyContext } from '@/contexts/company-context'
import { useAuth } from '@/components/auth/auth-provider'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type NavigationItem = {
  nameKey: string
  icon: React.ElementType
  href: string
  disabled?: boolean
  adminOnly?: boolean
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
      { nameKey: 'navigation.invoices', icon: FileText, href: '/invoices' },
      { nameKey: 'navigation.costs', icon: Wallet, href: '/costs' },
      { nameKey: 'navigation.approvals', icon: ShieldCheck, href: '/approvals' },
    ],
  },
  {
    labelKey: 'navigation.sectionAnalysis',
    items: [
      { nameKey: 'navigation.reports', icon: BarChart3, href: '/reports' },
      { nameKey: 'navigation.forecast', icon: TrendingUp, href: '/forecast' },
    ],
  },
  {
    labelKey: 'navigation.sectionSuppliers',
    items: [
      { nameKey: 'navigation.suppliers', icon: Building2, href: '/suppliers' },
      { nameKey: 'navigation.selfBilling', icon: Receipt, href: '/self-billing' },
    ],
  },
  {
    labelKey: 'navigation.sectionAdmin',
    items: [
      { nameKey: 'navigation.sync', icon: RefreshCw, href: '/sync', adminOnly: true },
      { nameKey: 'navigation.settings', icon: Settings, href: '/settings', adminOnly: true },
    ],
  },
]

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const intl = useIntl()
  const { pathname } = useLocation()
  const { user, isAdmin } = useAuth()
  const {
    companies,
    selectedCompany,
    setSelectedCompany,
  } = useCompanyContext()

  // Filter sections: remove items by role, then remove empty sections
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.adminOnly || isAdmin
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
            <img
              src={developicoLogo}
              alt="Developico"
              width={40}
              height={40}
              className="rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg font-semibold text-left">
              {intl.formatMessage({ id: 'header.title' })}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'header.subtitle' })}
            </p>
          </div>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-4">
            {visibleSections.map((section) => {
              const sectionLabel = intl.formatMessage({ id: section.labelKey })
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
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href + '/'))
                      const name = intl.formatMessage({ id: item.nameKey })

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
                              <span className="text-xs text-muted-foreground">
                                {intl.formatMessage({ id: 'common.comingSoon' })}
                              </span>
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
                              isActive &&
                                'border-l-primary bg-[#174372] text-white hover:bg-[#174372]/90',
                              !isActive &&
                                'hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <Link to={item.href}>
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
        {companies.length > 0 && (
          <div className="border-t p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {intl.formatMessage({ id: 'header.selectCompany' })}
            </p>
            <div className="space-y-1">
              {companies.map((c) => (
                <button
                  key={c.id}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent flex items-center gap-2',
                    selectedCompany?.id === c.id && 'bg-accent font-medium'
                  )}
                  onClick={() => {
                    setSelectedCompany(c)
                    onOpenChange(false)
                  }}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate">{c.companyName}</div>
                    <div className="text-xs text-muted-foreground">
                      NIP: {c.nip}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User info footer */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
