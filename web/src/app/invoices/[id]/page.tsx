'use client'

import { use } from 'react'
import { InvoiceDetailContent } from '@/components/invoices/invoice-detail-content'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  
  return (
    <div className="container mx-auto py-6">
      <InvoiceDetailContent invoiceId={resolvedParams.id} />
    </div>
  )
}
