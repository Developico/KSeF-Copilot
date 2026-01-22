import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Synchronizacja KSeF</h1>
        <p className="text-muted-foreground">
          Pobierz nowe faktury z Krajowego Systemu e-Faktur
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Status połączenia z KSeF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Środowisko:</span>
              <span className="font-medium">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NIP:</span>
              <span className="font-medium">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token wygasa:</span>
              <span className="font-medium">—</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sprawdź status
          </Button>
        </CardContent>
      </Card>

      {/* Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pobierz faktury</CardTitle>
          <CardDescription>
            Wybierz zakres dat i pobierz nowe faktury zakupowe z KSeF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Data od</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data do</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Pobierz z KSeF
          </Button>
        </CardContent>
      </Card>

      {/* Results Card (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Nowe faktury do zaimportowania</CardTitle>
          <CardDescription>
            Wybierz faktury, które chcesz zaimportować do systemu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Kliknij "Pobierz z KSeF" aby zobaczyć dostępne faktury.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
