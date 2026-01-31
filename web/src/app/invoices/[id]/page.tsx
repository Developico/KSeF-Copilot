'use client'

import { use } from 'react'
import { InvoiceDetailContent } from '@/components/invoices/invoice-detail-content'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  
  return (
    <div className="container mx-auto py-4 md:py-6 px-2 md:px-4">
      <InvoiceDetailContent invoiceId={resolvedParams.id} />
    </div>
  )
}
