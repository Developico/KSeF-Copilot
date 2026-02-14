import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initializeMsal, isAuthConfigured } from './lib/auth-config'
import { isPowerAppsHost } from './lib/power-apps-host'
import './globals.css'

async function bootstrap() {
  const inPowerApps = isPowerAppsHost()

  console.info('[KSeF Copilot] bootstrap', {
    inPowerApps,
    authConfigured: isAuthConfigured(),
    href: window.location.href,
    inIframe: window.self !== window.top,
  })

  // Skip MSAL initialization when running inside Power Apps host —
  // authentication is managed by the platform.
  if (isAuthConfigured() && !inPowerApps) {
    await initializeMsal()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap().catch((err) => {
  console.error('[KSeF Copilot] bootstrap failed:', err)
  // Show error visually so it's visible even without devtools
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding:2rem;font-family:system-ui,sans-serif">
        <h1 style="color:#dc2626">Startup Error</h1>
        <pre style="background:#f3f4f6;padding:1rem;border-radius:0.5rem;overflow:auto">${err?.stack || err}</pre>
      </div>
    `
  }
})
