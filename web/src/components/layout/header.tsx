'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Sun, Moon, User, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChangelogModal } from './changelog-modal'
import { MobileSidebar } from './mobile-sidebar'
import { LanguageSwitcher } from './language-switcher'
import { KsefSyncButton } from './ksef-sync-button'
import { useAuth } from '@/components/auth/auth-provider'
import { SystemStatusBadge } from '@/components/health/system-status-badge'
import { CompanySelector } from './company-selector'

export function Header() {
  const t = useTranslations('header')
  const { theme, setTheme } = useTheme()
  const { user, logout, isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Easter egg state - triple click on logo to open changelog
  const [clickCount, setClickCount] = useState(0)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => setMounted(true), [])

  const handleLogoClick = () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout)
    }

    const newCount = clickCount + 1

    if (newCount === 3) {
      setIsChangelogOpen(true)
      setClickCount(0)
      setClickTimeout(null)
    } else {
      setClickCount(newCount)
      const timeout = setTimeout(() => {
        setClickCount(0)
        setClickTimeout(null)
      }, 1000)
      setClickTimeout(timeout)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  // Get role display name
  const roleDisplay = user?.primaryRole === 'User' ? 'Reader' : (user?.primaryRole || 'Unauthorized')

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          {/* Logo & Title - fixed width matching sidebar */}
          <div className="flex items-center gap-2 md:w-52 shrink-0">
            {/* Hamburger menu - mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('openMenu')}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Logo - Easter Egg: Triple click to show changelog */}
            <div 
              className="flex items-center gap-3 select-none cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
              title={clickCount > 0 ? t('clickHint', { count: 3 - clickCount, suffix: 3 - clickCount !== 1 ? 's' : '' }) : undefined}
            >
              <div className="flex h-8 w-8 items-center justify-center">
                {logoOk ? (
                  <Image
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
                <h1 className="text-base sm:text-lg font-semibold leading-tight">{t('title')}</h1>
                <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Company Selector - aligned with main content area */}
          {mounted && isAuthenticated && (
            <div className="hidden md:block pl-1">
              <CompanySelector variant="header" />
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* KSeF Sync Button */}
            {mounted && isAuthenticated && <KsefSyncButton />}
            
            {/* System Status Badge */}
            {mounted && isAuthenticated && <SystemStatusBadge />}
            
            {/* Language Switcher */}
            {mounted && <LanguageSwitcher />}

            {/* Theme toggle */}
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">{t('toggleTheme')}</span>
              </Button>
            )}

            {/* User Menu */}
            {mounted && isAuthenticated && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="relative h-8 w-8 rounded-full bg-transparent hover:bg-accent focus:bg-accent focus:outline-none"
                    title={`${t('userMenu')}: ${user.name}`}
                    aria-label={`${t('userMenu')}: ${user.name}`}
                  >
                    <UserAvatar 
                      name={user.name} 
                      email={user.email} 
                      size="md" 
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="text-[10px] mt-2 text-muted-foreground uppercase tracking-wide">
                      {t('role')}: <span className="text-foreground">{roleDisplay}</span>
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href="https://myaccount.microsoft.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      {t('profile')}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar 
        open={mobileMenuOpen} 
        onOpenChange={setMobileMenuOpen} 
      />
    </>
  )
}
