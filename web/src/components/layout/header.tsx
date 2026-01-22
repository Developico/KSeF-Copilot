import Link from 'next/link'
import { FileText, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <FileText className="h-6 w-6" />
            <span>dvlp-ksef</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/invoices">Faktury</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/sync">
                <RefreshCw className="mr-2 h-4 w-4" />
                Synchronizacja
              </Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Ustawienia</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
