'use client'

import { ReactNode } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

interface PageWrapperProps {
  children: ReactNode
  header?: ReactNode
  showSidebar?: boolean
}

/**
 * Common page wrapper that includes:
 * - Header
 * - Sidebar (optional)
 * - Main content area
 * 
 * Use this for all app pages to ensure consistent layout.
 */
export function PageWrapper({ children, header, showSidebar = true }: PageWrapperProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      {header || <Header />}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {showSidebar && <Sidebar />}

        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
