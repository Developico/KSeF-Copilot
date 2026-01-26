import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Developico KSeF',
  description: 'Open-source KSeF integration module with Dataverse backend',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <PageWrapper>
            {children}
          </PageWrapper>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
