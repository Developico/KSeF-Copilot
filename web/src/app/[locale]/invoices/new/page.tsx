'use client'

import { ManualInvoiceForm } from '@/components/invoices/manual-invoice-form'
import { FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function NewInvoicePage() {
  const t = useTranslations('invoices')
  
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t('manualForm.pageTitle')}
          </h1>
          <p className="text-muted-foreground">
            {t('manualForm.pageSubtitle')}
          </p>
        </div>
      </div>

      <ManualInvoiceForm />
    </div>
  )
}
