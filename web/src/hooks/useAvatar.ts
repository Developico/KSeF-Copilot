'use client'

import { useState, useEffect } from 'react'
import { getUserPhoto, getCachedAvatar } from '../lib/graph-service'
import { useAuth } from '../components/auth/auth-provider'

/**
 * Hook to fetch and cache user avatar from Microsoft Graph API
 * 
 * @param userId - Optional user ID. If not provided, fetches current user's avatar.
 * @returns Object with avatar URL, loading state, and error
 */
export function useAvatar(userId?: string) {
  const { isAuthenticated, isConfigured } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Check cache first
    const cached = getCachedAvatar(userId)
    if (cached) {
      setAvatarUrl(cached)
      return
    }

    // Don't fetch if not authenticated or auth not configured
    if (!isConfigured || !isAuthenticated) {
      return
    }

    let isMounted = true

    async function fetchAvatar() {
      setIsLoading(true)
      setError(null)

      try {
        const url = await getUserPhoto(userId)
        if (isMounted) {
          setAvatarUrl(url)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load avatar'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchAvatar()

    return () => {
      isMounted = false
    }
  }, [userId, isAuthenticated, isConfigured])

  return {
    avatarUrl,
    isLoading,
    error,
    hasAvatar: !!avatarUrl,
  }
}

/**
 * Get initials from user name for avatar fallback
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  
  const parts = name.trim().split(/\s+/)
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Generate a consistent color based on string (for avatar background)
 */
export function getAvatarColor(str: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}
