import { ManualInvoiceForm } from '@/components/invoices/manual-invoice-form'
import { FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Nowa faktura | Developico KSeF',
  description: 'Ręczne dodawanie faktury',
}

export default function NewInvoicePage() {
  return (
    <div className="container max-w-4xl py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Nowa faktura
          </h1>
          <p className="text-muted-foreground">
            Ręczne wprowadzenie faktury spoza KSeF
          </p>
        </div>
      </div>

      <ManualInvoiceForm />
    </div>
  )
}
