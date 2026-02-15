/**
 * In-memory rate limiter for HTTP endpoints.
 *
 * Provides per-user (by JWT `oid`) and per-IP sliding-window rate limiting.
 * This protects against brute force / excessive polling by authenticated
 * or anonymous callers.
 *
 * NOTE: In a multi-instance deployment consider Azure API Management or
 * a distributed store (e.g. Redis) instead of in-memory counters.
 */

interface RateLimitBucket {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitBucket>()

/** Default: 60 requests per 60-second window per key */
const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 60

export interface RateLimitOptions {
  /** Sliding window duration in ms (default 60 000) */
  windowMs?: number
  /** Max requests allowed within the window (default 60) */
  maxRequests?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

/**
 * Check (and increment) the rate limit for the given key.
 *
 * @param key   Unique caller identifier (e.g. `user:<oid>` or `ip:<address>`)
 * @param opts  Optional overrides for window size / max requests
 */
export function checkHttpRateLimit(
  key: string,
  opts?: RateLimitOptions,
): RateLimitResult {
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS
  const maxRequests = opts?.maxRequests ?? DEFAULT_MAX_REQUESTS
  const now = Date.now()

  const bucket = store.get(key)

  // No existing bucket or window expired → start fresh
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 }
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: bucket.resetAt - now,
    }
  }

  bucket.count++
  return { allowed: true, remaining: maxRequests - bucket.count, retryAfterMs: 0 }
}

// Periodic cleanup to avoid unbounded memory growth (every 5 min)
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) {
      store.delete(key)
    }
  }
}, 300_000).unref()
