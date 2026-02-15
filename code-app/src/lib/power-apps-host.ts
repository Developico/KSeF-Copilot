/**
 * Power Apps host detection and context utilities.
 *
 * When the app runs as a Power Apps Code App, authentication is managed
 * by the host. MSAL redirect-based auth must be skipped entirely.
 *
 * The Power Apps SDK (`@microsoft/power-apps`) provides `app.getContext()`
 * which returns user information from the host session.
 */

import { getContext, type IContext } from '@microsoft/power-apps/app'

// ── Cache ────────────────────────────────────────────────────────

let _isPowerApps: boolean | null = null
let _cachedContext: IContext | null = null

// ── Detection ────────────────────────────────────────────────────

/**
 * Detect if the app is running inside the Power Apps host.
 *
 * Checks multiple signals:
 * 1. `window.powerAppsBridge` — injected by the Power Apps host runtime
 *    (this is what the SDK itself uses internally)
 * 2. URL contains `apps.powerapps.com` or `apps.preview.powerapps.com`
 * 3. Running in an iframe (Code Apps always run in iframe)
 *    combined with referrer or cross-origin parent heuristic
 */
export function isPowerAppsHost(): boolean {
  if (_isPowerApps !== null) return _isPowerApps

  try {
    // Primary check — the SDK bridge object injected by the Power Apps host
    if (
      typeof window !== 'undefined' &&
      'powerAppsBridge' in window &&
      (window as Record<string, unknown>).powerAppsBridge != null
    ) {
      console.log('[KSeF] isPowerAppsHost → true (powerAppsBridge detected)')
      _isPowerApps = true
      return true
    }

    const url = window.location.href

    // Direct check — running on powerapps.com domain
    if (url.includes('powerapps.com')) {
      console.log('[KSeF] isPowerAppsHost → true (URL)')
      _isPowerApps = true
      return true
    }

    // Referrer check — Power Apps sets referrer when loading iframe
    if (document.referrer && document.referrer.includes('powerapps.com')) {
      console.log('[KSeF] isPowerAppsHost → true (referrer)')
      _isPowerApps = true
      return true
    }

    // Iframe check — Code Apps always run in an iframe
    if (window.self !== window.top) {
      try {
        const parentOrigin = window.parent.location.origin
        if (parentOrigin.includes('powerapps.com')) {
          console.log('[KSeF] isPowerAppsHost → true (parent origin)')
          _isPowerApps = true
          return true
        }
      } catch {
        // Cross-origin block means we're in a foreign iframe — likely Power Apps
        // Additional check: if referrer is set and is not our own domain
        console.log('[KSeF] isPowerAppsHost → true (cross-origin iframe, assuming PA)')
        _isPowerApps = true
        return true
      }
    }
  } catch {
    // Fallback: not in Power Apps
  }

  console.log('[KSeF] isPowerAppsHost → false')
  _isPowerApps = false
  return false
}

// ── Context ──────────────────────────────────────────────────────

/**
 * Get Power Apps context (user info, app info, host info).
 * Returns null if not running in Power Apps or context unavailable.
 */
export async function getPowerAppsContext(): Promise<IContext | null> {
  if (_cachedContext) return _cachedContext

  if (!isPowerAppsHost()) return null

  try {
    const context = await getContext()
    _cachedContext = context
    return context
  } catch (error) {
    console.warn('Failed to get Power Apps context:', error)
    return null
  }
}

/**
 * Get user info from Power Apps context.
 * Returns null if not available.
 */
export async function getPowerAppsUser(): Promise<IContext['user'] | null> {
  const context = await getPowerAppsContext()
  return context?.user ?? null
}
