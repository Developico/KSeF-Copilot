'use client'

import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { useAvatar, getInitials, getAvatarColor } from '../../hooks/useAvatar'
import { useAuth } from '../auth/auth-provider'
import { cn } from '../../lib/utils'

interface UserAvatarProps {
  /** User ID to fetch avatar for. If not provided, uses current user. */
  userId?: string
  /** User name for initials fallback */
  name?: string
  /** User email for color generation */
  email?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Show loading skeleton */
  showLoading?: boolean
}

const sizeClasses = {
  sm: 'size-6 text-xs',
  md: 'size-8 text-sm',
  lg: 'size-10 text-base',
}

/**
 * User avatar component with Microsoft Graph integration
 * 
 * Fetches user photo from Graph API with caching.
 * Falls back to initials with consistent color based on email.
 */
export function UserAvatar({
  userId,
  name,
  email,
  size = 'md',
  className,
  showLoading = true,
}: UserAvatarProps) {
  const { user } = useAuth()
  const { avatarUrl, isLoading } = useAvatar(userId)

  // Use provided values or fall back to current user
  const displayName = name || user?.name || 'User'
  const displayEmail = email || user?.email || ''

  const initials = getInitials(displayName)
  const bgColor = getAvatarColor(displayEmail || displayName)

  if (isLoading && showLoading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-full bg-muted',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={displayName}
        />
      )}
      <AvatarFallback className={cn(bgColor, 'text-white font-medium')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * Current user avatar - convenience component
 */
export function CurrentUserAvatar(props: Omit<UserAvatarProps, 'userId' | 'name' | 'email'>) {
  const { user } = useAuth()
  
  return (
    <UserAvatar
      name={user?.name}
      email={user?.email}
      {...props}
    />
  )
}
