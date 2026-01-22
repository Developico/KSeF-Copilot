import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ustawienia</h1>
        <p className="text-muted-foreground">
          Konfiguracja integracji z KSeF
        </p>
      </div>

      {/* Company Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dane firmy</CardTitle>
          <CardDescription>
            Informacje o spółce używanej do synchronizacji z KSeF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">NIP</label>
              <input
                type="text"
                disabled
                placeholder="Konfiguracja w .env"
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nazwa firmy</label>
              <input
                type="text"
                disabled
                placeholder="Konfiguracja w .env"
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KSeF Token Card */}
      <Card>
        <CardHeader>
          <CardTitle>Token KSeF</CardTitle>
          <CardDescription>
            Token autoryzacyjny przechowywany w Azure Key Vault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nazwa sekretu:</span>
              <span className="font-mono text-sm">ksef-token-primary</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-muted-foreground">—</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Token można odnowić w portalu KSeF i zaktualizować w Azure Key Vault.
          </p>
        </CardContent>
      </Card>

      {/* MPK Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Centra kosztów (MPK)</CardTitle>
          <CardDescription>
            Lista dostępnych centrów kosztów do kategoryzacji faktur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {[
              'Consultants',
              'BackOffice',
              'Management',
              'Cars',
              'Legal',
              'Marketing',
              'Sales',
              'Delivery',
              'Finance',
              'Other',
            ].map((mpk) => (
              <div key={mpk} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>{mpk}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
