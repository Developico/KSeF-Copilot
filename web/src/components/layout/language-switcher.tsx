'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check } from 'lucide-react'
import { locales, localeNames, localeFlags, Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleLocaleChange(newLocale: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2 gap-1.5 text-sm font-medium', isPending && 'opacity-50')}
          title={t('select')}
          disabled={isPending}
        >
          <span className="text-base leading-none">{localeFlags[locale]}</span>
          <span className="hidden sm:inline uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span>{localeFlags[loc]}</span>
            <span>{localeNames[loc]}</span>
            {locale === loc && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
