'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Sun, Moon, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChangelogModal } from './changelog-modal'

// Mock user for demo - will be replaced with real auth
const mockUser = {
  name: 'Jan Kowalski',
  email: 'jan.kowalski@example.com',
  avatar: null,
  role: 'Administrator',
}

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

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

  const handleLogout = () => {
    // TODO: Implement real logout
    console.log('Logout clicked')
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            {/* Logo - Easter Egg: Triple click to show changelog */}
            <div 
              className="flex items-center gap-3 select-none cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
              title={clickCount > 0 ? `Kliknij jeszcze ${3 - clickCount} raz${3 - clickCount !== 1 ? 'y' : ''}...` : undefined}
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
                <h1 className="text-base sm:text-lg font-semibold">KSeF</h1>
                <p className="text-xs text-muted-foreground">Developico</p>
              </div>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Przełącz motyw</span>
              </Button>
            )}

            {/* User Menu */}
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative h-8 w-8 rounded-full bg-transparent hover:bg-accent focus:bg-accent focus:outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={mockUser.avatar || undefined} alt={mockUser.name} />
                      <AvatarFallback>
                        {mockUser.name?.charAt(0) || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{mockUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{mockUser.email}</p>
                    <p className="text-[10px] mt-2 text-muted-foreground uppercase tracking-wide">
                      Rola: <span className="text-foreground">{mockUser.role}</span>
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
                      Profil
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Wyloguj
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
    </>
  )
}
