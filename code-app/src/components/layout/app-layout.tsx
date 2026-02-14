import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { EnvironmentBanner } from './environment-banner'

interface AppLayoutProps {
  children?: ReactNode
}

/**
 * Main application layout with header, sidebar, and content area.
 * Adapted from web/src/components/layout/page-wrapper.tsx for SPA routing.
 * 
 * Uses React Router's <Outlet /> for nested route rendering.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      <EnvironmentBanner />
      <Header />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />

        <main className="flex-1 overflow-auto bg-background p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
