import { create } from 'zustand'
import { type Locale, defaultLocale } from './config'

const STORAGE_KEY = 'dvlp-ksef-locale'

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'pl' || stored === 'en') return stored
  } catch {
    // localStorage not available
  }
  // Detect from browser
  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'en' ? 'en' : defaultLocale
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getStoredLocale(),
  setLocale: (locale: Locale) => {
    localStorage.setItem(STORAGE_KEY, locale)
    set({ locale })
  },
}))
