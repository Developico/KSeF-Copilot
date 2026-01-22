'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Sun, Moon, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChangelogModal } from './changelog-modal'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  // Easter egg state - triple click to open changelog
  const [clickCount, setClickCount] = useState(0)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => setMounted(true), [])

  const handleTitleClick = () => {
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

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 font-semibold">
              {logoOk ? (
                <Image
                  src="/logo.svg"
                  alt="dvlp-ksef"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  KS
                </div>
              )}
              <span 
                className="text-lg cursor-pointer select-none hidden sm:inline"
                onClick={handleTitleClick}
              >
                dvlp-ksef
              </span>
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
                <span className="sr-only">Przełącz motyw</span>
              </Button>
            )}

            {/* Changelog */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChangelogOpen(true)}
              title="Changelog"
            >
              <Info className="h-5 w-5" />
              <span className="sr-only">Changelog</span>
            </Button>
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
