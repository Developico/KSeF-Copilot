import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useIntl } from 'react-intl'
import { Sun, Moon, Menu, Globe, Building2, ChevronDown, LogOut } from 'lucide-react'
import { useLocaleStore, locales, localeNames, localeFlags } from '@/i18n'
import { useCompanyContext } from '@/contexts/company-context'
import { useAuth } from '@/components/auth/auth-provider'
import { MobileSidebar } from './mobile-sidebar'
import { KsefSyncButton } from './ksef-sync-button'
import { SystemStatusBadge } from '@/components/health/system-status-badge'
import { ChangelogModal, useTripleClick } from './changelog-modal'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Header() {
  const intl = useIntl()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale } = useLocaleStore()
  const { companies, selectedCompany, setSelectedCompany, isLoading: companiesLoading } = useCompanyContext()
  const { user, isAuthenticated, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [logoRef, changelogTriggered, resetChangelog] = useTripleClick()
  const [changelogOpen, setChangelogOpen] = useState(false)

  useEffect(() => {
    if (changelogTriggered) {
      setChangelogOpen(true)
      resetChangelog()
    }
  }, [changelogTriggered, resetChangelog])

  const companyRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const userName = user?.name ?? ''
  const userInitials = userName
    ? userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  useEffect(() => setMounted(true), [])

  // Close dropdowns when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node
    if (companyRef.current && !companyRef.current.contains(target)) setCompanyMenuOpen(false)
    if (langRef.current && !langRef.current.contains(target)) setLangMenuOpen(false)
    if (userRef.current && !userRef.current.contains(target)) setUserMenuOpen(false)
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 md:w-52 shrink-0">
          {/* Mobile menu */}
          <button
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent"
            aria-label={intl.formatMessage({ id: 'header.openMenu' })}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

          <div className="flex items-center gap-3 select-none" ref={logoRef}>
            <div className="flex h-8 w-8 items-center justify-center">
              {logoOk ? (
                <img
                  src="/developico-logo.png"
                  alt="Developico"
                  width={32}
                  height={32}
                  className="rounded-lg"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  D
                </div>
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold leading-tight">
                {intl.formatMessage({ id: 'header.title' })}
              </h1>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: 'header.subtitle' })}
              </p>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-3 shrink-0">
          <TooltipProvider>
            {/* KSeF sync button */}
            <KsefSyncButton />

            {/* System status badge */}
            <SystemStatusBadge />
          </TooltipProvider>

          {/* Company selector */}
          {mounted && !companiesLoading && companies.length > 0 && (
            <div className="relative" ref={companyRef}>
              <button
                className="hidden sm:flex h-8 items-center gap-2 rounded-md border border-input px-3 hover:bg-accent text-sm max-w-[200px]"
                onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                title={intl.formatMessage({ id: 'header.selectCompany' })}
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {selectedCompany?.companyName ?? '—'}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
              {companyMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 rounded-md border bg-popover shadow-md z-50">
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 ${
                        selectedCompany?.id === c.id
                          ? 'bg-accent font-medium'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedCompany(c)
                        setCompanyMenuOpen(false)
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
              )}
            </div>
          )}

          {/* Language switcher */}
          {mounted && (
            <div className="relative" ref={langRef}>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                title={intl.formatMessage({ id: 'language.select' })}
              >
                <Globe className="h-4 w-4" />
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-md border bg-popover shadow-md z-50">
                  {locales.map((loc) => (
                    <button
                      key={loc}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 ${
                        locale === loc ? 'bg-accent font-medium' : ''
                      }`}
                      onClick={() => {
                        setLocale(loc)
                        setLangMenuOpen(false)
                      }}
                    >
                      <span>{localeFlags[loc]}</span>
                      <span>{localeNames[loc]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theme toggle */}
          {mounted && (
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={
                theme === 'dark'
                  ? intl.formatMessage({ id: 'header.lightMode' })
                  : intl.formatMessage({ id: 'header.darkMode' })
              }
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">
                {intl.formatMessage({ id: 'header.toggleTheme' })}
              </span>
            </button>
          )}

          {/* User avatar & menu */}
          {mounted && isAuthenticated && user && (
            <div className="relative" ref={userRef}>
              <button
                className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs hover:bg-primary/30 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={userName || intl.formatMessage({ id: 'header.userMenu' })}
              >
                {userInitials}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover shadow-md z-50">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium truncate">{user.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email ?? ''}</p>
                  </div>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 text-destructive"
                    onClick={() => {
                      setUserMenuOpen(false)
                      void logout()
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {intl.formatMessage({ id: 'auth.signOut' })}
                  </button>
                </div>
              )}
            </div>
          )}
          {mounted && !isAuthenticated && (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              U
            </div>
          )}
        </div>
      </div>

      {/* Changelog modal (Easter egg: triple-click logo) */}
      <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
    </header>
  )
}
