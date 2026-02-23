/**
 * useLocalStorage — generic hook for persisting state to localStorage.
 *
 * Works like useState but syncs the value to/from localStorage under the
 * given key. Supports a serializer/deserializer for non-JSON-friendly types
 * (e.g. Set).
 */

import { useState, useCallback, useEffect } from 'react'

interface UseLocalStorageOptions<T> {
  /** Custom serializer (default: JSON.stringify) */
  serialize?: (value: T) => string
  /** Custom deserializer (default: JSON.parse) */
  deserialize?: (raw: string) => T
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const serialize = options?.serialize ?? JSON.stringify
  const deserialize = options?.deserialize ?? JSON.parse

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? deserialize(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value
        try {
          localStorage.setItem(key, serialize(next))
        } catch {
          // quota exceeded — silently ignore
        }
        return next
      })
    },
    [key, serialize],
  )

  return [storedValue, setValue]
}
