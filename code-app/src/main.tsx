import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initializeMsal, isAuthConfigured } from './lib/auth-config'
import './globals.css'

async function bootstrap() {
  // Initialize MSAL before rendering (handles redirect promise)
  if (isAuthConfigured()) {
    await initializeMsal()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap().catch(console.error)
