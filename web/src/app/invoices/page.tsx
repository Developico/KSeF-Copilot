import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faktury</h1>
          <p className="text-muted-foreground">
            Lista zaimportowanych faktur kosztowych z KSeF
          </p>
        </div>
        <Button variant="outline">
          Eksportuj
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista faktur</CardTitle>
          <CardDescription>
            Brak faktur do wyświetlenia. Użyj synchronizacji KSeF aby zaimportować faktury.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tabela faktur będzie tutaj po zaimportowaniu danych z KSeF.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
