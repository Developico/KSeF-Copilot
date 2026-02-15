import { createIntl, createIntlCache, IntlShape } from 'react-intl'
import { type Locale, defaultLocale } from './config'
import plMessages from '../messages/pl.json'
import enMessages from '../messages/en.json'

const cache = createIntlCache()

const messages: Record<Locale, Record<string, string>> = {
  pl: flattenMessages(plMessages),
  en: flattenMessages(enMessages),
}

/**
 * Flatten nested message objects into dot-separated keys.
 * e.g. { navigation: { dashboard: "Panel" } } → { "navigation.dashboard": "Panel" }
 */
function flattenMessages(
  nestedMessages: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  return Object.entries(nestedMessages).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'string') {
        acc[prefixedKey] = value
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(
          acc,
          flattenMessages(value as Record<string, unknown>, prefixedKey)
        )
      }
      return acc
    },
    {}
  )
}

export function getIntl(locale: Locale = defaultLocale): IntlShape {
  return createIntl(
    {
      locale,
      messages: messages[locale] || messages[defaultLocale],
    },
    cache
  )
}

export function getMessages(locale: Locale): Record<string, string> {
  return messages[locale] || messages[defaultLocale]
}
